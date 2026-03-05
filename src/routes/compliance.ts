import { Router, Request, Response } from 'express';
import { complianceService } from '../services/compliance/compliance-service';
import { authenticate } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/compliance/data-deletion
 * Request data deletion
 */
router.post('/data-deletion', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const deletionRequest = await complianceService.requestDataDeletion(userId);

    res.json({
      success: true,
      data: deletionRequest,
      message: 'Data deletion request submitted. Your data will be deleted within 30 days.',
    });
  } catch (error) {
    logger.error('Failed to request data deletion', { error });
    throw error;
  }
});

/**
 * POST /api/v1/compliance/data-sharing-consent
 * Record data sharing consent
 */
router.post('/data-sharing-consent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { thirdParty, purpose, consentGiven, expiryDate } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!thirdParty || !purpose || consentGiven === undefined) {
      throw new ValidationError('Third party, purpose, and consent status are required');
    }

    await complianceService.recordDataSharingConsent({
      userId,
      thirdParty,
      purpose,
      consentGiven,
      consentDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    res.json({
      success: true,
      message: 'Data sharing consent recorded',
    });
  } catch (error) {
    logger.error('Failed to record data sharing consent', { error });
    throw error;
  }
});

/**
 * GET /api/v1/compliance/data-sharing-preferences
 * Get user's data sharing preferences
 */
router.get('/data-sharing-preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const preferences = await complianceService.getDataSharingPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to get data sharing preferences', { error });
    throw error;
  }
});

/**
 * GET /api/v1/compliance/privacy-notice
 * Get privacy notice in specified language
 */
router.get('/privacy-notice', async (req: Request, res: Response) => {
  try {
    const language = (req.query.language as string) || 'en';

    const privacyNotice = complianceService.getPrivacyNotice(language);

    res.json({
      success: true,
      data: {
        language,
        notice: privacyNotice,
      },
    });
  } catch (error) {
    logger.error('Failed to get privacy notice', { error });
    throw error;
  }
});

export default router;
