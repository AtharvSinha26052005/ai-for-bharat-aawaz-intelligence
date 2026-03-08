import logger from '../utils/logger';
import { FinancialAdviceRequest, FinancialAdviceResponse } from '../types/interested-schemes';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class FinancialAdviceService {
  async getFinancialAdvice(request: FinancialAdviceRequest): Promise<FinancialAdviceResponse> {
    try {
      const prompt = this.buildPrompt(request);

      logger.info('Requesting financial advice from Groq', {
        scheme: request.scheme_name,
      });

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor helping rural Indian citizens understand government schemes and how to best utilize the benefits. Provide practical, actionable advice in simple language.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Groq API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        });
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || '';

      logger.info('Financial advice generated successfully');

      return this.parseAdviceResponse(content);
    } catch (error: any) {
      logger.error('Failed to generate financial advice', { 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to generate financial advice: ${error.message}`);
    }
  }

  private buildPrompt(request: FinancialAdviceRequest): string {
    let prompt = `Provide financial advice for the following government scheme:\n\n`;
    prompt += `Scheme Name: ${request.scheme_name}\n`;
    
    if (request.scheme_description) {
      prompt += `Description: ${request.scheme_description}\n`;
    }
    
    if (request.scheme_benefits) {
      prompt += `Benefits: ${request.scheme_benefits}\n`;
    }

    if (request.user_profile) {
      prompt += `\nUser Profile:\n`;
      if (request.user_profile.age) {
        prompt += `- Age: ${request.user_profile.age}\n`;
      }
      if (request.user_profile.occupation) {
        prompt += `- Occupation: ${request.user_profile.occupation}\n`;
      }
      if (request.user_profile.income_range) {
        prompt += `- Income Range: ${request.user_profile.income_range}\n`;
      }
    }

    prompt += `You are a financial advisor specializing in Indian government welfare schemes.\n\n`;

    prompt += `Analyze the following government scheme for the user.\n\n`;

    prompt += `IMPORTANT INSTRUCTIONS:\n`;
    prompt += `1. Search for accurate and up-to-date information about the scheme.\n`;
    prompt += `2. Identify the maximum financial benefit or payout amount available under the scheme.\n`;
    prompt += `3. Explain clearly how much money the user could realistically receive and under what conditions.\n`;
    prompt += `4. Based on that amount, provide practical and detailed financial advice.\n`;
    prompt += `5. Focus especially on how the user can effectively utilize the potential payout money.\n`;
    prompt += `6. Assume the user may have limited financial literacy and provide simple but practical strategies.\n\n`;

    prompt += `Please provide:\n`;

    prompt += `1. Overall advice on how useful this scheme is for the user\n`;

    prompt += `2. Key points about the scheme (3-5 bullet points) including:\n`;
    prompt += `- Maximum benefit amount\n`;
    prompt += `- Premium or contribution required\n`;
    prompt += `- Eligibility conditions\n`;

    prompt += `3. Detailed financial utilization strategies if the user receives the full benefit amount.\n`;
    prompt += `Provide 4-6 practical suggestions such as:\n`;
    prompt += `- How the money could be used for emergency funds\n`;
    prompt += `- Debt repayment\n`;
    prompt += `- Medical expenses\n`;
    prompt += `- Small investments\n`;
    prompt += `- Income stabilization for the family\n`;

    prompt += `4. Potential impact on the user's financial stability and long-term security if the scheme benefits are received.\n\n`;

    prompt += `Format your response strictly as JSON using the structure below:\n`;

    prompt += `{\n`;
    prompt += `  "advice": "overall advice text",\n`;
    prompt += `  "key_points": ["point 1", "point 2", "point 3"],\n`;
    prompt += `  "utilization_tips": ["tip 1", "tip 2", "tip 3", "tip 4"],\n`;
    prompt += `  "potential_impact": "impact description"\n`;
    prompt += `}\n\n`;

    prompt += `Important: Base your financial advice on the actual benefit amount available under the scheme.\n`;
    prompt += `Return only JSON with no additional explanations.`;

    return prompt;
  }

  private parseAdviceResponse(content: string): FinancialAdviceResponse {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        advice: parsed.advice || 'No advice available',
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        utilization_tips: Array.isArray(parsed.utilization_tips) ? parsed.utilization_tips : [],
        potential_impact: parsed.potential_impact || 'Impact information not available',
      };
    } catch (error) {
      logger.error('Failed to parse financial advice response', { error });
      
      // Fallback response
      return {
        advice: content.substring(0, 500),
        key_points: ['Please consult with a financial advisor for personalized advice'],
        utilization_tips: ['Research the scheme thoroughly before applying', 'Keep all documents ready', 'Follow up regularly on your application'],
        potential_impact: 'This scheme can provide financial support based on your eligibility',
      };
    }
  }
}
