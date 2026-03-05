import { Router, Request, Response, NextFunction } from 'express';
import {
  progressTrackerService,
  ApplicationStatus,
} from '../services/tracker/progress-tracker-service';
import { authenticate } from '../middleware/auth';
import { Language } from '../types';
import { ValidationError, ensureString, isValidLanguage } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/applications
 * Create a new application
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schemeId, schemeName } = req.body;
      const userId = req.user!.userId;

      // Validate required fields
      if (!schemeId || typeof schemeId !== 'string') {
        throw new ValidationError('Scheme ID is required', [{ field: 'schemeId', message: 'Scheme ID is required' }]);
      }

      if (!schemeName || typeof schemeName !== 'string') {
        throw new ValidationError('Scheme name is required', [{ field: 'schemeName', message: 'Scheme name is required' }]);
      }

      const application = await progressTrackerService.createApplication(
        userId,
        schemeId,
        schemeName
      );

      res.status(201).json({
        success: true,
        data: application,
      });

      logger.info('Application created via API', {
        userId,
        applicationId: application.applicationId,
        schemeId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/applications/:applicationId
 * Get application by ID
 */
router.get(
  '/:applicationId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = ensureString(req.params.applicationId, 'applicationId');

      const application = await progressTrackerService.getApplication(applicationId);

      // Verify user can only access their own applications (unless admin)
      if (application.userId !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        success: true,
        data: application,
      });

      logger.info('Application retrieved via API', { applicationId, userId: req.user!.userId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/applications/reference/:referenceNumber
 * Get application by reference number
 */
router.get(
  '/reference/:referenceNumber',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const referenceNumber = ensureString(req.params.referenceNumber, 'referenceNumber');

      const application = await progressTrackerService.getApplicationByReference(referenceNumber);

      // Verify user can only access their own applications (unless admin)
      if (application.userId !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        success: true,
        data: application,
      });

      logger.info('Application retrieved by reference via API', {
        referenceNumber,
        userId: req.user!.userId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/applications/user/:userId
 * Get all applications for a user
 */
router.get(
  '/user/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = ensureString(req.params.userId, 'userId');

      // Verify user can only access their own applications (unless admin)
      if (userId !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const applications = await progressTrackerService.getUserApplications(userId);

      res.json({
        success: true,
        data: {
          totalApplications: applications.length,
          applications,
        },
      });

      logger.info('User applications retrieved via API', { userId, count: applications.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/applications/:applicationId
 * Update application status
 */
router.patch(
  '/:applicationId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = ensureString(req.params.applicationId, 'applicationId');
      const { status, notes } = req.body;

      // Validate status
      const validStatuses: ApplicationStatus[] = [
        'draft',
        'submitted',
        'under-review',
        'documents-required',
        'approved',
        'rejected',
        'disbursed',
      ];

      if (!status || !validStatuses.includes(status)) {
        throw new ValidationError(
          `Status must be one of: ${validStatuses.join(', ')}`,
          [{ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` }]
        );
      }

      // Get application to verify ownership
      const application = await progressTrackerService.getApplication(applicationId);

      // Only admin can update status (users can only submit)
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can update application status' });
      }

      const updatedApplication = await progressTrackerService.updateApplicationStatus(
        applicationId,
        status,
        notes,
        req.user!.userId
      );

      res.json({
        success: true,
        data: updatedApplication,
      });

      logger.info('Application status updated via API', {
        applicationId,
        status,
        updatedBy: req.user!.userId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/applications/:applicationId/submit
 * Submit an application
 */
router.post(
  '/:applicationId/submit',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = ensureString(req.params.applicationId, 'applicationId');

      // Get application to verify ownership
      const application = await progressTrackerService.getApplication(applicationId);

      // Verify user owns this application
      if (application.userId !== req.user!.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Verify application is in draft status
      if (application.status !== 'draft') {
        throw new ValidationError('Only draft applications can be submitted', [{ field: 'status', message: 'Only draft applications can be submitted' }]);
      }

      const submittedApplication = await progressTrackerService.submitApplication(applicationId);

      res.json({
        success: true,
        data: submittedApplication,
        message: 'Application submitted successfully',
      });

      logger.info('Application submitted via API', { applicationId, userId: req.user!.userId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/applications/:applicationId/history
 * Get application history
 */
router.get(
  '/:applicationId/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = ensureString(req.params.applicationId, 'applicationId');

      // Get application to verify ownership
      const application = await progressTrackerService.getApplication(applicationId);

      // Verify user can only access their own applications (unless admin)
      if (application.userId !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const history = await progressTrackerService.getApplicationHistory(applicationId);

      res.json({
        success: true,
        data: {
          applicationId,
          totalEntries: history.length,
          history,
        },
      });

      logger.info('Application history retrieved via API', {
        applicationId,
        userId: req.user!.userId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/applications/:applicationId/timeline
 * Get application status timeline
 */
router.get(
  '/:applicationId/timeline',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = ensureString(req.params.applicationId, 'applicationId');
      const languageParam = (req.query.language as string) || req.user?.preferredLanguage || 'en';
      const language = isValidLanguage(languageParam) ? languageParam as Language : 'en';

      // Get application to verify ownership
      const application = await progressTrackerService.getApplication(applicationId);

      // Verify user can only access their own applications (unless admin)
      if (application.userId !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const timeline = await progressTrackerService.getStatusTimeline(applicationId, language);

      res.json({
        success: true,
        data: timeline,
      });

      logger.info('Application timeline retrieved via API', {
        applicationId,
        userId: req.user!.userId,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
