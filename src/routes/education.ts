import { Router, Request, Response, NextFunction } from 'express';
import { financialEducatorService, DifficultyLevel } from '../services/education/financial-educator-service';
import { authenticate } from '../middleware/auth';
import { Language } from '../types';
import { ValidationError } from '../utils/errors';
import { ensureString, isValidLanguage } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/education/lessons
 * Get all available financial literacy lessons
 */
router.get(
  '/lessons',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const languageParam = (req.query.language as string) || req.user?.preferredLanguage || 'en';
      const language = isValidLanguage(languageParam) ? languageParam as Language : 'en';
      const difficulty = req.query.difficulty as DifficultyLevel | undefined;

      const lessons = await financialEducatorService.getLessons(language, difficulty);

      res.json({
        success: true,
        data: {
          totalLessons: lessons.length,
          lessons: lessons.map((l) => ({
            lessonId: l.lessonId,
            topic: l.topic,
            title: l.title[language],
            duration: l.duration,
            difficulty: l.difficulty,
            prerequisites: l.prerequisites,
          })),
        },
      });

      logger.info('Financial lessons retrieved via API', { language, difficulty, count: lessons.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/education/lessons/:lessonId
 * Get specific lesson details
 */
router.get(
  '/lessons/:lessonId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = ensureString(req.params.lessonId, 'lessonId');
      const languageParam = (req.query.language as string) || req.user?.preferredLanguage || 'en';
      const language = isValidLanguage(languageParam) ? languageParam as Language : 'en';

      const lesson = await financialEducatorService.getLessonById(lessonId, language);

      res.json({
        success: true,
        data: {
          lessonId: lesson.lessonId,
          topic: lesson.topic,
          title: lesson.title[language],
          content: lesson.content[language],
          duration: lesson.duration,
          difficulty: lesson.difficulty,
          examples: lesson.examples[language],
          keyTerms: lesson.keyTerms[language],
          exercises: lesson.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            question: e.question[language],
            options: e.options?.[language],
            type: e.type,
          })),
          prerequisites: lesson.prerequisites,
        },
      });

      logger.info('Financial lesson details retrieved via API', { lessonId, language });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/education/lessons/:lessonId/start
 * Start a lesson for a user
 */
router.post(
  '/lessons/:lessonId/start',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = ensureString(req.params.lessonId, 'lessonId');
      const userId = req.user!.userId;

      const lesson = await financialEducatorService.startLesson(userId, lessonId);

      const language = req.user?.preferredLanguage || 'en';

      res.json({
        success: true,
        data: {
          lessonId: lesson.lessonId,
          topic: lesson.topic,
          title: lesson.title[language],
          content: lesson.content[language],
          duration: lesson.duration,
          difficulty: lesson.difficulty,
          examples: lesson.examples[language],
          keyTerms: lesson.keyTerms[language],
          exercises: lesson.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            question: e.question[language],
            options: e.options?.[language],
            type: e.type,
          })),
        },
      });

      logger.info('Lesson started via API', { userId, lessonId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/education/exercises/:exerciseId/submit
 * Submit an exercise answer
 */
router.post(
  '/exercises/:exerciseId/submit',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exerciseId = ensureString(req.params.exerciseId, 'exerciseId');
      const { answer } = req.body;
      const userId = req.user!.userId;

      // Validate answer
      if (!answer || typeof answer !== 'string') {
        throw new ValidationError('Answer is required and must be a string');
      }

      const result = await financialEducatorService.submitExercise(userId, exerciseId, answer);

      res.json({
        success: true,
        data: {
          exerciseId,
          correct: result.correct,
          explanation: result.explanation,
          score: result.score,
        },
      });

      logger.info('Exercise submitted via API', { userId, exerciseId, correct: result.correct });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/education/progress
 * Get learning progress for the authenticated user
 */
router.get(
  '/progress',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const progress = await financialEducatorService.getLearningProgress(userId);

      res.json({
        success: true,
        data: progress,
      });

      logger.info('Learning progress retrieved via API', { userId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/education/terms/:term
 * Get explanation for a financial term
 */
router.get(
  '/terms/:term',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const term = ensureString(req.params.term, 'term');
      const languageParam = (req.query.language as string) || req.user?.preferredLanguage || 'en';
      const language = isValidLanguage(languageParam) ? languageParam as Language : 'en';

      const explanation = await financialEducatorService.explainTerm(term, language);

      res.json({
        success: true,
        data: {
          term,
          explanation,
          language,
        },
      });

      logger.info('Financial term explained via API', { term, language });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
