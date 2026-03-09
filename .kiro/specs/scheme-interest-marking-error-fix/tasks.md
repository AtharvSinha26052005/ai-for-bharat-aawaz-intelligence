# Implementation Plan

- [-] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - NULL-Safe Duplicate Detection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: null or empty scheme_slug with duplicate entry
  - Test that insert() with null scheme_slug on duplicate entry successfully retrieves existing ID (from Fault Condition in design)
  - The test assertions should match: result is valid UUID string, no error thrown, result matches existing record ID
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with "Cannot read property 'id' of undefined" (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "insert() with null scheme_slug crashes on duplicate instead of returning existing ID")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-NULL Scheme Slug Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-null scheme_slug values and new inserts
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test cases: non-null slug duplicates work correctly, new inserts return new ID, other methods unchanged
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix for NULL scheme_slug comparison error in insert() method

  - [ ] 3.1 Implement the NULL-safe SQL comparison fix
    - Replace static fallback query with conditional NULL-safe logic
    - When scheme_slug is null: use `WHERE profile_id = $1 AND scheme_slug IS NULL`
    - When scheme_slug has value: use `WHERE profile_id = $1 AND scheme_slug = $2`
    - Adjust query parameters array based on null check
    - Add safety check for `existingResult.rows.length > 0` before accessing `rows[0].id`
    - Ensure empty strings are normalized to null consistently
    - _Bug_Condition: isBugCondition(input) where (input.scheme_slug IS NULL OR input.scheme_slug == '') AND existingRecordExists(input.profile_id, input.scheme_slug) AND insertReturnsNoRows(input)_
    - _Expected_Behavior: For any input where scheme_slug is null/empty and duplicate exists, insert() SHALL successfully retrieve existing ID using NULL-safe comparison and return it without error_
    - _Preservation: All inputs with non-null scheme_slug values and successful first-attempt inserts must produce exactly the same behavior as original code_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - NULL-Safe Duplicate Detection
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-NULL Scheme Slug Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
