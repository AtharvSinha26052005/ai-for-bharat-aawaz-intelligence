import { Router, Request, Response } from 'express';
import { profileService, CreateProfileRequest, UpdateProfileRequest } from '../services/profile/profile-service';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { ensureString } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/profile
 * Create a new user profile
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Create profile request', { body: req.body });

    const profile = await profileService.createProfile(req.body as CreateProfileRequest);

    res.status(201).json({
      success: true,
      data: profile,
      message: 'Profile created successfully',
    });
  })
);

/**
 * GET /api/v1/profile/:userId
 * Get user profile by ID
 */
router.get(
  '/:userId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = ensureString(req.params.userId, 'userId');

    // Users can only access their own profile unless they're admin
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own profile',
        },
      });
    }

    const profile = await profileService.getProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  })
);

/**
 * PATCH /api/v1/profile/:userId
 * Update user profile
 */
router.patch(
  '/:userId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = ensureString(req.params.userId, 'userId');

    // Users can only update their own profile unless they're admin
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        },
      });
    }

    const profile = await profileService.updateProfile(userId, req.body as UpdateProfileRequest);

    res.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    });
  })
);

/**
 * DELETE /api/v1/profile/:userId
 * Delete user profile
 */
router.delete(
  '/:userId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = ensureString(req.params.userId, 'userId');

    // Users can only delete their own profile unless they're admin
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own profile',
        },
      });
    }

    await profileService.deleteProfile(userId);

    res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  })
);

/**
 * GET /api/v1/profile/:userId/exists
 * Check if profile exists
 */
router.get(
  '/:userId/exists',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = ensureString(req.params.userId, 'userId');

    const exists = await profileService.profileExists(userId);

    res.json({
      success: true,
      data: {
        exists,
      },
    });
  })
);

export default router;
