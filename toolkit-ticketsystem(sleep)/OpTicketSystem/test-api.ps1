# OpTicket System API Test Script

Write-Host "Testing OpTicket System API..." -ForegroundColor Green

# Test the health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get
    Write-Host "Health endpoint response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error testing health endpoint: $_" -ForegroundColor Red
}

# Test user registration endpoint
Write-Host "Testing user registration endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        username = "testadmin"
        email = "testadmin@example.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Registration endpoint response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error testing registration endpoint: $_" -ForegroundColor Red
}

# Test login endpoint
Write-Host "Testing login endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        email = "testadmin@example.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Login endpoint response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error testing login endpoint: $_" -ForegroundColor Red
}

Write-Host "API tests completed!" -ForegroundColor Green
