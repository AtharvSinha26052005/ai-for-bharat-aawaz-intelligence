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
import { Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ProfileProps {
  language: Language;
  userId: string | null;
  onUserIdSet: (id: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ language, userId, onUserIdSet }) => {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    age: '',
    incomeRange: '',
    occupation: '',
    state: '',
    district: '',
    block: '',
    village: '',
    pincode: '',
    phoneNumber: '',
    aadharNumber: '',
    gender: '',
    caste: '',
    preferredLanguage: language,
    preferredMode: 'both' as 'voice' | 'text' | 'both',
  });

  useEffect(() => {
    // Try to load profile from localStorage or userId
    const storedProfileId = localStorage.getItem('profileId');
    if (storedProfileId) {
      setSavedProfileId(storedProfileId);
      loadProfile(storedProfileId);
    } else if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (profileId: string) => {
    setLoading(true);
    setError('');
    try {
      // Call the new profile storage API
      const response = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}`);
      
      if (!response.ok) {
        throw new Error('Profile not found');
      }

      const result = await response.json();
      
      if (result.data) {
        const profile = result.data;
        setFormData({
          age: profile.age?.toString() || '',
          incomeRange: profile.income_range || '',
          occupation: profile.occupation || '',
          state: profile.state || '',
          district: profile.district || '',
          block: profile.block || '',
          village: profile.village || '',
          pincode: profile.pincode || '',
          phoneNumber: profile.phone_number || '',
          aadharNumber: profile.aadhar_number || '',
          gender: profile.gender || '',
          caste: profile.caste || '',
          preferredLanguage: language,
          preferredMode: profile.preferred_mode || 'both',
        });
        setSavedProfileId(profileId);
        onUserIdSet(profileId);
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError('Could not load previous profile. You can create a new one.');
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

  const validateForm = (): string | null => {
    // Validate phone number (10 digits)
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      return 'Phone number must be exactly 10 digits';
    }

    // Validate aadhar number (12 digits)
    if (formData.aadharNumber && !/^\d{12}$/.test(formData.aadharNumber)) {
      return 'Aadhar number must be exactly 12 digits';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const profileData = {
        age: parseInt(formData.age),
        income_range: formData.incomeRange,
        phone_number: formData.phoneNumber || '',
        aadhar_number: formData.aadharNumber || '',
        gender: formData.gender || '',
        caste: formData.caste || '',
        occupation: formData.occupation,
        state: formData.state,
        district: formData.district,
        block: formData.block || '',
        village: formData.village || '',
        pincode: formData.pincode || '',
        preferred_mode: formData.preferredMode,
      };

      console.log('Submitting profile data:', profileData);

      // Always create a new profile (backend doesn't support updates yet)
      // In the future, we can add PUT /api/v1/profiles/:id for updates
      const response = await fetch('http://localhost:3000/api/v1/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();
      
      console.log('Profile response:', result);

      if (response.ok && result.data) {
        const profileId = result.data.profile_id;
        setSavedProfileId(profileId);
        setSuccess(savedProfileId ? 'Profile updated successfully!' : `Profile saved successfully!`);
        onUserIdSet(profileId);
        
        // Store profile ID in localStorage for later use
        localStorage.setItem('profileId', profileId);
        
        // Auto-redirect to schemes page after 1 second
        setTimeout(() => {
          window.location.href = `/schemes?profileId=${profileId}`;
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }
    } catch (err: any) {
      console.error('Profile submission error:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', mt: 8 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            {t.common.loading}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {savedProfileId ? t.profile.updateTitle : t.profile.createTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t.profile.subtitle}
        </Typography>

        {savedProfileId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t.profile.profileUpdated}
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
              <TextField
                required
                fullWidth
                label={t.profile.age}
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
                label={t.profile.incomeRange}
                name="incomeRange"
                value={formData.incomeRange}
                onChange={handleChange}
              >
                <MenuItem value="below-1L">{t.profile.below1lakh}</MenuItem>
                <MenuItem value="1L-3L">{t.profile['1to3lakh']}</MenuItem>
                <MenuItem value="3L-5L">{t.profile['3to5lakh']}</MenuItem>
                <MenuItem value="above-5L">{t.profile['5to10lakh']}</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                inputProps={{ maxLength: 10 }}
                helperText="Enter 10 digit mobile number"
              />

              <TextField
                fullWidth
                label="Aadhar Number"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleChange}
                placeholder="12 digit Aadhar number"
                inputProps={{ maxLength: 12 }}
                helperText="Enter 12 digit Aadhar number"
              />

              <TextField
                fullWidth
                select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <MenuItem value="">Select Gender</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>

              <TextField
                fullWidth
                select
                label="Caste"
                name="caste"
                value={formData.caste}
                onChange={handleChange}
              >
                <MenuItem value="">Select Caste</MenuItem>
                <MenuItem value="General">General</MenuItem>
                <MenuItem value="OBC">OBC</MenuItem>
                <MenuItem value="SC">SC</MenuItem>
                <MenuItem value="ST">ST</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
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
              {loading ? 'Saving...' : savedProfileId ? 'Update & Find Schemes' : 'Save & Find Schemes'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};
