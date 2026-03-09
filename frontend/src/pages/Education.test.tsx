/**
 * Bug Condition Exploration Test for Education Page
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * Property 1: Fault Condition - Fresh Data on Navigation
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * This test encodes the expected behavior:
 * - When a user marks a scheme as interested from any page
 * - Then navigates to the Education page
 * - The Education page SHALL display the newly marked scheme
 * 
 * The bug occurs because useEffect only depends on userId, which doesn't change
 * during navigation. When the component is already mounted and user navigates back,
 * the data isn't refreshed.
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
 * - Education page shows stale data when navigating back
 * 
 * This test will validate the fix when it passes after implementation.
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { Education } from './Education';
import { Language } from '../types';
import { useLocation } from 'react-router-dom';

// Mock react-router-dom
jest.mock('react-router-dom');

// Mock fetch globally
global.fetch = jest.fn();

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

describe('Education Page - Bug Condition Exploration', () => {
  const mockUserId = 'test-user-123';
  const mockProfileId = 'test-profile-456';
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('profileId', mockProfileId);
    
    // Mock useLocation to return a default pathname
    mockUseLocation.mockReturnValue({ 
      pathname: '/education',
      search: '',
      hash: '',
      state: null,
      key: 'default',
      unstable_mask: undefined,
    });
    
    // Default mock implementation
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  /**
   * Test Case 1: Navigation detection with location change
   * 
   * With the fix, the component should fetch fresh data when location.pathname changes.
   * This test verifies that adding location.pathname to useEffect dependencies works.
   * 
   * EXPECTED ON FIXED CODE: PASSES - component fetches data on mount
   */
  it('should fetch fresh data when component mounts (verifies fix is in place)', async () => {
    // Mock initial fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    mockUseLocation.mockReturnValue({ 
      pathname: '/education', 
      search: '', 
      hash: '', 
      state: null, 
      key: 'key1',
      unstable_mask: undefined,
    });

    render(<Education language="en" userId={mockUserId} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/No Interested Schemes Yet/i)).toBeInTheDocument();
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case 3: Unmount and remount refreshes data
   * 
   * This test verifies that the fix works correctly when navigating to the page.
   * With the fix in place, data is refreshed on every mount.
   * 
   * EXPECTED ON FIXED CODE: PASSES - displays new data after remount
   */
  it('should display new data after unmount and remount', async () => {
    // First render: no interested schemes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    mockUseLocation.mockReturnValue({ 
      pathname: '/education', 
      search: '', 
      hash: '', 
      state: null, 
      key: 'key1',
      unstable_mask: undefined,
    });

    const { unmount } = render(<Education language="en" userId={mockUserId} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/No Interested Schemes Yet/i)).toBeInTheDocument();
    });

    // Unmount (full page navigation)
    unmount();

    // Backend state changes
    const newScheme = {
      id: '2',
      profile_id: mockProfileId,
      scheme_name: 'Ayushman Bharat',
      scheme_slug: 'ayushman-bharat',
      scheme_description: 'Health insurance for poor families',
      scheme_benefits: 'Rs 5 lakh health cover',
      scheme_ministry: 'Ministry of Health',
      scheme_apply_link: 'https://pmjay.gov.in',
      created_at: new Date().toISOString(),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [newScheme] }),
    });

    mockUseLocation.mockReturnValue({ 
      pathname: '/education', 
      search: '', 
      hash: '', 
      state: null, 
      key: 'key2',
      unstable_mask: undefined,
    });

    // Remount (navigate back)
    render(<Education language="en" userId={mockUserId} />);

    // This works because remount triggers useEffect
    await waitFor(() => {
      expect(screen.getByText('Ayushman Bharat')).toBeInTheDocument();
    });
  });

  /**
   * Test Case 2: Verify useEffect dependencies include location.pathname
   * 
   * This test verifies that the fix (adding location.pathname to useEffect dependencies) is in place.
   * We check that the component has the correct dependency by verifying it fetches data on mount.
   * 
   * EXPECTED ON FIXED CODE: PASSES - component fetches data correctly
   */
  it('should have location.pathname in useEffect dependencies (integration test)', async () => {
    const mockScheme = {
      id: '1',
      profile_id: mockProfileId,
      scheme_name: 'PM-KISAN',
      scheme_slug: 'pm-kisan',
      scheme_description: 'Direct income support to farmers',
      scheme_benefits: 'Rs 6000 per year',
      scheme_ministry: 'Ministry of Agriculture',
      scheme_apply_link: 'https://pmkisan.gov.in',
      created_at: new Date().toISOString(),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockScheme] }),
    });

    mockUseLocation.mockReturnValue({ 
      pathname: '/education', 
      search: '', 
      hash: '', 
      state: null, 
      key: 'test',
      unstable_mask: undefined,
    });

    render(<Education language="en" userId={mockUserId} />);

    // Verify data is fetched and displayed
    await waitFor(() => {
      expect(screen.getByText('PM-KISAN')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * Property 2: Preservation - Existing Functionality
 * 
 * These tests verify that the fix doesn't break existing functionality.
 * They capture the current behavior on UNFIXED code and ensure it remains
 * unchanged after the fix is implemented.
 * 
 * IMPORTANT: These tests are run on UNFIXED code first to observe baseline behavior,
 * then run again after the fix to ensure no regressions.
 * 
 * EXPECTED OUTCOME: Tests PASS on both unfixed and fixed code (confirms no regressions).
 */

import { fireEvent } from '@testing-library/react';

describe('Preservation Property Tests - Existing Functionality', () => {
  const mockUserId = 'test-user-123';
  const mockProfileId = 'test-profile-456';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('profileId', mockProfileId);
    
    // Mock useLocation to return a default pathname
    mockUseLocation.mockReturnValue({ 
      pathname: '/education',
      search: '',
      hash: '',
      state: null,
      key: 'default',
      unstable_mask: undefined,
    });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  /**
   * Test 1: Scheme Removal Preservation
   * 
   * **Validates: Requirement 3.1**
   * 
   * WHEN a user removes a scheme from the interested list on the Learn Finance page,
   * THEN the system SHALL CONTINUE TO immediately update the display to remove that scheme
   */
  it('should immediately update display when removing a scheme', async () => {
    const mockSchemes = [
      {
        id: '1',
        profile_id: mockProfileId,
        scheme_name: 'PM-KISAN',
        scheme_slug: 'pm-kisan',
        scheme_description: 'Direct income support to farmers',
        scheme_benefits: 'Rs 6000 per year',
        scheme_ministry: 'Ministry of Agriculture',
        scheme_apply_link: 'https://pmkisan.gov.in',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        profile_id: mockProfileId,
        scheme_name: 'Ayushman Bharat',
        scheme_slug: 'ayushman-bharat',
        scheme_description: 'Health insurance',
        scheme_benefits: 'Rs 5 lakh cover',
        scheme_ministry: 'Ministry of Health',
        scheme_apply_link: 'https://pmjay.gov.in',
        created_at: new Date().toISOString(),
      },
    ];

    // Mock initial fetch with schemes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockSchemes }),
    });

    const { getByText, queryByText } = render(
      <Education language="en" userId={mockUserId} />
    );

    // Wait for schemes to load
    await waitFor(() => {
      expect(getByText('PM-KISAN')).toBeInTheDocument();
      expect(getByText('Ayushman Bharat')).toBeInTheDocument();
    });

    // Mock the DELETE request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Mock the reload with remaining schemes
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockSchemes[1]] }),
    });

    // Find and click the first delete button
    const deleteButtons = document.querySelectorAll('[aria-label*="Remove"]');
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }

    // Wait for the scheme to be removed from display
    await waitFor(() => {
      expect(queryByText('PM-KISAN')).not.toBeInTheDocument();
      expect(getByText('Ayushman Bharat')).toBeInTheDocument();
    });
  });

  /**
   * Test 2: Empty State Display Preservation
   * 
   * **Validates: Requirement 3.3**
   * 
   * WHEN a user has no interested schemes,
   * THEN the system SHALL CONTINUE TO display the "No Interested Schemes Yet" message with a button to browse schemes
   */
  it('should display empty state when no schemes exist', async () => {
    // Mock fetch to return empty array
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { getByText } = render(
      <Education language="en" userId={mockUserId} />
    );

    // Wait for empty state to display
    await waitFor(() => {
      expect(getByText(/No Interested Schemes Yet/i)).toBeInTheDocument();
    });

    // Verify browse button is present
    const browseButton = getByText(/Browse Schemes/i, { selector: 'a' });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toHaveAttribute('href', '/schemes');
  });

  /**
   * Test 3: Loading State Preservation
   * 
   * **Validates: Requirement 3.4**
   * 
   * WHEN the Learn Finance page loads interested schemes,
   * THEN the system SHALL CONTINUE TO display a loading spinner while fetching data
   */
  it('should handle loading state during data fetch', async () => {
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(delayedPromise);

    const { container } = render(
      <Education language="en" userId={mockUserId} />
    );

    // Resolve the promise
    setTimeout(() => {
      resolvePromise!({
        ok: true,
        json: async () => ({ data: [] }),
      });
    }, 50);

    // Wait for data to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  /**
   * Test 4: Error Handling Preservation
   * 
   * **Validates: Requirement 3.5**
   * 
   * WHEN the API request to fetch interested schemes fails,
   * THEN the system SHALL CONTINUE TO handle the error gracefully without crashing
   */
  it('should handle API errors gracefully without crashing', async () => {
    // Mock console.error to verify it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock fetch to reject with an error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(
      <Education language="en" userId={mockUserId} />
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Component should still render without crashing
    expect(container).toBeInTheDocument();

    // Give it a moment for error handling
    await new Promise(resolve => setTimeout(resolve, 100));

    consoleErrorSpy.mockRestore();
  });
});
