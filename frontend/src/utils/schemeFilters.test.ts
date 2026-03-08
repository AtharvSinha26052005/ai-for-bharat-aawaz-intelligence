import { filterSchemes, sortSchemes, FilterState, SortOption } from './schemeFilters';
import { SchemeRecommendation } from '../types';

// Helper function to create mock scheme recommendations
function createMockScheme(
  id: string,
  name: string,
  description: string,
  category: string,
  level: 'central' | 'state',
  confidence: number,
  benefit: number
): SchemeRecommendation {
  return {
    scheme: {
      schemeId: id,
      officialName: name,
      localizedName: name,
      shortDescription: description,
      category,
      level,
      estimatedBenefit: benefit,
    },
    eligibility: {
      eligible: confidence >= 0.5,
      confidence,
      explanation: 'Test explanation',
    },
    estimatedBenefit: benefit,
    priority: 1,
    personalizedExplanation: 'Test personalized explanation',
  };
}

describe('filterSchemes', () => {
  const mockSchemes: SchemeRecommendation[] = [
    createMockScheme('1', 'PM-KISAN', 'Financial support for farmers', 'agriculture', 'central', 0.9, 6000),
    createMockScheme('2', 'Ayushman Bharat', 'Health insurance scheme', 'health', 'central', 0.8, 500000),
    createMockScheme('3', 'State Pension', 'Pension for elderly citizens', 'pension', 'state', 0.7, 1000),
    createMockScheme('4', 'Education Grant', 'Support for students', 'education', 'state', 0.6, 5000),
    createMockScheme('5', 'Housing Scheme', 'Affordable housing program', 'housing', 'central', 0.5, 250000),
  ];

  describe('empty filters', () => {
    it('should return all schemes when no filters are active', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(mockSchemes.length);
      expect(result).toEqual(mockSchemes);
    });

    it('should return all schemes when search query is only whitespace', () => {
      const filters: FilterState = {
        searchQuery: '   ',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(mockSchemes.length);
    });
  });

  describe('search query filtering', () => {
    it('should filter schemes by name (case-insensitive)', () => {
      const filters: FilterState = {
        searchQuery: 'kisan',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.schemeId).toBe('1');
    });

    it('should filter schemes by description (case-insensitive)', () => {
      const filters: FilterState = {
        searchQuery: 'insurance',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.schemeId).toBe('2');
    });

    it('should be case-insensitive for search', () => {
      const filters: FilterState = {
        searchQuery: 'PENSION',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.schemeId).toBe('3');
    });

    it('should match partial strings in name or description', () => {
      const filters: FilterState = {
        searchQuery: 'support',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(2); // PM-KISAN and Education Grant
    });

    it('should return empty array when no schemes match search', () => {
      const filters: FilterState = {
        searchQuery: 'nonexistent',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('category filtering', () => {
    it('should filter schemes by single category', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: ['health'],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.category).toBe('health');
    });

    it('should filter schemes by multiple categories', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: ['agriculture', 'health', 'pension'],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(3);
      expect(result.every(s => ['agriculture', 'health', 'pension'].includes(s.scheme.category))).toBe(true);
    });

    it('should return empty array when no schemes match selected categories', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: ['employment'],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('level filtering', () => {
    it('should filter schemes by central level', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: [],
        schemeLevel: 'central',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(3);
      expect(result.every(s => s.scheme.level === 'central')).toBe(true);
    });

    it('should filter schemes by state level', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: [],
        schemeLevel: 'state',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(2);
      expect(result.every(s => s.scheme.level === 'state')).toBe(true);
    });

    it('should return all schemes when level is "all"', () => {
      const filters: FilterState = {
        searchQuery: '',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(mockSchemes.length);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('should apply search and category filters together', () => {
      const filters: FilterState = {
        searchQuery: 'support',
        selectedCategories: ['agriculture'],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.schemeId).toBe('1');
    });

    it('should apply all three filters together', () => {
      const filters: FilterState = {
        searchQuery: 'pension',
        selectedCategories: ['pension'],
        schemeLevel: 'state',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].scheme.schemeId).toBe('3');
    });

    it('should return empty array when combined filters match nothing', () => {
      const filters: FilterState = {
        searchQuery: 'pension',
        selectedCategories: ['agriculture'],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('should not mutate the original schemes array', () => {
      const originalSchemes = [...mockSchemes];
      const filters: FilterState = {
        searchQuery: 'health',
        selectedCategories: ['health'],
        schemeLevel: 'central',
      };

      filterSchemes(mockSchemes, filters);
      expect(mockSchemes).toEqual(originalSchemes);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schemes array', () => {
      const filters: FilterState = {
        searchQuery: 'test',
        selectedCategories: ['health'],
        schemeLevel: 'all',
      };

      const result = filterSchemes([], filters);
      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search query', () => {
      const filters: FilterState = {
        searchQuery: 'PM-KISAN',
        selectedCategories: [],
        schemeLevel: 'all',
      };

      const result = filterSchemes(mockSchemes, filters);
      expect(result).toHaveLength(1);
    });
  });
});

describe('sortSchemes', () => {
  const mockSchemes: SchemeRecommendation[] = [
    createMockScheme('1', 'Scheme A', 'Description A', 'agriculture', 'central', 0.5, 1000),
    createMockScheme('2', 'Scheme B', 'Description B', 'health', 'central', 0.9, 5000),
    createMockScheme('3', 'Scheme C', 'Description C', 'pension', 'state', 0.7, 3000),
    createMockScheme('4', 'Scheme D', 'Description D', 'education', 'state', 0.8, 2000),
    createMockScheme('5', 'Scheme E', 'Description E', 'housing', 'central', 0.6, 4000),
  ];

  describe('sort by relevance', () => {
    it('should sort schemes by eligibility confidence in descending order', () => {
      const result = sortSchemes(mockSchemes, 'relevance');
      
      expect(result).toHaveLength(mockSchemes.length);
      expect(result[0].eligibility.confidence).toBe(0.9);
      expect(result[1].eligibility.confidence).toBe(0.8);
      expect(result[2].eligibility.confidence).toBe(0.7);
      expect(result[3].eligibility.confidence).toBe(0.6);
      expect(result[4].eligibility.confidence).toBe(0.5);
    });
  });

  describe('sort by benefit', () => {
    it('should sort schemes by estimated benefit in descending order', () => {
      const result = sortSchemes(mockSchemes, 'benefit');
      
      expect(result).toHaveLength(mockSchemes.length);
      expect(result[0].estimatedBenefit).toBe(5000);
      expect(result[1].estimatedBenefit).toBe(4000);
      expect(result[2].estimatedBenefit).toBe(3000);
      expect(result[3].estimatedBenefit).toBe(2000);
      expect(result[4].estimatedBenefit).toBe(1000);
    });
  });

  describe('sort by eligibility', () => {
    it('should sort schemes by eligibility confidence in descending order', () => {
      const result = sortSchemes(mockSchemes, 'eligibility');
      
      expect(result).toHaveLength(mockSchemes.length);
      expect(result[0].eligibility.confidence).toBe(0.9);
      expect(result[1].eligibility.confidence).toBe(0.8);
      expect(result[2].eligibility.confidence).toBe(0.7);
      expect(result[3].eligibility.confidence).toBe(0.6);
      expect(result[4].eligibility.confidence).toBe(0.5);
    });
  });

  describe('sort stability', () => {
    it('should maintain relative order for equal values', () => {
      const schemesWithEqualValues: SchemeRecommendation[] = [
        createMockScheme('1', 'Scheme A', 'Description A', 'agriculture', 'central', 0.8, 1000),
        createMockScheme('2', 'Scheme B', 'Description B', 'health', 'central', 0.8, 1000),
        createMockScheme('3', 'Scheme C', 'Description C', 'pension', 'state', 0.8, 1000),
      ];

      const result = sortSchemes(schemesWithEqualValues, 'relevance');
      
      // Schemes with equal confidence should maintain their original order
      expect(result[0].scheme.schemeId).toBe('1');
      expect(result[1].scheme.schemeId).toBe('2');
      expect(result[2].scheme.schemeId).toBe('3');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original schemes array', () => {
      const originalSchemes = [...mockSchemes];
      
      sortSchemes(mockSchemes, 'benefit');
      expect(mockSchemes).toEqual(originalSchemes);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schemes array', () => {
      const result = sortSchemes([], 'relevance');
      expect(result).toHaveLength(0);
    });

    it('should handle single scheme array', () => {
      const singleScheme = [mockSchemes[0]];
      const result = sortSchemes(singleScheme, 'benefit');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(singleScheme[0]);
    });

    it('should handle schemes with zero benefit', () => {
      const schemesWithZero: SchemeRecommendation[] = [
        createMockScheme('1', 'Scheme A', 'Description A', 'agriculture', 'central', 0.8, 0),
        createMockScheme('2', 'Scheme B', 'Description B', 'health', 'central', 0.9, 1000),
      ];

      const result = sortSchemes(schemesWithZero, 'benefit');
      expect(result[0].estimatedBenefit).toBe(1000);
      expect(result[1].estimatedBenefit).toBe(0);
    });

    it('should handle schemes with confidence of 0', () => {
      const schemesWithZeroConfidence: SchemeRecommendation[] = [
        createMockScheme('1', 'Scheme A', 'Description A', 'agriculture', 'central', 0, 1000),
        createMockScheme('2', 'Scheme B', 'Description B', 'health', 'central', 0.5, 2000),
      ];

      const result = sortSchemes(schemesWithZeroConfidence, 'relevance');
      expect(result[0].eligibility.confidence).toBe(0.5);
      expect(result[1].eligibility.confidence).toBe(0);
    });
  });

  describe('length preservation', () => {
    it('should return array with same length as input', () => {
      const sortOptions: SortOption[] = ['relevance', 'benefit', 'eligibility'];
      
      sortOptions.forEach(option => {
        const result = sortSchemes(mockSchemes, option);
        expect(result).toHaveLength(mockSchemes.length);
      });
    });

    it('should contain all original schemes', () => {
      const result = sortSchemes(mockSchemes, 'benefit');
      
      mockSchemes.forEach(scheme => {
        expect(result).toContainEqual(scheme);
      });
    });
  });
});
