import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { Security, Warning, CheckCircle } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { Language } from '../types';

interface FraudCheckProps {
  language: Language;
  userId: string | null;
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const FraudCheck: React.FC<FraudCheckProps> = ({ language, userId }) => {
  const { t } = useTranslation(language);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<'safe' | 'risky' | null>(null);
  const [reasoning, setReasoning] = useState('');

  const handleCheck = async () => {
    if (!message.trim()) {
      setError(t.fraudCheck.emptyMessageError);
      return;
    }

    if (!GEMINI_API_KEY) {
      setError('API key not configured. Please contact the administrator.');
      return;
    }

    setLoading(true);
    setError(null);
    setRiskStatus(null);
    setReasoning('');

    try {
      const prompt = `Analyze this message for fraud/scam indicators related to government schemes in India:

"${message}"

Is this message safe or risky? Respond with ONLY this JSON format:
{"status": "safe" or "risky", "reason": "brief explanation"}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to analyze message');
      }

      const data = await response.json();
      console.log('Gemini Response:', data);
      
      const text = data.candidates[0].content.parts[0].text;

      const jsonMatch = text.match(/\{[^}]+\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setRiskStatus(result.status);
        setReasoning(result.reason);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to check message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Security sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">{t.fraudCheck.title}</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t.fraudCheck.inputLabel}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t.fraudCheck.subtitle}
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.fraudCheck.inputPlaceholder}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleCheck}
          disabled={loading || !message.trim()}
          fullWidth
          size="large"
        >
          {loading ? <CircularProgress size={24} /> : t.fraudCheck.checkButton}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {riskStatus && (
        <Card
          sx={{
            border: 2,
            borderColor: riskStatus === 'safe' ? 'success.main' : 'error.main',
          }}
        >
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {riskStatus === 'safe' ? (
                <CheckCircle color="success" sx={{ fontSize: 60 }} />
              ) : (
                <Warning color="error" sx={{ fontSize: 60 }} />
              )}

              <Typography variant="h4" sx={{ mt: 2 }}>
                {riskStatus === 'safe' ? t.fraudCheck.safe : t.fraudCheck.risky}
              </Typography>

              <Chip
                label={riskStatus === 'safe' ? t.fraudCheck.safe : t.fraudCheck.risky}
                color={riskStatus === 'safe' ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </Box>

            <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography>{reasoning}</Typography>
            </Box>

            {riskStatus === 'risky' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {t.fraudCheck.riskyMessage}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default FraudCheck;