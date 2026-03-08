import { Router, Request, Response } from 'express';
import { ProfileStorageService } from '../services/profile-storage-service';
import { EnhancedSemanticSearchService } from '../services/enhanced-semantic-search';
import { PineconeSemanticSearchService } from '../services/pinecone-semantic-search';
import logger from '../utils/logger';

const router = Router();
const profileService = new ProfileStorageService();
const enhancedSearchService = new EnhancedSemanticSearchService();
const pineconeSearchService = new PineconeSemanticSearchService();

// POST /api/v1/profiles - Create a new profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const profileData = req.body;

    // Basic validation
    if (!profileData.age || !profileData.income_range || !profileData.gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await profileService.createProfile(profileData);

    return res.status(201).json({ data: result });
  } catch (error: any) {
    logger.error('Error creating profile', { error });
    return res.status(500).json({ error: 'Failed to create profile' });
  }
});

// GET /api/v1/profiles/:profile_id - Get profile by ID
router.get('/:profile_id', async (req: Request, res: Response) => {
  try {
    const profile_id = req.params.profile_id as string;

    const profile = await profileService.getProfileById(profile_id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json({ data: profile });
  } catch (error: any) {
    logger.error('Error fetching profile', { error });
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/v1/profiles/:profile_id/schemes - Get semantic search results for profile
router.get('/:profile_id/schemes', async (req: Request, res: Response) => {
  try {
    const profile_id = req.params.profile_id as string;
    const usePinecone = req.query.pinecone === 'true'; // Optional query param to use Pinecone

    // Choose search service based on query parameter
    const searchService = usePinecone ? pineconeSearchService : enhancedSearchService;
    const result = await searchService.searchSchemesByProfile(profile_id);

    // Ensure we always return an array
    const schemes = Array.isArray(result.schemes) ? result.schemes : [];

    return res.status(200).json({ 
      data: schemes,
      generated_query: result.generated_query || 'No query generated',
      search_method: usePinecone ? 'pinecone' : 'enhanced'
    });
  } catch (error: any) {
    logger.error('Error searching schemes for profile', { error });
    // Return empty array instead of error to prevent frontend crash
    return res.status(200).json({ 
      data: [],
      generated_query: 'Error occurred',
      error: error.message || 'Failed to search schemes'
    });
  }
});

export default router;
