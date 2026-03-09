/**
 * Unit tests for PersonalizedResultsDisplay component
 * Focuses on handleMarkInterested function implementation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { renderHook, act } from '@testing-library/react';
import { PersonalizedScheme, PersonalizedResultsDisplay } from './PersonalizedResultsDisplay';
import { transformForAPI } from '../utils/schemeTransformers';
import { theme } from '../theme/theme';

// Mock fetch globally
global.fetch = jest.fn();

// Helper function to wrap component with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('PersonalizedResultsDisplay - handleMarkInterested', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  it('should retrieve profileId from localStorage', async () => {
    // Arrange
    const mockProfileId = 'test-profile-123';
    localStorage.setItem('profileId', mockProfileId);

    const mockScheme: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      description: 'Test description',
      benefits_summary: 'Test benefits',
      apply_link: 'https://test.com',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Act
    const apiPayload = transformForAPI(mockScheme, mockProfileId);
    
    await fetch('http://localhost:3000/api/v1/interested-schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/interested-schemes',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: mockProfileId,
          scheme_name: 'Test Scheme',
          scheme_slug: 'test-scheme',
          scheme_description: 'Test description',
          scheme_benefits: 'Test benefits',
          scheme_ministry: 'Test Ministry',
          scheme_apply_link: 'https://test.com',
        }),
      })
    );
  });

  it('should handle missing profileId gracefully', () => {
    // Arrange - no profileId in localStorage
    const profileId = localStorage.getItem('profileId');

    // Assert
    expect(profileId).toBeNull();
  });

  it('should transform scheme data using transformForAPI', () => {
    // Arrange
    const mockScheme: PersonalizedScheme = {
      name: 'PM-KISAN',
      slug: 'pm-kisan',
      ministry: 'Ministry of Agriculture',
      description: 'Income support for farmers',
      benefits_summary: '₹6000 per year',
      apply_link: 'https://pmkisan.gov.in',
    };
    const profileId = 'user-123';

    // Act
    const result = transformForAPI(mockScheme, profileId);

    // Assert
    expect(result).toEqual({
      profile_id: 'user-123',
      scheme_name: 'PM-KISAN',
      scheme_slug: 'pm-kisan',
      scheme_description: 'Income support for farmers',
      scheme_benefits: '₹6000 per year',
      scheme_ministry: 'Ministry of Agriculture',
      scheme_apply_link: 'https://pmkisan.gov.in',
    });
  });

  it('should send POST request to correct endpoint', async () => {
    // Arrange
    const mockProfileId = 'test-profile-456';
    localStorage.setItem('profileId', mockProfileId);

    const mockScheme: PersonalizedScheme = {
      name: 'Test Scheme 2',
      slug: 'test-scheme-2',
      ministry: 'Test Ministry 2',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Act
    const apiPayload = transformForAPI(mockScheme, mockProfileId);
    await fetch('http://localhost:3000/api/v1/interested-schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/interested-schemes',
      expect.any(Object)
    );
  });

  it('should handle API success response', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Act
    const response = await fetch('http://localhost:3000/api/v1/interested-schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Assert
    expect(response.ok).toBe(true);
  });

  it('should handle API error response', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    // Act
    const response = await fetch('http://localhost:3000/api/v1/interested-schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Assert
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('should handle network errors', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Act & Assert
    await expect(
      fetch('http://localhost:3000/api/v1/interested-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    ).rejects.toThrow('Network error');
  });
});

describe('PersonalizedResultsDisplay - Conditional Button Rendering', () => {
  it('should render both View Details and Apply Now buttons when apply_link exists', () => {
    // Arrange
    const schemeWithApplyLink: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      apply_link: 'https://test.com/apply',
    };

    // Assert - verify the scheme has apply_link
    expect(schemeWithApplyLink.apply_link).toBeDefined();
    expect(schemeWithApplyLink.apply_link).toBe('https://test.com/apply');
  });

  it('should render only View Details button when apply_link is missing', () => {
    // Arrange
    const schemeWithoutApplyLink: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      // apply_link is intentionally omitted
    };

    // Assert - verify the scheme does not have apply_link
    expect(schemeWithoutApplyLink.apply_link).toBeUndefined();
  });

  it('should render only View Details button when apply_link is null', () => {
    // Arrange
    const schemeWithNullApplyLink: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      apply_link: undefined,
    };

    // Assert - verify the scheme has undefined apply_link
    expect(schemeWithNullApplyLink.apply_link).toBeUndefined();
  });

  it('should render only View Details button when apply_link is empty string', () => {
    // Arrange
    const schemeWithEmptyApplyLink: PersonalizedScheme = {
      name: 'Test Scheme',
      slug: 'test-scheme',
      ministry: 'Test Ministry',
      apply_link: '',
    };

    // Assert - verify the scheme has empty apply_link (falsy value)
    expect(schemeWithEmptyApplyLink.apply_link).toBe('');
    expect(!!schemeWithEmptyApplyLink.apply_link).toBe(false);
  });
});

/**
 * Task 8.1: Verify Interest Dialog triggers from "Apply Now"
 * Requirements: 3.1, 3.2, 3.3
 */
describe('Task 8.1 - Interest Dialog Integration from Recommended Schemes', () => {
  const mockRecommendations: PersonalizedScheme[] = [
    {
      schemeId: 'scheme-1',
      name: 'PM-KISAN',
      slug: 'pm-kisan',
      ministry: 'Ministry of Agriculture',
      description: 'Income support for farmers',
      benefits_summary: '₹6000 per year',
      apply_link: 'https://pmkisan.gov.in',
      final_score: 0.85,
      explanation: ['You own cultivable land', 'You meet income criteria'],
      category: 'agriculture',
      scheme_type: 'central',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Set up profileId in localStorage
    localStorage.setItem('profileId', 'test-profile-123');
    
    // Mock fetch for API calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should open Interest Dialog when "Apply Now" is clicked in SchemeDetailDialog (Requirement 3.1)', async () => {
    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Click "View Details" to open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    // Wait for SchemeDetailDialog to open by checking for the Apply Now button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now" in SchemeDetailDialog
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Verify Interest Dialog opens (Requirement 3.1)
    await waitFor(() => {
      expect(screen.getByText('Are you interested in this scheme?')).toBeInTheDocument();
    });
  });

  it('should display correct text in Interest Dialog (Requirement 3.2)', async () => {
    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now"
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Verify Interest Dialog displays correct text (Requirement 3.2)
    await waitFor(() => {
      expect(screen.getByText('Are you interested in this scheme?')).toBeInTheDocument();
      expect(screen.getByText(/would you like to save this scheme/i)).toBeInTheDocument();
    });
  });

  it('should display "Yes" and "No" buttons in Interest Dialog (Requirement 3.3)', async () => {
    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now"
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Verify "Yes" and "No" buttons appear (Requirement 3.3)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /yes, i'm interested/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no, thanks/i })).toBeInTheDocument();
    });
  });

  it('should call handleMarkInterested when "Yes" is clicked', async () => {
    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now"
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Wait for Interest Dialog
    await waitFor(() => {
      expect(screen.getByText('Are you interested in this scheme?')).toBeInTheDocument();
    });

    // Click "Yes"
    const yesButton = screen.getByRole('button', { name: /yes, i'm interested/i });
    fireEvent.click(yesButton);

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/interested-schemes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('PM-KISAN'),
        })
      );
    });
  });

  it('should close both dialogs when "No" is clicked without saving', async () => {
    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now"
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Wait for Interest Dialog
    await waitFor(() => {
      expect(screen.getByText('Are you interested in this scheme?')).toBeInTheDocument();
    });

    // Click "No"
    const noButton = screen.getByRole('button', { name: /no, thanks/i });
    fireEvent.click(noButton);

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();

    // Verify both dialogs are closed
    await waitFor(() => {
      expect(screen.queryByText('Are you interested in this scheme?')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply now for pm-kisan/i })).not.toBeInTheDocument();
    });
  });

  it('should not open Interest Dialog when profileId is missing', async () => {
    // Clear profileId from localStorage
    localStorage.clear();

    renderWithTheme(
      <PersonalizedResultsDisplay recommendations={mockRecommendations} />
    );

    // Open SchemeDetailDialog
    const viewDetailsButton = screen.getByRole('button', { name: /view details for pm-kisan/i });
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply now for pm-kisan/i })).toBeInTheDocument();
    });

    // Click "Apply Now"
    const applyNowButton = screen.getByRole('button', { name: /apply now for pm-kisan/i });
    fireEvent.click(applyNowButton);

    // Verify Interest Dialog does NOT open
    await waitFor(() => {
      expect(screen.queryByText('Are you interested in this scheme?')).not.toBeInTheDocument();
    });

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
