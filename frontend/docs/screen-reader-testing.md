# Screen Reader Testing Guide

## Overview

This document provides guidance for manual testing of screen reader announcements for the Recommended Schemes Interest Feature dialogs.

## ARIA Attributes Verification

### SchemeDetailDialog

The SchemeDetailDialog component includes the following ARIA attributes for screen reader support:

- **`aria-labelledby="scheme-detail-dialog-title"`**: Links the dialog to its title element, ensuring screen readers announce the scheme name when the dialog opens
- **`aria-describedby="scheme-detail-dialog-description"`**: Links the dialog to its content, providing context about the scheme details
- **`role="dialog"`**: Implicit in MUI's Dialog component, identifies the element as a dialog to assistive technologies

### Interest Dialog

The Interest Dialog (nested within SchemeDetailDialog) includes:

- **`aria-labelledby="interest-dialog-title"`**: Links the dialog to its title "Are you interested in this scheme?"
- **`role="dialog"`**: Implicit in MUI's Dialog component

## Expected Screen Reader Behavior

### When SchemeDetailDialog Opens

Screen readers should announce:
1. "Dialog" (or equivalent in the screen reader's language)
2. The scheme name from the dialog title (e.g., "Pradhan Mantri Awas Yojana")
3. The dialog content including description, eligibility, and other details

### When Interest Dialog Opens

Screen readers should announce:
1. "Dialog"
2. "Are you interested in this scheme?"
3. The dialog content: "Would you like to save this scheme to get personalized financial advice on how to utilize the benefits?"

## Manual Testing Instructions

### Required Tools

Test with at least two of the following screen readers:
- **NVDA** (Windows) - Free and open source
- **JAWS** (Windows) - Commercial screen reader
- **VoiceOver** (macOS/iOS) - Built into Apple devices

### Testing Steps

#### Test 1: SchemeDetailDialog Announcement

1. Navigate to the home page with personalized recommendations
2. Enable your screen reader
3. Tab to a "View Details" button on a scheme card
4. Press Enter to open the dialog
5. **Verify**: Screen reader announces the dialog role and the scheme name
6. **Verify**: Screen reader announces or allows navigation to the dialog content

#### Test 2: Interest Dialog Announcement

1. With SchemeDetailDialog open, tab to the "Apply Now" button
2. Press Enter to open the Interest Dialog
3. **Verify**: Screen reader announces the dialog role
4. **Verify**: Screen reader announces "Are you interested in this scheme?"
5. **Verify**: Screen reader announces or allows navigation to the dialog content

#### Test 3: Focus Management

1. Open SchemeDetailDialog
2. **Verify**: Focus moves to the close button (first focusable element)
3. Press Tab repeatedly
4. **Verify**: Focus cycles only within the dialog (focus trap)
5. Close the dialog
6. **Verify**: Focus returns to the "View Details" button that opened the dialog

#### Test 4: Keyboard Navigation

1. Open SchemeDetailDialog using keyboard only (Tab + Enter)
2. Navigate through all interactive elements using Tab
3. **Verify**: All buttons, links, and interactive elements are reachable
4. **Verify**: Each element has a clear announcement of its purpose
5. Press Escape
6. **Verify**: Dialog closes and focus returns appropriately

### Testing Checklist

- [ ] NVDA announces SchemeDetailDialog title when opened
- [ ] NVDA announces SchemeDetailDialog content
- [ ] NVDA announces Interest Dialog title when opened
- [ ] NVDA announces Interest Dialog content
- [ ] JAWS announces SchemeDetailDialog title when opened
- [ ] JAWS announces SchemeDetailDialog content
- [ ] JAWS announces Interest Dialog title when opened
- [ ] JAWS announces Interest Dialog content
- [ ] VoiceOver announces SchemeDetailDialog title when opened
- [ ] VoiceOver announces SchemeDetailDialog content
- [ ] VoiceOver announces Interest Dialog title when opened
- [ ] VoiceOver announces Interest Dialog content
- [ ] Focus trap works correctly in both dialogs
- [ ] Focus returns to trigger element when dialogs close
- [ ] All interactive elements have descriptive labels

## Known Limitations

- Automated tests cannot fully validate WCAG compliance
- Manual testing with assistive technologies is required
- Different screen readers may announce content differently (this is expected)
- Testing should be performed on both desktop and mobile devices

## Compliance Notes

This implementation follows WCAG 2.1 AA guidelines for dialog accessibility:
- **1.3.1 Info and Relationships**: ARIA attributes properly identify dialog structure
- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.4.3 Focus Order**: Logical focus order maintained
- **2.4.7 Focus Visible**: Focus indicators visible on all interactive elements
- **4.1.2 Name, Role, Value**: All UI components have accessible names and roles

## References

- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MUI Dialog Accessibility](https://mui.com/material-ui/react-dialog/#accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Validation: Requirements 8.6

This document validates **Requirement 8.6**: "WHEN a dialog opens, THE System SHALL announce the dialog content to screen readers"

The implementation ensures:
1. Both dialogs have proper `aria-labelledby` attributes pointing to their titles
2. SchemeDetailDialog has `aria-describedby` pointing to its content
3. MUI Dialog components provide implicit `role="dialog"` attributes
4. Screen readers will announce dialog content when dialogs open

**Status**: Implementation complete. Manual testing required to verify announcements across different screen readers.
