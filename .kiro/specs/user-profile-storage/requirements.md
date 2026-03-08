# Requirements Document

## Introduction

This feature enables the backend system to persist user profile form data in a PostgreSQL database. The system provides RESTful API endpoints for creating and retrieving user profiles, which will later be used for scheme eligibility analysis via Groq LLM integration.

## Glossary

- **Profile_API**: The RESTful API service that handles HTTP requests for user profile operations
- **Profile_Store**: The PostgreSQL database persistence layer that manages user profile data
- **Profile_Validator**: The component that validates incoming profile data against schema requirements
- **Profile_ID_Generator**: The component that generates unique UUID identifiers for profiles
- **User_Profile**: A data structure containing demographic and contact information for a user
- **Client_Application**: The React frontend application that submits profile data

## Requirements

### Requirement 1: Database Schema Creation

**User Story:** As a backend developer, I want a PostgreSQL table to store user profiles, so that profile data persists reliably in the database.

#### Acceptance Criteria

1. THE Profile_Store SHALL create a table named "user_profiles" with columns: id (UUID primary key), age (integer), income_range (text), phone_number (text), aadhar_number (text), gender (text), caste (text), occupation (text), state (text), district (text), block (text), village (text), pincode (text), preferred_mode (text), created_at (timestamp with time zone)
2. THE Profile_Store SHALL set the id column as the primary key with UUID data type
3. THE Profile_Store SHALL set the created_at column to automatically populate with the current timestamp when a record is inserted
4. THE Profile_Store SHALL enforce NOT NULL constraints on the id and created_at columns

### Requirement 2: Profile Creation Endpoint

**User Story:** As a frontend developer, I want to submit profile data via API, so that user information is saved to the database.

#### Acceptance Criteria

1. THE Profile_API SHALL expose a POST endpoint at "/api/v1/profiles"
2. WHEN the Profile_API receives a POST request to "/api/v1/profiles", THE Profile_Validator SHALL validate that the request body contains valid profile data
3. WHEN profile data is valid, THE Profile_ID_Generator SHALL generate a unique UUID for the profile
4. WHEN a UUID is generated, THE Profile_Store SHALL insert the profile data with the generated UUID into the user_profiles table
5. WHEN the insert operation succeeds, THE Profile_API SHALL return a JSON response with status code 201 containing the profile_id
6. IF the request body is missing required fields, THEN THE Profile_API SHALL return a JSON error response with status code 400 and a descriptive error message
7. IF the database insert operation fails, THEN THE Profile_API SHALL return a JSON error response with status code 500 and a descriptive error message

### Requirement 3: Profile Retrieval Endpoint

**User Story:** As a frontend developer, I want to retrieve profile data by ID, so that I can display or process existing user profiles.

#### Acceptance Criteria

1. THE Profile_API SHALL expose a GET endpoint at "/api/v1/profiles/:profile_id"
2. WHEN the Profile_API receives a GET request to "/api/v1/profiles/:profile_id", THE Profile_Validator SHALL validate that the profile_id parameter is a valid UUID format
3. WHEN the profile_id is valid, THE Profile_Store SHALL query the user_profiles table for a record matching the profile_id
4. WHEN a matching profile is found, THE Profile_API SHALL return a JSON response with status code 200 containing all profile fields
5. IF the profile_id format is invalid, THEN THE Profile_API SHALL return a JSON error response with status code 400 and a descriptive error message
6. IF no profile matches the profile_id, THEN THE Profile_API SHALL return a JSON error response with status code 404 and a descriptive error message
7. IF the database query operation fails, THEN THE Profile_API SHALL return a JSON error response with status code 500 and a descriptive error message

### Requirement 4: Data Type Validation

**User Story:** As a backend developer, I want to validate incoming profile data types, so that only correctly formatted data is stored in the database.

#### Acceptance Criteria

1. WHEN the Profile_Validator receives profile data, THE Profile_Validator SHALL verify that age is a positive integer
2. WHEN the Profile_Validator receives profile data, THE Profile_Validator SHALL verify that all text fields (income_range, phone_number, aadhar_number, gender, caste, occupation, state, district, block, village, pincode, preferred_mode) are strings
3. IF any field fails type validation, THEN THE Profile_Validator SHALL return a validation error indicating which field is invalid and the expected type

### Requirement 5: Database Connection Management

**User Story:** As a backend developer, I want reliable database connections, so that profile operations execute consistently.

#### Acceptance Criteria

1. THE Profile_Store SHALL establish a connection pool to the PostgreSQL database using the configured connection string
2. WHEN a profile operation is requested, THE Profile_Store SHALL acquire a connection from the pool
3. WHEN a profile operation completes, THE Profile_Store SHALL release the connection back to the pool
4. IF the database connection pool is exhausted, THEN THE Profile_Store SHALL queue the operation until a connection becomes available within 30 seconds
5. IF a connection cannot be acquired within 30 seconds, THEN THE Profile_Store SHALL return a timeout error

### Requirement 6: Response Format Consistency

**User Story:** As a frontend developer, I want consistent API response formats, so that I can reliably parse responses.

#### Acceptance Criteria

1. WHEN the Profile_API returns a successful response, THE Profile_API SHALL format the response as JSON with a "data" field containing the result
2. WHEN the Profile_API returns an error response, THE Profile_API SHALL format the response as JSON with an "error" field containing a message string
3. THE Profile_API SHALL set the Content-Type header to "application/json" for all responses
4. WHEN the Profile_API creates a profile, THE Profile_API SHALL return a response body containing at minimum: {"data": {"profile_id": "<uuid>"}}
5. WHEN the Profile_API retrieves a profile, THE Profile_API SHALL return a response body containing: {"data": {"id": "<uuid>", "age": <number>, ...all profile fields}}

### Requirement 7: CORS Configuration

**User Story:** As a frontend developer, I want the API to accept requests from the React application, so that the browser allows cross-origin requests.

#### Acceptance Criteria

1. THE Profile_API SHALL include CORS headers in responses to allow requests from the Client_Application origin
2. WHEN the Profile_API receives a preflight OPTIONS request, THE Profile_API SHALL respond with status code 200 and appropriate CORS headers
3. THE Profile_API SHALL include the Access-Control-Allow-Methods header with values "GET, POST, OPTIONS"
4. THE Profile_API SHALL include the Access-Control-Allow-Headers header with value "Content-Type"
