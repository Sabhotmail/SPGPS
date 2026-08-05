# SPGPS - Install NSSM services (run PowerShell as Administrator)
# Edit $AppRoot and $Port below before running.

$AppRoot   = "C:\NextJSTest\SPGPS"
$Port      = 3003
$NodeExe   = "C:\Program Files\nodejs\node.exe"
$NssmExe   = "nssm"   # or "C:\Tools\nssm\win64\nssm.exe"

$WebService    = "SPGPS Web"
$WorkerService = "SPGPS Worker"

$LogsDir = Join-Path $AppRoot "logs"

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

Write-Host "=== SPGPS NSSM install ==="
Write-Host "AppRoot: $AppRoot"
Write-Host "Port:    $Port"
Write-Host ""

if (-not (Test-Path $AppRoot)) {
    throw "AppRoot not found: $AppRoot"
}
if (-not (Test-Path $NodeExe)) {
    throw "Node not found: $NodeExe"
}
$nextDir = Join-Path $AppRoot ".next"
if (-not (Test-Path $nextDir)) {
    Write-Warning "No .next folder - run npm run build in $AppRoot first"
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Remove-ServiceIfExists -Name $WebService
Remove-ServiceIfExists -Name $WorkerService
Start-Sleep -Seconds 2

# SPGPS Web
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

# SPGPS Worker
Write-Host "Installing $WorkerService ..."
Invoke-Nssm -NssmArgs @("install", $WorkerService, $NodeExe)
Invoke-Nssm -NssmArgs @("set", $WorkerService, "AppDirectory", $AppRoot)
Invoke-Nssm -NssmArgs @(
    "set", $WorkerService, "AppParameters",
    "node_modules\tsx\dist\cli.mjs --env-file=.env worker\poll-locations.ts"
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
Write-Host "Starting services ..."
Invoke-Nssm -NssmArgs @("start", $WebService)
Invoke-Nssm -NssmArgs @("start", $WorkerService)

Write-Host ""
Write-Host "Done. Check:"
Write-Host ('  nssm status "' + $WebService + '"')
Write-Host ('  nssm status "' + $WorkerService + '"')
Write-Host "  http://localhost:$Port"
Write-Host ""
Write-Host "Optional - set Windows account (not Local System):"
Write-Host ('  nssm set "' + $WebService + '" ObjectName .\YourUser YourPassword')
Write-Host ('  nssm set "' + $WorkerService + '" ObjectName .\YourUser YourPassword')
Write-Host ""
Write-Host "Firewall:"
Write-Host "  netsh advfirewall firewall add rule name=SPGPS-Web-$Port dir=in action=allow protocol=TCP localport=$Port"
