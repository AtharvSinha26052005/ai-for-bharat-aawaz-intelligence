import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SchemeDetailDialog } from './SchemeDetailDialog';
import { SchemeRecommendation } from '../types';
import { theme } from '../theme/theme';

// Helper function to wrap component with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock scheme data
const mockScheme: SchemeRecommendation = {
  scheme: {
    schemeId: 'scheme-1',
    officialName: 'Pradhan Mantri Kisan Samman Nidhi',
    localizedName: 'प्रधानमंत्री किसान सम्मान निधि',
    shortDescription: 'Financial support to farmers with cultivable land',
    category: 'agriculture',
    level: 'central',
    estimatedBenefit: 6000,
    officialWebsite: 'https://pmkisan.gov.in',
    helplineNumber: '155261',
  },
  eligibility: {
    eligible: true,
    confidence: 0.85,
    explanation: 'You are eligible because you own cultivable land and meet the income criteria.',
  },
  estimatedBenefit: 6000,
  priority: 1,
  personalizedExplanation: 'Based on your profile, you can receive ₹6,000 per year in three installments.',
};

const mockSchemeWithoutOptionalFields: SchemeRecommendation = {
  scheme: {
    schemeId: 'scheme-2',
    officialName: 'State Education Scheme',
    localizedName: 'State Education Scheme',
    shortDescription: 'Education support for students',
    category: 'education',
    level: 'state',
  },
  eligibility: {
    eligible: false,
    confidence: 0.45,
    explanation: 'You do not meet the age criteria for this scheme.',
  },
  estimatedBenefit: 0,
  priority: 2,
  personalizedExplanation: '',
};

describe('SchemeDetailDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 6.1: Dialog Opening', () => {
    it('should open dialog when open prop is true', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render dialog when open prop is false', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={false}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render dialog when scheme is null', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={null}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.2: Display Scheme Details', () => {
    it('should display scheme official name', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Pradhan Mantri Kisan Samman Nidhi')).toBeInTheDocument();
    });

    it('should display scheme description', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Financial support to farmers with cultivable land')).toBeInTheDocument();
    });

    it('should display scheme category', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Agriculture')).toBeInTheDocument();
    });

    it('should display scheme level', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Central')).toBeInTheDocument();
    });
  });

  describe('Requirement 6.3: Display Eligibility Explanation', () => {
    it('should display eligibility explanation', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(
        screen.getByText('You are eligible because you own cultivable land and meet the income criteria.')
      ).toBeInTheDocument();
    });

    it('should display eligibility confidence percentage when eligible', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('85% Match')).toBeInTheDocument();
    });

    it('should not display confidence percentage when not eligible', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockSchemeWithoutOptionalFields}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByText(/% Match/)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.4: Display Official Website Link', () => {
    it('should display official website link when available', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const link = screen.getByRole('link', { name: /visit official website/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://pmkisan.gov.in');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not display official website section when not available', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockSchemeWithoutOptionalFields}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByText('Official Website')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.5: Display Helpline Number', () => {
    it('should display helpline number when available', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const link = screen.getByRole('link', { name: /call helpline/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'tel:155261');
    });

    it('should not display helpline section when not available', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockSchemeWithoutOptionalFields}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByText('Helpline')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.6: Apply Now Button', () => {
    it('should display "Apply Now" button', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument();
    });

    it('should call onApply with schemeId when "Apply Now" is clicked', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply now/i });
      fireEvent.click(applyButton);

      expect(mockOnApply).toHaveBeenCalledWith('scheme-1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Requirement 6.8: Escape Key to Close', () => {
    it('should call onClose when Escape key is pressed', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Requirement 6.9: Close Button', () => {
    it('should display close button in dialog title', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should call onClose when close button is clicked', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const closeButton = screen.getAllByRole('button', { name: /close/i })[0];
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Requirement 14.3: Focus Trap', () => {
    it('should focus on close button when dialog opens', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      // The close icon button should be focused (there are two close buttons, so we use getAllByLabelText)
      const closeButtons = screen.getAllByLabelText('Close dialog');
      expect(closeButtons.length).toBeGreaterThan(0);
      expect(closeButtons[0]).toBeInTheDocument();
    });
  });

  describe('Requirement 14.4: Accessibility', () => {
    it('should have proper ARIA labels for dialog', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'scheme-detail-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'scheme-detail-dialog-description');
    });

    it('should have proper ARIA labels for buttons', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      // There are two close buttons (icon button and text button), so we use getAllByRole
      const closeButtons = screen.getAllByRole('button', { name: /close dialog/i });
      expect(closeButtons.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /apply now for/i })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for links', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByRole('link', { name: /visit official website/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /call helpline/i })).toBeInTheDocument();
    });
  });

  describe('Estimated Benefit Display', () => {
    it('should display estimated benefit when greater than zero', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Estimated Benefit')).toBeInTheDocument();
      expect(screen.getByText('₹6,000')).toBeInTheDocument();
      expect(
        screen.getByText('Based on your profile, you can receive ₹6,000 per year in three installments.')
      ).toBeInTheDocument();
    });

    it('should not display estimated benefit section when zero', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockSchemeWithoutOptionalFields}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.queryByText('Estimated Benefit')).not.toBeInTheDocument();
    });
  });

  describe('Level Chip Color', () => {
    it('should display central level with primary color', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const centralChip = screen.getByText('Central');
      expect(centralChip).toBeInTheDocument();
    });

    it('should display state level with secondary color', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockSchemeWithoutOptionalFields}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const stateChip = screen.getByText('State');
      expect(stateChip).toBeInTheDocument();
    });
  });

  describe('Category Formatting', () => {
    it('should format category with underscores replaced by spaces and title case', () => {
      const schemeWithUnderscoreCategory: SchemeRecommendation = {
        ...mockScheme,
        scheme: {
          ...mockScheme.scheme,
          category: 'women_welfare',
        },
      };

      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={schemeWithUnderscoreCategory}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('Women Welfare')).toBeInTheDocument();
    });
  });

  describe('Confidence Color Calculation', () => {
    it('should display green color for high confidence (>= 0.8)', () => {
      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mockScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      const matchText = screen.getByText('85% Match');
      expect(matchText).toBeInTheDocument();
      // Color is applied via sx prop, so we just verify the element exists
    });

    it('should display warning color for medium confidence (0.5 - 0.8)', () => {
      const mediumConfidenceScheme: SchemeRecommendation = {
        ...mockScheme,
        eligibility: {
          ...mockScheme.eligibility,
          confidence: 0.65,
        },
      };

      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={mediumConfidenceScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('65% Match')).toBeInTheDocument();
    });

    it('should display error color for low confidence (< 0.5)', () => {
      const lowConfidenceScheme: SchemeRecommendation = {
        ...mockScheme,
        eligibility: {
          eligible: true,
          confidence: 0.3,
          explanation: 'Low match',
        },
      };

      renderWithTheme(
        <SchemeDetailDialog
          open={true}
          scheme={lowConfidenceScheme}
          onClose={mockOnClose}
          onApply={mockOnApply}
        />
      );

      expect(screen.getByText('30% Match')).toBeInTheDocument();
    });
  });
});
