/**
 * Unit tests for scheme transformation utilities
 */

import { transformToSchemeRecommendation, transformForAPI } from './schemeTransformers';
import { PersonalizedScheme } from '../components/PersonalizedResultsDisplay';

describe('transformToSchemeRecommendation', () => {
  it('should transform a complete PersonalizedScheme to SchemeRecommendation', () => {
    const personalizedScheme: PersonalizedScheme = {
      schemeId: 'scheme-123',
      name: 'PM-KISAN',
      slug: 'pm-kisan',
      description: 'Financial support to farmers',
      category: 'agriculture',
      ministry: 'Ministry of Agriculture',
      scheme_type: 'central',
      final_score: 0.85,
      explanation: ['You are a farmer', 'Income eligible'],
      benefits_summary: 'Direct income support of ₹6000 per year',
      estimatedBenefit: 6000,
      apply_link: 'https://pmkisan.gov.in',
    };

    const result = transformToSchemeRecommendation(personalizedScheme);

    expect(result.scheme.schemeId).toBe('scheme-123');
    expect(result.scheme.officialName).toBe('PM-KISAN');
    expect(result.scheme.localizedName).toBe('PM-KISAN');
    expect(result.scheme.shortDescription).toBe('Financial support to farmers');
    expect(result.scheme.category).toBe('agriculture');
    expect(result.scheme.level).toBe('central');
    expect(result.scheme.officialWebsite).toBe('https://pmkisan.gov.in');
    expect(result.eligibility.eligible).toBe(true);
    expect(result.eligibility.confidence).toBe(0.85);
    expect(result.eligibility.explanation).toBe('You are a farmer Income eligible');
    expect(result.estimatedBenefit).toBe(6000);
    expect(result.priority).toBe(1);
    expect(result.personalizedExplanation).toBe('Direct income support of ₹6000 per year');
  });

  it('should handle missing optional fields with defaults', () => {
    const minimalScheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(minimalScheme);

    expect(result.scheme.schemeId).toBe('test-scheme');
    expect(result.scheme.officialName).toBe('Test Scheme');
    expect(result.scheme.shortDescription).toBe('');
    expect(result.scheme.category).toBe('general');
    expect(result.scheme.level).toBe('central');
    expect(result.scheme.officialWebsite).toBeUndefined();
    expect(result.eligibility.confidence).toBe(0.8);
    expect(result.eligibility.explanation).toBe('Matched based on your profile');
    expect(result.estimatedBenefit).toBe(0);
    expect(result.personalizedExplanation).toBe('');
  });

  it('should use schemeId field when available', () => {
    const scheme: PersonalizedScheme = {
      schemeId: 'custom-id',
      id: 'other-id',
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.schemeId).toBe('custom-id');
  });

  it('should fallback to id field when schemeId is missing', () => {
    const scheme: PersonalizedScheme = {
      id: 'fallback-id',
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.schemeId).toBe('fallback-id');
  });

  it('should fallback to slug when both schemeId and id are missing', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.schemeId).toBe('test-slug');
  });

  it('should handle confidence as a number', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      confidence: 0.75,
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.confidence).toBe(0.75);
  });

  it('should handle confidence as a string', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      confidence: '0.65',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.confidence).toBe(0.65);
  });

  it('should prioritize final_score over confidence', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      final_score: 0.9,
      confidence: 0.5,
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.confidence).toBe(0.9);
  });

  it('should use reason field when explanation array is empty', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      explanation: [],
      reason: 'You meet the age criteria',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.explanation).toBe('You meet the age criteria');
  });

  it('should use eligibility_analysis when explanation and reason are missing', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      eligibility_analysis: 'Based on your income level',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.explanation).toBe('Based on your income level');
  });

  it('should use benefits field when benefits_summary is missing', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      benefits: 'Financial assistance for education',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.personalizedExplanation).toBe('Financial assistance for education');
  });

  it('should use reasoning field when both benefits_summary and benefits are missing', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
      reasoning: 'Provides healthcare support',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.personalizedExplanation).toBe('Provides healthcare support');
  });

  it('should handle state level schemes', () => {
    const scheme: PersonalizedScheme = {
      name: 'State Scheme',
      slug: 'state-scheme',
      ministry: 'State Ministry',
      scheme_type: 'state',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.level).toBe('state');
  });

  it('should handle missing description', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.shortDescription).toBe('');
  });

  it('should handle missing apply_link', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.officialWebsite).toBeUndefined();
  });

  it('should always set helplineNumber to undefined', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.scheme.helplineNumber).toBeUndefined();
  });

  it('should always set eligible to true', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.eligibility.eligible).toBe(true);
  });

  it('should always set priority to 1', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-slug',
      ministry: 'Test Ministry',
    };

    const result = transformToSchemeRecommendation(scheme);
    expect(result.priority).toBe(1);
  });
});

describe('transformForAPI', () => {
  it('should transform a complete PersonalizedScheme to InterestedSchemeCreateRequest', () => {
    const personalizedScheme: PersonalizedScheme = {
      name: 'PM-KISAN',
      slug: 'pm-kisan',
      description: 'Financial support to farmers',
      ministry: 'Ministry of Agriculture',
      benefits_summary: 'Direct income support of ₹6000 per year',
      apply_link: 'https://pmkisan.gov.in',
    };
    const profileId = 'user-123';

    const result = transformForAPI(personalizedScheme, profileId);

    expect(result.profile_id).toBe('user-123');
    expect(result.scheme_name).toBe('PM-KISAN');
    expect(result.scheme_slug).toBe('pm-kisan');
    expect(result.scheme_description).toBe('Financial support to farmers');
    expect(result.scheme_benefits).toBe('Direct income support of ₹6000 per year');
    expect(result.scheme_ministry).toBe('Ministry of Agriculture');
    expect(result.scheme_apply_link).toBe('https://pmkisan.gov.in');
  });

  it('should provide empty string defaults for missing optional fields', () => {
    const minimalScheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
    };
    const profileId = 'user-456';

    const result = transformForAPI(minimalScheme, profileId);

    expect(result.profile_id).toBe('user-456');
    expect(result.scheme_name).toBe('Test Scheme');
    expect(result.scheme_slug).toBe('test-scheme');
    expect(result.scheme_description).toBe('');
    expect(result.scheme_benefits).toBe('');
    expect(result.scheme_ministry).toBe('Test Ministry');
    expect(result.scheme_apply_link).toBe('');
  });

  it('should use benefits_summary over benefits field', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      benefits: 'General benefits',
      benefits_summary: 'Specific benefits summary',
    };
    const profileId = 'user-789';

    const result = transformForAPI(scheme, profileId);

    expect(result.scheme_benefits).toBe('Specific benefits summary');
  });

  it('should fallback to benefits field when benefits_summary is missing', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      benefits: 'General benefits',
    };
    const profileId = 'user-789';

    const result = transformForAPI(scheme, profileId);

    expect(result.scheme_benefits).toBe('General benefits');
  });

  it('should handle undefined description field', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      description: undefined,
    };
    const profileId = 'user-101';

    const result = transformForAPI(scheme, profileId);

    expect(result.scheme_description).toBe('');
  });

  it('should handle undefined apply_link field', () => {
    const scheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      apply_link: undefined,
    };
    const profileId = 'user-102';

    const result = transformForAPI(scheme, profileId);

    expect(result.scheme_apply_link).toBe('');
  });

  it('should map all fields correctly according to requirements 7.1-7.7', () => {
    const scheme: PersonalizedScheme = {
      name: 'Complete Scheme',
      slug: 'complete-scheme',
      description: 'A complete scheme description',
      ministry: 'Ministry of Testing',
      benefits_summary: 'All the benefits',
      apply_link: 'https://example.com/apply',
    };
    const profileId = 'user-complete';

    const result = transformForAPI(scheme, profileId);

    // Requirement 7.1: Extract scheme_name from name field
    expect(result.scheme_name).toBe('Complete Scheme');
    
    // Requirement 7.2: Extract scheme_slug from slug field
    expect(result.scheme_slug).toBe('complete-scheme');
    
    // Requirement 7.3: Extract scheme_description from description field
    expect(result.scheme_description).toBe('A complete scheme description');
    
    // Requirement 7.4: Extract scheme_benefits from benefits_summary or benefits field
    expect(result.scheme_benefits).toBe('All the benefits');
    
    // Requirement 7.5: Extract scheme_ministry from ministry field
    expect(result.scheme_ministry).toBe('Ministry of Testing');
    
    // Requirement 7.6: Extract scheme_apply_link from apply_link field
    expect(result.scheme_apply_link).toBe('https://example.com/apply');
    
    // Requirement 7.7: Provide empty string defaults for missing fields (tested in other tests)
    expect(result.profile_id).toBe('user-complete');
  });
});
