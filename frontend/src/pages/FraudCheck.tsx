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
import { apiService } from '../services/apiService';
import { Language } from '../types';

interface FraudCheckProps {
  language: Language;
}

interface FraudResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  recommendations: string[];
}

export const FraudCheck: React.FC<FraudCheckProps> = ({ language }) => {
  const [applicationData, setApplicationData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FraudResult | null>(null);

  const handleCheck = async () => {
    if (!applicationData.trim()) {
      setError('Please enter application data to check');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.detectFraud(
        { applicationData: JSON.parse(applicationData) },
        language
      );
      
      setResult({
        riskScore: response.riskScore || 0,
        riskLevel: response.riskLevel || 'low',
        flags: response.flags || [],
        recommendations: response.recommendations || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to perform fraud check');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <Warning color="error" />;
      case 'medium':
        return <Warning color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Security sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">
            Fraud Detection
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Verify the authenticity of application data and detect potential fraud
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter Application Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste the application data in JSON format
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={8}
          value={applicationData}
          onChange={(e) => setApplicationData(e.target.value)}
          placeholder='{"name": "John Doe", "income": 50000, "documents": [...], ...}'
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleCheck}
          disabled={loading || !applicationData.trim()}
          fullWidth
          size="large"
        >
          {loading ? <CircularProgress size={24} /> : 'Check for Fraud'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              {getRiskIcon(result.riskLevel)}
              <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                Fraud Check Results
              </Typography>
              <Chip
                label={`${result.riskLevel.toUpperCase()} RISK`}
                color={getRiskColor(result.riskLevel) as any}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Risk Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h3" color={getRiskColor(result.riskLevel) + '.main'}>
                  {result.riskScore}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / 100
                </Typography>
              </Box>
            </Box>

            {result.flags.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detected Issues
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {result.flags.map((flag, index) => (
                    <Chip
                      key={index}
                      label={flag}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {result.recommendations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recommendations
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {result.recommendations.map((rec, index) => (
                    <Typography component="li" variant="body2" key={index} sx={{ mb: 0.5 }}>
                      {rec}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          This tool uses AI to analyze application data for potential fraud indicators.
          Results should be reviewed by authorized personnel before taking action.
        </Typography>
      </Alert>
    </Container>
  );
};
