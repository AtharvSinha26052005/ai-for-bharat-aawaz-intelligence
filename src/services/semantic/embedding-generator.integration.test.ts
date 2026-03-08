/**
 * Integration tests for EmbeddingGeneratorService
 * These tests make real API calls to Hugging Face Inference API
 * Run with: npm test -- embedding-generator.integration.test.ts
 * 
 * Note: These tests may be slow due to model loading time on Hugging Face
 */

import { embeddingGeneratorService } from './embedding-generator';
import { SemanticSearchProfile } from '../../types';

describe('EmbeddingGeneratorService Integration Tests', () => {
  // Skip these tests by default to avoid hitting external APIs during regular test runs
  // To run: npm test -- embedding-generator.integration.test.ts --testNamePattern="Integration"
  
  describe.skip('Real API calls', () => {
    it('should generate embedding from Hugging Face API', async () => {
      const profile: SemanticSearchProfile = {
        age: 35,
        income: 250000,
        gender: 'Female',
        caste: 'OBC',
        state: 'Maharashtra',
      };

      const result = await embeddingGeneratorService.generateProfileEmbedding(profile);

      expect(result.vector).toBeDefined();
      expect(result.vector.length).toBe(384);
      expect(result.dimensions).toBe(384);
      expect(result.model).toBe('all-MiniLM-L6-v2');
      
      // Verify embedding values are normalized (typical for sentence-transformers)
      const magnitude = Math.sqrt(
        result.vector.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeGreaterThan(0);
      expect(magnitude).toBeLessThan(2); // Normalized vectors typically have magnitude close to 1
    }, 30000); // 30 second timeout for API call

    it('should generate consistent embeddings for similar profiles', async () => {
      const profile1: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'SC',
        state: 'Uttar Pradesh',
      };

      const profile2: SemanticSearchProfile = {
        age: 32,
        income: 210000,
        gender: 'Male',
        caste: 'SC',
        state: 'Uttar Pradesh',
      };

      const result1 = await embeddingGeneratorService.generateProfileEmbedding(profile1);
      const result2 = await embeddingGeneratorService.generateProfileEmbedding(profile2);

      // Calculate cosine similarity
      const dotProduct = result1.vector.reduce(
        (sum, val, i) => sum + val * result2.vector[i],
        0
      );
      const mag1 = Math.sqrt(result1.vector.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(result2.vector.reduce((sum, val) => sum + val * val, 0));
      const cosineSimilarity = dotProduct / (mag1 * mag2);

      // Similar profiles should have high cosine similarity (> 0.8)
      expect(cosineSimilarity).toBeGreaterThan(0.8);
    }, 60000); // 60 second timeout for two API calls

    it('should format profile text correctly', () => {
      const profile: SemanticSearchProfile = {
        age: 28,
        income: 150000,
        gender: 'Female',
        caste: 'ST',
        state: 'Jharkhand',
      };

      const text = embeddingGeneratorService.formatProfileText(profile);

      expect(text).toContain('female person aged 28 years');
      expect(text).toContain('₹1,50,000');
      expect(text).toContain('ST category');
      expect(text).toContain('Jharkhand');
      expect(text).toContain('government schemes');
    });
  });
});
