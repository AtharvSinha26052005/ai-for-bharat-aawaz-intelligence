# Financial Advice Generation Fix - Bugfix Design

## Overview

The "Get Overall Advice" feature fails due to an invalid or expired GROQ_API_KEY, causing 401 Unauthorized errors when attempting to generate AI-powered financial advice for government schemes. The fix requires obtaining a valid API key from Groq and updating the .env configuration. Additionally, we'll improve error handling to provide clearer feedback when API authentication fails, helping users and developers quickly identify configuration issues.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the GROQ_API_KEY is invalid/expired and the system attempts to call the Groq API
- **Property (P)**: The desired behavior when a valid API key is configured - successful authentication and financial advice generation
- **Preservation**: Existing functionality that must remain unchanged - prompt building, JSON parsing, fallback responses, error logging, and validation logic
- **FinancialAdviceService**: The service class in `src/services/financial-advice-service.ts` that generates AI-powered financial advice using Groq's LLM API
- **GROQ_API_KEY**: Environment variable containing the API key for authenticating with Groq's API service
- **401 Unauthorized**: HTTP status code returned by Groq API when the provided API key is invalid, expired, or missing

## Bug Details

### Fault Condition

The bug manifests when the FinancialAdviceService attempts to call the Groq API with an invalid or expired GROQ_API_KEY. The API key exists in the .env file but is no longer valid, causing authentication to fail. The Groq API returns a 401 Unauthorized error, which propagates through the error handling chain and results in a generic "Failed to generate financial advice" message to the user.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type FinancialAdviceRequest
  OUTPUT: boolean
  
  RETURN GROQ_API_KEY IS_SET
         AND GROQ_API_KEY IS_INVALID_OR_EXPIRED
         AND user_requests_financial_advice(input)
         AND groq_api_returns_401_error()
END FUNCTION
```

### Examples

- **Example 1**: User clicks "Get Overall Advice" for "PM-KISAN" scheme → Loading dialog appears → Backend calls Groq API with expired key `xxxxxxxxxxxxxxxxxxxxxxxx` → Groq returns 401 with "Invalid API Key" → User sees "Error: Failed to generate financial advice"

- **Example 2**: User clicks "Get Overall Advice" for "Ayushman Bharat" scheme → Backend attempts API call → 401 Unauthorized response → Error logged: "Groq API error: 401 - {error details}" → Frontend receives 500 Internal Server Error

- **Example 3**: Developer runs integration tests → Test calls financial advice endpoint → API authentication fails → Test fails with unclear error message about API failure

- **Edge Case**: User clicks "Get Overall Advice" immediately after API key expires mid-session → Previous requests may have succeeded, but current request fails with 401 error

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Prompt building logic must continue to include all scheme details (name, description, benefits) and user profile information (age, occupation, income range)
- JSON response parsing must continue to extract advice, key_points, utilization_tips, and potential_impact fields correctly
- Fallback response mechanism must continue to provide generic advice when JSON parsing fails
- Error logging must continue to capture request details, success/failure status, and error information
- Validation logic must continue to reject requests without scheme_name with 400 Bad Request
- Other features (marking schemes as interested, removing schemes) must continue to function normally

**Scope:**
All inputs that do NOT involve calling the Groq API for financial advice generation should be completely unaffected by this fix. This includes:
- Scheme browsing and filtering
- User profile management
- Interested schemes list management
- Other API endpoints and services
- Database operations

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Expired API Key**: The GROQ_API_KEY in the .env file (`xxxxxxxxxxxxxxxxxxx`) is no longer valid
   - Groq API keys may have expiration dates or usage limits
   - The key may have been revoked or regenerated in the Groq dashboard
   - The key may be associated with a free tier account that has expired

2. **Insufficient Error Context**: While the code logs the 401 error, the error message propagated to the user is generic
   - The error "Failed to generate financial advice" doesn't indicate it's an authentication issue
   - Developers and users cannot easily distinguish between API key problems and other failures
   - The 401 status code is logged but not surfaced in a user-friendly way

3. **No API Key Validation at Startup**: The code validates that GROQ_API_KEY is set but cannot verify if it's valid until the first API call
   - Invalid keys are only detected when users attempt to generate advice
   - No health check or startup validation to catch configuration issues early

## Correctness Properties

Property 1: Fault Condition - Valid API Key Authentication

_For any_ financial advice request where a valid GROQ_API_KEY is configured in the environment, the FinancialAdviceService SHALL successfully authenticate with the Groq API, receive a 200 OK response, and return structured financial advice containing advice text, key points, utilization tips, and potential impact.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Functionality

_For any_ operation that does NOT involve calling the Groq API (prompt building, JSON parsing, fallback responses, error logging, validation), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-API-call operations.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

The primary fix is a configuration change, not a code change. However, we'll also improve error handling for better diagnostics.

**File**: `.env`

**Primary Fix**:
1. **Obtain New API Key**: Visit https://console.groq.com/ and generate a new API key
2. **Update .env File**: Replace the expired key with the new valid key:
   ```
   GROQ_API_KEY=<new_valid_api_key_from_groq_console>
   ```

**File**: `src/services/financial-advice-service.ts`

**Enhanced Error Handling** (Optional but Recommended):
1. **Improve 401 Error Message**: Add specific handling for authentication errors to provide clearer feedback
   - Detect 401 status code in the error response
   - Throw a more descriptive error message indicating API key issues
   - Include guidance for developers on how to fix the configuration

2. **Add Error Context**: Enhance error logging to include more diagnostic information
   - Log the API URL being called (without exposing the full API key)
   - Log whether the API key is set (boolean check, not the actual value)
   - Include response headers if available for debugging

3. **Distinguish Error Types**: Categorize errors to help with troubleshooting
   - Authentication errors (401) - API key issues
   - Rate limiting errors (429) - Usage quota exceeded
   - Server errors (5xx) - Groq service issues
   - Network errors - Connectivity problems

### Specific Code Changes

**In `src/services/financial-advice-service.ts`**, enhance the error handling in the `getFinancialAdvice` method:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  
  // Enhanced error handling for authentication issues
  if (response.status === 401) {
    logger.error('Groq API authentication failed - invalid or expired API key', { 
      status: response.status,
      error: errorText,
      apiKeyConfigured: !!GROQ_API_KEY
    });
    throw new Error(
      'Groq API authentication failed. The GROQ_API_KEY may be invalid or expired. ' +
      'Please verify your API key at https://console.groq.com/ and update the .env file.'
    );
  }
  
  // Handle other error types
  logger.error('Groq API error', { 
    status: response.status, 
    statusText: response.statusText,
    error: errorText 
  });
  throw new Error(`Groq API error: ${response.status} - ${errorText}`);
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (with the expired API key), then verify the fix works correctly with a valid API key and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the expired API key causes 401 errors and that the error messages are unclear.

**Test Plan**: Write tests that call the financial advice endpoint with the current expired API key. Run these tests on the UNFIXED code to observe 401 failures and analyze the error messages returned to users and logged by the system.

**Test Cases**:
1. **Basic Financial Advice Request**: Call the endpoint with a valid scheme name and user profile (will fail with 401 on unfixed code)
2. **Minimal Request**: Call with only scheme_name, no optional fields (will fail with 401 on unfixed code)
3. **Complex Request**: Call with full user profile and detailed scheme information (will fail with 401 on unfixed code)
4. **Error Message Inspection**: Capture the error message returned to the frontend and verify it's generic (will show "Failed to generate financial advice" without mentioning authentication)

**Expected Counterexamples**:
- All requests fail with 401 Unauthorized from Groq API
- Error logs show "Groq API error: 401 - Invalid API Key"
- Users see generic error message without indication of authentication issue
- Possible root cause confirmed: expired/invalid API key in .env file

### Fix Checking

**Goal**: Verify that for all inputs where a valid API key is configured, the fixed system produces the expected behavior (successful advice generation).

**Pseudocode:**
```
GIVEN valid_api_key IS_CONFIGURED IN .env
FOR ALL request WHERE is_valid_financial_advice_request(request) DO
  result := financialAdviceService.getFinancialAdvice(request)
  ASSERT result.advice IS_NOT_EMPTY
  ASSERT result.key_points IS_ARRAY AND LENGTH > 0
  ASSERT result.utilization_tips IS_ARRAY AND LENGTH > 0
  ASSERT result.potential_impact IS_NOT_EMPTY
  ASSERT no_401_errors_occurred()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all operations that do NOT involve API calls, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL operation WHERE NOT involves_groq_api_call(operation) DO
  ASSERT original_behavior(operation) = fixed_behavior(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-API operations

**Test Plan**: Observe behavior on UNFIXED code first for prompt building, JSON parsing, and fallback responses, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Prompt Building Preservation**: Verify that buildPrompt() generates identical prompts before and after the fix for various input combinations
2. **JSON Parsing Preservation**: Verify that parseAdviceResponse() handles valid JSON, malformed JSON, and edge cases identically
3. **Fallback Response Preservation**: Verify that fallback responses are generated identically when JSON parsing fails
4. **Validation Preservation**: Verify that requests without scheme_name still return 400 Bad Request
5. **Logging Preservation**: Verify that log messages are generated at the same points with the same information

### Unit Tests

- Test successful financial advice generation with valid API key
- Test 401 error handling with invalid API key (mock the API response)
- Test enhanced error messages for authentication failures
- Test that prompt building includes all required fields
- Test JSON parsing with various response formats
- Test fallback response generation when parsing fails
- Test validation logic for missing required fields

### Property-Based Tests

- Generate random valid FinancialAdviceRequest objects and verify prompt building produces consistent, well-formed prompts
- Generate random JSON responses (valid and invalid) and verify parsing handles all cases without crashing
- Generate random scheme data and user profiles to verify the service handles diverse inputs correctly
- Test that error handling is consistent across many different error scenarios

### Integration Tests

- Test full flow: user clicks "Get Overall Advice" → backend calls Groq API → response parsed → frontend displays advice
- Test error flow: invalid API key → 401 error → enhanced error message → user sees helpful error dialog
- Test that other features (scheme browsing, interested schemes) continue to work during and after financial advice requests
- Test API key validation at application startup (verify clear error if key is missing)
- Test that switching from invalid to valid API key allows the service to recover without restart
