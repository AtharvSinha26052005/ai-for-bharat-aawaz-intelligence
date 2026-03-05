import { Router, Request, Response, NextFunction } from 'express';
import { schemeService } from '../services/scheme/scheme-service';
import { authenticate } from '../middleware/auth';
import { Language } from '../types';
import { ValidationError } from '../utils/errors';
import { ensureString, isValidLanguage } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/schemes/eligible/:userId
 * Get eligible schemes for a user with ranking
 */
router.get(
  '/eligible/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = ensureString(req.params.userId, 'userId');

      // Verify user can only access their own data (unless admin)
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const recommendations = await schemeService.getEligibleSchemes(userId);

      res.json({
        success: true,
        data: {
          userId,
          totalEligible: recommendations.length,
          recommendations: recommendations.map((r) => ({
            schemeId: r.scheme.schemeId,
            officialName: r.scheme.officialName,
            localizedName: r.scheme.localizedNames[req.user?.preferredLanguage || 'en'],
            shortDescription: r.scheme.shortDescription[req.user?.preferredLanguage || 'en'],
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
 * GET /api/v1/schemes/:schemeId
 * Get scheme details by ID
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

export default router;
