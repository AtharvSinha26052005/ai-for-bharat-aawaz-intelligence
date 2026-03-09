import * as fc from 'fast-check';
import { InterestedSchemesRepository } from './interested-schemes-repository';
import { InterestedSchemeCreateRequest } from '../types/interested-schemes';
import { db } from '../db/connection';

describe('InterestedSchemesRepository - Bug Condition Exploration', () => {
  let repository: InterestedSchemesRepository;

  beforeAll(() => {
    repository = new InterestedSchemesRepository();
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * Property 1: Fault Condition - NULL-Safe Duplicate Detection
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * 
   * This test encodes the expected behavior:
   * - When scheme_slug is null or empty AND a duplicate entry exists
   * - The insert() method SHOULD successfully retrieve the existing scheme ID
   * - The result SHOULD be a valid UUID string
   * - No error SHOULD be thrown
   * - The result SHOULD match the existing record ID
   * 
   * EXPECTED OUTCOME on UNFIXED code:
   * - Test FAILS with "Cannot read property 'id' of undefined"
   * - This proves the bug exists (NULL comparison fails in SQL)
   */
  describe('Property 1: NULL-Safe Duplicate Detection (Bug Condition)', () => {
    it('should retrieve existing ID when inserting duplicate with null scheme_slug', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data with null or empty scheme_slug
          fc.record({
            profile_id: fc.uuid(),
            scheme_name: fc.string({ minLength: 1, maxLength: 100 }),
            scheme_slug: fc.constantFrom(null, undefined, ''), // Focus on null/empty cases
            scheme_description: fc.option(fc.string({ maxLength: 500 })),
            scheme_benefits: fc.option(fc.string({ maxLength: 500 })),
            scheme_ministry: fc.option(fc.string({ maxLength: 100 })),
            scheme_apply_link: fc.option(fc.webUrl()),
          }),
          async (schemeData) => {
            // Clean up before test
            await db.query(
              'DELETE FROM interested_schemes WHERE profile_id = $1',
              [schemeData.profile_id]
            );

            // First insert - should succeed
            const firstId = await repository.insert(schemeData as InterestedSchemeCreateRequest);
            
            // Verify first insert succeeded
            expect(firstId).toBeDefined();
            expect(typeof firstId).toBe('string');
            expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

            // Second insert - duplicate with null/empty scheme_slug
            // EXPECTED: Should return existing ID without error
            // ACTUAL on UNFIXED code: Throws "Cannot read property 'id' of undefined"
            const secondId = await repository.insert(schemeData as InterestedSchemeCreateRequest);

            // Assertions for expected behavior
            expect(secondId).toBeDefined();
            expect(typeof secondId).toBe('string');
            expect(secondId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(secondId).toBe(firstId); // Should return the same ID

            // Clean up after test
            await db.query(
              'DELETE FROM interested_schemes WHERE profile_id = $1',
              [schemeData.profile_id]
            );
          }
        ),
        {
          numRuns: 10, // Run 10 test cases to surface counterexamples
          verbose: true, // Show counterexamples when test fails
        }
      );
    });

    it('should handle empty string scheme_slug as null in duplicate detection', async () => {
      // Specific test case: empty string should be treated as null
      const testProfileId = '00000000-0000-0000-0000-000000000001';
      const schemeData: InterestedSchemeCreateRequest = {
        profile_id: testProfileId,
        scheme_name: 'Test Scheme with Empty Slug',
        scheme_slug: '', // Empty string
      };

      // Clean up before test
      await db.query(
        'DELETE FROM interested_schemes WHERE profile_id = $1',
        [schemeData.profile_id]
      );

      try {
        // First insert
        const firstId = await repository.insert(schemeData);
        expect(firstId).toBeDefined();

        // Second insert with empty string (should be treated as null)
        // EXPECTED: Should return existing ID
        // ACTUAL on UNFIXED code: Throws error
        const secondId = await repository.insert(schemeData);
        
        expect(secondId).toBeDefined();
        expect(secondId).toBe(firstId);
      } finally {
        // Clean up
        await db.query(
          'DELETE FROM interested_schemes WHERE profile_id = $1',
          [schemeData.profile_id]
        );
      }
    });

    it('should handle null scheme_slug in duplicate detection', async () => {
      // Specific test case: explicit null scheme_slug
      const testProfileId = '00000000-0000-0000-0000-000000000002';
      const schemeData: InterestedSchemeCreateRequest = {
        profile_id: testProfileId,
        scheme_name: 'Test Scheme with Null Slug',
        scheme_slug: undefined, // Will be normalized to null
      };

      // Clean up before test
      await db.query(
        'DELETE FROM interested_schemes WHERE profile_id = $1',
        [schemeData.profile_id]
      );

      try {
        // First insert
        const firstId = await repository.insert(schemeData);
        expect(firstId).toBeDefined();

        // Check database state after first insert
        const afterFirst = await db.query(
          'SELECT COUNT(*) as count FROM interested_schemes WHERE profile_id = $1',
          [testProfileId]
        );
        console.log('After first insert, count:', afterFirst.rows[0].count);

        // Second insert with null scheme_slug
        // EXPECTED: Should return existing ID (only 1 record in DB)
        // ACTUAL on UNFIXED code: Creates a NEW record (2 records in DB) because NULL != NULL in UNIQUE constraint
        const secondId = await repository.insert(schemeData);
        
        // Check database state after second insert
        const afterSecond = await db.query(
          'SELECT COUNT(*) as count FROM interested_schemes WHERE profile_id = $1',
          [testProfileId]
        );
        console.log('After second insert, count:', afterSecond.rows[0].count);
        console.log('First ID:', firstId);
        console.log('Second ID:', secondId);

        expect(secondId).toBeDefined();
        expect(secondId).toBe(firstId);
        expect(afterSecond.rows[0].count).toBe('1'); // Should still be 1 record
      } finally {
        // Clean up
        await db.query(
          'DELETE FROM interested_schemes WHERE profile_id = $1',
          [schemeData.profile_id]
        );
      }
    });
  });
});
