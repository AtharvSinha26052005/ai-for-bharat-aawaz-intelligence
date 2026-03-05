import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import SchoolIcon from '@mui/icons-material/School';
import { VoiceInterface } from '../components/VoiceInterface';
import { Language } from '../types';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  language: Language;
  userId: string | null;
  onUserIdSet: (id: string) => void;
}

export const Home: React.FC<HomeProps> = ({ language, userId, onUserIdSet }) => {
  const navigate = useNavigate();
  const [showVoice, setShowVoice] = useState(false);
  const [response, setResponse] = useState('');

  const features = [
    {
      title: 'Find Schemes',
      description: 'Discover government schemes you qualify for',
      icon: <AccountBalanceIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: '/schemes',
    },
    {
      title: 'Check Fraud',
      description: 'Verify suspicious messages and links',
      icon: <SecurityIcon sx={{ fontSize: 60, color: 'error.main' }} />,
      path: '/fraud-check',
    },
    {
      title: 'Learn Finance',
      description: 'Improve your financial literacy',
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
          Welcome to Rural Digital Rights
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Your AI companion for government schemes, financial literacy, and fraud protection
        </Typography>

        {!userId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Please create your profile to get personalized recommendations
            <Button
              variant="contained"
              size="small"
              sx={{ ml: 2 }}
              onClick={() => navigate('/profile')}
            >
              Create Profile
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
