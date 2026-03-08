# Implementation Plan: User Profile Storage

## Overview

This implementation plan creates a RESTful API for persisting user profile data in PostgreSQL. The system follows a layered architecture with route handlers, validators, service layer, and repository layer. Implementation proceeds incrementally from database schema through API endpoints, with property-based tests validating correctness properties at each stage.

## Tasks

- [-] 1. Set up database schema and connection infrastructure
  - [x] 1.1 Create database migration for user_profiles table
    - Write SQL migration file with table definition, constraints, and indexes
    - Include id (UUID primary key), age (integer with CHECK > 0), all text fields, created_at (TIMESTAMPTZ with DEFAULT NOW())
    - Add indexes on created_at and (state, district)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 1.2 Write property test for NOT NULL constraint enforcement
    - **Property 3: NOT NULL Constraint Enforcement**
    - **Validates: Requirements 1.4**
    - Test direct database insert without id or created_at fails with constraint violation
    - _Requirements: 1.4_

- [x] 2. Implement data models and TypeScript interfaces
  - [x] 2.1 Create TypeScript type definitions for profile data
    - Define ProfileCreateRequest, ProfileCreateResponse, ProfileData interfaces
    - Define SuccessResponse<T> and ErrorResponse wrapper types
    - _Requirements: 2.2, 3.4, 6.4, 6.5_

- [ ] 3. Implement validation layer
  - [ ] 3.1 Create profile validator with Joi schemas
    - Implement ProfileCreateRequest validation schema (age > 0, all required fields as strings)
    - Implement UUID format validation function
    - Export validation functions for use in routes
    - _Requirements: 2.2, 3.2, 4.1, 4.2, 4.3_
  
  - [ ]* 3.2 Write property test for invalid input rejection
    - **Property 5: Invalid Input Rejection**
    - **Validates: Requirements 2.2, 2.6, 4.1, 4.2, 4.3**
    - Generate random invalid profile data and verify 400 responses with error field
    - _Requirements: 2.2, 2.6, 4.1, 4.2, 4.3_
  
  - [ ]* 3.3 Write property test for invalid UUID format rejection
    - **Property 6: Invalid UUID Format Rejection**
    - **Validates: Requirements 3.2, 3.5**
    - Generate random invalid UUID strings and verify 400 responses
    - _Requirements: 3.2, 3.5_

- [ ] 4. Implement repository layer (Profile_Store)
  - [ ] 4.1 Create ProfileStorageRepository class
    - Implement insert() method with parameterized SQL query
    - Implement findById() method with parameterized SQL query
    - Use connection pool from existing db/connection.ts
    - Handle connection acquisition and release properly
    - _Requirements: 2.4, 3.3, 5.1, 5.2, 5.3_
  
  - [ ] 4.2 Add connection timeout handling
    - Implement 30-second timeout for connection acquisition
    - Throw timeout error if connection unavailable within timeout
    - _Requirements: 5.4, 5.5_

- [ ] 5. Implement service layer (Profile_Service)
  - [ ] 5.1 Create ProfileStorageService class
    - Implement createProfile() method with UUID generation using uuid v4
    - Implement getProfileById() method
    - Orchestrate validation, repository calls, and error handling
    - _Requirements: 2.3, 2.4, 3.3_
  
  - [ ]* 5.2 Write property test for UUID generation and format
    - **Property 4: UUID Generation and Format**
    - **Validates: Requirements 2.3**
    - Verify generated profile_ids match UUID v4 format and are unique
    - _Requirements: 2.3_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement route layer (Profile_API)
  - [ ] 7.1 Create profile storage routes
    - Implement POST /api/v1/profiles endpoint with request validation
    - Implement GET /api/v1/profiles/:profile_id endpoint with UUID validation
    - Implement OPTIONS /api/v1/profiles for CORS preflight
    - Format responses with {data: ...} for success and {error: ...} for errors
    - Set appropriate HTTP status codes (201, 200, 400, 404, 500)
    - Set Content-Type: application/json for all responses
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 3.1, 3.4, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 7.2 Add CORS middleware configuration
    - Configure CORS headers: Access-Control-Allow-Methods (GET, POST, OPTIONS)
    - Configure CORS headers: Access-Control-Allow-Headers (Content-Type)
    - Handle preflight OPTIONS requests with 200 response
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 7.3 Write property test for successful response format
    - **Property 8: Successful Response Format**
    - **Validates: Requirements 2.5, 6.1, 6.3, 6.4**
    - Verify 201/200 status codes, Content-Type header, and {data: ...} structure
    - _Requirements: 2.5, 6.1, 6.3, 6.4_
  
  - [ ]* 7.4 Write property test for error response format
    - **Property 9: Error Response Format**
    - **Validates: Requirements 6.2, 6.3**
    - Verify Content-Type header and {error: ...} structure for all error types
    - _Requirements: 6.2, 6.3_
  
  - [ ]* 7.5 Write property test for CORS headers presence
    - **Property 10: CORS Headers Presence**
    - **Validates: Requirements 7.1, 7.3, 7.4**
    - Verify CORS headers present in all API responses
    - _Requirements: 7.1, 7.3, 7.4_

- [ ] 8. Implement error handling
  - [ ] 8.1 Create global error handler middleware
    - Handle validation errors (400), not found errors (404), server errors (500)
    - Format all errors as {error: "message"} with appropriate status codes
    - Log errors with appropriate levels (INFO for user errors, ERROR for server errors)
    - _Requirements: 2.6, 2.7, 3.5, 3.6, 3.7_

- [ ] 9. Implement end-to-end integration tests
  - [ ]* 9.1 Write property test for profile creation and retrieval round trip
    - **Property 1: Profile Creation and Retrieval Round Trip**
    - **Validates: Requirements 2.4, 3.3, 3.4, 6.5**
    - Generate random valid profiles, create via POST, retrieve via GET, verify all fields match
    - _Requirements: 2.4, 3.3, 3.4, 6.5_
  
  - [ ]* 9.2 Write property test for created timestamp auto-population
    - **Property 2: Created Timestamp Auto-Population**
    - **Validates: Requirements 1.3**
    - Verify created_at is automatically set and within 5 seconds of insertion time
    - _Requirements: 1.3_
  
  - [ ]* 9.3 Write property test for non-existent profile handling
    - **Property 7: Non-Existent Profile Handling**
    - **Validates: Requirements 3.6**
    - Generate random non-existent UUIDs and verify 404 responses
    - _Requirements: 3.6_
  
  - [ ]* 9.4 Write unit tests for edge cases
    - Test age boundary values (0, -1, very large numbers)
    - Test special characters and Unicode in text fields
    - Test very long strings for text fields
    - Test database error scenarios with mocks
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Wire components together and register routes
  - [ ] 10.1 Integrate profile storage routes into Express app
    - Import and register profile storage routes in main Express application
    - Ensure CORS middleware is applied before routes
    - Ensure error handler middleware is applied after routes
    - _Requirements: 2.1, 3.1, 7.1_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript with Express.js and PostgreSQL
- All property tests must include a comment referencing the design document property
- Database connection pooling is managed by existing infrastructure in src/db/connection.ts
