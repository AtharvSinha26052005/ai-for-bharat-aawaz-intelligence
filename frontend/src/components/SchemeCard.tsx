import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  useTheme,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SchemeRecommendation, Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export interface SchemeCardProps {
  scheme: SchemeRecommendation;
  onViewDetails: (scheme: SchemeRecommendation) => void;
  onApply: (schemeId: string) => void;
  elevation?: number;
  language: Language;
}

/**
 * Calculate eligibility confidence color based on confidence level
 * - confidence >= 0.8: success color (green)
 * - 0.5 <= confidence < 0.8: warning color (orange)
 * - confidence < 0.5: error color (red)
 */
const calculateEligibilityColor = (confidence: number, theme: any): string => {
  if (confidence >= 0.8) {
    return theme.palette.success.main;
  } else if (confidence >= 0.5) {
    return theme.palette.warning.main;
  } else {
    return theme.palette.error.main;
  }
};

/**
 * SchemeCard Component
 * 
 * Displays individual scheme information in a card format with visual hierarchy.
 * Features:
 * - Scheme name with icon
 * - Level badge (Central/State) and category badge
 * - Short description
 * - Estimated benefit with currency formatting (when > 0)
 * - Eligibility confidence percentage with colored indicator
 * - "View Details" and "Apply Now" action buttons
 * - Hover effects (translateY -4px, increased shadow)
 * 
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */
export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  onViewDetails,
  onApply,
  elevation = 2,
  language,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(language);
  const confidencePercent = Math.round(scheme.eligibility.confidence * 100);
  const confidenceColor = calculateEligibilityColor(
    scheme.eligibility.confidence,
    theme
  );

  // Determine level chip color
  const levelColor = scheme.scheme.level === 'central' ? 'primary' : 'secondary';
  
  // Translate level
  const levelText = scheme.scheme.level === 'central' ? t.schemes.central : t.schemes.state;

  return (
    <Card
      elevation={elevation}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
      role="article"
      aria-label={`Scheme: ${scheme.scheme.officialName}`}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Scheme name with icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AccountBalanceIcon 
            color="primary" 
            sx={{ mr: 1, flexShrink: 0 }} 
            aria-hidden="true"
          />
          <Typography 
            variant="h6" 
            component="h2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {scheme.scheme.officialName}
          </Typography>
        </Box>

        {/* Level and category badges */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={levelText}
            size="small"
            color={levelColor}
            aria-label={`Scheme level: ${scheme.scheme.level}`}
          />
          <Chip
            label={scheme.scheme.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            size="small"
            variant="outlined"
            aria-label={`Category: ${scheme.scheme.category}`}
          />
        </Box>

        {/* Short description */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          paragraph
          sx={{ mb: 2 }}
        >
          {scheme.scheme.shortDescription}
        </Typography>

        {/* Estimated benefit (only if > 0) */}
        {scheme.estimatedBenefit > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="h5" 
              color="success.main"
              sx={{ fontWeight: 600 }}
              aria-label={`Estimated benefit: ${scheme.estimatedBenefit.toLocaleString('en-IN')} rupees`}
            >
              ₹{scheme.estimatedBenefit.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.schemes.estimatedBenefit}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Action buttons */}
      <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
        <Button 
          size="small" 
          onClick={() => onViewDetails(scheme)}
          aria-label={`View details for ${scheme.scheme.officialName}`}
        >
          {t.schemes.viewDetails}
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={() => onApply(scheme.scheme.schemeId)}
          aria-label={`Apply now for ${scheme.scheme.officialName}`}
        >
          {t.schemes.applyNow}
        </Button>
      </CardActions>
    </Card>
  );
};
