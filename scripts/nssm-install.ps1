# SPGPS — ติดตั้ง/สร้าง NSSM services ใหม่ (รัน PowerShell as Administrator)
# แก้ค่าด้านล่างให้ตรงเครื่อง server ก่อนรัน

$AppRoot   = "C:\NextJSTest\SPGPS"
$Port      = 3003
$NodeExe   = "C:\Program Files\nodejs\node.exe"
$NssmExe   = "nssm"   # หรือ "C:\Tools\nssm\win64\nssm.exe"

$WebService    = "SPGPS Web"
$WorkerService = "SPGPS Worker"

$LogsDir = Join-Path $AppRoot "logs"

function Invoke-Nssm {
    param([string[]]$Args)
    & $NssmExe @Args
    if ($LASTEXITCODE -ne 0) {
        throw "nssm failed: $($Args -join ' ')"
    }
}

function Remove-ServiceIfExists {
    param([string]$Name)
    $svc = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "Stopping and removing $Name ..."
        try { Invoke-Nssm @("stop", $Name) } catch {}
        Start-Sleep -Seconds 2
        try { Invoke-Nssm @("remove", $Name, "confirm") } catch {
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
if (-not (Test-Path (Join-Path $AppRoot ".next"))) {
    Write-Warning "No .next folder — run 'npm run build' in $AppRoot first"
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# ปิด services.msc ถ้าเปิดอยู่ แล้วรอให้ Windows ลบ service เก่าเสร็จ
Remove-ServiceIfExists $WebService
Remove-ServiceIfExists $WorkerService
Start-Sleep -Seconds 2

# --- SPGPS Web ---
Write-Host "Installing $WebService ..."
Invoke-Nssm @("install", $WebService, $NodeExe)
Invoke-Nssm @("set", $WebService, "AppDirectory", $AppRoot)
Invoke-Nssm @(
    "set", $WebService, "AppParameters",
    "node_modules\next\dist\bin\next start -H 0.0.0.0 -p $Port"
)
Invoke-Nssm @("set", $WebService, "DisplayName", "SPGPS Web")
Invoke-Nssm @("set", $WebService, "Description", "SPGPS Next.js web app")
Invoke-Nssm @("set", $WebService, "Start", "SERVICE_AUTO_START")
Invoke-Nssm @("set", $WebService, "AppStdout", (Join-Path $LogsDir "web.out.log"))
Invoke-Nssm @("set", $WebService, "AppStderr", (Join-Path $LogsDir "web.err.log"))
Invoke-Nssm @("set", $WebService, "AppRotateFiles", "1")
Invoke-Nssm @("set", $WebService, "AppRotateBytes", "10485760")
Invoke-Nssm @("set", $WebService, "AppEnvironmentExtra", "NODE_ENV=production")

# --- SPGPS Worker ---
Write-Host "Installing $WorkerService ..."
Invoke-Nssm @("install", $WorkerService, $NodeExe)
Invoke-Nssm @("set", $WorkerService, "AppDirectory", $AppRoot)
Invoke-Nssm @(
    "set", $WorkerService, "AppParameters",
    "node_modules\tsx\dist\cli.mjs --env-file=.env worker\poll-locations.ts"
)
Invoke-Nssm @("set", $WorkerService, "DisplayName", "SPGPS Worker")
Invoke-Nssm @("set", $WorkerService, "Description", "SPGPS Scalefusion GPS poll worker")
Invoke-Nssm @("set", $WorkerService, "Start", "SERVICE_AUTO_START")
Invoke-Nssm @("set", $WorkerService, "AppStdout", (Join-Path $LogsDir "worker.out.log"))
Invoke-Nssm @("set", $WorkerService, "AppStderr", (Join-Path $LogsDir "worker.err.log"))
Invoke-Nssm @("set", $WorkerService, "AppRotateFiles", "1")
Invoke-Nssm @("set", $WorkerService, "AppRotateBytes", "10485760")
Invoke-Nssm @("set", $WorkerService, "AppEnvironmentExtra", "NODE_ENV=production")

Write-Host ""
Write-Host "Starting services ..."
Invoke-Nssm @("start", $WebService)
Invoke-Nssm @("start", $WorkerService)

Write-Host ""
Write-Host "Done. Check:"
Write-Host "  nssm status `"$WebService`""
Write-Host "  nssm status `"$WorkerService`""
Write-Host "  http://localhost:$Port"
Write-Host ""
Write-Host "Optional — ตั้งบัญชี Windows (ไม่ใช้ Local System):"
Write-Host "  nssm set `"$WebService`" ObjectName .\YourUser YourPassword"
Write-Host "  nssm set `"$WorkerService`" ObjectName .\YourUser YourPassword"
Write-Host ""
Write-Host "Firewall:"
Write-Host "  netsh advfirewall firewall add rule name=`"SPGPS Web $Port`" dir=in action=allow protocol=TCP localport=$Port"
