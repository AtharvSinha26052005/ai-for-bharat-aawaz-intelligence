# API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## Interaction Endpoints

### POST /interact/voice
Process voice interaction with audio input.

**Request:**
```json
{
  "audio": "base64-encoded-audio-data",
  "language": "hi",
  "sessionId": "optional-session-id",
  "lowBandwidthMode": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-123",
    "transcription": "मुझे योजनाओं के बारे में बताएं",
    "response": "आपके लिए कई योजनाएं उपलब्ध हैं...",
    "audioResponse": "base64-encoded-audio",
    "intent": "SCHEME_DISCOVERY",
    "suggestions": ["View schemes", "Apply now", "Learn more"]
  }
}
```

### POST /interact/text
Process text interaction.

**Request:**
```json
{
  "message": "Tell me about schemes",
  "language": "en",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-123",
    "response": "Several schemes are available for you...",
    "intent": "SCHEME_DISCOVERY",
    "suggestions": ["Find schemes", "Check eligibility", "Apply"]
  }
}
```

---

## Profile Endpoints

### POST /profile
Create or update user profile.

**Request:**
```json
{
  "userId": "user-123",
  "age": 35,
  "incomeRange": "50000-100000",
  "occupation": "farmer",
  "familyComposition": {
    "adults": 2,
    "children": 2,
    "seniors": 1
  },
  "location": {
    "state": "Maharashtra",
    "district": "Pune",
    "block": "Haveli",
    "village": "Kharadi",
    "pincode": "411014"
  },
  "primaryNeeds": ["agriculture", "education"],
  "preferredLanguage": "mr",
  "preferredMode": "voice",
  "consentGiven": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "message": "Profile created successfully"
  }
}
```

### GET /profile/:userId
Get user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "age": 35,
    "occupation": "farmer",
    "location": {
      "state": "Maharashtra",
      "district": "Pune"
    },
    "preferredLanguage": "mr"
  }
}
```

### DELETE /profile/:userId
Delete user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Profile deleted successfully"
  }
}
```

---

## Scheme Endpoints

### GET /schemes/eligible/:userId
Get eligible schemes for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "totalEligible": 5,
    "recommendations": [
      {
        "schemeId": "scheme-1",
        "officialName": "Pradhan Mantri Kisan Samman Nidhi",
        "localizedName": "प्रधानमंत्री किसान सम्मान निधि",
        "shortDescription": "Direct income support to farmers",
        "category": "agriculture",
        "level": "central",
        "estimatedBenefit": 6000,
        "priority": 85,
        "personalizedExplanation": "As a farmer in Maharashtra...",
        "eligibility": {
          "eligible": true,
          "confidence": 0.95,
          "explanation": "You meet all criteria"
        }
      }
    ]
  }
}
```

### GET /schemes/:schemeId
Get scheme details.

**Query Parameters:**
- `language` (optional): Language code (hi, ta, te, bn, mr, en)

**Response:**
```json
{
  "success": true,
  "data": {
    "schemeId": "scheme-1",
    "officialName": "Pradhan Mantri Kisan Samman Nidhi",
    "localizedNames": { ... },
    "shortDescription": { ... },
    "detailedDescription": { ... },
    "category": "agriculture",
    "level": "central",
    "benefits": [
      {
        "type": "monetary",
        "amount": 6000,
        "frequency": "annual",
        "description": "Direct cash transfer"
      }
    ],
    "eligibilityRules": [ ... ],
    "requiredDocuments": ["Aadhaar", "Land records"],
    "officialWebsite": "https://pmkisan.gov.in",
    "helplineNumber": "155261"
  }
}
```

### POST /schemes/search
Search schemes.

**Request:**
```json
{
  "query": "agriculture schemes for farmers",
  "language": "en",
  "filters": {
    "category": ["agriculture"],
    "level": "central",
    "state": "Maharashtra"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "agriculture schemes for farmers",
    "language": "en",
    "totalResults": 3,
    "schemes": [ ... ]
  }
}
```

---

## Application Endpoints

### POST /applications
Create new application.

**Request:**
```json
{
  "schemeId": "scheme-1",
  "schemeName": "PM Kisan"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "app-123",
    "referenceNumber": "APP-ABC123",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /applications/:applicationId
Get application details.

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "app-123",
    "userId": "user-123",
    "schemeId": "scheme-1",
    "schemeName": "PM Kisan",
    "referenceNumber": "APP-ABC123",
    "status": "under-review",
    "submittedAt": "2024-01-01T00:00:00Z",
    "currentStage": "Verification",
    "estimatedCompletionDate": "2024-02-01T00:00:00Z"
  }
}
```

### POST /applications/:applicationId/submit
Submit application.

**Response:**
```json
{
  "success": true,
  "data": {
    "applicationId": "app-123",
    "status": "submitted",
    "message": "Application submitted successfully"
  }
}
```

### GET /applications/:applicationId/timeline
Get application timeline.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStage": "Under Review",
    "estimatedCompletion": "2024-02-01T00:00:00Z",
    "stages": [
      {
        "stage": "Application Created",
        "status": "completed",
        "completedAt": "2024-01-01T00:00:00Z"
      },
      {
        "stage": "Under Review",
        "status": "current",
        "estimatedAt": "2024-01-15T00:00:00Z"
      },
      {
        "stage": "Approval",
        "status": "pending"
      }
    ]
  }
}
```

---

## Fraud Detection Endpoints

### POST /fraud/analyze
Analyze content for fraud.

**Request:**
```json
{
  "content": "Urgent! Send money to claim your government benefit",
  "contentType": "text",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "riskLevel": "high",
    "confidence": 0.85,
    "fraudTypes": ["phishing", "advance-fee"],
    "indicators": [
      "Urgency tactics detected",
      "Request for money",
      "Suspicious language patterns"
    ],
    "explanation": "This message shows signs of fraud...",
    "recommendations": [
      "DO NOT respond",
      "DO NOT share personal information",
      "Report to authorities"
    ],
    "reportingGuidance": "To report this fraud..."
  }
}
```

### POST /fraud/report
Report fraud incident.

**Request:**
```json
{
  "content": "Fraudulent message content",
  "fraudType": "phishing",
  "riskLevel": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-123",
    "message": "Fraud report submitted successfully",
    "nextSteps": [
      "Your report has been recorded",
      "Authorities will be notified",
      "Keep evidence safe"
    ]
  }
}
```

---

## Education Endpoints

### GET /education/lessons
Get all financial literacy lessons.

**Query Parameters:**
- `language` (optional): Language code
- `difficulty` (optional): beginner, intermediate, advanced

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLessons": 15,
    "lessons": [
      {
        "lessonId": "lesson-1",
        "topic": "budgeting",
        "title": "Introduction to Budgeting",
        "duration": 5,
        "difficulty": "beginner",
        "prerequisites": []
      }
    ]
  }
}
```

### POST /education/lessons/:lessonId/start
Start a lesson.

**Response:**
```json
{
  "success": true,
  "data": {
    "lessonId": "lesson-1",
    "topic": "budgeting",
    "title": "Introduction to Budgeting",
    "content": "Lesson content...",
    "duration": 5,
    "examples": ["Example 1", "Example 2"],
    "keyTerms": {
      "budget": "A plan for spending money",
      "income": "Money you earn"
    },
    "exercises": [
      {
        "exerciseId": "ex-1",
        "question": "What is a budget?",
        "options": ["A", "B", "C"],
        "type": "multiple-choice"
      }
    ]
  }
}
```

### POST /education/exercises/:exerciseId/submit
Submit exercise answer.

**Request:**
```json
{
  "answer": "A"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exerciseId": "ex-1",
    "correct": true,
    "explanation": "Correct! A budget is...",
    "score": 100
  }
}
```

### GET /education/progress
Get learning progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "completedLessons": ["lesson-1", "lesson-2"],
    "scores": {
      "lesson-1": 85,
      "lesson-2": 90
    },
    "currentLevel": "intermediate",
    "suggestedNextTopics": ["savings", "loans"],
    "totalTimeSpent": 45
  }
}
```

---

## System Endpoints

### GET /health
Health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

### GET /metrics
Prometheus metrics (plain text format).

---

## Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limits

- General: 100 requests per minute per IP
- Authenticated: 500 requests per hour per user
- Voice synthesis: 30 requests per minute per user
- Fraud analysis: 20 requests per minute per user

## Languages Supported

- `en`: English
- `hi`: Hindi
- `ta`: Tamil
- `te`: Telugu
- `bn`: Bengali
- `mr`: Marathi
