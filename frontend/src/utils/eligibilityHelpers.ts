import { Theme } from '@mui/material/styles';

/**
 * Calculate the appropriate color for displaying eligibility confidence
 * based on the confidence score.
 * 
 * Color mapping:
 * - confidence >= 0.8: success color (green)
 * - 0.5 <= confidence < 0.8: warning color (orange)
 * - confidence < 0.5: error color (red)
 * 
 * @param confidence - Eligibility confidence score between 0 and 1
 * @param theme - Material-UI theme object containing color palette
 * @returns CSS color string from the theme palette
 * 
 * @precondition confidence is a number between 0 and 1 (inclusive)
 * @precondition theme is a valid Material-UI Theme object
 * @precondition theme.palette contains success, warning, and error colors
 * 
 * @postcondition Returns valid CSS color string
 * @postcondition Color corresponds to confidence level as specified
 * @postcondition Return value is always a valid color from theme
 */
export function calculateEligibilityColor(
  confidence: number,
  theme: Theme
): string {
  if (confidence >= 0.8) {
    return theme.palette.success.main;
  } else if (confidence >= 0.5) {
    return theme.palette.warning.main;
  } else {
    return theme.palette.error.main;
  }
}
