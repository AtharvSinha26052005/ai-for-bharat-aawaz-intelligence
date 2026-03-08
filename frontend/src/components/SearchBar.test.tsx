import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import { SearchBar, SearchBarProps } from './SearchBar';

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('SearchBar Component', () => {
  const defaultProps: SearchBarProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default placeholder', () => {
      renderWithTheme(<SearchBar {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search schemes...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      renderWithTheme(<SearchBar {...defaultProps} placeholder="Find programs..." />);
      expect(screen.getByPlaceholderText('Find programs...')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      renderWithTheme(<SearchBar {...defaultProps} />);
      const searchInput = screen.getByLabelText('Search schemes');
      expect(searchInput).toBeInTheDocument();
    });

    it('should display the current value', () => {
      renderWithTheme(<SearchBar {...defaultProps} value="agriculture" />);
      expect(screen.getByDisplayValue('agriculture')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should update local value on input change', () => {
      renderWithTheme(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search schemes...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'health' } });
      
      expect(input.value).toBe('health');
    });

    it('should show clear button when input has value', () => {
      renderWithTheme(<SearchBar {...defaultProps} value="test" />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should not show clear button when input is empty', () => {
      renderWithTheme(<SearchBar {...defaultProps} value="" />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} value="test" onChange={onChange} />);
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should debounce onChange calls with default 300ms delay', () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: 'a' } });
      expect(onChange).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(onChange).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onChange).toHaveBeenCalledWith('a');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should debounce with custom delay', () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} debounceMs={500} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(onChange).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onChange).toHaveBeenCalledWith('test');
    });

    it('should cancel previous debounce on rapid typing', () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: 'a' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      fireEvent.change(input, { target: { value: 'ab' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      fireEvent.change(input, { target: { value: 'abc' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Only the last value should be emitted
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('should show loading indicator during debounce', () => {
      renderWithTheme(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(screen.getByLabelText('Loading search results')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // After debounce completes, loading indicator should be gone
      expect(screen.queryByLabelText('Loading search results')).not.toBeInTheDocument();
    });

    it('should not show loading indicator when value matches prop', () => {
      renderWithTheme(<SearchBar {...defaultProps} value="test" />);
      expect(screen.queryByLabelText('Loading search results')).not.toBeInTheDocument();
    });
  });

  describe('External Value Changes', () => {
    it('should sync local value when prop value changes', () => {
      const { rerender } = renderWithTheme(<SearchBar {...defaultProps} value="" />);
      const input = screen.getByPlaceholderText('Search schemes...') as HTMLInputElement;
      
      expect(input.value).toBe('');
      
      rerender(
        <ThemeProvider theme={theme}>
          <SearchBar {...defaultProps} value="external update" />
        </ThemeProvider>
      );
      
      expect(input.value).toBe('external update');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for search input', () => {
      renderWithTheme(<SearchBar {...defaultProps} />);
      expect(screen.getByLabelText('Search schemes')).toBeInTheDocument();
    });

    it('should have proper ARIA label for clear button', () => {
      renderWithTheme(<SearchBar {...defaultProps} value="test" />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should have proper ARIA label for loading indicator', async () => {
      jest.useFakeTimers();
      renderWithTheme(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(screen.getByLabelText('Loading search results')).toBeInTheDocument();
      
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string input', () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: '' } });
      
      expect(input).toHaveValue('');
    });

    it('should handle special characters', async () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: '!@#$%^&*()' } });
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('!@#$%^&*()');
      }, { timeout: 400 });
    });

    it('should handle very long input strings', async () => {
      const onChange = jest.fn();
      const longString = 'a'.repeat(1000);
      renderWithTheme(<SearchBar {...defaultProps} onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search schemes...');
      
      fireEvent.change(input, { target: { value: longString } });
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(longString);
      }, { timeout: 400 });
    });

    it('should handle rapid clear and type', () => {
      jest.useFakeTimers();
      const onChange = jest.fn();
      renderWithTheme(<SearchBar {...defaultProps} value="test" onChange={onChange} />);
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
      
      const input = screen.getByPlaceholderText('Search schemes...');
      fireEvent.change(input, { target: { value: 'new' } });
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onChange).toHaveBeenCalledWith('new');
      
      jest.useRealTimers();
    });
  });
});
