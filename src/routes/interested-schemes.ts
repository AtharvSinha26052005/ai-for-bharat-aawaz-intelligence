import { Router, Request, Response } from 'express';
import { InterestedSchemesService } from '../services/interested-schemes-service';
import { FinancialAdviceService } from '../services/financial-advice-service';
import { ProfileStorageService } from '../services/profile-storage-service';
import logger from '../utils/logger';

const router = Router();
const interestedSchemesService = new InterestedSchemesService();
const financialAdviceService = new FinancialAdviceService();
const profileService = new ProfileStorageService();

// POST /api/v1/interested-schemes - Mark a scheme as interested
router.post('/', async (req: Request, res: Response) => {
  try {
    const { profile_id, scheme_name, scheme_slug, scheme_description, scheme_benefits, scheme_ministry, scheme_apply_link } = req.body;

    if (!profile_id || !scheme_name) {
      return res.status(400).json({ error: 'profile_id and scheme_name are required' });
    }

    const result = await interestedSchemesService.markAsInterested({
      profile_id,
      scheme_name,
      scheme_slug,
      scheme_description,
      scheme_benefits,
      scheme_ministry,
      scheme_apply_link,
    });

    return res.status(201).json({
      data: result,
      message: result.already_exists ? 'Scheme already marked as interested' : 'Scheme marked as interested successfully',
    });
  } catch (error: any) {
    logger.error('Error marking scheme as interested', { error });
    return res.status(500).json({ error: 'Failed to mark scheme as interested' });
  }
});

// GET /api/v1/interested-schemes/:profile_id - Get all interested schemes for a profile
router.get('/:profile_id', async (req: Request, res: Response) => {
  try {
    const profile_id = req.params.profile_id as string;

    const schemes = await interestedSchemesService.getInterestedSchemes(profile_id);

    return res.status(200).json({
      data: schemes,
      count: schemes.length,
    });
  } catch (error: any) {
    logger.error('Error fetching interested schemes', { error });
    return res.status(500).json({ error: 'Failed to fetch interested schemes' });
  }
});

// DELETE /api/v1/interested-schemes/:id - Remove a scheme from interested list
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { profile_id } = req.body;

    if (!profile_id) {
      return res.status(400).json({ error: 'profile_id is required' });
    }

    const success = await interestedSchemesService.removeInterest(id, profile_id);

    if (!success) {
      return res.status(404).json({ error: 'Scheme not found or already removed' });
    }

    return res.status(200).json({ message: 'Scheme removed from interested list' });
  } catch (error: any) {
    logger.error('Error removing interested scheme', { error });
    return res.status(500).json({ error: 'Failed to remove scheme' });
  }
});

// POST /api/v1/interested-schemes/financial-advice - Get financial advice for a scheme
router.post('/financial-advice', async (req: Request, res: Response) => {
  try {
    const { scheme_name, scheme_description, scheme_benefits, profile_id } = req.body;

    if (!scheme_name) {
      return res.status(400).json({ error: 'scheme_name is required' });
    }

    // Optionally fetch user profile for personalized advice
    let userProfile;
    if (profile_id) {
      const profile = await profileService.getProfileById(profile_id);
      if (profile) {
        userProfile = {
          age: profile.age,
          occupation: profile.occupation,
          income_range: profile.income_range,
        };
      }
    }

    const advice = await financialAdviceService.getFinancialAdvice({
      scheme_name,
      scheme_description,
      scheme_benefits,
      user_profile: userProfile,
    });

    return res.status(200).json({ data: advice });
  } catch (error: any) {
    logger.error('Error generating financial advice', { error });
    return res.status(500).json({ error: 'Failed to generate financial advice' });
  }
});

export default router;
