#Requires -Version 5.1
#Requires -RunAsAdministrator

[CmdletBinding()]
param(
  [Parameter()]
  [switch]$ForceEnvOverwrite
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $backendRoot
$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\stornvme\Parameters\Device"
$registryName = "ForcedPhysicalSectorSizeInBytes"
$requiredRegistryValue = "* 4095"
$fixMarkerPath = Join-Path $workspaceRoot ".tools\sql-server\sector-size-fix-result.txt"

function Write-Status {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[local-dev] $Message"
}

$configuredValue = @(
  (Get-ItemProperty -LiteralPath $registryPath -Name $registryName -ErrorAction Stop).$registryName
)
if ($configuredValue.Count -ne 1 -or [string]$configuredValue[0] -ne $requiredRegistryValue) {
  throw "The SQL Server NVMe compatibility value is missing. Run scripts/fix-sql-sector-size.ps1 as Administrator, then restart Windows."
}

if (-not (Test-Path -LiteralPath $fixMarkerPath -PathType Leaf)) {
  throw "The verified sector-size fix marker is missing. Run scripts/fix-sql-sector-size.ps1 as Administrator, then restart Windows."
}

$lastBoot = (Get-CimInstance -ClassName Win32_OperatingSystem).LastBootUpTime
$fixTime = (Get-Item -LiteralPath $fixMarkerPath).LastWriteTime
if ($lastBoot -le $fixTime) {
  throw "Windows has not restarted since the sector-size fix was applied. Restart Windows before continuing."
}

$setupCandidates = @(
  Get-ChildItem -LiteralPath "C:\Program Files\Microsoft SQL Server" `
    -Recurse -File -Filter "setup.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\Setup Bootstrap\\SQL\d+\\setup\.exe$' } |
    Sort-Object FullName -Descending
)

if ($setupCandidates.Count -eq 0) {
  throw "The local SQL Server setup media was not found. Rerun the verified SQL Server Developer installer first."
}

$setup = $setupCandidates[0]
$signature = Get-AuthenticodeSignature -LiteralPath $setup.FullName
if ($signature.Status -ne [Management.Automation.SignatureStatus]::Valid `
    -or [string]$signature.SignerCertificate.Subject -notmatch "Microsoft") {
  throw "The discovered SQL Server setup executable does not have a valid Microsoft signature."
}

$engineService = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
if ($null -eq $engineService) {
  throw "The failed MSSQLSERVER installation was not found. Rerun SQL Server Developer Basic setup first."
}

Write-Status "Repairing the failed local MSSQLSERVER installation. This can take several minutes."
$repairArguments = @(
  "/Q",
  "/ACTION=Repair",
  "/INSTANCENAME=MSSQLSERVER"
)
$repair = Start-Process -FilePath $setup.FullName -ArgumentList $repairArguments `
  -WindowStyle Hidden -Wait -PassThru
if ($repair.ExitCode -ne 0) {
  throw "SQL Server repair failed with exit code $($repair.ExitCode). Review the newest SQL Setup Bootstrap log."
}

Write-Status "Configuring the isolated HERP_LOCAL database and private credential file."
$configurationParameters = @{
  InstanceName = "MSSQLSERVER"
  Confirm = $false
}
if ($ForceEnvOverwrite) {
  $configurationParameters.ForceEnvOverwrite = $true
}

& (Join-Path $PSScriptRoot "configure-local-sql.ps1") @configurationParameters
if ($LASTEXITCODE -ne 0) {
  throw "Local SQL Server configuration failed."
}

$npm = Get-Command npm.cmd -ErrorAction Stop
Push-Location $backendRoot
try {
  Write-Status "Creating the HERP_LOCAL application schema and synthetic data."
  & $npm.Source run db:dev:bootstrap
  if ($LASTEXITCODE -ne 0) {
    throw "HERP_LOCAL bootstrap failed."
  }

  Write-Status "Running the local database integrity verification."
  & $npm.Source run db:dev:verify
  if ($LASTEXITCODE -ne 0) {
    throw "HERP_LOCAL verification failed."
  }
} finally {
  Pop-Location
}

Write-Status "HERP_LOCAL is ready. Start the backend with: npm.cmd run start:dev-db"
