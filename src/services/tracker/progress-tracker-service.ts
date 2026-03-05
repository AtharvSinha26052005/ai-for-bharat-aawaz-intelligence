import { UserProfile, Language } from '../../types';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Application status
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'documents-required'
  | 'approved'
  | 'rejected'
  | 'disbursed';

/**
 * Application data
 */
export interface Application {
  applicationId: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  referenceNumber: string;
  status: ApplicationStatus;
  submittedAt?: Date;
  lastUpdatedAt: Date;
  estimatedCompletionDate?: Date;
  currentStage: string;
  requiredDocuments?: string[];
  submittedDocuments?: string[];
  notes?: string;
}

/**
 * Application history entry
 */
interface ApplicationHistory {
  historyId: string;
  applicationId: string;
  status: ApplicationStatus;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

/**
 * Status notification
 */
interface StatusNotification {
  notificationId: string;
  userId: string;
  applicationId: string;
  message: Record<Language, string>;
  sentAt: Date;
  read: boolean;
}

/**
 * Progress Tracker Service
 * Tracks application progress and sends notifications
 */
export class ProgressTrackerService {
  /**
   * Creates a new application
   * @param userId - User ID
   * @param schemeId - Scheme ID
   * @param schemeName - Scheme name
   * @returns Application
   */
  async createApplication(
    userId: string,
    schemeId: string,
    schemeName: string
  ): Promise<Application> {
    try {
      const applicationId = uuidv4();
      const referenceNumber = this.generateReferenceNumber();

      const query = `
        INSERT INTO applications (
          application_id, user_id, scheme_id, scheme_name, reference_number,
          status, current_stage, last_updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'draft', 'Application Created', NOW())
        RETURNING *
      `;

      const result = await db.query(query, [
        applicationId,
        userId,
        schemeId,
        schemeName,
        referenceNumber,
      ]);

      const application = this.mapRowToApplication(result.rows[0]);

      // Record in history
      await this.recordHistory(applicationId, 'draft', 'system', 'Application created');

      logger.info('Application created', { applicationId, userId, schemeId, referenceNumber });

      return application;
    } catch (error) {
      logger.error('Failed to create application', { userId, schemeId, error });
      throw error;
    }
  }

  /**
   * Gets application by ID
   * @param applicationId - Application ID
   * @returns Application
   */
  async getApplication(applicationId: string): Promise<Application> {
    try {
      const query = 'SELECT * FROM applications WHERE application_id = $1';
      const result = await db.query(query, [applicationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get application', { applicationId, error });
      throw error;
    }
  }

  /**
   * Gets application by reference number
   * @param referenceNumber - Reference number
   * @returns Application
   */
  async getApplicationByReference(referenceNumber: string): Promise<Application> {
    try {
      const query = 'SELECT * FROM applications WHERE reference_number = $1';
      const result = await db.query(query, [referenceNumber]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get application by reference', { referenceNumber, error });
      throw error;
    }
  }

  /**
   * Gets all applications for a user
   * @param userId - User ID
   * @returns Array of applications
   */
  async getUserApplications(userId: string): Promise<Application[]> {
    try {
      const query = `
        SELECT * FROM applications
        WHERE user_id = $1
        ORDER BY last_updated_at DESC
      `;

      const result = await db.query(query, [userId]);

      return result.rows.map((row) => this.mapRowToApplication(row));
    } catch (error) {
      logger.error('Failed to get user applications', { userId, error });
      throw error;
    }
  }

  /**
   * Updates application status
   * @param applicationId - Application ID
   * @param status - New status
   * @param notes - Optional notes
   * @param changedBy - Who changed the status
   * @returns Updated application
   */
  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    notes?: string,
    changedBy: string = 'system'
  ): Promise<Application> {
    try {
      // Get current application
      const application = await this.getApplication(applicationId);

      // Update status
      const query = `
        UPDATE applications
        SET status = $2, last_updated_at = NOW(), notes = $3
        WHERE application_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [applicationId, status, notes]);

      // Record in history
      await this.recordHistory(applicationId, status, changedBy, notes);

      // Send notification
      await this.sendStatusNotification(application.userId, applicationId, status);

      logger.info('Application status updated', { applicationId, status, changedBy });

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update application status', { applicationId, status, error });
      throw error;
    }
  }

  /**
   * Submits an application
   * @param applicationId - Application ID
   * @returns Updated application
   */
  async submitApplication(applicationId: string): Promise<Application> {
    try {
      const query = `
        UPDATE applications
        SET 
          status = 'submitted',
          submitted_at = NOW(),
          last_updated_at = NOW(),
          current_stage = 'Under Review',
          estimated_completion_date = NOW() + INTERVAL '30 days'
        WHERE application_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [applicationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Application not found');
      }

      // Record in history
      await this.recordHistory(applicationId, 'submitted', 'user', 'Application submitted');

      // Get application to send notification
      const application = this.mapRowToApplication(result.rows[0]);
      await this.sendStatusNotification(application.userId, applicationId, 'submitted');

      logger.info('Application submitted', { applicationId });

      return application;
    } catch (error) {
      logger.error('Failed to submit application', { applicationId, error });
      throw error;
    }
  }

  /**
   * Gets application history
   * @param applicationId - Application ID
   * @returns Application history
   */
  async getApplicationHistory(applicationId: string): Promise<ApplicationHistory[]> {
    try {
      const query = `
        SELECT * FROM application_history
        WHERE application_id = $1
        ORDER BY changed_at DESC
      `;

      const result = await db.query(query, [applicationId]);

      return result.rows.map((row) => ({
        historyId: row.history_id,
        applicationId: row.application_id,
        status: row.status,
        changedAt: row.changed_at,
        changedBy: row.changed_by,
        notes: row.notes,
      }));
    } catch (error) {
      logger.error('Failed to get application history', { applicationId, error });
      throw error;
    }
  }

  /**
   * Gets status timeline with estimated dates
   * @param applicationId - Application ID
   * @param language - Preferred language
   * @returns Timeline
   */
  async getStatusTimeline(
    applicationId: string,
    language: Language
  ): Promise<{
    currentStage: string;
    estimatedCompletion: Date | null;
    stages: Array<{
      stage: string;
      status: 'completed' | 'current' | 'pending';
      completedAt?: Date;
      estimatedAt?: Date;
    }>;
  }> {
    try {
      const application = await this.getApplication(applicationId);
      const history = await this.getApplicationHistory(applicationId);

      // Define standard stages
      const standardStages = [
        'Application Created',
        'Documents Submitted',
        'Under Review',
        'Verification',
        'Approval',
        'Disbursement',
      ];

      const stages = standardStages.map((stage) => {
        const historyEntry = history.find((h) => h.notes?.includes(stage));

        if (historyEntry) {
          return {
            stage,
            status: 'completed' as const,
            completedAt: historyEntry.changedAt,
          };
        } else if (stage === application.currentStage) {
          return {
            stage,
            status: 'current' as const,
            estimatedAt: application.estimatedCompletionDate,
          };
        } else {
          return {
            stage,
            status: 'pending' as const,
          };
        }
      });

      return {
        currentStage: application.currentStage,
        estimatedCompletion: application.estimatedCompletionDate || null,
        stages,
      };
    } catch (error) {
      logger.error('Failed to get status timeline', { applicationId, error });
      throw error;
    }
  }

  /**
   * Records application history
   * @param applicationId - Application ID
   * @param status - Status
   * @param changedBy - Who changed it
   * @param notes - Optional notes
   */
  private async recordHistory(
    applicationId: string,
    status: ApplicationStatus,
    changedBy: string,
    notes?: string
  ): Promise<void> {
    const query = `
      INSERT INTO application_history (application_id, status, changed_at, changed_by, notes)
      VALUES ($1, $2, NOW(), $3, $4)
    `;

    await db.query(query, [applicationId, status, changedBy, notes]);
  }

  /**
   * Sends status notification
   * @param userId - User ID
   * @param applicationId - Application ID
   * @param status - New status
   */
  private async sendStatusNotification(
    userId: string,
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    try {
      // Get user profile for language
      const userQuery = 'SELECT preferred_language FROM users WHERE user_id = $1';
      const userResult = await db.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return;
      }

      const language = userResult.rows[0].preferred_language as Language;

      // Generate notification message
      const message = this.generateNotificationMessage(status, language);

      // Store notification
      const query = `
        INSERT INTO notifications (user_id, application_id, message, sent_at, read)
        VALUES ($1, $2, $3, NOW(), false)
      `;

      await db.query(query, [userId, applicationId, JSON.stringify(message)]);

      logger.info('Status notification sent', { userId, applicationId, status });
    } catch (error) {
      logger.error('Failed to send status notification', { userId, applicationId, error });
      // Don't throw - notification failure shouldn't block status update
    }
  }

  /**
   * Generates notification message
   * @param status - Application status
   * @param language - Language
   * @returns Message in all languages
   */
  private generateNotificationMessage(
    status: ApplicationStatus,
    language: Language
  ): Record<Language, string> {
    const messages: Record<ApplicationStatus, Record<Language, string>> = {
      draft: {
        en: 'Your application has been saved as draft',
        hi: 'आपका आवेदन ड्राफ्ट के रूप में सहेजा गया है',
        ta: 'உங்கள் விண்ணப்பம் வரைவாக சேமிக்கப்பட்டது',
        te: 'మీ దరఖాస్తు డ్రాఫ్ట్‌గా సేవ్ చేయబడింది',
        bn: 'আপনার আবেদন খসড়া হিসাবে সংরক্ষিত হয়েছে',
        mr: 'तुमचा अर्ज मसुदा म्हणून जतन केला आहे',
      },
      submitted: {
        en: 'Your application has been submitted successfully',
        hi: 'आपका आवेदन सफलतापूर्वक जमा किया गया है',
        ta: 'உங்கள் விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது',
        te: 'మీ దరఖాస్తు విజయవంతంగా సమర్పించబడింది',
        bn: 'আপনার আবেদন সফলভাবে জমা দেওয়া হয়েছে',
        mr: 'तुमचा अर्ज यशस्वीरित्या सबमिट केला आहे',
      },
      'under-review': {
        en: 'Your application is under review',
        hi: 'आपका आवेदन समीक्षाधीन है',
        ta: 'உங்கள் விண்ணப்பம் மதிப்பாய்வில் உள்ளது',
        te: 'మీ దరఖాస్తు సమీక్షలో ఉంది',
        bn: 'আপনার আবেদন পর্যালোচনাধীন',
        mr: 'तुमचा अर्ज पुनरावलोकनाधीन आहे',
      },
      'documents-required': {
        en: 'Additional documents are required for your application',
        hi: 'आपके आवेदन के लिए अतिरिक्त दस्तावेज़ आवश्यक हैं',
        ta: 'உங்கள் விண்ணப்பத்திற்கு கூடுதல் ஆவணங்கள் தேவை',
        te: 'మీ దరఖాస్తుకు అదనపు పత్రాలు అవసరం',
        bn: 'আপনার আবেদনের জন্য অতিরিক্ত নথি প্রয়োজন',
        mr: 'तुमच्या अर्जासाठी अतिरिक्त कागदपत्रे आवश्यक आहेत',
      },
      approved: {
        en: 'Congratulations! Your application has been approved',
        hi: 'बधाई हो! आपका आवेदन स्वीकृत हो गया है',
        ta: 'வாழ்த்துக்கள்! உங்கள் விண்ணப்பம் அங்கீகரிக்கப்பட்டது',
        te: 'అభినందనలు! మీ దరఖాస్తు ఆమోదించబడింది',
        bn: 'অভিনন্দন! আপনার আবেদন অনুমোদিত হয়েছে',
        mr: 'अभिनंदन! तुमचा अर्ज मंजूर झाला आहे',
      },
      rejected: {
        en: 'Your application has been rejected',
        hi: 'आपका आवेदन अस्वीकार कर दिया गया है',
        ta: 'உங்கள் விண்ணப்பம் நிராகரிக்கப்பட்டது',
        te: 'మీ దరఖాస్తు తిరస్కరించబడింది',
        bn: 'আপনার আবেদন প্রত্যাখ্যান করা হয়েছে',
        mr: 'तुमचा अर्ज नाकारला गेला आहे',
      },
      disbursed: {
        en: 'Benefits have been disbursed to your account',
        hi: 'लाभ आपके खाते में वितरित किए गए हैं',
        ta: 'பலன்கள் உங்கள் கணக்கில் வழங்கப்பட்டுள்ளன',
        te: 'ప్రయోజనాలు మీ ఖాతాకు పంపిణీ చేయబడ్డాయి',
        bn: 'সুবিধা আপনার অ্যাকাউন্টে বিতরণ করা হয়েছে',
        mr: 'फायदे तुमच्या खात्यात वितरित केले गेले आहेत',
      },
    };

    return messages[status];
  }

  /**
   * Generates reference number
   * @returns Reference number
   */
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `APP-${timestamp}-${random}`;
  }

  /**
   * Maps database row to Application
   * @param row - Database row
   * @returns Application
   */
  private mapRowToApplication(row: Record<string, any>): Application {
    return {
      applicationId: row.application_id,
      userId: row.user_id,
      schemeId: row.scheme_id,
      schemeName: row.scheme_name,
      referenceNumber: row.reference_number,
      status: row.status,
      submittedAt: row.submitted_at,
      lastUpdatedAt: row.last_updated_at,
      estimatedCompletionDate: row.estimated_completion_date,
      currentStage: row.current_stage,
      requiredDocuments: row.required_documents,
      submittedDocuments: row.submitted_documents,
      notes: row.notes,
    };
  }
}

export const progressTrackerService = new ProgressTrackerService();
