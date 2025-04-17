# OpTicket System Development Startup Script

# Function to check if a process is running on a specific port
function Test-PortInUse {
    param(
        [int]$Port
    )

    $connections = netstat -ano | findstr ":$Port"
    return $connections.Length -gt 0
}

# Start the backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
if (-not (Test-PortInUse -Port 4000)) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\backend'; npm run dev"
} else {
    Write-Host "Port 4000 is already in use. Backend server may already be running." -ForegroundColor Red
}

# Start the frontend server
Write-Host "Starting frontend server..." -ForegroundColor Yellow
if (-not (Test-PortInUse -Port 3000)) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\frontend'; npm run dev"
} else {
    Write-Host "Port 3000 is already in use. Frontend server may already be running." -ForegroundColor Red
}

Write-Host "Development servers started!" -ForegroundColor Green
Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Cyan
