import { EmbeddingGeneratorService } from './embedding-generator';
import { SemanticSearchProfile } from '../../types';
import { ExternalServiceError } from '../../utils/errors';

// Mock fetch globally
global.fetch = jest.fn();

describe('EmbeddingGeneratorService', () => {
  let service: EmbeddingGeneratorService;

  beforeEach(() => {
    service = new EmbeddingGeneratorService();
    jest.clearAllMocks();
  });

  describe('formatProfileText', () => {
    it('should format a complete profile into natural language', () => {
      const profile: SemanticSearchProfile = {
        age: 35,
        income: 250000,
        gender: 'Female',
        caste: 'OBC',
        state: 'Maharashtra',
      };

      const result = service.formatProfileText(profile);

      expect(result).toContain('female person aged 35 years');
      expect(result).toContain('annual income');
      expect(result).toContain('OBC category');
      expect(result).toContain('Maharashtra');
      expect(result).toContain('government schemes');
    });

    it('should handle General caste category appropriately', () => {
      const profile: SemanticSearchProfile = {
        age: 28,
        income: 150000,
        gender: 'Male',
        caste: 'General',
        state: 'Karnataka',
      };

      const result = service.formatProfileText(profile);

      expect(result).not.toContain('General category');
      expect(result).toContain('male person aged 28 years');
      expect(result).toContain('Karnataka');
    });

    it('should format income ranges correctly', () => {
      const profiles = [
        { income: 50000, expected: 'below ₹1 lakh' },
        { income: 150000, expected: '₹1-3 lakhs' },
        { income: 400000, expected: '₹3-5 lakhs' },
        { income: 600000, expected: 'above ₹5 lakhs' },
      ];

      profiles.forEach(({ income, expected }) => {
        const profile: SemanticSearchProfile = {
          age: 30,
          income,
          gender: 'Male',
          caste: 'General',
          state: 'Delhi',
        };

        const result = service.formatProfileText(profile);
        expect(result).toContain(expected);
      });
    });

    it('should handle different genders', () => {
      const genders: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];

      genders.forEach((gender) => {
        const profile: SemanticSearchProfile = {
          age: 30,
          income: 200000,
          gender,
          caste: 'General',
          state: 'Delhi',
        };

        const result = service.formatProfileText(profile);
        expect(result).toContain(gender.toLowerCase());
      });
    });
  });

  describe('generateProfileEmbedding', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = new Array(384).fill(0).map(() => Math.random());
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmbedding,
      });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'SC',
        state: 'Uttar Pradesh',
      };

      const result = await service.generateProfileEmbedding(profile);

      expect(result.vector).toEqual(mockEmbedding);
      expect(result.dimensions).toBe(384);
      expect(result.model).toBe('all-MiniLM-L6-v2');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid embedding dimensions', async () => {
      const mockEmbedding = new Array(512).fill(0).map(() => Math.random());
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmbedding,
      });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'General',
        state: 'Delhi',
      };

      await expect(service.generateProfileEmbedding(profile)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle API timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'General',
        state: 'Delhi',
      };

      await expect(service.generateProfileEmbedding(profile)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle 503 model loading error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Model is loading',
      });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'General',
        state: 'Delhi',
      };

      await expect(service.generateProfileEmbedding(profile)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' }),
      });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'General',
        state: 'Delhi',
      };

      await expect(service.generateProfileEmbedding(profile)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should retry on failure', async () => {
      const mockEmbedding = new Array(384).fill(0).map(() => Math.random());
      
      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmbedding,
        });

      const profile: SemanticSearchProfile = {
        age: 30,
        income: 200000,
        gender: 'Male',
        caste: 'General',
        state: 'Delhi',
      };

      const result = await service.generateProfileEmbedding(profile);

      expect(result.vector).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
