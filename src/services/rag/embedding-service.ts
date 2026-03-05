import OpenAI from 'openai';
import { config } from '../../config';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { externalServiceDuration, externalServiceErrors } from '../../utils/metrics';

/**
 * Embedding Service
 * Generates embeddings using OpenAI API
 */
export class EmbeddingService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    this.model = config.openai.embeddingModel;
    
    if (config.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    } else {
      logger.warn('OpenAI API key not configured, using mock embeddings');
    }
  }

  /**
   * Generates embedding for a single text
   * @param text - Input text
   * @returns Embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const start = Date.now();

    try {
      if (!this.client) {
        // Return mock embedding for development
        return this.generateMockEmbedding(text);
      }

      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0].embedding;

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.observe({ service: 'openai', operation: 'embedding' }, duration);

      logger.debug('Embedding generated', {
        textLength: text.length,
        embeddingDim: embedding.length,
        duration: `${duration}s`,
      });

      return embedding;
    } catch (error) {
      externalServiceErrors.inc({ service: 'openai', operation: 'embedding' });
      logger.error('Embedding generation failed', { error });
      throw new ExternalServiceError('Failed to generate embedding');
    }
  }

  /**
   * Generates embeddings for multiple texts
   * @param texts - Array of input texts
   * @returns Array of embedding vectors
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const start = Date.now();

    try {
      if (!this.client) {
        // Return mock embeddings for development
        return texts.map((text) => this.generateMockEmbedding(text));
      }

      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      const embeddings = response.data.map((item) => item.embedding);

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.observe({ service: 'openai', operation: 'batch-embedding' }, duration);

      logger.info('Batch embeddings generated', {
        count: texts.length,
        duration: `${duration}s`,
      });

      return embeddings;
    } catch (error) {
      externalServiceErrors.inc({ service: 'openai', operation: 'batch-embedding' });
      logger.error('Batch embedding generation failed', { error });
      throw new ExternalServiceError('Failed to generate batch embeddings');
    }
  }

  /**
   * Generates a mock embedding for development/testing
   * @param text - Input text
   * @returns Mock embedding vector
   */
  private generateMockEmbedding(text: string): number[] {
    // Generate a deterministic mock embedding based on text
    const dimension = 1536; // OpenAI ada-002 dimension
    const seed = this.hashString(text);
    const embedding: number[] = [];

    for (let i = 0; i < dimension; i++) {
      // Generate pseudo-random values based on seed
      const value = Math.sin(seed + i) * 0.5;
      embedding.push(value);
    }

    return embedding;
  }

  /**
   * Simple string hash function for mock embeddings
   * @param str - Input string
   * @returns Hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

export const embeddingService = new EmbeddingService();
