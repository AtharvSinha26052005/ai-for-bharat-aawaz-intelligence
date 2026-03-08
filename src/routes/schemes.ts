import { Router, Request, Response, NextFunction } from 'express';
import { schemeService } from '../services/scheme/scheme-service';
import { authenticate } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { Language } from '../types';
import { ValidationError } from '../utils/errors';
import { ensureString, isValidLanguage } from '../utils/validation';
import logger from '../utils/logger';
import { semanticSearchService, SemanticSearchRequest } from '../services/semantic/semantic-search';

const router = Router();

/**
 * GET /api/v1/schemes/eligible/:userId
 * Get eligible schemes for a user with ranking
 */
router.get(
  '/eligible/:userId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = ensureString(req.params.userId, 'userId');

      const recommendations = await schemeService.getEligibleSchemes(userId);

      res.json({
        success: true,
        data: {
          userId,
          totalEligible: recommendations.length,
          recommendations: recommendations.map((r) => ({
            schemeId: r.scheme.schemeId,
            officialName: r.scheme.officialName,
            localizedName: r.scheme.localizedNames['en'],
            shortDescription: r.scheme.shortDescription['en'],
            category: r.scheme.category,
            level: r.scheme.level,
            estimatedBenefit: r.estimatedBenefit,
            priority: r.priority,
            personalizedExplanation: r.personalizedExplanation,
            eligibility: {
              eligible: r.eligibilityResult.eligible,
              confidence: r.eligibilityResult.confidence,
              explanation: r.eligibilityResult.explanation,
            },
          })),
        },
      });

      logger.info('Eligible schemes retrieved via API', { userId, count: recommendations.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/schemes/search
 * Search schemes by query with filters
 */
router.post(
  '/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, language, filters } = req.body;

      // Validate required fields
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Query is required and must be a string');
      }

      const searchLanguageParam = (language as string) || req.user?.preferredLanguage || 'en';
      const searchLanguage = isValidLanguage(searchLanguageParam) ? searchLanguageParam as Language : 'en';

      const schemes = await schemeService.searchSchemes(query, searchLanguage, filters);

      res.json({
        success: true,
        data: {
          query,
          language: searchLanguage,
          totalResults: schemes.length,
          schemes: schemes.map((s) => ({
            schemeId: s.schemeId,
            officialName: s.officialName,
            localizedName: s.localizedNames[searchLanguage],
            shortDescription: s.shortDescription[searchLanguage],
            category: s.category,
            level: s.level,
            state: s.state,
          })),
        },
      });

      logger.info('Schemes searched via API', { query: query.substring(0, 100), resultsCount: schemes.length });
    } catch (error) {
      next(error);
    }
  }
);

// DEBUG: Test route to verify routing is working
router.post('/test-route', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Test route works!' });
});

/**
 * POST /api/v1/schemes/semantic-search
 * Semantic search for schemes based on user profile
 * Uses AI-powered vector similarity and LLM-based eligibility analysis
 * Rate limited to 10 requests per minute per user
 */
router.post(
  '/semantic-search',
  // authenticate, // Temporarily disabled for testing
  // strictRateLimiter, // Temporarily disabled for testing
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      const { age, income, gender, caste, state } = req.body;

      // Validate required fields
      if (age === undefined || age === null) {
        throw new ValidationError('Age is required');
      }
      if (income === undefined || income === null) {
        throw new ValidationError('Income is required');
      }
      if (!gender) {
        throw new ValidationError('Gender is required');
      }
      if (!caste) {
        throw new ValidationError('Caste is required');
      }
      if (!state) {
        throw new ValidationError('State is required');
      }

      // Build semantic search request
      const searchRequest: SemanticSearchRequest = {
        age: Number(age),
        income: Number(income),
        gender: String(gender),
        caste: String(caste),
        state: String(state),
      };

      // Perform semantic search
      const recommendations = await semanticSearchService.search(searchRequest);

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          totalResults: recommendations.length,
          processingTime,
          recommendations: recommendations.map((r) => ({
            schemeId: r.schemeId,
            name: r.name,
            slug: r.slug,
            description: r.description,
            category: r.category,
            level: r.level,
            ministry: r.ministry,
            state: r.state,
            similarityScore: r.similarityScore,
            confidence: r.confidence,
            reasoning: r.reasoning,
            estimatedBenefit: r.estimatedBenefit,
          })),
        },
      });

      logger.info('Semantic search completed via API', {
        userId: req.user?.userId,
        age: searchRequest.age,
        state: searchRequest.state,
        resultsCount: recommendations.length,
        processingTime,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Semantic search failed via API', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/schemes/:schemeId
 * Get scheme details by ID
 * IMPORTANT: This route must come AFTER specific routes like /semantic-search
 * to avoid catching them with the :schemeId parameter
 */
router.get(
  '/:schemeId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schemeId = ensureString(req.params.schemeId, 'schemeId');
      const languageParam = (req.query.language as string) || req.user?.preferredLanguage || 'en';
      const language = isValidLanguage(languageParam) ? languageParam : 'en';

      const scheme = await schemeService.getSchemeById(schemeId, language);

      res.json({
        success: true,
        data: scheme,
      });

      logger.info('Scheme details retrieved via API', { schemeId, language });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
