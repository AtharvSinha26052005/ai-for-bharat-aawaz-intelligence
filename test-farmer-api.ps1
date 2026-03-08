# PowerShell script to test Farmer Fallback API

Write-Host "🧪 Testing Farmer Fallback Integration" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

# Test profile data
$farmerProfile = @{
    age = 35
    gender = "Male"
    caste = "SC"
    occupation = "Farmer"
    income_range = "below-1L"
    state = "Tamil Nadu"
    disabled = $false
} | ConvertTo-Json

Write-Host "`n📝 Test Profile:" -ForegroundColor Yellow
Write-Host $farmerProfile

# Step 1: Create profile
Write-Host "`n🔄 Step 1: Creating profile..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles" `
        -Method Post `
        -ContentType "application/json" `
        -Body $farmerProfile
    
    $profileId = $createResponse.profile_id
    Write-Host "✅ Profile created: $profileId" -ForegroundColor Green
    
    # Step 2: Get AI recommendations
    Write-Host "`n🔄 Step 2: Fetching AI recommendations..." -ForegroundColor Yellow
    $schemesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles/$profileId/schemes" `
        -Method Get
    
    $schemes = $schemesResponse.schemes
    Write-Host "✅ Received $($schemes.Count) schemes" -ForegroundColor Green
    
    # Step 3: Analyze results
    Write-Host "`n📊 Analysis:" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Gray
    
    $fallbackSchemes = $schemes | Where-Object { $_.is_fallback -eq $true -or $_.fallback_category }
    $regularSchemes = $schemes | Where-Object { -not $_.is_fallback -and -not $_.fallback_category }
    
    Write-Host "`n🌾 Fallback Schemes: $($fallbackSchemes.Count)" -ForegroundColor Yellow
    Write-Host "📋 Regular Schemes: $($regularSchemes.Count)" -ForegroundColor Yellow
    
    if ($fallbackSchemes.Count -gt 0) {
        Write-Host "`n✅ FARMER FALLBACK TRIGGERED!" -ForegroundColor Green
        Write-Host "`nFallback Schemes:" -ForegroundColor Cyan
        
        $idx = 1
        foreach ($scheme in $fallbackSchemes) {
            Write-Host "`n$idx. $($scheme.name)" -ForegroundColor White
            Write-Host "   Ministry: $($scheme.ministry)" -ForegroundColor Gray
            Write-Host "   Final Score: $([math]::Round($scheme.final_score * 100))%" -ForegroundColor Gray
            $category = if ($scheme.fallback_category) { $scheme.fallback_category } else { $scheme.category }
            Write-Host "   Category: $category" -ForegroundColor Gray
            Write-Host "   Apply Link: $($scheme.apply_link)" -ForegroundColor Gray
            $idx++
        }
    } else {
        Write-Host "`n⚠️  Fallback NOT triggered" -ForegroundColor Yellow
        Write-Host "`nTop 3 Regular Schemes:" -ForegroundColor Cyan
        
        $idx = 1
        foreach ($scheme in ($regularSchemes | Select-Object -First 3)) {
            Write-Host "`n$idx. $($scheme.name)" -ForegroundColor White
            Write-Host "   Final Score: $([math]::Round($scheme.final_score * 100))%" -ForegroundColor Gray
            Write-Host "   Semantic Score: $([math]::Round($scheme.semantic_score * 100))%" -ForegroundColor Gray
            Write-Host "   Eligibility Score: $([math]::Round($scheme.eligibility_score * 100))%" -ForegroundColor Gray
            $idx++
        }
    }
    
    Write-Host "`n$("=" * 60)" -ForegroundColor Gray
    Write-Host "✅ TEST COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
}
