import { ProfileStorageService } from './profile-storage-service';
import { EmbeddingGeneratorService } from './semantic/embedding-generator';
import { VectorStoreService } from './semantic/vector-store';
import logger from '../utils/logger';

export class ProfileSemanticSearchService {
  private profileService: ProfileStorageService;
  private embeddingGenerator: EmbeddingGeneratorService;
  private vectorStore: VectorStoreService;

  constructor() {
    this.profileService = new ProfileStorageService();
    this.embeddingGenerator = new EmbeddingGeneratorService();
    this.vectorStore = new VectorStoreService();
  }

  async searchSchemesByProfile(profileId: string): Promise<any[]> {
    try {
      // Step 1: Get profile data
      const profile = await this.profileService.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Step 2: Convert income_range to number
      const incomeMap: { [key: string]: number } = {
        'below-1L': 50000,
        '1L-3L': 200000,
        '3L-5L': 400000,
        'above-5L': 600000,
      };
      
      const income = incomeMap[profile.income_range] || 200000;

      // Step 3: Create profile for embedding
      const profileForEmbedding: any = {
        age: profile.age,
        income: income,
        gender: profile.gender as 'Male' | 'Female' | 'Other',
        caste: profile.caste as 'General' | 'OBC' | 'SC' | 'ST' | 'Other',
        state: profile.state,
      };
      
      logger.info('Profile for embedding', { profileForEmbedding });
      
      const embeddingResult = await this.embeddingGenerator.generateProfileEmbedding(profileForEmbedding);
      const embedding = embeddingResult.vector;
      logger.info('Generated embedding', { dimension: embedding.length });

      // Step 4: Search Pinecone for top 10 schemes
      const results = await this.vectorStore.search(embedding, 10);
      logger.info('Pinecone search results', { count: results.length });

      // Step 5: Return full scheme metadata
      return results.map((result: any) => ({
        id: result.id,
        score: result.score,
        ...result.metadata,
      }));
    } catch (error: any) {
      logger.error('Error in profile semantic search', { error });
      throw error;
    }
  }
}
