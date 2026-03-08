import { ProfileStorageService } from './profile-storage-service';
import { GroqQueryRewriter } from './groq-query-rewriter';
import { LLMReranker } from './llm-reranker';
import { FarmerFallbackService } from './farmer-fallback';
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

export class EnhancedSemanticSearchService {
  private profileService: ProfileStorageService;
  private queryRewriter: GroqQueryRewriter;
  private reranker: LLMReranker;
  private farmerFallback: FarmerFallbackService;

  constructor() {
    this.profileService = new ProfileStorageService();
    this.queryRewriter = new GroqQueryRewriter();
    this.reranker = new LLMReranker();
    this.farmerFallback = new FarmerFallbackService();
  }

  async searchSchemesByProfile(profileId: string): Promise<SearchResult> {
    try {
      // Step 1: Get profile data
      const profile = await this.profileService.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      logger.info('Starting enhanced semantic search', {
        profileId,
        age: profile.age,
        gender: profile.gender,
        caste: profile.caste,
        occupation: profile.occupation,
        state: profile.state,
      });

      // Step 2: LLM Query Rewriting with Groq
      const generatedQuery = await this.queryRewriter.rewriteProfileToQuery(profile);
      logger.info('Generated search query', { query: generatedQuery });

      // Step 3: Load schemes and perform keyword-based search
      const rawResults = await this.keywordBasedSearch(profile, generatedQuery);
      logger.info('Keyword search complete', { count: rawResults.length });

      // Step 4: Deduplicate by slug
      const uniqueSchemes = this.deduplicateSchemes(rawResults);
      logger.info('After deduplication', { count: uniqueSchemes.length });

      // Step 5: HARD ELIGIBILITY FILTERING (text-based)
      const eligibleSchemes = this.applyHardEligibilityFilters(uniqueSchemes, profile);
      logger.info('After hard eligibility filtering', { count: eligibleSchemes.length });

      // Step 6: State filtering and eligibility scoring with central scheme detection
      const scoredSchemes = eligibleSchemes.map((scheme: any) => {
        const schemeType = this.detectSchemeType(scheme);
        const stateMatch = this.checkStateMatch(profile, scheme, schemeType);
        const eligibilityScore = this.calculateEnhancedEligibilityScore(profile, scheme, stateMatch);
        const semanticScore = scheme.score || 0;
        
        // Hybrid ranking: 60% semantic + 40% eligibility
        const finalScore = (0.6 * semanticScore) + (0.4 * eligibilityScore);

        const explanation = this.generateAccurateExplanation(profile, scheme, eligibilityScore, stateMatch, schemeType);

        // Improved category labels with state mismatch handling
        let category: 'relevant' | 'exploratory';
        if (schemeType === 'state' && !stateMatch) {
          // State-specific scheme from different state → always exploratory
          category = 'exploratory';
        } else if (finalScore >= 0.8) {
          category = 'relevant'; // Highly Relevant
        } else if (finalScore >= 0.6) {
          category = 'relevant'; // Relevant
        } else if (finalScore >= 0.4) {
          category = 'exploratory'; // Weak Match
        } else {
          category = 'exploratory'; // Exploratory
        }

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
          category,
          state_match: stateMatch,
          scheme_type: schemeType,
        };
      });

      // Step 7: Sort by final score
      scoredSchemes.sort((a, b) => b.final_score - a.final_score);

      // Step 8: Select top 15 candidates for reranking
      const top15Candidates = scoredSchemes.slice(0, 15);
      logger.info('Selected top 15 candidates for reranking', { count: top15Candidates.length });

      // Step 9: LLM Cross-Encoder Reranking
      const rerankedSchemes = await this.reranker.rerankSchemes(profile, top15Candidates);
      logger.info('Reranking complete', { count: rerankedSchemes.length });

      // Step 10: Check Farmer Fallback Condition
      let finalResults = rerankedSchemes.slice(0, 7);
      
      if (this.farmerFallback.shouldTriggerFallback(profile, finalResults)) {
        logger.info('Triggering farmer fallback mode');
        const farmerSchemes = await this.farmerFallback.fetchCentralFarmerSchemes(profile);
        
        if (farmerSchemes.length > 0) {
          // Prepend farmer schemes to results
          finalResults = [...farmerSchemes, ...finalResults].slice(0, 7);
          logger.info('Farmer fallback schemes added', { 
            farmerSchemeCount: farmerSchemes.length,
            totalCount: finalResults.length,
          });
        }
      }

      logger.info('Search complete', {
        total: finalResults.length,
      });

      return {
        generated_query: generatedQuery,
        schemes: finalResults,
      };
    } catch (error: any) {
      logger.error('Error in enhanced semantic search', { error: error.message, stack: error.stack });
      // Return empty results instead of throwing
      return {
        generated_query: 'Error generating query',
        schemes: [],
      };
    }
  }

  private async keywordBasedSearch(profile: any, query: string): Promise<any[]> {
    const fs = require('fs');
    const path = require('path');
    const schemesPath = path.join(__dirname, '../../myscheme_full_1000.json');
    const schemes = JSON.parse(fs.readFileSync(schemesPath, 'utf-8'));

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(w => w.length > 3);

    const scored = schemes.map((scheme: any) => {
      let score = 0.2; // Base score
      const text = `${scheme.name} ${scheme.description} ${scheme.eligibility} ${scheme.benefits}`.toLowerCase();

      // Query word matching
      for (const word of queryWords) {
        if (text.includes(word)) {
          score += 0.05;
        }
      }

      // Specific keyword matching
      if (profile.occupation.toLowerCase().includes('student') && text.includes('student')) score += 0.25;
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
          eligibility_summary: scheme.eligibility_summary,
          benefits: scheme.benefits,
          benefits_summary: scheme.benefits_summary,
          apply_link: scheme.apply_link,
        },
      };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    return scored.slice(0, 50);
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

  // HARD ELIGIBILITY FILTERING - Critical function to filter out ineligible schemes
  private applyHardEligibilityFilters(schemes: any[], profile: any): any[] {
    const filtered: any[] = [];

    for (const scheme of schemes) {
      let rejectScheme = false;
      const schemeText = this.buildSchemeText(scheme);

      // 1️⃣ GENDER FILTER
      const femaleKeywords = ['female', 'women', 'woman', 'girl', 'girl child', 'widow', 'pregnant', 'maternity'];
      const maleKeywords = ['male only', 'men only'];
      
      if (profile.gender.toLowerCase() === 'male') {
        if (femaleKeywords.some((k: string) => schemeText.includes(k))) {
          logger.debug('Rejecting scheme for male user (female-only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      if (profile.gender.toLowerCase() === 'female') {
        if (maleKeywords.some((k: string) => schemeText.includes(k))) {
          logger.debug('Rejecting scheme for female user (male-only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }

      // 2️⃣ DISABILITY FILTER
      const disabilityKeywords = ['disability', 'disabled', 'differently abled', 'persons with disabilities', 'pwd'];
      const userDisabled = profile.disabled || false;
      
      if (!userDisabled && disabilityKeywords.some((k: string) => schemeText.includes(k))) {
        logger.debug('Rejecting scheme (requires disability)', { scheme: scheme.metadata?.name });
        rejectScheme = true;
      }

      // 3️⃣ PROFESSION FILTER (NEW)
      const occupation = profile.occupation.toLowerCase();
      
      // Scientist/Researcher schemes
      const scientistKeywords = ['scientist', 'researcher', 'professor', 'faculty', 'phd', 'research fellowship', 'emeritus'];
      if (scientistKeywords.some((k: string) => schemeText.includes(k))) {
        if (!['scientist', 'researcher', 'professor', 'faculty'].some(prof => occupation.includes(prof))) {
          logger.debug('Rejecting scheme (scientist/researcher only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      // Author/Writer schemes
      const authorKeywords = ['author', 'writer', 'book', 'literary', 'publication'];
      if (authorKeywords.some((k: string) => schemeText.includes(k))) {
        if (!['author', 'writer'].some(prof => occupation.includes(prof))) {
          logger.debug('Rejecting scheme (author/writer only)', { scheme: scheme.metadata?.name });
          rejectScheme = true;
        }
      }
      
      // Artist schemes
      const artistKeywords = ['artist', 'performing arts', 'cultural', 'kalai'];
      if (artistKeywords.some((k: string) => schemeText.includes(k))) {
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

  private detectSchemeType(scheme: any): 'central' | 'state' {
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility}`.toLowerCase();
    
    const centralKeywords = [
      'government of india',
      'ministry of',
      'pradhan mantri',
      'pm ',
      'pm-',
      'national scheme',
      'centrally sponsored',
      'central government',
      'goi',
    ];

    if (centralKeywords.some(keyword => text.includes(keyword))) {
      return 'central';
    }

    return 'state';
  }

  private checkStateMatch(profile: any, scheme: any, schemeType: string): boolean {
    // Central schemes always match
    if (schemeType === 'central') {
      return true;
    }

    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility}`.toLowerCase();
    
    // List of Indian states
    const states = [
      'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
      'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
      'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
      'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
      'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
      'delhi', 'jammu and kashmir', 'ladakh'
    ];

    // Check if scheme mentions any specific state
    let mentionedState: string | null = null;
    for (const state of states) {
      if (text.includes(state)) {
        mentionedState = state;
        break;
      }
    }

    // If no state mentioned, assume it's applicable to all states
    if (!mentionedState) {
      return true;
    }

    // Check if mentioned state matches user state
    const userState = profile.state.toLowerCase();
    return mentionedState === userState;
  }

  private calculateEnhancedEligibilityScore(profile: any, scheme: any, stateMatch: boolean): number {
    let score = 0.3; // Base score
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.eligibility_summary}`.toLowerCase();
    const name = (metadata.name || '').toLowerCase();

    // CRITICAL: State mismatch penalty
    if (!stateMatch) {
      score = Math.max(score - 0.4, 0); // Heavy penalty for state mismatch
    }

    // CRITICAL: Gender-based exclusions (already filtered, but double-check)
    const isMale = profile.gender.toLowerCase() === 'male';
    const isFemale = profile.gender.toLowerCase() === 'female';

    if (isMale && (text.includes('women') || text.includes('girl') || text.includes('widow') || name.includes('women'))) {
      return 0;
    }

    if (isFemale && text.includes('men only')) {
      return 0;
    }

    // CRITICAL: Caste-based filtering (exact match required)
    const userCaste = profile.caste.toLowerCase();
    
    const mentionsSC = text.includes('scheduled caste') || text.includes(' sc ') || text.includes('sc students') || text.includes('sc category');
    const mentionsST = text.includes('scheduled tribe') || text.includes(' st ') || text.includes('st students') || text.includes('st category');
    const mentionsOBC = text.includes('other backward') || text.includes('obc') || text.includes('backward class');

    if (mentionsST && userCaste !== 'st') return 0;
    if (mentionsSC && userCaste !== 'sc') return 0;
    if (mentionsOBC && userCaste !== 'obc') return 0;

    // Positive caste matching
    if (userCaste === 'sc' && mentionsSC) score += 0.25;
    if (userCaste === 'st' && mentionsST) score += 0.25;
    if (userCaste === 'obc' && mentionsOBC) score += 0.25;

    // Age filtering
    if (profile.age < 18 && (text.includes('child') || text.includes('minor'))) score += 0.15;
    if (profile.age >= 18 && profile.age < 30 && text.includes('youth')) score += 0.1;
    if (profile.age >= 60 && (text.includes('senior') || text.includes('pension') || text.includes('old age'))) {
      score += 0.15;
    } else if (profile.age < 60 && (text.includes('senior citizen') || text.includes('old age pension'))) {
      return 0;
    }

    // IMPROVED: Occupation matching with mapping
    const occupation = profile.occupation.toLowerCase();
    
    // Student boost (NEW)
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship') || text.includes('education') || text.includes('internship'))) {
      score += 0.3; // Significant boost for students
    }
    
    // Farmer boost
    if (occupation.includes('farm') && (text.includes('farm') || text.includes('agriculture') || text.includes('kisan'))) {
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

    // Income matching
    if (profile.income_range === 'below-1L' && (text.includes('bpl') || text.includes('poor') || text.includes('low income'))) {
      score += 0.15;
    }

    // Gender positive matching (not exclusion)
    if (isFemale && (text.includes('women') || text.includes('girl'))) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private generateAccurateExplanation(profile: any, scheme: any, eligibilityScore: number, stateMatch: boolean, schemeType: string): string[] {
    const explanation: string[] = [];
    const metadata = scheme.metadata || {};
    const text = `${metadata.name} ${metadata.description} ${metadata.eligibility} ${metadata.eligibility_summary}`.toLowerCase();

    // Scheme type and state match
    if (schemeType === 'central') {
      explanation.push('✔ Central Government Scheme (applicable nationally)');
    } else if (stateMatch) {
      if (text.includes(profile.state.toLowerCase())) {
        explanation.push(`✔ State-specific scheme for ${profile.state}`);
      } else {
        explanation.push('✔ Applicable in your state');
      }
    } else {
      explanation.push('⚠ State-specific scheme (different state)');
    }

    // Caste match (only if scheme explicitly mentions the user's caste)
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

    // Occupation match
    const occupation = profile.occupation.toLowerCase();
    if (occupation.includes('student') && (text.includes('student') || text.includes('scholarship'))) {
      explanation.push('✔ Student beneficiary');
    }
    if (occupation.includes('farm') && (text.includes('farm') || text.includes('agriculture') || text.includes('kisan'))) {
      explanation.push('✔ Farmer/Agriculture beneficiary');
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

    // Gender match
    if (profile.gender.toLowerCase() === 'female' && (text.includes('women') || text.includes('girl'))) {
      explanation.push('✔ Women/girl beneficiary');
    }

    // If no specific matches, add generic explanation
    if (explanation.length === 1) { // Only scheme type explanation
      if (eligibilityScore < 0.4) {
        explanation.push('Low relevance - exploratory result');
      } else {
        explanation.push('General eligibility based on profile');
      }
    }

    return explanation;
  }
}
