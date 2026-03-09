/**
 * Scheme Data Transformation Utilities
 * 
 * This module provides functions to transform PersonalizedScheme data
 * (from AI recommendations) to SchemeRecommendation format (for UI components)
 * and to API request formats.
 */

import { PersonalizedScheme } from '../components/PersonalizedResultsDisplay';
import { SchemeRecommendation, GovernmentScheme, InterestedSchemeCreateRequest } from '../types';

/**
 * Transforms a PersonalizedScheme to SchemeRecommendation format
 * 
 * This function converts the AI recommendation data structure to the format
 * expected by the SchemeDetailDialog component. It handles optional fields
 * gracefully and provides appropriate defaults.
 * 
 * @param scheme - The PersonalizedScheme object from AI recommendations
 * @returns SchemeRecommendation object suitable for UI components
 * 
 * @example
 * const personalizedScheme = {
 *   name: "PM-KISAN",
 *   slug: "pm-kisan",
 *   ministry: "Ministry of Agriculture",
 *   final_score: 0.85,
 *   explanation: ["You are a farmer", "Income eligible"]
 * };
 * const recommendation = transformToSchemeRecommendation(personalizedScheme);
 */
export function transformToSchemeRecommendation(
  scheme: PersonalizedScheme
): SchemeRecommendation {
  // Extract confidence score from various possible fields
  const confidenceScore = scheme.final_score || 
                          (typeof scheme.confidence === 'number' ? scheme.confidence : 
                           typeof scheme.confidence === 'string' ? parseFloat(scheme.confidence) : 0.8);

  // Extract eligibility explanation from various possible fields
  const eligibilityExplanation = 
    (scheme.explanation && scheme.explanation.length > 0 ? scheme.explanation.join(' ') : '') ||
    scheme.reason ||
    scheme.eligibility_analysis ||
    'Matched based on your profile';

  // Extract personalized explanation (benefits) from various possible fields
  const personalizedExplanation = 
    scheme.benefits_summary ||
    scheme.benefits ||
    scheme.reasoning ||
    '';

  // Create the GovernmentScheme object
  const governmentScheme: GovernmentScheme = {
    schemeId: scheme.schemeId || scheme.id || scheme.slug,
    officialName: scheme.name,
    localizedName: scheme.name,
    shortDescription: scheme.description || '',
    category: scheme.category || 'general',
    level: (scheme.scheme_type as 'central' | 'state') || 'central',
    estimatedBenefit: scheme.estimatedBenefit,
    officialWebsite: scheme.apply_link || undefined,
    helplineNumber: undefined,
  };

  // Create and return the SchemeRecommendation object
  return {
    scheme: governmentScheme,
    eligibility: {
      eligible: true,
      confidence: confidenceScore,
      explanation: eligibilityExplanation,
    },
    estimatedBenefit: scheme.estimatedBenefit || 0,
    priority: 1,
    personalizedExplanation: personalizedExplanation,
  };
}

/**
 * Transforms a PersonalizedScheme to InterestedSchemeCreateRequest format
 * 
 * This function converts the AI recommendation data structure to the format
 * expected by the Interest Service API endpoint at /api/v1/interested-schemes.
 * It includes the profile_id and maps all scheme fields appropriately, providing
 * empty string defaults for missing fields.
 * 
 * @param scheme - The PersonalizedScheme object from AI recommendations
 * @param profileId - The user's profile ID
 * @returns InterestedSchemeCreateRequest object suitable for API submission
 * 
 * @example
 * const personalizedScheme = {
 *   name: "PM-KISAN",
 *   slug: "pm-kisan",
 *   description: "Income support for farmers",
 *   ministry: "Ministry of Agriculture",
 *   benefits_summary: "₹6000 per year",
 *   apply_link: "https://pmkisan.gov.in"
 * };
 * const apiRequest = transformForAPI(personalizedScheme, "user-123");
 */
export function transformForAPI(
  scheme: PersonalizedScheme,
  profileId: string
): InterestedSchemeCreateRequest {
  // Extract benefits from various possible fields
  const schemeBenefits = scheme.benefits_summary || scheme.benefits || '';

  return {
    profile_id: profileId,
    scheme_name: scheme.name,
    scheme_slug: scheme.slug,
    scheme_description: scheme.description || '',
    scheme_benefits: schemeBenefits,
    scheme_ministry: scheme.ministry,
    scheme_apply_link: scheme.apply_link || '',
  };
}
