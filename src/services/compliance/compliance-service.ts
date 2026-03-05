import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Data deletion request
 */
interface DataDeletionRequest {
  requestId: string;
  userId: string;
  requestedAt: Date;
  scheduledDeletionDate: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

/**
 * Data sharing consent
 */
interface DataSharingConsent {
  userId: string;
  thirdParty: string;
  purpose: string;
  consentGiven: boolean;
  consentDate: Date;
  expiryDate?: Date;
}

/**
 * Compliance Service
 * Handles DPDPA compliance, data deletion, and consent management
 */
export class ComplianceService {
  /**
   * Requests data deletion for a user
   * @param userId - User ID
   * @returns Deletion request
   */
  async requestDataDeletion(userId: string): Promise<DataDeletionRequest> {
    try {
      const requestId = uuidv4();
      const requestedAt = new Date();
      const scheduledDeletionDate = new Date();
      scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30); // 30 days from now

      // Create deletion request
      const query = `
        INSERT INTO data_deletion_requests (request_id, user_id, requested_at, scheduled_deletion_date, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `;

      await db.query(query, [requestId, userId, requestedAt, scheduledDeletionDate]);

      // Log the request
      await this.logAuditEvent(userId, 'data_deletion_requested', { requestId });

      logger.info('Data deletion requested', { userId, requestId, scheduledDeletionDate });

      return {
        requestId,
        userId,
        requestedAt,
        scheduledDeletionDate,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to request data deletion', { userId, error });
      throw error;
    }
  }

  /**
   * Executes pending data deletions
   */
  async executePendingDeletions(): Promise<number> {
    try {
      // Get pending deletions that are due
      const query = `
        SELECT * FROM data_deletion_requests
        WHERE status = 'pending' AND scheduled_deletion_date <= NOW()
      `;

      const result = await db.query(query);
      let deletedCount = 0;

      for (const request of result.rows) {
        await this.deleteUserData(request.user_id);

        // Mark request as completed
        await db.query(
          `UPDATE data_deletion_requests SET status = 'completed', completed_at = NOW() WHERE request_id = $1`,
          [request.request_id]
        );

        deletedCount++;
      }

      logger.info('Pending deletions executed', { deletedCount });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to execute pending deletions', { error });
      throw error;
    }
  }

  /**
   * Deletes all user data
   * @param userId - User ID
   */
  private async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in order to respect foreign key constraints
      await db.query('DELETE FROM learning_progress WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM fraud_reports WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM application_history WHERE application_id IN (SELECT application_id FROM applications WHERE user_id = $1)', [userId]);
      await db.query('DELETE FROM applications WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM user_recommendations WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM conversation_history WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM data_sharing_consents WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM users WHERE user_id = $1', [userId]);

      logger.info('User data deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user data', { userId, error });
      throw error;
    }
  }

  /**
   * Records data sharing consent
   * @param consent - Consent details
   */
  async recordDataSharingConsent(consent: DataSharingConsent): Promise<void> {
    try {
      const query = `
        INSERT INTO data_sharing_consents (user_id, third_party, purpose, consent_given, consent_date, expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, third_party, purpose)
        DO UPDATE SET
          consent_given = EXCLUDED.consent_given,
          consent_date = EXCLUDED.consent_date,
          expiry_date = EXCLUDED.expiry_date
      `;

      await db.query(query, [
        consent.userId,
        consent.thirdParty,
        consent.purpose,
        consent.consentGiven,
        consent.consentDate,
        consent.expiryDate,
      ]);

      // Log the consent
      await this.logAuditEvent(consent.userId, 'data_sharing_consent_updated', {
        thirdParty: consent.thirdParty,
        purpose: consent.purpose,
        consentGiven: consent.consentGiven,
      });

      logger.info('Data sharing consent recorded', { userId: consent.userId, thirdParty: consent.thirdParty });
    } catch (error) {
      logger.error('Failed to record data sharing consent', { error });
      throw error;
    }
  }

  /**
   * Checks if data sharing is allowed
   * @param userId - User ID
   * @param thirdParty - Third party name
   * @param purpose - Purpose of sharing
   * @returns Whether sharing is allowed
   */
  async checkDataSharingConsent(userId: string, thirdParty: string, purpose: string): Promise<boolean> {
    try {
      const query = `
        SELECT consent_given, expiry_date
        FROM data_sharing_consents
        WHERE user_id = $1 AND third_party = $2 AND purpose = $3
      `;

      const result = await db.query(query, [userId, thirdParty, purpose]);

      if (result.rows.length === 0) {
        return false; // No consent recorded
      }

      const consent = result.rows[0];

      // Check if consent is still valid
      if (consent.expiry_date && new Date(consent.expiry_date) < new Date()) {
        return false; // Consent expired
      }

      return consent.consent_given;
    } catch (error) {
      logger.error('Failed to check data sharing consent', { userId, thirdParty, purpose, error });
      return false; // Fail closed
    }
  }

  /**
   * Logs data sharing event
   * @param userId - User ID
   * @param thirdParty - Third party name
   * @param purpose - Purpose of sharing
   * @param dataShared - Data that was shared
   */
  async logDataSharingEvent(
    userId: string,
    thirdParty: string,
    purpose: string,
    dataShared: Record<string, any>
  ): Promise<void> {
    try {
      await this.logAuditEvent(userId, 'data_shared', {
        thirdParty,
        purpose,
        dataShared,
      });

      logger.info('Data sharing event logged', { userId, thirdParty, purpose });
    } catch (error) {
      logger.error('Failed to log data sharing event', { userId, thirdParty, purpose, error });
    }
  }

  /**
   * Gets user's data sharing preferences
   * @param userId - User ID
   * @returns Data sharing preferences
   */
  async getDataSharingPreferences(userId: string): Promise<DataSharingConsent[]> {
    try {
      const query = `
        SELECT * FROM data_sharing_consents
        WHERE user_id = $1
        ORDER BY consent_date DESC
      `;

      const result = await db.query(query, [userId]);

      return result.rows.map((row) => ({
        userId: row.user_id,
        thirdParty: row.third_party,
        purpose: row.purpose,
        consentGiven: row.consent_given,
        consentDate: row.consent_date,
        expiryDate: row.expiry_date,
      }));
    } catch (error) {
      logger.error('Failed to get data sharing preferences', { userId, error });
      throw error;
    }
  }

  /**
   * Generates privacy notice
   * @param language - Language code
   * @returns Privacy notice text
   */
  getPrivacyNotice(language: string): string {
    const notices: Record<string, string> = {
      en: `Privacy Notice

We collect and process your personal information to help you access government welfare schemes and financial literacy resources.

Data We Collect:
- Basic profile information (age, income, location, occupation)
- Contact information (phone number)
- Application and interaction history

How We Use Your Data:
- Determine your eligibility for government schemes
- Provide personalized recommendations
- Track your application progress
- Deliver financial education content

Your Rights:
- Access your data
- Correct inaccurate data
- Request data deletion
- Withdraw consent
- Data portability

Data Security:
- All data is encrypted at rest and in transit
- Data is stored in India
- Access is restricted to authorized personnel only

Contact: For privacy concerns, contact our Data Protection Officer at privacy@example.com`,

      hi: `गोपनीयता सूचना

हम आपकी व्यक्तिगत जानकारी एकत्र और संसाधित करते हैं ताकि आप सरकारी कल्याण योजनाओं और वित्तीय साक्षरता संसाधनों तक पहुंच सकें।

हम जो डेटा एकत्र करते हैं:
- बुनियादी प्रोफ़ाइल जानकारी (आयु, आय, स्थान, व्यवसाय)
- संपर्क जानकारी (फोन नंबर)
- आवेदन और इंटरैक्शन इतिहास

हम आपके डेटा का उपयोग कैसे करते हैं:
- सरकारी योजनाओं के लिए आपकी पात्रता निर्धारित करना
- व्यक्तिगत सिफारिशें प्रदान करना
- आपके आवेदन की प्रगति को ट्रैक करना
- वित्तीय शिक्षा सामग्री प्रदान करना

आपके अधिकार:
- अपने डेटा तक पहुंच
- गलत डेटा को सही करना
- डेटा हटाने का अनुरोध
- सहमति वापस लेना
- डेटा पोर्टेबिलिटी

डेटा सुरक्षा:
- सभी डेटा एन्क्रिप्टेड है
- डेटा भारत में संग्रहीत है
- केवल अधिकृत कर्मियों तक पहुंच प्रतिबंधित है`,
    };

    return notices[language] || notices.en;
  }

  /**
   * Logs audit event
   * @param userId - User ID
   * @param eventType - Event type
   * @param metadata - Event metadata
   */
  private async logAuditEvent(
    userId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, event_type, metadata, timestamp)
        VALUES ($1, $2, $3, NOW())
      `;

      await db.query(query, [userId, eventType, JSON.stringify(metadata)]);
    } catch (error) {
      logger.error('Failed to log audit event', { userId, eventType, error });
    }
  }

  /**
   * Schedules periodic deletion execution
   */
  schedulePeriodicDeletions(): void {
    // Run every 24 hours
    setInterval(
      async () => {
        try {
          await this.executePendingDeletions();
        } catch (error) {
          logger.error('Scheduled deletion execution failed', { error });
        }
      },
      24 * 60 * 60 * 1000
    );

    logger.info('Periodic deletion execution scheduled');
  }
}

export const complianceService = new ComplianceService();
