try {
    $xl = New-Object -ComObject Excel.Application
    Write-Output "Excel is installed. Version: $($xl.Version)"
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
} catch {
    Write-Output "Excel COM is not installed: $_"
}
