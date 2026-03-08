# Profile Persistence Feature - Demo Guide

## How It Works

### Scenario 1: First Time User

**Step 1: Visit Profile Page**
- URL: `http://localhost:3001/profile`
- Form is empty
- Title: "Create Your Profile"
- Button: "Save & Find Schemes"

**Step 2: Fill Form**
```
Age: 28
Gender: Female
Caste: SC
Occupation: Student
Income Range: Below ₹1 Lakh
State: Tamil Nadu
District: Chennai
Phone: 9876543210
Aadhar: 123456789012
Preferred Mode: Text
```

**Step 3: Click "Save & Find Schemes"**
- Profile saved to database
- Success message: "Profile saved successfully!"
- Profile ID stored in localStorage
- Auto-redirects to `/schemes?profileId=xxx` after 1 second

**Step 4: View Recommendations**
- Schemes page loads with personalized recommendations
- AI system analyzes profile and returns relevant schemes

---

### Scenario 2: Returning User (Profile Persistence)

**Step 1: Visit Profile Page Again**
- URL: `http://localhost:3001/profile`
- System checks localStorage for `profileId`
- Fetches profile from backend
- **All fields are pre-filled with saved data!**

**Step 2: Form Shows Previous Data**
```
Age: 28 ✓ (pre-filled)
Gender: Female ✓ (pre-filled)
Caste: SC ✓ (pre-filled)
Occupation: Student ✓ (pre-filled)
Income Range: Below ₹1 Lakh ✓ (pre-filled)
State: Tamil Nadu ✓ (pre-filled)
District: Chennai ✓ (pre-filled)
Phone: 9876543210 ✓ (pre-filled)
Aadhar: 123456789012 ✓ (pre-filled)
Preferred Mode: Text ✓ (pre-filled)
```

**UI Changes:**
- Title: "Update Your Profile"
- Info Alert: "Your previous profile has been loaded. You can update any field and save."
- Button: "Update & Find Schemes"

**Step 3: Update Single Field**
- User changes: `Occupation: Student` → `Occupation: Farmer`
- All other fields remain unchanged
- No need to re-enter phone, aadhar, address, etc.

**Step 4: Click "Update & Find Schemes"**
- New profile created with updated data
- Success message: "Profile updated successfully!"
- New profile ID stored in localStorage
- Auto-redirects to schemes page

**Step 5: View Fresh Recommendations**
- Schemes page shows recommendations for "Farmer" occupation
- Different schemes than before (farmer-specific schemes)
- Farmer fallback may trigger if Pinecone has weak matches

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRST TIME USER                          │
└─────────────────────────────────────────────────────────────┘

Visit Profile Page
       ↓
Empty Form Shown
       ↓
Fill All Fields
       ↓
Click "Save & Find Schemes"
       ↓
Profile Saved (ID: abc-123)
       ↓
localStorage.setItem('profileId', 'abc-123')
       ↓
Auto-redirect to /schemes?profileId=abc-123
       ↓
View Recommendations


┌─────────────────────────────────────────────────────────────┐
│                   RETURNING USER                            │
└─────────────────────────────────────────────────────────────┘

Visit Profile Page
       ↓
Check localStorage.getItem('profileId')
       ↓
Found: 'abc-123'
       ↓
Fetch GET /api/v1/profiles/abc-123
       ↓
Form Pre-filled with Saved Data
       ↓
User Updates 1 Field (e.g., Occupation)
       ↓
Click "Update & Find Schemes"
       ↓
New Profile Saved (ID: xyz-789)
       ↓
localStorage.setItem('profileId', 'xyz-789')
       ↓
Auto-redirect to /schemes?profileId=xyz-789
       ↓
View Fresh Recommendations
```

---

## Technical Implementation

### localStorage Management

**Save Profile ID:**
```javascript
localStorage.setItem('profileId', profileId);
```

**Load Profile ID:**
```javascript
const storedProfileId = localStorage.getItem('profileId');
```

**Clear Profile (if needed):**
```javascript
localStorage.removeItem('profileId');
```

### API Calls

**Fetch Profile:**
```javascript
const response = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}`);
const result = await response.json();
const profile = result.data;
```

**Save Profile:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/profiles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profileData),
});
const result = await response.json();
const newProfileId = result.data.profile_id;
```

---

## Testing Instructions

### Manual Test:

1. **Start Backend:**
   ```bash
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Open Browser:**
   - Navigate to `http://localhost:3001/profile`

4. **Test First Time User:**
   - Fill form with test data
   - Click "Save & Find Schemes"
   - Verify redirect to schemes page

5. **Test Returning User:**
   - Navigate back to `http://localhost:3001/profile`
   - Verify form is pre-filled
   - Change one field (e.g., occupation)
   - Click "Update & Find Schemes"
   - Verify new recommendations

6. **Test localStorage:**
   - Open DevTools → Application → Local Storage
   - Verify `profileId` key exists
   - Copy the value
   - Clear localStorage
   - Refresh page → form should be empty
   - Paste profileId back
   - Refresh page → form should be pre-filled

### Automated Test:

Run the PowerShell test script:
```powershell
powershell -ExecutionPolicy Bypass -File test-profile-persistence.ps1
```

Expected output:
```
Testing Profile Persistence Feature

Step 1: Creating initial profile...
Profile created: 09166e8e-e871-4215-8a65-f94b649c0bfe

Step 2: Retrieving saved profile...
Profile retrieved successfully!
  Age: 28
  Gender: Female
  Occupation: Student
  State: Tamil Nadu
  District: Chennai
  Phone: 9876543210
  Caste: SC

Profile Persistence Test: PASSED
```

---

## User Benefits

✅ **No Re-typing**: Users don't need to re-enter all data every visit
✅ **Quick Updates**: Change one field without touching others
✅ **Persistent State**: Profile survives page refreshes
✅ **Seamless Flow**: Auto-redirect after save
✅ **Error Recovery**: If load fails, can still create new profile

---

## Edge Cases Handled

1. **No Profile ID in localStorage**: Shows empty form (new user flow)
2. **Invalid Profile ID**: Shows error, allows creating new profile
3. **Network Error**: Shows error message, form remains editable
4. **Validation Errors**: Shows specific error (phone: 10 digits, aadhar: 12 digits)
5. **Partial Data**: Optional fields can be empty (block, village, pincode)

---

## Browser Compatibility

✅ Chrome/Edge (localStorage supported)
✅ Firefox (localStorage supported)
✅ Safari (localStorage supported)
✅ Mobile browsers (localStorage supported)

---

## Security Notes

- Profile ID is UUID (not sequential, hard to guess)
- No sensitive data in localStorage (only profile ID)
- Backend validates all inputs
- Phone/Aadhar validation on frontend and backend
- HTTPS recommended for production

---

## Future Enhancements

1. **Profile History**: Show previous versions
2. **Multiple Profiles**: Support family members
3. **Profile Export**: Download as JSON/PDF
4. **Profile Sharing**: Share profile link
5. **Auto-save**: Save on field change (debounced)
6. **Offline Support**: Service worker for offline access
