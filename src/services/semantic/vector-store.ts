import { Pinecone } from '@pinecone-database/pinecone';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { retryWithBackoff } from '../../utils/retry';

/**
 * Metadata stored alongside each vector in Pinecone
 */
export interface VectorMetadata {
  scheme_id: string;
  name: string;
  slug: string;
  ministry: string;
  category?: string;
  level?: string;
  state?: string;
}

/**
 * Search result from Pinecone query
 */
export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Configuration for vector store
 */
interface VectorStoreConfig {
  apiKey: string;
  indexName: string;
  dimensions: number;
  timeout: number;
  maxRetries: number;
}

/**
 * Service for managing Pinecone vector database operations
 * Handles querying the scheme-index for semantic search
 */
export class VectorStoreService {
  private config: VectorStoreConfig;
  private pinecone: Pinecone | null = null;
  private indexCache: any = null;

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    this.config = {
      apiKey,
      indexName: process.env.PINECONE_INDEX_NAME || 'scheme-index',
      dimensions: 384, // all-MiniLM-L6-v2 produces 384-dimensional embeddings
      timeout: 10000, // 10 seconds
      maxRetries: 3,
    };

    logger.info('VectorStoreService initialized', {
      indexName: this.config.indexName,
      dimensions: this.config.dimensions,
    });
  }

  /**
   * Initialize connection to Pinecone
   * Uses lazy initialization pattern for connection pooling
   */
  private async initializeConnection(): Promise<void> {
    if (this.pinecone) {
      return; // Already initialized
    }

    try {
      logger.info('Initializing Pinecone connection');

      this.pinecone = new Pinecone({
        apiKey: this.config.apiKey,
      });

      // Get index reference (this doesn't make a network call)
      this.indexCache = this.pinecone.index(this.config.indexName);

      logger.info('Pinecone connection initialized successfully', {
        indexName: this.config.indexName,
      });
    } catch (error) {
      logger.error('Failed to initialize Pinecone connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Failed to connect to Pinecone vector database',
        'PINECONE_CONNECTION_FAILED'
      );
    }
  }

  /**
   * Search for similar vectors in Pinecone index
   * @param queryVector - Embedding vector to search with (384 dimensions)
   * @param topK - Number of top results to return (default: 10)
   * @returns Array of search results with scores and metadata
   */
  async search(queryVector: number[], topK: number = 10): Promise<SearchResult[]> {
    const startTime = Date.now();

    // Validate input (throw validation errors directly, not wrapped)
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Query vector must be a non-empty array');
    }

    if (queryVector.length !== this.config.dimensions) {
      throw new Error(
        `Query vector dimensions mismatch: expected ${this.config.dimensions}, got ${queryVector.length}`
      );
    }

    if (topK <= 0 || topK > 100) {
      throw new Error('topK must be between 1 and 100');
    }

    try {

      // Ensure connection is initialized
      await this.initializeConnection();

      if (!this.indexCache) {
        throw new Error('Index not initialized');
      }

      logger.info('Querying Pinecone index', {
        indexName: this.config.indexName,
        topK,
        vectorDimensions: queryVector.length,
      });

      // Query Pinecone with retry logic
      const queryResponse = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

          try {
            const response = await this.indexCache.query({
              vector: queryVector,
              topK,
              includeMetadata: true,
            });

            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        {
          maxAttempts: this.config.maxRetries,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
        }
      );

      // Transform results
      const results: SearchResult[] = (queryResponse.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as VectorMetadata,
      }));

      const duration = Date.now() - startTime;
      logger.info('Pinecone query completed successfully', {
        resultsCount: results.length,
        duration,
        topScore: results.length > 0 ? results[0].score : null,
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Pinecone query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        topK,
      });

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ExternalServiceError(
            'Pinecone query timed out',
            'PINECONE_QUERY_TIMEOUT'
          );
        }

        if (error.message.includes('dimensions')) {
          throw new ExternalServiceError(
            'Vector dimensions mismatch',
            'PINECONE_DIMENSION_MISMATCH'
          );
        }
      }

      throw new ExternalServiceError(
        'Failed to query Pinecone vector database',
        'PINECONE_QUERY_FAILED'
      );
    }
  }

  /**
   * Get statistics about the Pinecone index
   * @returns Index statistics including vector count and dimensions
   */
  async getIndexStats(): Promise<{ vectorCount: number; dimension: number }> {
    try {
      await this.initializeConnection();

      if (!this.indexCache) {
        throw new Error('Index not initialized');
      }

      logger.info('Fetching Pinecone index statistics');

      const stats = await this.indexCache.describeIndexStats();

      logger.info('Index statistics retrieved', {
        vectorCount: stats.totalRecordCount || 0,
        dimension: stats.dimension || this.config.dimensions,
      });

      return {
        vectorCount: stats.totalRecordCount || 0,
        dimension: stats.dimension || this.config.dimensions,
      };
    } catch (error) {
      logger.error('Failed to get index statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Failed to retrieve Pinecone index statistics',
        'PINECONE_STATS_FAILED'
      );
    }
  }

  /**
   * Close Pinecone connection (cleanup)
   * Note: Pinecone SDK v3+ handles connection pooling automatically
   */
  async close(): Promise<void> {
    logger.info('Closing Pinecone connection');
    this.pinecone = null;
    this.indexCache = null;
  }
}

// Export singleton instance
export const vectorStoreService = new VectorStoreService();
