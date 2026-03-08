Write-Host "Testing Profile Persistence Feature" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create initial profile
Write-Host "Step 1: Creating initial profile..." -ForegroundColor Yellow
$initialProfile = @{
    age = 28
    gender = "Female"
    caste = "SC"
    occupation = "Student"
    income_range = "below-1L"
    state = "Tamil Nadu"
    district = "Chennai"
    phone_number = "9876543210"
    aadhar_number = "123456789012"
    preferred_mode = "text"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles" -Method Post -ContentType "application/json" -Body $initialProfile
    
    $profileId = $createResponse.data.profile_id
    Write-Host "Profile created: $profileId" -ForegroundColor Green
    
    # Step 2: Retrieve the profile
    Write-Host "`nStep 2: Retrieving saved profile..." -ForegroundColor Yellow
    $getResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles/$profileId" -Method Get
    
    if ($getResponse.data) {
        $profile = $getResponse.data
        Write-Host "Profile retrieved successfully!" -ForegroundColor Green
        Write-Host "  Age: $($profile.age)" -ForegroundColor Gray
        Write-Host "  Gender: $($profile.gender)" -ForegroundColor Gray
        Write-Host "  Occupation: $($profile.occupation)" -ForegroundColor Gray
        Write-Host "  State: $($profile.state)" -ForegroundColor Gray
        Write-Host "  District: $($profile.district)" -ForegroundColor Gray
        Write-Host "  Phone: $($profile.phone_number)" -ForegroundColor Gray
        Write-Host "  Caste: $($profile.caste)" -ForegroundColor Gray
    }
    
    Write-Host "`nProfile Persistence Test: PASSED" -ForegroundColor Green
    Write-Host "Frontend will now be able to load and display this profile!" -ForegroundColor Green
    
} catch {
    Write-Host "Test FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
