import { ProfileStorageService } from './profile-storage-service';
import { GroqQueryRewriter } from './groq-query-rewriter';
import { Pinecone } from '@pinecone-database/pinecone';
import logger from '../utils/logger';

interface EnhancedSchemeMatch {
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
  state_match: boolean;
}

interface SearchResult {
  generated_query: string;
  schemes: EnhancedSchemeMatch[];
}

export class PineconeSemanticSearchService {
  private profileService: ProfileStorageService;
  private queryRewriter: GroqQueryRewriter;
  private pinecone: Pinecone;
  private indexName: string = 'scheme-index';

  constructor() {
    this.profileService = new ProfileStorageService();
    this.queryRewriter = new GroqQueryRewriter();
    
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY not found in environment');
    }
    
    this.pinecone = new Pinecone({ apiKey });
  }

  async searchSchemesByProfile(profileId: string): Promise<SearchResult> {
    try {
      // Step 1: Get profile data
      const profile = await this.profileService.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      logger.info('Starting Pinecone semantic search with hard filtering', {
        profileId,
        age: profile.age,
        gender: profile.gender,
        caste: profile.caste,
        occupation: profile.occupation,
        state: profile.state,
      });

      // Step 2: Groq LLM Query Rewriting
      const generatedQuery = await this.queryRewriter.rewriteProfileToQuery(profile);
      logger.info('Generated search query', { query: generatedQuery });

      // Step 3: Generate embedding for the query
      const embedding = await this.generateEmbedding(generatedQuery);
      logger.info('Generated embedding', { dimensions: embedding.length });

      // Step 4: Build Pinecone metadata filters
      const metadataFilter = this.buildPineconeFilters(profile);
      logger.info('Built Pinecone filters', { filter: metadataFilter });

      // Step 5: Query Pinecone with metadata filtering
      const pineconeResults = await this.queryPinecone(embedding, metadataFilter);
      logger.info('Pinecone search complete', { count: pineconeResults.length });

      // Step 6: Deduplicate by slug
      const uniqueSchemes = this.deduplicateSchemes(pineconeResults);
      logger.info('After deduplication', { count: uniqueSchemes.length });

      // Step 7: HARD ELIGIBILITY FILTERING (text-based)
      const eligibleSchemes = this.applyHardEligibilityFilters(uniqueSchemes, profile);
      logger.info('After hard eligibility filtering', { count: eligibleSchemes.length });

      // Step 8: State filtering
      const stateFilteredSchemes = eligibleSchemes.map((scheme: any) => {
        const stateMatch = this.checkStateMatch(profile, scheme);
        return { ...scheme, state_match: stateMatch };
      });

      // Step 9: Hybrid ranking (only for eligible schemes)
      const scoredSchemes = stateFilteredSchemes.map((scheme: any) => {
        const eligibilityScore = this.calculateEligibilityScore(profile, scheme, scheme.state_match);
        const semanticScore = scheme.score || 0;
        
        // Hybrid ranking: 60% semantic + 40% eligibility
        const finalScore = (0.6 * semanticScore) + (0.4 * eligibilityScore);

        const explanation = this.generateExplanation(profile, scheme, eligibilityScore, scheme.state_match);

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
          state_match: scheme.state_match,
        };
      });

      // Step 10: Sort by final score
      scoredSchemes.sort((a, b) => b.final_score - a.final_score);

      // Step 11: Select top 7 relevant + top 3 exploratory
      const relevantSchemes = scoredSchemes.filter(s => s.category === 'relevant').slice(0, 7);
      const exploratorySchemes = scoredSchemes.filter(s => s.category === 'exploratory').slice(0, 3);

      const finalResults = [...relevantSchemes, ...exploratorySchemes];

      logger.info('Search complete', {
        relevant: relevantSchemes.length,
        exploratory: exploratorySchemes.length,
        total: finalResults.length,
      });

      return {
        generated_query: generatedQuery,
        schemes: finalResults,
      };
    } catch (error: any) {
      logger.error('Error in Pinecone semantic search', { error: error.message, stack: error.stack });
      // Return empty results instead of throwing
      return {
        generated_query: 'Error generating query',
        schemes: [],
      };
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const embedding: any = await response.json();
      
      // Hugging Face returns the embedding directly as an array
      if (Array.isArray(embedding)) {
        return embedding;
      }
      
      // If it's wrapped in an object, extract it
      if (embedding && Array.isArray(embedding[0])) {
        return embedding[0];
      }
      
      throw new Error('Invalid embedding format from Hugging Face');
    } catch (error: any) {
      logger.error('Failed to generate embedding', { error: error.message });
      throw error;
    }
  }

  private buildPineconeFilters(profile: any): any {
    const filters: any = {
      $and: []
    };

    // Gender filter
    if (profile.gender) {
      filters.$and.push({
        target_gender: { $in: ['any', profile.gender.toLowerCase()] }
      });
    }

    // Occupation filter
    if (profile.occupation) {
      filters.$and.push({
        target_occupation: { $in: ['any', profile.occupation.toLowerCase()] }
      });
    }

    // Caste filter
    if (profile.caste) {
      filters.$and.push({
        target_caste: { $in: ['any', profile.caste.toUpperCase()] }
      });
    }

    // Disability filter (assume user is not disabled unless specified)
    filters.$and.push({
      requires_disability: false
    });

    return filters.$and.length > 0 ? filters : undefined;
  }

  private async queryPinecone(embedding: number[], metadataFilter?: any): Promise<any[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      const queryRequest: any = {
        vector: embedding,
        topK: 50,
        includeMetadata: true,
      };

      if (metadataFilter) {
        queryRequest.filter = metadataFilter;
      }

      const results = await index.query(queryRequest);
      
      return results.matches?.map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      })) || [];
    } catch (error: any) {
      logger.error('Pinecone query failed', { error: error.message });
      // Fallback to keyword search if Pinecone fails
      return await this.keywordBasedSearchFallback(embedding);
    }
  }

  private async keywordBasedSearchFallback(embedding: number[]): Promise<any[]> {
    logger.warn('Using keyword-based search fallback');
    const fs = require('fs');
    const path = require('path');
    const schemesPath = path.join(__dirname, '../../myscheme_full_1000.json');
    const schemes = JSON.parse(fs.readFileSync(schemesPath, 'utf-8'));

    return schemes.slice(0, 50).map((scheme: any) => ({
      id: scheme.slug,
      score: 0.5,
      metadata: {
        name: scheme.name,
        slug: scheme.slug,
        ministry: scheme.ministry,
        description: scheme.description,
        eligibility: scheme.eligibility,
        eligibility_summary: scheme.eligibility_summary,
        benefits: scheme.benefits,
        benefits_summary: scheme.benefits_summary,
        apply_link: scheme.apply_link,
      },
    }));
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

  // HARD ELIGIBILITY FILTERING - This is the critical new function
  private applyHardEligibilityFilters(schemes: any[], profile: any): any[] {
    const filtered: any[] = [];

    for (const scheme of schemes) {
      let rejectScheme = false;
      const schemeText = this.buildSchemeText(scheme);

      // 1️⃣ GENDER FILTER
      const femaleKeywords = ['female', 'women', 'woman', 'girl', 'girl child', 'widow', 'pregnant', 'maternity'];
      const maleKeywords = ['male only', 'men only'];
      
      if (profile.gender.toLowerCase() === 'male') {
        if (femaleKeywords.some(k => schemeText.includes(k))) {
          logger.debug('Rejecting scheme for male user (female-only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      if (profile.gender.toLowerCase() === 'female') {
        if (maleKeywords.some(k => schemeText.includes(k))) {
          logger.debug('Rejecting scheme for female user (male-only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }

      // 2️⃣ DISABILITY FILTER
      const disabilityKeywords = ['disability', 'disabled', 'differently abled', 'persons with disabilities', 'pwd'];
      const userDisabled = profile.disabled || false;
      
      if (!userDisabled && disabilityKeywords.some(k => schemeText.includes(k))) {
        logger.debug('Rejecting scheme (requires disability)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }

      // 3️⃣ PROFESSION FILTER (NEW)
      const occupation = profile.occupation.toLowerCase();
      
      // Scientist/Researcher schemes
      const scientistKeywords = ['scientist', 'researcher', 'professor', 'faculty', 'phd', 'research fellowship', 'emeritus'];
      if (scientistKeywords.some(k => schemeText.includes(k))) {
        if (!['scientist', 'researcher', 'professor', 'faculty'].some(prof => occupation.includes(prof))) {
          logger.debug('Rejecting scheme (scientist/researcher only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      // Author/Writer schemes
      const authorKeywords = ['author', 'writer', 'book', 'literary', 'publication'];
      if (authorKeywords.some(k => schemeText.includes(k))) {
        if (!['author', 'writer'].some(prof => occupation.includes(prof))) {
          logger.debug('Rejecting scheme (author/writer only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      // Artist schemes
      const artistKeywords = ['artist', 'performing arts', 'cultural', 'kalai'];
      if (artistKeywords.some(k => schemeText.includes(k))) {
        if (!['artist', 'performer'].some(prof => occupation.includes(prof))) {
          logger.debug('Rejecting scheme (artist only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }

      // 4️⃣ OCCUPATION FILTER
      // Student-only schemes
      if ((schemeText.includes('student') || schemeText.includes('scholarship')) && 
          !occupation.includes('student')) {
        logger.debug('Rejecting scheme (student-only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }
      
      // Ex-servicemen schemes
      if ((schemeText.includes('ex-servicemen') || schemeText.includes('sainik') || schemeText.includes('army')) && 
          !occupation.includes('servicemen') && !occupation.includes('army')) {
        logger.debug('Rejecting scheme (ex-servicemen only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }
      
      // Trader schemes
      if ((schemeText.includes('trader') || schemeText.includes('retail')) && 
          !occupation.includes('trader') && !occupation.includes('retail')) {
        logger.debug('Rejecting scheme (trader-only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }

      // 5️⃣ CASTE FILTER
      const userCaste = profile.caste.toUpperCase();
      
      if ((schemeText.includes('scheduled tribe') || schemeText.includes(' st ') || schemeText.includes('st category')) && 
          userCaste !== 'ST') {
        logger.debug('Rejecting scheme (ST-only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }
      
      if ((schemeText.includes('scheduled caste') || schemeText.includes(' sc ') || schemeText.includes('sc category')) && 
          userCaste !== 'SC') {
        logger.debug('Rejecting scheme (SC-only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }
      
      if ((schemeText.includes('other backward') || schemeText.includes('obc')) && 
          userCaste !== 'OBC') {
        logger.debug('Rejecting scheme (OBC-only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }

      // 6️⃣ AGE FILTER
      const age = profile.age;
      
      if ((schemeText.includes('senior citizen') || schemeText.includes('old age')) && age < 60) {
        logger.debug('Rejecting scheme (senior citizen only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }
      
      if ((schemeText.includes('child') || schemeText.includes('minor')) && age >= 18) {
        logger.debug('Rejecting scheme (child/minor only)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }

      if (!rejectScheme) {
        filtered.push(scheme);
      }
    }

    return filtered;
  }

  private buildSchemeText(scheme: any): string {
    const metadata = scheme.metadata || {};
    return `${metadata.name || ''} ${metadata.description || ''} ${metadata.eligibility || ''} ${metadata.eligibility_summary || ''} ${metadata.benefits || ''}`.toLowerCase();
  }

  private checkStateMatch(profile: any, scheme: any): boolean {
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility}`.toLowerCase();
    
    const states = [
      'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
      'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
      'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
      'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
      'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
      'delhi', 'jammu and kashmir', 'ladakh'
    ];

    let mentionedState: string | null = null;
    for (const state of states) {
      if (text.includes(state)) {
        mentionedState = state;
        break;
      }
    }

    if (!mentionedState) {
      return true;
    }

    if (text.includes('government of india') || 
        text.includes('ministry of') || 
        text.includes('centrally sponsored') ||
        text.includes('central government')) {
      return true;
    }

    const userState = profile.state.toLowerCase();
    return mentionedState === userState;
  }

  private calculateEligibilityScore(profile: any, scheme: any, stateMatch: boolean): number {
    let score = 0.3;
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.eligibility_summary}`.toLowerCase();

    if (!stateMatch) {
      score = Math.max(score - 0.4, 0);
    }

    const userCaste = profile.caste.toLowerCase();
    if (userCaste === 'sc' && (text.includes('scheduled caste') || text.includes(' sc '))) score += 0.25;
    if (userCaste === 'st' && (text.includes('scheduled tribe') || text.includes(' st '))) score += 0.25;
    if (userCaste === 'obc' && (text.includes('other backward') || text.includes('obc'))) score += 0.25;

    const occupation = profile.occupation.toLowerCase();
    
    // Student boost (NEW)
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship') || text.includes('education') || text.includes('internship'))) {
      score += 0.3; // Significant boost for students
    }
    
    // Farmer boost
    if (occupation.includes('farm') && (text.includes('farm') || text.includes('agriculture'))) {
      score += 0.25;
    }
    
    // Trader boost
    if (occupation.includes('trader') && (text.includes('trader') || text.includes('retail') || text.includes('self employed'))) {
      score += 0.2;
    }
    
    // Scientist/Researcher boost
    if (['scientist', 'researcher', 'professor'].some(prof => occupation.includes(prof)) && 
        (text.includes('scientist') || text.includes('researcher') || text.includes('research'))) {
      score += 0.25;
    }

    if (profile.income_range === 'below-1L' && (text.includes('bpl') || text.includes('poor'))) score += 0.15;

    if (profile.gender.toLowerCase() === 'female' && (text.includes('women') || text.includes('girl'))) score += 0.1;

    return Math.min(score, 1.0);
  }

  private generateExplanation(profile: any, scheme: any, eligibilityScore: number, stateMatch: boolean): string[] {
    const explanation: string[] = [];
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.eligibility_summary}`.toLowerCase();

    if (stateMatch) {
      if (text.includes(profile.state.toLowerCase())) {
        explanation.push(`✔ Applicable in ${profile.state}`);
      } else {
        explanation.push('✔ Applicable nationally');
      }
    } else {
      explanation.push('⚠ State-specific scheme (different state)');
    }

    const userCaste = profile.caste.toLowerCase();
    if (userCaste === 'sc' && (text.includes('scheduled caste') || text.includes(' sc '))) {
      explanation.push('✔ SC category eligible');
    }
    if (userCaste === 'st' && (text.includes('scheduled tribe') || text.includes(' st '))) {
      explanation.push('✔ ST category eligible');
    }
    if (userCaste === 'obc' && (text.includes('other backward') || text.includes('obc'))) {
      explanation.push('✔ OBC category eligible');
    }

    const occupation = profile.occupation.toLowerCase();
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship'))) {
      explanation.push('✔ Student beneficiary');
    }
    if (occupation.includes('farm') && text.includes('farm')) {
      explanation.push('✔ Farmer beneficiary');
    }

    if (profile.income_range === 'below-1L' && (text.includes('bpl') || text.includes('poor'))) {
      explanation.push('✔ Low income category');
    }

    if (profile.gender.toLowerCase() === 'female' && (text.includes('women') || text.includes('girl'))) {
      explanation.push('✔ Women/girl beneficiary');
    }

    if (explanation.length === 0) {
      if (eligibilityScore < 0.4) {
        explanation.push('Low relevance - exploratory result');
      } else {
        explanation.push('General eligibility based on profile');
      }
    }

    return explanation;
  }
}
