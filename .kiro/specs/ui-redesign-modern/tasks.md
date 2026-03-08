# Implementation Plan: UI Redesign Modern

## Overview

This implementation plan transforms the basic list-based interface into a modern, professional UI using Material-UI v5 components. The approach focuses on creating a centralized theme system, reusable components, and enhanced user experience with search, filtering, and responsive layouts. Implementation follows an incremental approach: theme foundation → core components → filtering logic → integration.

## Tasks

- [x] 1. Set up theme configuration and design system
  - Create `src/theme/theme.ts` with Material-UI theme configuration
  - Define color palette (primary #2563eb, secondary #10b981, semantic colors)
  - Configure typography with Inter/Roboto font family and size hierarchy
  - Set spacing scale (4px base unit), border radius (8px cards, 4px inputs), and shadow system
  - Wrap App component with ThemeProvider in `src/App.tsx`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ]* 1.1 Write property test for theme configuration
  - **Property 22: Spacing Scale Consistency**
  - **Validates: Requirements 1.4**

- [x] 2. Create core reusable components
  - [x] 2.1 Create LoadingSkeleton component
    - Create `src/components/LoadingSkeleton.tsx`
    - Implement card, list, and text variants with configurable count and height
    - Use Material-UI Skeleton with smooth animations
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 2.2 Create EmptyState component
    - Create `src/components/EmptyState.tsx`
    - Display centered icon, title, description, and optional action button
    - Use appropriate spacing and colors from theme
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 2.3 Write unit tests for LoadingSkeleton and EmptyState
    - Test different variants and configurations
    - Test action button callback execution
    - _Requirements: 7.1, 8.1_

- [x] 3. Implement SearchBar component
  - Create `src/components/SearchBar.tsx` with Material-UI TextField
  - Implement debounced search (300ms) to avoid excessive filtering
  - Add search icon, clear button, and loading indicator
  - Emit onChange events with search query
  - _Requirements: 3.1, 3.3, 3.5, 3.6, 12.1_

- [ ]* 3.1 Write property test for search debouncing
  - **Property 3: Search Case Insensitivity**
  - **Validates: Requirements 3.2, 11.3**

- [x] 4. Implement FilterPanel component
  - Create `src/components/FilterPanel.tsx`
  - Display category chips with multi-select (agriculture, education, health, housing, employment, pension, women_welfare, child_welfare, disability, financial_inclusion)
  - Add sort dropdown (relevance, benefit, eligibility)
  - Add scheme level filter (all, central, state)
  - Display active filter count badge
  - Implement responsive collapse on mobile
  - _Requirements: 4.1, 4.4, 5.1, 4.7, 4.8_

- [ ]* 4.1 Write property test for filter logic
  - **Property 5: Category Filter Conjunction**
  - **Property 6: Level Filter Matching**
  - **Validates: Requirements 4.2, 4.5**

- [x] 5. Implement SchemeCard component
  - Create `src/components/SchemeCard.tsx`
  - Display scheme name with icon, level badge, category badge, and description
  - Show estimated benefit with currency formatting (when > 0)
  - Display eligibility confidence percentage with colored indicator
  - Add "View Details" and "Apply Now" buttons
  - Implement hover effects (translateY -4px, increased shadow)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [ ]* 5.1 Write property tests for SchemeCard
  - **Property 12: SchemeCard Required Fields**
  - **Property 13: Conditional Benefit Display**
  - **Property 14: Conditional Eligibility Display**
  - **Property 15: Confidence Percentage Rounding**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.4, 10.5**

- [x] 6. Implement eligibility confidence visualization
  - Create `src/utils/eligibilityHelpers.ts`
  - Implement `calculateEligibilityColor()` function
  - Return success color for confidence ≥ 0.8
  - Return warning color for 0.5 ≤ confidence < 0.8
  - Return error color for confidence < 0.5
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 6.1 Write unit tests for calculateEligibilityColor
  - Test boundary values (0, 0.5, 0.8, 1.0)
  - Test color mapping correctness
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. Implement filtering and sorting logic
  - Create `src/utils/schemeFilters.ts`
  - Implement `filterSchemes()` function with search, category, and level filters
  - Implement case-insensitive search matching name and description
  - Apply AND logic for multiple filters
  - Ensure original array is not mutated
  - Implement `sortSchemes()` function with relevance, benefit, and eligibility options
  - Maintain stable sorting
  - _Requirements: 3.2, 4.2, 4.5, 5.2, 5.3, 5.4, 5.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 7.1 Write property tests for filtering logic
  - **Property 1: Filter Subset Preservation**
  - **Property 2: Empty Filter Identity**
  - **Property 4: Search Field Matching**
  - **Property 7: Multi-Filter AND Logic**
  - **Property 11: Filter Immutability**
  - **Validates: Requirements 11.1, 11.4, 3.4, 4.3, 4.6, 11.5, 3.2, 11.2**

- [ ]* 7.2 Write property tests for sorting logic
  - **Property 8: Sort Preserves All Elements**
  - **Property 9: Sort Order Correctness**
  - **Property 10: Sort Stability**
  - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 8. Implement SchemeDetailDialog component
  - Create `src/components/SchemeDetailDialog.tsx`
  - Display full scheme details (name, description, category, level, eligibility explanation)
  - Show official website link (when available)
  - Show helpline number (when available)
  - Add "Apply Now" call-to-action button
  - Implement full-screen on mobile, modal on desktop
  - Support Escape key and outside click to close
  - Implement focus trap and focus return
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 14.3, 14.4_

- [ ]* 8.1 Write property tests for dialog behavior
  - **Property 16: Dialog Content Completeness**
  - **Property 17: Conditional Website Link**
  - **Property 18: Conditional Helpline Display**
  - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 9. Create SchemeCardGrid component
  - Create `src/components/SchemeCardGrid.tsx`
  - Implement responsive grid layout using Material-UI Grid
  - Single column on mobile (<600px)
  - Two columns on tablet (600-960px)
  - Three columns on desktop (>960px)
  - Apply appropriate spacing between cards
  - _Requirements: 9.1, 9.2, 9.3, 9.6_

- [x] 10. Checkpoint - Ensure all components render correctly
  - Verify all components are created and importable
  - Check that theme is properly applied
  - Ensure no TypeScript errors
  - Ask the user if questions arise

- [x] 11. Integrate components into SchemesPage
  - Update `src/pages/SchemesPage.tsx` (or create if doesn't exist)
  - Add state management for schemes, loading, and filters
  - Fetch schemes from API on component mount
  - Implement filter state management (search, categories, sort, level)
  - Use useMemo to calculate filtered and sorted schemes
  - Render LoadingSkeleton during loading
  - Render EmptyState when no schemes match filters
  - Render SchemeCardGrid with filtered schemes
  - Wire up SearchBar, FilterPanel, and SchemeCard callbacks
  - _Requirements: 3.2, 4.2, 4.5, 5.2, 7.1, 8.1, 12.2_

- [ ]* 11.1 Write property tests for empty state triggers
  - **Property 19: Empty State Trigger**
  - **Property 20: Clear Filters Button Presence**
  - **Validates: Requirements 8.1, 8.4**

- [x] 12. Implement error handling
  - Add error state management to SchemesPage
  - Display Material-UI Alert component on API errors
  - Provide "Retry" button for failed API calls
  - Log errors to console with sanitized messages (no PII)
  - Implement filter validation and reset invalid values
  - Add theme loading fallback to default Material-UI theme
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 15.5_

- [ ]* 12.1 Write unit tests for error handling
  - Test API error display and retry functionality
  - Test invalid filter sanitization
  - _Requirements: 13.1, 13.2, 13.4_

- [x] 13. Implement security measures
  - Add input sanitization for search queries
  - Validate API response structure before rendering
  - Implement 10-second timeout for API calls
  - Ensure HTTPS is used for API endpoints
  - Validate userId before API calls
  - Add authentication expiry handling with redirect to login
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.6, 15.7_

- [ ]* 13.1 Write property tests for security
  - **Property 23: Input Sanitization**
  - **Property 24: API Response Validation**
  - **Property 25: Invalid Filter Sanitization**
  - **Property 26: Error Log Privacy**
  - **Validates: Requirements 15.1, 15.2, 13.4, 15.5**

- [x] 14. Implement accessibility features
  - Add ARIA labels to all interactive elements (buttons, inputs, links)
  - Ensure keyboard navigation works for all components
  - Add focus trap to SchemeDetailDialog
  - Implement focus return when dialog closes
  - Verify color contrast ratios meet 4.5:1 minimum
  - Add visible focus indicators to all interactive elements
  - Add screen reader announcements for search results count
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ]* 14.1 Write property tests for accessibility
  - **Property 27: ARIA Label Presence**
  - **Property 28: Color Contrast Compliance**
  - **Property 29: Focus Indicator Presence**
  - **Validates: Requirements 14.1, 14.5, 14.6**

- [-] 15. Optimize performance
  - Implement debounce utility in `src/utils/debounce.ts`
  - Add useMemo for filtered schemes calculation
  - Lazy load SchemeDetailDialog with React.lazy()
  - Add Suspense boundary for lazy-loaded components
  - Consider virtual scrolling if scheme count exceeds 100 (optional)
  - _Requirements: 12.1, 12.2, 12.4_

- [ ]* 15.1 Write performance tests
  - Test debounce timing accuracy
  - Test memoization prevents unnecessary re-renders
  - _Requirements: 12.1, 12.2_

- [ ] 16. Final checkpoint - Integration testing
  - Test complete user flow: navigate → load → search → filter → sort → view details
  - Verify responsive behavior on mobile, tablet, and desktop viewports
  - Test error recovery flows
  - Ensure all filters work together correctly
  - Verify loading states display properly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 17. Update navigation and routing
  - Ensure SchemesPage is properly routed in the application
  - Update navigation menu to highlight active page
  - Verify navigation works across all pages
  - _Requirements: General integration_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript, so all implementations should use TypeScript
- Material-UI v7 is already installed and compatible with React 19
- Focus on creating minimal, functional implementations that can be enhanced later
