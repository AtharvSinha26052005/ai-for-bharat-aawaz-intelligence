# Scheme Interest Marking Error Fix - Bugfix Design

## Overview

This bugfix addresses a critical NULL comparison error in the `InterestedSchemesRepository.insert()` method that causes the scheme interest marking feature to fail completely. When a scheme has a null or empty `scheme_slug` and a duplicate entry conflict occurs, the fallback query uses `scheme_slug = $2` which fails for NULL values because SQL's `NULL = NULL` comparison always returns false. This causes the query to return no results, leading to a crash when attempting to access the `id` property of undefined.

The fix will implement NULL-safe SQL comparison logic using `IS NULL` for null values and `= $2` for non-null values, ensuring the fallback query correctly retrieves existing scheme IDs regardless of whether `scheme_slug` is null or has a value.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `scheme_slug` is null or empty AND a duplicate entry conflict occurs in the database
- **Property (P)**: The desired behavior - the system successfully retrieves the existing scheme ID using NULL-safe comparison and returns it with `already_exists: true`
- **Preservation**: All existing behavior for non-null `scheme_slug` values and successful first-attempt inserts must remain unchanged
- **InterestedSchemesRepository.insert()**: The method in `src/repositories/interested-schemes-repository.ts` that inserts scheme interest records into the database
- **ON CONFLICT DO NOTHING**: PostgreSQL clause that prevents duplicate inserts but returns no rows when a conflict occurs
- **Fallback Query**: The secondary SELECT query executed when the INSERT returns no rows due to a conflict

## Bug Details

### Fault Condition

The bug manifests when a user marks a scheme as interested, the `scheme_slug` is null or empty, and a duplicate entry already exists in the database. The `insert()` method's fallback query uses `WHERE profile_id = $1 AND scheme_slug = $2`, which fails to match existing records when `scheme_slug` is null because SQL's `NULL = NULL` comparison evaluates to false (unknown), not true.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type InterestedSchemeCreateRequest
  OUTPUT: boolean
  
  RETURN (input.scheme_slug IS NULL OR input.scheme_slug == '')
         AND existingRecordExists(input.profile_id, input.scheme_slug)
         AND insertReturnsNoRows(input)
END FUNCTION
```

### Examples

- **Example 1**: User marks "PM-KISAN" scheme (scheme_slug = null) as interested for the first time → Works correctly (insert succeeds)
- **Example 2**: Same user marks "PM-KISAN" scheme (scheme_slug = null) as interested again → Crashes with "Cannot read property 'id' of undefined"
- **Example 3**: User marks "pradhan-mantri-awas-yojana" scheme (scheme_slug = "pmay") as interested twice → Works correctly (fallback query finds existing record)
- **Edge Case**: User marks scheme with empty string scheme_slug ('') twice → Crashes (empty string is coerced to null in database)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Schemes with non-null `scheme_slug` values must continue to work exactly as before for both new inserts and duplicate detection
- Successful first-attempt inserts (no conflict) must continue to return the new ID from the RETURNING clause without executing the fallback query
- Validation failures for missing required fields must continue to return 400 errors
- The `exists()`, `findByProfileId()`, and `deleteById()` methods must remain completely unaffected

**Scope:**
All inputs that do NOT involve null or empty `scheme_slug` values with duplicate conflicts should be completely unaffected by this fix. This includes:
- New scheme inserts (first time marking interest)
- Schemes with valid non-null `scheme_slug` values
- All other repository methods (exists, findByProfileId, deleteById)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **SQL NULL Comparison Semantics**: The fallback query uses `WHERE profile_id = $1 AND scheme_slug = $2`, which fails when `$2` is null because SQL's `NULL = NULL` evaluates to unknown (false), not true. This is standard SQL behavior - NULL represents an unknown value, so comparing two unknowns cannot be determined to be equal.

2. **Missing NULL-Safe Logic**: The code does not account for the special case where `scheme_slug` is null. It needs conditional SQL logic: `scheme_slug IS NULL` when the parameter is null, and `scheme_slug = $2` when the parameter has a value.

3. **Unsafe Property Access**: The code assumes `existingResult.rows[0]` exists without checking, causing a crash when the query returns no rows due to the NULL comparison failure.

## Correctness Properties

Property 1: Fault Condition - NULL-Safe Duplicate Detection

_For any_ input where `scheme_slug` is null or empty and a duplicate entry conflict occurs, the fixed `insert()` method SHALL successfully retrieve the existing scheme ID using NULL-safe SQL comparison (`IS NULL` for null values) and return it without throwing an error.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-NULL Scheme Slug Behavior

_For any_ input where `scheme_slug` has a non-null, non-empty value, the fixed `insert()` method SHALL produce exactly the same behavior as the original code, preserving all existing functionality for schemes with valid slug values.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `src/repositories/interested-schemes-repository.ts`

**Function**: `insert()`

**Specific Changes**:

1. **Replace Static Fallback Query**: Replace the hardcoded `WHERE profile_id = $1 AND scheme_slug = $2` with conditional NULL-safe logic

2. **Implement Conditional WHERE Clause**: Use dynamic SQL construction:
   - When `scheme_slug` is null or empty: `WHERE profile_id = $1 AND scheme_slug IS NULL`
   - When `scheme_slug` has a value: `WHERE profile_id = $1 AND scheme_slug = $2`

3. **Add Safety Check**: Add a check for `existingResult.rows.length > 0` before accessing `existingResult.rows[0].id` to prevent crashes if the query still returns no results

4. **Normalize Empty Strings**: Ensure empty strings are treated as null consistently (already done with `scheme.scheme_slug || null`)

5. **Consider Fixing exists() Method**: The `exists()` method likely has the same NULL comparison bug and should be fixed using the same approach

### Implementation Approach

```typescript
// Current (buggy) code:
const existingQuery = `
  SELECT id FROM interested_schemes 
  WHERE profile_id = $1 AND scheme_slug = $2
`;
const existingResult = await db.query(existingQuery, [scheme.profile_id, scheme.scheme_slug]);
return existingResult.rows[0].id;

// Fixed code:
const normalizedSlug = scheme.scheme_slug || null;
const existingQuery = normalizedSlug === null
  ? `SELECT id FROM interested_schemes 
     WHERE profile_id = $1 AND scheme_slug IS NULL`
  : `SELECT id FROM interested_schemes 
     WHERE profile_id = $1 AND scheme_slug = $2`;

const existingParams = normalizedSlug === null 
  ? [scheme.profile_id] 
  : [scheme.profile_id, normalizedSlug];

const existingResult = await db.query(existingQuery, existingParams);

if (existingResult.rows.length === 0) {
  throw new Error('Failed to retrieve existing scheme ID after conflict');
}

return existingResult.rows[0].id;
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the NULL comparison issue is the root cause.

**Test Plan**: Write tests that attempt to mark the same scheme (with null scheme_slug) as interested twice. Run these tests on the UNFIXED code to observe the crash and confirm the root cause.

**Test Cases**:
1. **NULL Slug Duplicate Test**: Insert scheme with null scheme_slug twice (will fail on unfixed code with "Cannot read property 'id' of undefined")
2. **Empty String Slug Duplicate Test**: Insert scheme with empty string scheme_slug twice (will fail on unfixed code - empty string becomes null)
3. **Database State Verification**: Query database directly to confirm duplicate record exists but fallback query returns no rows
4. **Error Message Verification**: Confirm error occurs at `existingResult.rows[0].id` access point

**Expected Counterexamples**:
- TypeError: Cannot read property 'id' of undefined
- Fallback query returns 0 rows when duplicate exists with null scheme_slug
- Root cause confirmed: SQL `NULL = NULL` comparison returns false

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (null scheme_slug + duplicate), the fixed function successfully retrieves the existing ID.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := insert_fixed(input)
  ASSERT result IS valid UUID string
  ASSERT no error thrown
  ASSERT result matches existing record ID in database
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT insert_original(input) = insert_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-null scheme_slug values and new inserts, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Non-NULL Slug Preservation**: Verify schemes with valid scheme_slug values continue to work for both new inserts and duplicates
2. **First Insert Preservation**: Verify new scheme inserts (no conflict) continue to return new ID without executing fallback query
3. **Other Methods Preservation**: Verify exists(), findByProfileId(), and deleteById() continue to work unchanged
4. **Validation Preservation**: Verify missing required fields still return appropriate errors

### Unit Tests

- Test NULL scheme_slug duplicate detection (bug condition)
- Test empty string scheme_slug duplicate detection (coerced to null)
- Test non-null scheme_slug duplicate detection (preservation)
- Test new insert with null scheme_slug (no conflict)
- Test new insert with non-null scheme_slug (no conflict)
- Test error handling when fallback query returns no rows (safety check)

### Property-Based Tests

- Generate random scheme data with various scheme_slug values (null, empty, valid strings) and verify correct duplicate detection
- Generate random profile_id and scheme combinations and verify preservation of existing behavior for non-null slugs
- Test that all valid scheme_slug values continue to work correctly across many scenarios

### Integration Tests

- Test full flow: mark scheme as interested twice with null scheme_slug, verify second call returns existing ID
- Test full flow: mark scheme as interested twice with valid scheme_slug, verify second call returns existing ID
- Test service layer response includes correct `already_exists` flag
- Test that exists() method also handles null scheme_slug correctly (may need separate fix)
