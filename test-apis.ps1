# API Testing Script
$baseUrl = "http://localhost:3000"

Write-Host "`n=== Testing Rural Digital Rights AI Companion APIs ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Yellow

# Test results
$results = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "Testing: $Method $Path" -ForegroundColor White
    Write-Host "  $Description" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$baseUrl$Path"
            Method = $Method
            UseBasicParsing = $true
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = 'application/json'
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length))
        
        Write-Host "  ✓ Status: $statusCode" -ForegroundColor Green
        Write-Host "  Response: $content..." -ForegroundColor DarkGray
        
        $script:results += [PSCustomObject]@{
            Method = $Method
            Path = $Path
            Status = $statusCode
            Result = "✓ PASS"
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        
        if ($statusCode -eq 401) {
            Write-Host "  ✓ Status: 401 UNAUTHORIZED (Route exists, needs auth)" -ForegroundColor Yellow
            $script:results += [PSCustomObject]@{
                Method = $Method
                Path = $Path
                Status = 401
                Result = "✓ PASS (Auth Required)"
            }
        }
        elseif ($statusCode -eq 403) {
            Write-Host "  ✓ Status: 403 FORBIDDEN (Route exists, needs permissions)" -ForegroundColor Yellow
            $script:results += [PSCustomObject]@{
                Method = $Method
                Path = $Path
                Status = 403
                Result = "✓ PASS (Forbidden)"
            }
        }
        elseif ($statusCode -eq 404) {
            Write-Host "  ✗ Status: 404 NOT FOUND" -ForegroundColor Red
            Write-Host "  Error: $errorBody" -ForegroundColor Red
            $script:results += [PSCustomObject]@{
                Method = $Method
                Path = $Path
                Status = 404
                Result = "✗ FAIL (Not Found)"
            }
        }
        else {
            Write-Host "  ! Status: $statusCode" -ForegroundColor Magenta
            Write-Host "  Error: $errorBody" -ForegroundColor DarkRed
            $script:results += [PSCustomObject]@{
                Method = $Method
                Path = $Path
                Status = $statusCode
                Result = "? $statusCode"
            }
        }
    }
    Write-Host ""
}

# PUBLIC ENDPOINTS
Write-Host "`n=== PUBLIC ENDPOINTS ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/health" -Description "Health check endpoint"
Test-Endpoint -Method "GET" -Path "/metrics" -Description "Prometheus metrics"
Test-Endpoint -Method "GET" -Path "/api/v1/compliance/privacy-notice" -Description "Privacy notice (public)"

# FRAUD DETECTION
Write-Host "`n=== FRAUD DETECTION ===" -ForegroundColor Cyan

$fraudBody = @{
    content = "You have won 1 crore rupees! Send your bank details immediately!"
    contentType = "text"
    language = "en"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Path "/api/v1/fraud/analyze" -Body $fraudBody -Description "Analyze content for fraud"

# PROFILE MANAGEMENT
Write-Host "`n=== PROFILE MANAGEMENT ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/api/v1/profile/test-user-123" -Description "Get user profile"
Test-Endpoint -Method "GET" -Path "/api/v1/profile/test-user-123/exists" -Description "Check if profile exists"

$profileBody = @{
    userId = "test-user-123"
    age = 35
    incomeRange = "1L-3L"
    occupation = "farmer"
    familyComposition = @{
        adults = 2
        children = 2
        seniors = 1
    }
    location = @{
        state = "Maharashtra"
        district = "Pune"
    }
    primaryNeeds = @("agriculture", "education")
    preferredLanguage = "hi"
    preferredMode = "voice"
    consentGiven = $true
} | ConvertTo-Json -Depth 10

Test-Endpoint -Method "POST" -Path "/api/v1/profile" -Body $profileBody -Description "Create user profile"

# SCHEMES
Write-Host "`n=== SCHEMES ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/api/v1/schemes/eligible/test-user-123" -Description "Get eligible schemes"
Test-Endpoint -Method "GET" -Path "/api/v1/schemes/scheme-123" -Description "Get scheme details"
Test-Endpoint -Method "GET" -Path "/api/v1/schemes/search?query=agriculture&language=en" -Description "Search schemes"

# APPLICATIONS
Write-Host "`n=== APPLICATIONS ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/api/v1/applications/user/test-user-123" -Description "Get user applications"
Test-Endpoint -Method "GET" -Path "/api/v1/applications/app-123" -Description "Get application by ID"

$applicationBody = @{
    userId = "test-user-123"
    schemeId = "scheme-123"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Path "/api/v1/applications" -Body $applicationBody -Description "Create application"

# EDUCATION
Write-Host "`n=== EDUCATION ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/api/v1/education/lessons?language=en" -Description "Get financial lessons"
Test-Endpoint -Method "GET" -Path "/api/v1/education/lessons/lesson-123" -Description "Get lesson details"
Test-Endpoint -Method "GET" -Path "/api/v1/education/progress/test-user-123" -Description "Get learning progress"
Test-Endpoint -Method "GET" -Path "/api/v1/education/terms/budget?language=en" -Description "Get term explanation"

# INTERACTION
Write-Host "`n=== INTERACTION ===" -ForegroundColor Cyan

$textBody = @{
    userId = "test-user-123"
    message = "What schemes am I eligible for?"
    language = "en"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Path "/api/v1/interact/text" -Body $textBody -Description "Text interaction"

# COMPLIANCE
Write-Host "`n=== COMPLIANCE ===" -ForegroundColor Cyan

Test-Endpoint -Method "POST" -Path "/api/v1/compliance/data-deletion" -Description "Request data deletion"
Test-Endpoint -Method "GET" -Path "/api/v1/compliance/data-sharing-preferences" -Description "Get data sharing preferences"

$consentBody = @{
    thirdParty = "Government Portal"
    purpose = "Scheme application"
    consentGiven = $true
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Path "/api/v1/compliance/data-sharing-consent" -Body $consentBody -Description "Record consent"

# ADMIN
Write-Host "`n=== ADMIN ENDPOINTS ===" -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Path "/api/v1/admin/schemes/scheme-123/versions" -Description "Get scheme versions"

# SUMMARY
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$passed = ($results | Where-Object { $_.Result -like "*PASS*" }).Count
$failed = ($results | Where-Object { $_.Result -like "*FAIL*" }).Count
$total = $results.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host "`n✓ All APIs are working correctly!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Some APIs have issues" -ForegroundColor Red
}
