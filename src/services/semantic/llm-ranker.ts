import { SemanticSearchProfile } from '../../types';
import { SearchResult } from './vector-store';
import logger from '../../utils/logger';
import { retryWithBackoff } from '../../utils/retry';
import { ExternalServiceError } from '../../utils/errors';

/**
 * Eligibility analysis result from LLM (Production-level format)
 */
export interface EligibilityAnalysis {
  name: string;
  slug: string;
  ministry: string;
  eligibility_score: number; // 0-100
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  benefits_summary: string;
  eligibility_analysis: string;
  detailed_report: string;
  apply_link: string;
}

/**
 * Scheme with eligibility analysis
 */
export interface RankedScheme extends EligibilityAnalysis {
  schemeId: string;
  similarityScore: number;
}

/**
 * Configuration for LLM ranker
 */
interface LLMRankerConfig {
  apiKey: string;
  model: string;
  apiEndpoint: string;
  temperature: number;
  timeout: number;
}

/**
 * Service for analyzing scheme eligibility using Groq LLM API
 * Uses llama-3.3-70b-versatile model to provide intelligent eligibility reasoning
 * 
 * Production-level implementation with:
 * - Batch processing (all schemes in one API call)
 * - Structured JSON output with detailed analysis
 * - Eligibility scoring (0-100)
 * - Confidence levels (High/Medium/Low)
 * - Detailed reports for UI display
 */
export class LLMRankerService {
  private config: LLMRankerConfig;

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }

    this.config = {
      apiKey,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
      temperature: 0.2, // Low temperature for consistent, deterministic responses
      timeout: 15000, // 15 seconds for batch processing
    };

    logger.info('LLMRankerService initialized', {
      model: this.config.model,
    });
  }

  /**
   * Analyze eligibility for multiple schemes using batch Groq API call
   * @param profile - User profile
   * @param schemes - Array of search results (top 10-20 from Pinecone)
   * @returns Array of top 5 ranked schemes with detailed eligibility analysis
   */
  async batchAnalyze(
    profile: SemanticSearchProfile,
    schemes: SearchResult[]
  ): Promise<RankedScheme[]> {
    const startTime = Date.now();

    logger.info('Starting batch eligibility analysis', {
      schemeCount: schemes.length,
    });

    try {
      // Build comprehensive prompt for all schemes at once
      const prompt = this.buildBatchPrompt(profile, schemes);

      logger.info('Calling Groq API for batch analysis');

      // Call Groq API with retry logic
      const response = await retryWithBackoff(
        () => this.callGroqAPI(prompt),
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
        }
      );

      // Parse structured response (expecting array of top 5 schemes)
      const rankedSchemes = this.parseBatchResponse(response, schemes);

      const duration = Date.now() - startTime;
      logger.info('Batch eligibility analysis completed', {
        totalSchemes: schemes.length,
        rankedSchemes: rankedSchemes.length,
        duration,
      });

      return rankedSchemes;
    } catch (error) {
      logger.error('Batch eligibility analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError(
        'Failed to analyze scheme eligibility',
        'LLM_BATCH_ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Build comprehensive prompt for batch eligibility analysis
   * Production-level prompt that forces structured JSON output
   * @param profile - User profile
   * @param schemes - Array of search results
   * @returns Formatted prompt string
   */
  private buildBatchPrompt(profile: SemanticSearchProfile, schemes: SearchResult[]): string {
    const { age, income, gender, caste, state } = profile;

    // Format user profile
    const userProfile = JSON.stringify({
      age,
      income,
      gender,
      caste,
      state,
      occupation: this.inferOccupation(age, income),
    }, null, 2);

    // Format schemes data with full metadata
    const schemesData = JSON.stringify(
      schemes.map((scheme) => ({
        name: scheme.metadata.name,
        slug: scheme.metadata.slug,
        ministry: scheme.metadata.ministry,
        category: scheme.metadata.category || 'Not specified',
        level: scheme.metadata.level || 'Not specified',
        state: scheme.metadata.state || 'All India',
      })),
      null,
      2
    );

    return `You are an AI assistant helping citizens find eligible government schemes.
Your task is to analyze a user's profile and evaluate the eligibility of government schemes.

USER PROFILE:
${userProfile}

SCHEMES DATA:
${schemesData}

Instructions:
1. Analyze the user's profile carefully.
2. For each scheme:
   - Check eligibility conditions based on age, income, gender, caste, and state.
   - Determine how well the user matches the scheme.
3. Assign an eligibility_score between 0 and 100.
4. Rank schemes from highest eligibility to lowest.
5. Provide a clear explanation.
6. Provide a detailed report explaining eligibility and benefits.
7. Only return the TOP 5 schemes.

Return JSON in this format:
[
  {
    "name": "",
    "slug": "",
    "ministry": "",
    "eligibility_score": 0,
    "confidence": "",
    "reason": "",
    "benefits_summary": "",
    "eligibility_analysis": "",
    "detailed_report": "",
    "apply_link": ""
  }
]

Definitions:
- eligibility_score:
  * 0–30 → Not Eligible
  * 30–60 → Low Match
  * 60–80 → Good Match
  * 80–100 → Highly Eligible

- confidence: "High" / "Medium" / "Low"

- reason: One sentence explaining why this scheme fits the user.

- eligibility_analysis: Explain how the user's profile matches the scheme criteria.

- detailed_report: Explain the scheme in detail including:
  * key eligibility rules
  * benefits
  * why the user should apply

- apply_link: Use format "https://www.myscheme.gov.in/schemes/{slug}"

IMPORTANT: Return ONLY valid JSON array with exactly 5 schemes. No markdown, no explanations, just the JSON array.`;
  }

  /**
   * Infer occupation from age and income (simple heuristic)
   * @param age - User age
   * @param income - User income
   * @returns Inferred occupation
   */
  private inferOccupation(age: number, income: number): string {
    if (age < 25 && income < 100000) return 'student';
    if (age >= 60) return 'senior citizen';
    if (income === 0) return 'unemployed';
    if (income < 300000) return 'low-income worker';
    return 'employed';
  }

  /**
   * Parse batch LLM response into structured eligibility analysis
   * @param response - Raw response from LLM (JSON array)
   * @param originalSchemes - Original schemes from Pinecone (for fallback)
   * @returns Array of ranked schemes with eligibility analysis
   */
  private parseBatchResponse(response: string, originalSchemes: SearchResult[]): RankedScheme[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }

      // Parse JSON array
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and transform each scheme
      const rankedSchemes: RankedScheme[] = parsed.map((item: any, index: number) => {
        // Validate required fields
        if (
          typeof item.name !== 'string' ||
          typeof item.slug !== 'string' ||
          typeof item.ministry !== 'string' ||
          typeof item.eligibility_score !== 'number' ||
          typeof item.confidence !== 'string' ||
          typeof item.reason !== 'string' ||
          typeof item.benefits_summary !== 'string' ||
          typeof item.eligibility_analysis !== 'string' ||
          typeof item.detailed_report !== 'string' ||
          typeof item.apply_link !== 'string'
        ) {
          throw new Error(`Invalid scheme format at index ${index}`);
        }

        // Validate eligibility_score range
        if (item.eligibility_score < 0 || item.eligibility_score > 100) {
          logger.warn('Eligibility score out of range, clamping', {
            original: item.eligibility_score,
            scheme: item.name,
          });
          item.eligibility_score = Math.max(0, Math.min(100, item.eligibility_score));
        }

        // Validate confidence value
        if (!['High', 'Medium', 'Low'].includes(item.confidence)) {
          logger.warn('Invalid confidence value, defaulting to Medium', {
            original: item.confidence,
            scheme: item.name,
          });
          item.confidence = 'Medium';
        }

        // Find matching original scheme for schemeId and similarityScore
        const originalScheme = originalSchemes.find(
          (s) => s.metadata.slug === item.slug || s.metadata.name === item.name
        );

        return {
          schemeId: originalScheme?.id || item.slug,
          name: item.name,
          slug: item.slug,
          ministry: item.ministry,
          eligibility_score: item.eligibility_score,
          confidence: item.confidence as 'High' | 'Medium' | 'Low',
          reason: item.reason,
          benefits_summary: item.benefits_summary,
          eligibility_analysis: item.eligibility_analysis,
          detailed_report: item.detailed_report,
          apply_link: item.apply_link,
          similarityScore: originalScheme?.score || 0,
        };
      });

      return rankedSchemes;
    } catch (error) {
      logger.error('Failed to parse batch LLM response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500),
      });

      // Return empty array on parse failure
      return [];
    }
  }

  /**
   * Call Groq API to get LLM response
   * @param prompt - Formatted prompt
   * @returns LLM response text
   */
  private async callGroqAPI(prompt: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert in Indian government schemes and eligibility criteria. Analyze user profiles and provide accurate eligibility assessments in structured JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          max_tokens: 2000, // Increased for detailed batch response
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Groq API call failed', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        throw new ExternalServiceError(
          `Groq API error: ${response.statusText}`,
          'GROQ_API_ERROR'
        );
      }

      const data: any = await response.json();

      // Extract content from response
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid Groq API response format');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceError('Groq API request timed out', 'GROQ_API_TIMEOUT');
      }

      logger.error('Unexpected error in Groq API call', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError('Failed to call Groq API', 'GROQ_API_ERROR');
    }
  }
}

// Export singleton instance
export const llmRankerService = new LLMRankerService();
