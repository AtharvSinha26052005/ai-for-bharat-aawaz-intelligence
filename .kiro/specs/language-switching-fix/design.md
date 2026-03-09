# Language Switching Fix Bugfix Design

## Overview

The language selector currently only translates navigation menu items and page headings, leaving form labels, buttons, placeholders, and other content in English. This creates an incomplete and inconsistent user experience for non-English speakers. The fix involves systematically identifying all hardcoded English text across all pages (Profile, Schemes, Education, Applications, Fraud Check) and replacing them with translation keys that reference the existing translation system. The translation files already contain most needed keys, but some are missing and need to be added. The fix is minimal and surgical - replacing hardcoded strings with translation key references without changing any application logic or behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user selects a non-English language and navigates to any page, hardcoded English text remains untranslated
- **Property (P)**: The desired behavior - all visible UI text should be displayed in the selected language
- **Preservation**: Existing language selection persistence, navigation behavior, and English language display must remain unchanged
- **useTranslation hook**: The React hook in `frontend/src/hooks/useTranslation.ts` that provides access to translation keys based on the selected language
- **Translation keys**: Nested object structure in translation files (e.g., `t.profile.age`, `t.common.save`) that map to translated strings
- **Hardcoded text**: String literals directly embedded in JSX/TSX components instead of using translation keys

## Bug Details

### Fault Condition

The bug manifests when a user selects a non-English language (Hindi, Bengali, Marathi, Tamil) from the language selector and navigates to any page in the application. The components are rendering hardcoded English strings for form labels, button text, placeholders, helper text, dropdown options, and validation messages instead of using the translation system.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { selectedLanguage: Language, pageComponent: string, textElement: string }
  OUTPUT: boolean
  
  RETURN input.selectedLanguage IN ['hi', 'bn', 'mr', 'ta']
         AND input.pageComponent IN ['Profile', 'Schemes', 'Education', 'Applications', 'FraudCheck']
         AND input.textElement IS hardcoded English string
         AND input.textElement NOT using translation key from useTranslation hook
END FUNCTION
```

### Examples

- **Profile Page**: When language is set to Hindi, the form label "Phone Number" displays in English instead of Hindi. Expected: Should display translation key `t.profile.phoneNumber` which would render the Hindi translation.

- **Profile Page**: When language is set to Bengali, the dropdown option "Select Gender" displays in English instead of Bengali. Expected: Should display translation key `t.profile.selectGender` which would render the Bengali translation.

- **Profile Page**: When language is set to Tamil, the button text "Save & Find Schemes" displays in English instead of Tamil. Expected: Should display translation key based on profile state (e.g., `t.profile.saveProfile`).

- **Profile Page**: When language is set to Marathi, the helper text "Enter 10 digit mobile number" displays in English instead of Marathi. Expected: Should display translation key `t.profile.phoneHelperText` which would render the Marathi translation.

- **Schemes Page**: When language is set to Hindi, hardcoded filter labels and button text remain in English instead of using existing translation keys like `t.schemes.filters`, `t.schemes.clearFilters`.

- **Education Page**: When language is set to any non-English language, page content and button labels remain in English instead of using translation keys from `t.education`.

- **Edge Case**: When language is set to English, all text should continue to display in English exactly as it currently does (preservation requirement).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Language selection persistence across page navigation must continue to work exactly as before
- The language selector dropdown must continue to display available languages and highlight the current selection
- English language display must remain identical to current behavior (all existing English text must display the same way)
- Navigation between pages must continue to maintain the selected language state
- Default language behavior (English when no language is explicitly selected) must remain unchanged
- localStorage language preference checking on application load must continue to work

**Scope:**
All inputs and interactions that do NOT involve displaying UI text in non-English languages should be completely unaffected by this fix. This includes:
- Form validation logic and error handling
- API calls and data submission
- Navigation routing and state management
- User authentication and profile storage
- Scheme filtering and search functionality
- All JavaScript/TypeScript logic that doesn't involve UI text rendering

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Incomplete Translation Key Usage**: Developers used translation keys for navigation and headings (e.g., `t.nav.home`, `t.profile.title`) but forgot to use them for form elements, buttons, and helper text. Many components have hardcoded English strings like "Phone Number", "Select Gender", "Save & Find Schemes" instead of using translation keys.

2. **Missing Translation Keys**: Some UI elements don't have corresponding translation keys defined in the translation files. For example, "Phone Number", "Aadhar Number", "Select Gender", "Select Caste", helper text strings, and some button labels are missing from the translation objects.

3. **Inconsistent Translation Pattern**: The codebase shows inconsistent patterns - some components use `t.profile.age` correctly, while adjacent elements use hardcoded strings like "Phone Number". This suggests incomplete implementation rather than a systematic issue.

4. **Placeholder and Helper Text Oversight**: TextField components have `placeholder` and `helperText` props with hardcoded English strings that were overlooked during the initial translation implementation.

## Correctness Properties

Property 1: Fault Condition - Complete UI Translation

_For any_ UI text element where the bug condition holds (user has selected a non-English language and the element contains hardcoded English text), the fixed component SHALL render the text using the appropriate translation key from the useTranslation hook, causing the text to display in the selected language.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - English Language and Existing Behavior

_For any_ interaction or display where the bug condition does NOT hold (English language selected, or non-UI-text functionality), the fixed code SHALL produce exactly the same behavior as the original code, preserving language selection persistence, navigation state management, form validation logic, API interactions, and all English text display.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Files to Modify:**
1. `frontend/src/pages/Profile.tsx`
2. `frontend/src/pages/Schemes.tsx`
3. `frontend/src/pages/Education.tsx`
4. `frontend/src/pages/Applications.tsx`
5. `frontend/src/pages/FraudCheck.tsx`
6. `frontend/src/translations/en.ts` (add missing keys)
7. `frontend/src/translations/hi.ts` (add missing keys)
8. `frontend/src/translations/bn.ts` (add missing keys)
9. `frontend/src/translations/mr.ts` (add missing keys)
10. `frontend/src/translations/ta.ts` (add missing keys)

**Specific Changes**:

1. **Add Missing Translation Keys**: Add translation keys for all hardcoded text elements to all translation files:
   - Profile page: `phoneNumber`, `phoneNumberPlaceholder`, `phoneHelperText`, `aadharNumber`, `aadharPlaceholder`, `aadharHelperText`, `selectGender`, `selectCaste`, `occupationPlaceholder`, `blockOptional`, `villageOptional`, `pincodeOptional`, `preferredMode`, `voice`, `text`, `both`, `saveAndFindSchemes`, `updateAndFindSchemes`, `saving`, `phoneValidation`, `aadharValidation`
   - Common section: Add any missing button/action text
   - Ensure all other pages have complete translation coverage

2. **Replace Hardcoded Strings in Profile.tsx**: Replace all hardcoded English strings with translation key references:
   - Line ~265: `"Phone Number"` → `{t.profile.phoneNumber}`
   - Line ~268: `"10 digit mobile number"` → `{t.profile.phoneNumberPlaceholder}`
   - Line ~270: `"Enter 10 digit mobile number"` → `{t.profile.phoneHelperText}`
   - Line ~275: `"Aadhar Number"` → `{t.profile.aadharNumber}`
   - Line ~278: `"12 digit Aadhar number"` → `{t.profile.aadharPlaceholder}`
   - Line ~280: `"Enter 12 digit Aadhar number"` → `{t.profile.aadharHelperText}`
   - Line ~287: `"Gender"` → `{t.profile.gender}`
   - Line ~292: `"Select Gender"` → `{t.profile.selectGender}`
   - Line ~293-295: `"Male"`, `"Female"`, `"Other"` → Use translation keys
   - Line ~301: `"Caste"` → `{t.profile.caste}`
   - Line ~306: `"Select Caste"` → `{t.profile.selectCaste}`
   - Line ~307-311: Caste options → Use translation keys
   - Line ~318: `"Occupation"` → `{t.profile.occupation}`
   - Line ~322: `"e.g., Farmer, Laborer, Self-employed"` → `{t.profile.occupationPlaceholder}`
   - Line ~329: `"State"` → `{t.profile.state}`
   - Line ~337: `"District"` → `{t.profile.district}`
   - Line ~345: `"Block (Optional)"` → `{t.profile.blockOptional}`
   - Line ~353: `"Village (Optional)"` → `{t.profile.villageOptional}`
   - Line ~361: `"Pincode (Optional)"` → `{t.profile.pincodeOptional}`
   - Line ~370: `"Preferred Mode"` → `{t.profile.preferredMode}`
   - Line ~376-378: Mode options → Use translation keys
   - Line ~389: Button text → Use conditional translation keys based on `savedProfileId`
   - Validation error messages → Use translation keys

3. **Replace Hardcoded Strings in Other Pages**: Apply the same pattern to Schemes.tsx, Education.tsx, Applications.tsx, and FraudCheck.tsx - identify all hardcoded English strings and replace with appropriate translation keys.

4. **Verify Translation File Completeness**: Ensure all translation files (en, hi, bn, mr, ta) have complete and accurate translations for all new keys added.

5. **Test Translation Coverage**: After implementation, verify that switching languages updates all visible text on every page.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by switching to non-English languages and observing untranslated text, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Manually test the application by selecting different non-English languages and navigating to each page. Document all instances of untranslated text. Run these observations on the UNFIXED code to catalog the exact locations and text that need translation.

**Test Cases**:
1. **Profile Page Hindi Test**: Select Hindi language, navigate to Profile page, observe that "Phone Number", "Aadhar Number", "Gender", "Caste", dropdown options, helper text, and button text remain in English (will fail on unfixed code)
2. **Schemes Page Bengali Test**: Select Bengali language, navigate to Schemes page, observe that filter labels, search placeholders, and action buttons remain in English (will fail on unfixed code)
3. **Education Page Tamil Test**: Select Tamil language, navigate to Education page, observe that page content, section descriptions, and button labels remain in English (will fail on unfixed code)
4. **Applications Page Marathi Test**: Select Marathi language, navigate to Applications page, observe that status labels and descriptions remain in English (will fail on unfixed code)
5. **FraudCheck Page Hindi Test**: Select Hindi language, navigate to Fraud Check page, observe that input labels, placeholders, and result messages remain in English (will fail on unfixed code)
6. **All Pages Language Switch Test**: Switch between multiple languages rapidly and observe which elements update and which remain in English (will demonstrate incomplete translation coverage on unfixed code)

**Expected Counterexamples**:
- Form labels, button text, placeholders, helper text, and dropdown options remain in English when non-English language is selected
- Possible causes: hardcoded strings not using translation keys, missing translation keys in translation files, inconsistent translation pattern implementation

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderComponent_fixed(input.selectedLanguage, input.pageComponent)
  ASSERT allTextElements(result) ARE in input.selectedLanguage
  ASSERT NO hardcoded English strings visible
END FOR
```

**Test Approach**: After implementing the fix, systematically test each page with each supported language to verify complete translation coverage.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderComponent_original(input) = renderComponent_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for English language display and all non-UI functionality, then write property-based tests capturing that behavior.

**Test Cases**:
1. **English Language Preservation**: Observe that all text displays correctly in English on unfixed code, then write tests to verify English text remains identical after fix
2. **Language Persistence Preservation**: Observe that language selection persists across navigation on unfixed code, then write tests to verify this continues after fix
3. **Form Validation Preservation**: Observe that form validation works correctly on unfixed code, then write tests to verify validation logic is unchanged after fix
4. **Navigation Preservation**: Observe that page navigation and routing work correctly on unfixed code, then write tests to verify navigation is unchanged after fix
5. **API Integration Preservation**: Observe that API calls and data submission work correctly on unfixed code, then write tests to verify API interactions are unchanged after fix

### Unit Tests

- Test that each page component renders with correct translation keys for each supported language
- Test that switching languages updates all visible text elements
- Test that missing translation keys fall back to English gracefully
- Test that translation key references are correctly structured (no typos in key paths)
- Test that all form elements (labels, placeholders, helper text, options) use translation keys

### Property-Based Tests

- Generate random language selections and verify all UI text elements render in the selected language
- Generate random page navigation sequences and verify language selection persists correctly
- Generate random form inputs and verify validation messages use translation keys
- Test that for any non-English language selection, no hardcoded English strings are visible in the rendered output

### Integration Tests

- Test full user flow: select language → navigate to Profile → fill form → submit → navigate to Schemes → verify all text is in selected language
- Test language switching during form filling: start in English → switch to Hindi mid-form → verify all labels update
- Test language persistence: select Hindi → navigate through all pages → refresh browser → verify Hindi is still selected and all pages display in Hindi
- Test that English language continues to work exactly as before (regression test)
