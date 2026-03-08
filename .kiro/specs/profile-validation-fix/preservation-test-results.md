# Preservation Property Test Results

## Test Execution Date
Task 2 completed - Preservation property tests written and executed on UNFIXED code

## Test Summary

### Overall Results
- **Total Tests**: 39 tests
- **Preservation Tests Passed**: 35 ✅
- **Bug Exploration Tests Failed**: 4 ❌ (Expected - confirms bug exists)

## Preservation Tests - PASSED ✅

All preservation tests passed on the unfixed code, confirming the baseline behavior that must be preserved after the fix:

### 1. Required Field Validation Preservation (9 tests)
- ✅ Rejects profile missing age field
- ✅ Rejects profile missing incomeRange field
- ✅ Rejects profile missing occupation field
- ✅ Rejects profile missing location.state field
- ✅ Rejects profile missing location.district field
- ✅ Rejects profile missing primaryNeeds field
- ✅ Rejects profile missing preferredLanguage field
- ✅ Rejects profile missing preferredMode field
- ✅ Rejects profile missing consentGiven field

### 2. Age Range Validation Preservation (6 tests)
- ✅ Rejects age below 1
- ✅ Rejects age above 120
- ✅ Rejects negative age
- ✅ Rejects non-integer age
- ✅ Accepts valid age at lower boundary (1)
- ✅ Accepts valid age at upper boundary (120)

### 3. Income Range Validation Preservation (5 tests)
- ✅ Rejects invalid income range value
- ✅ Accepts valid income range: below-1L
- ✅ Accepts valid income range: 1L-3L
- ✅ Accepts valid income range: 3L-5L
- ✅ Accepts valid income range: above-5L

### 4. Pincode Pattern Validation Preservation (6 tests)
- ✅ Rejects pincode with less than 6 digits
- ✅ Rejects pincode with more than 6 digits
- ✅ Rejects pincode with non-numeric characters
- ✅ Rejects pincode with mixed alphanumeric characters
- ✅ Rejects pincode with special characters
- ✅ Accepts valid 6-digit pincode

### 5. Complete Valid Profile Preservation (3 tests)
- ✅ Accepts complete valid profile with all required fields
- ✅ Accepts valid profile with optional fields filled
- ✅ Accepts valid profile with optional fields omitted

### 6. Property-Based Tests (5 tests)
- ✅ Property: Validation rejects profiles with any missing required field (100 test cases)
- ✅ Property: Validation rejects profiles with invalid age values (100 test cases)
- ✅ Property: Validation accepts profiles with valid age values (100 test cases)
- ✅ Property: Validation rejects profiles with invalid pincode patterns (100 test cases)
- ✅ Property: Validation accepts profiles with valid 6-digit pincodes (100 test cases)

## Bug Exploration Tests - FAILED ❌ (Expected)

These tests are EXPECTED to fail on unfixed code. The failures confirm the bug exists:

### 1. Empty String for Pincode Field
- ❌ **FAILED** - Validation error: "location.pincode must match pattern /^\d{6}$/"
- **Root Cause**: Joi applies pattern validation to empty strings even though field is optional

### 2. Empty Strings for Block and Village Fields
- ❌ **FAILED** - Validation error on empty strings
- **Root Cause**: Joi doesn't allow empty strings by default for optional fields

### 3. All Optional Location Fields as Empty Strings
- ❌ **FAILED** - Validation error on pincode pattern
- **Root Cause**: Same as above - pattern validation applied to empty string

### 4. Property-Based Test: Any Combination of Empty Strings
- ❌ **FAILED** - Counterexample found: `{"hasEmptyBlock":true,"hasEmptyVillage":false,"hasEmptyPincode":false}`
- **Root Cause**: Empty strings in any optional location field cause validation failures

## Conclusion

✅ **Task 2 Complete**: All preservation property tests have been written and executed on unfixed code.

**Key Findings:**
1. **Baseline behavior confirmed**: All 35 preservation tests pass, establishing the validation behavior that must remain unchanged after the fix
2. **Bug confirmed**: All 4 bug exploration tests fail as expected, proving the bug exists
3. **Root cause validated**: Empty strings in optional location fields (block, village, pincode) cause validation failures because:
   - Joi applies pattern constraints to empty strings
   - Joi doesn't allow empty strings by default for optional fields

**Next Steps:**
- Task 3: Implement the fix by adding `.allow('')` or `.empty('')` to optional location fields in the validation schema
- Re-run bug exploration tests to verify they pass after the fix
- Re-run preservation tests to verify no regressions

## Test Coverage

The preservation property tests provide comprehensive coverage:
- **Unit tests**: 29 specific test cases covering edge cases and boundaries
- **Property-based tests**: 5 tests with 100 runs each = 500 generated test cases
- **Total test cases**: 529 test cases validating preservation requirements

This ensures strong guarantees that the fix will not introduce regressions.
