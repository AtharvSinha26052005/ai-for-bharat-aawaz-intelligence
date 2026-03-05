import { UserProfile, GovernmentScheme, SchemeRecommendation, Language } from '../../types';
import { eligibilityService } from '../eligibility/eligibility-service';
import { ragService } from '../rag/rag-service';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';

/**
 * Scheme Engine Service
 * Handles scheme discovery, ranking, and explanation
 */
export class SchemeService {
  /**
   * Gets eligible schemes for a user with ranking
   * @param userId - User ID
   * @returns Array of scheme recommendations
   */
  async getEligibleSchemes(userId: string): Promise<SchemeRecommendation[]> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);

      // Get all active schemes
      const schemes = await this.getAllActiveSchemes(profile.location.state);

      // Batch evaluate eligibility
      const evaluations = await eligibilityService.batchEvaluate(profile, schemes);

      // Filter eligible schemes
      const eligibleSchemes = evaluations.filter((e) => e.result.eligible);

      // Rank schemes by benefit value
      const recommendations = await Promise.all(
        eligibleSchemes.map(async (e) => {
          const estimatedBenefit = this.estimateBenefitValue(e.scheme, profile);
          const personalizedExplanation = await this.generatePersonalizedExplanation(
            e.scheme,
            profile
          );

          return {
            scheme: e.scheme,
            eligibilityResult: e.result,
            estimatedBenefit,
            priority: this.calculatePriority(e.scheme, profile, estimatedBenefit),
            personalizedExplanation,
          };
        })
      );

      // Sort by priority (descending)
      recommendations.sort((a, b) => b.priority - a.priority);

      logger.info('Eligible schemes retrieved', {
        userId,
        totalSchemes: schemes.length,
        eligibleCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to get eligible schemes', { userId, error });
      throw error;
    }
  }

  /**
   * Gets scheme details by ID
   * @param schemeId - Scheme ID
   * @param language - Preferred language
   * @returns Government scheme
   */
  async getSchemeById(schemeId: string, language: Language = 'en'): Promise<GovernmentScheme> {
    try {
      const query = `
        SELECT s.*, sc.localized_name, sc.short_description, sc.detailed_description
        FROM schemes s
        LEFT JOIN scheme_content sc ON s.scheme_id = sc.scheme_id AND sc.language = $2
        WHERE s.scheme_id = $1 AND s.active = true
      `;

      const result = await db.query(query, [schemeId, language]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Scheme not found');
      }

      const scheme = this.mapRowToScheme(result.rows[0]);

      logger.info('Scheme retrieved', { schemeId, language });

      return scheme;
    } catch (error) {
      logger.error('Failed to get scheme', { schemeId, error });
      throw error;
    }
  }

  /**
   * Searches schemes by query
   * @param query - Search query
   * @param language - Preferred language
   * @param filters - Optional filters
   * @returns Array of schemes
   */
  async searchSchemes(
    query: string,
    language: Language,
    filters?: {
      category?: string[];
      level?: 'central' | 'state';
      state?: string;
    }
  ): Promise<GovernmentScheme[]> {
    try {
      // Use RAG system for semantic search
      const ragResponse = await ragService.retrieveAndGenerate(query, language);

      // Extract scheme IDs from sources
      const schemeIds = ragResponse.sources
        .map((s) => s.metadata.schemeId)
        .filter((id): id is string => id !== undefined);

      if (schemeIds.length === 0) {
        return [];
      }

      // Fetch full scheme details
      const schemes = await Promise.all(
        schemeIds.map((id) => this.getSchemeById(id, language))
      );

      // Apply filters
      let filteredSchemes = schemes;

      if (filters?.category) {
        filteredSchemes = filteredSchemes.filter((s) => filters.category!.includes(s.category));
      }

      if (filters?.level) {
        filteredSchemes = filteredSchemes.filter((s) => s.level === filters.level);
      }

      if (filters?.state) {
        filteredSchemes = filteredSchemes.filter(
          (s) => s.level === 'central' || s.state === filters.state
        );
      }

      logger.info('Schemes searched', {
        query: query.substring(0, 100),
        language,
        resultsCount: filteredSchemes.length,
      });

      return filteredSchemes;
    } catch (error) {
      logger.error('Scheme search failed', { query, error });
      throw error;
    }
  }

  /**
   * Generates personalized explanation for a scheme
   * @param scheme - Government scheme
   * @param profile - User profile
   * @returns Personalized explanation
   */
  private async generatePersonalizedExplanation(
    scheme: GovernmentScheme,
    profile: UserProfile
  ): Promise<string> {
    try {
      // Build context-aware query
      const query = `Explain the ${scheme.officialName} scheme for a ${profile.age} year old ${profile.occupation} from ${profile.location.district}, ${profile.location.state} with income ${profile.incomeRange}`;

      // Use RAG to generate personalized explanation
      const response = await ragService.retrieveAndGenerate(
        query,
        profile.preferredLanguage,
        profile
      );

      return response.answer;
    } catch (error) {
      logger.error('Failed to generate personalized explanation', { schemeId: scheme.schemeId, error });
      // Fallback to basic description
      return scheme.shortDescription[profile.preferredLanguage] || scheme.officialName;
    }
  }

  /**
   * Estimates benefit value for a scheme
   * @param scheme - Government scheme
   * @param profile - User profile
   * @returns Estimated benefit in INR
   */
  private estimateBenefitValue(scheme: GovernmentScheme, profile: UserProfile): number {
    let totalBenefit = 0;

    for (const benefit of scheme.benefits) {
      if (benefit.amount) {
        // Calculate total based on frequency
        switch (benefit.frequency) {
          case 'one-time':
            totalBenefit += benefit.amount;
            break;
          case 'monthly':
            totalBenefit += benefit.amount * 12; // Annual value
            break;
          case 'annual':
            totalBenefit += benefit.amount;
            break;
        }
      } else {
        // Assign default value for non-monetary benefits
        totalBenefit += 10000; // Placeholder value
      }
    }

    return totalBenefit;
  }

  /**
   * Calculates priority score for scheme ranking
   * @param scheme - Government scheme
   * @param profile - User profile
   * @param estimatedBenefit - Estimated benefit value
   * @returns Priority score
   */
  private calculatePriority(
    scheme: GovernmentScheme,
    profile: UserProfile,
    estimatedBenefit: number
  ): number {
    let priority = 0;

    // Benefit value (40% weight)
    priority += (estimatedBenefit / 100000) * 40;

    // Category match with user needs (30% weight)
    const categoryMatch = profile.primaryNeeds.some((need) =>
      scheme.category.toLowerCase().includes(need.toLowerCase())
    );
    if (categoryMatch) {
      priority += 30;
    }

    // Scheme level preference (20% weight) - prefer central schemes
    if (scheme.level === 'central') {
      priority += 20;
    } else {
      priority += 10;
    }

    // Recency (10% weight) - prefer newer schemes
    const monthsSinceLaunch = this.getMonthsSince(scheme.launchDate);
    if (monthsSinceLaunch < 12) {
      priority += 10;
    } else if (monthsSinceLaunch < 24) {
      priority += 5;
    }

    return priority;
  }

  /**
   * Gets all active schemes
   * @param state - User's state (optional)
   * @returns Array of schemes
   */
  private async getAllActiveSchemes(state?: string): Promise<GovernmentScheme[]> {
    try {
      const query = `
        SELECT DISTINCT s.*
        FROM schemes s
        WHERE s.active = true
          AND (s.level = 'central' OR s.state = $1)
        ORDER BY s.launch_date DESC
      `;

      const result = await db.query(query, [state || '']);

      return result.rows.map((row) => this.mapRowToScheme(row));
    } catch (error) {
      logger.error('Failed to get active schemes', { error });
      return [];
    }
  }

  /**
   * Gets user profile from database
   * @param userId - User ID
   * @returns User profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    // Map database row to UserProfile (simplified)
    const row = result.rows[0];
    return {
      userId: row.user_id,
      age: row.age,
      incomeRange: row.income_range,
      occupation: row.occupation,
      familyComposition: {
        adults: row.family_adults,
        children: row.family_children,
        seniors: row.family_seniors,
      },
      location: {
        state: row.location_state,
        district: row.location_district,
        block: row.location_block,
        village: row.location_village,
        pincode: row.location_pincode,
      },
      primaryNeeds: row.primary_needs,
      preferredLanguage: row.preferred_language,
      preferredMode: row.preferred_mode,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  }

  /**
   * Maps database row to GovernmentScheme object
   * @param row - Database row
   * @returns Government scheme
   */
  private mapRowToScheme(row: Record<string, any>): GovernmentScheme {
    return {
      schemeId: row.scheme_id,
      officialName: row.official_name,
      localizedNames: {
        hi: row.localized_name || row.official_name,
        ta: row.localized_name || row.official_name,
        te: row.localized_name || row.official_name,
        bn: row.localized_name || row.official_name,
        mr: row.localized_name || row.official_name,
        en: row.official_name,
      },
      shortDescription: {
        hi: row.short_description || '',
        ta: row.short_description || '',
        te: row.short_description || '',
        bn: row.short_description || '',
        mr: row.short_description || '',
        en: row.short_description || '',
      },
      detailedDescription: {
        hi: row.detailed_description || '',
        ta: row.detailed_description || '',
        te: row.detailed_description || '',
        bn: row.detailed_description || '',
        mr: row.detailed_description || '',
        en: row.detailed_description || '',
      },
      category: row.category,
      level: row.level,
      state: row.state,
      launchDate: row.launch_date,
      endDate: row.end_date,
      active: row.active,
      benefits: [], // Would be loaded separately
      eligibilityRules: [], // Would be loaded separately
      requiredDocuments: [], // Would be loaded separately
      officialWebsite: row.official_website,
      helplineNumber: row.helpline_number,
      officialSources: [],
      metadata: {
        lastUpdated: row.last_updated,
        version: row.version,
        updatedBy: 'system',
        verificationStatus: row.verification_status,
      },
    };
  }

  /**
   * Calculates months since a date
   * @param date - Date to calculate from
   * @returns Number of months
   */
  private getMonthsSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
  }
}

export const schemeService = new SchemeService();
