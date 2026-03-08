Write-Host "Testing Financial Advice Feature" -ForegroundColor Cyan
Write-Host ""

# Get profile ID from localStorage or create test profile
$profileId = "79efbf23-9c32-4f5a-881e-4d3d33308913" # Use existing test profile

Write-Host "Step 1: Marking scheme as interested..." -ForegroundColor Yellow
try {
    $schemeData = @{
        profile_id = $profileId
        scheme_name = "PM-Kisan Samman Nidhi"
        scheme_slug = "pm-kisan"
        scheme_description = "Direct income support scheme for small and marginal farmers"
        scheme_benefits = "₹6000 per year in three installments"
        scheme_ministry = "Ministry of Agriculture and Farmers Welfare"
        scheme_apply_link = "https://pmkisan.gov.in/"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/interested-schemes" `
        -Method Post `
        -ContentType "application/json" `
        -Body $schemeData

    Write-Host "Scheme marked as interested!" -ForegroundColor Green
    Write-Host "  ID: $($response.data.id)" -ForegroundColor Gray
    Write-Host "  Already Exists: $($response.data.already_exists)" -ForegroundColor Gray
    Write-Host ""

    Write-Host "Step 2: Fetching interested schemes..." -ForegroundColor Yellow
    $schemes = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/interested-schemes/$profileId" `
        -Method Get

    Write-Host "Found $($schemes.count) interested scheme(s)" -ForegroundColor Green
    foreach ($scheme in $schemes.data) {
        Write-Host "  - $($scheme.scheme_name)" -ForegroundColor Gray
    }
    Write-Host ""

    Write-Host "Step 3: Getting financial advice..." -ForegroundColor Yellow
    $adviceRequest = @{
        scheme_name = "PM-Kisan Samman Nidhi"
        scheme_description = "Direct income support scheme for small and marginal farmers"
        scheme_benefits = "₹6000 per year in three installments"
        profile_id = $profileId
    } | ConvertTo-Json

    $advice = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/interested-schemes/financial-advice" `
        -Method Post `
        -ContentType "application/json" `
        -Body $adviceRequest

    Write-Host "Financial advice generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Overall Advice:" -ForegroundColor Cyan
    Write-Host "  $($advice.data.advice)" -ForegroundColor White
    Write-Host ""
    Write-Host "Key Points:" -ForegroundColor Cyan
    foreach ($point in $advice.data.key_points) {
        Write-Host "  • $point" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Utilization Tips:" -ForegroundColor Cyan
    $tipNum = 1
    foreach ($tip in $advice.data.utilization_tips) {
        Write-Host "  $tipNum. $tip" -ForegroundColor White
        $tipNum++
    }
    Write-Host ""
    Write-Host "Potential Impact:" -ForegroundColor Cyan
    Write-Host "  $($advice.data.potential_impact)" -ForegroundColor White
    Write-Host ""

    Write-Host "All tests PASSED!" -ForegroundColor Green

} catch {
    Write-Host "Test FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
}
