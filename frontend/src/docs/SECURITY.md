# Security Implementation Documentation

This document describes the security measures implemented in the UI Redesign Modern feature to protect against common web vulnerabilities and ensure user data safety.

## Overview

The security implementation addresses the following requirements from the design document:
- **15.1**: Input sanitization for search queries
- **15.2**: API response structure validation
- **15.3**: 10-second timeout for API calls
- **15.4**: HTTPS enforcement for API endpoints
- **15.5**: Error log privacy (no PII in logs)
- **15.6**: userId validation before API calls
- **15.7**: Authentication expiry handling with redirect to login

## Implementation Details

### 1. Input Sanitization (Requirement 15.1)

**Location**: `frontend/src/utils/sanitization.ts`

**Functions**:
- `sanitizeInput(input: string)`: Removes HTML tags, script tags, event handlers, and javascript: protocol
- `sanitizeSearchQuery(query: string)`: Sanitizes search queries by removing HTML, special characters, and limiting length
- `escapeHtml(text: string)`: Escapes HTML special characters for safe rendering

**Usage**:
```typescript
import { sanitizeSearchQuery } from '../utils/sanitization';

const sanitizedQuery = sanitizeSearchQuery(userInput);
```

**Protection Against**:
- Cross-Site Scripting (XSS) attacks
- HTML injection
- Script injection

**Test Coverage**: `frontend/src/utils/sanitization.test.ts` (24 tests)

### 2. API Response Validation (Requirement 15.2)

**Location**: `frontend/src/services/apiService.ts`

**Functions**:
- `validateApiResponse<T>()`: Validates API response structure has required fields
- `validateSchemeRecommendation()`: Validates scheme recommendation data structure and types

**Implementation**:
```typescript
// Validates response structure
if (!this.validateApiResponse(response, ['recommendations'])) {
  throw new Error('Invalid API response structure');
}

// Validates each scheme recommendation
const validSchemes = recommendations.filter((scheme: any) => {
  return this.validateSchemeRecommendation(scheme);
});
```

**Validation Checks**:
- Response has `success` field
- Success responses have `data` field
- Error responses have `error` field
- Scheme objects have all required fields
- Eligibility confidence is between 0 and 1
- Data types match expected types

**Protection Against**:
- Malformed API responses
- Type confusion attacks
- Data injection

### 3. Request Timeout (Requirement 15.3)

**Location**: `frontend/src/services/apiService.ts`

**Implementation**:
```typescript
private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

this.api = axios.create({
  baseURL: API_BASE_URL,
  timeout: this.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Protection Against**:
- Slowloris attacks
- Resource exhaustion
- Hanging requests
- Denial of Service (DoS)

### 4. HTTPS Enforcement (Requirement 15.4)

**Location**: `frontend/src/config/api.ts`

**Implementation**:
```typescript
const getApiBaseUrl = (): string => {
  const url = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
  
  // In production, enforce HTTPS
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    console.error('Security Warning: API URL must use HTTPS in production');
    return url.replace('http://', 'https://');
  }
  
  return url;
};
```

**Protection Against**:
- Man-in-the-middle (MITM) attacks
- Data interception
- Session hijacking
- Credential theft

**Note**: Development environment allows HTTP for localhost testing.

### 5. Error Log Privacy (Requirement 15.5)

**Location**: `frontend/src/pages/Schemes.tsx`

**Implementation**:
```typescript
const sanitizeErrorMessage = (error: any): string => {
  const message = error?.error?.message || error?.message || 'An error occurred';
  // Remove potential PII patterns
  return message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    .replace(/\b\d{10,}\b/g, '[id]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
};
```

**PII Patterns Removed**:
- Email addresses → `[email]`
- ID numbers (10+ digits) → `[id]`
- Phone numbers → `[phone]`

**Protection Against**:
- PII exposure in logs
- Privacy violations
- Compliance issues (GDPR, etc.)

### 6. UserId Validation (Requirement 15.6)

**Location**: 
- `frontend/src/services/apiService.ts`
- `frontend/src/utils/sanitization.ts`

**Implementation**:
```typescript
private validateUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId');
  }
  
  const validUserIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validUserIdPattern.test(userId)) {
    throw new Error('Invalid userId: contains invalid characters');
  }
  
  return true;
}
```

**Validation Rules**:
- Must be non-empty string
- Only alphanumeric, hyphens, and underscores allowed
- Maximum length: 100 characters
- No special characters that could be used for injection

**Protection Against**:
- SQL injection
- NoSQL injection
- Path traversal
- Command injection

**Usage**:
```typescript
// Automatically validated before API calls
const schemes = await apiService.getEligibleSchemes(userId);
```

### 7. Authentication Expiry Handling (Requirement 15.7)

**Location**: `frontend/src/services/apiService.ts`

**Implementation**:
```typescript
this.api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);
```

**Behavior**:
- Intercepts all API responses
- Detects 401 Unauthorized status
- Removes expired auth token
- Redirects user to login page
- Prevents unauthorized access

**Protection Against**:
- Unauthorized access
- Session fixation
- Token reuse after expiry

## Testing

### Unit Tests

1. **Sanitization Tests** (`sanitization.test.ts`):
   - 24 tests covering all sanitization functions
   - Tests for XSS prevention
   - Tests for input validation
   - Tests for edge cases

2. **API Service Tests** (`apiService.test.ts`):
   - Tests for security requirements implementation
   - Documentation of security features

### Manual Testing Checklist

- [ ] Search query with `<script>` tags is sanitized
- [ ] UserId with special characters is rejected
- [ ] API timeout occurs after 10 seconds
- [ ] HTTPS is enforced in production
- [ ] Error messages don't contain PII
- [ ] 401 response redirects to login
- [ ] Invalid API responses are rejected

## Security Best Practices

### For Developers

1. **Always sanitize user input** before using it in the application
2. **Validate API responses** before rendering data
3. **Never log sensitive information** (PII, tokens, passwords)
4. **Use HTTPS** for all API communications in production
5. **Validate and sanitize** all user-provided identifiers
6. **Handle authentication errors** gracefully with proper redirects

### For Code Reviews

1. Check that all user inputs are sanitized
2. Verify API responses are validated
3. Ensure no PII is logged
4. Confirm HTTPS is used for API calls
5. Validate error handling is secure

## Known Limitations

1. **Client-side validation only**: All security measures are client-side. Server-side validation is still required.
2. **Basic sanitization**: For complex HTML rendering, consider using a library like DOMPurify.
3. **Regex-based PII detection**: May not catch all PII patterns. Consider more sophisticated detection.

## Future Enhancements

1. Implement Content Security Policy (CSP) headers
2. Add rate limiting for API calls
3. Implement request signing for API calls
4. Add CSRF token validation
5. Implement more sophisticated PII detection
6. Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
