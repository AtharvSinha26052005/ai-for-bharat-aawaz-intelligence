import { Router, Request, Response, NextFunction } from 'express';
import {
  fraudDetectorService,
  FraudAnalysisRequest,
  FraudType,
  RiskLevel,
} from '../services/fraud/fraud-detector-service';
import { authenticate } from '../middleware/auth';
import { Language } from '../types';
import { ValidationError } from '../utils/errors';
import { isValidLanguage } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/fraud/analyze
 * Analyze content for fraud indicators
 */
router.post(
  '/analyze',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, contentType, language } = req.body;

      // Validate required fields
      if (!content || typeof content !== 'string') {
        throw new ValidationError('Content is required and must be a string');
      }

      if (!contentType || !['text', 'url', 'phone', 'email'].includes(contentType)) {
        throw new ValidationError(
          'Content type is required and must be one of: text, url, phone, email'
        );
      }

      const languageParam = (language as string) || req.user?.preferredLanguage || 'en';
      const analysisLanguage = isValidLanguage(languageParam) ? languageParam as Language : 'en';

      const request: FraudAnalysisRequest = {
        content,
        contentType,
        language: analysisLanguage,
        userId: req.user?.userId,
      };

      const result = await fraudDetectorService.analyzeContent(request);

      res.json({
        success: true,
        data: {
          riskLevel: result.riskLevel,
          confidence: result.confidence,
          fraudTypes: result.fraudTypes,
          indicators: result.indicators,
          explanation: result.explanation,
          recommendations: result.recommendations,
          reportingGuidance: result.reportingGuidance,
        },
      });

      logger.info('Fraud analysis completed via API', {
        userId: req.user?.userId,
        riskLevel: result.riskLevel,
        fraudTypes: result.fraudTypes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/fraud/report
 * Report fraud to authorities
 */
router.post(
  '/report',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, fraudType, riskLevel } = req.body;
      const userId = req.user!.userId;

      // Validate required fields
      if (!content || typeof content !== 'string') {
        throw new ValidationError('Content is required and must be a string');
      }

      if (!fraudType || typeof fraudType !== 'string') {
        throw new ValidationError('Fraud type is required');
      }

      if (!riskLevel || !['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
        throw new ValidationError(
          'Risk level is required and must be one of: low, medium, high, critical'
        );
      }

      const reportId = await fraudDetectorService.reportFraud(
        userId,
        content,
        fraudType as FraudType,
        riskLevel as RiskLevel
      );

      res.json({
        success: true,
        data: {
          reportId,
          message: 'Fraud report submitted successfully',
          nextSteps: [
            'Your report has been recorded',
            'Authorities will be notified',
            'You may be contacted for additional information',
            'Keep any evidence (screenshots, messages) safe',
          ],
        },
      });

      logger.info('Fraud reported via API', { userId, reportId, fraudType, riskLevel });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/fraud/reports
 * Get user's fraud reports
 */
router.get(
  '/reports',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const query = `
        SELECT report_id, fraud_type, risk_level, reported_at, status
        FROM fraud_reports
        WHERE user_id = $1
        ORDER BY reported_at DESC
        LIMIT 50
      `;

      const { db } = await import('../db/connection');
      const result = await db.query(query, [userId]);

      res.json({
        success: true,
        data: {
          totalReports: result.rows.length,
          reports: result.rows.map((row) => ({
            reportId: row.report_id,
            fraudType: row.fraud_type,
            riskLevel: row.risk_level,
            reportedAt: row.reported_at,
            status: row.status,
          })),
        },
      });

      logger.info('Fraud reports retrieved via API', { userId, count: result.rows.length });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
