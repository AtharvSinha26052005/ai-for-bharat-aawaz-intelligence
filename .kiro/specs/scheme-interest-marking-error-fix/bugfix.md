# Bugfix Requirements Document

## Introduction

When a user attempts to mark a government scheme as interested in the rural-digital-rights service, the operation fails silently for all schemes. The error occurs in the database repository layer when handling the conflict resolution for duplicate scheme entries. Specifically, when `scheme_slug` is `null` or empty, the fallback query to retrieve the existing scheme ID fails because SQL's `NULL = NULL` comparison always returns false, causing the query to return no results and throwing an error when trying to access the ID property.

This bug affects all users attempting to mark any scheme as interested, resulting in a complete failure of the interest-marking feature with no visible feedback to the user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user marks a scheme as interested AND the scheme_slug is null or empty AND a duplicate entry conflict occurs THEN the system crashes with an error attempting to access the 'id' property of undefined (because the fallback query returns no rows)

1.2 WHEN the fallback query executes with scheme_slug as null THEN the system fails to find the existing record because the WHERE clause uses `scheme_slug = $2` which evaluates to false when comparing NULL values

1.3 WHEN the error occurs THEN the system logs "Error marking scheme as interested" but returns a generic 500 error to the client with no specific error details

1.4 WHEN the error occurs THEN the user sees no feedback in the UI (silent failure)

### Expected Behavior (Correct)

2.1 WHEN a user marks a scheme as interested AND the scheme_slug is null or empty AND a duplicate entry conflict occurs THEN the system SHALL successfully retrieve the existing scheme ID using a NULL-safe comparison

2.2 WHEN the fallback query executes with scheme_slug as null THEN the system SHALL use `scheme_slug IS NULL` in the WHERE clause to correctly match existing records with null scheme_slug values

2.3 WHEN a duplicate scheme is detected THEN the system SHALL return the existing scheme ID with `already_exists: true` without throwing an error

2.4 WHEN the operation completes successfully THEN the system SHALL return a 201 status with the scheme ID and appropriate success message

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user marks a scheme as interested AND the scheme_slug has a valid non-null value AND no duplicate exists THEN the system SHALL CONTINUE TO insert the new record and return the new ID with `already_exists: false`

3.2 WHEN a user marks a scheme as interested AND the scheme_slug has a valid non-null value AND a duplicate exists THEN the system SHALL CONTINUE TO skip the insert and return the existing ID with `already_exists: true`

3.3 WHEN the insert operation succeeds on the first attempt THEN the system SHALL CONTINUE TO return the newly created ID from the RETURNING clause without executing the fallback query

3.4 WHEN validation fails due to missing required fields (profile_id or scheme_name) THEN the system SHALL CONTINUE TO return a 400 error with appropriate error message
