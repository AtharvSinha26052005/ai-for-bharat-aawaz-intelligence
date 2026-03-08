import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import { FilterPanel, SortOption, SchemeLevel } from './FilterPanel';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('FilterPanel', () => {
  const mockCategories = [
    'agriculture',
    'education',
    'health',
    'housing',
    'employment',
  ];

  const defaultProps = {
    categories: mockCategories,
    selectedCategories: [],
    onCategoryChange: jest.fn(),
    sortBy: 'relevance' as SortOption,
    onSortChange: jest.fn(),
    schemeLevel: 'all' as SchemeLevel,
    onLevelChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter panel with title', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('displays all category chips', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText(/Filter by Agriculture/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Education/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Health/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Housing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Employment/i)).toBeInTheDocument();
  });

  it('calls onCategoryChange when category chip is clicked', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    const agricultureChip = screen.getByLabelText(/Filter by Agriculture/i);
    fireEvent.click(agricultureChip);
    expect(defaultProps.onCategoryChange).toHaveBeenCalledWith(['agriculture']);
  });

  it('removes category when already selected chip is clicked', () => {
    const props = {
      ...defaultProps,
      selectedCategories: ['agriculture', 'education'],
    };
    renderWithTheme(<FilterPanel {...props} />);
    const agricultureChip = screen.getByLabelText(/Filter by Agriculture/i);
    fireEvent.click(agricultureChip);
    expect(defaultProps.onCategoryChange).toHaveBeenCalledWith(['education']);
  });

  it('displays sort dropdown with correct options', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    const sortSelect = screen.getByLabelText(/Sort schemes by/i);
    expect(sortSelect).toBeInTheDocument();
  });

  it('renders sort dropdown with correct initial value', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    const sortSelect = screen.getByLabelText(/Sort schemes by/i);
    expect(sortSelect).toBeInTheDocument();
  });

  it('displays scheme level dropdown when onLevelChange is provided', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText(/Filter by scheme level/i)).toBeInTheDocument();
  });

  it('does not display scheme level dropdown when onLevelChange is not provided', () => {
    const props = {
      ...defaultProps,
      onLevelChange: undefined,
    };
    renderWithTheme(<FilterPanel {...props} />);
    expect(screen.queryByLabelText(/Filter by scheme level/i)).not.toBeInTheDocument();
  });

  it('renders scheme level dropdown with correct initial value', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    const levelSelect = screen.getByLabelText(/Filter by scheme level/i);
    expect(levelSelect).toBeInTheDocument();
  });

  it('displays active filter count badge', () => {
    const props = {
      ...defaultProps,
      selectedCategories: ['agriculture', 'education'],
      schemeLevel: 'central' as SchemeLevel,
    };
    renderWithTheme(<FilterPanel {...props} />);
    // Badge should show 3 (2 categories + 1 level filter)
    expect(screen.getByLabelText(/3 active filters/i)).toBeInTheDocument();
  });

  it('shows zero active filters when no filters are applied', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    expect(screen.getByLabelText(/0 active filters/i)).toBeInTheDocument();
  });

  it('marks selected categories with aria-pressed=true', () => {
    const props = {
      ...defaultProps,
      selectedCategories: ['agriculture'],
    };
    renderWithTheme(<FilterPanel {...props} />);
    const agricultureChip = screen.getByLabelText(/Filter by Agriculture/i);
    expect(agricultureChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks unselected categories with aria-pressed=false', () => {
    renderWithTheme(<FilterPanel {...defaultProps} />);
    const agricultureChip = screen.getByLabelText(/Filter by Agriculture/i);
    expect(agricultureChip).toHaveAttribute('aria-pressed', 'false');
  });
});
