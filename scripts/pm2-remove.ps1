# SPGPS - Stop and remove PM2 apps

$ErrorActionPreference = "Stop"

function Remove-Pm2AppsIfExist {
    param([string[]]$Names)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        foreach ($name in $Names) {
            & pm2 delete $name 2>&1 | Out-Null
        }
    } finally {
        $ErrorActionPreference = $previous
    }
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "pm2 not installed - nothing to remove"
    exit 0
}

Write-Host "Stopping SPGPS PM2 apps ..."
Remove-Pm2AppsIfExist -Names @("spgps-web", "spgps-worker")
pm2 save --force
Write-Host "Done."
