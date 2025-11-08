# Start PostgreSQL Service
Write-Host "`n=== Starting PostgreSQL ===`n"

$pgPath = "C:\Program Files\PostgreSQL\18\bin"
$dataPath = "C:\Program Files\PostgreSQL\18\data"

Write-Host "PostgreSQL path: $pgPath"

if (Test-Path "$pgPath\pg_ctl.exe") {
    Write-Host "✅ Found PostgreSQL"
    
    # Try to start PostgreSQL service
    Write-Host "`nAttempting to start PostgreSQL..."
    
    try {
        # Try different possible service names
        $serviceNames = @("postgresql-x64-18", "postgresql-x64-18-server", "postgresql18", "postgresql18-x64")
        
        foreach ($serviceName in $serviceNames) {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service) {
                Write-Host "Found service: $serviceName"
                if ($service.Status -eq 'Stopped') {
                    Start-Service -Name $serviceName
                    Write-Host "✅ Started service: $serviceName"
                    Start-Sleep -Seconds 3
                    break
                } elseif ($service.Status -eq 'Running') {
                    Write-Host "✅ Service already running: $serviceName"
                    break
                }
            }
        }
        
        # If no service found, try manual start
        Write-Host "`nIf service not found, you need to:"
        Write-Host "1. Open Services (Press Win+R, type 'services.msc')"
        Write-Host "2. Find 'postgresql' service"
        Write-Host "3. Right-click → Start"
        Write-Host "`nOr check if PostgreSQL is running as a background process"
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)"
    }
} else {
    Write-Host "❌ PostgreSQL not found at expected path"
}

Write-Host "`nAfter starting, run: node diagnose-db.js`n"

