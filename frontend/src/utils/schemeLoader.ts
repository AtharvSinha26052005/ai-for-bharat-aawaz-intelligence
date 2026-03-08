/**
 * Scheme Loader Utility
 * Loads government schemes from local JSON file and transforms them
 * into the format expected by the UI components
 */

import { SchemeRecommendation, GovernmentScheme } from '../types';

interface RawScheme {
  name: string;
  slug: string;
  ministry: string;
  description: string;
  eligibility_summary: string;
  benefits_summary: any;
  embedding_text: string;
  apply_link?: string;
}

/**
 * Maps ministry name to a general category
 */
const mapMinistryToCategory = (ministry: string): string => {
  const ministryLower = ministry.toLowerCase();
  
  if (ministryLower.includes('agriculture') || ministryLower.includes('farmer')) {
    return 'agriculture';
  }
  if (ministryLower.includes('education') || ministryLower.includes('skill')) {
    return 'education';
  }
  if (ministryLower.includes('health') || ministryLower.includes('medical')) {
    return 'health';
  }
  if (ministryLower.includes('housing') || ministryLower.includes('urban')) {
    return 'housing';
  }
  if (ministryLower.includes('labour') || ministryLower.includes('employment')) {
    return 'employment';
  }
  if (ministryLower.includes('pension') || ministryLower.includes('senior')) {
    return 'pension';
  }
  if (ministryLower.includes('women') || ministryLower.includes('child')) {
    return 'women_welfare';
  }
  if (ministryLower.includes('disability') || ministryLower.includes('empowerment')) {
    return 'disability';
  }
  if (ministryLower.includes('finance') || ministryLower.includes('bank')) {
    return 'financial_inclusion';
  }
  
  return 'general';
};

/**
 * Extracts a short description from the full description
 */
const getShortDescription = (description: string): string => {
  if (description.length <= 200) {
    return description;
  }
  return description.substring(0, 197) + '...';
};

/**
 * Formats benefits summary as a string
 */
const formatBenefitsSummary = (benefits: any): string => {
  if (typeof benefits === 'string') {
    return benefits;
  }
  if (typeof benefits === 'object') {
    return JSON.stringify(benefits, null, 2);
  }
  return 'Benefits information available';
};

/**
 * Transforms raw scheme data into SchemeRecommendation format
 */
const transformScheme = (rawScheme: RawScheme, index: number): SchemeRecommendation => {
  const scheme: GovernmentScheme = {
    schemeId: rawScheme.slug,
    officialName: rawScheme.name,
    localizedName: rawScheme.name,
    shortDescription: getShortDescription(rawScheme.description),
    category: mapMinistryToCategory(rawScheme.ministry),
    level: 'central', // Most schemes in the dataset are central
    officialWebsite: rawScheme.apply_link,
  };

  return {
    scheme,
    eligibility: {
      eligible: true,
      confidence: 1.0,
      explanation: rawScheme.eligibility_summary || 'Eligibility criteria available',
    },
    estimatedBenefit: 0, // Can be calculated based on benefits_summary if needed
    priority: index + 1, // Default priority based on order
    personalizedExplanation: formatBenefitsSummary(rawScheme.benefits_summary),
  };
};

/**
 * Loads all schemes from the JSON file
 */
export const loadAllSchemes = async (): Promise<SchemeRecommendation[]> => {
  try {
    console.log('Fetching schemes from /myscheme_full_1000.json...');
    const response = await fetch('/myscheme_full_1000.json');
    
    if (!response.ok) {
      console.error(`Failed to fetch schemes: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to load schemes data: ${response.statusText}`);
    }
    
    const rawSchemes: RawScheme[] = await response.json();
    console.log(`Fetched ${rawSchemes.length} raw schemes`);
    
    const transformedSchemes = rawSchemes.map((scheme, index) => transformScheme(scheme, index));
    console.log(`Transformed ${transformedSchemes.length} schemes`);
    
    return transformedSchemes;
  } catch (error) {
    console.error('Error loading schemes:', error);
    throw error; // Re-throw to let the caller handle it
  }
};

/**
 * Gets the total count of available schemes
 */
export const getSchemesCount = async (): Promise<number> => {
  try {
    const response = await fetch('/myscheme_full_1000.json');
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.length;
  } catch (error) {
    console.error('Error getting schemes count:', error);
    return 0;
  }
};

/**
 * Searches schemes by text query (simple text matching)
 */
export const searchSchemes = (
  schemes: SchemeRecommendation[],
  query: string
): SchemeRecommendation[] => {
  if (!query.trim()) {
    return schemes;
  }

  const lowerQuery = query.toLowerCase();
  
  return schemes.filter((recommendation) => {
    const { scheme, eligibility, personalizedExplanation } = recommendation;
    
    return (
      scheme.officialName.toLowerCase().includes(lowerQuery) ||
      scheme.shortDescription.toLowerCase().includes(lowerQuery) ||
      eligibility.explanation.toLowerCase().includes(lowerQuery) ||
      personalizedExplanation.toLowerCase().includes(lowerQuery) ||
      scheme.category.toLowerCase().includes(lowerQuery)
    );
  });
};
