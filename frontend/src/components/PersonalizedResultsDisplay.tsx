import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { transformForAPI, transformToSchemeRecommendation } from '../utils/schemeTransformers';
import { SchemeRecommendation } from '../types';
import { SchemeDetailDialog } from './SchemeDetailDialog';

export interface PersonalizedScheme {
  schemeId?: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  level?: string;
  ministry: string;
  state?: string;
  similarityScore?: number;
  confidence?: number | string;
  reasoning?: string;
  estimatedBenefit?: number;
  // AI recommendation fields
  final_score?: number;
  semantic_score?: number;
  eligibility_score?: number;
  eligibility_score_raw?: number;
  explanation?: string[];
  reason?: string;
  benefits?: string;
  benefits_summary?: string;
  eligibility?: string;
  eligibility_analysis?: string;
  apply_link?: string;
  state_match?: boolean;
  scheme_type?: string;
  is_fallback?: boolean;
  fallback_category?: string;
}

export interface PersonalizedResultsDisplayProps {
  recommendations: PersonalizedScheme[];
}

/**
 * PersonalizedResultsDisplay Component
 * 
 * Displays personalized scheme recommendations with confidence scores,
 * eligibility reasoning, and apply links.
 * 
 * Features:
 * - Scheme cards with confidence badges
 * - Eligibility reasoning display
 * - "Apply Now" links
 * - Visual indicators for high-confidence matches
 * - Empty state handling
 * 
 * @param recommendations - Array of personalized scheme recommendations
 */
export const PersonalizedResultsDisplay: React.FC<PersonalizedResultsDisplayProps> = ({
  recommendations,
}) => {
  // Dialog state management
  const [selectedScheme, setSelectedScheme] = useState<PersonalizedScheme | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /**
   * Handles the "View Details" button click
   * Opens the scheme detail dialog with the selected scheme
   * 
   * @param scheme - The PersonalizedScheme to display details for
   */
  const handleViewDetails = (scheme: PersonalizedScheme): void => {
    setSelectedScheme(scheme);
    setDialogOpen(true);
  };

  /**
   * Handles closing the scheme detail dialog
   * Closes the dialog and clears the selected scheme state
   * 
   * Requirements: 2.6
   */
  const handleCloseDialog = (): void => {
    setDialogOpen(false);
    setSelectedScheme(null);
  };

  /**
   * Handles marking a scheme as interested
   * 
   * This function is called when the user confirms interest in a scheme
   * by clicking "Yes" in the Interest Dialog. It:
   * 1. Retrieves the profile ID from localStorage
   * 2. Transforms the scheme data to API format using transformForAPI
   * 3. Sends a POST request to /api/v1/interested-schemes
   * 4. Handles success/error responses
   * 5. Closes the dialog after completion
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2, 6.3
   * 
   * @param scheme - The SchemeRecommendation object (transformed from PersonalizedScheme)
   */
  const handleMarkInterested = async (scheme: SchemeRecommendation): Promise<void> => {
    try {
      // Requirement 6.2: Check localStorage for profile_id
      const profileId = localStorage.getItem('profileId');
      
      // Requirement 6.3: Handle missing profile_id
      if (!profileId) {
        console.error('No profile ID found');
        handleCloseDialog();
        return;
      }

      // Find the original PersonalizedScheme from selectedScheme
      // Since we're working with the transformed SchemeRecommendation,
      // we need to use the selectedScheme state which has the original data
      if (!selectedScheme) {
        console.error('No selected scheme found');
        handleCloseDialog();
        return;
      }

      // Requirement 4.2: Transform scheme data using transformForAPI
      const apiPayload = transformForAPI(selectedScheme, profileId);

      // Requirement 4.1: Send POST request to /api/v1/interested-schemes
      const response = await fetch('http://localhost:3000/api/v1/interested-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      // Requirement 4.3: Handle success response
      if (response.ok) {
        console.log('Scheme marked as interested successfully');
        // Optional: Show success message to user
        // alert('Scheme saved successfully!');
      } else {
        // Requirement 4.4: Handle error response with logging
        console.error('Failed to mark scheme as interested');
      }
    } catch (error) {
      // Requirement 4.4: Handle error response with logging
      console.error('Error marking scheme as interested:', error);
    } finally {
      // Requirement 4.5: Close dialog after operation completes
      handleCloseDialog();
    }
  };


  if (recommendations.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No personalized recommendations found. Try adjusting your profile information.
      </Alert>
    );
  }

  const getConfidenceColor = (scheme: PersonalizedScheme): 'success' | 'warning' | 'default' => {
    const score = scheme.final_score || scheme.confidence || 0;
    const numScore = typeof score === 'number' ? score : parseFloat(score as string) || 0;
    
    if (numScore >= 0.8) return 'success';
    if (numScore >= 0.6) return 'warning';
    return 'default';
  };

  const getConfidenceLabel = (scheme: PersonalizedScheme): string => {
    const score = scheme.final_score || scheme.confidence || 0;
    const numScore = typeof score === 'number' ? score : parseFloat(score as string) || 0;
    return `${Math.round(numScore * 100)}% Match`;
  };

  const isHighConfidence = (scheme: PersonalizedScheme): boolean => {
    const score = scheme.final_score || scheme.confidence || 0;
    const numScore = typeof score === 'number' ? score : parseFloat(score as string) || 0;
    return numScore >= 0.8;
  };

  const getReasoningText = (scheme: PersonalizedScheme): string => {
    if (scheme.explanation && scheme.explanation.length > 0) {
      return scheme.explanation.join(' • ');
    }
    return scheme.reason || scheme.reasoning || 'Matched based on your profile';
  };

  const getCategoryDisplay = (scheme: PersonalizedScheme): string => {
    if (scheme.is_fallback && scheme.fallback_category) {
      return scheme.fallback_category;
    }
    return scheme.category || 'General';
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Personalized Recommendations ({recommendations.length})
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {recommendations.map((scheme) => (
          <Card
            key={scheme.schemeId || scheme.id || scheme.slug}
              elevation={isHighConfidence(scheme) ? 4 : 2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: isHighConfidence(scheme)
                  ? '2px solid'
                  : 'none',
                borderColor: 'success.main',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              {/* High Confidence Indicator */}
              {isHighConfidence(scheme) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                >
                  <StarIcon color="warning" fontSize="small" />
                </Box>
              )}

              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Confidence Badge */}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={getConfidenceLabel(scheme)}
                    color={getConfidenceColor(scheme)}
                    size="small"
                  />
                </Box>

                {/* Scheme Name */}
                <Typography variant="h6" component="h3" gutterBottom>
                  {scheme.name}
                </Typography>

                {/* Ministry */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {scheme.ministry}
                </Typography>

                {/* Category and Level */}
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={getCategoryDisplay(scheme)} size="small" variant="outlined" />
                  {scheme.scheme_type && (
                    <Chip
                      label={scheme.scheme_type === 'central' ? 'Central' : 'State'}
                      size="small"
                      variant="outlined"
                      color={scheme.scheme_type === 'central' ? 'primary' : 'secondary'}
                    />
                  )}
                  {scheme.state_match !== undefined && (
                    <Chip
                      label={scheme.state_match ? 'State Match' : 'Other State'}
                      size="small"
                      variant="outlined"
                      color={scheme.state_match ? 'success' : 'default'}
                    />
                  )}
                </Stack>

                {/* Eligibility Reasoning */}
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Why you're eligible:
                  </Typography>
                  <Typography variant="body2">{getReasoningText(scheme)}</Typography>
                </Box>

                {/* Description */}
                {scheme.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {scheme.description.substring(0, 150)}...
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleViewDetails(scheme)}
                  aria-label={`View details for ${scheme.name}`}
                >
                  View Details
                </Button>
                {scheme.apply_link && (
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    endIcon={<OpenInNewIcon />}
                    href={scheme.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Apply for ${scheme.name}`}
                  >
                    Apply Now
                  </Button>
                )}
              </CardActions>
            </Card>
        ))}
      </Box>

      {/* Scheme Detail Dialog */}
      {selectedScheme && (
        <SchemeDetailDialog
          open={dialogOpen}
          scheme={transformToSchemeRecommendation(selectedScheme)}
          onClose={handleCloseDialog}
          onApply={(schemeId: string) => {
            // Apply action is handled by the dialog's internal interest flow
            console.log('Apply clicked for scheme:', schemeId);
          }}
          onMarkInterested={handleMarkInterested}
          profileId={localStorage.getItem('profileId')}
        />
      )}
    </Box>
  );
};
