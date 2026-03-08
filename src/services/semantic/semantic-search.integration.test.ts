import { SemanticSearchService, SemanticSearchRequest } from './semantic-search';
import { config } from '../../config';

/**
 * Integration tests for SemanticSearchService
 * These tests make real API calls to external services (Hugging Face, Pinecone, Groq)
 * 
 * To run these tests:
 * 1. Ensure PINECONE_API_KEY and GROQ_API_KEY are set in .env
 * 2. Ensure Pinecone index "scheme-index" exists with embeddings
 * 3. Run: npm test -- semantic-search.integration.test.ts
 */

describe('SemanticSearchService Integration Tests', () => {
  let service: SemanticSearchService;

  beforeAll(() => {
    // Skip tests if required environment variables are not set
    if (!config.pineconeApiKey || !config.groqApiKey) {
      console.warn('Skipping integration tests: Missing API keys');
    }
  });

  beforeEach(() => {
    service = new SemanticSearchService();
  });

  describe('search', () => {
    it('should perform end-to-end semantic search with real APIs', async () => {
      // Skip if API keys not configured
      if (!config.pineconeApiKey || !config.groqApiKey) {
        console.log('Skipping: API keys not configured');
        return;
      }

      const request: SemanticSearchRequest = {
        age: 35,
        income: 200000,
        gender: 'Female',
        caste: 'OBC',
        state: 'Maharashtra',
      };

      const result = await service.search(request);

      // Verify result structure
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);

      // If results exist, verify structure
      if (result.length > 0) {
        const firstResult = result[0];
        expect(firstResult).toHaveProperty('schemeId');
        expect(firstResult).toHaveProperty('name');
        expect(firstResult).toHaveProperty('slug');
        expect(firstResult).toHaveProperty('ministry');
        expect(firstResult).toHaveProperty('similarityScore');
        expect(firstResult).toHaveProperty('confidence');
        expect(firstResult).toHaveProperty('reasoning');

        // Verify score ranges
        expect(firstResult.similarityScore).toBeGreaterThanOrEqual(0);
        expect(firstResult.similarityScore).toBeLessThanOrEqual(1);
        expect(firstResult.confidence).toBeGreaterThanOrEqual(0);
        expect(firstResult.confidence).toBeLessThanOrEqual(1);

        // Verify reasoning is not empty
        expect(firstResult.reasoning.length).toBeGreaterThan(0);
      }
    }, 30000); // 30 second timeout for API calls

    it('should handle different user profiles', async () => {
      // Skip if API keys not configured
      if (!config.pineconeApiKey || !config.groqApiKey) {
        console.log('Skipping: API keys not configured');
        return;
      }

      const profiles: SemanticSearchRequest[] = [
        {
          age: 25,
          income: 100000,
          gender: 'Male',
          caste: 'SC',
          state: 'Uttar Pradesh',
        },
        {
          age: 60,
          income: 50000,
          gender: 'Female',
          caste: 'General',
          state: 'Karnataka',
        },
        {
          age: 40,
          income: 400000,
          gender: 'Other',
          caste: 'ST',
          state: 'Rajasthan',
        },
      ];

      for (const profile of profiles) {
        const result = await service.search(profile);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);

        // Each result should have valid structure
        result.forEach((scheme) => {
          expect(scheme.schemeId).toBeTruthy();
          expect(scheme.name).toBeTruthy();
          expect(scheme.confidence).toBeGreaterThanOrEqual(0);
          expect(scheme.confidence).toBeLessThanOrEqual(1);
        });
      }
    }, 60000); // 60 second timeout for multiple API calls

    it('should return results sorted by confidence', async () => {
      // Skip if API keys not configured
      if (!config.pineconeApiKey || !config.groqApiKey) {
        console.log('Skipping: API keys not configured');
        return;
      }

      const request: SemanticSearchRequest = {
        age: 30,
        income: 250000,
        gender: 'Male',
        caste: 'OBC',
        state: 'Maharashtra',
      };

      const result = await service.search(request);

      // Verify results are sorted by confidence (descending)
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].confidence).toBeGreaterThanOrEqual(result[i + 1].confidence);
        }
      }
    }, 30000);
  });
});
