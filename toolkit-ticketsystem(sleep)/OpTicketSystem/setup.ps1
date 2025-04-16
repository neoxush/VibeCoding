# OpTicket System Setup Script

Write-Host "Setting up OpTicket System..." -ForegroundColor Green

# Create directories if they don't exist
if (-not (Test-Path -Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    $currentLocation = Get-Location
    Set-Location -Path "frontend"
    npm install
    Set-Location -Path $currentLocation
}

if (-not (Test-Path -Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    $currentLocation = Get-Location
    Set-Location -Path "backend"
    npm install
    Set-Location -Path $currentLocation
}

# Initialize the database
Write-Host "Initializing the database..." -ForegroundColor Yellow
$currentLocation = Get-Location
Set-Location -Path "backend"
npx prisma migrate dev --name init
Set-Location -Path $currentLocation

Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the frontend development server:" -ForegroundColor Cyan
Write-Host ".\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To start the backend development server:" -ForegroundColor Cyan
Write-Host ".\start-backend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or start both at once:" -ForegroundColor Cyan
Write-Host ".\start-dev.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Cyan
