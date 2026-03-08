import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

/**
 * Simple fraud detection result
 */
export interface SimpleFraudResult {
  riskStatus: 'safe' | 'risky';
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Simple Fraud Detection Service using Gemini API
 * Analyzes messages to detect potential fraud
 */
export class SimpleFraudDetectionService {
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.apiKey = apiKey;
    // Use v1 API with gemini-pro model
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';

    logger.info('SimpleFraudDetectionService initialized');
  }

  /**
   * Analyze a message for fraud risk
   * @param message - Message to analyze
   * @returns Fraud detection result
   */
  async analyzeMessage(message: string): Promise<SimpleFraudResult> {
    const startTime = Date.now();

    try {
      logger.info('Analyzing message for fraud', {
        messageLength: message.length,
      });

      // Build prompt for Gemini
      const prompt = this.buildPrompt(message);

      // Call Gemini API
      const response = await this.callGeminiAPI(prompt);

      // Parse response
      const result = this.parseResponse(response);

      const duration = Date.now() - startTime;
      logger.info('Fraud analysis completed', {
        riskStatus: result.riskStatus,
        confidence: result.confidence,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Fraud analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw new ExternalServiceError(
        'Failed to analyze message for fraud',
        'FRAUD_ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Build prompt for Gemini API
   * @param message - Message to analyze
   * @returns Formatted prompt
   */
  private buildPrompt(message: string): string {
    return `You are a fraud detection AI assistant for a government schemes platform in India.

Analyze the following message to determine if it contains potential fraud, scam, or suspicious content related to government schemes.

MESSAGE TO ANALYZE:
"${message}"

Common fraud indicators:
- Promises of guaranteed scheme approval
- Requests for money/fees to access schemes
- Urgent language creating pressure
- Requests for personal information (Aadhar, bank details, OTP)
- Claims of special connections or insider access
- Too-good-to-be-true offers
- Impersonation of government officials
- Unofficial payment methods (UPI, cash, gift cards)

Analyze the message and respond with ONLY a JSON object in this exact format:
{
  "riskStatus": "safe" or "risky",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of why this message is safe or risky"
}

IMPORTANT: Return ONLY the JSON object, no other text.`;
  }

  /**
   * Call Gemini API
   * @param prompt - Prompt to send
   * @returns API response text
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Gemini API call failed', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        throw new ExternalServiceError(
          `Gemini API error: ${response.statusText}`,
          'GEMINI_API_ERROR'
        );
      }

      const data: any = await response.json();

      // Extract text from Gemini response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid Gemini API response format');
      }

      const text = data.candidates[0].content.parts[0].text;
      return text;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      logger.error('Unexpected error in Gemini API call', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ExternalServiceError('Failed to call Gemini API', 'GEMINI_API_ERROR');
    }
  }

  /**
   * Parse Gemini response into fraud result
   * @param response - Raw response from Gemini
   * @returns Parsed fraud result
   */
  private parseResponse(response: string): SimpleFraudResult {
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
        !parsed.riskStatus ||
        !['safe', 'risky'].includes(parsed.riskStatus) ||
        typeof parsed.confidence !== 'number' ||
        typeof parsed.reasoning !== 'string'
      ) {
        throw new Error('Invalid response format');
      }

      // Validate confidence range
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        logger.warn('Confidence out of range, clamping', {
          original: parsed.confidence,
        });
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
      }

      return {
        riskStatus: parsed.riskStatus as 'safe' | 'risky',
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      logger.error('Failed to parse Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 200),
      });

      // Return fallback result
      return {
        riskStatus: 'safe',
        confidence: 0.5,
        reasoning: 'Unable to analyze message. Please review manually.',
      };
    }
  }
}

// Export singleton instance
export const simpleFraudDetectionService = new SimpleFraudDetectionService();
