# Bugfix Requirements Document

## Introduction

The "Get Overall Advice" feature fails when users attempt to generate comprehensive financial advice for their interested government schemes. The feature displays a loading dialog "Generating comprehensive financial plan..." but then fails with the error message "Error: Failed to generate financial advice". 

Investigation reveals that the backend service makes API calls to Groq's LLM service using the model 'llama-3.3-70b-versatile', but receives 401 Unauthorized responses. Error logs indicate that the GROQ_API_KEY environment variable exists but is invalid or expired, preventing successful API authentication. This bug completely blocks users from accessing AI-generated financial guidance on government schemes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks the "Get Overall Advice" button for their interested schemes THEN the system displays a loading dialog but subsequently fails with "Error: Failed to generate financial advice"

1.2 WHEN the backend financial-advice-service attempts to call the Groq API with the configured GROQ_API_KEY THEN the Groq API returns a 401 Unauthorized error with message "Invalid API Key"

1.3 WHEN the Groq API returns a 401 error THEN the backend logs the error and throws "Failed to generate financial advice: Groq API error: 401 - {error details}"

1.4 WHEN the API call fails THEN the frontend receives a 500 Internal Server Error response with error message "Failed to generate financial advice"

### Expected Behavior (Correct)

2.1 WHEN a user clicks the "Get Overall Advice" button for their interested schemes THEN the system SHALL successfully authenticate with the Groq API and generate comprehensive financial advice

2.2 WHEN the backend financial-advice-service attempts to call the Groq API with a valid GROQ_API_KEY THEN the Groq API SHALL return a 200 OK response with the generated financial advice content

2.3 WHEN the Groq API successfully processes the request THEN the backend SHALL parse the response and return structured financial advice including overall advice, key points, utilization tips, and potential impact

2.4 WHEN the API call succeeds THEN the frontend SHALL display the financial advice in a dialog with properly formatted sections for the user to review

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the financial advice service builds the prompt with scheme details and user profile THEN the system SHALL CONTINUE TO include all relevant information (scheme name, description, benefits, user age, occupation, income range) in the prompt

3.2 WHEN the financial advice service receives a valid JSON response from the Groq API THEN the system SHALL CONTINUE TO parse it correctly and extract advice, key_points, utilization_tips, and potential_impact fields

3.3 WHEN the financial advice service fails to parse the JSON response THEN the system SHALL CONTINUE TO provide a fallback response with generic advice rather than crashing

3.4 WHEN users mark schemes as interested or remove them from their list THEN the system SHALL CONTINUE TO function correctly without being affected by the financial advice feature fix

3.5 WHEN the financial advice endpoint receives a request without a scheme_name THEN the system SHALL CONTINUE TO return a 400 Bad Request error with appropriate error message

3.6 WHEN the financial advice service logs API interactions THEN the system SHALL CONTINUE TO log request details, success/failure status, and error information for debugging purposes
