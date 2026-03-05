import {
  UserProfile,
  EligibilityRule,
  RuleResult,
  AgeRangeParams,
  IncomeThresholdParams,
  LocationParams,
  OccupationParams,
  FamilyCompositionParams,
  CustomParams,
} from '../../types';
import logger from '../../utils/logger';

/**
 * Rule Evaluator
 * Evaluates individual eligibility rules against user profiles
 */
export class RuleEvaluator {
  /**
   * Evaluates a single rule against a user profile
   * @param rule - Eligibility rule
   * @param profile - User profile
   * @returns Rule evaluation result
   */
  evaluateRule(rule: EligibilityRule, profile: UserProfile): RuleResult {
    try {
      let passed = false;
      let reason = '';

      switch (rule.type) {
        case 'age_range':
          ({ passed, reason } = this.evaluateAgeRange(rule.parameters as AgeRangeParams, profile));
          break;

        case 'income_threshold':
          ({ passed, reason } = this.evaluateIncomeThreshold(
            rule.parameters as IncomeThresholdParams,
            profile
          ));
          break;

        case 'location':
          ({ passed, reason } = this.evaluateLocation(rule.parameters as LocationParams, profile));
          break;

        case 'occupation':
          ({ passed, reason } = this.evaluateOccupation(
            rule.parameters as OccupationParams,
            profile
          ));
          break;

        case 'family_composition':
          ({ passed, reason } = this.evaluateFamilyComposition(
            rule.parameters as FamilyCompositionParams,
            profile
          ));
          break;

        case 'custom':
          ({ passed, reason } = this.evaluateCustom(rule.parameters as CustomParams, profile));
          break;

        default:
          passed = false;
          reason = `Unknown rule type: ${rule.type}`;
      }

      // Apply operator (NOT)
      if (rule.operator === 'NOT') {
        passed = !passed;
        reason = passed ? `NOT (${reason})` : reason;
      }

      return {
        rule: rule.ruleId,
        passed,
        reason,
      };
    } catch (error) {
      logger.error('Rule evaluation failed', { ruleId: rule.ruleId, error });
      return {
        rule: rule.ruleId,
        passed: false,
        reason: 'Rule evaluation error',
      };
    }
  }

  /**
   * Evaluates age range rule
   */
  private evaluateAgeRange(
    params: AgeRangeParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    const { minAge, maxAge } = params;

    if (minAge !== undefined && profile.age < minAge) {
      return {
        passed: false,
        reason: `Age ${profile.age} is below minimum ${minAge}`,
      };
    }

    if (maxAge !== undefined && profile.age > maxAge) {
      return {
        passed: false,
        reason: `Age ${profile.age} is above maximum ${maxAge}`,
      };
    }

    return {
      passed: true,
      reason: `Age ${profile.age} is within range ${minAge || 0}-${maxAge || 120}`,
    };
  }

  /**
   * Evaluates income threshold rule
   */
  private evaluateIncomeThreshold(
    params: IncomeThresholdParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    const incomeNumeric = this.incomeToNumeric(profile.incomeRange);

    if (incomeNumeric > params.maxIncome) {
      return {
        passed: false,
        reason: `Income ${profile.incomeRange} exceeds maximum ${params.maxIncome}`,
      };
    }

    if (params.includeRange && !params.includeRange.includes(profile.incomeRange)) {
      return {
        passed: false,
        reason: `Income range ${profile.incomeRange} not in allowed ranges`,
      };
    }

    return {
      passed: true,
      reason: `Income ${profile.incomeRange} meets threshold`,
    };
  }

  /**
   * Evaluates location rule
   */
  private evaluateLocation(
    params: LocationParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    // Check eligible states
    if (params.eligibleStates && !params.eligibleStates.includes(profile.location.state)) {
      return {
        passed: false,
        reason: `State ${profile.location.state} not in eligible states`,
      };
    }

    // Check eligible districts
    if (
      params.eligibleDistricts &&
      !params.eligibleDistricts.includes(profile.location.district)
    ) {
      return {
        passed: false,
        reason: `District ${profile.location.district} not in eligible districts`,
      };
    }

    // Check rural/urban requirement
    if (params.ruralOnly && profile.location.village === undefined) {
      return {
        passed: false,
        reason: 'Scheme is only for rural areas',
      };
    }

    if (params.urbanOnly && profile.location.village !== undefined) {
      return {
        passed: false,
        reason: 'Scheme is only for urban areas',
      };
    }

    return {
      passed: true,
      reason: `Location ${profile.location.state}, ${profile.location.district} is eligible`,
    };
  }

  /**
   * Evaluates occupation rule
   */
  private evaluateOccupation(
    params: OccupationParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    const occupation = profile.occupation.toLowerCase();

    // Check excluded occupations
    if (params.excludedOccupations) {
      const excluded = params.excludedOccupations.some((occ) =>
        occupation.includes(occ.toLowerCase())
      );
      if (excluded) {
        return {
          passed: false,
          reason: `Occupation ${profile.occupation} is excluded`,
        };
      }
    }

    // Check eligible occupations
    if (params.eligibleOccupations) {
      const eligible = params.eligibleOccupations.some((occ) =>
        occupation.includes(occ.toLowerCase())
      );
      if (!eligible) {
        return {
          passed: false,
          reason: `Occupation ${profile.occupation} not in eligible occupations`,
        };
      }
    }

    return {
      passed: true,
      reason: `Occupation ${profile.occupation} is eligible`,
    };
  }

  /**
   * Evaluates family composition rule
   */
  private evaluateFamilyComposition(
    params: FamilyCompositionParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    const { adults, children, seniors } = profile.familyComposition;

    if (params.minChildren !== undefined && children < params.minChildren) {
      return {
        passed: false,
        reason: `Number of children ${children} is below minimum ${params.minChildren}`,
      };
    }

    if (params.maxChildren !== undefined && children > params.maxChildren) {
      return {
        passed: false,
        reason: `Number of children ${children} exceeds maximum ${params.maxChildren}`,
      };
    }

    if (params.minSeniors !== undefined && seniors < params.minSeniors) {
      return {
        passed: false,
        reason: `Number of seniors ${seniors} is below minimum ${params.minSeniors}`,
      };
    }

    if (params.requiresDependent && children === 0 && seniors === 0) {
      return {
        passed: false,
        reason: 'Scheme requires at least one dependent (child or senior)',
      };
    }

    return {
      passed: true,
      reason: 'Family composition meets requirements',
    };
  }

  /**
   * Evaluates custom rule
   */
  private evaluateCustom(
    params: CustomParams,
    profile: UserProfile
  ): { passed: boolean; reason: string } {
    try {
      // This is a simplified implementation
      // In production, you would use a safe expression evaluator
      // For now, we'll just return true
      return {
        passed: true,
        reason: 'Custom rule evaluation not fully implemented',
      };
    } catch (error) {
      return {
        passed: false,
        reason: 'Custom rule evaluation failed',
      };
    }
  }

  /**
   * Converts income range to numeric value for comparison
   */
  private incomeToNumeric(incomeRange: string): number {
    const map: Record<string, number> = {
      'below-1L': 50000,
      '1L-3L': 200000,
      '3L-5L': 400000,
      'above-5L': 600000,
    };
    return map[incomeRange] || 0;
  }

  /**
   * Combines multiple rule results using AND/OR operators
   * @param results - Array of rule results
   * @param operator - Combination operator
   * @returns Combined result
   */
  combineResults(results: RuleResult[], operator: 'AND' | 'OR'): boolean {
    if (results.length === 0) {
      return true;
    }

    if (operator === 'AND') {
      return results.every((r) => r.passed);
    } else {
      return results.some((r) => r.passed);
    }
  }
}

export const ruleEvaluator = new RuleEvaluator();
