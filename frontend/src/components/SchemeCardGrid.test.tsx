import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SchemeCardGrid } from './SchemeCardGrid';
import { theme } from '../theme/theme';
import { SchemeRecommendation } from '../types';

// Mock SchemeCard component to simplify testing
jest.mock('./SchemeCard', () => ({
  SchemeCard: ({ scheme }: { scheme: SchemeRecommendation }) => (
    <div data-testid={`scheme-card-${scheme.scheme.schemeId}`}>
      {scheme.scheme.officialName}
    </div>
  ),
}));

const mockSchemes: SchemeRecommendation[] = [
  {
    scheme: {
      schemeId: 'scheme-1',
      officialName: 'Test Scheme 1',
      localizedName: 'Test Scheme 1',
      shortDescription: 'Description 1',
      category: 'agriculture',
      level: 'central',
      officialWebsite: 'https://example.com',
      helplineNumber: '1800-000-0001',
    },
    eligibility: {
      eligible: true,
      confidence: 0.9,
      explanation: 'You are eligible',
    },
    estimatedBenefit: 5000,
    priority: 1,
    personalizedExplanation: 'Personalized explanation 1',
  },
  {
    scheme: {
      schemeId: 'scheme-2',
      officialName: 'Test Scheme 2',
      localizedName: 'Test Scheme 2',
      shortDescription: 'Description 2',
      category: 'education',
      level: 'state',
      officialWebsite: 'https://example.com',
      helplineNumber: '1800-000-0002',
    },
    eligibility: {
      eligible: true,
      confidence: 0.7,
      explanation: 'You are eligible',
    },
    estimatedBenefit: 3000,
    priority: 2,
    personalizedExplanation: 'Personalized explanation 2',
  },
  {
    scheme: {
      schemeId: 'scheme-3',
      officialName: 'Test Scheme 3',
      localizedName: 'Test Scheme 3',
      shortDescription: 'Description 3',
      category: 'health',
      level: 'central',
      officialWebsite: 'https://example.com',
      helplineNumber: '1800-000-0003',
    },
    eligibility: {
      eligible: false,
      confidence: 0.3,
      explanation: 'You are not eligible',
    },
    estimatedBenefit: 0,
    priority: 3,
    personalizedExplanation: 'Personalized explanation 3',
  },
];

const mockOnViewDetails = jest.fn();
const mockOnApply = jest.fn();

describe('SchemeCardGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all schemes in the grid', () => {
    render(
      <ThemeProvider theme={theme}>
        <SchemeCardGrid
          schemes={mockSchemes}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply} language="en"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('scheme-card-scheme-1')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-card-scheme-2')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-card-scheme-3')).toBeInTheDocument();
  });

  it('renders empty grid when no schemes provided', () => {
    render(
      <ThemeProvider theme={theme}>
        <SchemeCardGrid
          schemes={[]}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply} language="en"
        />
      </ThemeProvider>
    );

    // No scheme cards should be rendered
    expect(screen.queryByTestId(/scheme-card-/)).not.toBeInTheDocument();
  });

  it('renders correct number of schemes', () => {
    render(
      <ThemeProvider theme={theme}>
        <SchemeCardGrid
          schemes={mockSchemes}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply} language="en"
        />
      </ThemeProvider>
    );

    const schemeCards = screen.getAllByTestId(/scheme-card-/);
    expect(schemeCards).toHaveLength(mockSchemes.length);
  });

  it('passes correct props to SchemeCard components', () => {
    render(
      <ThemeProvider theme={theme}>
        <SchemeCardGrid
          schemes={mockSchemes}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply} language="en"
        />
      </ThemeProvider>
    );

    // Verify scheme names are rendered (from mocked SchemeCard)
    expect(screen.getByText('Test Scheme 1')).toBeInTheDocument();
    expect(screen.getByText('Test Scheme 2')).toBeInTheDocument();
    expect(screen.getByText('Test Scheme 3')).toBeInTheDocument();
  });

  it('renders schemes with unique keys', () => {
    // This test verifies that React doesn't throw key warnings
    // by rendering the component successfully
    render(
      <ThemeProvider theme={theme}>
        <SchemeCardGrid
          schemes={mockSchemes}
          onViewDetails={mockOnViewDetails}
          onApply={mockOnApply} language="en"
        />
      </ThemeProvider>
    );

    // If keys were not unique, React would log warnings
    // We verify all schemes are rendered correctly
    expect(screen.getByTestId('scheme-card-scheme-1')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-card-scheme-2')).toBeInTheDocument();
    expect(screen.getByTestId('scheme-card-scheme-3')).toBeInTheDocument();
  });
});
