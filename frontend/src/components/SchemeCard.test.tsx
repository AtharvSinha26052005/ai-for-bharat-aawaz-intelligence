import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SchemeCard } from './SchemeCard';
import { theme } from '../theme/theme';
import { SchemeRecommendation } from '../types';

// Helper function to wrap component with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock scheme data
const mockScheme: SchemeRecommendation = {
  scheme: {
    schemeId: 'test-scheme-1',
    officialName: 'Test Agriculture Scheme',
    localizedName: 'Test Agriculture Scheme',
    shortDescription: 'A test scheme for agricultural development and farmer support.',
    category: 'agriculture',
    level: 'central',
    estimatedBenefit: 50000,
    officialWebsite: 'https://example.com',
    helplineNumber: '1800-123-4567',
  },
  eligibility: {
    eligible: true,
    confidence: 0.85,
    explanation: 'You meet all the eligibility criteria for this scheme.',
  },
  estimatedBenefit: 50000,
  priority: 1,
  personalizedExplanation: 'This scheme is highly relevant to your profile.',
};

describe('SchemeCard Component', () => {
  const mockOnViewDetails = jest.fn();
  const mockOnApply = jest.fn();
  const testLanguage = 'en' as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Required Fields Display (Requirements 2.2, 2.3, 2.4, 2.5)', () => {
    it('should display scheme official name', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
          language={testLanguage}
        />
      );

      expect(screen.getByText('Test Agriculture Scheme')).toBeInTheDocument();
    });

    it('should display scheme level badge', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('Central')).toBeInTheDocument();
    });

    it('should display scheme category badge', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('Agriculture')).toBeInTheDocument();
    });

    it('should display short description', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(
        screen.getByText('A test scheme for agricultural development and farmer support.')
      ).toBeInTheDocument();
    });

    it('should display state level badge correctly', () => {
      const stateScheme = {
        ...mockScheme,
        scheme: { ...mockScheme.scheme, level: 'state' as const },
      };

      renderWithTheme(
        <SchemeCard
          scheme={stateScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('State')).toBeInTheDocument();
    });
  });

  describe('Estimated Benefit Display (Requirement 2.6)', () => {
    it('should display estimated benefit when greater than zero', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('₹50,000')).toBeInTheDocument();
      expect(screen.getByText('Estimated Benefit')).toBeInTheDocument();
    });

    it('should not display estimated benefit when zero', () => {
      const schemeWithZeroBenefit = {
        ...mockScheme,
        estimatedBenefit: 0,
      };

      renderWithTheme(
        <SchemeCard
          scheme={schemeWithZeroBenefit}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.queryByText('Estimated Benefit')).not.toBeInTheDocument();
    });

    it('should format large benefit amounts with commas', () => {
      const schemeWithLargeBenefit = {
        ...mockScheme,
        estimatedBenefit: 1234567,
      };

      renderWithTheme(
        <SchemeCard
          scheme={schemeWithLargeBenefit}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('₹12,34,567')).toBeInTheDocument();
    });
  });

  describe('Eligibility Confidence Display (Requirement 2.7)', () => {
    it('should display eligibility confidence when eligible', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('85% Match')).toBeInTheDocument();
    });

    it('should not display eligibility confidence when not eligible', () => {
      const ineligibleScheme = {
        ...mockScheme,
        eligibility: {
          eligible: false,
          confidence: 0.3,
          explanation: 'You do not meet the eligibility criteria.',
        },
      };

      renderWithTheme(
        <SchemeCard
          scheme={ineligibleScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.queryByText(/% Match/)).not.toBeInTheDocument();
    });

    it('should round confidence percentage to nearest integer', () => {
      const schemeWithDecimalConfidence = {
        ...mockScheme,
        eligibility: {
          eligible: true,
          confidence: 0.876,
          explanation: 'High match',
        },
      };

      renderWithTheme(
        <SchemeCard
          scheme={schemeWithDecimalConfidence}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('88% Match')).toBeInTheDocument();
    });
  });

  describe('Action Buttons (Requirement 2.8)', () => {
    it('should display View Details button', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('should display Apply Now button', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
    });

    it('should call onViewDetails when View Details button is clicked', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      fireEvent.click(viewDetailsButton);

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockScheme);
    });

    it('should call onApply with schemeId when Apply Now button is clicked', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply now/i });
      fireEvent.click(applyButton);

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnApply).toHaveBeenCalledWith('test-scheme-1');
    });
  });

  describe('Category Formatting', () => {
    it('should format category with underscores correctly', () => {
      const schemeWithUnderscoreCategory = {
        ...mockScheme,
        scheme: {
          ...mockScheme.scheme,
          category: 'women_welfare',
        },
      };

      renderWithTheme(
        <SchemeCard
          scheme={schemeWithUnderscoreCategory}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('Women Welfare')).toBeInTheDocument();
    });

    it('should format multi-word category correctly', () => {
      const schemeWithMultiWordCategory = {
        ...mockScheme,
        scheme: {
          ...mockScheme.scheme,
          category: 'financial_inclusion',
        },
      };

      renderWithTheme(
        <SchemeCard
          scheme={schemeWithMultiWordCategory}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByText('Financial Inclusion')).toBeInTheDocument();
    });
  });

  describe('Accessibility (Requirement 14.1)', () => {
    it('should have appropriate ARIA labels for interactive elements', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(
        screen.getByRole('button', { name: /view details for test agriculture scheme/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /apply now for test agriculture scheme/i })
      ).toBeInTheDocument();
    });

    it('should have article role for semantic structure', () => {
      renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  describe('Custom Elevation', () => {
    it('should use default elevation of 2 when not specified', () => {
      const { container } = renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
        
          language={testLanguage}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveClass('MuiPaper-elevation2');
    });

    it('should use custom elevation when specified', () => {
      const { container } = renderWithTheme(
        <SchemeCard
          scheme={mockScheme}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply}
          elevation={4}
          language={testLanguage}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveClass('MuiPaper-elevation4');
    });
  });
});


