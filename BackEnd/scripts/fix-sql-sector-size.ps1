#Requires -Version 5.1
#Requires -RunAsAdministrator

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\stornvme\Parameters\Device"
$registryName = "ForcedPhysicalSectorSizeInBytes"
$registryValue = "* 4095"
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backupDirectory = Join-Path $workspaceRoot ".tools\sql-server"
$backupPath = Join-Path $backupDirectory "stornvme-device-before-herp.reg"
$resultPath = Join-Path $backupDirectory "sector-size-fix-result.txt"

New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) {
  & reg.exe export "HKLM\SYSTEM\CurrentControlSet\Services\stornvme\Parameters\Device" $backupPath /y | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not back up the stornvme Device registry key. No change was made."
  }
}

New-ItemProperty -LiteralPath $registryPath -Name $registryName `
  -PropertyType MultiString -Value $registryValue -Force | Out-Null

$writtenValue = @(
  (Get-ItemProperty -LiteralPath $registryPath -Name $registryName).$registryName
)

if ($writtenValue.Count -ne 1 -or [string]$writtenValue[0] -ne $registryValue) {
  throw "The SQL Server sector-size compatibility value was not written exactly as expected."
}

$utf8WithoutBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText(
  $resultPath,
  "PASS`r`nRegistry backup: $backupPath`r`nWindows restart required: yes`r`n",
  $utf8WithoutBom
)
