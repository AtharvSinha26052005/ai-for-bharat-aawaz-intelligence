import logger from '../utils/logger';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqQueryRewriter {
  async rewriteProfileToQuery(profile: any): Promise<string> {
    try {
      const prompt = `Convert this user profile into a short keyword-style search query for government welfare schemes.

Profile:
Age: ${profile.age}
Gender: ${profile.gender}
Caste: ${profile.caste}
Occupation: ${profile.occupation}
Income: ${profile.income_range}
State: ${profile.state}

Return a keyword search query (maximum 20 words). Focus on:
- occupation keywords (use specific terms like "agriculture" for farmer, "education" for student)
- caste category
- income level
- state name
- benefit types (scholarship, loan, subsidy, pension, insurance)

DO NOT use the word "Central" or "centrally" in the query.
Use specific domain terms instead of generic words.

Example format: "SC agriculture crop subsidy loan low income Tamil Nadu government scheme"

Return only the keywords, no full sentences.`;

      logger.info('Calling Groq API for query rewriting', {
        age: profile.age,
        occupation: profile.occupation,
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
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Groq API error', { status: response.status, error: errorText });
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data: any = await response.json();
      let generatedQuery = data.choices[0]?.message?.content?.trim() || '';

      // Query expansion for farmers
      if (profile.occupation.toLowerCase().includes('farm')) {
        generatedQuery = this.expandFarmerQuery(generatedQuery);
      }

      logger.info('Groq query generated and expanded', { query: generatedQuery });

      return generatedQuery;
    } catch (error: any) {
      logger.error('Failed to rewrite query with Groq', { error: error.message });
      // Fallback to simple query generation
      return this.generateFallbackQuery(profile);
    }
  }

  private expandFarmerQuery(query: string): string {
    // Add agriculture-specific keywords if not already present
    const agricultureKeywords = ['agriculture', 'crop', 'irrigation', 'kisan', 'farm loan', 'subsidy'];
    const queryLower = query.toLowerCase();
    
    const missingKeywords = agricultureKeywords.filter(keyword => !queryLower.includes(keyword));
    
    if (missingKeywords.length > 0) {
      // Add up to 3 missing keywords
      const toAdd = missingKeywords.slice(0, 3).join(' ');
      return `${query} ${toAdd}`;
    }
    
    return query;
  }

  private generateFallbackQuery(profile: any): string {
    const parts: string[] = [];

    // Add caste if not general
    if (profile.caste && profile.caste !== 'General') {
      parts.push(profile.caste);
    }

    // Add occupation with domain-specific terms
    if (profile.occupation) {
      const occupation = profile.occupation.toLowerCase();
      if (occupation.includes('farm')) {
        parts.push('agriculture crop irrigation kisan farm subsidy');
      } else if (occupation.includes('student')) {
        parts.push('student scholarship education');
      } else {
        parts.push(occupation);
      }
    }

    // Add state
    if (profile.state) {
      parts.push(profile.state);
    }

    // Add income level
    if (profile.income_range === 'below-1L') {
      parts.push('low income');
    }

    // Add gender if female
    if (profile.gender === 'Female') {
      parts.push('women');
    }

    // Add age category
    if (profile.age < 18) {
      parts.push('child');
    } else if (profile.age >= 60) {
      parts.push('senior');
    }

    parts.push('government scheme welfare');

    return parts.join(' ');
  }
}
