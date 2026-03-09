/**
 * Bug Condition Exploration Test for Language Switching Fix
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 * 
 * This test encodes the EXPECTED behavior - it will FAIL on unfixed code
 * to demonstrate that hardcoded English text remains untranslated when
 * non-English languages are selected.
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * The test will validate the fix when it passes after implementation.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Profile } from './Profile';
import { Schemes } from './Schemes';
import { Education } from './Education';
import { Applications } from './Applications';
import { Language } from '../types';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';

// Mock the API service module
jest.mock('../services/apiService', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Import after mocking
import { apiService } from '../services/apiService';
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  })
) as jest.Mock;

// Helper to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Helper to check if text contains hardcoded English strings
const containsHardcodedEnglish = (container: HTMLElement, hardcodedStrings: string[]): string[] => {
  const foundStrings: string[] = [];
  const textContent = container.textContent || '';
  
  for (const str of hardcodedStrings) {
    if (textContent.includes(str)) {
      foundStrings.push(str);
    }
  }
  
  return foundStrings;
};

describe('Bug Condition Exploration: Hardcoded English Text Remains Untranslated', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.get.mockResolvedValue({
      success: true,
      data: { recommendations: [] },
    });
  });
  
  /**
   * Property 1: Fault Condition - Hardcoded English Text Remains Untranslated
   * 
   * For any non-English language selection and any page component,
   * NO hardcoded English strings should be visible in the rendered output.
   * 
   * This test will FAIL on unfixed code, demonstrating the bug exists.
   */
  describe('Property 1: Fault Condition - Complete UI Translation', () => {
    
    it('Profile page should NOT contain hardcoded English strings when Hindi is selected', () => {
      const language: Language = 'hi';
      const hardcodedStrings = [
        'Phone Number',
        '10 digit mobile number',
        'Enter 10 digit mobile number',
        'Aadhar Number',
        '12 digit Aadhar number',
        'Enter 12 digit Aadhar number',
        'Select Gender',
        'Select Caste',
        'e.g., Farmer, Laborer, Self-employed',
        'Block (Optional)',
        'Village (Optional)',
        'Pincode (Optional)',
        'Preferred Mode',
        'Voice',
        'Text',
        'Both',
        'Save & Find Schemes',
        'Update & Find Schemes',
        'Saving...',
      ];
      
      const { container } = renderWithTheme(
        <Profile language={language} userId={null} onUserIdSet={() => {}} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      // This assertion will FAIL on unfixed code, proving the bug exists
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Profile page with Hindi:', foundStrings);
      }
    });
    
    it('Profile page should NOT contain hardcoded English strings when Bengali is selected', () => {
      const language: Language = 'bn';
      const hardcodedStrings = [
        'Phone Number',
        'Aadhar Number',
        'Gender',
        'Select Gender',
        'Male',
        'Female',
        'Other',
        'Caste',
        'Select Caste',
        'General',
        'OBC',
        'SC',
        'ST',
        'Occupation',
        'State',
        'District',
      ];
      
      const { container } = renderWithTheme(
        <Profile language={language} userId={null} onUserIdSet={() => {}} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Profile page with Bengali:', foundStrings);
      }
    });
    
    it('Profile page should NOT contain hardcoded English strings when Tamil is selected', () => {
      const language: Language = 'ta';
      const hardcodedStrings = [
        'Phone Number',
        'Aadhar Number',
        'Select Gender',
        'Select Caste',
        'Block (Optional)',
        'Village (Optional)',
        'Pincode (Optional)',
      ];
      
      const { container } = renderWithTheme(
        <Profile language={language} userId={null} onUserIdSet={() => {}} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Profile page with Tamil:', foundStrings);
      }
    });
    
    it('Profile page should NOT contain hardcoded English strings when Marathi is selected', () => {
      const language: Language = 'mr';
      const hardcodedStrings = [
        'Phone Number',
        'Aadhar Number',
        'Select Gender',
        'Select Caste',
        'Save & Find Schemes',
        'Update & Find Schemes',
      ];
      
      const { container } = renderWithTheme(
        <Profile language={language} userId={null} onUserIdSet={() => {}} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Profile page with Marathi:', foundStrings);
      }
    });
    
    it('Schemes page should NOT contain hardcoded English strings when Tamil is selected', () => {
      const language: Language = 'ta';
      const hardcodedStrings = [
        'Search schemes',
        'Filters',
        'Category',
        'Level',
        'Central',
        'State',
        'All Categories',
        'Clear Filters',
        'View Details',
        'Apply Now',
      ];
      
      const { container } = renderWithTheme(
        <Schemes language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Schemes page with Tamil:', foundStrings);
      }
    });
    
    it('Schemes page should NOT contain hardcoded English strings when Hindi is selected', () => {
      const language: Language = 'hi';
      const hardcodedStrings = [
        'Filters',
        'Clear Filters',
        'View Details',
        'Apply Now',
      ];
      
      const { container } = renderWithTheme(
        <Schemes language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Schemes page with Hindi:', foundStrings);
      }
    });
    
    it('Education page should NOT contain hardcoded English strings when Marathi is selected', () => {
      const language: Language = 'mr';
      const hardcodedStrings = [
        'Learn Finance',
        'Get personalized financial advice',
        'No Interested Schemes Yet',
        'Browse schemes',
        'Get Financial Advice',
      ];
      
      const { container } = renderWithTheme(
        <Education language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Education page with Marathi:', foundStrings);
      }
    });
    
    it('Education page should NOT contain hardcoded English strings when Bengali is selected', () => {
      const language: Language = 'bn';
      const hardcodedStrings = [
        'Get Financial Advice',
        'No Interested Schemes Yet',
      ];
      
      const { container } = renderWithTheme(
        <Education language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Education page with Bengali:', foundStrings);
      }
    });
    
    it('Applications page should NOT contain hardcoded English strings when Hindi is selected', () => {
      const language: Language = 'hi';
      const hardcodedStrings = [
        'My Applications',
        'Track your scheme applications',
        'No applications yet',
        'Start applying',
        'Status',
        'Submitted on',
        'Reference Number',
      ];
      
      const { container } = renderWithTheme(
        <Applications language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Applications page with Hindi:', foundStrings);
      }
    });
    
    it('Applications page should NOT contain hardcoded English strings when Tamil is selected', () => {
      const language: Language = 'ta';
      const hardcodedStrings = [
        'My Applications',
        'No applications yet',
        'Status',
      ];
      
      const { container } = renderWithTheme(
        <Applications language={language} userId={null} />
      );
      
      const foundStrings = containsHardcodedEnglish(container, hardcodedStrings);
      
      expect(foundStrings).toEqual([]);
      
      if (foundStrings.length > 0) {
        console.log('Counterexample found - Hardcoded English strings in Applications page with Tamil:', foundStrings);
      }
    });
  });
});
