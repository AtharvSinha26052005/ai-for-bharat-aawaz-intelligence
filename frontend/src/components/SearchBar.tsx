import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * SearchBar Component
 * 
 * Provides search functionality with debouncing to avoid excessive filtering.
 * Features:
 * - Material-UI TextField with search icon
 * - Debounced search (default 300ms)
 * - Clear button to reset search
 * - Loading indicator during debounce
 * 
 * @param value - Current search query value
 * @param onChange - Callback when search value changes (debounced)
 * @param placeholder - Placeholder text for the input
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search schemes...',
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Sync local value with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  useEffect(() => {
    if (localValue === value) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timeoutId = setTimeout(() => {
      onChange(localValue);
      setIsDebouncing(false);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [localValue, debounceMs, onChange, value]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    setIsDebouncing(false);
  }, [onChange]);

  return (
    <TextField
      fullWidth
      value={localValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      variant="outlined"
      aria-label="Search schemes"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {isDebouncing ? (
              <CircularProgress size={20} aria-label="Loading search results" />
            ) : localValue ? (
              <IconButton
                onClick={handleClear}
                edge="end"
                size="small"
                aria-label="Clear search"
              >
                <ClearIcon />
              </IconButton>
            ) : null}
          </InputAdornment>
        ),
      }}
      sx={{
        backgroundColor: 'background.paper',
        '& .MuiOutlinedInput-root': {
          '&:hover fieldset': {
            borderColor: 'primary.main',
          },
        },
      }}
    />
  );
};
