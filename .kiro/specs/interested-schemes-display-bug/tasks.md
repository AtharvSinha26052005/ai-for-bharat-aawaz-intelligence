# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Fresh Data on Navigation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: navigation to Education page after marking schemes as interested
  - Test that navigating to Education page after marking a scheme as interested displays the newly interested scheme
  - Test cases to implement:
    - Mark scheme as interested from schemes page, navigate to Education page → should display the scheme
    - Mark scheme as interested from dashboard, navigate to Education page → should display the scheme
    - Navigate to Education page, leave, mark scheme as interested, return → should display the scheme
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Education page shows 'No Interested Schemes Yet' when schemes exist in backend")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-navigation interactions
  - Write property-based tests capturing observed behavior patterns:
    - Scheme removal: clicking delete icon immediately removes scheme from display
    - Financial advice: "Get Financial Advice" button opens dialog with personalized recommendations
    - Dialog interactions: dialogs open/close correctly with keyboard navigation
    - Loading states: loading spinner displays during API calls
    - Error handling: API errors are logged without crashing
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for interested schemes display bug

  - [x] 3.1 Implement navigation detection using useLocation hook
    - Import useLocation from react-router-dom
    - Add location variable: `const location = useLocation();`
    - Add location.pathname to useEffect dependencies array
    - This ensures loadInterestedSchemes is called whenever the Education page is navigated to
    - _Bug_Condition: isBugCondition(input) where input.targetPage == 'Education' AND userMarkedSchemeAsInterested(input.previousPage) AND NOT dataRefreshedOnNavigation()_
    - _Expected_Behavior: Education page SHALL fetch the latest interested schemes data from the backend API on every navigation_
    - _Preservation: All non-navigation interactions (scheme removal, financial advice, dialogs, loading states, error handling) SHALL remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Fresh Data on Navigation
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all navigation scenarios now display fresh data:
      - Mark from schemes page → navigate to Education → displays scheme
      - Mark from dashboard → navigate to Education → displays scheme
      - Navigate away and return → displays updated schemes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all non-navigation functionality still works:
      - Scheme removal works correctly
      - Financial advice dialogs work correctly
      - Dialog interactions work correctly
      - Loading states work correctly
      - Error handling works correctly

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
  - Verify no excessive API calls are being made (check loading state prevents duplicates)
  - Confirm the fix resolves the issue without introducing performance problems
