# Implementation Plan

## Issue 1: Database SSL Configuration

- [ ] 1. Write bug condition exploration test for SSL configuration
  - **Property 1: Fault Condition** - Development Database SSL Connection Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to development environment with non-SSL database
  - Test that database connection in development environment (NODE_ENV=development) with non-SSL PostgreSQL fails with "The server does not support SSL connections" error
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests for database connections (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Database Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful database connections
  - Write property-based tests capturing observed behavior patterns:
    - Database queries execute successfully when connection is established
    - Transactions work as expected
    - Query results are returned correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code with SSL-enabled database
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1_

- [ ] 3. Fix database SSL configuration based on environment

  - [ ] 3.1 Implement environment-based SSL configuration
    - Modify database connection configuration to check NODE_ENV
    - Set `ssl: false` when NODE_ENV=development
    - Set `ssl: { rejectUnauthorized: false }` when NODE_ENV=production
    - _Bug_Condition: isBugCondition(env) where env.NODE_ENV === 'development' AND database.ssl === true_
    - _Expected_Behavior: expectedBehavior(connection) where connection.ssl === false in development AND connection.ssl.rejectUnauthorized === false in production_
    - _Preservation: Database queries, transactions, and operations continue to work as before (3.1)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Development Database Connects Without SSL
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Database Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure database SSL tests pass
  - Ensure all tests pass, ask the user if questions arise

## Issue 2: API Error Response Format

- [ ] 5. Write bug condition exploration test for API error responses
  - **Property 1: Fault Condition** - HTML Error Pages Instead of JSON
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to API routes that fail with database connection errors
  - Test that when API route fails (e.g., database connection error), response is HTML starting with "<!DOCTYPE" instead of JSON
  - Test that frontend JSON parsing throws "Unexpected token '<'" error
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "/api/v1/schemes returns HTML error page")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 6. Write preservation property tests for API responses (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful API Response Format
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful API requests
  - Write property-based tests capturing observed behavior patterns:
    - Successful API routes return JSON responses with same structure
    - ValidationError and AppError exceptions return appropriate JSON error responses
    - Health check endpoints return JSON health status
    - CORS, rate limiting, and security middleware function as configured
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code with successful requests
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ] 7. Fix API error response format to return JSON

  - [ ] 7.1 Implement global error handler middleware
    - Create or update error handler middleware to catch all exceptions
    - Return JSON error response format: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "error description" } }`
    - Handle database connection errors with appropriate error codes
    - Ensure all API routes use the error handler middleware
    - _Bug_Condition: isBugCondition(response) where response.contentType === 'text/html' AND response.body.startsWith('<!DOCTYPE')_
    - _Expected_Behavior: expectedBehavior(response) where response.contentType === 'application/json' AND response.body.success === false AND response.body.error exists_
    - _Preservation: Successful API responses, ValidationError/AppError handling, health checks, and middleware continue to work as before (3.2, 3.3, 3.4, 3.5)_
    - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 3.5_

  - [ ] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - API Errors Return JSON
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - API Response Format Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 8. Checkpoint - Ensure all API error handling tests pass
  - Ensure all tests pass, ask the user if questions arise

## Issue 3: Hardcoded API Key Security

- [ ] 9. Move hardcoded GROQ API key to environment variable
  - **Security Fix** - Remove hardcoded API key from source code
  - **GOAL**: Improve security by storing sensitive credentials in environment variables
  - Remove hardcoded API key from `src/services/financial-advice-service.ts` line 3
  - Update code to read from `process.env.GROQ_API_KEY`
  - Add validation to throw clear error if GROQ_API_KEY is not set
  - Update `.env.example` to include `GROQ_API_KEY=your_api_key_here`
  - Add `GROQ_API_KEY` to `.env` file with the actual key value
  - _Bug_Condition: API key is hardcoded in source code (security vulnerability)_
  - _Expected_Behavior: API key is loaded from environment variable with validation_
  - _Preservation: Financial advice service continues to work with valid API key_

- [ ] 10. Verify API key configuration works
  - Test that service throws clear error when GROQ_API_KEY is missing
  - Test that service works correctly when GROQ_API_KEY is set
  - Verify no hardcoded credentials remain in source code

- [ ] 11. Checkpoint - Ensure API key security fix is complete
  - Ensure all tests pass, ask the user if questions arise

## Final Validation

- [ ] 12. Integration testing
  - Test complete flow: development database connection without SSL works
  - Test complete flow: API errors return JSON that frontend can parse
  - Test complete flow: financial advice service works with environment variable API key
  - Verify no regressions in existing functionality
  - Confirm all requirements are satisfied
