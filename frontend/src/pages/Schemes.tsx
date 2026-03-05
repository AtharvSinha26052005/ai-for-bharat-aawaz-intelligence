import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiService } from '../services/apiService';
import { API_ENDPOINTS } from '../config/api';
import { Language, SchemeRecommendation } from '../types';

interface SchemesProps {
  language: Language;
  userId: string | null;
}

export const Schemes: React.FC<SchemesProps> = ({ language, userId }) => {
  const [schemes, setSchemes] = useState<SchemeRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<SchemeRecommendation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSchemes();
    }
  }, [userId]);

  const loadSchemes = async () => {
    setLoading(true);
    setError('');
    try {
      const response: any = await apiService.get(API_ENDPOINTS.ELIGIBLE_SCHEMES(userId!));
      if (response.success && response.data) {
        setSchemes(response.data.recommendations || []);
      }
    } catch (err: any) {
      setError(err.error?.message || 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (scheme: SchemeRecommendation) => {
    setSelectedScheme(scheme);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedScheme(null);
  };

  if (!userId) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mt: 4 }}>
          Please create your profile first to see eligible schemes
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Eligible Schemes
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Based on your profile, you may be eligible for these government schemes
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {schemes.length === 0 && !loading && (
          <Alert severity="info">
            No eligible schemes found. Try updating your profile.
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          {schemes.map((recommendation) => (
            <Card key={recommendation.scheme.schemeId} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    {recommendation.scheme.officialName}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={recommendation.scheme.level}
                    size="small"
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={recommendation.scheme.category}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {recommendation.scheme.shortDescription}
                </Typography>

                {recommendation.estimatedBenefit > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="success.main">
                      ₹{recommendation.estimatedBenefit.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      estimated benefit
                    </Typography>
                  </Box>
                )}

                {recommendation.eligibility.eligible && (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                    <CheckCircleIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      {Math.round(recommendation.eligibility.confidence * 100)}% match
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions>
                <Button size="small" onClick={() => handleViewDetails(recommendation)}>
                  View Details
                </Button>
                <Button size="small" color="primary" variant="contained">
                  Apply Now
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedScheme && (
          <>
            <DialogTitle>{selectedScheme.scheme.officialName}</DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedScheme.personalizedExplanation}
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Eligibility
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedScheme.eligibility.explanation}
              </Typography>

              {selectedScheme.scheme.officialWebsite && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Official Website:
                  </Typography>
                  <Typography variant="body2">
                    <a href={selectedScheme.scheme.officialWebsite} target="_blank" rel="noopener noreferrer">
                      {selectedScheme.scheme.officialWebsite}
                    </a>
                  </Typography>
                </Box>
              )}

              {selectedScheme.scheme.helplineNumber && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Helpline:
                  </Typography>
                  <Typography variant="body2">
                    {selectedScheme.scheme.helplineNumber}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button variant="contained" color="primary">
                Apply Now
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
