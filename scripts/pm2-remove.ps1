# SPGPS - Stop and remove PM2 apps

$ErrorActionPreference = "Stop"

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "pm2 not installed - nothing to remove"
    exit 0
}

Write-Host "Stopping SPGPS PM2 apps ..."
pm2 delete spgps-web spgps-worker 2>$null
pm2 save --force
Write-Host "Done."
