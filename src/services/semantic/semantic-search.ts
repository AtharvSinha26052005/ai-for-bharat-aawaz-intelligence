import { SemanticSearchProfile } from '../../types';
import { embeddingGeneratorService } from './embedding-generator';
import { vectorStoreService } from './vector-store';
import { llmRankerService } from './llm-ranker';
import { eligibilityFilterService } from './eligibility-filter';
import logger from '../../utils/logger';
import { BadRequestError, ExternalServiceError } from '../../utils/errors';
import { redis } from '../../db/redis';
import crypto from 'crypto';

/**
 * Scheme recommendation result (matches frontend PersonalizedScheme interface)
 */
export interface SchemeRecommendation {
  schemeId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  level?: string;
  ministry: string;
  state?: string;
  similarityScore: number;
  confidence: number; // 0-1 scale for frontend compatibility
  reasoning: string;
  estimatedBenefit?: number;
  // New fields from production-level Groq response
  eligibility_score?: number; // 0-100
  benefits_summary?: string;
  eligibility_analysis?: string;
  detailed_report?: string;
}

/**
 * Semantic search request
 */
export interface SemanticSearchRequest {
  age: number;
  income: number;
  caste: string;
  gender: string;
  state: string;
}

/**
 * Main orchestration service for semantic scheme search
 * Coordinates embedding generation, vector search, eligibility filtering, and LLM-based analysis
 * 
 * Improved Pipeline:
 * 1. User Profile → Eligibility Signals
 * 2. Profile → Embedding (384-dim)
 * 3. Embedding → Pinecone Search (Top 20 schemes)
 * 4. Top 20 → Eligibility Signal Filter → Top 10 schemes
 * 5. Top 10 → Groq LLM Reasoning → Top 5 schemes
 * 6. Return ranked schemes with detailed analysis
 */
export class SemanticSearchService {
  constructor() {
    logger.info('SemanticSearchService initialized');
  }

  /**
   * Perform semantic search for government schemes based on user profile
   * @param request - User profile for semantic search
   * @returns Top 5 eligible schemes with detailed reasoning
   */
  async search(request: SemanticSearchRequest): Promise<SchemeRecommendation[]> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      logger.info('Starting semantic search', {
        age: request.age,
        state: request.state,
        gender: request.gender,
      });

      // Generate cache key from profile
      const cacheKey = this.generateCacheKey(request);

      // Check cache first
      const cachedResults = await this.getCachedResults(cacheKey);
      if (cachedResults) {
        const duration = Date.now() - startTime;
        logger.info('Returning cached results', {
          recommendationsCount: cachedResults.length,
          duration,
        });
        return cachedResults;
      }

      // Step 1: Convert request to SemanticSearchProfile
      const profile: SemanticSearchProfile = {
        age: request.age,
        income: request.income,
        gender: request.gender as 'Male' | 'Female' | 'Other',
        caste: request.caste as 'General' | 'OBC' | 'SC' | 'ST' | 'Other',
        state: request.state,
      };

      // Step 2: Generate profile embedding
      logger.info('Generating profile embedding');
      const embeddingResult = await embeddingGeneratorService.generateProfileEmbedding(profile);

      // Step 3: Query Pinecone for top 20 similar schemes (increased from 10)
      logger.info('Querying vector store for similar schemes');
      const similarSchemes = await vectorStoreService.search(embeddingResult.vector, 20);

      if (similarSchemes.length === 0) {
        logger.warn('No similar schemes found in vector store');
        return [];
      }

      logger.info('Found similar schemes', {
        count: similarSchemes.length,
        topScore: similarSchemes[0]?.score,
      });

      // Step 4: Apply eligibility signal filtering (NEW!)
      logger.info('Applying eligibility signal filtering');
      const filteredSchemes = eligibilityFilterService.filterSchemes(similarSchemes, profile);

      if (filteredSchemes.length === 0) {
        logger.warn('No schemes passed eligibility filtering');
        return [];
      }

      logger.info('Eligibility filtering complete', {
        originalCount: similarSchemes.length,
        filteredCount: filteredSchemes.length,
      });

      // Step 5: Take top 10 filtered schemes for LLM analysis
      const topFilteredSchemes = filteredSchemes.slice(0, 10);

      // Step 6: Analyze eligibility using LLM (batch processing)
      logger.info('Analyzing eligibility with LLM');
      const rankedSchemes = await llmRankerService.batchAnalyze(profile, topFilteredSchemes);

      if (rankedSchemes.length === 0) {
        logger.warn('LLM analysis returned no eligible schemes');
        return [];
      }

      logger.info('Eligibility analysis complete', {
        totalAnalyzed: topFilteredSchemes.length,
        ranked: rankedSchemes.length,
      });

      // Step 7: Transform to SchemeRecommendation format (top 5 already from LLM)
      const recommendations: SchemeRecommendation[] = rankedSchemes.map((scheme) => ({
        schemeId: scheme.schemeId,
        name: scheme.name,
        slug: scheme.slug,
        ministry: scheme.ministry,
        similarityScore: scheme.similarityScore,
        // Convert eligibility_score (0-100) to confidence (0-1) for frontend compatibility
        confidence: scheme.eligibility_score / 100,
        reasoning: scheme.reason,
        // Include all new fields from production-level response
        eligibility_score: scheme.eligibility_score,
        benefits_summary: scheme.benefits_summary,
        eligibility_analysis: scheme.eligibility_analysis,
        detailed_report: scheme.detailed_report,
      }));

      // Cache the results
      await this.cacheResults(cacheKey, recommendations);

      const duration = Date.now() - startTime;
      logger.info('Semantic search completed successfully', {
        recommendationsCount: recommendations.length,
        duration,
      });

      return recommendations;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Re-throw known errors
      if (error instanceof BadRequestError || error instanceof ExternalServiceError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ExternalServiceError(
        'Failed to perform semantic search',
        'SEMANTIC_SEARCH_FAILED'
      );
    }
  }

  /**
   * Validate semantic search request
   * @param request - Request to validate
   * @throws BadRequestError if validation fails
   */
  private validateRequest(request: SemanticSearchRequest): void {
    const errors: string[] = [];

    // Validate age
    if (typeof request.age !== 'number' || request.age < 0 || request.age > 120) {
      errors.push('Age must be a number between 0 and 120');
    }

    // Validate income
    if (typeof request.income !== 'number' || request.income < 0) {
      errors.push('Income must be a non-negative number');
    }

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(request.gender)) {
      errors.push(`Gender must be one of: ${validGenders.join(', ')}`);
    }

    // Validate caste
    const validCastes = ['General', 'OBC', 'SC', 'ST', 'Other'];
    if (!validCastes.includes(request.caste)) {
      errors.push(`Caste must be one of: ${validCastes.join(', ')}`);
    }

    // Validate state
    if (!request.state || typeof request.state !== 'string' || request.state.trim().length === 0) {
      errors.push('State is required and must be a non-empty string');
    }

    if (errors.length > 0) {
      throw new BadRequestError(
        `Invalid search request: ${errors.join('; ')}`,
        'INVALID_SEARCH_REQUEST'
      );
    }
  }

  /**
   * Generate cache key from user profile using SHA-256 hash
   * @param request - User profile request
   * @returns Cache key string
   */
  private generateCacheKey(request: SemanticSearchRequest): string {
    // Create a deterministic string from profile attributes
    const profileString = JSON.stringify({
      age: request.age,
      income: request.income,
      caste: request.caste,
      gender: request.gender,
      state: request.state,
    });

    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(profileString).digest('hex');

    // Return cache key with prefix
    return `search:results:${hash}`;
  }

  /**
   * Retrieve cached search results from Redis
   * @param cacheKey - Cache key to lookup
   * @returns Cached recommendations or null if not found
   */
  private async getCachedResults(cacheKey: string): Promise<SchemeRecommendation[] | null> {
    try {
      const cached = await redis.get(cacheKey);

      if (!cached) {
        logger.debug('Cache miss', { cacheKey });
        return null;
      }

      logger.info('Cache hit', { cacheKey });
      const recommendations = JSON.parse(cached) as SchemeRecommendation[];
      return recommendations;
    } catch (error) {
      logger.warn('Failed to retrieve cached results', {
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return null on cache errors to fall back to normal search
      return null;
    }
  }

  /**
   * Store search results in Redis cache with 1-hour TTL
   * @param cacheKey - Cache key to store under
   * @param results - Recommendations to cache
   */
  private async cacheResults(cacheKey: string, results: SchemeRecommendation[]): Promise<void> {
    try {
      const TTL_SECONDS = 3600; // 1 hour
      await redis.set(cacheKey, JSON.stringify(results), TTL_SECONDS);
      logger.info('Results cached successfully', { cacheKey, count: results.length });
    } catch (error) {
      logger.warn('Failed to cache results', {
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - caching failure shouldn't break the search
    }
  }
}

// Export singleton instance
export const semanticSearchService = new SemanticSearchService();
