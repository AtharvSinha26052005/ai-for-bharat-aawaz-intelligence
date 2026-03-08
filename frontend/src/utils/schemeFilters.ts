import { SchemeRecommendation } from '../types';

/**
 * Filter state interface for scheme filtering
 */
export interface FilterState {
  searchQuery: string;
  selectedCategories: string[];
  schemeLevel: 'all' | 'central' | 'state';
}

/**
 * Sort option type for scheme sorting
 */
export type SortOption = 'relevance' | 'benefit' | 'eligibility';

/**
 * Filters schemes based on search query, categories, and level
 * 
 * Preconditions:
 * - schemes is a valid array (may be empty)
 * - filters is a valid FilterState object
 * - filters.searchQuery is a string (may be empty)
 * - filters.selectedCategories is an array of valid category strings
 * 
 * Postconditions:
 * - Returns filtered array of schemes
 * - Returned array length ≤ input array length
 * - All returned schemes match filter criteria
 * - Original schemes array is not mutated
 * - Empty filters return all schemes
 * 
 * @param schemes - Array of scheme recommendations to filter
 * @param filters - Filter state containing search query, categories, and level
 * @returns Filtered array of schemes
 */
export function filterSchemes(
  schemes: SchemeRecommendation[],
  filters: FilterState
): SchemeRecommendation[] {
  let filteredSchemes = [...schemes]; // Create a copy to avoid mutation

  // Filter by search query (case-insensitive, matches name or description)
  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const query = filters.searchQuery.toLowerCase().trim();
    filteredSchemes = filteredSchemes.filter((schemeRec) => {
      const name = schemeRec.scheme.officialName.toLowerCase();
      const description = schemeRec.scheme.shortDescription.toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }

  // Filter by categories (AND logic - scheme must be in selected categories)
  if (filters.selectedCategories.length > 0) {
    filteredSchemes = filteredSchemes.filter((schemeRec) =>
      filters.selectedCategories.includes(schemeRec.scheme.category)
    );
  }

  // Filter by scheme level
  if (filters.schemeLevel !== 'all') {
    filteredSchemes = filteredSchemes.filter(
      (schemeRec) => schemeRec.scheme.level === filters.schemeLevel
    );
  }

  return filteredSchemes;
}

/**
 * Sorts schemes based on the specified sort option
 * 
 * Preconditions:
 * - schemes is a valid array of SchemeRecommendation objects
 * - sortBy is one of: 'relevance', 'benefit', 'eligibility'
 * - All schemes have valid eligibility.confidence values (0-1)
 * - All schemes have valid estimatedBenefit values (≥0)
 * 
 * Postconditions:
 * - Returns sorted array of schemes
 * - Returned array has same length as input
 * - Sorting is stable (equal elements maintain relative order)
 * - Original schemes array is not mutated
 * - Sort order matches the specified sortBy option
 * 
 * @param schemes - Array of scheme recommendations to sort
 * @param sortBy - Sort option ('relevance', 'benefit', or 'eligibility')
 * @returns Sorted array of schemes
 */
export function sortSchemes(
  schemes: SchemeRecommendation[],
  sortBy: SortOption
): SchemeRecommendation[] {
  const sortedSchemes = [...schemes]; // Create a copy to avoid mutation

  switch (sortBy) {
    case 'relevance':
      // Sort by eligibility confidence in descending order
      sortedSchemes.sort((a, b) => {
        return b.eligibility.confidence - a.eligibility.confidence;
      });
      break;

    case 'benefit':
      // Sort by estimated benefit amount in descending order
      sortedSchemes.sort((a, b) => {
        return b.estimatedBenefit - a.estimatedBenefit;
      });
      break;

    case 'eligibility':
      // Sort by eligibility confidence in descending order
      sortedSchemes.sort((a, b) => {
        return b.eligibility.confidence - a.eligibility.confidence;
      });
      break;

    default:
      // Default to relevance sorting
      sortedSchemes.sort((a, b) => {
        return b.eligibility.confidence - a.eligibility.confidence;
      });
  }

  return sortedSchemes;
}
