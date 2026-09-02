# SPGPS - Install PM2 as a Windows service (hides black node.exe console windows)
# Run PowerShell as Administrator.

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-Pm2Command {
    $cmd = Get-Command pm2.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return "pm2"
}

function Invoke-Pm2 {
    param([string[]]$Args)
    $pm2 = Get-Pm2Command
    & $pm2 @Args
    if ($LASTEXITCODE -ne 0) {
        throw "pm2 failed: pm2 $($Args -join ' ')"
    }
}

if (-not (Test-IsAdministrator)) {
    throw "Run PowerShell as Administrator to install the PM2 Windows service."
}

Write-Host "=== SPGPS PM2 Windows service install ==="
Write-Host ""

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm not found"
}

if (-not (Get-Command pm2-service-install -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pm2-windows-service ..."
    npm install -g pm2-windows-service
}

function Repair-Pm2WindowsService {
    $globalModules = npm root -g 2>$null
    if (-not $globalModules) { return }

    $serviceDir = Join-Path $globalModules "pm2-windows-service"
    if (-not (Test-Path $serviceDir)) { return }

    Write-Host "Patching pm2-windows-service (inquirer) ..."
    Push-Location $serviceDir
    try {
        if (-not (Get-Command ncu -ErrorAction SilentlyContinue)) {
            npm install -g npm-check-updates
        }
        ncu inquirer -u
        npm install
    } finally {
        Pop-Location
    }
}

Repair-Pm2WindowsService

Write-Host "Stopping interactive PM2 daemon (if any) ..."
$previous = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& (Get-Pm2Command) kill 2>&1 | Out-Null
$ErrorActionPreference = $previous

Write-Host "Installing PM2 service ..."
Write-Host "Answer the prompts: Y for each question (defaults are fine)."
Write-Host "Node circular dependency warnings are harmless."
Write-Host ""
pm2-service-install -n PM2

Write-Host ""
Write-Host "PM2 service installed."
Write-Host "Next: run .\scripts\pm2-install.ps1 from the project folder, then pm2 save"
Write-Host ""
