# Implementation Plan: Recommended Schemes Interest Feature

## Overview

This implementation adds "I am interested" functionality to recommended schemes on the home page by modifying the PersonalizedResultsDisplay component. The implementation reuses existing SchemeDetailDialog and Interest Dialog components, requiring only data transformation functions and state management additions. All code will be written in TypeScript with React.

## Tasks

- [ ] 1. Add data transformation utility functions
  - [x] 1.1 Create transformToSchemeRecommendation function
    - Implement function to convert PersonalizedScheme to SchemeRecommendation format
    - Handle optional fields with appropriate defaults
    - Map all fields according to design specification
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 1.2 Write property test for data transformation completeness
    - **Property 13: Data Transformation Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
    - Generate PersonalizedScheme objects with various field combinations
    - Assert all available fields are mapped correctly with empty string defaults for missing fields
  
  - [x] 1.3 Create transformForAPI function
    - Implement function to convert PersonalizedScheme to InterestedSchemeCreateRequest format
    - Include profile_id parameter
    - Provide empty string defaults for missing fields
    - _Requirements: 4.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 1.4 Write unit tests for transformation edge cases
    - Test schemes with missing description, benefits, apply_link
    - Test schemes with undefined vs null fields
    - Test empty string handling
    - _Requirements: 7.7_

- [ ] 2. Add state management to PersonalizedResultsDisplay
  - [x] 2.1 Add dialog state variables
    - Add selectedScheme state (PersonalizedScheme | null)
    - Add dialogOpen state (boolean)
    - Initialize both states appropriately
    - _Requirements: 2.1_
  
  - [x] 2.2 Implement handleViewDetails function
    - Accept PersonalizedScheme parameter
    - Set selectedScheme state
    - Set dialogOpen to true
    - _Requirements: 2.1_
  
  - [x] 2.3 Implement handleCloseDialog function
    - Set dialogOpen to false
    - Clear selectedScheme state
    - _Requirements: 2.6_
  
  - [ ]* 2.4 Write property test for dialog state transitions
    - **Property 3: Dialog Opens on Click**
    - **Validates: Requirements 2.1**
    - Generate random PersonalizedScheme objects
    - Simulate "View Details" click
    - Assert dialog state transitions from closed to open

- [ ] 3. Implement interest marking functionality
  - [x] 3.1 Implement handleMarkInterested function
    - Retrieve profileId from localStorage with fallback check
    - Transform scheme data using transformForAPI
    - Send POST request to /api/v1/interested-schemes
    - Handle success response with dialog closure
    - Handle error response with logging
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2, 6.3_
  
  - [ ]* 3.2 Write property test for interest confirmation API call
    - **Property 9: Interest Confirmation Triggers API Call**
    - **Validates: Requirements 3.4, 4.1, 4.2**
    - Generate random PersonalizedScheme objects with valid profile_id
    - Simulate "Yes" click in Interest Dialog
    - Assert POST request made with all required fields populated
  
  - [ ]* 3.3 Write property test for interest rejection
    - **Property 10: Interest Rejection Closes Without Saving**
    - **Validates: Requirements 3.5**
    - Generate random schemes
    - Simulate "No" click in Interest Dialog
    - Assert no API calls made and both dialogs close
  
  - [ ]* 3.4 Write property test for missing profile ID
    - **Property 14: Missing Profile ID Prevents API Call**
    - **Validates: Requirements 6.2, 6.4**
    - Generate schemes with missing profile_id in both props and localStorage
    - Attempt to mark interest
    - Assert no API calls made to Interest Service
  
  - [ ]* 3.5 Write unit tests for error handling
    - Test API 400/500 error responses
    - Test network timeout scenarios
    - Test invalid response format handling
    - Test error logging behavior
    - _Requirements: 4.4, 6.1, 6.5_

- [x] 4. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Modify scheme card UI in PersonalizedResultsDisplay
  - [x] 5.1 Add "View Details" button to scheme cards
    - Add button with onClick handler calling handleViewDetails
    - Apply consistent styling matching Schemes page buttons
    - Include aria-label with scheme name for accessibility
    - Position button appropriately on card
    - _Requirements: 1.1, 1.4, 1.5, 8.1_
  
  - [ ]* 5.2 Write property test for View Details button presence
    - **Property 1: View Details Button Presence**
    - **Validates: Requirements 1.1, 1.5, 8.1**
    - Generate random PersonalizedScheme objects
    - Render scheme cards
    - Assert "View Details" button exists with aria-label including scheme name
  
  - [x] 5.3 Implement conditional button rendering logic
    - Show both "View Details" and "Apply Now" when apply_link exists
    - Show only "View Details" when apply_link is missing
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 5.4 Write property test for conditional button rendering
    - **Property 2: Conditional Button Rendering**
    - **Validates: Requirements 1.2, 1.3**
    - Generate schemes with and without apply_link
    - Assert correct button count based on apply_link presence
  
  - [ ]* 5.5 Write unit tests for button styling and positioning
    - Test button CSS classes match Schemes page
    - Test button layout in card
    - Test responsive behavior
    - _Requirements: 1.4_

- [ ] 6. Integrate SchemeDetailDialog component
  - [x] 6.1 Add SchemeDetailDialog to component render
    - Import SchemeDetailDialog component
    - Pass transformed scheme data as props
    - Pass dialogOpen state and handleCloseDialog callback
    - Pass handleMarkInterested callback
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_
  
  - [x] 6.2 Ensure dialog displays all scheme information
    - Verify name, description, category, level, ministry render correctly
    - Verify eligibility explanation displays
    - Verify "Apply Now" and "Close" buttons appear
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [ ]* 6.3 Write property test for complete scheme data display
    - **Property 4: Complete Scheme Data Display**
    - **Validates: Requirements 2.2, 2.3**
    - Generate schemes with various field combinations
    - Render SchemeDetailDialog
    - Assert all available fields render in dialog
  
  - [ ]* 6.4 Write unit tests for dialog integration
    - Test dialog receives correct props
    - Test handleMarkInterested callback invocation
    - Test dialog closure behavior
    - _Requirements: 2.1, 3.4_

- [ ] 7. Implement accessibility features
  - [x] 7.1 Add ARIA attributes to dialogs
    - Ensure SchemeDetailDialog has role="dialog"
    - Ensure SchemeDetailDialog has aria-labelledby pointing to title
    - Ensure Interest Dialog has role="dialog"
    - Ensure Interest Dialog has aria-labelledby pointing to title
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [x] 7.2 Implement focus management
    - Implement focus trap within open dialogs
    - Implement focus return to trigger element on close
    - _Requirements: 2.5, 2.6, 8.7_
  
  - [ ]* 7.3 Write property test for focus trap
    - **Property 5: Focus Trap in Open Dialog**
    - **Validates: Requirements 2.5, 8.7**
    - Generate random dialogs
    - Simulate Tab key presses
    - Assert focus cycles only within dialog elements
  
  - [ ]* 7.4 Write property test for focus return
    - **Property 6: Focus Return on Close**
    - **Validates: Requirements 2.6**
    - Generate random trigger elements
    - Open and close dialog
    - Assert focus returns to triggering element
  
  - [ ]* 7.5 Write unit tests for ARIA attributes
    - Test role="dialog" attribute exists
    - Test aria-labelledby points to correct element
    - Test aria-describedby if applicable
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [x] 7.6 Add screen reader announcements
    - Ensure dialog content announced when opened
    - Test with NVDA/JAWS/VoiceOver (manual testing)
    - _Requirements: 8.6_

- [ ] 8. Implement Interest Dialog integration
  - [x] 8.1 Verify Interest Dialog triggers from "Apply Now"
    - Ensure clicking "Apply Now" in SchemeDetailDialog opens Interest Dialog
    - Verify Interest Dialog displays correct text
    - Verify "Yes" and "No" buttons appear
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 8.2 Write property test for Interest Dialog trigger
    - **Property 7: Interest Dialog Trigger**
    - **Validates: Requirements 3.1**
    - Generate schemes with valid profile_id
    - Simulate "Apply Now" click in SchemeDetailDialog
    - Assert Interest Dialog opens
  
  - [ ]* 8.3 Write property test for Interest Dialog persistence
    - **Property 8: Interest Dialog Persistence**
    - **Validates: Requirements 3.6**
    - Generate random Interest Dialogs
    - Wait random time without user interaction
    - Assert dialog remains open until explicit user action
  
  - [ ]* 8.4 Write property test for dialog closure after save
    - **Property 11: Dialog Closure After Save**
    - **Validates: Requirements 4.5**
    - Generate schemes and simulate save operations (success and failure)
    - Assert both Interest Dialog and Scheme Detail Dialog close after operation completes
  
  - [ ]* 8.5 Write unit tests for Interest Dialog behavior
    - Test "Yes" button triggers handleMarkInterested
    - Test "No" button closes dialogs without API call
    - Test dialog text content
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 9. Checkpoint - Ensure all dialogs work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Verify consistency with Schemes page
  - [x] 10.1 Compare dialog components
    - Verify SchemeDetailDialog is same component used on Schemes page
    - Verify Interest Dialog is same component used on Schemes page
    - Verify handleMarkInterested uses same implementation
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 10.2 Compare styling and animations
    - Verify dialog styling matches Schemes page
    - Verify button styling matches Schemes page
    - Verify animations match Schemes page
    - _Requirements: 5.5_
  
  - [ ]* 10.3 Write property test for consistent error messages
    - **Property 15: Consistent Error Messages**
    - **Validates: Requirements 5.4**
    - Generate error scenarios from both recommended schemes and schemes page
    - Assert error messages are identical
  
  - [ ]* 10.4 Write unit tests for success message consistency
    - Test success messages match between contexts
    - Test message formatting and content
    - _Requirements: 5.4_

- [ ] 11. Add end-to-end integration tests
  - [ ]* 11.1 Write property test for interest data round trip
    - **Property 12: Interest Data Round Trip**
    - **Validates: Requirements 4.6**
    - Generate random schemes
    - Save interest via API
    - Retrieve interested schemes by profile_id
    - Assert returned record contains same scheme_name and scheme_slug
  
  - [ ]* 11.2 Write integration tests for complete user flow
    - Test full flow: click View Details → click Apply Now → click Yes → verify save
    - Test full flow: click View Details → click Apply Now → click No → verify no save
    - Test full flow with missing profile_id
    - Test full flow with API errors
    - _Requirements: 1.1, 2.1, 3.1, 3.4, 4.1_

- [x] 12. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Manual accessibility testing with screen readers is required for WCAG compliance
- The implementation reuses existing components from the Schemes page for consistency
- All code is written in TypeScript with React
- Fast-check library should be used for property-based testing with minimum 100 iterations per test
