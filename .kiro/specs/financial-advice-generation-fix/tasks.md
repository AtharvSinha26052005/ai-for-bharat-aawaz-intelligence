# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Invalid API Key Authentication Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists (401 errors with expired API key)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - financial advice requests with the current expired API key
  - Test that financial advice requests with expired GROQ_API_KEY result in 401 Unauthorized errors
  - Test that error messages are generic and don't indicate authentication issues
  - Verify the bug condition: GROQ_API_KEY is set AND invalid/expired AND API returns 401
  - Run test on UNFIXED code (with expired key in .env)
  - **EXPECTED OUTCOME**: Test FAILS with 401 errors (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Specific 401 error responses from Groq API
    - Generic error messages shown to users
    - Lack of clear authentication failure indication
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-API Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for operations that don't involve Groq API calls
  - Write property-based tests capturing observed behavior patterns:
    - Prompt building generates consistent, well-formed prompts with all scheme details and user profile
    - JSON parsing correctly extracts advice, key_points, utilization_tips, and potential_impact fields
    - Fallback responses provide generic advice when JSON parsing fails
    - Validation rejects requests without scheme_name with 400 Bad Request
    - Error logging captures request details and error information
    - Other features (scheme browsing, interested schemes) function normally
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix for invalid/expired GROQ_API_KEY causing 401 authentication failures

  - [ ] 3.1 Obtain new valid API key from Groq console
    - Visit https://console.groq.com/
    - Sign in to your Groq account
    - Navigate to API Keys section
    - Generate a new API key
    - Copy the new API key securely
    - _Bug_Condition: isBugCondition(input) where GROQ_API_KEY is invalid/expired AND user requests financial advice_
    - _Expected_Behavior: Successful API authentication with valid key, 200 OK response, structured advice returned_
    - _Preservation: Prompt building, JSON parsing, fallback responses, error logging, validation logic unchanged_
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Update .env file with new valid API key
    - Open .env file in project root
    - Replace the expired key with the new valid key:
      ```
      GROQ_API_KEY=<new_valid_api_key_from_groq_console>
      ```
    - Save the file
    - Restart the application to load the new environment variable
    - _Bug_Condition: isBugCondition(input) where GROQ_API_KEY is invalid/expired_
    - _Expected_Behavior: Valid API key configured, authentication succeeds_
    - _Preservation: All other environment variables and configuration unchanged_
    - _Requirements: 1.1, 2.1, 2.2_

  - [ ] 3.3 Enhance error handling for authentication failures (Optional but Recommended)
    - In `src/services/financial-advice-service.ts`, add specific 401 error handling
    - Detect 401 status code and throw descriptive error message
    - Include guidance for developers on fixing API key configuration
    - Add error context: log API URL (without exposing key), log whether key is set
    - Distinguish error types: 401 (auth), 429 (rate limit), 5xx (server), network errors
    - _Bug_Condition: Better diagnostics when isBugCondition occurs_
    - _Expected_Behavior: Clear error messages indicating authentication issues_
    - _Preservation: Existing error logging and handling for non-401 errors unchanged_
    - _Requirements: 2.4_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Valid API Key Authentication Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1 with new valid API key
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify financial advice requests succeed with 200 OK responses
    - Verify structured advice is returned with all required fields
    - Verify no 401 authentication errors occur
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-API Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Prompt building unchanged
      - JSON parsing unchanged
      - Fallback responses unchanged
      - Validation logic unchanged
      - Error logging unchanged
      - Other features function normally

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests and verify they pass
  - Run integration tests for full financial advice flow
  - Verify the application starts successfully with the new API key
  - Test the "Get Overall Advice" feature in the UI to confirm it works end-to-end
  - If any issues arise, ask the user for guidance before proceeding
