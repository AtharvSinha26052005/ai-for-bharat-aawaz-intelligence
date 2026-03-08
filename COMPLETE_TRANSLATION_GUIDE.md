# Complete Website Translation Implementation Guide

## Current Status

### ✅ Pages with Translation
- Home page
- Education page  
- Schemes page (headers only)
- FraudCheck page
- Navigation component

### ⚠️ Partially Translated
- **Schemes page** - Page headers translated, but scheme cards, filters, and buttons still in English

### ❌ Not Translated
- Profile page
- Applications page
- All child components (SchemeCard, FilterPanel, SearchBar, etc.)

## The Problem

When you change language, only the page headers and navigation translate. The actual content (scheme cards, buttons, filters, form labels) remains in English because:

1. **Child components don't receive `language` prop** - Components like SchemeCard, FilterPanel need the language prop passed down
2. **Hardcoded English text** - Buttons like "View Details", "Apply Now", filter labels are hardcoded
3. **Scheme data is in English** - The actual scheme names and descriptions from the JSON file are in English

## Solution Overview

### Phase 1: Translate UI Components (Buttons, Labels, Filters)

**Components that need updates:**

1. **SchemeCard** (`frontend/src/components/SchemeCard.tsx`)
   - ✅ DONE - Added language prop and translations for:
     - "View Details" → `t.schemes.viewDetails`
     - "Apply Now" → `t.schemes.applyNow`
     - "Estimated Benefit" → `t.schemes.estimatedBenefit`
     - "Central"/"State" → `t.schemes.central` / `t.schemes.state`

2. **SchemeCardGrid** (`frontend/src/components/SchemeCardGrid.tsx`)
   - ✅ DONE - Added language prop and passes it to SchemeCard

3. **FilterPanel** (`frontend/src/components/FilterPanel.tsx`)
   - ❌ TODO - Needs translation for:
     - "Filters" label
     - "Sort by" dropdown
     - "Relevance", "Benefit", "Eligibility" options
     - "All", "Central", "State" level options
     - Category names (Agriculture, Education, Health, etc.)

4. **SearchBar** (`frontend/src/components/SearchBar.tsx`)
   - ❌ TODO - Placeholder text needs translation

5. **EmptyState** (`frontend/src/components/EmptyState.tsx`)
   - ❌ TODO - Messages need translation

6. **SchemeDetailDialog** (`frontend/src/components/SchemeDetailDialog.tsx`)
   - ❌ TODO - All labels and buttons need translation

### Phase 2: Translate Form Pages

1. **Profile Page** - All form labels, placeholders, buttons
2. **Applications Page** - All content

### Phase 3: Scheme Data Translation (Advanced)

The scheme names and descriptions are in English in the JSON file. To translate these, you have two options:

**Option A: Pre-translated Data**
- Create separate JSON files for each language
- `myscheme_full_1000_hi.json`, `myscheme_full_1000_bn.json`, etc.
- Load the appropriate file based on selected language

**Option B: Dynamic Translation**
- Use a translation API (Google Translate API, etc.)
- Translate scheme data on-the-fly when language changes
- Cache translations for performance

## Quick Implementation Steps

### Step 1: Update FilterPanel Component

```typescript
// Add to FilterPanel.tsx
import { Language } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export interface FilterPanelProps {
  // ... existing props
  language: Language; // ADD THIS
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  // ... existing props
  language, // ADD THIS
}) => {
  const { t } = useTranslation(language); // ADD THIS
  
  // Replace hardcoded text:
  // "Filters" → {t.schemes.filters}
  // "Sort by" → {t.common.filter}
  // "Agriculture" → {t.schemes.agriculture}
  // etc.
};
```

### Step 2: Update Schemes Page to Pass Language

```typescript
// In Schemes.tsx, update FilterPanel usage:
<FilterPanel
  categories={SCHEME_CATEGORIES}
  selectedCategories={filters.selectedCategories}
  onCategoryChange={handleCategoryChange}
  sortBy={sortBy}
  onSortChange={handleSortChange}
  schemeLevel={filters.schemeLevel}
  onLevelChange={handleLevelChange}
  language={language} // ADD THIS
/>
```

### Step 3: Repeat for All Components

Follow the same pattern for:
- SearchBar
- EmptyState  
- SchemeDetailDialog
- Profile page
- Applications page

## Translation Keys Already Available

All these keys exist in all 5 language files:

```typescript
t.schemes.viewDetails
t.schemes.applyNow
t.schemes.estimatedBenefit
t.schemes.central
t.schemes.state
t.schemes.filters
t.schemes.category
t.schemes.agriculture
t.schemes.education
t.schemes.health
// ... and many more
```

## Testing

After implementing translations:

1. Change language from navbar
2. Verify ALL text changes:
   - Page headers ✓
   - Navigation ✓
   - Buttons (View Details, Apply Now)
   - Filter labels
   - Form labels
   - Error messages
   - Success messages

## Files Modified So Far

✅ `frontend/src/components/SchemeCard.tsx` - Added language prop and translations
✅ `frontend/src/components/SchemeCardGrid.tsx` - Added language prop passthrough
✅ `frontend/src/pages/Schemes.tsx` - Passes language to SchemeCardGrid
✅ `frontend/src/pages/FraudCheck.tsx` - Full translation support
✅ `frontend/src/pages/Home.tsx` - Full translation support
✅ `frontend/src/pages/Education.tsx` - Full translation support

## Estimated Remaining Work

- FilterPanel: 30 minutes
- SearchBar: 10 minutes
- EmptyState: 10 minutes
- SchemeDetailDialog: 30 minutes
- Profile page: 1-2 hours (many form fields)
- Applications page: 30 minutes

**Total: ~3-4 hours of work**

## Note on Scheme Data

The actual scheme names, descriptions, and details will remain in English unless you:
1. Create translated JSON files for each language, OR
2. Implement dynamic translation using an API

This is a separate, larger effort beyond UI translation.
