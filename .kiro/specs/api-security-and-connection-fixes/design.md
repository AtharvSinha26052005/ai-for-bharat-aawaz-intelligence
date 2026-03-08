# API Security and Connection Fixes - Bugfix Design

## Overview

This bugfix addresses three critical issues affecting the application's security, database connectivity, and error handling:

1. **Database SSL Configuration Issue**: The PostgreSQL connection in `src/db/connection.ts` has SSL enabled unconditionally, causing connection failures in development environments where local databases don't support SSL.

2. **API Error Handling Issue**: When database connection errors occur before the error handler middleware is reached (e.g., during pool initialization), the application may return HTML error pages instead of JSON responses, breaking frontend error handling.

3. **Security Best Practice**: Ensure all API keys are properly loaded from environment variables with appropriate validation and error handling.

The fix strategy involves making SSL configuration environment-aware (matching the pattern already used in `read-replica.ts`), ensuring all error paths return JSON responses, and validating that sensitive credentials are properly configured.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger the bugs - SSL connection attempts in development, unhandled errors returning HTML, or missing API key validation
- **Property (P)**: The desired behavior - environment-based SSL configuration, consistent JSON error responses, and validated API credentials
- **Preservation**: Existing database query functionality, error handling for known error types, and successful API operations that must remain unchanged
- **Database.pool**: The PostgreSQL connection pool in `src/db/connection.ts` that manages database connections
- **NODE_ENV**: Environment variable that determines whether the application runs in 'development' or 'production' mode
- **errorHandler**: Express middleware in `src/middleware/errorHandler.ts` that catches and formats errors as JSON responses
- **GROQ_API_KEY**: Environment variable containing the API key for the Groq LLM service used in financial advice generation

## Bug Details

### Fault Condition

The bugs manifest in three distinct scenarios:

**Bug 1 - SSL Configuration:**
The database connection attempts SSL in development environments where local PostgreSQL instances don't support it. The `Database` constructor in `src/db/connection.ts` (line 16) has `ssl: { rejectUnauthorized: false }` hardcoded, unlike `read-replica.ts` which correctly uses environment-based configuration.

**Bug 2 - Error Response Format:**
When errors occur during application initialization or in routes not wrapped with `asyncHandler`, the default Express error handling may return HTML error pages instead of JSON, causing frontend parsing errors.

**Bug 3 - API Key Validation:**
The `FinancialAdviceService` reads `process.env.GROQ_API_KEY` but uses an empty string fallback without validation, potentially causing silent failures or unclear error messages when the API key is missing.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { context: string, environment: string, apiKey: string }
  OUTPUT: boolean
  
  RETURN (input.context == 'database_connection' 
          AND input.environment == 'development' 
          AND sslConfigured == true)
         OR (input.context == 'error_response' 
             AND errorOccurredOutsideMiddleware == true)
         OR (input.context == 'api_call' 
             AND input.apiKey == '')
END FUNCTION
```

### Examples

**Bug 1 - SSL Configuration:**
- Input: Application starts in development with `NODE_ENV=development` and local PostgreSQL without SSL
- Current: Connection fails with "The server does not support SSL connections"
- Expected: Connection succeeds using `ssl: undefined` (no SSL)

**Bug 2 - Error Response Format:**
- Input: Database connection fails during pool initialization, frontend calls `/api/v1/profile/schemes`
- Current: Frontend receives HTML error page starting with `<!DOCTYPE`, throws JSON parse error
- Expected: Frontend receives `{ "success": false, "error": { "code": "DATABASE_ERROR", "message": "..." } }`

**Bug 3 - API Key Validation:**
- Input: `GROQ_API_KEY` is not set in environment, user requests financial advice
- Current: Service attempts API call with empty Authorization header, receives unclear 401 error
- Expected: Service throws clear error: "GROQ_API_KEY environment variable is not configured"

**Edge Cases:**
- Production environment with SSL-enabled database should continue using SSL
- Validation errors and AppErrors should continue returning JSON (already working)
- API calls with valid keys should continue working normally

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful database queries and transactions must continue to work exactly as before
- Error handler middleware must continue to return JSON for ValidationError and AppError
- Read replica connections must continue using their existing environment-based SSL logic
- Financial advice API calls with valid credentials must continue to work
- All existing API routes that use `asyncHandler` must continue to return JSON errors
- Health check endpoints must continue to return JSON responses
- CORS, rate limiting, and security middleware must continue to function as configured

**Scope:**
All inputs that do NOT involve the three bug conditions should be completely unaffected by this fix. This includes:
- Successful database connections in any environment
- Errors that are properly caught by existing error handler middleware
- API calls with valid credentials
- All other application functionality

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Inconsistent SSL Configuration Pattern**: 
   - `src/db/connection.ts` line 16 has hardcoded `ssl: { rejectUnauthorized: false }`
   - `src/db/read-replica.ts` lines 20 and 31 correctly use `ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined`
   - The connection.ts file was likely created before the environment-aware pattern was established

2. **Unhandled Error Paths**:
   - Database pool initialization errors may occur before Express middleware stack is active
   - Some routes may not be wrapped with `asyncHandler`, causing errors to bypass the error handler middleware
   - Default Express error handling returns HTML in development mode

3. **Missing API Key Validation**:
   - `src/services/financial-advice-service.ts` line 4 uses `process.env.GROQ_API_KEY || ''` without validation
   - Empty string fallback masks configuration errors until API call fails
   - Error message from Groq API is less clear than a configuration validation error

## Correctness Properties

Property 1: Fault Condition - Environment-Based SSL Configuration

_For any_ database connection attempt where NODE_ENV is 'development', the Database constructor SHALL configure the connection pool with `ssl: undefined` (no SSL), allowing connections to local PostgreSQL instances that don't support SSL. _For any_ connection attempt where NODE_ENV is 'production', the constructor SHALL configure with `ssl: { rejectUnauthorized: false }` to support SSL connections.

**Validates: Requirements 2.1, 2.2**

Property 2: Fault Condition - JSON Error Responses

_For any_ error that occurs in an API route (including database connection errors, validation errors, or unexpected exceptions), the application SHALL return a JSON response with the format `{ "success": false, "error": { "code": "ERROR_CODE", "message": "description" } }` and SHALL NOT return HTML error pages.

**Validates: Requirements 2.3, 2.4, 2.5**

Property 3: Fault Condition - API Key Validation

_For any_ attempt to use the FinancialAdviceService when GROQ_API_KEY environment variable is not set or is empty, the service constructor or initialization SHALL throw a clear error indicating the missing configuration, preventing silent failures or unclear API errors.

**Validates: Requirements 2.4 (error handling)**

Property 4: Preservation - Database Query Functionality

_For any_ database query or transaction on a successfully established connection, the fixed Database class SHALL execute the operation and return results exactly as the original implementation, preserving all query execution, transaction handling, connection pooling, and error logging behavior.

**Validates: Requirements 3.1, 3.2**

Property 5: Preservation - Existing Error Handler Behavior

_For any_ ValidationError or AppError that is caught by the error handler middleware, the fixed application SHALL return the same JSON error response format with the same status codes as the original implementation, preserving all existing error handling logic.

**Validates: Requirements 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `src/db/connection.ts`

**Function**: `Database` constructor

**Specific Changes**:
1. **Import config**: Add `import { config } from '../config';` if not already present (verify config.nodeEnv is available)
2. **Replace SSL configuration**: Change line 16 from:
   ```typescript
   ssl: { rejectUnauthorized: false },
   ```
   to:
   ```typescript
   ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
   ```
   This matches the pattern already used in `read-replica.ts` lines 20 and 31

**File 2**: `src/services/financial-advice-service.ts`

**Class**: `FinancialAdviceService`

**Specific Changes**:
1. **Add API key validation**: In the constructor or at the top of the file after the constant declaration, add:
   ```typescript
   if (!GROQ_API_KEY) {
     throw new Error('GROQ_API_KEY environment variable is not configured');
   }
   ```
2. **Remove empty string fallback**: Change line 4 from:
   ```typescript
   const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
   ```
   to:
   ```typescript
   const GROQ_API_KEY = process.env.GROQ_API_KEY;
   ```

**File 3**: `src/middleware/errorHandler.ts` (Verification)

**Function**: `errorHandler`

**Specific Changes**:
1. **Verify JSON response**: Confirm that all error paths return JSON (already appears correct)
2. **Add database error handling**: If not already present, add specific handling for database connection errors:
   ```typescript
   // Handle database connection errors
   if (err.message?.includes('does not support SSL') || err.code === 'ECONNREFUSED') {
     res.status(503).json({
       success: false,
       error: {
         code: 'DATABASE_CONNECTION_ERROR',
         message: 'Database connection failed',
       },
     });
     return;
   }
   ```

**File 4**: Route files using database (Verification)

**Specific Changes**:
1. **Verify asyncHandler usage**: Ensure all routes that perform database operations are wrapped with `asyncHandler` to ensure errors are caught by the error handler middleware
2. **Check routes**: Particularly verify `/api/v1/profile/schemes` and other profile routes in `src/routes/profile.ts`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the three bug conditions and observe failures on the UNFIXED code to confirm the root causes.

**Test Cases**:
1. **Development SSL Connection Test**: Set `NODE_ENV=development`, attempt database connection to local PostgreSQL without SSL (will fail on unfixed code with "does not support SSL" error)
2. **Production SSL Connection Test**: Set `NODE_ENV=production`, attempt database connection (should succeed on unfixed code if database supports SSL)
3. **Database Error JSON Response Test**: Simulate database connection failure, make API request to `/api/v1/profile/schemes`, verify response format (will return HTML on unfixed code)
4. **Missing API Key Test**: Unset `GROQ_API_KEY`, attempt to call financial advice service (will fail with unclear error on unfixed code)
5. **Valid API Key Test**: Set valid `GROQ_API_KEY`, call financial advice service (should succeed on unfixed code)

**Expected Counterexamples**:
- Development environment fails to connect to local database due to SSL requirement
- API errors return HTML `<!DOCTYPE` responses instead of JSON
- Missing API key causes unclear 401 errors from Groq API instead of configuration error
- Possible additional causes: timing issues, middleware ordering, route configuration

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Specific Checks**:
```
// Bug 1: SSL Configuration
FOR environment IN ['development', 'production'] DO
  SET NODE_ENV = environment
  connection := Database.constructor()
  IF environment == 'development' THEN
    ASSERT connection.pool.options.ssl == undefined
  ELSE
    ASSERT connection.pool.options.ssl == { rejectUnauthorized: false }
  END IF
END FOR

// Bug 2: JSON Error Responses
FOR errorType IN [DatabaseError, ValidationError, UnexpectedError] DO
  SIMULATE error of errorType
  response := makeAPIRequest('/api/v1/profile/schemes')
  ASSERT response.headers['content-type'] == 'application/json'
  ASSERT response.body.success == false
  ASSERT response.body.error.code EXISTS
  ASSERT response.body.error.message EXISTS
END FOR

// Bug 3: API Key Validation
UNSET GROQ_API_KEY
TRY
  service := new FinancialAdviceService()
  FAIL "Should have thrown error"
CATCH error
  ASSERT error.message CONTAINS 'GROQ_API_KEY'
  ASSERT error.message CONTAINS 'not configured'
END TRY
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same results as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Successful Database Queries**: Observe that queries work correctly on unfixed code when connection succeeds, then verify same behavior after fix
2. **Transaction Handling**: Observe that transactions (BEGIN/COMMIT/ROLLBACK) work correctly on unfixed code, then verify preservation
3. **Error Handler for Known Errors**: Observe that ValidationError and AppError return correct JSON on unfixed code, then verify preservation
4. **Successful API Calls**: Observe that financial advice API works with valid key on unfixed code, then verify preservation
5. **Connection Pool Behavior**: Observe connection pooling, timeouts, and error events on unfixed code, then verify preservation

### Unit Tests

- Test Database constructor with `NODE_ENV=development` (should set `ssl: undefined`)
- Test Database constructor with `NODE_ENV=production` (should set `ssl: { rejectUnauthorized: false }`)
- Test FinancialAdviceService initialization with missing GROQ_API_KEY (should throw error)
- Test FinancialAdviceService initialization with valid GROQ_API_KEY (should succeed)
- Test error handler middleware returns JSON for database errors
- Test error handler middleware returns JSON for validation errors (preservation)
- Test error handler middleware returns JSON for app errors (preservation)
- Test database query execution on successful connection (preservation)
- Test database transaction handling (preservation)

### Property-Based Tests

- Generate random database queries and verify they execute correctly after SSL fix (preservation)
- Generate random error scenarios and verify all return JSON responses (fix checking)
- Generate random environment configurations and verify SSL is set correctly (fix checking)
- Generate random API request scenarios and verify response format consistency (preservation)
- Test connection pool behavior across many connection/disconnection cycles (preservation)

### Integration Tests

- Test full application startup in development environment with local database
- Test full application startup in production environment with SSL-enabled database
- Test API error flow from database failure through error handler to frontend
- Test financial advice feature end-to-end with valid API key
- Test that frontend can parse all error responses without JSON parsing errors
- Test health check endpoints continue to work in both environments
- Test that all profile routes return JSON for both success and error cases
