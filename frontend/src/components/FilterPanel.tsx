import React, { useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  IconButton,
  Collapse,
  Paper,
  Typography,
  Stack,
  useMediaQuery,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export type SortOption = 'relevance' | 'benefit' | 'eligibility';
export type SchemeLevel = 'all' | 'central' | 'state';

export interface FilterPanelProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  schemeLevel?: SchemeLevel;
  onLevelChange?: (level: SchemeLevel) => void;
}

// Category configuration with display labels
const CATEGORY_LABELS: Record<string, string> = {
  agriculture: 'Agriculture',
  education: 'Education',
  health: 'Health',
  housing: 'Housing',
  employment: 'Employment',
  pension: 'Pension',
  women_welfare: 'Women Welfare',
  child_welfare: 'Child Welfare',
  disability: 'Disability',
  financial_inclusion: 'Financial Inclusion',
};

/**
 * FilterPanel Component
 * 
 * Provides category and sorting filters for scheme recommendations.
 * Features:
 * - Multi-select category chips
 * - Sort dropdown (relevance, benefit, eligibility)
 * - Scheme level filter (all, central, state)
 * - Active filter count badge
 * - Responsive collapse on mobile
 * 
 * @param categories - Available category options
 * @param selectedCategories - Currently selected categories
 * @param onCategoryChange - Callback when category selection changes
 * @param sortBy - Current sort option
 * @param onSortChange - Callback when sort option changes
 * @param schemeLevel - Current scheme level filter (optional)
 * @param onLevelChange - Callback when scheme level changes (optional)
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  selectedCategories,
  onCategoryChange,
  sortBy,
  onSortChange,
  schemeLevel = 'all',
  onLevelChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  // Calculate active filter count
  const activeFilterCount = 
    selectedCategories.length + 
    (schemeLevel !== 'all' ? 1 : 0);

  const handleCategoryClick = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    onSortChange(event.target.value as SortOption);
  };

  const handleLevelChange = (event: SelectChangeEvent<SchemeLevel>) => {
    if (onLevelChange) {
      onLevelChange(event.target.value as SchemeLevel);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: 'background.paper',
      }}
    >
      {/* Header with filter icon and expand/collapse button on mobile */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: isExpanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            badgeContent={activeFilterCount}
            color="primary"
            aria-label={`${activeFilterCount} active filters`}
          >
            <FilterListIcon color="action" />
          </Badge>
          <Typography variant="h6" component="h2">
            Filters
          </Typography>
        </Box>

        {isMobile && (
          <IconButton
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {/* Collapsible filter content */}
      <Collapse in={isExpanded}>
        <Stack spacing={3}>
          {/* Category filters */}
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
              id="category-filter-label"
            >
              Categories
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
              role="group"
              aria-labelledby="category-filter-label"
            >
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={CATEGORY_LABELS[category] || category}
                  onClick={() => handleCategoryClick(category)}
                  color={selectedCategories.includes(category) ? 'primary' : 'default'}
                  variant={selectedCategories.includes(category) ? 'filled' : 'outlined'}
                  clickable
                  aria-pressed={selectedCategories.includes(category)}
                  aria-label={`Filter by ${CATEGORY_LABELS[category] || category}`}
                />
              ))}
            </Box>
          </Box>

          {/* Sort and Level filters */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            {/* Sort dropdown */}
            <FormControl fullWidth size="small">
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sort-by-select"
                value={sortBy}
                label="Sort By"
                onChange={handleSortChange}
                aria-label="Sort schemes by"
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="benefit">Benefit Amount</MenuItem>
                <MenuItem value="eligibility">Eligibility Match</MenuItem>
              </Select>
            </FormControl>

            {/* Scheme level filter */}
            {onLevelChange && (
              <FormControl fullWidth size="small">
                <InputLabel id="scheme-level-label">Scheme Level</InputLabel>
                <Select
                  labelId="scheme-level-label"
                  id="scheme-level-select"
                  value={schemeLevel}
                  label="Scheme Level"
                  onChange={handleLevelChange}
                  aria-label="Filter by scheme level"
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="central">Central</MenuItem>
                  <MenuItem value="state">State</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  );
};
