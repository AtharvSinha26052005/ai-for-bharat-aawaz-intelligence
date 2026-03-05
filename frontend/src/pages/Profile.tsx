import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { apiService } from '../services/apiService';
import { API_ENDPOINTS } from '../config/api';
import { Language, UserProfile } from '../types';

interface ProfileProps {
  language: Language;
  userId: string | null;
  onUserIdSet: (id: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ language, userId, onUserIdSet }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    age: '',
    incomeRange: '',
    occupation: '',
    state: '',
    district: '',
    block: '',
    village: '',
    pincode: '',
    preferredLanguage: language,
    preferredMode: 'both' as 'voice' | 'text' | 'both',
  });

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response: any = await apiService.get(API_ENDPOINTS.PROFILE_BY_ID(userId!));
      if (response.success && response.data) {
        const profile = response.data;
        setFormData({
          age: profile.age.toString(),
          incomeRange: profile.incomeRange,
          occupation: profile.occupation,
          state: profile.location.state,
          district: profile.location.district,
          block: profile.location.block || '',
          village: profile.location.village || '',
          pincode: profile.location.pincode || '',
          preferredLanguage: profile.preferredLanguage,
          preferredMode: profile.preferredMode,
        });
      }
    } catch (err: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const profileData = {
        age: parseInt(formData.age),
        incomeRange: formData.incomeRange,
        occupation: formData.occupation,
        familyComposition: {
          adults: 2,
          children: 0,
          seniors: 0,
        },
        location: {
          state: formData.state,
          district: formData.district,
          block: formData.block || undefined,
          village: formData.village || undefined,
          pincode: formData.pincode || undefined,
        },
        primaryNeeds: ['schemes'],
        preferredLanguage: formData.preferredLanguage,
        preferredMode: formData.preferredMode,
        consentGiven: true,
      };

      console.log('Submitting profile data:', profileData);

      const response: any = await apiService.post(API_ENDPOINTS.PROFILE, profileData);
      
      console.log('Profile response:', response);

      if (response.success && response.data) {
        setSuccess('Profile saved successfully!');
        if (response.data.userId) {
          onUserIdSet(response.data.userId);
        }
      }
    } catch (err: any) {
      console.error('Profile submission error:', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to save profile';
      
      if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // If there are validation details, show them
      if (err.error?.details) {
        errorMessage += ': ' + JSON.stringify(err.error.details);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && userId) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {userId ? 'Update Profile' : 'Create Profile'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Tell us about yourself to get personalized scheme recommendations
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
              <TextField
                required
                fullWidth
                label="Age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                inputProps={{ min: 1, max: 120 }}
              />

              <TextField
                required
                fullWidth
                select
                label="Income Range"
                name="incomeRange"
                value={formData.incomeRange}
                onChange={handleChange}
              >
                <MenuItem value="below-1L">Below ₹1 Lakh</MenuItem>
                <MenuItem value="1L-3L">₹1-3 Lakhs</MenuItem>
                <MenuItem value="3L-5L">₹3-5 Lakhs</MenuItem>
                <MenuItem value="above-5L">Above ₹5 Lakhs</MenuItem>
              </TextField>
            </Box>

            <TextField
              required
              fullWidth
              label="Occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="e.g., Farmer, Laborer, Self-employed"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
              <TextField
                required
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />

              <TextField
                required
                fullWidth
                label="District"
                name="district"
                value={formData.district}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Block (Optional)"
                name="block"
                value={formData.block}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Village (Optional)"
                name="village"
                value={formData.village}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Pincode (Optional)"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                inputProps={{ maxLength: 6 }}
              />

              <TextField
                required
                fullWidth
                select
                label="Preferred Mode"
                name="preferredMode"
                value={formData.preferredMode}
                onChange={handleChange}
              >
                <MenuItem value="voice">Voice</MenuItem>
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </TextField>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Saving...' : userId ? 'Update Profile' : 'Create Profile'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};
