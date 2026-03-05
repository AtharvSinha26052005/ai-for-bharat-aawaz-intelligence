import { UserProfile, GovernmentScheme, EligibilityResult, EligibilityRule, Language } from '../../types';
import { ruleEvaluator } from './rule-evaluator';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { eligibilityEvaluations } from '../../utils/metrics';

/**
 * Eligibility Reasoner Service
 * Determines user eligibility for government schemes
 */
export class EligibilityService {
  /**
   * Evaluates eligibility for a single scheme
   * @param profile - User profile
   * @param scheme - Government scheme
   * @returns Eligibility result
   */
  async evaluateEligibility(
    profile: UserProfile,
    scheme: GovernmentScheme
  ): Promise<EligibilityResult> {
    try {
      // Get eligibility rules for the scheme
      const rules = await this.getSchemeRules(scheme.schemeId);

      if (rules.length === 0) {
        // No rules means everyone is eligible
        return {
          eligible: true,
          confidence: 1.0,
          explanation: 'No specific eligibility criteria',
          missingCriteria: [],
          ruleResults: [],
        };
      }

      // Evaluate each rule
      const ruleResults = rules.map((rule) => ruleEvaluator.evaluateRule(rule, profile));

      // Determine overall eligibility
      // Group rules by operator
      const andRules = ruleResults.filter((_, i) => rules[i].operator === 'AND' || !rules[i].operator);
      const orRules = ruleResults.filter((_, i) => rules[i].operator === 'OR');

      // All AND rules must pass
      const andPassed = andRules.length === 0 || andRules.every((r) => r.passed);

      // At least one OR rule must pass (if any OR rules exist)
      const orPassed = orRules.length === 0 || orRules.some((r) => r.passed);

      const eligible = andPassed && orPassed;

      // Calculate confidence score
      const confidence = this.calculateConfidence(ruleResults);

      // Generate explanation
      const explanation = this.generateExplanation(eligible, ruleResults, profile.preferredLanguage);

      // Identify missing criteria
      const missingCriteria = ruleResults
        .filter((r) => !r.passed)
        .map((r) => r.reason);

      // Record metrics
      eligibilityEvaluations.inc({ result: eligible ? 'eligible' : 'ineligible' });

      logger.info('Eligibility evaluated', {
        userId: profile.userId,
        schemeId: scheme.schemeId,
        eligible,
        confidence,
      });

      return {
        eligible,
        confidence,
        explanation,
        missingCriteria,
        ruleResults,
      };
    } catch (error) {
      logger.error('Eligibility evaluation failed', {
        userId: profile.userId,
        schemeId: scheme.schemeId,
        error,
      });
      throw error;
    }
  }

  /**
   * Batch evaluates eligibility for multiple schemes
   * @param profile - User profile
   * @param schemes - Array of government schemes
   * @returns Array of eligibility results
   */
  async batchEvaluate(
    profile: UserProfile,
    schemes: GovernmentScheme[]
  ): Promise<Array<{ scheme: GovernmentScheme; result: EligibilityResult }>> {
    const results = await Promise.all(
      schemes.map(async (scheme) => ({
        scheme,
        result: await this.evaluateEligibility(profile, scheme),
      }))
    );

    return results;
  }

  /**
   * Explains why a user is ineligible for a scheme
   * @param profile - User profile
   * @param scheme - Government scheme
   * @param language - Preferred language
   * @returns Explanation text
   */
  async explainIneligibility(
    profile: UserProfile,
    scheme: GovernmentScheme,
    language: Language = 'en'
  ): Promise<string> {
    const result = await this.evaluateEligibility(profile, scheme);

    if (result.eligible) {
      return this.getTranslation('You are eligible for this scheme', language);
    }

    const reasons = result.missingCriteria.join('. ');
    const prefix = this.getTranslation('You are not eligible because', language);

    return `${prefix}: ${reasons}`;
  }

  /**
   * Gets eligibility rules for a scheme from database
   * @param schemeId - Scheme ID
   * @returns Array of eligibility rules
   */
  private async getSchemeRules(schemeId: string): Promise<EligibilityRule[]> {
    try {
      const query = `
        SELECT rule_id, scheme_id, rule_type, operator, parameters, priority, description
        FROM eligibility_rules
        WHERE scheme_id = $1
        ORDER BY priority DESC
      `;

      const result = await db.query(query, [schemeId]);

      return result.rows.map((row) => ({
        ruleId: row.rule_id,
        schemeId: row.scheme_id,
        type: row.rule_type,
        operator: row.operator || 'AND',
        parameters: row.parameters,
        description: row.description || {},
        priority: row.priority,
      }));
    } catch (error) {
      logger.error('Failed to fetch scheme rules', { schemeId, error });
      return [];
    }
  }

  /**
   * Calculates confidence score for eligibility determination
   * @param ruleResults - Array of rule results
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(ruleResults: any[]): number {
    if (ruleResults.length === 0) {
      return 1.0;
    }

    const passedCount = ruleResults.filter((r) => r.passed).length;
    return passedCount / ruleResults.length;
  }

  /**
   * Generates human-readable explanation
   * @param eligible - Whether user is eligible
   * @param ruleResults - Rule evaluation results
   * @param language - Preferred language
   * @returns Explanation text
   */
  private generateExplanation(
    eligible: boolean,
    ruleResults: any[],
    language: Language
  ): string {
    if (eligible) {
      const prefix = this.getTranslation('You are eligible for this scheme', language);
      const passedRules = ruleResults.filter((r) => r.passed);

      if (passedRules.length > 0) {
        const reasons = passedRules.map((r) => r.reason).join(', ');
        return `${prefix}. ${reasons}`;
      }

      return prefix;
    } else {
      const prefix = this.getTranslation('You are not eligible for this scheme', language);
      const failedRules = ruleResults.filter((r) => !r.passed);

      if (failedRules.length > 0) {
        const reasons = failedRules.map((r) => r.reason).join(', ');
        return `${prefix}. ${reasons}`;
      }

      return prefix;
    }
  }

  /**
   * Gets translation for a text (placeholder)
   * In production, this would use the Translation Service
   * @param text - Text to translate
   * @param language - Target language
   * @returns Translated text
   */
  private getTranslation(text: string, language: Language): string {
    // Placeholder translations
    const translations: Record<string, Record<Language, string>> = {
      'You are eligible for this scheme': {
        hi: 'आप इस योजना के लिए पात्र हैं',
        ta: 'இந்த திட்டத்திற்கு நீங்கள் தகுதியுடையவர்',
        te: 'మీరు ఈ పథకానికి అర్హులు',
        bn: 'আপনি এই প্রকল্পের জন্য যোগ্য',
        mr: 'तुम्ही या योजनेसाठी पात्र आहात',
        en: 'You are eligible for this scheme',
      },
      'You are not eligible for this scheme': {
        hi: 'आप इस योजना के लिए पात्र नहीं हैं',
        ta: 'இந்த திட்டத்திற்கு நீங்கள் தகுதியற்றவர்',
        te: 'మీరు ఈ పథకానికి అర్హులు కాదు',
        bn: 'আপনি এই প্রকল্পের জন্য যোগ্য নন',
        mr: 'तुम्ही या योजनेसाठी पात्र नाही',
        en: 'You are not eligible for this scheme',
      },
      'You are not eligible because': {
        hi: 'आप पात्र नहीं हैं क्योंकि',
        ta: 'நீங்கள் தகுதியற்றவர் ஏனெனில்',
        te: 'మీరు అర్హులు కాదు ఎందుకంటే',
        bn: 'আপনি যোগ্য নন কারণ',
        mr: 'तुम्ही पात्र नाही कारण',
        en: 'You are not eligible because',
      },
    };

    return translations[text]?.[language] || text;
  }

  /**
   * Suggests actions to become eligible
   * @param profile - User profile
   * @param scheme - Government scheme
   * @param language - Preferred language
   * @returns Array of suggested actions
   */
  async suggestActions(
    profile: UserProfile,
    scheme: GovernmentScheme,
    language: Language = 'en'
  ): Promise<string[]> {
    const result = await this.evaluateEligibility(profile, scheme);

    if (result.eligible) {
      return [];
    }

    const suggestions: string[] = [];

    // Analyze missing criteria and suggest actions
    for (const criteria of result.missingCriteria) {
      if (criteria.includes('age')) {
        suggestions.push(
          this.getTranslation('Wait until you meet the age requirement', language)
        );
      } else if (criteria.includes('income')) {
        suggestions.push(
          this.getTranslation('Check if your income calculation is correct', language)
        );
      } else if (criteria.includes('location')) {
        suggestions.push(
          this.getTranslation('Check if there are similar schemes in your area', language)
        );
      } else if (criteria.includes('occupation')) {
        suggestions.push(
          this.getTranslation('Look for schemes specific to your occupation', language)
        );
      } else if (criteria.includes('document')) {
        suggestions.push(
          this.getTranslation('Obtain the required documents', language)
        );
      }
    }

    return suggestions;
  }
}

export const eligibilityService = new EligibilityService();
