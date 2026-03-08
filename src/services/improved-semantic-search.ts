import { ProfileStorageService } from './profile-storage-service';
import { EmbeddingGeneratorService } from './semantic/embedding-generator';
import { VectorStoreService } from './semantic/vector-store';
import logger from '../utils/logger';

interface SchemeMatch {
  id: string;
  name: string;
  slug: string;
  ministry: string;
  description: string;
  eligibility: string;
  benefits: string;
  apply_link: string;
  semantic_score: number;
  eligibility_score: number;
  final_score: number;
  explanation: string[];
  category: 'relevant' | 'exploratory';
}

export class ImprovedSemanticSearchService {
  private profileService: ProfileStorageService;
  private embeddingGenerator: EmbeddingGeneratorService;
  private vectorStore: VectorStoreService;

  constructor() {
    this.profileService = new ProfileStorageService();
    this.embeddingGenerator = new EmbeddingGeneratorService();
    this.vectorStore = new VectorStoreService();
  }

  async searchSchemesByProfile(profileId: string): Promise<SchemeMatch[]> {
    try {
      // Step 1: Get profile data
      const profile = await this.profileService.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      logger.info('Starting improved semantic search', {
        profileId,
        age: profile.age,
        gender: profile.gender,
        caste: profile.caste,
        occupation: profile.occupation,
      });

      // Step 2: Generate rich profile text for embedding
      const profileText = this.generateProfileText(profile);
      logger.info('Generated profile text', { profileText: profileText.substring(0, 200) });

      let rawResults: any[] = [];
      
      try {
        // Step 3: Try Pinecone search with embedding
        const incomeMap: { [key: string]: number } = {
          'below-1L': 50000,
          '1L-3L': 200000,
          '3L-5L': 400000,
          'above-5L': 600000,
        };
        const income = incomeMap[profile.income_range] || 200000;

        const profileForEmbedding: any = {
          age: profile.age,
          income: income,
          gender: profile.gender as 'Male' | 'Female' | 'Other',
          caste: profile.caste as 'General' | 'OBC' | 'SC' | 'ST' | 'Other',
          state: profile.state,
        };

        const embeddingResult = await this.embeddingGenerator.generateProfileEmbedding(profileForEmbedding);
        const embedding = embeddingResult.vector;
        logger.info('Generated embedding', { dimension: embedding.length });

        // Search Pinecone for top 50 schemes
        rawResults = await this.vectorStore.search(embedding, 50);
        logger.info('Pinecone search complete', { count: rawResults.length });
      } catch (embeddingError: any) {
        // Fallback: Use keyword-based matching if embedding fails
        logger.warn('Embedding failed, using keyword-based fallback', { error: embeddingError.message });
        rawResults = await this.keywordBasedSearch(profile);
      }

      // Step 6: Deduplicate by slug
      const uniqueSchemes = this.deduplicateSchemes(rawResults);
      logger.info('After deduplication', { count: uniqueSchemes.length });

      // Step 7: Calculate eligibility scores and hybrid ranking
      const scoredSchemes = uniqueSchemes.map((scheme: any) => {
        const eligibilityScore = this.calculateEligibilityScore(profile, scheme);
        const semanticScore = scheme.score || 0;
        
        // Hybrid ranking: 60% semantic + 40% eligibility
        const finalScore = (0.6 * semanticScore) + (0.4 * eligibilityScore);

        const explanation = this.generateExplanation(profile, scheme, eligibilityScore);

        return {
          id: scheme.id,
          name: scheme.metadata?.name || scheme.name || 'Unknown',
          slug: scheme.metadata?.slug || scheme.id,
          ministry: scheme.metadata?.ministry || 'Unknown',
          description: scheme.metadata?.description || '',
          eligibility: scheme.metadata?.eligibility || '',
          benefits: scheme.metadata?.benefits || scheme.metadata?.benefits_summary || '',
          apply_link: scheme.metadata?.apply_link || '',
          semantic_score: semanticScore,
          eligibility_score: eligibilityScore,
          final_score: finalScore,
          explanation,
          category: (finalScore >= 0.6 ? 'relevant' : 'exploratory') as 'relevant' | 'exploratory',
        };
      });

      // Step 8: Sort by final score
      scoredSchemes.sort((a, b) => b.final_score - a.final_score);

      // Step 9: Select top 7 relevant + top 3 exploratory
      const relevantSchemes = scoredSchemes.filter(s => s.category === 'relevant').slice(0, 7);
      const exploratorySchemes = scoredSchemes.filter(s => s.category === 'exploratory').slice(0, 3);

      const finalResults = [...relevantSchemes, ...exploratorySchemes];

      logger.info('Search complete', {
        relevant: relevantSchemes.length,
        exploratory: exploratorySchemes.length,
        total: finalResults.length,
      });

      return finalResults;
    } catch (error: any) {
      logger.error('Error in improved semantic search', { error: error.message });
      throw error;
    }
  }

  private async keywordBasedSearch(profile: any): Promise<any[]> {
    // Load schemes from JSON file
    const fs = require('fs');
    const path = require('path');
    const schemesPath = path.join(__dirname, '../../myscheme_full_1000.json');
    const schemes = JSON.parse(fs.readFileSync(schemesPath, 'utf-8'));

    // Score each scheme based on keywords
    const scored = schemes.map((scheme: any) => {
      let score = 0.3; // Base score
      const text = `${scheme.name} ${scheme.description} ${scheme.eligibility} ${scheme.benefits}`.toLowerCase();

      // Keyword matching
      if (profile.occupation.toLowerCase().includes('student') && text.includes('student')) score += 0.3;
      if (profile.caste.toLowerCase() !== 'general' && text.includes(profile.caste.toLowerCase())) score += 0.2;
      if (profile.gender.toLowerCase() === 'female' && text.includes('women')) score += 0.15;
      if (profile.state && text.includes(profile.state.toLowerCase())) score += 0.1;

      return {
        id: scheme.slug,
        score: Math.min(score, 1.0),
        metadata: {
          name: scheme.name,
          slug: scheme.slug,
          ministry: scheme.ministry,
          description: scheme.description,
          eligibility: scheme.eligibility,
          benefits: scheme.benefits,
          benefits_summary: scheme.benefits_summary,
          apply_link: scheme.apply_link,
        },
      };
    });

    // Sort and return top 50
    scored.sort((a: any, b: any) => b.score - a.score);
    return scored.slice(0, 50);
  }

  private generateProfileText(profile: any): string {
    const parts: string[] = [];

    // Age description
    if (profile.age < 18) {
      parts.push(`${profile.age} year old minor`);
    } else if (profile.age < 30) {
      parts.push(`${profile.age} year old youth`);
    } else if (profile.age >= 60) {
      parts.push(`${profile.age} year old senior citizen`);
    } else {
      parts.push(`${profile.age} year old adult`);
    }

    // Gender
    parts.push(profile.gender.toLowerCase());

    // Caste
    if (profile.caste && profile.caste !== 'General') {
      parts.push(`from ${profile.caste} category`);
    }

    // Occupation
    parts.push(profile.occupation.toLowerCase());

    // Location
    parts.push(`from ${profile.state}`);
    if (profile.district) {
      parts.push(`${profile.district} district`);
    }

    // Income
    const incomeDesc = {
      'below-1L': 'with income below ₹1 lakh',
      '1L-3L': 'with income between ₹1-3 lakhs',
      '3L-5L': 'with income between ₹3-5 lakhs',
      'above-5L': 'with income above ₹5 lakhs',
    };
    parts.push(incomeDesc[profile.income_range] || '');

    // Intent
    parts.push('looking for government schemes, benefits, financial assistance, scholarships, and welfare programs');

    return parts.join(' ');
  }

  private deduplicateSchemes(schemes: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const scheme of schemes) {
      const slug = scheme.metadata?.slug || scheme.id;
      if (!seen.has(slug)) {
        seen.add(slug);
        unique.push(scheme);
      }
    }

    return unique;
  }

  private calculateEligibilityScore(profile: any, scheme: any): number {
    let score = 0.5; // Base score
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.benefits}`.toLowerCase();
    const name = (metadata.name || '').toLowerCase();

    // CRITICAL: Gender-based exclusions
    const isMale = profile.gender.toLowerCase() === 'male';
    const isFemale = profile.gender.toLowerCase() === 'female';

    if (isMale && (text.includes('women') || text.includes('girl') || text.includes('widow') || name.includes('women'))) {
      return 0; // Exclude women-only schemes for males
    }

    if (isFemale && text.includes('men only')) {
      return 0; // Exclude men-only schemes for females
    }

    // Age matching
    if (profile.age < 18 && (text.includes('child') || text.includes('minor'))) score += 0.15;
    if (profile.age >= 18 && profile.age < 30 && text.includes('youth')) score += 0.1;
    if (profile.age >= 60 && (text.includes('senior') || text.includes('pension'))) score += 0.15;

    // Caste matching (strong signal)
    const caste = profile.caste.toLowerCase();
    if (caste === 'sc' && text.includes('sc')) score += 0.2;
    if (caste === 'st' && text.includes('st')) score += 0.2;
    if (caste === 'obc' && text.includes('obc')) score += 0.2;

    // Occupation matching
    const occupation = profile.occupation.toLowerCase();
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship') || text.includes('education'))) {
      score += 0.2;
    }
    if (occupation.includes('farm') && (text.includes('farm') || text.includes('agriculture') || text.includes('kisan'))) {
      score += 0.2;
    }

    // State matching
    if (profile.state && text.includes(profile.state.toLowerCase())) {
      score += 0.1;
    } else if (text.includes('central') || text.includes('national') || text.includes('india')) {
      score += 0.05; // National schemes are relevant to all states
    }

    // Income matching
    if (profile.income_range === 'below-1L' && (text.includes('bpl') || text.includes('poor') || text.includes('low income'))) {
      score += 0.1;
    }

    // Gender positive matching (not exclusion)
    if (isFemale && (text.includes('women') || text.includes('girl'))) {
      score += 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private generateExplanation(profile: any, scheme: any, eligibilityScore: number): string[] {
    const explanation: string[] = [];
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.benefits}`.toLowerCase();

    // Caste match
    const caste = profile.caste.toLowerCase();
    if (caste !== 'general' && text.includes(caste)) {
      explanation.push(`✔ ${profile.caste} category eligible`);
    }

    // Occupation match
    const occupation = profile.occupation.toLowerCase();
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship'))) {
      explanation.push('✔ Student beneficiary');
    }
    if (occupation.includes('farm') && text.includes('farm')) {
      explanation.push('✔ Farmer beneficiary');
    }

    // Income match
    if (profile.income_range === 'below-1L' && (text.includes('bpl') || text.includes('poor'))) {
      explanation.push('✔ Low income category');
    }

    // Age match
    if (profile.age < 18 && text.includes('child')) {
      explanation.push('✔ Child/minor eligible');
    }
    if (profile.age >= 60 && text.includes('senior')) {
      explanation.push('✔ Senior citizen eligible');
    }

    // State match
    if (profile.state && text.includes(profile.state.toLowerCase())) {
      explanation.push(`✔ Applicable in ${profile.state}`);
    } else if (text.includes('central') || text.includes('national')) {
      explanation.push('✔ Applicable nationally');
    }

    // Gender match
    if (profile.gender.toLowerCase() === 'female' && (text.includes('women') || text.includes('girl'))) {
      explanation.push('✔ Women/girl beneficiary');
    }

    // If no specific matches, add generic explanation
    if (explanation.length === 0) {
      if (eligibilityScore < 0.4) {
        explanation.push('Low semantic similarity but partially related');
      } else {
        explanation.push('General eligibility based on profile');
      }
    }

    return explanation;
  }
}
