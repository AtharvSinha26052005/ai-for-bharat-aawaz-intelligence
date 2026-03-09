# Interested Schemes Display Bug - Bugfix Design

## Overview

The Education page fails to display newly marked interested schemes because it only loads data once on component mount via useEffect with userId dependency. When users mark schemes as interested from other pages (schemes page or dashboard) and navigate to the Education page, the component doesn't re-fetch the data, resulting in stale or empty displays. The fix involves implementing a mechanism to refresh interested schemes data whenever the Education page becomes visible, ensuring users always see their latest saved schemes.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when users navigate to the Education page after marking schemes as interested elsewhere, and the page shows stale data
- **Property (P)**: The desired behavior - Education page should always display the latest interested schemes from the backend API
- **Preservation**: Existing functionality that must remain unchanged - scheme removal, financial advice dialogs, loading states, error handling
- **loadInterestedSchemes**: The function in `frontend/src/pages/Education.tsx` that fetches interested schemes from the backend API
- **useEffect hook**: React hook that runs loadInterestedSchemes only when userId changes, causing the stale data issue
- **Navigation state**: The browser/router state that determines when a user has navigated to the Education page

## Bug Details

### Fault Condition

The bug manifests when a user marks a scheme as interested from any page (schemes page or dashboard), then navigates to the Education page. The Education component's useEffect hook only runs on initial mount and when userId changes, so it doesn't detect that new schemes have been marked as interested. The component displays stale data from the previous load or shows "No Interested Schemes Yet" even though schemes exist in the backend.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type NavigationEvent
  OUTPUT: boolean
  
  RETURN input.targetPage == 'Education'
         AND userMarkedSchemeAsInterested(input.previousPage)
         AND NOT dataRefreshedOnNavigation()
END FUNCTION
```

### Examples

- User marks "PM-KISAN" as interested from the schemes page, navigates to Education page → sees "No Interested Schemes Yet" instead of PM-KISAN
- User marks "Ayushman Bharat" as interested from dashboard recommendations, navigates to Education page → sees old list without Ayushman Bharat
- User marks multiple schemes as interested, navigates away from Education page, returns to Education page → sees stale data from previous visit
- User clears browser cache and reloads Education page → sometimes displays schemes correctly, but behavior is inconsistent due to cache timing

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Removing a scheme from the interested list on the Education page must continue to immediately update the display
- Clicking "Get Financial Advice" must continue to display the financial advice dialog with personalized recommendations
- The "No Interested Schemes Yet" message with browse button must continue to display when there are genuinely no interested schemes
- Loading spinner must continue to display while fetching interested schemes data
- API errors must continue to be handled gracefully by logging to console without crashing

**Scope:**
All functionality that does NOT involve the initial loading of interested schemes when navigating to the Education page should be completely unaffected by this fix. This includes:
- Scheme removal functionality (handleRemoveScheme)
- Financial advice generation (handleGetFinancialAdvice, handleGetOverallAdvice)
- Dialog interactions (opening, closing, keyboard navigation)
- Button click handlers and UI interactions
- Error handling for API failures

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Insufficient useEffect Dependencies**: The useEffect hook only depends on userId, which rarely changes during a session
   - When users navigate to Education page, userId remains the same
   - useEffect doesn't re-run, so loadInterestedSchemes is not called
   - Component displays stale data from previous render

2. **No Navigation Detection**: The component lacks a mechanism to detect when users navigate to the page
   - React Router doesn't trigger re-mounts when navigating between pages
   - Component instance persists, so useEffect with userId dependency doesn't re-run
   - No visibility change detection or focus event handling

3. **Missing Data Synchronization**: No global state management or event system to notify Education page of changes
   - When schemes are marked as interested on other pages, Education page has no way to know
   - No shared state (Context, Redux) or event bus to propagate changes
   - Each page operates independently without cross-page communication

## Correctness Properties

Property 1: Fault Condition - Fresh Data on Navigation

_For any_ navigation event where a user navigates to the Education page (regardless of whether schemes were marked as interested), the Education component SHALL fetch the latest interested schemes data from the backend API, ensuring the display reflects the current state of the user's interested schemes.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Functionality

_For any_ user interaction that is NOT the initial page load/navigation (scheme removal, financial advice requests, dialog interactions), the Education component SHALL produce exactly the same behavior as the original code, preserving all existing functionality for scheme management and financial advice features.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/Education.tsx`

**Function**: `Education` component and `useEffect` hook

**Specific Changes**:
1. **Add Navigation Detection**: Implement a mechanism to detect when the Education page becomes visible
   - Option A: Use React Router's useLocation hook to detect route changes
   - Option B: Use browser visibility API (document.visibilityState) to detect tab focus
   - Option C: Add a key prop to force re-mount on navigation
   - Recommended: Option A with useLocation, as it's most reliable for SPA navigation

2. **Modify useEffect Dependencies**: Add location or visibility state to useEffect dependencies
   - Change from: `useEffect(() => { loadInterestedSchemes(); }, [userId]);`
   - Change to: `useEffect(() => { loadInterestedSchemes(); }, [userId, location.pathname]);`
   - This ensures data refresh on every navigation to the Education page

3. **Alternative: Add Visibility Change Listener**: If using visibility API
   - Add event listener for visibilitychange event
   - Call loadInterestedSchemes when document becomes visible
   - Clean up listener on component unmount

4. **Ensure Idempotency**: Verify loadInterestedSchemes can be called multiple times safely
   - Already uses loading state to prevent concurrent requests
   - Already handles errors gracefully
   - No changes needed to the function itself

5. **Testing Considerations**: Ensure the fix doesn't cause excessive API calls
   - Loading state prevents duplicate requests during navigation
   - Consider adding debouncing if performance issues arise
   - Monitor network tab for request frequency

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate marking schemes as interested from other pages, then navigating to the Education page. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Mark from Schemes Page Test**: Mark scheme as interested from schemes page, navigate to Education page (will fail on unfixed code - shows stale data)
2. **Mark from Dashboard Test**: Mark scheme as interested from dashboard, navigate to Education page (will fail on unfixed code - shows "No Interested Schemes Yet")
3. **Multiple Navigation Test**: Navigate to Education page, leave, mark scheme as interested, return to Education page (will fail on unfixed code - doesn't refresh)
4. **Cache Clear Test**: Clear browser cache, reload Education page (may pass or fail inconsistently on unfixed code - timing dependent)

**Expected Counterexamples**:
- Education page displays "No Interested Schemes Yet" when schemes exist in backend
- Possible causes: useEffect not re-running on navigation, missing visibility detection, no state synchronization

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL navigation WHERE targetPage == 'Education' DO
  result := Education_fixed.render()
  ASSERT result.interestedSchemes == fetchLatestFromBackend()
  ASSERT result.display == 'schemes list' OR 'no schemes message'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL interaction WHERE NOT isNavigationEvent(interaction) DO
  ASSERT Education_original.handleInteraction(interaction) = Education_fixed.handleInteraction(interaction)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-navigation interactions

**Test Plan**: Observe behavior on UNFIXED code first for scheme removal, financial advice, and dialog interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Scheme Removal Preservation**: Observe that clicking delete icon removes scheme immediately on unfixed code, then write test to verify this continues after fix
2. **Financial Advice Preservation**: Observe that "Get Financial Advice" button opens dialog with correct data on unfixed code, then write test to verify this continues after fix
3. **Dialog Interaction Preservation**: Observe that dialogs open/close correctly with keyboard navigation on unfixed code, then write test to verify this continues after fix
4. **Loading State Preservation**: Observe that loading spinner displays during API calls on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that loadInterestedSchemes is called on component mount
- Test that loadInterestedSchemes is called when navigation to Education page occurs
- Test that loading state is set correctly during API calls
- Test that error handling works when API fails
- Test that "No Interested Schemes Yet" displays when backend returns empty array

### Property-Based Tests

- Generate random navigation sequences and verify Education page always displays latest data from backend
- Generate random scheme lists and verify removal functionality works correctly across all scenarios
- Generate random user interactions (clicks, keyboard events) and verify all non-navigation behavior is preserved

### Integration Tests

- Test full flow: mark scheme as interested on schemes page → navigate to Education page → verify scheme displays
- Test full flow: mark scheme as interested on dashboard → navigate to Education page → verify scheme displays
- Test full flow: navigate to Education page → leave → mark scheme as interested → return → verify scheme displays
- Test that multiple rapid navigations don't cause race conditions or duplicate API calls
