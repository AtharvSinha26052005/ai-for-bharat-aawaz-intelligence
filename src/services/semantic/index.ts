/**
 * Semantic Search Services
 * 
 * This module provides AI-powered semantic search capabilities for government schemes.
 * It combines vector embeddings, similarity search, and LLM-based eligibility analysis
 * to provide personalized scheme recommendations.
 */

export { EmbeddingGeneratorService, embeddingGeneratorService } from './embedding-generator';
export type { EmbeddingResult } from './embedding-generator';

export { VectorStoreService, vectorStoreService } from './vector-store';
export type { VectorMetadata, SearchResult } from './vector-store';

export { LLMRankerService, llmRankerService } from './llm-ranker';
export type { EligibilityAnalysis, RankedScheme } from './llm-ranker';

export { SemanticSearchService, semanticSearchService } from './semantic-search';
export type { SchemeRecommendation, SemanticSearchRequest } from './semantic-search';
