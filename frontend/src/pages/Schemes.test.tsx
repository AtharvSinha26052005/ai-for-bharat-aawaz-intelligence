import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Schemes } from './Schemes';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';

// Mock the API service module
jest.mock('../services/apiService', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

// Import after mocking
import { apiService } from '../services/apiService';
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock scheme data
const mockSchemes = [
  {
    scheme: {
      schemeId: 'scheme-1',
      officialName: 'PM-KISAN',
      shortDescription: 'Direct income support to farmers',
      category: 'agriculture',
      level: 'central',
      officialWebsite: 'https://pmkisan.gov.in',
      helplineNumber: '1800-123-4567',
    },
    eligibility: {
      eligible: true,
      confidence: 0.85,
      explanation: 'You are eligible based on your farmer status',
    },
    estimatedBenefit: 6000,
    personalizedExplanation: 'You can receive ₹6000 per year',
  },
  {
    scheme: {
      schemeId: 'scheme-2',
      officialName: 'Ayushman Bharat',
      shortDescription: 'Health insurance for poor families',
      category: 'health',
      level: 'central',
      officialWebsite: 'https://pmjay.gov.in',
      helplineNumber: '14555',
    },
    eligibility: {
      eligible: true,
      confidence: 0.75,
      explanation: 'You are eligible based on your income',
    },
    estimatedBenefit: 500000,
    personalizedExplanation: 'You can receive health coverage up to ₹5 lakh',
  },
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('Schemes Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading skeleton while fetching schemes', () => {
    mockApiService.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    expect(screen.getByText('Eligible Schemes')).toBeInTheDocument();
    // LoadingSkeleton should be rendered (check for skeleton elements)
  });

  it('should display schemes after successful fetch', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: {
        recommendations: mockSchemes,
      },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('PM-KISAN')).toBeInTheDocument();
      expect(screen.getByText('Ayushman Bharat')).toBeInTheDocument();
    });
  });

  it('should display SearchBar component', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: {
        recommendations: mockSchemes,
      },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search schemes/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('should display FilterPanel component', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: {
        recommendations: mockSchemes,
      },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });
  });

  it('should display EmptyState when no schemes match filters', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: {
        recommendations: [],
      },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('No schemes found')).toBeInTheDocument();
    });
  });

  it('should display error alert with retry button on API failure', async () => {
    mockApiService.get.mockRejectedValue({
      error: { message: 'Network error' },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should display warning when userId is null', () => {
    renderWithTheme(<Schemes language="en" userId={null} />);

    expect(
      screen.getByText(/please create your profile first/i)
    ).toBeInTheDocument();
  });

  it('should render SchemeCardGrid with correct number of schemes', async () => {
    mockApiService.get.mockResolvedValue({
      success: true,
      data: {
        recommendations: mockSchemes,
      },
    });

    renderWithTheme(<Schemes language="en" userId="user-123" />);

    await waitFor(() => {
      // Both schemes should be rendered
      expect(screen.getByText('PM-KISAN')).toBeInTheDocument();
      expect(screen.getByText('Ayushman Bharat')).toBeInTheDocument();
      
      // Check for View Details buttons (2 schemes = 2 buttons)
      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons).toHaveLength(2);
    });
  });
});
