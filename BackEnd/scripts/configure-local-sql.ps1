#Requires -Version 5.1
#Requires -RunAsAdministrator

<#
.SYNOPSIS
Configures one locally installed SQL Server instance for HERP development.

.DESCRIPTION
This script deliberately has no server-name parameter. It discovers a Windows
SQL Server Database Engine service on this computer, changes only that local
instance, and connects only through tcp:127.0.0.1,1433.

It enables mixed-mode authentication and TCP port 1433, safely restarts the
selected service, creates HERP_LOCAL, provisions the SQL login herp_dev as a
database owner, and writes BackEnd/.env.local. The generated password is never
written to the console.

If more than one SQL Server instance is installed, pass -InstanceName. For a
default instance use MSSQLSERVER; for a named instance use its instance name,
for example SQLEXPRESS.

.EXAMPLE
  .\scripts\configure-local-sql.ps1 -InstanceName SQLEXPRESS

.EXAMPLE
  .\scripts\configure-local-sql.ps1 -InstanceName SQLEXPRESS -ForceEnvOverwrite -Confirm:$false
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
  [Parameter()]
  [ValidateNotNullOrEmpty()]
  [string]$InstanceName,

  [Parameter()]
  [switch]$ForceEnvOverwrite,

  [Parameter()]
  [switch]$AllowNonDevelopmentEdition
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DatabaseName = "HERP_LOCAL"
$LoginName = "herp_dev"
$TcpPort = 1433
$LoopbackDataSource = "tcp:127.0.0.1,$TcpPort"
$BackendRoot = Split-Path -Parent $PSScriptRoot
$EnvLocalPath = Join-Path $BackendRoot ".env.local"

function Write-Status {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[local-sql] $Message"
}

function Assert-Elevated64BitWindows {
  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw "This script can run only on Windows."
  }

  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated PowerShell session (Run as administrator)."
  }

  if ([Environment]::Is64BitOperatingSystem -and -not [Environment]::Is64BitProcess) {
    throw "Run the 64-bit PowerShell host so SQL Server registry paths are not redirected."
  }
}

function Test-EnvFileIsIgnored {
  param([Parameter(Mandatory = $true)][string]$Root)

  $git = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($null -ne $git) {
    & $git.Source -C $Root check-ignore --quiet -- .env.local 2>$null
    return ($LASTEXITCODE -eq 0)
  }

  $ignorePath = Join-Path $Root ".gitignore"
  if (-not (Test-Path -LiteralPath $ignorePath -PathType Leaf)) {
    return $false
  }

  foreach ($line in Get-Content -LiteralPath $ignorePath) {
    $pattern = $line.Trim()
    if ($pattern -in @(".env.local", "/.env.local", ".env.*.local", "*.local")) {
      return $true
    }
  }

  return $false
}

function Get-LocalSqlEngineServices {
  $services = Get-CimInstance -ClassName Win32_Service | Where-Object {
    $_.Name -eq "MSSQLSERVER" -or $_.Name -like 'MSSQL$*'
  }

  foreach ($service in $services) {
    $instance = if ($service.Name -eq "MSSQLSERVER") {
      "MSSQLSERVER"
    } else {
      $service.Name.Substring("MSSQL$".Length)
    }

    [pscustomobject]@{
      InstanceName = $instance
      ServiceName = [string]$service.Name
      DisplayName = [string]$service.DisplayName
      State = [string]$service.State
      ProcessId = [uint32]$service.ProcessId
      PathName = [string]$service.PathName
    }
  }
}

function Get-ServiceExecutablePath {
  param([Parameter(Mandatory = $true)][string]$PathName)

  $executable = $null
  if ($PathName -match '^\s*"([^"]+)"') {
    $executable = $Matches[1]
  } elseif ($PathName -match '^\s*([^\s]+)') {
    $executable = $Matches[1]
  }

  if ([string]::IsNullOrWhiteSpace($executable)) {
    throw "Could not parse the SQL Server service executable path."
  }

  $expanded = [Environment]::ExpandEnvironmentVariables($executable)
  if ($expanded.StartsWith("\\")) {
    throw "The selected SQL Server service executable is on a network path; refusing to continue."
  }

  if (-not (Test-Path -LiteralPath $expanded -PathType Leaf)) {
    throw "The selected SQL Server service executable does not exist locally: $expanded"
  }

  $file = Get-Item -LiteralPath $expanded
  if ($file.Name -ine "sqlservr.exe") {
    throw "The selected service is not backed by sqlservr.exe; refusing to continue."
  }

  if ([string]$file.VersionInfo.CompanyName -notmatch "Microsoft") {
    throw "The selected sqlservr.exe is not identified as a Microsoft binary; refusing to continue."
  }

  return $file.FullName
}

function Get-RegistryInstanceDetails {
  param([Parameter(Mandatory = $true)][string]$SelectedInstanceName)

  $instanceMapPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"
  if (-not (Test-Path -LiteralPath $instanceMapPath -PathType Container)) {
    throw "The local SQL Server instance registry map was not found."
  }

  $instanceMapKey = Get-Item -LiteralPath $instanceMapPath
  $mappedName = @($instanceMapKey.GetValueNames() | Where-Object {
    $_ -ieq $SelectedInstanceName
  })

  if ($mappedName.Count -ne 1) {
    throw "The selected service does not have exactly one matching local SQL Server registry entry."
  }

  $instanceId = [string]$instanceMapKey.GetValue(
    $mappedName[0],
    $null,
    [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
  )

  if ($instanceId -notmatch '^[A-Za-z0-9_.-]+$') {
    throw "The local SQL Server registry returned an invalid instance identifier."
  }

  $instanceRoot = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instanceId"
  $serverPath = Join-Path $instanceRoot "MSSQLServer"
  $tcpPath = Join-Path $serverPath "SuperSocketNetLib\Tcp"
  $ipAllPath = Join-Path $tcpPath "IPAll"
  $setupPath = Join-Path $instanceRoot "Setup"

  foreach ($requiredPath in @($instanceRoot, $serverPath, $tcpPath, $ipAllPath, $setupPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Container)) {
      throw "Expected local SQL Server registry path is missing: $requiredPath"
    }
  }

  $setup = Get-ItemProperty -LiteralPath $setupPath
  $edition = [string]$setup.Edition

  [pscustomobject]@{
    InstanceId = $instanceId
    InstanceRoot = $instanceRoot
    ServerPath = $serverPath
    TcpPath = $tcpPath
    IpAllPath = $ipAllPath
    Edition = $edition
  }
}

function Assert-PortIsAvailableToSelectedService {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][uint32]$SelectedProcessId,
    [switch]$RequireLoopbackOnly
  )

  $getTcpConnection = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
  if ($null -eq $getTcpConnection) {
    throw "Get-NetTCPConnection is unavailable, so TCP port ownership cannot be verified safely."
  }

  $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  $unexpected = @($listeners | Where-Object {
    $SelectedProcessId -eq 0 -or [uint32]$_.OwningProcess -ne $SelectedProcessId
  })

  if ($unexpected.Count -gt 0) {
    $owners = ($unexpected | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
    throw "TCP port $Port is already owned by another local process (PID: $owners). No configuration was changed."
  }

  if ($RequireLoopbackOnly) {
    $selectedListeners = @($listeners | Where-Object {
      [uint32]$_.OwningProcess -eq $SelectedProcessId
    })
    if ($selectedListeners.Count -eq 0) {
      throw "The selected SQL Server service is not listening on TCP port $Port."
    }

    $externalBindings = @($selectedListeners | Where-Object {
      [string]$_.LocalAddress -notin @("127.0.0.1", "::1")
    })
    if ($externalBindings.Count -gt 0) {
      $addresses = ($externalBindings | Select-Object -ExpandProperty LocalAddress -Unique) -join ", "
      throw "SQL Server is bound beyond loopback on TCP port $Port ($addresses). Refusing to provision the development login."
    }
  }
}

function Get-RegistrySettingSnapshot {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][ValidateSet("DWord", "String")][string]$Type,
    [Parameter(Mandatory = $true)][AllowEmptyString()][object]$DesiredValue
  )

  $key = Get-Item -LiteralPath $Path
  $exists = @($key.GetValueNames() | Where-Object { $_ -ieq $Name }).Count -eq 1
  $currentValue = $null
  if ($exists) {
    $currentValue = $key.GetValue(
      $Name,
      $null,
      [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
    )
  }

  [pscustomobject]@{
    Path = $Path
    Name = $Name
    Type = $Type
    DesiredValue = $DesiredValue
    Existed = $exists
    OriginalValue = $currentValue
  }
}

function Restore-RegistrySettings {
  param([Parameter(Mandatory = $true)][object[]]$Snapshots)

  foreach ($snapshot in $Snapshots) {
    if ($snapshot.Existed) {
      New-ItemProperty -LiteralPath $snapshot.Path -Name $snapshot.Name `
        -PropertyType $snapshot.Type -Value $snapshot.OriginalValue -Force | Out-Null
    } else {
      Remove-ItemProperty -LiteralPath $snapshot.Path -Name $snapshot.Name `
        -ErrorAction SilentlyContinue
    }
  }
}

function Wait-ServiceRunning {
  param(
    [Parameter(Mandatory = $true)][string]$ServiceName,
    [int]$TimeoutSeconds = 120
  )

  $service = Get-Service -Name $ServiceName
  $service.WaitForStatus(
    [System.ServiceProcess.ServiceControllerStatus]::Running,
    [TimeSpan]::FromSeconds($TimeoutSeconds)
  )
  $service.Refresh()
  if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
    throw "SQL Server service $ServiceName did not reach the Running state."
  }
}

function Open-IntegratedLoopbackConnection {
  param([int]$TimeoutSeconds = 90)

  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ([DateTime]::UtcNow -lt $deadline) {
    $connection = New-Object System.Data.SqlClient.SqlConnection(
      "Server=$LoopbackDataSource;Database=master;Integrated Security=True;Encrypt=False;" +
      "TrustServerCertificate=True;Connect Timeout=3;Application Name=HERP Local SQL Setup;"
    )

    try {
      $connection.Open()
      return $connection
    } catch {
      $lastError = $_.Exception.Message
      $connection.Dispose()
      Start-Sleep -Seconds 2
    }
  }

  throw "The selected local SQL Server did not accept an integrated loopback connection within $TimeoutSeconds seconds. Last error: $lastError"
}

function Invoke-SqlNonQuery {
  param(
    [Parameter(Mandatory = $true)][System.Data.SqlClient.SqlConnection]$Connection,
    [Parameter(Mandatory = $true)][string]$CommandText,
    [int]$TimeoutSeconds = 120
  )

  $command = $Connection.CreateCommand()
  try {
    $command.CommandText = $CommandText
    $command.CommandTimeout = $TimeoutSeconds
    [void]$command.ExecuteNonQuery()
  } finally {
    $command.Dispose()
  }
}

function Get-CryptographicRandomIndex {
  param(
    [Parameter(Mandatory = $true)][Security.Cryptography.RandomNumberGenerator]$Generator,
    [Parameter(Mandatory = $true)][ValidateRange(1, 255)][int]$MaxExclusive
  )

  $buffer = New-Object byte[] 1
  $limit = 256 - (256 % $MaxExclusive)
  do {
    $Generator.GetBytes($buffer)
    $value = [int]$buffer[0]
  } while ($value -ge $limit)

  return ($value % $MaxExclusive)
}

function New-StrongPassword {
  param([ValidateRange(24, 128)][int]$Length = 40)

  # These characters are safe in an unquoted dotenv value and a SQL string;
  # single quote, double quote, backtick, dollar, whitespace, and # are omitted.
  $sets = @(
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@%^*-_+=?"
  )
  $allCharacters = ($sets -join "")
  $characters = New-Object System.Collections.Generic.List[char]
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    foreach ($set in $sets) {
      $characters.Add($set[(Get-CryptographicRandomIndex -Generator $rng -MaxExclusive $set.Length)])
    }

    while ($characters.Count -lt $Length) {
      $characters.Add(
        $allCharacters[(Get-CryptographicRandomIndex -Generator $rng -MaxExclusive $allCharacters.Length)]
      )
    }

    for ($index = $characters.Count - 1; $index -gt 0; $index--) {
      $swapIndex = Get-CryptographicRandomIndex -Generator $rng -MaxExclusive ($index + 1)
      $temporary = $characters[$index]
      $characters[$index] = $characters[$swapIndex]
      $characters[$swapIndex] = $temporary
    }

    return (-join $characters)
  } finally {
    $rng.Dispose()
  }
}

function Set-PrivateFileAcl {
  param([Parameter(Mandatory = $true)][string]$Path)

  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $administratorsSid = New-Object Security.Principal.SecurityIdentifier("S-1-5-32-544")
  $systemSid = New-Object Security.Principal.SecurityIdentifier("S-1-5-18")
  $acl = New-Object Security.AccessControl.FileSecurity
  $acl.SetOwner($currentSid)
  $acl.SetAccessRuleProtection($true, $false)

  foreach ($sid in @($currentSid, $administratorsSid, $systemSid)) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule(
      $sid,
      [Security.AccessControl.FileSystemRights]::FullControl,
      [Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($rule)
  }

  Set-Acl -LiteralPath $Path -AclObject $acl
}

function Write-PrivateUtf8File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
  )

  $directory = Split-Path -Parent $Path
  $temporaryPath = Join-Path $directory ("." + [IO.Path]::GetFileName($Path) + "." + [guid]::NewGuid().ToString("N") + ".tmp")
  $utf8WithoutBom = New-Object Text.UTF8Encoding($false)

  try {
    [IO.File]::WriteAllText($temporaryPath, $Content, $utf8WithoutBom)
    Set-PrivateFileAcl -Path $temporaryPath

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
      [IO.File]::Replace($temporaryPath, $Path, $null, $true)
    } else {
      [IO.File]::Move($temporaryPath, $Path)
    }

    Set-PrivateFileAcl -Path $Path
  } finally {
    if (Test-Path -LiteralPath $temporaryPath -PathType Leaf) {
      Remove-Item -LiteralPath $temporaryPath -Force
    }
  }
}

Assert-Elevated64BitWindows

if (-not (Test-EnvFileIsIgnored -Root $BackendRoot)) {
  throw "BackEnd/.env.local is not ignored by Git. Refusing to create a credential file."
}

if ((Test-Path -LiteralPath $EnvLocalPath -PathType Leaf) -and -not $ForceEnvOverwrite) {
  throw "BackEnd/.env.local already exists. Use -ForceEnvOverwrite only if replacing its local credentials is intentional."
}

$candidates = @(Get-LocalSqlEngineServices | Sort-Object InstanceName)
if ($candidates.Count -eq 0) {
  throw "No local SQL Server Database Engine Windows service was found. Install SQL Server Developer or Express first."
}

if ([string]::IsNullOrWhiteSpace($InstanceName)) {
  if ($candidates.Count -ne 1) {
    $available = ($candidates.InstanceName -join ", ")
    throw "Multiple local SQL Server instances were found ($available). Rerun with -InstanceName to select one explicitly."
  }
  $selected = $candidates[0]
} else {
  $matches = @($candidates | Where-Object {
    $_.InstanceName -ieq $InstanceName -or $_.ServiceName -ieq $InstanceName
  })
  if ($matches.Count -ne 1) {
    $available = ($candidates.InstanceName -join ", ")
    throw "Instance '$InstanceName' was not found exactly once among local SQL services. Available: $available"
  }
  $selected = $matches[0]
}

$sqlExecutable = Get-ServiceExecutablePath -PathName $selected.PathName
$registry = Get-RegistryInstanceDetails -SelectedInstanceName $selected.InstanceName

if ([string]::IsNullOrWhiteSpace($registry.Edition)) {
  throw "The selected local SQL Server edition could not be verified from the registry."
}
if ($registry.Edition -notmatch '(?i)(Developer|Express|Evaluation)' -and -not $AllowNonDevelopmentEdition) {
  throw "The selected local instance is edition '$($registry.Edition)'. Use -AllowNonDevelopmentEdition only after confirming this local instance is safe for development."
}

$latestService = Get-CimInstance -ClassName Win32_Service -Filter "Name='$($selected.ServiceName.Replace("'", "''"))'"
Assert-PortIsAvailableToSelectedService -Port $TcpPort -SelectedProcessId ([uint32]$latestService.ProcessId)

Write-Status "Selected local instance $($selected.InstanceName) ($($selected.ServiceName)); edition: $($registry.Edition)."
Write-Status "Verified local engine binary: $sqlExecutable"

$ipRegistryKeys = @(
  Get-ChildItem -LiteralPath $registry.TcpPath -ErrorAction Stop |
    Where-Object { $_.PSChildName -match '^IP\d+$' }
)
$loopbackRegistryKeys = @($ipRegistryKeys | Where-Object {
  [string](Get-ItemProperty -LiteralPath $_.PSPath).IPAddress -eq "127.0.0.1"
})
if ($loopbackRegistryKeys.Count -ne 1) {
  throw "SQL Server TCP configuration does not contain exactly one IPv4 loopback entry."
}

$actionDescription = "Enable mixed authentication and TCP $TcpPort on 127.0.0.1 only, restart only $($selected.ServiceName), create $DatabaseName/$LoginName, and write ignored BackEnd/.env.local"
if (-not $PSCmdlet.ShouldProcess("local SQL instance $($selected.InstanceName) on $env:COMPUTERNAME", $actionDescription)) {
  return
}

$settings = @(
  Get-RegistrySettingSnapshot -Path $registry.ServerPath -Name "LoginMode" -Type DWord -DesiredValue 2
  Get-RegistrySettingSnapshot -Path $registry.TcpPath -Name "Enabled" -Type DWord -DesiredValue 1
  Get-RegistrySettingSnapshot -Path $registry.TcpPath -Name "ListenOnAllIPs" -Type DWord -DesiredValue 0
  Get-RegistrySettingSnapshot -Path $registry.IpAllPath -Name "TcpDynamicPorts" -Type String -DesiredValue ""
  Get-RegistrySettingSnapshot -Path $registry.IpAllPath -Name "TcpPort" -Type String -DesiredValue ([string]$TcpPort)
)

foreach ($ipRegistryKey in $ipRegistryKeys) {
  $isLoopback = $ipRegistryKey.PSPath -eq $loopbackRegistryKeys[0].PSPath
  $settings += Get-RegistrySettingSnapshot -Path $ipRegistryKey.PSPath `
    -Name "Enabled" -Type DWord -DesiredValue $(if ($isLoopback) { 1 } else { 0 })

  if ($isLoopback) {
    $settings += Get-RegistrySettingSnapshot -Path $ipRegistryKey.PSPath `
      -Name "TcpDynamicPorts" -Type String -DesiredValue ""
    $settings += Get-RegistrySettingSnapshot -Path $ipRegistryKey.PSPath `
      -Name "TcpPort" -Type String -DesiredValue ([string]$TcpPort)
  }
}

$configurationChanged = $false
$initialService = Get-Service -Name $selected.ServiceName
$initialServiceWasRunning = $initialService.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running
$runningDependentNames = @(
  $initialService.DependentServices |
    Where-Object { $_.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running } |
    Select-Object -ExpandProperty Name
)

try {
  foreach ($setting in $settings) {
    if (-not $setting.Existed -or [string]$setting.OriginalValue -cne [string]$setting.DesiredValue) {
      New-ItemProperty -LiteralPath $setting.Path -Name $setting.Name `
        -PropertyType $setting.Type -Value $setting.DesiredValue -Force | Out-Null
      $configurationChanged = $true
    }
  }

  if ($initialServiceWasRunning) {
    Write-Status "Restarting only local service $($selected.ServiceName) to apply SQL network/authentication settings."
    Restart-Service -Name $selected.ServiceName -Force
    Wait-ServiceRunning -ServiceName $selected.ServiceName
  } elseif (-not $initialServiceWasRunning) {
    Write-Status "Starting local service $($selected.ServiceName)."
    Start-Service -Name $selected.ServiceName
    Wait-ServiceRunning -ServiceName $selected.ServiceName
  }

  foreach ($dependentName in $runningDependentNames) {
    $dependent = Get-Service -Name $dependentName
    if ($dependent.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
      Start-Service -Name $dependentName
      Wait-ServiceRunning -ServiceName $dependentName
    }
  }
} catch {
  $restartFailure = $_.Exception.Message
  if ($configurationChanged) {
    Restore-RegistrySettings -Snapshots $settings
  }
  try {
    $current = Get-Service -Name $selected.ServiceName
    if ($initialServiceWasRunning) {
      if ($current.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
        Restart-Service -Name $selected.ServiceName -Force
      } else {
        Start-Service -Name $selected.ServiceName
      }
      Wait-ServiceRunning -ServiceName $selected.ServiceName
    } elseif ($current.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
      Stop-Service -Name $selected.ServiceName -Force
    }
    foreach ($dependentName in $runningDependentNames) {
      $dependent = Get-Service -Name $dependentName
      if ($dependent.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        Start-Service -Name $dependentName
        Wait-ServiceRunning -ServiceName $dependentName
      }
    }
  } catch {
    Write-Warning "SQL service state could not be fully restored after setup failed. Inspect $($selected.ServiceName) manually."
  }
  throw "Local SQL Server configuration/restart failed; prior registry values were restored when possible. Details: $restartFailure"
}

$serviceAfterRestart = Get-CimInstance -ClassName Win32_Service -Filter "Name='$($selected.ServiceName.Replace("'", "''"))'"
Assert-PortIsAvailableToSelectedService -Port $TcpPort `
  -SelectedProcessId ([uint32]$serviceAfterRestart.ProcessId) -RequireLoopbackOnly

$integratedConnection = $null
$generatedPassword = $null
try {
  $integratedConnection = Open-IntegratedLoopbackConnection

  $identityCommand = $integratedConnection.CreateCommand()
  try {
    $identityCommand.CommandText = @"
SELECT
  CONVERT(nvarchar(128), SERVERPROPERTY('MachineName')) AS MachineName,
  COALESCE(CONVERT(nvarchar(128), SERVERPROPERTY('InstanceName')), N'MSSQLSERVER') AS InstanceName,
  CONVERT(int, SERVERPROPERTY('ProcessID')) AS ProcessId,
  CONVERT(int, SERVERPROPERTY('IsIntegratedSecurityOnly')) AS IsIntegratedSecurityOnly,
  CONVERT(nvarchar(20), CONNECTIONPROPERTY('net_transport')) AS NetTransport,
  CONVERT(int, CONNECTIONPROPERTY('local_tcp_port')) AS LocalTcpPort,
  CONVERT(int, IS_SRVROLEMEMBER(N'sysadmin')) AS IsSysadmin;
"@
    $reader = $identityCommand.ExecuteReader()
    try {
      if (-not $reader.Read()) {
        throw "The local SQL Server identity query returned no row."
      }
      $serverMachine = [string]$reader["MachineName"]
      $serverInstance = [string]$reader["InstanceName"]
      $serverProcessId = [int]$reader["ProcessId"]
      $integratedOnly = [int]$reader["IsIntegratedSecurityOnly"]
      $netTransport = [string]$reader["NetTransport"]
      $localTcpPort = [int]$reader["LocalTcpPort"]
      $isSysadmin = [int]$reader["IsSysadmin"]
    } finally {
      $reader.Dispose()
    }
  } finally {
    $identityCommand.Dispose()
  }

  $localMachineNames = @($env:COMPUTERNAME, [Environment]::MachineName) | Select-Object -Unique
  if (@($localMachineNames | Where-Object { $_ -ieq $serverMachine }).Count -eq 0) {
    throw "Loopback safety check failed: SQL reports machine '$serverMachine', not this computer."
  }
  if ($serverInstance -ine $selected.InstanceName) {
    throw "Loopback safety check failed: connected instance '$serverInstance' does not match selected instance '$($selected.InstanceName)'."
  }
  if ($serverProcessId -ne [int]$serviceAfterRestart.ProcessId) {
    throw "Loopback safety check failed: the SQL process does not match the selected local Windows service."
  }
  if ($netTransport -ine "TCP" -or $localTcpPort -ne $TcpPort) {
    throw "Loopback safety check failed: the connection is not TCP on local port $TcpPort."
  }
  if ($integratedOnly -ne 0) {
    throw "Mixed-mode authentication is still disabled after restart."
  }
  if ($isSysadmin -ne 1) {
    throw "The current Windows account is not a sysadmin on this local SQL instance; login/database provisioning cannot continue."
  }

  Write-Status "Loopback identity, process, instance, TCP port, mixed-auth, and sysadmin checks passed."

  Invoke-SqlNonQuery -Connection $integratedConnection -CommandText @"
IF DB_ID(N'$DatabaseName') IS NULL
  EXEC(N'CREATE DATABASE [$DatabaseName]');

IF EXISTS (
  SELECT 1
  FROM sys.databases
  WHERE name = N'$DatabaseName'
    AND state_desc <> N'ONLINE'
)
  ;THROW 51000, '$DatabaseName exists but is not ONLINE.', 1;
"@

  $principalCommand = $integratedConnection.CreateCommand()
  try {
    $principalCommand.CommandText = "SELECT type_desc FROM sys.server_principals WHERE name = N'$LoginName';"
    $principalType = $principalCommand.ExecuteScalar()
  } finally {
    $principalCommand.Dispose()
  }
  if ($null -ne $principalType -and $principalType -ne [DBNull]::Value -and [string]$principalType -ne "SQL_LOGIN") {
    throw "A non-SQL principal named $LoginName already exists. Refusing to alter it."
  }

  $generatedPassword = New-StrongPassword
  # The generator deliberately excludes a single quote, but escape defensively.
  $sqlPassword = $generatedPassword.Replace("'", "''")

  Invoke-SqlNonQuery -Connection $integratedConnection -CommandText @"
IF SUSER_ID(N'$LoginName') IS NULL
BEGIN
  CREATE LOGIN [$LoginName]
    WITH PASSWORD = N'$sqlPassword',
         CHECK_POLICY = ON,
         CHECK_EXPIRATION = OFF,
         DEFAULT_DATABASE = [$DatabaseName];
END
ELSE
BEGIN
  ALTER LOGIN [$LoginName]
    WITH PASSWORD = N'$sqlPassword',
         CHECK_POLICY = ON,
         CHECK_EXPIRATION = OFF,
         DEFAULT_DATABASE = [$DatabaseName];
  ALTER LOGIN [$LoginName] ENABLE;
END;

USE [$DatabaseName];
IF USER_ID(N'$LoginName') IS NULL
  CREATE USER [$LoginName] FOR LOGIN [$LoginName];
ELSE
  ALTER USER [$LoginName] WITH LOGIN = [$LoginName];

IF ISNULL(IS_ROLEMEMBER(N'db_owner', N'$LoginName'), 0) <> 1
  ALTER ROLE [db_owner] ADD MEMBER [$LoginName];
"@

  $envContent = @"
# Generated by scripts/configure-local-sql.ps1 for local development only.
# This file is Git-ignored. Do not commit or share it.
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=$TcpPort
DB_NAME=$DatabaseName
DB_USER=$LoginName
DB_PASSWORD=$generatedPassword
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_AUTO_SYNC=false
DEV_LOGIN_EMAIL=developer@herp.local
DEV_LOGIN_DOMAIN=HOO-PDC.vebalibya.local
DEV_LOGIN_DISPLAY_NAME=Local Development Administrator
DEV_LOGIN_SAM_ACCOUNT_NAME=herp_developer
GRAPH_ENABLED=false
"@

  Write-PrivateUtf8File -Path $EnvLocalPath -Content ($envContent + [Environment]::NewLine)

  $sqlLoginBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $sqlLoginBuilder.DataSource = $LoopbackDataSource
  $sqlLoginBuilder.InitialCatalog = $DatabaseName
  $sqlLoginBuilder.IntegratedSecurity = $false
  $sqlLoginBuilder.UserID = $LoginName
  $sqlLoginBuilder.Password = $generatedPassword
  $sqlLoginBuilder.Encrypt = $false
  $sqlLoginBuilder.TrustServerCertificate = $true
  $sqlLoginBuilder.ConnectTimeout = 5
  $sqlLoginBuilder.ApplicationName = "HERP Local SQL Setup Verification"

  $verificationConnection = New-Object System.Data.SqlClient.SqlConnection($sqlLoginBuilder.ConnectionString)
  try {
    $verificationConnection.Open()
    $verificationCommand = $verificationConnection.CreateCommand()
    try {
      $verificationCommand.CommandText = "SELECT ISNULL(IS_ROLEMEMBER(N'db_owner'), 0);"
      if ([int]$verificationCommand.ExecuteScalar() -ne 1) {
        throw "The local SQL login connected but is not a member of db_owner."
      }
    } finally {
      $verificationCommand.Dispose()
    }
  } catch {
    throw "Local SQL login verification failed. The password was written only to BackEnd/.env.local and was not printed."
  } finally {
    $verificationConnection.Dispose()
    $sqlLoginBuilder.Password = ""
  }

  Write-Status "Created/updated $DatabaseName and local SQL login $LoginName with db_owner membership."
  Write-Status "Wrote the generated credential to ignored BackEnd/.env.local with a private ACL."
  Write-Status "Setup and SQL-login verification completed successfully."
} finally {
  if ($null -ne $integratedConnection) {
    $integratedConnection.Dispose()
  }
  $generatedPassword = $null
}
