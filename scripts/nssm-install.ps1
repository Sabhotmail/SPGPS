# SPGPS - Install NSSM services (run PowerShell as Administrator)

$ErrorActionPreference = "Stop"
$AppRoot = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
$NodeExe = "C:\Program Files\nodejs\node.exe"
$NssmExe = "nssm"

$WebService = "SPGPS Web"
$WorkerService = "SPGPS Worker"
$LogsDir = Join-Path $AppRoot "logs"

function Test-IsAdministrator {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PortFromEnvFile {
    param([string]$Path)

    $port = 3000
    if (-not (Test-Path $Path)) { return $port }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)\s*$') {
            return [int]$Matches[1]
        }
    }

    return $port
}

function Ensure-FirewallRule {
    param(
        [int]$Port,
        [string]$RuleName
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    netsh advfirewall firewall delete rule name="$RuleName" | Out-Null
    $ErrorActionPreference = $previous

    netsh advfirewall firewall add rule name="$RuleName" dir=in action=allow protocol=TCP localport=$Port | Out-Null
}

function Invoke-Nssm {
    param([string[]]$NssmArgs)
    & $NssmExe @NssmArgs
    if ($LASTEXITCODE -ne 0) {
        throw "nssm failed: $($NssmArgs -join ' ')"
    }
}

function Remove-ServiceIfExists {
    param([string]$Name)
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "Stopping and removing $Name ..."
        try { Invoke-Nssm -NssmArgs @("stop", $Name) } catch {}
        Start-Sleep -Seconds 2
        try {
            Invoke-Nssm -NssmArgs @("remove", $Name, "confirm")
        } catch {
            sc.exe stop $Name | Out-Null
            sc.exe delete $Name | Out-Null
            Start-Sleep -Seconds 3
        }
    }
}

if (-not (Test-IsAdministrator)) {
    throw "Run PowerShell as Administrator to install NSSM services."
}

$envFile = Join-Path $AppRoot ".env"
$Port = Get-PortFromEnvFile -Path $envFile

Write-Host "=== SPGPS NSSM install ==="
Write-Host "AppRoot: $AppRoot"
Write-Host "Port:    $Port (from .env)"
Write-Host ""

if (-not (Test-Path $AppRoot)) {
    throw "AppRoot not found: $AppRoot"
}
if (-not (Get-Command $NssmExe -ErrorAction SilentlyContinue)) {
    throw "nssm not found. Install NSSM and add it to PATH."
}
if (-not (Test-Path $NodeExe)) {
    throw "Node not found: $NodeExe"
}
if (-not (Test-Path (Join-Path $AppRoot ".next"))) {
    Write-Warning "No .next folder - run npm run build in $AppRoot first"
}
if (-not (Test-Path $envFile)) {
    Write-Warning "No .env file - copy from .env.example and configure"
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Remove-ServiceIfExists -Name $WebService
Remove-ServiceIfExists -Name $WorkerService
Start-Sleep -Seconds 2

Write-Host "Installing $WebService ..."
Invoke-Nssm -NssmArgs @("install", $WebService, $NodeExe)
Invoke-Nssm -NssmArgs @("set", $WebService, "AppDirectory", $AppRoot)
Invoke-Nssm -NssmArgs @(
    "set", $WebService, "AppParameters",
    "node_modules\next\dist\bin\next start -H 0.0.0.0 -p $Port"
)
Invoke-Nssm -NssmArgs @("set", $WebService, "DisplayName", "SPGPS Web")
Invoke-Nssm -NssmArgs @("set", $WebService, "Description", "SPGPS Next.js web app")
Invoke-Nssm -NssmArgs @("set", $WebService, "Start", "SERVICE_AUTO_START")
Invoke-Nssm -NssmArgs @("set", $WebService, "AppStdout", (Join-Path $LogsDir "web.out.log"))
Invoke-Nssm -NssmArgs @("set", $WebService, "AppStderr", (Join-Path $LogsDir "web.err.log"))
Invoke-Nssm -NssmArgs @("set", $WebService, "AppRotateFiles", "1")
Invoke-Nssm -NssmArgs @("set", $WebService, "AppRotateBytes", "10485760")
Invoke-Nssm -NssmArgs @("set", $WebService, "AppEnvironmentExtra", "NODE_ENV=production")

Write-Host "Installing $WorkerService ..."
Invoke-Nssm -NssmArgs @("install", $WorkerService, $NodeExe)
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppDirectory", $AppRoot)
Invoke-Nssm -NssmArgs @(
    "set", $WorkerService, "AppParameters",
    "scripts\run-worker.cjs"
)
Invoke-Nssm -NssmArgs @("set", $WorkerService, "DisplayName", "SPGPS Worker")
Invoke-Nssm -NssmArgs @("set", $WorkerService, "Description", "SPGPS Scalefusion GPS poll worker")
Invoke-Nssm -NssmArgs @("set", $WorkerService, "Start", "SERVICE_AUTO_START")
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppStdout", (Join-Path $LogsDir "worker.out.log"))
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppStderr", (Join-Path $LogsDir "worker.err.log"))
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppRotateFiles", "1")
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppRotateBytes", "10485760")
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppEnvironmentExtra", "NODE_ENV=production")

Write-Host ""
Write-Host "Opening Windows Firewall for port $Port ..."
Ensure-FirewallRule -Port $Port -RuleName "SPGPS Web $Port"

Write-Host "Starting services ..."
Invoke-Nssm -NssmArgs @("start", $WebService)
Invoke-Nssm -NssmArgs @("start", $WorkerService)

Write-Host ""
Write-Host "Done. Check:"
Write-Host ('  nssm status "' + $WebService + '"')
Write-Host ('  nssm status "' + $WorkerService + '"')
Write-Host "  http://localhost:$Port"
Write-Host ""
Write-Host "Useful commands:"
Write-Host ('  nssm restart "' + $WebService + '"')
Write-Host ('  nssm restart "' + $WorkerService + '"')
Write-Host "  type $LogsDir\web.err.log"
Write-Host ""
Write-Host "If you change PORT in .env, re-run this script as Administrator."
