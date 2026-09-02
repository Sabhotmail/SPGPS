# SPGPS - Start with PM2 and save process list (run from project root)
# For auto-start on Windows boot, see README "PM2 startup" section.

$ErrorActionPreference = "Stop"
$AppRoot = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
$LogsDir = Join-Path $AppRoot "logs"

Set-Location $AppRoot

function Require-Command($Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name not found. Install: npm install -g pm2"
    }
}

Write-Host "=== SPGPS PM2 install ==="
Write-Host "AppRoot: $AppRoot"
Write-Host ""

Require-Command "pm2"
Require-Command "node"

if (-not (Test-Path (Join-Path $AppRoot ".next"))) {
    Write-Warning "No .next folder - run 'npm run build' first"
}

if (-not (Test-Path (Join-Path $AppRoot ".env"))) {
    Write-Warning "No .env file - copy from .env.example and configure"
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Write-Host "Stopping old PM2 apps (if any) ..."
pm2 delete spgps-web spgps-worker 2>$null

Write-Host "Starting apps from ecosystem.config.cjs ..."
pm2 start ecosystem.config.cjs

Write-Host "Saving PM2 process list ..."
pm2 save

Write-Host ""
pm2 status
Write-Host ""
$port = 3000
$envFile = Join-Path $AppRoot ".env"
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)\s*$') {
            $port = $Matches[1]
            break
        }
    }
}
Write-Host "Web: http://localhost:$port"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  pm2 status"
Write-Host "  pm2 logs"
Write-Host "  pm2 restart spgps-web"
Write-Host "  pm2 restart spgps-worker"
Write-Host "  pm2 restart all"
Write-Host ""
Write-Host "Auto-start on boot (Windows): see README section 'Windows — PM2'"
