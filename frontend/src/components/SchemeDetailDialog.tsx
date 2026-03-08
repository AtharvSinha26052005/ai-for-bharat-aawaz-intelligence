import React, { useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Link,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import { SchemeRecommendation } from '../types';

export interface SchemeDetailDialogProps {
  open: boolean;
  scheme: SchemeRecommendation | null;
  onClose: () => void;
  onApply: (schemeId: string) => void;
  onMarkInterested?: (scheme: SchemeRecommendation) => void;
  profileId?: string | null;
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
 * SchemeDetailDialog Component
 * 
 * Displays comprehensive scheme information in a modal dialog.
 * Features:
 * - Full-screen on mobile, modal on desktop
 * - Complete scheme details (name, description, category, level, eligibility)
 * - Official website link (when available)
 * - Helpline number (when available)
 * - "Apply Now" call-to-action button
 * - Escape key and outside click to close
 * - Focus trap and focus return
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 14.3, 14.4
 */
export const SchemeDetailDialog: React.FC<SchemeDetailDialogProps> = ({
  open,
  scheme,
  onClose,
  onApply,
  onMarkInterested,
  profileId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [showInterestDialog, setShowInterestDialog] = React.useState(false);
  const [markingInterested, setMarkingInterested] = React.useState(false);

  // Store the element that triggered the dialog for focus return (Requirement 14.4)
  useEffect(() => {
    if (open) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus trap: Focus close button when dialog opens and return focus on close (Requirements 14.3, 14.4)
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    } else if (!open && previousActiveElementRef.current) {
      // Return focus to the element that triggered the dialog
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [open]);

  // Focus trap: Handle Tab key to keep focus within dialog (Requirement 14.3)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: If focus is on first element, move to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: If focus is on last element, move to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  if (!scheme) {
    return null;
  }

  const confidencePercent = Math.round(scheme.eligibility.confidence * 100);
  const confidenceColor = calculateEligibilityColor(
    scheme.eligibility.confidence,
    theme
  );

  // Determine level chip color
  const levelColor = scheme.scheme.level === 'central' ? 'primary' : 'secondary';

  const handleApply = () => {
    onApply(scheme.scheme.schemeId);
    // Show interest dialog after clicking Apply
    // Check both profileId prop and localStorage
    const storedProfileId = localStorage.getItem('profileId');
    const activeProfileId = profileId || storedProfileId;
    
    if (onMarkInterested && activeProfileId) {
      setShowInterestDialog(true);
    } else {
      onClose();
    }
  };

  const handleMarkInterested = async (interested: boolean) => {
    if (interested && onMarkInterested && scheme) {
      setMarkingInterested(true);
      try {
        await onMarkInterested(scheme);
      } catch (error) {
        console.error('Failed to mark scheme as interested:', error);
      } finally {
        setMarkingInterested(false);
      }
    }
    setShowInterestDialog(false);
    onClose();
  };

  return (
    <Dialog
      ref={dialogRef}
      open={open}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      aria-labelledby="scheme-detail-dialog-title"
      aria-describedby="scheme-detail-dialog-description"
      // Support Escape key to close (built-in with onClose)
      // Support outside click to close (built-in with onClose)
    >
      {/* Dialog Title with Close Button */}
      <DialogTitle
        id="scheme-detail-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, pr: 2 }}>
          <AccountBalanceIcon
            color="primary"
            sx={{ mr: 1.5, fontSize: 28, flexShrink: 0 }}
            aria-hidden="true"
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {scheme.scheme.officialName}
          </Typography>
        </Box>
        <IconButton
          ref={closeButtonRef}
          aria-label="Close dialog"
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent id="scheme-detail-dialog-description" dividers>
        {/* Level and Category Badges */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={scheme.scheme.level.charAt(0).toUpperCase() + scheme.scheme.level.slice(1)}
            size="medium"
            color={levelColor}
            aria-label={`Scheme level: ${scheme.scheme.level}`}
          />
          <Chip
            label={scheme.scheme.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            size="medium"
            variant="outlined"
            aria-label={`Category: ${scheme.scheme.category}`}
          />
        </Box>

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Description
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {scheme.scheme.shortDescription}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Eligibility Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Eligibility
          </Typography>
          
          {scheme.eligibility.eligible && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                p: 2,
                backgroundColor: `${confidenceColor}15`,
                borderRadius: 1,
                border: `1px solid ${confidenceColor}40`,
              }}
            >
              <CheckCircleIcon
                sx={{ mr: 1.5, color: confidenceColor, fontSize: 24 }}
                aria-hidden="true"
              />
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: confidenceColor,
                    fontWeight: 600,
                  }}
                  aria-label={`Eligibility match: ${confidencePercent} percent`}
                >
                  {confidencePercent}% Match
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on your profile
                </Typography>
              </Box>
            </Box>
          )}

          <Typography variant="body1" color="text.secondary">
            {scheme.eligibility.explanation}
          </Typography>
        </Box>

        {/* Estimated Benefit */}
        {scheme.estimatedBenefit > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Estimated Benefit
              </Typography>
              <Typography
                variant="h4"
                color="success.main"
                sx={{ fontWeight: 600 }}
                aria-label={`Estimated benefit: ${scheme.estimatedBenefit.toLocaleString('en-IN')} rupees`}
              >
                ₹{scheme.estimatedBenefit.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {scheme.personalizedExplanation}
              </Typography>
            </Box>
          </>
        )}

        {/* Official Website Link */}
        {scheme.scheme.officialWebsite && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Official Website
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LanguageIcon
                  color="primary"
                  sx={{ mr: 1, fontSize: 20 }}
                  aria-hidden="true"
                />
                <Link
                  href={scheme.scheme.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                  aria-label={`Visit official website: ${scheme.scheme.officialWebsite}`}
                >
                  {scheme.scheme.officialWebsite}
                </Link>
              </Box>
            </Box>
          </>
        )}

        {/* Helpline Number */}
        {scheme.scheme.helplineNumber && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Helpline
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PhoneIcon
                  color="primary"
                  sx={{ mr: 1, fontSize: 20 }}
                  aria-hidden="true"
                />
                <Link
                  href={`tel:${scheme.scheme.helplineNumber}`}
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                  aria-label={`Call helpline: ${scheme.scheme.helplineNumber}`}
                >
                  {scheme.scheme.helplineNumber}
                </Link>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      {/* Dialog Actions */}
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          color="inherit"
          aria-label="Close dialog"
        >
          Close
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          size="large"
          aria-label={`Apply now for ${scheme.scheme.officialName}`}
        >
          Apply Now
        </Button>
      </DialogActions>

      {/* Interest Confirmation Dialog */}
      <Dialog
        open={showInterestDialog}
        onClose={() => handleMarkInterested(false)}
        aria-labelledby="interest-dialog-title"
      >
        <DialogTitle id="interest-dialog-title">
          Are you interested in this scheme?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Would you like to save this scheme to get personalized financial advice on how to utilize the benefits?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleMarkInterested(false)}
            color="inherit"
            disabled={markingInterested}
          >
            No, Thanks
          </Button>
          <Button
            onClick={() => handleMarkInterested(true)}
            variant="contained"
            color="primary"
            disabled={markingInterested}
          >
            {markingInterested ? 'Saving...' : 'Yes, I\'m Interested'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
