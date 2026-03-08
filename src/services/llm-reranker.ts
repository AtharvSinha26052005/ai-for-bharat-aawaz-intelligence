import logger from '../utils/logger';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class LLMReranker {
  async rerankSchemes(profile: any, schemes: any[]): Promise<any[]> {
    try {
      logger.info('Starting LLM reranking', { schemeCount: schemes.length });

      // Build profile text
      const profileText = this.buildProfileText(profile);

      // Rerank each scheme
      const rerankedSchemes = [];
      for (const scheme of schemes) {
        const rerankScore = await this.scoreScheme(profileText, scheme);
        rerankedSchemes.push({
          ...scheme,
          rerank_score: rerankScore,
        });
      }

      // Sort by rerank score
      rerankedSchemes.sort((a, b) => b.rerank_score - a.rerank_score);

      logger.info('LLM reranking complete', { 
        topScore: rerankedSchemes[0]?.rerank_score,
        bottomScore: rerankedSchemes[rerankedSchemes.length - 1]?.rerank_score,
      });

      return rerankedSchemes;
    } catch (error: any) {
      logger.error('LLM reranking failed, returning original order', { error: error.message });
      // Return original schemes if reranking fails
      return schemes;
    }
  }

  private buildProfileText(profile: any): string {
    return `Age: ${profile.age}, Gender: ${profile.gender}, Caste: ${profile.caste}, Occupation: ${profile.occupation}, Income: ${profile.income_range}, State: ${profile.state}`;
  }

  private async scoreScheme(profileText: string, scheme: any): Promise<number> {
    try {
      const prompt = `User profile: ${profileText}

Scheme name: ${scheme.name}
Scheme description: ${scheme.description || 'N/A'}
Scheme eligibility: ${scheme.eligibility || 'N/A'}

Rate how relevant this scheme is for the user from 0 to 100.
Consider:
- Does the user meet the eligibility criteria?
- Is the scheme beneficial for the user's situation?
- Is the scheme applicable in the user's state?

Return only a number between 0 and 100.`;

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
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data: any = await response.json();
      const scoreText = data.choices[0]?.message?.content?.trim() || '50';
      
      // Extract number from response
      const score = parseInt(scoreText.match(/\d+/)?.[0] || '50', 10);
      
      // Normalize to 0-1 range
      return Math.min(Math.max(score / 100, 0), 1);
    } catch (error: any) {
      logger.error('Failed to score scheme', { scheme: scheme.name, error: error.message });
      // Return neutral score if scoring fails
      return 0.5;
    }
  }
}
