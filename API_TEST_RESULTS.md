# API Test Results

## Server Status
✅ Server running on http://localhost:3000
✅ All routes registered successfully

## Public Endpoints (No Authentication Required)

### Health Check
- **GET** `/health`
- **Status**: ✅ Working (200 OK)
- **Response**: `{"status":"healthy","timestamp":"...","uptime":...,"environment":"development"}`

### Metrics
- **GET** `/metrics`
- **Status**: ✅ Working (200 OK)
- **Response**: Prometheus metrics

### Privacy Notice
- **GET** `/api/v1/compliance/privacy-notice?language=en`
- **Status**: ✅ Working (200 OK)
- **Response**: Privacy notice in specified language

## Protected Endpoints (Require Authentication)

All endpoints below require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Fraud Detection
- **POST** `/api/v1/fraud/analyze`
- **Status**: ✅ Route exists (returns UNAUTHORIZED without token)
- **Body**: `{"content":"text to analyze","contentType":"text","language":"en"}`

### Compliance
- **POST** `/api/v1/compliance/data-deletion`
- **Status**: ✅ Route exists (requires authentication)
- **POST** `/api/v1/compliance/data-sharing-consent`
- **Status**: ✅ Route exists (requires authentication)
- **GET** `/api/v1/compliance/data-sharing-preferences`
- **Status**: ✅ Route exists (requires authentication)

### Profile Management
- **GET** `/api/v1/profile/:userId`
- **POST** `/api/v1/profile`
- **PATCH** `/api/v1/profile/:userId`
- **DELETE** `/api/v1/profile/:userId`
- **GET** `/api/v1/profile/:userId/exists`

### Schemes
- **GET** `/api/v1/schemes/eligible/:userId`
- **GET** `/api/v1/schemes/:schemeId`
- **GET** `/api/v1/schemes/search`

### Applications
- **POST** `/api/v1/applications`
- **GET** `/api/v1/applications/:applicationId`
- **GET** `/api/v1/applications/reference/:referenceNumber`
- **GET** `/api/v1/applications/user/:userId`
- **PATCH** `/api/v1/applications/:applicationId`
- **POST** `/api/v1/applications/:applicationId/submit`
- **GET** `/api/v1/applications/:applicationId/history`
- **GET** `/api/v1/applications/:applicationId/timeline`

### Education
- **GET** `/api/v1/education/lessons`
- **GET** `/api/v1/education/lessons/:lessonId`
- **POST** `/api/v1/education/lessons/:lessonId/start`
- **POST** `/api/v1/education/exercises/:exerciseId/submit`
- **GET** `/api/v1/education/progress/:userId`
- **GET** `/api/v1/education/terms/:term`

### Interaction (Voice/Text)
- **POST** `/api/v1/interact/text`
- **POST** `/api/v1/interact/voice`

### Admin (Requires admin role)
- **POST** `/api/v1/admin/schemes`
- **PATCH** `/api/v1/admin/schemes/:schemeId`
- **GET** `/api/v1/admin/schemes/:schemeId/versions`
- **POST** `/api/v1/admin/schemes/:schemeId/rollback`
- **POST** `/api/v1/admin/schemes/import`
- **POST** `/api/v1/admin/schemes/:schemeId/translate`
- **POST** `/api/v1/admin/sync/government-api`

## How to Test Protected Endpoints

1. **Create a user profile** (if you have a registration endpoint)
2. **Get a JWT token** (through login/authentication)
3. **Include the token in requests**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/profile/USER_ID
   ```

## Common Error Responses

- **401 UNAUTHORIZED**: Missing or invalid JWT token
- **403 FORBIDDEN**: Valid token but insufficient permissions
- **404 NOT_FOUND**: Route doesn't exist or wrong HTTP method
- **400 BAD_REQUEST**: Invalid request body or parameters

## Notes

- Most endpoints require authentication (JWT token)
- Admin endpoints require admin role
- Use POST for creating resources
- Use GET for retrieving resources
- Use PATCH for updating resources
- Use DELETE for removing resources
