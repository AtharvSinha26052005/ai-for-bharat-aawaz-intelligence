import { VectorStoreService, SearchResult, VectorMetadata } from './vector-store';
import { ExternalServiceError } from '../../utils/errors';

// Mock dependencies
jest.mock('@pinecone-database/pinecone');
jest.mock('../../utils/logger');
jest.mock('../../utils/retry', () => ({
  retryWithBackoff: jest.fn((fn) => fn()),
}));

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let mockPinecone: any;
  let mockIndex: any;

  beforeEach(() => {
    // Reset environment variables
    process.env.PINECONE_API_KEY = 'test-api-key';
    process.env.PINECONE_INDEX_NAME = 'test-index';

    // Create mock index
    mockIndex = {
      query: jest.fn(),
      describeIndexStats: jest.fn(),
    };

    // Create mock Pinecone client
    mockPinecone = {
      index: jest.fn().mockReturnValue(mockIndex),
    };

    // Mock the Pinecone constructor
    const { Pinecone } = require('@pinecone-database/pinecone');
    Pinecone.mockImplementation(() => mockPinecone);

    // Create service instance
    service = new VectorStoreService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if PINECONE_API_KEY is missing', () => {
      delete process.env.PINECONE_API_KEY;

      expect(() => new VectorStoreService()).toThrow(
        'PINECONE_API_KEY environment variable is required'
      );
    });

    it('should use default index name if not provided', () => {
      delete process.env.PINECONE_INDEX_NAME;
      const newService = new VectorStoreService();
      expect(newService).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
    });
  });

  describe('search', () => {
    const mockQueryVector = new Array(384).fill(0.1);
    const mockSearchResults = {
      matches: [
        {
          id: 'scheme-1',
          score: 0.95,
          metadata: {
            scheme_id: 'scheme-1',
            name: 'PM-KISAN',
            slug: 'pm-kisan',
            ministry: 'Agriculture',
            category: 'Financial Assistance',
            level: 'central',
          },
        },
        {
          id: 'scheme-2',
          score: 0.87,
          metadata: {
            scheme_id: 'scheme-2',
            name: 'Ayushman Bharat',
            slug: 'ayushman-bharat',
            ministry: 'Health',
            category: 'Healthcare',
            level: 'central',
          },
        },
      ],
    };

    beforeEach(() => {
      mockIndex.query.mockResolvedValue(mockSearchResults);
    });

    it('should successfully search for similar vectors', async () => {
      const results = await service.search(mockQueryVector, 10);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('scheme-1');
      expect(results[0].score).toBe(0.95);
      expect(results[0].metadata.name).toBe('PM-KISAN');
      expect(results[1].id).toBe('scheme-2');
      expect(results[1].score).toBe(0.87);
    });

    it('should call Pinecone query with correct parameters', async () => {
      await service.search(mockQueryVector, 5);

      expect(mockIndex.query).toHaveBeenCalledWith({
        vector: mockQueryVector,
        topK: 5,
        includeMetadata: true,
      });
    });

    it('should throw error for empty query vector', async () => {
      await expect(service.search([], 10)).rejects.toThrow(
        'Query vector must be a non-empty array'
      );
    });

    it('should throw error for invalid vector dimensions', async () => {
      const invalidVector = new Array(100).fill(0.1); // Wrong dimensions

      await expect(service.search(invalidVector, 10)).rejects.toThrow(
        'Query vector dimensions mismatch'
      );
    });

    it('should throw error for invalid topK value', async () => {
      await expect(service.search(mockQueryVector, 0)).rejects.toThrow(
        'topK must be between 1 and 100'
      );

      await expect(service.search(mockQueryVector, 101)).rejects.toThrow(
        'topK must be between 1 and 100'
      );
    });

    it('should handle empty search results', async () => {
      mockIndex.query.mockResolvedValue({ matches: [] });

      const results = await service.search(mockQueryVector, 10);

      expect(results).toHaveLength(0);
    });

    it('should handle Pinecone query failure', async () => {
      mockIndex.query.mockRejectedValue(new Error('Network error'));

      await expect(service.search(mockQueryVector, 10)).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockIndex.query.mockRejectedValue(timeoutError);

      await expect(service.search(mockQueryVector, 10)).rejects.toThrow(
        'Pinecone query timed out'
      );
    });

    it('should use default topK value of 10', async () => {
      await service.search(mockQueryVector);

      expect(mockIndex.query).toHaveBeenCalledWith({
        vector: mockQueryVector,
        topK: 10,
        includeMetadata: true,
      });
    });

    it('should handle missing metadata gracefully', async () => {
      mockIndex.query.mockResolvedValue({
        matches: [
          {
            id: 'scheme-1',
            score: 0.95,
            metadata: null,
          },
        ],
      });

      const results = await service.search(mockQueryVector, 10);

      expect(results).toHaveLength(1);
      expect(results[0].metadata).toBeNull();
    });
  });

  describe('getIndexStats', () => {
    it('should successfully retrieve index statistics', async () => {
      mockIndex.describeIndexStats.mockResolvedValue({
        totalRecordCount: 1000,
        dimension: 384,
      });

      const stats = await service.getIndexStats();

      expect(stats.vectorCount).toBe(1000);
      expect(stats.dimension).toBe(384);
    });

    it('should handle missing statistics gracefully', async () => {
      mockIndex.describeIndexStats.mockResolvedValue({});

      const stats = await service.getIndexStats();

      expect(stats.vectorCount).toBe(0);
      expect(stats.dimension).toBe(384); // Default value
    });

    it('should handle statistics retrieval failure', async () => {
      mockIndex.describeIndexStats.mockRejectedValue(new Error('API error'));

      await expect(service.getIndexStats()).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('close', () => {
    it('should close connection successfully', async () => {
      await service.close();

      // Verify connection is closed (no errors thrown)
      expect(true).toBe(true);
    });
  });

  describe('connection pooling', () => {
    it('should reuse connection for multiple queries', async () => {
      const mockQueryVector = new Array(384).fill(0.1);
      mockIndex.query.mockResolvedValue({ matches: [] });

      // Make multiple queries
      await service.search(mockQueryVector, 10);
      await service.search(mockQueryVector, 10);
      await service.search(mockQueryVector, 10);

      // Pinecone constructor should only be called once
      const { Pinecone } = require('@pinecone-database/pinecone');
      expect(Pinecone).toHaveBeenCalledTimes(1);
    });
  });
});
