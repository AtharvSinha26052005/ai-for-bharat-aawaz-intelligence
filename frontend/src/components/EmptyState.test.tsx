import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { EmptyState } from './EmptyState';
import { theme } from '../theme/theme';
import SearchOffIcon from '@mui/icons-material/SearchOff';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('EmptyState Component', () => {
  it('renders icon, title, and description', () => {
    renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
      />
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  it('renders without action button when action prop is not provided', () => {
    renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when action prop is provided', () => {
    const mockOnClick = jest.fn();

    renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
        action={{
          label: 'Clear Filters',
          onClick: mockOnClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Clear Filters' });
    expect(button).toBeInTheDocument();
  });

  it('calls action onClick handler when button is clicked', () => {
    const mockOnClick = jest.fn();

    renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
        action={{
          label: 'Clear Filters',
          onClick: mockOnClick,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Clear Filters' });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('displays centered layout with proper spacing', () => {
    const { container } = renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
      />
    );

    const boxElement = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(boxElement);

    expect(styles.display).toBe('flex');
    expect(styles.flexDirection).toBe('column');
    expect(styles.alignItems).toBe('center');
    expect(styles.textAlign).toBe('center');
  });

  it('renders custom icon component', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Custom</div>;

    renderWithTheme(
      <EmptyState
        icon={<CustomIcon />}
        title="No results found"
        description="Try adjusting your search criteria"
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('handles long description text', () => {
    const longDescription =
      'This is a very long description that should still be displayed properly within the component with appropriate text wrapping and maximum width constraints to ensure readability.';

    renderWithTheme(
      <EmptyState
        icon={<SearchOffIcon />}
        title="No results found"
        description={longDescription}
      />
    );

    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });
});
