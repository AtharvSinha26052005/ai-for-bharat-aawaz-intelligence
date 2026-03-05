import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

export interface VectorDocument {
  id: string;
  values: number[];
  metadata: {
    schemeId?: string;
    schemeName?: string;
    content: string;
    language?: string;
    category?: string;
    lastUpdated?: string;
  };
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: any;
}

/**
 * Vector Database Client
 * Manages Pinecone vector database operations
 */
export class VectorDB {
  private client: Pinecone | null = null;
  private indexName: string;

  constructor() {
    this.indexName = config.pinecone.indexName;
  }

  /**
   * Initializes Pinecone client
   */
  async initialize(): Promise<void> {
    try {
      if (!config.pinecone.apiKey) {
        logger.warn('Pinecone API key not configured, using mock mode');
        return;
      }

      this.client = new Pinecone({
        apiKey: config.pinecone.apiKey,
      });

      logger.info('Pinecone client initialized');
    } catch (error) {
      logger.error('Failed to initialize Pinecone', { error });
      throw new ExternalServiceError('Vector database initialization failed');
    }
  }

  /**
   * Upserts vectors into the index
   * @param vectors - Array of vector documents
   */
  async upsert(vectors: VectorDocument[]): Promise<void> {
    try {
      if (!this.client) {
        logger.warn('Pinecone not initialized, skipping upsert');
        return;
      }

      const index = this.client.index(this.indexName);
      await index.upsert(vectors as any);

      logger.info('Vectors upserted', { count: vectors.length });
    } catch (error) {
      logger.error('Vector upsert failed', { error });
      throw new ExternalServiceError('Failed to store vectors');
    }
  }

  /**
   * Queries the vector database
   * @param queryVector - Query embedding vector
   * @param topK - Number of results to return
   * @param filter - Metadata filter
   * @returns Query results
   */
  async query(
    queryVector: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<QueryResult[]> {
    try {
      if (!this.client) {
        logger.warn('Pinecone not initialized, returning empty results');
        return [];
      }

      const index = this.client.index(this.indexName);
      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter,
      });

      return (queryResponse.matches || []).map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      }));
    } catch (error) {
      logger.error('Vector query failed', { error });
      throw new ExternalServiceError('Failed to query vectors');
    }
  }

  /**
   * Deletes vectors by IDs
   * @param ids - Array of vector IDs
   */
  async delete(ids: string[]): Promise<void> {
    try {
      if (!this.client) {
        logger.warn('Pinecone not initialized, skipping delete');
        return;
      }

      const index = this.client.index(this.indexName);
      await index.deleteMany(ids);

      logger.info('Vectors deleted', { count: ids.length });
    } catch (error) {
      logger.error('Vector deletion failed', { error });
      throw new ExternalServiceError('Failed to delete vectors');
    }
  }

  /**
   * Deletes all vectors matching a filter
   * @param filter - Metadata filter
   */
  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    try {
      if (!this.client) {
        logger.warn('Pinecone not initialized, skipping delete');
        return;
      }

      const index = this.client.index(this.indexName);
      await index.deleteMany(filter);

      logger.info('Vectors deleted by filter', { filter });
    } catch (error) {
      logger.error('Vector deletion by filter failed', { error });
      throw new ExternalServiceError('Failed to delete vectors');
    }
  }
}

export const vectorDB = new VectorDB();
