# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Empty String Handling for Optional Fields
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - profile submissions with empty strings in optional location fields (block, village, pincode)
  - Test that validation passes when optional location fields (block, village, pincode) are submitted as empty strings
  - The test assertions should verify that validation succeeds and empty strings are treated as undefined/null
  - Test cases to include:
    - Profile with `pincode: ""` (empty string)
    - Profile with `block: ""` and `village: ""`
    - Profile with all optional fields as empty strings: `block: ""`, `village: ""`, `pincode: ""`
  - Run test on UNFIXED code in `src/utils/validation.ts`
  - **EXPECTED OUTCOME**: Test FAILS with validation error "location.pincode must match pattern /^\d{6}$/" (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Required Field and Valid Data Validation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (valid data, invalid data, missing required fields)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Required field validation continues to reject missing required fields (age, incomeRange, occupation, state, district, primaryNeeds, preferredLanguage, preferredMode, consentGiven)
    - Age validation continues to enforce 1-120 range
    - Income range validation continues to enforce valid enum values
    - Pincode pattern validation continues to enforce 6-digit format when non-empty value is provided
    - Valid profile submissions with all fields properly filled continue to work
    - Invalid pincode patterns (e.g., "12345", "abcdef") continue to fail validation
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.3_

- [x] 3. Fix for profile validation bug - empty strings in optional location fields

  - [x] 3.1 Implement the fix in validation schema
    - Modify `userProfileSchema` in `src/utils/validation.ts`
    - Add `.allow('')` or `.empty('')` to optional location fields (block, village, pincode)
    - Use `.empty('')` to convert empty strings to undefined before pattern validation
    - Apply to: `location.block`, `location.village`, `location.pincode`
    - Ensure pattern validation for pincode still applies to non-empty values
    - _Bug_Condition: isBugCondition(input) where input.location.pincode === "" OR input.location.block === "" OR input.location.village === ""_
    - _Expected_Behavior: For any profile creation request where optional location fields are submitted as empty strings, validation SHALL treat empty strings as equivalent to undefined/null and pass validation without applying pattern constraints_
    - _Preservation: Required field validation, age range validation, income range validation, pincode pattern validation for non-empty values, and all existing validation rules must remain unchanged_
    - _Requirements: 2.2, 2.3, 3.1, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Empty String Handling for Optional Fields
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - empty strings in optional fields now pass validation)
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Required Field and Valid Data Validation
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions - all existing validation rules still work)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Verify all exploration tests pass (bug is fixed)
  - Verify all preservation tests pass (no regressions)
  - Run full test suite to ensure no unexpected side effects
  - If any issues arise, ask the user for guidance
