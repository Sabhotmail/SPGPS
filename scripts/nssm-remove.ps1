# SPGPS — ลบ NSSM services (รัน PowerShell as Administrator)

$NssmExe = "nssm"
$WebService = "SPGPS Web"
$WorkerService = "SPGPS Worker"

foreach ($name in @($WebService, $WorkerService)) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "Removing $name ..."
        try { & $NssmExe stop $name } catch {}
        Start-Sleep -Seconds 2
        try { & $NssmExe remove $name confirm } catch {
            sc.exe stop $name | Out-Null
            sc.exe delete $name | Out-Null
        }
    } else {
        Write-Host "Not found: $name"
    }
}

Write-Host "Done. If install fails with 'marked for deletion', close services.msc and wait 30s or reboot."
