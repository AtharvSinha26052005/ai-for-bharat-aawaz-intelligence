import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

/**
 * Risk level for fraud detection
 */
export type RiskLevel = 'safe' | 'risky';

/**
 * Fraud detection result
 */
export interface FraudDetectionResult {
  riskLevel: RiskLevel;
  confidence: number; // 0-1
  reasoning: string;
  indicators: string[];
  recommendations: string[];
}

/**
 * Configuration for fraud detection service
 */
interface FraudDetectionConfig {
  apiKey: string;
  model: string;
  timeout: number;
}

/**
 * Service for detecting fraud in messages using Google Gemini API
 * Analyzes messages for potential scams, phishing, and fraud attempts
 */
export class FraudDetectionService {
  private config: FraudDetectionConfig;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.config = {
      apiKey,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      timeout: 10000, // 10 seconds
    };

    // Initialize Gemini AI
    this.genAI = new GoogleGenerativeAI(this.config.apiKey);

    logger.info('FraudDetectionService initialized', {
      model: this.config.model,
    });
  }

  /**
   * Analyze a message for potential fraud
   * @param message - Message text to analyze
   * @returns Fraud detection result
   */
  async analyzeMessage(message: string): Promise<FraudDetectionResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new Error('Message must be a non-empty string');
      }

      if (message.length > 5000) {
        throw new Error('Message is too long (max 5000 characters)');
      }

      logger.info('Analyzing message for fraud', {
        messageLength: message.length,
      });

      // Build prompt for Gemini
      const prompt = this.buildPrompt(message);

      // Call Gemini API
      const response = await this.callGeminiAPI(prompt);

      // Parse structured response
      const result = this.parseResponse(response);

      const duration = Date.now() - startTime;
      logger.info('Fraud analysis completed', {
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to analyze message for fraud', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Return safe fallback with low confidence
      return {
        riskLevel: 'safe',
        confidence: 0.1,
        reasoning: 'Unable to analyze message due to service error. Please try again later.',
        indicators: [],
        recommendations: ['Try analyzing the message again', 'Contact support if the issue persists'],
      };
    }
  }

  /**
   * Build prompt for Gemini fraud analysis
   * @param message - Message to analyze
   * @returns Formatted prompt string
   */
  private buildPrompt(message: string): string {
    return `You are an expert in detecting fraud, scams, and phishing attempts related to government schemes in India.

Analyze the following message and determine if it's a potential fraud or scam:

MESSAGE:
"""
${message}
"""

Consider these fraud indicators:
1. Requests for money, bank details, or personal information
2. Urgency tactics ("act now", "limited time", "immediate action required")
3. Promises of guaranteed benefits or schemes
4. Unofficial contact methods (personal phone numbers, WhatsApp, unofficial websites)
5. Poor grammar, spelling mistakes, or unprofessional language
6. Impersonation of government officials or agencies
7. Requests to click suspicious links or download files
8. Threats or intimidation tactics

Based on your analysis, determine:
1. Risk Level: Is this message "safe" or "risky"?
2. Confidence: How confident are you in this assessment? (0.0 to 1.0)
3. Reasoning: Brief explanation of your decision
4. Indicators: List of specific fraud indicators found (if any)
5. Recommendations: What should the user do?

Respond ONLY with a valid JSON object in this exact format:
{
  "riskLevel": "safe" or "risky",
  "confidence": number between 0.0 and 1.0,
  "reasoning": "brief explanation",
  "indicators": ["indicator 1", "indicator 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;
  }

  /**
   * Parse Gemini response into structured fraud detection result
   * @param response - Raw response from Gemini
   * @returns Parsed fraud detection result
   */
  private parseResponse(response: string): FraudDetectionResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (
        !parsed.riskLevel ||
        typeof parsed.confidence !== 'number' ||
        typeof parsed.reasoning !== 'string' ||
        !Array.isArray(parsed.indicators) ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error('Invalid response format: missing or invalid fields');
      }

      // Validate risk level
      if (!['safe', 'risky'].includes(parsed.riskLevel)) {
        throw new Error('Invalid risk level: must be "safe" or "risky"');
      }

      // Validate confidence range
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        logger.warn('Confidence out of range, clamping', {
          original: parsed.confidence,
        });
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
      }

      return {
        riskLevel: parsed.riskLevel as RiskLevel,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        indicators: parsed.indicators,
        recommendations: parsed.recommendations,
      };
    } catch (error) {
      logger.error('Failed to parse Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 200),
      });

      // Return safe fallback
      return {
        riskLevel: 'safe',
        confidence: 0.1,
        reasoning: 'Unable to parse fraud analysis. Please try again.',
        indicators: [],
        recommendations: ['Try analyzing the message again'],
      };
    }
  }

  /**
   * Call Gemini API to get fraud analysis
   * @param prompt - Formatted prompt
   * @returns Gemini response text
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      if (!this.genAI) {
        throw new Error('Gemini AI not initialized');
      }

      const model = this.genAI.getGenerativeModel({ model: this.config.model });

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), this.config.timeout);
      });

      // Generate content with timeout
      const resultPromise = model.generateContent(prompt);
      const result = await Promise.race([resultPromise, timeoutPromise]);

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error) {
      logger.error('Gemini API call failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message === 'Request timed out') {
        throw new ExternalServiceError('Gemini API request timed out', 'GEMINI_API_TIMEOUT');
      }

      throw new ExternalServiceError('Failed to call Gemini API', 'GEMINI_API_ERROR');
    }
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();
