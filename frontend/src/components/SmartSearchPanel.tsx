import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SemanticSearchProfile } from '../types';

export interface SmartSearchPanelProps {
  onSearch: (profile: SemanticSearchProfile) => void;
  loading: boolean;
  error?: string;
}

/**
 * SmartSearchPanel Component
 * 
 * Provides a form for users to input their profile information and trigger
 * semantic search for personalized scheme recommendations.
 * 
 * Features:
 * - Profile input form (age, income, gender, caste, state)
 * - "Find Schemes For Me" button
 * - Loading state during search
 * - Error message display
 * - Form validation
 * 
 * @param onSearch - Callback when search is triggered with profile data
 * @param loading - Whether search is in progress
 * @param error - Error message to display (optional)
 */
export const SmartSearchPanel: React.FC<SmartSearchPanelProps> = ({
  onSearch,
  loading,
  error,
}) => {
  const [profile, setProfile] = useState<SemanticSearchProfile>({
    age: 0,
    income: 0,
    gender: 'Male',
    caste: 'General',
    state: '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    age?: string;
    income?: string;
    state?: string;
  }>({});

  const handleAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setProfile((prev) => ({ ...prev, age: isNaN(value) ? 0 : value }));
    
    // Clear validation error when user starts typing
    if (validationErrors.age) {
      setValidationErrors((prev) => ({ ...prev, age: undefined }));
    }
  };

  const handleIncomeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setProfile((prev) => ({ ...prev, income: isNaN(value) ? 0 : value }));
    
    // Clear validation error when user starts typing
    if (validationErrors.income) {
      setValidationErrors((prev) => ({ ...prev, income: undefined }));
    }
  };

  const handleGenderChange = (event: SelectChangeEvent<string>) => {
    setProfile((prev) => ({
      ...prev,
      gender: event.target.value as 'Male' | 'Female' | 'Other',
    }));
  };

  const handleCasteChange = (event: SelectChangeEvent<string>) => {
    setProfile((prev) => ({
      ...prev,
      caste: event.target.value as 'General' | 'OBC' | 'SC' | 'ST' | 'Other',
    }));
  };

  const handleStateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({ ...prev, state: event.target.value }));
    
    // Clear validation error when user starts typing
    if (validationErrors.state) {
      setValidationErrors((prev) => ({ ...prev, state: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (profile.age <= 0 || profile.age > 120) {
      errors.age = 'Please enter a valid age between 1 and 120';
    }

    if (profile.income < 0) {
      errors.income = 'Please enter a valid income (0 or greater)';
    }

    if (!profile.state || profile.state.trim() === '') {
      errors.state = 'Please enter your state';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSearch(profile);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Smart Search
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tell us about yourself to get personalized scheme recommendations
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {/* Age Input */}
          <TextField
            label="Age"
            type="number"
            value={profile.age || ''}
            onChange={handleAgeChange}
            fullWidth
            size="small"
            required
            error={!!validationErrors.age}
            helperText={validationErrors.age}
            disabled={loading}
            inputProps={{
              min: 1,
              max: 120,
              'aria-label': 'Enter your age',
            }}
          />

          {/* Income Input */}
          <TextField
            label="Annual Income (₹)"
            type="number"
            value={profile.income || ''}
            onChange={handleIncomeChange}
            fullWidth
            size="small"
            required
            error={!!validationErrors.income}
            helperText={validationErrors.income}
            disabled={loading}
            inputProps={{
              min: 0,
              'aria-label': 'Enter your annual income',
            }}
          />

          {/* Gender Select */}
          <FormControl fullWidth size="small" disabled={loading}>
            <InputLabel id="gender-label">Gender</InputLabel>
            <Select
              labelId="gender-label"
              id="gender-select"
              value={profile.gender}
              label="Gender"
              onChange={handleGenderChange}
              aria-label="Select your gender"
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>

          {/* Caste Select */}
          <FormControl fullWidth size="small" disabled={loading}>
            <InputLabel id="caste-label">Caste Category</InputLabel>
            <Select
              labelId="caste-label"
              id="caste-select"
              value={profile.caste}
              label="Caste Category"
              onChange={handleCasteChange}
              aria-label="Select your caste category"
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="OBC">OBC</MenuItem>
              <MenuItem value="SC">SC</MenuItem>
              <MenuItem value="ST">ST</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>

          {/* State Input */}
          <TextField
            label="State"
            type="text"
            value={profile.state}
            onChange={handleStateChange}
            fullWidth
            size="small"
            required
            error={!!validationErrors.state}
            helperText={validationErrors.state}
            disabled={loading}
            placeholder="e.g., Maharashtra, Tamil Nadu"
            inputProps={{
              'aria-label': 'Enter your state',
            }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            aria-label="Find schemes for me"
          >
            {loading ? 'Searching...' : 'Find Schemes For Me'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};
