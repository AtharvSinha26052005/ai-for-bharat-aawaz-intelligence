import React, { useState, useEffect } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { School, ExpandMore, Quiz, Article } from '@mui/icons-material';
import { VoiceInterface } from '../components/VoiceInterface';
import { apiService } from '../services/apiService';
import { Language } from '../types';

interface EducationProps {
  language: Language;
  userId: string | null;
}

interface EducationModule {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  topics: string[];
}

export const Education: React.FC<EducationProps> = ({ language, userId }) => {
  const [modules, setModules] = useState<EducationModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [voiceQuery, setVoiceQuery] = useState('');

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = () => {
    // Mock education modules
    setModules([
      {
        id: '1',
        title: 'Understanding Government Schemes',
        description: 'Learn about different types of government welfare schemes and how they work',
        category: 'Basics',
        difficulty: 'beginner',
        duration: '15 min',
        topics: ['Types of schemes', 'Eligibility criteria', 'Application process', 'Benefits'],
      },
      {
        id: '2',
        title: 'Financial Planning for Low Income',
        description: 'Essential financial planning strategies for low-income households',
        category: 'Finance',
        difficulty: 'beginner',
        duration: '20 min',
        topics: ['Budgeting', 'Savings', 'Emergency funds', 'Debt management'],
      },
      {
        id: '3',
        title: 'Digital Banking Basics',
        description: 'Learn how to use digital banking services safely and effectively',
        category: 'Technology',
        difficulty: 'beginner',
        duration: '25 min',
        topics: ['Mobile banking', 'UPI payments', 'Security tips', 'Common issues'],
      },
      {
        id: '4',
        title: 'Understanding Your Rights',
        description: 'Know your rights as a beneficiary of government schemes',
        category: 'Legal',
        difficulty: 'intermediate',
        duration: '30 min',
        topics: ['Beneficiary rights', 'Complaint mechanisms', 'RTI', 'Legal aid'],
      },
    ]);
  };

  const handleVoiceQuery = async (query: string) => {
    setVoiceQuery(query);
    setLoading(true);

    try {
      const response = await apiService.educateUser(query, language);
      // Handle response - could show in a dialog or update UI
      console.log('Education response:', response);
    } catch (err) {
      console.error('Failed to get education response:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'advanced':
        return 'error';
      case 'intermediate':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <School sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">
            Financial Education
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Learn about government schemes, financial planning, and your rights
        </Typography>
      </Box>

      <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Ask Questions with Voice
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Use the microphone to ask any questions about financial literacy or government schemes
          </Typography>
          <VoiceInterface
            onResponse={(response) => {
              console.log('Voice response:', response);
              // Could show response in a dialog or update UI
            }}
            language={language}
          />
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Learning Modules
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {modules.map((module) => (
          <Card sx={{ height: '100%' }} key={module.id}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Article sx={{ mr: 1, color: 'primary.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {module.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={module.category} size="small" />
                      <Chip
                        label={module.difficulty}
                        size="small"
                        color={getDifficultyColor(module.difficulty) as any}
                      />
                      <Chip label={module.duration} size="small" variant="outlined" />
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {module.description}
                </Typography>

                <Accordion
                  expanded={selectedModule === module.id}
                  onChange={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2">Topics Covered</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {module.topics.map((topic, index) => (
                        <Typography component="li" variant="body2" key={index} sx={{ mb: 0.5 }}>
                          {topic}
                        </Typography>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  startIcon={<Quiz />}
                >
                  Start Learning
                </Button>
              </CardContent>
            </Card>
        ))}
      </Box>

      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          All educational content is available in multiple languages. Use the language selector in the navigation bar to switch languages.
        </Typography>
      </Alert>
    </Container>
  );
};
