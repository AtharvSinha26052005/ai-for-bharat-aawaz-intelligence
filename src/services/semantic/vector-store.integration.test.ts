import { vectorStoreService, VectorStoreService } from './vector-store';
import { ExternalServiceError } from '../../utils/errors';

/**
 * Integration tests for VectorStoreService
 * These tests verify the service works with the actual Pinecone API
 * 
 * Note: These tests require:
 * - PINECONE_API_KEY environment variable to be set
 * - Pinecone index "scheme-index" to exist with 384 dimensions
 * - Index to contain at least some scheme embeddings
 * 
 * Run with: npm test -- vector-store.integration.test.ts
 */

describe('VectorStoreService Integration Tests', () => {
  // Skip tests if Pinecone API key is not configured
  const skipTests = !process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'test-api-key';

  if (skipTests) {
    it.skip('Skipping integration tests - PINECONE_API_KEY not configured', () => {});
    return;
  }

  describe('search with real Pinecone connection', () => {
    it('should successfully query Pinecone index', async () => {
      // Create a sample query vector (384 dimensions)
      // This is a normalized random vector for testing
      const queryVector = new Array(384).fill(0).map(() => Math.random() * 2 - 1);
      
      // Normalize the vector
      const magnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = queryVector.map(val => val / magnitude);

      const results = await vectorStoreService.search(normalizedVector, 5);

      // Verify results structure
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Verify first result has expected structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('metadata');
      
      // Verify metadata structure
      expect(firstResult.metadata).toHaveProperty('name');
      expect(firstResult.metadata).toHaveProperty('slug');
      expect(firstResult.metadata).toHaveProperty('ministry');

      // Verify scores are in valid range [0, 1]
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });

      // Verify results are sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    }, 15000); // 15 second timeout for network call

    it('should handle different topK values', async () => {
      const queryVector = new Array(384).fill(0).map(() => Math.random() * 2 - 1);
      const magnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = queryVector.map(val => val / magnitude);

      // Test with topK = 1
      const results1 = await vectorStoreService.search(normalizedVector, 1);
      expect(results1.length).toBe(1);

      // Test with topK = 10
      const results10 = await vectorStoreService.search(normalizedVector, 10);
      expect(results10.length).toBeGreaterThan(0);
      expect(results10.length).toBeLessThanOrEqual(10);

      // Test with topK = 20
      const results20 = await vectorStoreService.search(normalizedVector, 20);
      expect(results20.length).toBeGreaterThan(0);
      expect(results20.length).toBeLessThanOrEqual(20);
    }, 20000);
  });

  describe('getIndexStats with real Pinecone connection', () => {
    it('should retrieve index statistics', async () => {
      const stats = await vectorStoreService.getIndexStats();

      expect(stats).toHaveProperty('vectorCount');
      expect(stats).toHaveProperty('dimension');
      
      // Verify vector count is reasonable (should have ~1000 schemes)
      expect(stats.vectorCount).toBeGreaterThan(0);
      expect(stats.vectorCount).toBeLessThan(10000);

      // Verify dimensions match expected (384 for all-MiniLM-L6-v2)
      expect(stats.dimension).toBe(384);
    }, 10000);
  });

  describe('error handling with real connection', () => {
    it('should handle invalid vector dimensions', async () => {
      const invalidVector = new Array(100).fill(0.1); // Wrong dimensions

      await expect(
        vectorStoreService.search(invalidVector, 10)
      ).rejects.toThrow('Query vector dimensions mismatch');
    });

    it('should handle invalid topK values', async () => {
      const validVector = new Array(384).fill(0.1);

      await expect(
        vectorStoreService.search(validVector, 0)
      ).rejects.toThrow('topK must be between 1 and 100');

      await expect(
        vectorStoreService.search(validVector, 101)
      ).rejects.toThrow('topK must be between 1 and 100');
    });
  });

  describe('connection pooling', () => {
    it('should reuse connection across multiple queries', async () => {
      const queryVector = new Array(384).fill(0).map(() => Math.random() * 2 - 1);
      const magnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
      const normalizedVector = queryVector.map(val => val / magnitude);

      // Make multiple queries
      const results1 = await vectorStoreService.search(normalizedVector, 5);
      const results2 = await vectorStoreService.search(normalizedVector, 5);
      const results3 = await vectorStoreService.search(normalizedVector, 5);

      // All queries should succeed
      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);

      // Results should be identical (same query vector)
      expect(results1[0].id).toBe(results2[0].id);
      expect(results2[0].id).toBe(results3[0].id);
    }, 20000);
  });
});
