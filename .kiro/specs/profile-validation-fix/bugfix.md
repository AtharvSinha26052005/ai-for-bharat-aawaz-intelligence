# Bugfix Requirements Document

## Introduction

The profile creation endpoint returns a 400 Bad Request error with "Validation failed" message when users submit the "Create Profile" form with apparently valid data. This prevents users from creating their profiles and accessing personalized scheme recommendations. The bug occurs despite all required form fields being filled with valid values, indicating a mismatch between the frontend data format and backend validation expectations.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the profile creation form with all required fields filled (age: 21, income range: "₹1-3 Lakhs", occupation: "farmer", state: "Jharkhand", district: "East Singhbhum", preferred mode: "Both") THEN the system returns a 400 Bad Request error with "Validation failed" message

1.2 WHEN a user submits the profile creation form with ANY combination of valid data THEN the system consistently returns a 400 Bad Request error, indicating a systematic validation issue affecting all profile creation attempts

1.3 WHEN the backend validation fails THEN the system does not provide specific details about which field(s) failed validation in the user-facing error message

1.4 WHEN the validation error occurs THEN the browser console shows "Failed to load resource: the server responded with a status of 400 (Bad Request)" without detailed validation error information

1.5 WHEN optional location fields (block, village, pincode) are left empty in the form THEN the frontend may send these as empty strings or undefined values, potentially causing validation failures if the backend schema doesn't properly handle empty strings for optional fields with pattern constraints

### Expected Behavior (Correct)

2.1 WHEN a user submits the profile creation form with all required fields filled with valid data THEN the system SHALL successfully create the profile and return a 201 Created response with the profile data

2.2 WHEN optional fields (block, village, pincode) are left empty THEN the system SHALL accept the submission and either omit these fields or handle empty strings gracefully without validation errors

2.3 WHEN the pincode field is left empty THEN the system SHALL NOT apply the 6-digit pattern validation constraint, as the field is optional

2.4 WHEN backend validation fails THEN the system SHALL return a 400 Bad Request response with specific details about which field(s) failed validation and why

2.5 WHEN the validation error response is received by the frontend THEN the system SHALL display the specific validation error details to the user in a clear, actionable format

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits invalid data (e.g., age outside 1-120 range, invalid income range value, missing required fields) THEN the system SHALL CONTINUE TO reject the request with appropriate validation errors

3.2 WHEN a user successfully creates a profile with valid data THEN the system SHALL CONTINUE TO encrypt sensitive data (phone number), generate a UUID for userId, store the profile in the database, and log the audit trail

3.3 WHEN validation passes for all fields THEN the system SHALL CONTINUE TO apply the Joi schema validation rules correctly for all data types and constraints

3.4 WHEN a profile is created successfully THEN the system SHALL CONTINUE TO return the complete profile object including userId, allowing the frontend to store it for subsequent API calls
