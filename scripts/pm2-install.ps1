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

function Get-Pm2Command {
    $cmd = Get-Command pm2.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return "pm2"
}

function Invoke-Pm2 {
    param([string[]]$Args)
    & (Get-Pm2Command) @Args
    if ($LASTEXITCODE -ne 0) {
        throw "pm2 failed: pm2 $($Args -join ' ')"
    }
}

function Remove-Pm2AppsIfExist {
    param([string[]]$Names)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        foreach ($name in $Names) {
            & (Get-Pm2Command) delete $name 2>&1 | Out-Null
        }
    } finally {
        $ErrorActionPreference = $previous
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
Remove-Pm2AppsIfExist -Names @("spgps-web", "spgps-worker")

Write-Host "Starting apps from ecosystem.config.cjs ..."
Invoke-Pm2 @("start", "ecosystem.config.cjs")

Write-Host "Saving PM2 process list ..."
Invoke-Pm2 @("save")

Write-Host ""
Invoke-Pm2 @("status")
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
Write-Host "Auto-start on boot (Windows): see README section Windows - PM2"
Write-Host ""
Write-Host "If a black node.exe window stays open, install PM2 as a Windows service (Admin):"
Write-Host "  .\scripts\pm2-service-install.ps1"
Write-Host "  .\scripts\pm2-install.ps1"
