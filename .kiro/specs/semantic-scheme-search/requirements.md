# Requirements Document

## Introduction

This document specifies requirements for a semantic scheme search and recommendation system that enables users to discover government schemes through intelligent search and personalized recommendations. The system will load scheme data from a local JSON file, create vector embeddings for semantic search, store them in Pinecone vector database, and use Groq API for LLM-based reasoning to provide personalized scheme recommendations based on user profiles.

## Glossary

- **Scheme_Loader**: Component responsible for loading scheme data from myscheme_full_1000.json
- **Embedding_Generator**: Service that creates vector embeddings from scheme text data
- **Vector_Store**: Pinecone vector database that stores and retrieves scheme embeddings
- **Semantic_Search_Engine**: Component that performs similarity search using vector embeddings
- **LLM_Reasoner**: Service using Groq API to analyze eligibility and rank schemes
- **Schemes_Page**: Frontend page component that displays schemes to users
- **User_Profile**: Data structure containing user demographics (age, income, location, occupation)
- **Scheme_Record**: Data structure representing a government scheme with name, description, eligibility, benefits
- **Eligibility_Score**: Numerical value (0-1) indicating how well a user matches scheme criteria
- **Embedding_Vector**: High-dimensional numerical representation of scheme text content

## Requirements

### Requirement 1: Load and Display All Schemes

**User Story:** As a user visiting the Schemes page, I want to see all available government schemes by default, so that I can browse the complete catalog.

#### Acceptance Criteria

1. WHEN the Schemes_Page loads, THE Scheme_Loader SHALL read all schemes from myscheme_full_1000.json
2. THE Scheme_Loader SHALL parse the JSON file and convert each entry into a Scheme_Record
3. THE Schemes_Page SHALL display all 1000 schemes using the existing SchemeCardGrid component
4. IF the JSON file cannot be read, THEN THE Scheme_Loader SHALL return an error message to the user
5. THE Scheme_Record SHALL include name, slug, ministry, description, eligibility, benefits, eligibility_summary, and benefits_summary fields

### Requirement 2: Generate Scheme Embeddings

**User Story:** As a system administrator, I want scheme data to be converted into vector embeddings, so that semantic search can be performed.

#### Acceptance Criteria

1. THE Embedding_Generator SHALL create embeddings from the embedding_text field of each Scheme_Record
2. WHEN a Scheme_Record lacks an embedding_text field, THE Embedding_Generator SHALL concatenate name, description, eligibility_summary, and benefits_summary
3. THE Embedding_Generator SHALL use a text embedding model to convert text into Embedding_Vectors
4. THE Embedding_Vector SHALL have consistent dimensionality across all schemes
5. IF embedding generation fails for a scheme, THEN THE Embedding_Generator SHALL log the error and continue processing remaining schemes

### Requirement 3: Store Embeddings in Vector Database

**User Story:** As a developer, I want scheme embeddings stored in Pinecone, so that fast similarity search can be performed.

#### Acceptance Criteria

1. THE Vector_Store SHALL connect to Pinecone using API credentials
2. THE Vector_Store SHALL create or use an existing Pinecone index for scheme embeddings
3. WHEN storing an embedding, THE Vector_Store SHALL include the scheme slug as the vector ID
4. THE Vector_Store SHALL store scheme metadata (name, ministry, eligibility_summary, benefits_summary) alongside each vector
5. THE Vector_Store SHALL support batch upsert operations for efficient bulk loading
6. IF the Pinecone connection fails, THEN THE Vector_Store SHALL return a connection error

### Requirement 4: Perform Semantic Search

**User Story:** As a user, I want to search for schemes using natural language queries, so that I can find relevant schemes without knowing exact keywords.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE Semantic_Search_Engine SHALL convert the query into an Embedding_Vector
2. THE Semantic_Search_Engine SHALL query the Vector_Store for the top 20 most similar scheme vectors
3. THE Semantic_Search_Engine SHALL return Scheme_Records ranked by similarity score
4. THE similarity score SHALL be a value between 0 and 1, where 1 indicates perfect match
5. IF the search query is empty, THEN THE Semantic_Search_Engine SHALL return all schemes without ranking

### Requirement 5: Generate Personalized Recommendations

**User Story:** As a user with a profile, I want to receive personalized scheme recommendations, so that I can discover schemes I'm eligible for.

#### Acceptance Criteria

1. WHEN a User_Profile exists, THE Semantic_Search_Engine SHALL create a personalized query from profile data
2. THE personalized query SHALL include age, income range, occupation, and location state
3. THE Semantic_Search_Engine SHALL retrieve the top 50 candidate schemes using vector similarity
4. THE LLM_Reasoner SHALL analyze each candidate scheme against the User_Profile
5. THE LLM_Reasoner SHALL assign an Eligibility_Score to each scheme
6. THE LLM_Reasoner SHALL provide an explanation for the eligibility determination
7. THE Schemes_Page SHALL display schemes ranked by Eligibility_Score in descending order

### Requirement 6: LLM-Based Eligibility Analysis

**User Story:** As a user, I want to understand why I'm eligible or ineligible for schemes, so that I can make informed decisions.

#### Acceptance Criteria

1. THE LLM_Reasoner SHALL connect to Groq API using API credentials
2. WHEN analyzing eligibility, THE LLM_Reasoner SHALL send the User_Profile and scheme eligibility criteria to Groq
3. THE LLM_Reasoner SHALL request a structured response containing eligibility determination, confidence score, and explanation
4. THE Groq API response SHALL be parsed into an Eligibility_Score (0-1) and explanation text
5. IF the Groq API call fails, THEN THE LLM_Reasoner SHALL fall back to keyword-based matching with lower confidence
6. THE explanation SHALL be displayed to the user alongside the scheme information

### Requirement 7: Filter and Sort Schemes

**User Story:** As a user, I want to filter and sort schemes, so that I can narrow down results to my specific needs.

#### Acceptance Criteria

1. THE Schemes_Page SHALL use the existing FilterPanel component for filtering
2. THE FilterPanel SHALL support filtering by ministry, category, and eligibility criteria
3. THE Schemes_Page SHALL apply filters to the current result set (all schemes or search results)
4. THE Schemes_Page SHALL use the existing sort controls for sorting
5. THE sort options SHALL include relevance (default for search), name (A-Z), and estimated benefit
6. WHEN filters or sort order change, THE Schemes_Page SHALL update the displayed schemes without reloading

### Requirement 8: Handle Missing User Profile

**User Story:** As a user without a profile, I want to still access scheme search functionality, so that I can explore schemes before creating a profile.

#### Acceptance Criteria

1. WHEN no User_Profile exists, THE Schemes_Page SHALL display all schemes by default
2. THE Semantic_Search_Engine SHALL support generic search queries without personalization
3. THE Schemes_Page SHALL display a prompt encouraging users to create a profile for personalized recommendations
4. THE search and filter functionality SHALL work identically for users with and without profiles
5. THE only difference SHALL be the absence of personalized ranking and eligibility explanations

### Requirement 9: Cache Embeddings for Performance

**User Story:** As a system administrator, I want embeddings to be cached, so that the system performs efficiently without regenerating embeddings.

#### Acceptance Criteria

1. THE Embedding_Generator SHALL check if embeddings already exist in Vector_Store before generating new ones
2. WHEN the myscheme_full_1000.json file is modified, THE Embedding_Generator SHALL detect the change
3. THE Embedding_Generator SHALL regenerate embeddings only for modified or new schemes
4. THE Vector_Store SHALL support querying for existing vector IDs
5. THE system SHALL provide an admin endpoint to force full re-embedding if needed

### Requirement 10: API Endpoint for Scheme Retrieval

**User Story:** As a frontend developer, I want a REST API endpoint to retrieve schemes, so that the Schemes_Page can fetch data dynamically.

#### Acceptance Criteria

1. THE backend SHALL expose a GET /api/schemes endpoint
2. WHEN called without parameters, THE endpoint SHALL return all schemes
3. THE endpoint SHALL accept optional query parameters: search, userId, limit, offset
4. WHEN search parameter is provided, THE endpoint SHALL perform semantic search
5. WHEN userId parameter is provided, THE endpoint SHALL return personalized recommendations
6. THE endpoint SHALL return JSON with scheme data, eligibility scores, and explanations
7. THE endpoint SHALL support pagination using limit and offset parameters
8. IF an error occurs, THEN THE endpoint SHALL return appropriate HTTP status codes (400, 500)

### Requirement 11: Environment Configuration

**User Story:** As a developer, I want API credentials managed through environment variables, so that sensitive data is not hardcoded.

#### Acceptance Criteria

1. THE system SHALL read Pinecone API key from PINECONE_API_KEY environment variable
2. THE system SHALL read Groq API key from GROQ_API_KEY environment variable
3. THE system SHALL read embedding model name from EMBEDDING_MODEL environment variable with a default value
4. THE system SHALL read Pinecone index name from PINECONE_INDEX environment variable with a default value
5. IF required environment variables are missing, THEN THE system SHALL log an error and fail to start
6. THE system SHALL provide a .env.example file documenting all required variables

### Requirement 12: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error logging, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. THE system SHALL log all API calls to external services (Pinecone, Groq)
2. WHEN an error occurs, THE system SHALL log the error message, stack trace, and context
3. THE system SHALL distinguish between recoverable errors (fallback available) and critical errors
4. THE system SHALL return user-friendly error messages to the frontend
5. THE system SHALL not expose sensitive information (API keys, internal paths) in error messages
6. THE system SHALL log performance metrics for embedding generation and search operations

