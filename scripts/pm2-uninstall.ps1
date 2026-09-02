# SPGPS - Remove PM2 apps, daemon, and Windows service (run as Administrator for service removal)

$ErrorActionPreference = "Stop"

function Get-Pm2Command {
    $cmd = Get-Command pm2.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return "pm2"
}

function Remove-Pm2AppsIfExist {
    param([string[]]$Names)

    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) { return }

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        foreach ($name in $Names) {
            & (Get-Pm2Command) delete $name 2>&1 | Out-Null
        }
        & (Get-Pm2Command) save --force 2>&1 | Out-Null
        & (Get-Pm2Command) kill 2>&1 | Out-Null
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Remove-Pm2WindowsService {
    foreach ($svcName in @("pm2.exe", "PM2")) {
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if (-not $svc) { continue }

        Write-Host "Stopping PM2 Windows service: $svcName ..."
        $previous = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
        $ErrorActionPreference = $previous
    }

    if (Get-Command pm2-service-uninstall -ErrorAction SilentlyContinue) {
        Write-Host "Uninstalling pm2-windows-service ..."
        $previous = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        pm2-service-uninstall 2>&1 | Out-Null
        $ErrorActionPreference = $previous
    }
}

Write-Host "=== SPGPS PM2 uninstall ==="
Write-Host ""

Remove-Pm2AppsIfExist -Names @("spgps-web", "spgps-worker")
Remove-Pm2WindowsService

Write-Host "Done. PM2 apps and service removed (if present)."
