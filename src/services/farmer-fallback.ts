import logger from '../utils/logger';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface FarmerScheme {
  name: string;
  ministry: string;
  short_description: string;
  main_benefit: string;
  apply_link: string;
}

export class FarmerFallbackService {
  /**
   * Check if farmer fallback should be triggered
   * Triggers when user is a farmer AND Pinecone results are weak
   */
  shouldTriggerFallback(profile: any, schemes: any[]): boolean {
    // Only trigger for farmers
    if (!profile.occupation.toLowerCase().includes('farm')) {
      return false;
    }

    // Check if results are empty
    if (schemes.length === 0) {
      logger.info('Farmer fallback triggered: no results');
      return true;
    }

    // Check result quality using final_score (not semantic_score)
    const topScore = schemes[0]?.final_score || 0;
    const strongMatches = schemes.filter(s => s.final_score >= 0.7).length;

    // Trigger if top result has low score OR insufficient strong matches
    const shouldTrigger = topScore < 0.7 || strongMatches < 2;

    logger.info('Farmer fallback check', {
      occupation: profile.occupation,
      topScore: topScore.toFixed(2),
      strongMatches,
      shouldTrigger,
    });

    return shouldTrigger;
  }

  /**
   * Fetch central farmer schemes from Groq (SINGLE API CALL)
   */
  async fetchCentralFarmerSchemes(profile: any): Promise<any[]> {
    try {
      logger.info('Triggering farmer fallback mode', { state: profile.state });

      const prompt = `A user is a farmer in India (State: ${profile.state}, Caste: ${profile.caste}).

Return the most important CENTRAL GOVERNMENT schemes for farmers in India.
Only include schemes that apply nationwide (not state-specific).

MUST include these major schemes if applicable:
1. PM-Kisan Samman Nidhi
2. Pradhan Mantri Fasal Bima Yojana (PMFBY)
3. Kisan Credit Card (KCC)
4. Agriculture Infrastructure Fund
5. Soil Health Card Scheme
6. e-NAM (National Agriculture Market)
7. Paramparagat Krishi Vikas Yojana

Return the top 7 schemes.

For each scheme include:
- name: Official scheme name
- ministry: Ministry name
- short_description: Brief description (1-2 sentences)
- main_benefit: Key benefit for farmers
- apply_link: Official government portal link (use pmkisan.gov.in, pmfby.gov.in, etc.)

Return ONLY valid JSON in this exact format:
[
  {
    "name": "PM-Kisan Samman Nidhi",
    "ministry": "Ministry of Agriculture and Farmers Welfare",
    "short_description": "Direct income support for small and marginal farmers.",
    "main_benefit": "₹6000 per year income support in three installments",
    "apply_link": "https://pmkisan.gov.in/"
  }
]

Return only the JSON array, no other text.`;

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
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || '[]';

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
      
      const farmerSchemes: FarmerScheme[] = JSON.parse(jsonStr);

      logger.info('Farmer fallback schemes fetched', { count: farmerSchemes.length });

      // Convert to standard scheme format
      return this.convertToSchemeFormat(farmerSchemes, profile);
    } catch (error: any) {
      logger.error('Farmer fallback failed', { error: error.message });
      // Return empty array if fallback fails
      return [];
    }
  }

  /**
   * Convert farmer schemes to standard format
   */
  private convertToSchemeFormat(farmerSchemes: FarmerScheme[], profile: any): any[] {
    return farmerSchemes.map((scheme, index) => ({
      id: `farmer-fallback-${index}`,
      name: scheme.name,
      slug: scheme.name.toLowerCase().replace(/\s+/g, '-'),
      ministry: scheme.ministry,
      description: scheme.short_description,
      eligibility: 'Applicable to farmers across India',
      benefits: scheme.main_benefit,
      apply_link: scheme.apply_link,
      semantic_score: 0.9,
      eligibility_score: 0.9,
      final_score: 0.9,
      rerank_score: 0.95, // High rerank score to prioritize
      explanation: [
        '✔ Central Government agriculture scheme',
        '✔ Applicable nationwide',
        '✔ Farmer beneficiary',
      ],
      category: 'relevant',
      state_match: true,
      scheme_type: 'central',
      is_fallback: true,
      fallback_category: '🌾 Central Farmer Scheme',
    }));
  }
}
