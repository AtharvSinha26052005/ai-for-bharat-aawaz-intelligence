import { Router, Request, Response } from 'express';
import { ProfileStorageService } from '../services/profile-storage-service';
import { EnhancedSemanticSearchService } from '../services/enhanced-semantic-search';
import { PineconeSemanticSearchService } from '../services/pinecone-semantic-search';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();
const profileService = new ProfileStorageService();
const enhancedSearchService = new EnhancedSemanticSearchService();
const pineconeSearchService = new PineconeSemanticSearchService();

// POST /api/v1/profiles - Create a new profile
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const profileData = req.body;

  // Basic validation
  if (!profileData.age || !profileData.income_range || !profileData.gender) {
    return res.status(400).json({ 
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields'
      }
    });
  }

  const result = await profileService.createProfile(profileData);

  return res.status(201).json({ 
    success: true,
    data: result 
  });
}));

// GET /api/v1/profiles/:profile_id - Get profile by ID
router.get('/:profile_id', asyncHandler(async (req: Request, res: Response) => {
  const profile_id = req.params.profile_id as string;

  const profile = await profileService.getProfileById(profile_id);

  if (!profile) {
    return res.status(404).json({ 
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Profile not found'
      }
    });
  }

  return res.status(200).json({ 
    success: true,
    data: profile 
  });
}));

// GET /api/v1/profiles/:profile_id/schemes - Get semantic search results for profile
router.get('/:profile_id/schemes', asyncHandler(async (req: Request, res: Response) => {
  const profile_id = req.params.profile_id as string;
  const usePinecone = req.query.pinecone === 'true'; // Optional query param to use Pinecone

  // Choose search service based on query parameter
  const searchService = usePinecone ? pineconeSearchService : enhancedSearchService;
  const result = await searchService.searchSchemesByProfile(profile_id);

  // Ensure we always return an array
  const schemes = Array.isArray(result.schemes) ? result.schemes : [];

  return res.status(200).json({ 
    success: true,
    data: schemes,
    generated_query: result.generated_query || 'No query generated',
    search_method: usePinecone ? 'pinecone' : 'enhanced'
  });
}));

export default router;
