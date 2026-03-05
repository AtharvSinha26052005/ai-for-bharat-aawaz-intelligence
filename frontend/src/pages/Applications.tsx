import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { CheckCircle, HourglassEmpty, Cancel, Info } from '@mui/icons-material';
import { apiService } from '../services/apiService';
import { Language } from '../types';

interface ApplicationsProps {
  language: Language;
  userId: string | null;
}

interface Application {
  id: string;
  schemeId: string;
  schemeName: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  submittedAt: string;
  lastUpdated: string;
  progress: number;
  nextSteps?: string[];
}

export const Applications: React.FC<ApplicationsProps> = ({ language, userId }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadApplications();
    }
  }, [userId]);

  const loadApplications = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.trackProgress(userId, language);
      // Mock data for demonstration
      setApplications([
        {
          id: '1',
          schemeId: 'scheme-1',
          schemeName: 'PM-KISAN Scheme',
          status: 'in_progress',
          submittedAt: '2024-01-15',
          lastUpdated: '2024-01-20',
          progress: 60,
          nextSteps: ['Submit income certificate', 'Verify bank details'],
        },
        {
          id: '2',
          schemeId: 'scheme-2',
          schemeName: 'Ayushman Bharat',
          status: 'approved',
          submittedAt: '2024-01-10',
          lastUpdated: '2024-01-18',
          progress: 100,
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle color="success" />;
      case 'rejected':
        return <Cancel color="error" />;
      case 'in_progress':
        return <HourglassEmpty color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'in_progress':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (!userId) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please create or load your profile first to view applications.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track the status of your scheme applications
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && applications.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No applications found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Start by checking your eligible schemes
          </Typography>
          <Button variant="contained" href="/schemes" sx={{ mt: 2 }}>
            View Schemes
          </Button>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
        {applications.map((app) => (
          <Card key={app.id}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(app.status)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    {app.schemeName}
                  </Typography>
                  <Chip
                    label={app.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(app.status) as any}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progress: {app.progress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={app.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body2">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body2">
                      {new Date(app.lastUpdated).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {app.nextSteps && app.nextSteps.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Next Steps:
                    </Typography>
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                      {app.nextSteps.map((step, index) => (
                        <Typography component="li" variant="body2" key={index}>
                          {step}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
        ))}
      </Box>
    </Container>
  );
};
