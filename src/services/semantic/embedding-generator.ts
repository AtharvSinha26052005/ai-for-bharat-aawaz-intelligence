import { SemanticSearchProfile } from '../../types';
import logger from '../../utils/logger';
import { retryWithBackoff } from '../../utils/retry';
import { ExternalServiceError } from '../../utils/errors';

/**
 * Configuration for embedding generation
 */
interface EmbeddingConfig {
  model: string;
  dimensions: number;
  apiEndpoint: string;
  timeout: number;
}

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
}

/**
 * Service for generating embeddings from user profiles
 * Uses sentence-transformers model (all-MiniLM-L6-v2) via Hugging Face Inference API
 */
export class EmbeddingGeneratorService {
  private config: EmbeddingConfig;

  constructor() {
    this.config = {
      model: process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
      dimensions: 384, // all-MiniLM-L6-v2 produces 384-dimensional embeddings
      apiEndpoint: 'https://router.huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
      timeout: 10000, // 10 seconds
    };

    logger.info('EmbeddingGeneratorService initialized', {
      model: this.config.model,
      dimensions: this.config.dimensions,
    });
  }

  /**
   * Generate embedding for a user profile
   * @param profile - User profile to generate embedding for
   * @returns Embedding result with vector and metadata
   */
  async generateProfileEmbedding(profile: SemanticSearchProfile): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      // Format profile as natural language text
      const profileText = this.formatProfileText(profile);

      logger.info('Generating profile embedding', {
        profileText: profileText.substring(0, 100) + '...',
      });

      // Generate embedding with retry logic
      const vector = await retryWithBackoff(
        () => this.callEmbeddingAPI(profileText),
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
        }
      );

      // Validate dimensions
      if (vector.length !== this.config.dimensions) {
        throw new ExternalServiceError(
          `Unexpected embedding dimensions: expected ${this.config.dimensions}, got ${vector.length}`,
          'EMBEDDING_DIMENSION_MISMATCH'
        );
      }

      const duration = Date.now() - startTime;
      logger.info('Profile embedding generated successfully', {
        dimensions: vector.length,
        duration,
      });

      return {
        vector,
        dimensions: vector.length,
        model: this.config.model,
      };
    } catch (error) {
      logger.error('Failed to generate profile embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profile: {
          age: profile.age,
          state: profile.state,
          // Don't log sensitive data
        },
      });

      throw new ExternalServiceError(
        'Failed to generate embedding for user profile',
        'EMBEDDING_GENERATION_FAILED'
      );
    }
  }

  /**
   * Format user profile as natural language text for embedding
   * @param profile - User profile to format
   * @returns Natural language description of the profile
   */
  formatProfileText(profile: SemanticSearchProfile): string {
    const { age, income, gender, caste, state } = profile;

    // Build natural language description
    const parts: string[] = [];

    // Gender and age
    parts.push(`A ${gender.toLowerCase()} person aged ${age} years`);

    // Income
    const incomeDescription = this.formatIncome(income);
    parts.push(`with an annual income of ${incomeDescription}`);

    // Caste category
    if (caste && caste !== 'General') {
      parts.push(`belonging to ${caste} category`);
    }

    // Location
    parts.push(`residing in ${state}`);

    // Add context about seeking government schemes
    parts.push('seeking government schemes and benefits');

    return parts.join(', ') + '.';
  }

  /**
   * Format income as human-readable text
   * @param income - Annual income in rupees
   * @returns Formatted income description
   */
  private formatIncome(income: number): string {
    if (income < 100000) {
      return `₹${income.toLocaleString('en-IN')} (below ₹1 lakh)`;
    } else if (income < 300000) {
      return `₹${income.toLocaleString('en-IN')} (₹1-3 lakhs)`;
    } else if (income < 500000) {
      return `₹${income.toLocaleString('en-IN')} (₹3-5 lakhs)`;
    } else {
      return `₹${income.toLocaleString('en-IN')} (above ₹5 lakhs)`;
    }
  }

  /**
   * Call the Hugging Face Inference API to generate embeddings
   * @param text - Text to generate embedding for
   * @returns Embedding vector
   */
  private async callEmbeddingAPI(text: string): Promise<number[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if API key is available
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Embedding API call failed', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        if (response.status === 503) {
          throw new ExternalServiceError(
            'Embedding model is loading, please retry',
            'EMBEDDING_MODEL_LOADING'
          );
        }

        throw new ExternalServiceError(
          `Embedding API error: ${response.statusText}`,
          'EMBEDDING_API_ERROR'
        );
      }

      // Hugging Face returns the embedding directly as an array
      const embedding = await response.json();

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response format');
      }

      return embedding;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceError(
          'Embedding API request timed out',
          'EMBEDDING_API_TIMEOUT'
        );
      }

      logger.error('Unexpected error in embedding API call', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Failed to call embedding API',
        'EMBEDDING_API_ERROR'
      );
    }
  }
}

// Export singleton instance
export const embeddingGeneratorService = new EmbeddingGeneratorService();
