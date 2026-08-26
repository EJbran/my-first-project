param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,

  [Parameter(Mandatory = $true)]
  [string]$SheetName,

  [string]$OutputPath,

  [string]$KeyColumn,

  [string]$ValueColumn
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-EntryXml {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$EntryName
  )

  $entry = $Archive.GetEntry($EntryName)
  if ($null -eq $entry) {
    throw "Workbook entry not found: $EntryName"
  }

  $stream = $entry.Open()
  try {
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8, $true)
    try {
      return [xml]$reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
    }
  }
  finally {
    $stream.Dispose()
  }
}

function Get-ColumnIndex {
  param([string]$CellReference)

  $match = [regex]::Match($CellReference, "^[A-Z]+")
  if (-not $match.Success) {
    throw "Invalid cell reference: $CellReference"
  }

  $index = 0
  foreach ($character in $match.Value.ToCharArray()) {
    $index = ($index * 26) + ([int]$character - [int][char]'A' + 1)
  }

  return $index - 1
}

function Get-CellValue {
  param(
    [System.Xml.XmlElement]$Cell,
    [object[]]$SharedStrings
  )

  $type = $Cell.GetAttribute("t")
  if ($type -eq "inlineStr") {
    $inlineText = @($Cell.SelectNodes("./*[local-name()='is']//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join ""
    return $inlineText
  }

  $valueNode = $Cell.SelectSingleNode("./*[local-name()='v']")
  if ($null -eq $valueNode) {
    return $null
  }

  $rawValue = $valueNode.InnerText
  if ($type -eq "s") {
    return [string]$SharedStrings[[int]$rawValue]
  }

  if ($type -eq "b") {
    return $rawValue -eq "1"
  }

  return [string]$rawValue
}

function Get-FileSha256 {
  param([string]$Path)

  $stream = [System.IO.File]::Open(
    $Path,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::ReadWrite
  )
  try {
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
      return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
    }
    finally {
      $algorithm.Dispose()
    }
  }
  finally {
    $stream.Dispose()
  }
}

$resolvedWorkbookPath = (Resolve-Path -LiteralPath $WorkbookPath).Path
$fileStream = [System.IO.File]::Open(
  $resolvedWorkbookPath,
  [System.IO.FileMode]::Open,
  [System.IO.FileAccess]::Read,
  [System.IO.FileShare]::ReadWrite
)

try {
  $archive = [System.IO.Compression.ZipArchive]::new(
    $fileStream,
    [System.IO.Compression.ZipArchiveMode]::Read,
    $false
  )

  try {
    $workbookXml = Get-EntryXml -Archive $archive -EntryName "xl/workbook.xml"
    $relationshipsXml = Get-EntryXml -Archive $archive -EntryName "xl/_rels/workbook.xml.rels"

    $sheetNode = $workbookXml.SelectSingleNode("//*[local-name()='sheet' and @name='$SheetName']")
    if ($null -eq $sheetNode) {
      $availableSheets = @($workbookXml.SelectNodes("//*[local-name()='sheet']") | ForEach-Object { $_.GetAttribute("name") }) -join ", "
      throw "Worksheet '$SheetName' was not found. Available sheets: $availableSheets"
    }

    $relationshipId = $sheetNode.GetAttribute(
      "id",
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    )
    $relationshipNode = $relationshipsXml.SelectSingleNode("//*[local-name()='Relationship' and @Id='$relationshipId']")
    if ($null -eq $relationshipNode) {
      throw "Worksheet relationship not found for '$SheetName'."
    }

    $sheetTarget = $relationshipNode.GetAttribute("Target").Replace("\\", "/")
    $sheetEntryName = if ($sheetTarget.StartsWith("/")) {
      $sheetTarget.TrimStart("/")
    }
    elseif ($sheetTarget.StartsWith("xl/")) {
      $sheetTarget
    }
    else {
      "xl/$sheetTarget"
    }

    $sharedStrings = @()
    if ($null -ne $archive.GetEntry("xl/sharedStrings.xml")) {
      $sharedStringsXml = Get-EntryXml -Archive $archive -EntryName "xl/sharedStrings.xml"
      $sharedStrings = @(
        $sharedStringsXml.SelectNodes("//*[local-name()='si']") | ForEach-Object {
          ($_.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join ""
        }
      )
    }

    $sheetXml = Get-EntryXml -Archive $archive -EntryName $sheetEntryName
    $sheetRows = @($sheetXml.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']"))
    if ($sheetRows.Count -eq 0) {
      throw "Worksheet '$SheetName' has no rows."
    }

    $headerByIndex = @{}
    foreach ($cell in $sheetRows[0].SelectNodes("./*[local-name()='c']")) {
      $columnIndex = Get-ColumnIndex -CellReference $cell.GetAttribute("r")
      $header = [string](Get-CellValue -Cell $cell -SharedStrings $sharedStrings)
      if ([string]::IsNullOrWhiteSpace($header)) {
        $header = "Column$($columnIndex + 1)"
      }
      $headerByIndex[$columnIndex] = $header.Trim()
    }

    $headers = @($headerByIndex.Keys | Sort-Object | ForEach-Object { $headerByIndex[$_] })
    $rows = [System.Collections.Generic.List[object]]::new()

    for ($rowIndex = 1; $rowIndex -lt $sheetRows.Count; $rowIndex += 1) {
      $rowValues = @{}
      foreach ($cell in $sheetRows[$rowIndex].SelectNodes("./*[local-name()='c']")) {
        $columnIndex = Get-ColumnIndex -CellReference $cell.GetAttribute("r")
        if ($headerByIndex.ContainsKey($columnIndex)) {
          $rowValues[$headerByIndex[$columnIndex]] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
        }
      }

      $rowObject = [ordered]@{}
      foreach ($header in $headers) {
        $rowObject[$header] = if ($rowValues.ContainsKey($header)) { $rowValues[$header] } else { $null }
      }
      $rows.Add([pscustomobject]$rowObject)
    }
  }
  finally {
    $archive.Dispose()
  }
}
finally {
  $fileStream.Dispose()
}

$nullCounts = [ordered]@{}
foreach ($header in $headers) {
  $nullCounts[$header] = @($rows | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.$header) }).Count
}

$duplicateKeyGroups = @()
$conflictingKeyGroups = @()
if (-not [string]::IsNullOrWhiteSpace($KeyColumn)) {
  if ($headers -notcontains $KeyColumn) {
    throw "Key column '$KeyColumn' was not found in worksheet '$SheetName'."
  }

  $duplicateKeyGroups = @(
    $rows |
      Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_.$KeyColumn) } |
      Group-Object -Property $KeyColumn |
      Where-Object { $_.Count -gt 1 } |
      ForEach-Object {
        [pscustomobject]@{
          key = $_.Name
          count = $_.Count
          values = if (-not [string]::IsNullOrWhiteSpace($ValueColumn)) {
            @($_.Group | ForEach-Object { [string]$_.$ValueColumn } | Sort-Object -Unique)
          }
          else {
            @()
          }
        }
      }
  )

  if (-not [string]::IsNullOrWhiteSpace($ValueColumn)) {
    if ($headers -notcontains $ValueColumn) {
      throw "Value column '$ValueColumn' was not found in worksheet '$SheetName'."
    }
    $conflictingKeyGroups = @($duplicateKeyGroups | Where-Object { $_.values.Count -gt 1 })
  }
}

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
  $resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
  $outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutputPath)
  if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
    [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  }
  $json = $rows | ConvertTo-Json -Depth 5 -Compress
  [System.IO.File]::WriteAllText($resolvedOutputPath, $json, [System.Text.UTF8Encoding]::new($false))
}

$summary = [ordered]@{
  workbook = $resolvedWorkbookPath
  sha256 = Get-FileSha256 -Path $resolvedWorkbookPath
  sheet = $SheetName
  headers = $headers
  rowCount = $rows.Count
  nullCounts = $nullCounts
  duplicateKeyGroupCount = $duplicateKeyGroups.Count
  conflictingKeyGroupCount = $conflictingKeyGroups.Count
  duplicateKeySamples = @($duplicateKeyGroups | Select-Object -First 10)
  conflictingKeySamples = @($conflictingKeyGroups | Select-Object -First 10)
  sampleRows = @($rows | Select-Object -First 5)
  outputPath = if ([string]::IsNullOrWhiteSpace($OutputPath)) { $null } else { [System.IO.Path]::GetFullPath($OutputPath) }
}

$summary | ConvertTo-Json -Depth 8
