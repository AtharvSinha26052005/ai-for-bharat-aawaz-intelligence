# Profile Validation Error - Troubleshooting Guide

## Issue
"Validation failed" error when creating a profile in the frontend.

## Most Likely Causes

### 1. Backend Server Not Running ⚠️ **MOST COMMON**
The frontend is trying to connect to `http://localhost:3000/api/v1/profile` but the backend server is not running.

**Solution:**
```bash
# In the root directory (not frontend), run:
npm run dev
```

The backend must be running on port 3000 before you can create profiles.

### 2. Database Not Connected
The backend is running but cannot connect to PostgreSQL database.

**Check:**
- Is PostgreSQL installed and running?
- Is the `.env` file configured with correct database credentials?

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows: Check Services or run:
pg_ctl status

# Start PostgreSQL if needed
# Or use Docker:
docker-compose up -d
```

### 3. CORS Issues
The backend is blocking requests from the frontend.

**Check browser console for:**
```
Access to XMLHttpRequest at 'http://localhost:3000/api/v1/profile' 
from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Solution:** The backend should already have CORS configured in `src/app.ts`, but verify it's enabled.

### 4. Validation Schema Mismatch
The data being sent doesn't match the backend validation schema.

**Current Requirements (from validation.ts):**
- ✅ `age`: number (1-120) - REQUIRED
- ✅ `incomeRange`: string (below-1L, 1L-3L, 3L-5L, above-5L) - REQUIRED
- ✅ `occupation`: string (max 100 chars) - REQUIRED
- ✅ `familyComposition`: object with adults, children, seniors - REQUIRED
- ✅ `location`: object with state, district (block, village, pincode optional) - REQUIRED
- ✅ `primaryNeeds`: array of strings (min 1) - REQUIRED
- ✅ `preferredLanguage`: string (hi, ta, te, bn, mr, en) - REQUIRED
- ✅ `preferredMode`: string (voice, text, both) - REQUIRED
- ✅ `consentGiven`: boolean - REQUIRED
- ⚠️ `phoneNumber`: string (optional, but must match pattern if provided)

## How to Debug

### Step 1: Check Backend Status
```bash
# Open a terminal in the project root
npm run dev

# You should see:
# Server running on port 3000
# Database connected
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to create profile again
4. Look for error messages

**Common errors:**
- `Network Error` → Backend not running
- `404 Not Found` → Wrong API endpoint
- `500 Internal Server Error` → Backend error (check backend logs)
- `400 Bad Request` → Validation error (check error details)

### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to create profile again
4. Click on the failed request
5. Check:
   - Request URL (should be http://localhost:3000/api/v1/profile)
   - Request Method (should be POST)
   - Request Payload (the data being sent)
   - Response (the error message from backend)

### Step 4: Check Backend Logs
Look at the terminal where backend is running for error messages:
```
[ERROR] Profile creation failed: ...
```

## Quick Fix Checklist

- [ ] Backend server is running (`npm run dev` in root directory)
- [ ] Backend shows "Server running on port 3000"
- [ ] Frontend is running (`npm start` in frontend directory)
- [ ] Frontend is on http://localhost:3001
- [ ] Browser console shows no CORS errors
- [ ] All required fields are filled in the form
- [ ] Age is a valid number (1-120)
- [ ] Income range is selected
- [ ] State and District are filled

## Updated Profile.tsx

I've updated the Profile component to:
1. Send `undefined` instead of empty strings for optional fields
2. Add detailed console logging
3. Show better error messages with validation details
4. Log the exact data being sent

Now when you try to create a profile:
1. Open browser console (F12)
2. Submit the form
3. Check console for:
   - "Submitting profile data:" - shows what's being sent
   - "Profile response:" - shows backend response
   - "Profile submission error:" - shows detailed error

## Testing Without Backend

If you want to test the frontend without the backend, you can:

1. **Mock the API response** in `frontend/src/services/apiService.ts`
2. **Use a mock server** like json-server
3. **Wait for backend to be ready** (recommended)

## Expected Behavior

When everything works correctly:
1. Fill in all required fields
2. Click "CREATE PROFILE"
3. See "Profile saved successfully!" message
4. User ID is stored in localStorage
5. You can navigate to other pages

## Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Share the error details:**
   - Browser console error
   - Network tab response
   - Backend terminal logs

2. **Verify environment:**
   ```bash
   # Check if backend is accessible
   curl http://localhost:3000/api/v1/health
   
   # Should return:
   # {"success":true,"data":{"status":"healthy",...}}
   ```

3. **Check .env file:**
   ```env
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   NODE_ENV=development
   ```

## Most Common Solution

**90% of the time, the issue is simply that the backend is not running.**

**Fix:**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start
```

Then try creating the profile again!
