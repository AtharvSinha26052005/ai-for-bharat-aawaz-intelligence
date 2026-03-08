import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import SchoolIcon from '@mui/icons-material/School';
import { VoiceInterface } from '../components/VoiceInterface';
import { PersonalizedResultsDisplay, PersonalizedScheme } from '../components/PersonalizedResultsDisplay';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Language } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

interface HomeProps {
  language: Language;
  userId: string | null;
  onUserIdSet: (id: string) => void;
}

export const Home: React.FC<HomeProps> = ({ language, userId, onUserIdSet }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(language);
  const [showVoice, setShowVoice] = useState(false);
  const [response, setResponse] = useState('');

  // AI recommendations state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState<PersonalizedScheme[]>([]);

  // Load AI recommendations on mount if user has a profile
  useEffect(() => {
    const profileId = localStorage.getItem('profileId');
    if (profileId) {
      loadAIRecommendations(profileId);
    }
  }, []);

  /**
   * Sanitizes error messages to remove PII
   */
  const sanitizeErrorMessage = (error: any): string => {
    const message = error?.error?.message || error?.message || 'An error occurred';
    // Remove potential PII patterns (email, phone, ID numbers)
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b\d{10,}\b/g, '[id]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
  };

  /**
   * Load AI recommendation results by profile ID
   */
  const loadAIRecommendations = async (profileId: string) => {
    setAiLoading(true);
    setAiError('');
    try {
      console.log('Loading AI recommendations for profile:', profileId);
      const response = await fetch(`http://localhost:3000/api/v1/profiles/${profileId}/schemes`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load recommendations');
      }
      
      console.log('AI recommendation response:', result);
      
      // Transform to PersonalizedScheme format
      const recommendations: PersonalizedScheme[] = result.data.map((scheme: any) => ({
        ...scheme,
        // Use the actual scores from the AI system
        eligibility_score: (scheme.final_score || 0) * 100, // Convert to percentage
        confidence: scheme.final_score >= 0.8 ? 'High' : scheme.final_score >= 0.6 ? 'Medium' : 'Low',
        reason: scheme.explanation?.join(', ') || `Match score: ${((scheme.final_score || 0) * 100).toFixed(1)}%`,
        benefits_summary: scheme.benefits || '',
        eligibility_analysis: scheme.eligibility || '',
        detailed_report: scheme.description || '',
        // Preserve AI-specific fields
        semantic_score: scheme.semantic_score,
        eligibility_score_raw: scheme.eligibility_score,
        category: scheme.is_fallback ? scheme.fallback_category : scheme.category,
        state_match: scheme.state_match,
        scheme_type: scheme.scheme_type,
        is_fallback: scheme.is_fallback,
      }));
      
      setAiRecommendations(recommendations);
      console.log(`Received ${recommendations.length} AI recommendations`);
    } catch (err: any) {
      console.error('Error loading AI recommendations:', err);
      const sanitizedMessage = sanitizeErrorMessage(err);
      setAiError(`Failed to load recommendations: ${sanitizedMessage}`);
    } finally {
      setAiLoading(false);
    }
  };

  const features = [
    {
      title: t.home.browseSchemes,
      description: t.schemes.subtitle,
      icon: <AccountBalanceIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: '/schemes',
    },
    {
      title: t.nav.fraudCheck,
      description: t.fraudCheck.subtitle,
      icon: <SecurityIcon sx={{ fontSize: 60, color: 'error.main' }} />,
      path: '/fraud-check',
    },
    {
      title: t.nav.learnFinance,
      description: t.education.subtitle,
      icon: <SchoolIcon sx={{ fontSize: 60, color: 'success.main' }} />,
      path: '/education',
    },
  ];

  const handleResponse = (text: string) => {
    setResponse(text);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t.home.welcome}
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          {t.home.subtitle}
        </Typography>

        {!userId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t.profile.subtitle}
            <Button
              variant="contained"
              size="small"
              sx={{ ml: 2 }}
              onClick={() => navigate('/profile')}
            >
              {t.home.createProfile}
            </Button>
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<MicIcon />}
          onClick={() => setShowVoice(!showVoice)}
          sx={{ mb: 4 }}
        >
          {showVoice ? 'Hide Voice Assistant' : 'Use Voice Assistant'}
        </Button>

        {showVoice && (
          <Box sx={{ mb: 4 }}>
            <VoiceInterface language={language} onResponse={handleResponse} />
            {response && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body1">{response}</Typography>
              </Alert>
            )}
          </Box>
        )}
      </Box>

      {/* Personalized Recommendations Section - Only for registered users */}
      {aiLoading && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Loading your personalized recommendations...
          </Typography>
          <LoadingSkeleton variant="card" count={3} />
        </Box>
      )}

      {aiError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {aiError}
        </Alert>
      )}

      {!aiLoading && aiRecommendations.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, textAlign: 'center', mb: 3 }}>
            Your Personalized Scheme Recommendations
          </Typography>
          <PersonalizedResultsDisplay recommendations={aiRecommendations} />
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/schemes')}
            >
              Browse All Schemes
            </Button>
          </Box>
          <Divider sx={{ my: 4 }} />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {features.map((feature) => (
          <Card
            key={feature.title}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-4px)',
                transition: 'all 0.3s',
              },
            }}
            onClick={() => navigate(feature.path)}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Box sx={{ mb: 2 }}>{feature.icon}</Box>
              <Typography variant="h5" component="h2" gutterBottom>
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          How It Works
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="h6">1. Create Profile</Typography>
            <Typography variant="body2" color="text.secondary">
              Tell us about yourself
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6">2. Find Schemes</Typography>
            <Typography variant="body2" color="text.secondary">
              Get personalized recommendations
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6">3. Apply</Typography>
            <Typography variant="body2" color="text.secondary">
              Get step-by-step guidance
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6">4. Track Progress</Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor your applications
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
