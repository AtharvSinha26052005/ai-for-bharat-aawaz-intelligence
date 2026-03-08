import { SemanticSearchProfile } from '../../types';
import { SearchResult } from './vector-store';
import logger from '../../utils/logger';

/**
 * Eligibility signals extracted from user profile
 */
export interface EligibilitySignals {
  isStudent: boolean;
  isSeniorCitizen: boolean;
  isLowIncome: boolean;
  isFemale: boolean;
  isMale: boolean;
  isMinority: boolean; // SC/ST/OBC
  state: string;
  ageGroup: 'child' | 'youth' | 'adult' | 'senior';
  incomeCategory: 'bpl' | 'low' | 'medium' | 'high';
}

/**
 * Service for filtering schemes based on eligibility signals
 * This is the "smart filtering layer" that removes obviously irrelevant schemes
 * before sending to Groq for detailed analysis.
 * 
 * This significantly improves accuracy and reduces API costs.
 */
export class EligibilityFilterService {
  /**
   * Extract eligibility signals from user profile
   * @param profile - User profile
   * @returns Extracted signals
   */
  extractSignals(profile: SemanticSearchProfile): EligibilitySignals {
    const { age, income, gender, caste, state } = profile;

    // Determine age group
    let ageGroup: 'child' | 'youth' | 'adult' | 'senior';
    if (age < 18) ageGroup = 'child';
    else if (age < 30) ageGroup = 'youth';
    else if (age < 60) ageGroup = 'adult';
    else ageGroup = 'senior';

    // Determine income category
    let incomeCategory: 'bpl' | 'low' | 'medium' | 'high';
    if (income < 50000) incomeCategory = 'bpl'; // Below Poverty Line
    else if (income < 300000) incomeCategory = 'low';
    else if (income < 1000000) incomeCategory = 'medium';
    else incomeCategory = 'high';

    return {
      isStudent: age >= 5 && age <= 30 && income < 500000,
      isSeniorCitizen: age >= 60,
      isLowIncome: income < 300000,
      isFemale: gender === 'Female',
      isMale: gender === 'Male',
      isMinority: ['SC', 'ST', 'OBC'].includes(caste),
      state: state.toLowerCase(),
      ageGroup,
      incomeCategory,
    };
  }

  /**
   * Filter schemes based on eligibility signals
   * Removes schemes that obviously don't match the user profile
   * @param schemes - Array of schemes from Pinecone
   * @param profile - User profile
   * @returns Filtered array of schemes
   */
  filterSchemes(schemes: SearchResult[], profile: SemanticSearchProfile): SearchResult[] {
    const signals = this.extractSignals(profile);

    logger.info('Filtering schemes with eligibility signals', {
      totalSchemes: schemes.length,
      signals: {
        isStudent: signals.isStudent,
        isSeniorCitizen: signals.isSeniorCitizen,
        isLowIncome: signals.isLowIncome,
        isFemale: signals.isFemale,
        isMinority: signals.isMinority,
      },
    });

    const filtered = schemes.filter((scheme) => {
      // Combine all text fields for keyword matching
      const text = [
        scheme.metadata.name,
        scheme.metadata.category || '',
        scheme.metadata.ministry || '',
        scheme.metadata.level || '',
      ]
        .join(' ')
        .toLowerCase();

      // Rule 1: Student schemes
      if (signals.isStudent) {
        // If user is a student, prioritize student/education schemes
        if (this.containsKeywords(text, ['student', 'education', 'scholarship', 'school', 'college', 'university'])) {
          return true; // Keep student schemes
        }
      }

      // Rule 2: Senior citizen schemes
      if (signals.isSeniorCitizen) {
        // If user is senior citizen, keep senior schemes
        if (this.containsKeywords(text, ['senior', 'pension', 'elderly', 'old age'])) {
          return true;
        }
        // Remove schemes explicitly for youth/children
        if (this.containsKeywords(text, ['youth', 'child', 'student', 'school'])) {
          return false;
        }
      }

      // Rule 3: Remove farmer schemes if not relevant
      if (this.containsKeywords(text, ['farmer', 'agriculture', 'crop', 'kisan'])) {
        // Keep only if low income (farmers are typically low income)
        if (!signals.isLowIncome) {
          return false;
        }
      }

      // Rule 4: Remove business/startup schemes if low income
      if (this.containsKeywords(text, ['startup', 'business', 'entrepreneur', 'msme'])) {
        if (signals.incomeCategory === 'bpl' || signals.incomeCategory === 'low') {
          return false; // Low income users unlikely to start businesses
        }
      }

      // Rule 5: Women-specific schemes
      if (signals.isFemale) {
        // Prioritize women schemes
        if (this.containsKeywords(text, ['women', 'girl', 'female', 'mahila', 'beti'])) {
          return true;
        }
      }

      // Rule 6: Minority schemes (SC/ST/OBC)
      if (signals.isMinority) {
        // Prioritize minority schemes
        if (this.containsKeywords(text, ['sc', 'st', 'obc', 'minority', 'backward'])) {
          return true;
        }
      }

      // Rule 7: Remove schemes for wrong age group
      if (signals.ageGroup === 'child' && this.containsKeywords(text, ['senior', 'pension', 'elderly'])) {
        return false;
      }

      if (signals.ageGroup === 'senior' && this.containsKeywords(text, ['child', 'school'])) {
        return false;
      }

      // Rule 8: State-specific schemes
      if (scheme.metadata.state) {
        const schemeState = scheme.metadata.state.toLowerCase();
        // If scheme is state-specific and doesn't match user's state, remove it
        if (schemeState !== 'all india' && schemeState !== signals.state) {
          return false;
        }
      }

      // Default: keep the scheme
      return true;
    });

    logger.info('Eligibility filtering complete', {
      originalCount: schemes.length,
      filteredCount: filtered.length,
      removedCount: schemes.length - filtered.length,
    });

    return filtered;
  }

  /**
   * Check if text contains any of the keywords
   * @param text - Text to search in
   * @param keywords - Array of keywords
   * @returns True if any keyword is found
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

// Export singleton instance
export const eligibilityFilterService = new EligibilityFilterService();
