import { Router, Request, Response } from 'express';
import { voiceService } from '../services/voice/voice-service';
import { orchestrationService } from '../services/orchestration/orchestration-service';
import { asyncHandler } from '../middleware/errorHandler';
import { optionalAuthenticate } from '../middleware/auth';
import { voiceRateLimiter } from '../middleware/rateLimiter';
import { validate, voiceInteractionSchema, textInteractionSchema } from '../utils/validation';
import { VoiceInteractionRequest } from '../services/voice/voice-service';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/interact/voice
 * Process voice interaction
 */
router.post(
  '/voice',
  optionalAuthenticate,
  voiceRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const validatedData = validate<VoiceInteractionRequest>(voiceInteractionSchema, req.body);

    logger.info('Voice interaction request', {
      userId: req.user?.userId,
      language: validatedData.language,
      lowBandwidthMode: validatedData.lowBandwidthMode,
    });

    // Process voice interaction
    const result = await voiceService.processVoiceInteraction(validatedData);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/interact/text
 * Process text interaction
 */
router.post(
  '/text',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const validatedData = validate(textInteractionSchema, req.body) as any;

    logger.info('Text interaction request', {
      userId: req.user?.userId,
      language: validatedData.language,
      message: validatedData.message.substring(0, 100),
    });

    // Use orchestration service
    const result = await orchestrationService.processInteraction({
      sessionId: validatedData.sessionId,
      userId: req.user?.userId || 'anonymous',
      input: validatedData.message,
      inputMode: 'text',
      language: validatedData.language,
    });

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        response: result.textResponse,
        intent: result.intent,
        suggestions: result.suggestions,
        requiresConfirmation: result.requiresConfirmation,
        confirmationMessage: result.confirmationMessage,
      },
    });
  })
);

/**
 * POST /api/v1/interact/detect-language
 * Detect language from audio
 */
router.post(
  '/detect-language',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_AUDIO',
          message: 'Audio data is required',
        },
      });
    }

    const language = await voiceService.detectLanguage(audio);

    res.json({
      success: true,
      data: {
        language,
      },
    });
  })
);

/**
 * POST /api/v1/interact/text-to-speech
 * Convert text to speech
 */
router.post(
  '/text-to-speech',
  optionalAuthenticate,
  voiceRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { text, language, lowBandwidthMode } = req.body;

    if (!text || !language) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Text and language are required',
        },
      });
    }

    const audioContent = await voiceService.textToSpeech(text, language, lowBandwidthMode);

    res.json({
      success: true,
      data: {
        audioContent,
        language,
        compressed: lowBandwidthMode || false,
      },
    });
  })
);

export default router;
