# SPGPS - Open Windows Firewall for the web port in .env
# Run PowerShell as Administrator.

$ErrorActionPreference = "Stop"
$AppRoot = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { Get-Location }
$envFile = Join-Path $AppRoot ".env"

function Test-IsAdministrator {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PortFromEnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw ".env not found at $Path"
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*PORT\s*=\s*(\d+)\s*$') {
            return [int]$Matches[1]
        }
    }

    return 3000
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

if (-not (Test-IsAdministrator)) {
    throw "Run PowerShell as Administrator to change Windows Firewall rules."
}

$port = Get-PortFromEnvFile -Path $envFile
$ruleName = "SPGPS Web $port"

Write-Host "=== SPGPS firewall ==="
Write-Host "PORT from .env: $port"
Write-Host "Adding inbound rule: $ruleName"
Write-Host ""

Ensure-FirewallRule -Port $port -RuleName $ruleName

Write-Host "Done. Test from this machine:"
Write-Host "  curl http://localhost:$port"
Write-Host ""
Write-Host "If you changed PORT in .env, re-run nssm-install.ps1 as Administrator."
