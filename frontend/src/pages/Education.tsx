import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { TipsAndUpdates, Close, AccountBalance, Delete } from '@mui/icons-material';
import { Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface EducationProps {
  language: Language;
  userId: string | null;
}

interface InterestedScheme {
  id: string;
  profile_id: string;
  scheme_name: string;
  scheme_slug: string | null;
  scheme_description: string | null;
  scheme_benefits: string | null;
  scheme_ministry: string | null;
  scheme_apply_link: string | null;
  created_at: string;
}

interface FinancialAdvice {
  advice: string;
  key_points: string[];
  utilization_tips: string[];
  potential_impact: string;
}

export const Education: React.FC<EducationProps> = ({ language, userId }) => {
  const { t } = useTranslation(language);
  const location = useLocation();
  
  // Interested schemes state
  const [interestedSchemes, setInterestedSchemes] = useState<InterestedScheme[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<InterestedScheme | null>(null);
  const [financialAdvice, setFinancialAdvice] = useState<FinancialAdvice | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [adviceDialogOpen, setAdviceDialogOpen] = useState(false);
  const [overallAdvice, setOverallAdvice] = useState<FinancialAdvice | null>(null);
  const [loadingOverallAdvice, setLoadingOverallAdvice] = useState(false);
  const [overallAdviceDialogOpen, setOverallAdviceDialogOpen] = useState(false);

  useEffect(() => {
    loadInterestedSchemes();
  }, [userId, location.pathname]);

  const loadInterestedSchemes = async () => {
    const profileId = localStorage.getItem('profileId') || userId;
    if (!profileId) return;

    setLoadingSchemes(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/interested-schemes/${profileId}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setInterestedSchemes(result.data);
      }
    } catch (error) {
      console.error('Failed to load interested schemes:', error);
    } finally {
      setLoadingSchemes(false);
    }
  };

  const handleGetFinancialAdvice = async (scheme: InterestedScheme) => {
    setSelectedScheme(scheme);
    setAdviceDialogOpen(true);
    setLoadingAdvice(true);
    setFinancialAdvice(null);

    try {
      const profileId = localStorage.getItem('profileId') || userId;
      
      const response = await fetch('http://localhost:3000/api/v1/interested-schemes/financial-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme_name: scheme.scheme_name,
          scheme_description: scheme.scheme_description,
          scheme_benefits: scheme.scheme_benefits,
          profile_id: profileId,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        setFinancialAdvice(result.data);
      } else {
        throw new Error('Failed to get financial advice');
      }
    } catch (error) {
      console.error('Failed to get financial advice:', error);
      alert('Failed to get financial advice. Please try again.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleRemoveScheme = async (schemeId: string) => {
    const profileId = localStorage.getItem('profileId') || userId;
    if (!profileId) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/interested-schemes/${schemeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_id: profileId }),
      });

      if (response.ok) {
        // Reload schemes
        loadInterestedSchemes();
      }
    } catch (error) {
      console.error('Failed to remove scheme:', error);
    }
  };

  const handleCloseAdviceDialog = () => {
    setAdviceDialogOpen(false);
    setSelectedScheme(null);
    setFinancialAdvice(null);
  };

  const handleGetOverallAdvice = async () => {
    setOverallAdviceDialogOpen(true);
    setLoadingOverallAdvice(true);
    setOverallAdvice(null);

    try {
      const profileId = localStorage.getItem('profileId') || userId;
      
      // Combine all schemes into a single request
      const schemesText = interestedSchemes.map(s => s.scheme_name).join(', ');
      const totalSchemes = interestedSchemes.length;
      
      const response = await fetch('http://localhost:3000/api/v1/interested-schemes/financial-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme_name: `Overall Financial Plan for ${totalSchemes} Schemes`,
          scheme_description: `Combined analysis of: ${schemesText}`,
          scheme_benefits: `Multiple government schemes providing various benefits`,
          profile_id: profileId,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        // Customize the advice for overall planning
        const customizedAdvice = {
          ...result.data,
          advice: `You have ${totalSchemes} interested schemes. ${result.data.advice}`,
        };
        setOverallAdvice(customizedAdvice);
      } else {
        throw new Error(result.error || 'Failed to get overall financial advice');
      }
    } catch (error: any) {
      console.error('Failed to get overall financial advice:', error);
      alert(`Error: ${error.message || 'Failed to get overall financial advice. Please try again.'}`);
    } finally {
      setLoadingOverallAdvice(false);
    }
  };

  const handleCloseOverallAdviceDialog = () => {
    setOverallAdviceDialogOpen(false);
    setOverallAdvice(null);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TipsAndUpdates sx={{ fontSize: 40, mr: 2, color: 'success.main' }} />
          <Typography variant="h4">
            {t.education.title}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {t.education.subtitle}
        </Typography>
      </Box>

      {/* Interested Schemes Section */}
      {interestedSchemes.length > 0 ? (
        <>
          {/* Overall Financial Plan Button */}
          <Card sx={{ mb: 4, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TipsAndUpdates sx={{ fontSize: 28 }} />
                    {t.education.overallPlan}
                  </Typography>
                  <Typography variant="body2">
                    {t.education.overallPlanDesc} {interestedSchemes.length} {t.education.schemesCount}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetOverallAdvice}
                  sx={{
                    bgcolor: 'white',
                    color: 'success.main',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                  startIcon={<TipsAndUpdates />}
                >
                  {t.education.getOverallAdvice}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AccountBalance sx={{ fontSize: 32, mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h5">
              {t.education.yourSchemes} ({interestedSchemes.length})
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            {t.education.getAdvice}
          </Alert>

          {loadingSchemes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
              {interestedSchemes.map((scheme) => (
                <Card key={scheme.id} sx={{ position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <AccountBalance sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
                      <Box sx={{ flexGrow: 1, pr: 4 }}>
                        <Typography variant="h6" gutterBottom>
                          {scheme.scheme_name}
                        </Typography>
                        {scheme.scheme_ministry && (
                          <Chip label={scheme.scheme_ministry} size="small" sx={{ mb: 1 }} />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveScheme(scheme.id)}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                        aria-label={t.education.removeScheme}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>

                    {scheme.scheme_description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {scheme.scheme_description.substring(0, 150)}
                        {scheme.scheme_description.length > 150 ? '...' : ''}
                      </Typography>
                    )}

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<TipsAndUpdates />}
                      onClick={() => handleGetFinancialAdvice(scheme)}
                    >
                      {t.education.getFinancialAdvice}
                    </Button>

                    {scheme.scheme_apply_link && (
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 1 }}
                        href={scheme.scheme_apply_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.schemes.applyNow}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AccountBalance sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            {t.education.noSchemes}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t.education.noSchemesDesc}
          </Typography>
          <Button
            variant="contained"
            size="large"
            href="/schemes"
          >
            {t.home.browseSchemes}
          </Button>
        </Box>
      )}

      {/* Financial Advice Dialog */}
      <Dialog
        open={adviceDialogOpen}
        onClose={handleCloseAdviceDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="financial-advice-dialog-title"
      >
        <DialogTitle id="financial-advice-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TipsAndUpdates sx={{ mr: 1.5, color: 'success.main' }} />
              <Typography variant="h6">{t.education.financialAdvice}</Typography>
            </Box>
            <IconButton onClick={handleCloseAdviceDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedScheme && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {selectedScheme.scheme_name}
              </Typography>
              {selectedScheme.scheme_ministry && (
                <Chip label={selectedScheme.scheme_ministry} size="small" sx={{ mb: 2 }} />
              )}
            </Box>
          )}

          {loadingAdvice ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                {t.education.generatingAdvice}
              </Typography>
            </Box>
          ) : financialAdvice ? (
            <Box>
              {/* Overall Advice */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.overallAdviceLabel}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {financialAdvice.advice}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Key Points */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.keyPoints}
                </Typography>
                <List dense>
                  {financialAdvice.key_points.map((point, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`• ${point}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Utilization Tips */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.utilizationTips}
                </Typography>
                <List dense>
                  {financialAdvice.utilization_tips.map((tip, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${index + 1}. ${tip}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Potential Impact */}
              <Box>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.potentialImpact}
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    {financialAdvice.potential_impact}
                  </Typography>
                </Alert>
              </Box>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseAdviceDialog}>{t.common.close}</Button>
          {selectedScheme?.scheme_apply_link && (
            <Button
              variant="contained"
              href={selectedScheme.scheme_apply_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.schemes.applyNow}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Overall Financial Advice Dialog */}
      <Dialog
        open={overallAdviceDialogOpen}
        onClose={handleCloseOverallAdviceDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="overall-advice-dialog-title"
      >
        <DialogTitle id="overall-advice-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TipsAndUpdates sx={{ mr: 1.5, color: 'success.main' }} />
              <Typography variant="h6">{t.education.overallAdviceTitle}</Typography>
            </Box>
            <IconButton onClick={handleCloseOverallAdviceDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t.education.comprehensiveAdvice} {interestedSchemes.length} {t.schemes.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.education.combinedAnalysis}
            </Typography>
          </Box>

          {loadingOverallAdvice ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                {t.education.generatingPlan}
              </Typography>
            </Box>
          ) : overallAdvice ? (
            <Box>
              {/* Overall Advice */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.overallAdviceLabel}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {overallAdvice.advice}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Key Points */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.keyPoints}
                </Typography>
                <List dense>
                  {overallAdvice.key_points.map((point, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`• ${point}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Utilization Tips */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.utilizationTips}
                </Typography>
                <List dense>
                  {overallAdvice.utilization_tips.map((tip, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${index + 1}. ${tip}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Potential Impact */}
              <Box>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  {t.education.potentialImpact}
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    {overallAdvice.potential_impact}
                  </Typography>
                </Alert>
              </Box>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseOverallAdviceDialog}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
