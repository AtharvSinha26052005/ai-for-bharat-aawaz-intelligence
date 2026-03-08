import * as fc from 'fast-check';
import { userProfileSchema, validate, ValidationError } from './validation';

/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 2.2, 2.3**
 * 
 * Property 1: Fault Condition - Empty String Handling for Optional Fields
 * 
 * This test explores the bug condition where optional location fields (block, village, pincode)
 * are submitted as empty strings. The test encodes the EXPECTED behavior - validation should
 * pass and treat empty strings as undefined/null.
 * 
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code. The failure confirms the bug exists.
 * When the test fails, it will surface counterexamples showing validation errors for empty strings.
 * 
 * DO NOT attempt to fix the test or code when it fails - the failure is the expected outcome
 * that proves the bug exists.
 */
describe('Bug Condition Exploration - Empty String Handling for Optional Fields', () => {
  
  /**
   * Helper function to create a valid base profile with all required fields
   */
  const createValidBaseProfile = () => ({
    age: 25,
    incomeRange: '1L-3L',
    occupation: 'farmer',
    familyComposition: {
      adults: 2,
      children: 1,
      seniors: 0,
    },
    location: {
      state: 'Jharkhand',
      district: 'East Singhbhum',
    },
    primaryNeeds: ['agriculture', 'education'],
    preferredLanguage: 'hi',
    preferredMode: 'both',
    consentGiven: true,
  });

  /**
   * Test Case 1: Profile with empty string for pincode
   * 
   * This is the primary bug case - pincode has a pattern constraint (/^\d{6}$/)
   * that fails on empty strings even though the field is optional.
   */
  test('should accept empty string for optional pincode field', () => {
    const profileData = {
      ...createValidBaseProfile(),
      location: {
        ...createValidBaseProfile().location,
        pincode: '', // Empty string - should be treated as undefined/null
      },
    };

    // Expected behavior: validation should pass
    // Actual behavior on unfixed code: validation fails with "location.pincode must match pattern /^\d{6}$/"
    expect(() => validate(userProfileSchema, profileData)).not.toThrow();
    
    const result = validate<any>(userProfileSchema, profileData);
    // Empty string should be converted to undefined or accepted as-is
    expect(result.location.pincode === undefined || result.location.pincode === '').toBe(true);
  });

  /**
   * Test Case 2: Profile with empty strings for block and village
   * 
   * These fields don't have pattern constraints, so they might pass even on unfixed code.
   * Including them to test comprehensive empty string handling.
   */
  test('should accept empty strings for optional block and village fields', () => {
    const profileData = {
      ...createValidBaseProfile(),
      location: {
        ...createValidBaseProfile().location,
        block: '', // Empty string
        village: '', // Empty string
      },
    };

    // Expected behavior: validation should pass
    expect(() => validate(userProfileSchema, profileData)).not.toThrow();
    
    const result = validate<any>(userProfileSchema, profileData);
    expect(result.location.block === undefined || result.location.block === '').toBe(true);
    expect(result.location.village === undefined || result.location.village === '').toBe(true);
  });

  /**
   * Test Case 3: Profile with all optional location fields as empty strings
   * 
   * This tests the complete bug scenario - all optional fields submitted as empty strings.
   * This is what happens when a user leaves all optional fields blank in the form.
   */
  test('should accept empty strings for all optional location fields', () => {
    const profileData = {
      ...createValidBaseProfile(),
      location: {
        ...createValidBaseProfile().location,
        block: '', // Empty string
        village: '', // Empty string
        pincode: '', // Empty string - will fail on unfixed code
      },
    };

    // Expected behavior: validation should pass
    // Actual behavior on unfixed code: validation fails on pincode pattern
    expect(() => validate(userProfileSchema, profileData)).not.toThrow();
    
    const result = validate<any>(userProfileSchema, profileData);
    expect(result.location.block === undefined || result.location.block === '').toBe(true);
    expect(result.location.village === undefined || result.location.village === '').toBe(true);
    expect(result.location.pincode === undefined || result.location.pincode === '').toBe(true);
  });

  /**
   * Property-Based Test: Empty strings in optional fields should pass validation
   * 
   * This property test generates many variations of profiles with empty strings
   * in different combinations of optional fields to ensure comprehensive coverage.
   */
  test('property: validation should pass for any combination of empty strings in optional location fields', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary combinations of empty strings for optional fields
        fc.record({
          hasEmptyBlock: fc.boolean(),
          hasEmptyVillage: fc.boolean(),
          hasEmptyPincode: fc.boolean(),
        }),
        ({ hasEmptyBlock, hasEmptyVillage, hasEmptyPincode }) => {
          const profileData = {
            ...createValidBaseProfile(),
            location: {
              ...createValidBaseProfile().location,
              ...(hasEmptyBlock && { block: '' }),
              ...(hasEmptyVillage && { village: '' }),
              ...(hasEmptyPincode && { pincode: '' }),
            },
          };

          // Expected behavior: validation should always pass
          // Actual behavior on unfixed code: fails when hasEmptyPincode is true
          expect(() => validate(userProfileSchema, profileData)).not.toThrow();
          
          const result = validate<any>(userProfileSchema, profileData);
          
          // Verify empty strings are handled correctly
          if (hasEmptyBlock) {
            expect(result.location.block === undefined || result.location.block === '').toBe(true);
          }
          if (hasEmptyVillage) {
            expect(result.location.village === undefined || result.location.village === '').toBe(true);
          }
          if (hasEmptyPincode) {
            expect(result.location.pincode === undefined || result.location.pincode === '').toBe(true);
          }
        }
      ),
      { numRuns: 100 } // Run 100 test cases to explore different combinations
    );
  });

  /**
   * Baseline Test: Valid pincode should still pass validation
   * 
   * This ensures we're testing the right thing - valid pincodes should work.
   */
  test('should accept valid 6-digit pincode', () => {
    const profileData = {
      ...createValidBaseProfile(),
      location: {
        ...createValidBaseProfile().location,
        pincode: '831001', // Valid 6-digit pincode
      },
    };

    expect(() => validate(userProfileSchema, profileData)).not.toThrow();
    
    const result = validate<any>(userProfileSchema, profileData);
    expect(result.location.pincode).toBe('831001');
  });
});

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.3**
 * 
 * Property 2: Preservation - Required Field and Valid Data Validation
 * 
 * These tests verify that the fix doesn't break existing validation rules.
 * All current validation behavior for required fields, valid data, and invalid data
 * must remain unchanged after the fix.
 * 
 * IMPORTANT: These tests are run on UNFIXED code first to observe baseline behavior,
 * then run again after the fix to ensure no regressions.
 * 
 * EXPECTED OUTCOME: Tests PASS on both unfixed and fixed code (confirms no regressions).
 */
describe('Preservation Property Tests - Required Field and Valid Data Validation', () => {
  
  /**
   * Helper function to create a valid base profile with all required fields
   */
  const createValidBaseProfile = () => ({
    age: 25,
    incomeRange: '1L-3L',
    occupation: 'farmer',
    familyComposition: {
      adults: 2,
      children: 1,
      seniors: 0,
    },
    location: {
      state: 'Jharkhand',
      district: 'East Singhbhum',
    },
    primaryNeeds: ['agriculture', 'education'],
    preferredLanguage: 'hi',
    preferredMode: 'both',
    consentGiven: true,
  });

  /**
   * Test: Required field validation continues to reject missing required fields
   */
  describe('Required Field Validation Preservation', () => {
    test('should reject profile missing age field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('required'),
            }),
          ])
        );
      }
    });

    test('should reject profile missing incomeRange field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'incomeRange',
              message: expect.stringContaining('required'),
            }),
          ])
        );
      }
    });

    test('should reject profile missing occupation field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        occupation: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject profile missing location.state field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          district: 'East Singhbhum',
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'location.state',
              message: expect.stringContaining('required'),
            }),
          ])
        );
      }
    });

    test('should reject profile missing location.district field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          state: 'Jharkhand',
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'location.district',
              message: expect.stringContaining('required'),
            }),
          ])
        );
      }
    });

    test('should reject profile missing primaryNeeds field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        primaryNeeds: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject profile missing preferredLanguage field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        preferredLanguage: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject profile missing preferredMode field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        preferredMode: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject profile missing consentGiven field', () => {
      const profileData = {
        ...createValidBaseProfile(),
        consentGiven: undefined,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });
  });

  /**
   * Test: Age validation continues to enforce 1-120 range
   */
  describe('Age Range Validation Preservation', () => {
    test('should reject age below 1', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: 0,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('must be greater than or equal to 1'),
            }),
          ])
        );
      }
    });

    test('should reject age above 120', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: 121,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('must be less than or equal to 120'),
            }),
          ])
        );
      }
    });

    test('should reject negative age', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: -5,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject non-integer age', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: 25.5,
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('must be an integer'),
            }),
          ])
        );
      }
    });

    test('should accept valid age at lower boundary (1)', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: 1,
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.age).toBe(1);
    });

    test('should accept valid age at upper boundary (120)', () => {
      const profileData = {
        ...createValidBaseProfile(),
        age: 120,
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.age).toBe(120);
    });
  });

  /**
   * Test: Income range validation continues to enforce valid enum values
   */
  describe('Income Range Validation Preservation', () => {
    test('should reject invalid income range value', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: 'invalid-range',
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'incomeRange',
              message: expect.stringContaining('must be one of'),
            }),
          ])
        );
      }
    });

    test('should accept valid income range: below-1L', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: 'below-1L',
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.incomeRange).toBe('below-1L');
    });

    test('should accept valid income range: 1L-3L', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: '1L-3L',
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.incomeRange).toBe('1L-3L');
    });

    test('should accept valid income range: 3L-5L', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: '3L-5L',
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.incomeRange).toBe('3L-5L');
    });

    test('should accept valid income range: above-5L', () => {
      const profileData = {
        ...createValidBaseProfile(),
        incomeRange: 'above-5L',
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.incomeRange).toBe('above-5L');
    });
  });

  /**
   * Test: Pincode pattern validation continues to enforce 6-digit format when non-empty value is provided
   */
  describe('Pincode Pattern Validation Preservation', () => {
    test('should reject pincode with less than 6 digits', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: '12345', // 5 digits
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
      
      try {
        validate(userProfileSchema, profileData);
      } catch (error: any) {
        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'location.pincode',
              message: expect.stringContaining('fails to match'),
            }),
          ])
        );
      }
    });

    test('should reject pincode with more than 6 digits', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: '1234567', // 7 digits
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject pincode with non-numeric characters', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: 'abcdef', // Non-numeric
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject pincode with mixed alphanumeric characters', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: '12ab34', // Mixed
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should reject pincode with special characters', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: '123-456', // With hyphen
        },
      };

      expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
    });

    test('should accept valid 6-digit pincode', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          pincode: '831001', // Valid 6-digit pincode
        },
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.location.pincode).toBe('831001');
    });
  });

  /**
   * Test: Valid profile submissions with all fields properly filled continue to work
   */
  describe('Complete Valid Profile Preservation', () => {
    test('should accept complete valid profile with all required fields', () => {
      const profileData = createValidBaseProfile();

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.age).toBe(25);
      expect(result.incomeRange).toBe('1L-3L');
      expect(result.occupation).toBe('farmer');
      expect(result.location.state).toBe('Jharkhand');
      expect(result.location.district).toBe('East Singhbhum');
    });

    test('should accept valid profile with optional fields filled', () => {
      const profileData = {
        ...createValidBaseProfile(),
        location: {
          ...createValidBaseProfile().location,
          block: 'Potka',
          village: 'Musabani',
          pincode: '831001',
        },
        phoneNumber: '+919876543210',
      };

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.location.block).toBe('Potka');
      expect(result.location.village).toBe('Musabani');
      expect(result.location.pincode).toBe('831001');
      expect(result.phoneNumber).toBe('+919876543210');
    });

    test('should accept valid profile with optional fields omitted', () => {
      const profileData = createValidBaseProfile();
      // Optional fields (block, village, pincode, phoneNumber) are not included

      expect(() => validate(userProfileSchema, profileData)).not.toThrow();
      
      const result = validate<any>(userProfileSchema, profileData);
      expect(result.location.block).toBeUndefined();
      expect(result.location.village).toBeUndefined();
      expect(result.location.pincode).toBeUndefined();
      expect(result.phoneNumber).toBeUndefined();
    });
  });

  /**
   * Property-Based Test: Required field validation preservation
   * 
   * This property test generates many variations of profiles with missing required fields
   * to ensure validation continues to reject them after the fix.
   */
  test('property: validation should reject profiles with any missing required field', () => {
    fc.assert(
      fc.property(
        fc.record({
          omitAge: fc.boolean(),
          omitIncomeRange: fc.boolean(),
          omitOccupation: fc.boolean(),
          omitState: fc.boolean(),
          omitDistrict: fc.boolean(),
          omitPrimaryNeeds: fc.boolean(),
          omitPreferredLanguage: fc.boolean(),
          omitPreferredMode: fc.boolean(),
          omitConsentGiven: fc.boolean(),
        }),
        (omissions) => {
          // Skip if no fields are omitted (valid profile)
          if (!Object.values(omissions).some(v => v)) {
            return true;
          }

          const baseProfile = createValidBaseProfile();
          const profileData: any = { ...baseProfile };

          // Omit fields based on the generated flags
          if (omissions.omitAge) delete profileData.age;
          if (omissions.omitIncomeRange) delete profileData.incomeRange;
          if (omissions.omitOccupation) delete profileData.occupation;
          if (omissions.omitPrimaryNeeds) delete profileData.primaryNeeds;
          if (omissions.omitPreferredLanguage) delete profileData.preferredLanguage;
          if (omissions.omitPreferredMode) delete profileData.preferredMode;
          if (omissions.omitConsentGiven) delete profileData.consentGiven;
          
          if (omissions.omitState || omissions.omitDistrict) {
            profileData.location = { ...baseProfile.location };
            if (omissions.omitState) delete profileData.location.state;
            if (omissions.omitDistrict) delete profileData.location.district;
          }

          // Validation should fail for profiles with missing required fields
          expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });

  /**
   * Property-Based Test: Age range validation preservation
   * 
   * This property test generates many invalid age values to ensure validation
   * continues to reject them after the fix.
   */
  test('property: validation should reject profiles with invalid age values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }), // Age <= 0
          fc.integer({ min: 121 }), // Age > 120
          fc.double({ min: 1, max: 120, noNaN: true }).filter(n => !Number.isInteger(n)), // Non-integer
        ),
        (invalidAge) => {
          const profileData = {
            ...createValidBaseProfile(),
            age: invalidAge,
          };

          // Validation should fail for invalid age values
          expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });

  /**
   * Property-Based Test: Valid age range preservation
   * 
   * This property test generates many valid age values to ensure validation
   * continues to accept them after the fix.
   */
  test('property: validation should accept profiles with valid age values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 120 }), // Valid age range
        (validAge) => {
          const profileData = {
            ...createValidBaseProfile(),
            age: validAge,
          };

          // Validation should pass for valid age values
          expect(() => validate(userProfileSchema, profileData)).not.toThrow();
          
          const result = validate<any>(userProfileSchema, profileData);
          expect(result.age).toBe(validAge);
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });

  /**
   * Property-Based Test: Pincode pattern validation preservation
   * 
   * This property test generates many invalid pincode patterns to ensure validation
   * continues to reject them after the fix.
   */
  test('property: validation should reject profiles with invalid pincode patterns', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }).map(arr => arr.join('')), // Too short
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 10 }).map(arr => arr.join('')), // Too long
          fc.string({ minLength: 6, maxLength: 6 }).filter(s => !/^\d{6}$/.test(s)), // 6 chars but not all digits
        ),
        (invalidPincode) => {
          const profileData = {
            ...createValidBaseProfile(),
            location: {
              ...createValidBaseProfile().location,
              pincode: invalidPincode,
            },
          };

          // Validation should fail for invalid pincode patterns
          expect(() => validate(userProfileSchema, profileData)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });

  /**
   * Property-Based Test: Valid pincode pattern preservation
   * 
   * This property test generates many valid 6-digit pincodes to ensure validation
   * continues to accept them after the fix.
   */
  test('property: validation should accept profiles with valid 6-digit pincodes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 6, maxLength: 6 }).map(arr => arr.join('')), // Valid 6-digit pincode
        (validPincode) => {
          const profileData = {
            ...createValidBaseProfile(),
            location: {
              ...createValidBaseProfile().location,
              pincode: validPincode,
            },
          };

          // Validation should pass for valid pincode patterns
          expect(() => validate(userProfileSchema, profileData)).not.toThrow();
          
          const result = validate<any>(userProfileSchema, profileData);
          expect(result.location.pincode).toBe(validPincode);
        }
      ),
      { numRuns: 100 } // Run 100 test cases
    );
  });
});
