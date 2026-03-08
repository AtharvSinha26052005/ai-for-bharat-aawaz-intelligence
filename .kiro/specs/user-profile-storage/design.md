# Design Document: User Profile Storage

## Overview

The user-profile-storage feature provides a lightweight RESTful API for persisting basic demographic and contact information in PostgreSQL. This system is designed to capture user profile data from the React frontend application for later use in scheme eligibility analysis via Groq LLM integration.

### Key Design Decisions

1. **Separate Profile Table**: The design introduces a new `user_profiles` table distinct from the existing `users` table. This separation allows for:
   - Unauthenticated profile submission (no user account required)
   - Simplified data model focused on scheme eligibility criteria
   - Independent lifecycle management for profile data

2. **UUID-based Identification**: Using UUIDs as primary keys provides:
   - Globally unique identifiers suitable for distributed systems
   - No sequential enumeration that could leak information about user count
   - Compatibility with the existing system architecture

3. **Minimal Validation Layer**: The design emphasizes database-level constraints over application-level validation to ensure data integrity at the persistence layer.

4. **Standard REST Conventions**: Following REST best practices with proper HTTP status codes, JSON responses, and resource-oriented URLs.

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with `pg` driver
- **Validation**: Joi schema validation
- **UUID Generation**: `uuid` library (v4)
- **Logging**: Winston
- **CORS**: `cors` middleware

## Architecture

### System Components

```
┌─────────────────┐
│ React Frontend  │
│ (Client_App)    │
└────────┬────────┘
         │ HTTP/JSON
         ▼
┌─────────────────────────────────────┐
│     Express.js Application          │
│  ┌───────────────────────────────┐  │
│  │   Profile_API (Routes)        │  │
│  │   - POST /api/v1/profiles     │  │
│  │   - GET /api/v1/profiles/:id  │  │
│  └──────────┬────────────────────┘  │
│             │                        │
│  ┌──────────▼────────────────────┐  │
│  │   Profile_Validator           │  │
│  │   - Schema validation         │  │
│  │   - Type checking             │  │
│  │   - UUID format validation    │  │
│  └──────────┬────────────────────┘  │
│             │                        │
│  ┌──────────▼────────────────────┐  │
│  │   Profile_Service             │  │
│  │   - Business logic            │  │
│  │   - UUID generation           │  │
│  │   - Error handling            │  │
│  └──────────┬────────────────────┘  │
│             │                        │
│  ┌──────────▼────────────────────┐  │
│  │   Profile_Store (Repository)  │  │
│  │   - Database operations       │  │
│  │   - Connection pooling        │  │
│  │   - Query execution           │  │
│  └──────────┬────────────────────┘  │
└─────────────┼────────────────────────┘
              │ SQL
              ▼
     ┌────────────────┐
     │   PostgreSQL   │
     │  user_profiles │
     └────────────────┘
```

### Layered Architecture

1. **Route Layer** (`Profile_API`): Handles HTTP requests, response formatting, and status codes
2. **Validation Layer** (`Profile_Validator`): Validates request data against schemas
3. **Service Layer** (`Profile_Service`): Contains business logic and orchestrates operations
4. **Repository Layer** (`Profile_Store`): Manages database interactions and connection pooling

### Request Flow

**Profile Creation Flow**:
```
Client → POST /api/v1/profiles
  → CORS preflight check
  → Request body parsing
  → Schema validation (Profile_Validator)
  → UUID generation (Profile_ID_Generator)
  → Database insert (Profile_Store)
  → Response formatting (201 Created)
  → Client receives {data: {profile_id: "..."}}
```

**Profile Retrieval Flow**:
```
Client → GET /api/v1/profiles/:profile_id
  → UUID format validation (Profile_Validator)
  → Database query (Profile_Store)
  → Response formatting (200 OK or 404 Not Found)
  → Client receives {data: {...profile fields}}
```

## Components and Interfaces

### 1. Profile_API (Route Handler)

**File**: `src/routes/profile-storage.ts`

**Responsibilities**:
- Define HTTP endpoints
- Parse request parameters
- Format responses with consistent structure
- Set appropriate HTTP status codes
- Handle CORS preflight requests

**Endpoints**:

```typescript
POST /api/v1/profiles
  Request Body: ProfileCreateRequest
  Success Response: 201 Created
    {
      "data": {
        "profile_id": "uuid-string"
      }
    }
  Error Responses:
    400 Bad Request - Invalid or missing fields
    500 Internal Server Error - Database failure

GET /api/v1/profiles/:profile_id
  Path Parameter: profile_id (UUID)
  Success Response: 200 OK
    {
      "data": {
        "id": "uuid-string",
        "age": 35,
        "income_range": "1L-3L",
        "phone_number": "9876543210",
        "aadhar_number": "123456789012",
        "gender": "male",
        "caste": "general",
        "occupation": "farmer",
        "state": "Karnataka",
        "district": "Bangalore",
        "block": "Anekal",
        "village": "Jigani",
        "pincode": "560105",
        "preferred_mode": "text",
        "created_at": "2024-01-15T10:30:00Z"
      }
    }
  Error Responses:
    400 Bad Request - Invalid UUID format
    404 Not Found - Profile not found
    500 Internal Server Error - Database failure

OPTIONS /api/v1/profiles
  Response: 200 OK with CORS headers
```

### 2. Profile_Validator

**File**: `src/validators/profile-storage-validator.ts`

**Responsibilities**:
- Validate request body structure
- Enforce data type constraints
- Validate UUID format
- Return descriptive error messages

**Validation Schema**:

```typescript
interface ProfileCreateRequest {
  age: number;                    // Required, positive integer
  income_range: string;           // Required, string
  phone_number: string;           // Required, string
  aadhar_number: string;          // Required, string
  gender: string;                 // Required, string
  caste: string;                  // Required, string
  occupation: string;             // Required, string
  state: string;                  // Required, string
  district: string;               // Required, string
  block?: string;                 // Optional, string
  village?: string;               // Optional, string
  pincode?: string;               // Optional, string
  preferred_mode: string;         // Required, string
}
```

**Validation Rules**:
- `age`: Must be a positive integer (> 0)
- All text fields: Must be strings
- UUID validation: Must match UUID v4 format pattern

### 3. Profile_Service

**File**: `src/services/profile-storage-service.ts`

**Responsibilities**:
- Generate UUIDs for new profiles
- Orchestrate validation and persistence
- Handle business logic errors
- Transform data between layers

**Interface**:

```typescript
class ProfileStorageService {
  async createProfile(data: ProfileCreateRequest): Promise<ProfileCreateResponse>;
  async getProfileById(profileId: string): Promise<ProfileData | null>;
}

interface ProfileCreateResponse {
  profile_id: string;
}

interface ProfileData {
  id: string;
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block: string | null;
  village: string | null;
  pincode: string | null;
  preferred_mode: string;
  created_at: Date;
}
```

### 4. Profile_Store (Repository)

**File**: `src/repositories/profile-storage-repository.ts`

**Responsibilities**:
- Execute SQL queries
- Manage database connections from pool
- Handle connection timeouts
- Map database rows to domain objects

**Interface**:

```typescript
class ProfileStorageRepository {
  async insert(profile: ProfileInsertData): Promise<string>;
  async findById(profileId: string): Promise<ProfileData | null>;
}

interface ProfileInsertData {
  id: string;
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block: string | null;
  village: string | null;
  pincode: string | null;
  preferred_mode: string;
}
```

### 5. Profile_ID_Generator

**Implementation**: Integrated into `Profile_Service`

**Responsibilities**:
- Generate UUID v4 identifiers
- Ensure uniqueness (UUID collision probability is negligible)

**Library**: `uuid` package

```typescript
import { v4 as uuidv4 } from 'uuid';

function generateProfileId(): string {
  return uuidv4();
}
```

### 6. Database Connection Pool

**Configuration**: Managed by existing `src/db/connection.ts`

**Pool Settings**:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 30 seconds
- Statement timeout: 30 seconds

## Data Models

### Database Schema

**Table**: `user_profiles`

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    age INTEGER NOT NULL CHECK (age > 0),
    income_range TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    aadhar_number TEXT NOT NULL,
    gender TEXT NOT NULL,
    caste TEXT NOT NULL,
    occupation TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    block TEXT,
    village TEXT,
    pincode TEXT,
    preferred_mode TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX idx_user_profiles_state_district ON user_profiles(state, district);
```

**Design Rationale**:

1. **UUID Primary Key**: Provides globally unique identifiers without auto-increment sequences
2. **NOT NULL Constraints**: Enforces required fields at database level
3. **CHECK Constraint on age**: Ensures age is positive
4. **TIMESTAMPTZ for created_at**: Stores timestamps with timezone information
5. **Indexes**: 
   - `created_at`: Supports temporal queries and analytics
   - `state, district`: Supports geographic filtering for scheme eligibility

### TypeScript Types

```typescript
// Request/Response types
export interface ProfileCreateRequest {
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block?: string;
  village?: string;
  pincode?: string;
  preferred_mode: string;
}

export interface ProfileCreateResponse {
  profile_id: string;
}

export interface ProfileData {
  id: string;
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block: string | null;
  village: string | null;
  pincode: string | null;
  preferred_mode: string;
  created_at: Date;
}

// API Response wrappers
export interface SuccessResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Profile Creation and Retrieval Round Trip

*For any* valid profile data, creating a profile via POST /api/v1/profiles and then retrieving it via GET /api/v1/profiles/:profile_id should return a profile containing all the originally submitted fields with matching values.

**Validates: Requirements 2.4, 3.3, 3.4, 6.5**

### Property 2: Created Timestamp Auto-Population

*For any* profile insertion, the created_at field should be automatically populated with a timestamp, and the timestamp should be within a reasonable time window (e.g., 5 seconds) of the insertion time.

**Validates: Requirements 1.3**

### Property 3: NOT NULL Constraint Enforcement

*For any* attempt to insert a profile record without an id or without allowing created_at to be set by the database, the database should reject the operation with a constraint violation error.

**Validates: Requirements 1.4**

### Property 4: UUID Generation and Format

*For any* valid profile creation request, the system should generate a profile_id that conforms to the UUID v4 format specification (8-4-4-4-12 hexadecimal pattern).

**Validates: Requirements 2.3**

### Property 5: Invalid Input Rejection

*For any* profile creation request with invalid data (missing required fields, non-positive age, or non-string text fields), the API should return a 400 status code with a JSON error response containing an "error" field.

**Validates: Requirements 2.2, 2.6, 4.1, 4.2, 4.3**

### Property 6: Invalid UUID Format Rejection

*For any* profile retrieval request with a profile_id that does not match valid UUID format, the API should return a 400 status code with a JSON error response.

**Validates: Requirements 3.2, 3.5**

### Property 7: Non-Existent Profile Handling

*For any* profile_id that does not exist in the database, a GET request to /api/v1/profiles/:profile_id should return a 404 status code with a JSON error response.

**Validates: Requirements 3.6**

### Property 8: Successful Response Format

*For any* successful API operation (profile creation or retrieval), the response should have status code 201 (for creation) or 200 (for retrieval), Content-Type header set to "application/json", and a JSON body with a "data" field containing the result.

**Validates: Requirements 2.5, 6.1, 6.3, 6.4**

### Property 9: Error Response Format

*For any* API operation that results in an error (validation failure, not found, or server error), the response should have Content-Type header set to "application/json" and a JSON body with an "error" field containing a descriptive message string.

**Validates: Requirements 6.2, 6.3**

### Property 10: CORS Headers Presence

*For any* API request (GET, POST, or OPTIONS), the response should include CORS headers: Access-Control-Allow-Methods with value "GET, POST, OPTIONS" and Access-Control-Allow-Headers with value "Content-Type".

**Validates: Requirements 7.1, 7.3, 7.4**

## Error Handling

### Error Categories

1. **Validation Errors (400 Bad Request)**
   - Missing required fields
   - Invalid data types (non-integer age, non-string text fields)
   - Invalid age value (non-positive)
   - Invalid UUID format in path parameter

2. **Not Found Errors (404 Not Found)**
   - Profile ID does not exist in database

3. **Server Errors (500 Internal Server Error)**
   - Database connection failures
   - Database query execution failures
   - Unexpected runtime errors

### Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Descriptive error message"
}
```

### Error Handling Strategy

1. **Validation Layer**: Catch validation errors early and return 400 responses before database interaction
2. **Service Layer**: Handle business logic errors and transform them to appropriate HTTP errors
3. **Repository Layer**: Catch database errors and throw custom exceptions
4. **Global Error Handler**: Catch unhandled errors and return 500 responses with sanitized messages

### Specific Error Scenarios

**Missing Required Fields**:
```json
Request: POST /api/v1/profiles
Body: { "age": 30 }

Response: 400 Bad Request
{
  "error": "Validation failed: income_range is required"
}
```

**Invalid Age Value**:
```json
Request: POST /api/v1/profiles
Body: { "age": -5, "income_range": "1L-3L", ... }

Response: 400 Bad Request
{
  "error": "Validation failed: age must be a positive integer"
}
```

**Invalid UUID Format**:
```json
Request: GET /api/v1/profiles/invalid-uuid

Response: 400 Bad Request
{
  "error": "Invalid profile_id format: must be a valid UUID"
}
```

**Profile Not Found**:
```json
Request: GET /api/v1/profiles/550e8400-e29b-41d4-a716-446655440000

Response: 404 Not Found
{
  "error": "Profile not found"
}
```

**Database Connection Failure**:
```json
Request: POST /api/v1/profiles
Body: { valid profile data }

Response: 500 Internal Server Error
{
  "error": "Database operation failed"
}
```

### Connection Timeout Handling

When the database connection pool is exhausted:
1. The operation queues for up to 30 seconds
2. If a connection becomes available, the operation proceeds normally
3. If 30 seconds elapse without an available connection, return:
   ```json
   {
     "error": "Database connection timeout"
   }
   ```

### Logging Strategy

All errors are logged with appropriate context:
- **Validation errors**: Log at INFO level (expected user errors)
- **Not found errors**: Log at INFO level (expected user errors)
- **Database errors**: Log at ERROR level with full stack trace
- **Unexpected errors**: Log at ERROR level with full stack trace and request context

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs using randomized test data

Both testing approaches are complementary and necessary for comprehensive validation.

### Property-Based Testing

**Library**: `fast-check` (already installed in the project)

**Configuration**: Each property test must run a minimum of 100 iterations to ensure adequate coverage through randomization.

**Test Tagging**: Each property test must include a comment referencing the design document property:

```typescript
// Feature: user-profile-storage, Property 1: Profile Creation and Retrieval Round Trip
```

### Property Test Specifications

**Property 1: Profile Creation and Retrieval Round Trip**
- Generate random valid profile data
- POST to create profile, capture profile_id
- GET to retrieve profile using profile_id
- Assert all fields match original data
- Minimum 100 iterations

**Property 2: Created Timestamp Auto-Population**
- Generate random valid profile data
- Record timestamp before POST
- POST to create profile
- GET to retrieve profile
- Assert created_at is within 5 seconds of recorded timestamp
- Minimum 100 iterations

**Property 3: NOT NULL Constraint Enforcement**
- This tests database constraints, not API behavior
- Unit test: Attempt direct database insert without id
- Assert database rejects with constraint violation

**Property 4: UUID Generation and Format**
- Generate random valid profile data
- POST to create profile
- Assert profile_id matches UUID v4 regex pattern
- Assert profile_id is unique across iterations
- Minimum 100 iterations

**Property 5: Invalid Input Rejection**
- Generate random invalid profile data (missing fields, negative age, non-string fields)
- POST to create profile
- Assert response status is 400
- Assert response body contains "error" field
- Minimum 100 iterations

**Property 6: Invalid UUID Format Rejection**
- Generate random invalid UUID strings
- GET /api/v1/profiles/:invalid_uuid
- Assert response status is 400
- Assert response body contains "error" field
- Minimum 100 iterations

**Property 7: Non-Existent Profile Handling**
- Generate random valid UUIDs that don't exist in database
- GET /api/v1/profiles/:non_existent_uuid
- Assert response status is 404
- Assert response body contains "error" field
- Minimum 100 iterations

**Property 8: Successful Response Format**
- Generate random valid profile data
- POST to create profile
- Assert status is 201
- Assert Content-Type is "application/json"
- Assert response body has "data" field with "profile_id"
- GET to retrieve profile
- Assert status is 200
- Assert Content-Type is "application/json"
- Assert response body has "data" field with all profile fields
- Minimum 100 iterations

**Property 9: Error Response Format**
- Generate random invalid requests (various error types)
- Make API request
- Assert Content-Type is "application/json"
- Assert response body has "error" field with string value
- Minimum 100 iterations

**Property 10: CORS Headers Presence**
- Generate random valid requests (GET, POST, OPTIONS)
- Make API request
- Assert Access-Control-Allow-Methods header is present
- Assert Access-Control-Allow-Headers header is present
- Minimum 100 iterations

### Unit Test Specifications

Unit tests should focus on specific examples and edge cases:

1. **Endpoint Existence Tests**
   - POST /api/v1/profiles responds to requests
   - GET /api/v1/profiles/:profile_id responds to requests
   - OPTIONS /api/v1/profiles responds with 200 and CORS headers

2. **Specific Validation Examples**
   - Age = 0 is rejected
   - Age = -1 is rejected
   - Empty string for required field is rejected
   - Null for required field is rejected

3. **Edge Cases**
   - Very large age values (e.g., 999999)
   - Very long strings for text fields
   - Special characters in text fields
   - Unicode characters in text fields

4. **Database Error Simulation**
   - Mock database connection failure
   - Mock database query timeout
   - Assert 500 error response

5. **Integration Tests**
   - Full request/response cycle with real database
   - Verify database state after operations
   - Test transaction rollback on errors

### Test Data Generators

For property-based testing, implement generators for:

```typescript
// Valid profile data generator
function generateValidProfile(): ProfileCreateRequest {
  return {
    age: fc.integer({ min: 1, max: 120 }),
    income_range: fc.constantFrom('below-1L', '1L-3L', '3L-5L', 'above-5L'),
    phone_number: fc.string({ minLength: 10, maxLength: 15 }),
    aadhar_number: fc.string({ minLength: 12, maxLength: 12 }),
    gender: fc.constantFrom('male', 'female', 'other'),
    caste: fc.constantFrom('general', 'obc', 'sc', 'st'),
    occupation: fc.string({ minLength: 1, maxLength: 100 }),
    state: fc.string({ minLength: 1, maxLength: 100 }),
    district: fc.string({ minLength: 1, maxLength: 100 }),
    block: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    village: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    pincode: fc.option(fc.string({ minLength: 6, maxLength: 6 })),
    preferred_mode: fc.constantFrom('voice', 'text', 'both'),
  };
}

// Invalid profile data generator
function generateInvalidProfile(): Partial<ProfileCreateRequest> {
  return fc.oneof(
    // Missing required fields
    fc.record({ age: fc.integer() }),
    // Invalid age
    fc.record({ ...validFields, age: fc.integer({ max: 0 }) }),
    // Non-string text field
    fc.record({ ...validFields, occupation: fc.integer() }),
  );
}

// Invalid UUID generator
function generateInvalidUUID(): string {
  return fc.oneof(
    fc.string(),
    fc.constant('not-a-uuid'),
    fc.constant('12345'),
    fc.constant(''),
  );
}
```

### Test Coverage Goals

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Function Coverage**: 100% of exported functions
- **Property Coverage**: 100% of correctness properties

### Continuous Integration

Tests should run on:
- Every commit (unit tests only for speed)
- Every pull request (full test suite including property tests)
- Nightly builds (extended property test runs with 1000+ iterations)

