import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Language, SchemeRecommendation } from '../types';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel, SortOption, SchemeLevel } from '../components/FilterPanel';
import { SchemeCardGrid } from '../components/SchemeCardGrid';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { filterSchemes, sortSchemes, FilterState } from '../utils/schemeFilters';
import { sanitizeSearchQuery } from '../utils/sanitization';
import { loadAllSchemes } from '../utils/schemeLoader';
import { useTranslation } from '../hooks/useTranslation';

// Lazy load SchemeDetailDialog for better performance
// Validates Requirement 12.4: Lazy load SchemeDetailDialog to reduce initial bundle size
const SchemeDetailDialog = lazy(() =>
  import('../components/SchemeDetailDialog').then((module) => ({
    default: module.SchemeDetailDialog,
  }))
);

interface SchemesProps {
  language: Language;
  userId: string | null;
}

// Available scheme categories
const SCHEME_CATEGORIES = [
  'agriculture',
  'education',
  'health',
  'housing',
  'employment',
  'pension',
  'women_welfare',
  'child_welfare',
  'disability',
  'financial_inclusion',
];

/**
 * Validates and sanitizes filter state
 * Validates Requirement 13.4: Reset invalid filters to default values
 * Validates Requirement 15.1: Add input sanitization for search queries
 */
const validateFilterState = (filters: FilterState): FilterState => {
  const validatedFilters = { ...filters };
  let hasInvalidValues = false;

  // Validate selected categories - remove invalid ones
  if (filters.selectedCategories.length > 0) {
    const validCategories = filters.selectedCategories.filter((cat) =>
      SCHEME_CATEGORIES.includes(cat)
    );
    if (validCategories.length !== filters.selectedCategories.length) {
      validatedFilters.selectedCategories = validCategories;
      hasInvalidValues = true;
    }
  }

  // Validate scheme level
  if (!['all', 'central', 'state'].includes(filters.schemeLevel)) {
    validatedFilters.schemeLevel = 'all';
    hasInvalidValues = true;
  }

  // Sanitize search query (XSS prevention)
  // Validates Requirement 15.1: Add input sanitization for search queries
  if (filters.searchQuery) {
    const sanitized = sanitizeSearchQuery(filters.searchQuery);
    if (sanitized !== filters.searchQuery) {
      validatedFilters.searchQuery = sanitized;
      hasInvalidValues = true;
    }
  }

  if (hasInvalidValues) {
    console.warn('Invalid filter values detected and corrected');
  }

  return validatedFilters;
};

/**
 * Schemes Page Component
 * 
 * Displays eligible government schemes with search, filtering, and sorting capabilities.
 * Integrates all UI redesign components:
 * - SearchBar for text-based search
 * - FilterPanel for category and level filtering
 * - SchemeCardGrid for responsive card layout
 * - LoadingSkeleton during data fetch
 * - EmptyState when no schemes match filters
 * - SchemeDetailDialog for detailed scheme information
 * 
 * Validates Requirements: 3.2, 4.2, 4.5, 5.2, 7.1, 8.1, 12.2
 */
export const Schemes: React.FC<SchemesProps> = ({ language, userId }) => {
  const { t } = useTranslation(language);
  
  // State management
  const [schemes, setSchemes] = useState<SchemeRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<SchemeRecommendation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state management
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedCategories: [],
    schemeLevel: 'all',
  });
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Fetch schemes from JSON on component mount
  useEffect(() => {
    loadSchemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sanitizes error messages to remove PII
   * Validates Requirement 15.5: Error logs should not contain sensitive user information
   */
  const sanitizeErrorMessage = (error: any): string => {
    const message = error?.error?.message || error?.message || 'An error occurred';
    // Remove potential PII patterns (email, phone, ID numbers)
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b\d{10,}\b/g, '[id]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
  };

  const loadSchemes = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Loading schemes from JSON...');
      // Load schemes from local JSON file
      const loadedSchemes = await loadAllSchemes();
      
      console.log(`Loaded ${loadedSchemes.length} schemes`);
      
      if (loadedSchemes.length === 0) {
        setError('No schemes data available. Please check if myscheme_full_1000.json exists in the public folder.');
        return;
      }
      
      setSchemes(loadedSchemes);
      console.log(`Successfully loaded ${loadedSchemes.length} schemes from local data`);
    } catch (err: any) {
      console.error('Error loading schemes:', err);
      const sanitizedMessage = sanitizeErrorMessage(err);
      setError(`Failed to load schemes: ${sanitizedMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate filtered and sorted schemes using useMemo for performance
  // Validates Requirement 12.2: Memoize filtered schemes calculation to prevent unnecessary re-computation
  const filteredSchemes = useMemo(() => {
    // Validate filters before applying
    const validatedFilters = validateFilterState(filters);
    let result = filterSchemes(schemes, validatedFilters);
    result = sortSchemes(result, sortBy);
    return result;
  }, [schemes, filters, sortBy]);

  // Handler callbacks
  const handleSearchChange = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const handleCategoryChange = (categories: string[]) => {
    setFilters((prev) => ({ ...prev, selectedCategories: categories }));
  };

  const handleLevelChange = (level: SchemeLevel) => {
    setFilters((prev) => ({ ...prev, schemeLevel: level }));
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
  };

  const handleViewDetails = (scheme: SchemeRecommendation) => {
    setSelectedScheme(scheme);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedScheme(null);
  };

  const handleApply = (schemeId: string) => {
    // TODO: Implement apply functionality
    console.log('Apply for scheme:', schemeId);
  };

  const handleMarkInterested = async (scheme: SchemeRecommendation) => {
    try {
      const profileId = localStorage.getItem('profileId');
      if (!profileId) {
        console.error('No profile ID found');
        return;
      }

      const response = await fetch('http://localhost:3000/api/v1/interested-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: profileId,
          scheme_name: scheme.scheme.officialName,
          scheme_slug: scheme.scheme.schemeId,
          scheme_description: scheme.scheme.shortDescription,
          scheme_benefits: scheme.personalizedExplanation,
          scheme_ministry: scheme.scheme.officialName.split(' - ')[0], // Extract ministry if available
          scheme_apply_link: scheme.scheme.officialWebsite || '',
        }),
      });

      if (response.ok) {
        console.log('Scheme marked as interested successfully');
        // Show success message (optional)
        alert('Scheme saved! Visit the Learn Finance page to get financial advice.');
      } else {
        console.error('Failed to mark scheme as interested');
      }
    } catch (error) {
      console.error('Error marking scheme as interested:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      selectedCategories: [],
      schemeLevel: 'all',
    });
    setSortBy('relevance');
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.selectedCategories.length > 0 ||
    filters.schemeLevel !== 'all';

  // Render: No user ID - still show schemes
  if (!userId) {
    // Allow browsing schemes without a profile
    // Just don't show personalized recommendations
  }

  // Render: Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t.schemes.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
          {t.schemes.loading}
        </Typography>
        <LoadingSkeleton variant="card" count={6} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          {t.schemes.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t.schemes.subtitle}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadSchemes}>
              {t.common.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={filters.searchQuery}
          onChange={handleSearchChange}
          placeholder={t.schemes.searchPlaceholder}
        />
      </Box>

      {/* Screen reader announcement for search results count (Requirement 14.7) */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {!loading && `${filteredSchemes.length} scheme${filteredSchemes.length !== 1 ? 's' : ''} found`}
      </Box>

      {/* Filter Panel */}
      <FilterPanel
        categories={SCHEME_CATEGORIES}
        selectedCategories={filters.selectedCategories}
        onCategoryChange={handleCategoryChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        schemeLevel={filters.schemeLevel}
        onLevelChange={handleLevelChange}
      />

      {/* Schemes Display */}
      {filteredSchemes.length === 0 ? (
        <EmptyState
          icon={<SearchOffIcon />}
          title={t.schemes.noSchemesFound}
          description={
            hasActiveFilters
              ? t.schemes.noSchemesFilters
              : t.schemes.noSchemesAvailable
          }
          action={
            hasActiveFilters
              ? {
                  label: t.schemes.clearFilters,
                  onClick: handleClearFilters,
                }
              : undefined
          }
        />
      ) : (
        <SchemeCardGrid
          schemes={filteredSchemes}
          onViewDetails={handleViewDetails}
          onApply={handleApply}
          language={language}
        />
      )}

      {/* Scheme Detail Dialog with Suspense boundary */}
      {/* Validates Requirement 12.4: Add Suspense boundary for lazy-loaded components */}
      <Suspense
        fallback={
          <Box
            sx={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <SchemeDetailDialog
          open={dialogOpen}
          scheme={selectedScheme}
          onClose={handleCloseDialog}
          onApply={handleApply}
          onMarkInterested={handleMarkInterested}
          profileId={userId}
        />
      </Suspense>
    </Container>
  );
};
