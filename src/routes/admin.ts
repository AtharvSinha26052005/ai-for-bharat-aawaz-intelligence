import { Router, Request, Response } from 'express';
import { knowledgeBaseService } from '../services/admin/knowledge-base-service';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import { ensureString } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * POST /api/v1/admin/schemes
 * Create a new scheme
 */
router.post('/schemes', async (req: Request, res: Response) => {
  try {
    const { scheme } = req.body;
    const userId = req.user?.userId || '';

    if (!scheme) {
      throw new ValidationError('Scheme data is required');
    }

    const createdScheme = await knowledgeBaseService.createScheme(scheme, userId);

    res.status(201).json({
      success: true,
      data: createdScheme,
    });
  } catch (error) {
    logger.error('Failed to create scheme', { error });
    throw error;
  }
});

/**
 * PATCH /api/v1/admin/schemes/:schemeId
 * Update an existing scheme
 */
router.patch('/schemes/:schemeId', async (req: Request, res: Response) => {
  try {
    const schemeId = ensureString(req.params.schemeId, 'schemeId');
    const { updates, changes } = req.body;
    const userId = req.user?.userId || '';

    if (!updates) {
      throw new ValidationError('Updates are required');
    }

    if (!changes) {
      throw new ValidationError('Change description is required');
    }

    const updatedScheme = await knowledgeBaseService.updateScheme(
      schemeId,
      updates,
      userId,
      changes
    );

    res.json({
      success: true,
      data: updatedScheme,
    });
  } catch (error) {
    logger.error('Failed to update scheme', { error });
    throw error;
  }
});

/**
 * GET /api/v1/admin/schemes/:schemeId/versions
 * Get version history for a scheme
 */
router.get('/schemes/:schemeId/versions', async (req: Request, res: Response) => {
  try {
    const schemeId = ensureString(req.params.schemeId, 'schemeId');

    const versions = await knowledgeBaseService.getVersionHistory(schemeId);

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    logger.error('Failed to get version history', { error });
    throw error;
  }
});

/**
 * POST /api/v1/admin/schemes/:schemeId/rollback
 * Rollback scheme to a previous version
 */
router.post('/schemes/:schemeId/rollback', async (req: Request, res: Response) => {
  try {
    const schemeId = ensureString(req.params.schemeId, 'schemeId');
    const { targetVersion } = req.body;
    const userId = req.user?.userId || '';

    if (!targetVersion) {
      throw new ValidationError('Target version is required');
    }

    const rolledBackScheme = await knowledgeBaseService.rollbackToVersion(
      schemeId,
      targetVersion,
      userId
    );

    res.json({
      success: true,
      data: rolledBackScheme,
    });
  } catch (error) {
    logger.error('Failed to rollback scheme', { error });
    throw error;
  }
});

/**
 * POST /api/v1/admin/schemes/import
 * Import scheme from document
 */
router.post('/schemes/import', async (req: Request, res: Response) => {
  try {
    const { document, format } = req.body;
    const userId = req.user?.userId || '';

    if (!document || !format) {
      throw new ValidationError('Document and format are required');
    }

    if (!['pdf', 'docx', 'html'].includes(format)) {
      throw new ValidationError('Invalid format. Supported: pdf, docx, html');
    }

    const documentBuffer = Buffer.from(document, 'base64');
    const parsedScheme = await knowledgeBaseService.parseAndImportDocument(
      documentBuffer,
      format,
      userId
    );

    res.json({
      success: true,
      data: parsedScheme,
      message: 'Document parsed. Please review and complete the scheme data.',
    });
  } catch (error) {
    logger.error('Failed to import document', { error });
    throw error;
  }
});

/**
 * POST /api/v1/admin/schemes/:schemeId/translate
 * Translate scheme to all supported languages
 */
router.post('/schemes/:schemeId/translate', async (req: Request, res: Response) => {
  try {
    const schemeId = ensureString(req.params.schemeId, 'schemeId');
    const { sourceLanguage } = req.body;

    await knowledgeBaseService.translateScheme(schemeId, sourceLanguage || 'en');

    res.json({
      success: true,
      message: 'Scheme translated to all supported languages',
    });
  } catch (error) {
    logger.error('Failed to translate scheme', { error });
    throw error;
  }
});

/**
 * POST /api/v1/admin/sync/government-api
 * Sync schemes from government API
 */
router.post('/sync/government-api', async (req: Request, res: Response) => {
  try {
    const { apiEndpoint, apiKey } = req.body;

    if (!apiEndpoint) {
      throw new ValidationError('API endpoint is required');
    }

    const syncedCount = await knowledgeBaseService.syncFromGovernmentAPI(apiEndpoint, apiKey);

    res.json({
      success: true,
      data: { syncedCount },
      message: `Synced ${syncedCount} schemes from government API`,
    });
  } catch (error) {
    logger.error('Failed to sync from government API', { error });
    throw error;
  }
});

export default router;
