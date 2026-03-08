# Semantic Search Services

This directory contains services for semantic search and AI-powered scheme recommendations.

## Overview

The semantic search system uses vector embeddings and LLM-based reasoning to match users with relevant government schemes based on their profiles.

## Services

### EmbeddingGeneratorService

Generates 384-dimensional vector embeddings from user profiles using the `all-MiniLM-L6-v2` sentence-transformers model.

**Key Features:**
- Converts user profiles to natural language text
- Generates embeddings via Hugging Face Inference API
- Includes retry logic with exponential backoff
- Validates embedding dimensions (384)
- Comprehensive error handling

**Usage:**

```typescript
import { embeddingGeneratorService } from './services/semantic/embedding-generator';

const profile = {
  age: 35,
  income: 250000,
  gender: 'Female',
  caste: 'OBC',
  state: 'Maharashtra',
};

const result = await embeddingGeneratorService.generateProfileEmbedding(profile);
console.log(result.vector); // 384-dimensional array
```

**Profile Text Format:**

The service formats profiles as natural language:
```
A female person aged 35 years, with an annual income of ₹2,50,000 (₹1-3 lakhs), 
belonging to OBC category, residing in Maharashtra, seeking government schemes and benefits.
```

**Error Handling:**

- `EMBEDDING_API_TIMEOUT`: Request timed out (10s timeout)
- `EMBEDDING_MODEL_LOADING`: Model is loading on Hugging Face (503 error)
- `EMBEDDING_DIMENSION_MISMATCH`: Unexpected embedding dimensions
- `EMBEDDING_GENERATION_FAILED`: General failure

**Configuration:**

Environment variables:
- `EMBEDDING_MODEL`: Model name (default: `all-MiniLM-L6-v2`)

### VectorStoreService

Manages Pinecone vector database operations for semantic search of government schemes.

**Key Features:**
- Queries Pinecone index "scheme-index" for similar vectors
- Connection pooling with lazy initialization
- Timeout handling (10s timeout)
- Retry logic with exponential backoff
- Validates vector dimensions (384)
- Returns top K most similar schemes with metadata

**Usage:**

```typescript
import { vectorStoreService } from './services/semantic/vector-store';

// Search for similar schemes
const queryVector = [0.1, 0.2, ...]; // 384-dimensional embedding
const results = await vectorStoreService.search(queryVector, 10);

results.forEach(result => {
  console.log(`Scheme: ${result.metadata.name}`);
  console.log(`Score: ${result.score}`);
  console.log(`Ministry: ${result.metadata.ministry}`);
});

// Get index statistics
const stats = await vectorStoreService.getIndexStats();
console.log(`Total schemes: ${stats.vectorCount}`);
console.log(`Dimensions: ${stats.dimension}`);
```

**Search Results:**

Each result contains:
- `id`: Scheme identifier
- `score`: Similarity score (0-1, higher is better)
- `metadata`: Scheme information
  - `scheme_id`: Unique scheme ID
  - `name`: Scheme name
  - `slug`: URL-friendly slug
  - `ministry`: Ministry name
  - `category`: Scheme category (optional)
  - `level`: central/state (optional)
  - `state`: State name (optional)

**Error Handling:**

- `PINECONE_CONNECTION_FAILED`: Failed to connect to Pinecone
- `PINECONE_QUERY_TIMEOUT`: Query timed out (10s timeout)
- `PINECONE_DIMENSION_MISMATCH`: Vector dimensions don't match index
- `PINECONE_QUERY_FAILED`: General query failure
- `PINECONE_STATS_FAILED`: Failed to retrieve index statistics

**Configuration:**

Environment variables:
- `PINECONE_API_KEY`: Pinecone API key (required)
- `PINECONE_INDEX_NAME`: Index name (default: `scheme-index`)

## Testing

### Unit Tests
```bash
npm test -- src/services/semantic/embedding-generator.test.ts
npm test -- src/services/semantic/vector-store.test.ts
```

### Integration Tests (with real API calls)
```bash
npm test -- src/services/semantic/embedding-generator.integration.test.ts --testNamePattern="Integration"
npm test -- src/services/semantic/vector-store.integration.test.ts --testNamePattern="Integration"
```

## Architecture

```
User Profile → formatProfileText() → Natural Language Text
                                    ↓
                            Hugging Face API
                                    ↓
                            384-dim Embedding Vector
                                    ↓
                            VectorStoreService
                                    ↓
                            Pinecone Vector Search
                                    ↓
                            Top K Similar Schemes
```

**Complete Flow:**
1. User profile is formatted as natural language text
2. EmbeddingGeneratorService generates 384-dim vector
3. VectorStoreService queries Pinecone index
4. Pinecone returns top K most similar scheme vectors
5. Results include similarity scores and scheme metadata

## Model Information

**Model:** `all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Max Sequence Length:** 256 tokens
- **Performance:** ~14ms inference time
- **Use Case:** Semantic similarity search

This model was chosen because:
1. It matches the embeddings already stored in Pinecone (from Phase 1)
2. Fast inference time suitable for real-time search
3. Good balance between quality and performance
4. Free to use via Hugging Face Inference API

## Future Enhancements

- [ ] Add caching layer for profile embeddings (Redis)
- [ ] Support batch embedding generation
- [ ] Add alternative embedding providers (OpenAI, Cohere)
- [ ] Implement embedding quality metrics


### LLMRankerService

Uses Groq API with LLaMA 3.3 70B to analyze scheme eligibility and provide intelligent reasoning.

**Key Features:**
- Analyzes user eligibility for government schemes using LLM
- Provides confidence scores (0-1) and detailed reasoning
- Batch processing with concurrency control (max 10 concurrent requests)
- Structured JSON response parsing with fallback handling
- Retry logic with exponential backoff
- Graceful error handling with fallback responses

**Usage:**

```typescript
import { llmRankerService } from './services/semantic/llm-ranker';

const profile = {
  age: 30,
  income: 250000,
  gender: 'Female',
  caste: 'SC',
  state: 'Karnataka',
};

const scheme = {
  id: 'scheme-1',
  score: 0.88,
  metadata: {
    scheme_id: 'scheme-1',
    name: 'Post Matric Scholarship for SC Students',
    slug: 'post-matric-scholarship-sc',
    ministry: 'Ministry of Social Justice and Empowerment',
    category: 'education',
    level: 'central',
  },
};

// Analyze single scheme
const analysis = await llmRankerService.analyzeEligibility(profile, scheme);
console.log(analysis);
// {
//   eligible: true,
//   confidence: 0.8,
//   reasoning: "User belongs to SC category and scheme is for SC students..."
// }

// Batch analyze multiple schemes
const schemes = [scheme1, scheme2, scheme3];
const rankedSchemes = await llmRankerService.batchAnalyze(profile, schemes);
// Returns only eligible schemes, sorted by confidence (descending)
```

**Eligibility Analysis Response:**

Each analysis contains:
- `eligible`: Boolean indicating if user is eligible
- `confidence`: Number (0-1) indicating confidence level
- `reasoning`: String explaining the eligibility determination

**Ranked Scheme Response:**

Each ranked scheme contains:
- `schemeId`: Scheme identifier
- `name`: Scheme name
- `slug`: URL-friendly slug
- `similarityScore`: Vector similarity score from Pinecone
- `eligibility`: Eligibility analysis object
- `metadata`: Scheme metadata (ministry, category, level, state)

**Prompt Template:**

The service builds prompts with:
- User profile (age, gender, income, caste, state)
- Scheme information (name, ministry, category, level)
- Request for structured JSON response

**Error Handling:**

- `GROQ_API_ERROR`: API call failed
- `GROQ_API_TIMEOUT`: Request timed out (10s timeout)
- Fallback response on errors:
  ```json
  {
    "eligible": false,
    "confidence": 0.1,
    "reasoning": "Unable to analyze eligibility due to service error..."
  }
  ```

**Configuration:**

Environment variables:
- `GROQ_API_KEY`: Groq API key (required)
- `GROQ_MODEL`: Model name (default: `llama-3.3-70b-versatile`)

**Performance:**

- Single analysis: ~300-500ms per scheme
- Batch analysis: Processes 10 schemes concurrently (~1-2s for 10 schemes)
- Concurrency limit: 10 concurrent requests

**Model Information:**

**Model:** `llama-3.3-70b-versatile`
- **Context Window:** 131,072 tokens
- **Max Completion:** 32,768 tokens
- **Temperature:** 0.1 (deterministic)
- **Max Tokens:** 500
- **Speed:** 280 tokens/second

This model was chosen because:
1. High-quality reasoning capabilities for eligibility analysis
2. Fast inference speed via Groq's LPU architecture
3. Large context window for detailed scheme information
4. Cost-effective pricing ($0.59 input / $0.79 output per 1M tokens)

## Complete Semantic Search Flow

```
User Profile → EmbeddingGeneratorService → 384-dim Vector
                                              ↓
                                    VectorStoreService (Pinecone)
                                              ↓
                                    Top 10 Similar Schemes
                                              ↓
                                    LLMRankerService (Groq)
                                              ↓
                                    Eligible Schemes with Reasoning
```

**End-to-End Flow:**
1. User profile is formatted as natural language text
2. EmbeddingGeneratorService generates 384-dim vector
3. VectorStoreService queries Pinecone for top 10 similar schemes
4. LLMRankerService analyzes each scheme for eligibility
5. Results are filtered to eligible schemes only
6. Schemes are ranked by confidence score (descending)
7. Top 5-10 schemes returned with reasoning

## Testing

### Unit Tests
```bash
npm test -- src/services/semantic/embedding-generator.test.ts
npm test -- src/services/semantic/vector-store.test.ts
npm test -- src/services/semantic/llm-ranker.test.ts
```

### Integration Tests (with real API calls)
```bash
npm test -- src/services/semantic/embedding-generator.integration.test.ts
npm test -- src/services/semantic/vector-store.integration.test.ts
npm test -- src/services/semantic/llm-ranker.integration.test.ts
```

**Note:** Integration tests require valid API keys in `.env` file.

## Future Enhancements

- [ ] Add caching layer for profile embeddings (Redis)
- [ ] Add caching for LLM eligibility analysis results
- [ ] Support batch embedding generation
- [ ] Add alternative embedding providers (OpenAI, Cohere)
- [ ] Implement embedding quality metrics
- [ ] Add A/B testing for different LLM prompts
- [ ] Implement telemetry and performance monitoring
- [ ] Add support for multiple LLM providers (OpenAI, Anthropic)
