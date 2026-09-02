# SPGPS - Migrate from PM2 back to NSSM (PowerShell as Administrator)

$ErrorActionPreference = "Stop"
$ScriptsDir = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) "scripts" }

Write-Host "=== SPGPS migrate PM2 to NSSM ==="
Write-Host ""

& (Join-Path $ScriptsDir "pm2-uninstall.ps1")
Write-Host ""
& (Join-Path $ScriptsDir "nssm-install.ps1")
