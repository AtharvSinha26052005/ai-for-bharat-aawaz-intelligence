Write-Host "Testing Farmer Fallback Integration" -ForegroundColor Cyan

$farmerProfile = @{
    age = 35
    gender = "Male"
    caste = "SC"
    occupation = "Farmer"
    income_range = "below-1L"
    state = "Tamil Nadu"
    district = "Chennai"
    phone_number = "9876543210"
    aadhar_number = "123456789012"
    preferred_mode = "text"
    disabled = $false
} | ConvertTo-Json

Write-Host "Test Profile:" -ForegroundColor Yellow
Write-Host $farmerProfile

Write-Host "Step 1: Creating profile..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles" -Method Post -ContentType "application/json" -Body $farmerProfile
    
    $profileId = $createResponse.data.profile_id
    Write-Host "Profile created: $profileId" -ForegroundColor Green
    
    Write-Host "Step 2: Fetching AI recommendations..." -ForegroundColor Yellow
    $schemesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles/$profileId/schemes" -Method Get
    
    $schemes = $schemesResponse.data
    Write-Host "Received $($schemes.Count) schemes" -ForegroundColor Green
    
    Write-Host "Analysis:" -ForegroundColor Cyan
    
    $fallbackSchemes = $schemes | Where-Object { $_.is_fallback -eq $true -or $_.fallback_category }
    $regularSchemes = $schemes | Where-Object { -not $_.is_fallback -and -not $_.fallback_category }
    
    Write-Host "Fallback Schemes: $($fallbackSchemes.Count)" -ForegroundColor Yellow
    Write-Host "Regular Schemes: $($regularSchemes.Count)" -ForegroundColor Yellow
    
    if ($fallbackSchemes.Count -gt 0) {
        Write-Host "FARMER FALLBACK TRIGGERED!" -ForegroundColor Green
        Write-Host "Fallback Schemes:" -ForegroundColor Cyan
        
        $idx = 1
        foreach ($scheme in $fallbackSchemes) {
            Write-Host "$idx. $($scheme.name)" -ForegroundColor White
            Write-Host "   Ministry: $($scheme.ministry)" -ForegroundColor Gray
            Write-Host "   Final Score: $([math]::Round($scheme.final_score * 100))%" -ForegroundColor Gray
            $category = if ($scheme.fallback_category) { $scheme.fallback_category } else { $scheme.category }
            Write-Host "   Category: $category" -ForegroundColor Gray
            Write-Host "   Apply Link: $($scheme.apply_link)" -ForegroundColor Gray
            $idx++
        }
    } else {
        Write-Host "Fallback NOT triggered" -ForegroundColor Yellow
        Write-Host "Top 3 Regular Schemes:" -ForegroundColor Cyan
        
        $idx = 1
        foreach ($scheme in ($regularSchemes | Select-Object -First 3)) {
            Write-Host "$idx. $($scheme.name)" -ForegroundColor White
            Write-Host "   Final Score: $([math]::Round($scheme.final_score * 100))%" -ForegroundColor Gray
            Write-Host "   Semantic Score: $([math]::Round($scheme.semantic_score * 100))%" -ForegroundColor Gray
            Write-Host "   Eligibility Score: $([math]::Round($scheme.eligibility_score * 100))%" -ForegroundColor Gray
            $idx++
        }
    }
    
    Write-Host "TEST COMPLETED SUCCESSFULLY" -ForegroundColor Green
    
} catch {
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
