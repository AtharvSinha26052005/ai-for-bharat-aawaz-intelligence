import { UserProfile, Location, FamilyComposition } from '../../types';
import { db } from '../../db/connection';
import { encrypt, decrypt } from '../../utils/encryption';
import { validate, userProfileSchema, isValidAge, isValidLocation } from '../../utils/validation';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CreateProfileRequest {
  phoneNumber?: string;
  age: number;
  incomeRange: string;
  occupation: string;
  familyComposition: FamilyComposition;
  location: Location;
  primaryNeeds: string[];
  preferredLanguage: string;
  preferredMode: 'voice' | 'text' | 'both';
  consentGiven: boolean;
}

export interface UpdateProfileRequest extends Partial<CreateProfileRequest> {}

/**
 * Profile Manager Service
 * Handles user profile CRUD operations with encryption
 */
export class ProfileService {
  /**
   * Creates a new user profile
   * @param data - Profile data
   * @returns Created profile
   */
  async createProfile(data: CreateProfileRequest): Promise<UserProfile> {
    try {
      // Validate input
      const validatedData = validate<UserProfile>(userProfileSchema, data);

      // Additional validation
      if (!isValidAge(validatedData.age)) {
        throw new BadRequestError('Age must be between 1 and 120');
      }

      if (!isValidLocation(validatedData.location)) {
        throw new BadRequestError('Location must include state and district');
      }

      if (!validatedData.consentGiven) {
        throw new BadRequestError('User consent is required');
      }

      // Generate user ID
      const userId = uuidv4();

      // Encrypt sensitive data
      const phoneNumberEncrypted = validatedData.phoneNumber
        ? Buffer.from(encrypt(validatedData.phoneNumber))
        : null;

      // Insert into database
      const query = `
        INSERT INTO users (
          user_id, phone_number_encrypted, age, income_range, occupation,
          family_adults, family_children, family_seniors,
          location_state, location_district, location_block, location_village, location_pincode,
          primary_needs, preferred_language, preferred_mode,
          consent_given, consent_date, created_at, updated_at, last_active_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      const values = [
        userId,
        phoneNumberEncrypted,
        validatedData.age,
        validatedData.incomeRange,
        validatedData.occupation,
        validatedData.familyComposition.adults,
        validatedData.familyComposition.children,
        validatedData.familyComposition.seniors,
        validatedData.location.state,
        validatedData.location.district,
        validatedData.location.block || null,
        validatedData.location.village || null,
        validatedData.location.pincode || null,
        validatedData.primaryNeeds,
        validatedData.preferredLanguage,
        validatedData.preferredMode,
        validatedData.consentGiven,
        new Date(),
      ];

      const result = await db.query(query, values);
      const profile = this.mapRowToProfile(result.rows[0]);

      // Log audit trail
      await this.logAudit(userId, 'profile_created', { userId });

      logger.info('Profile created', { userId });

      return profile;
    } catch (error) {
      logger.error('Profile creation failed', { error });
      throw error;
    }
  }

  /**
   * Retrieves a user profile by ID
   * @param userId - User ID
   * @returns User profile
   */
  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const query = 'SELECT * FROM users WHERE user_id = $1';
      const result = await db.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Profile not found');
      }

      const profile = this.mapRowToProfile(result.rows[0]);

      // Update last active timestamp
      await db.query('UPDATE users SET last_active_at = NOW() WHERE user_id = $1', [userId]);

      logger.info('Profile retrieved', { userId });

      return profile;
    } catch (error) {
      logger.error('Profile retrieval failed', { userId, error });
      throw error;
    }
  }

  /**
   * Updates a user profile
   * @param userId - User ID
   * @param data - Updated profile data
   * @returns Updated profile
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      // Check if profile exists
      await this.getProfile(userId);

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.phoneNumber !== undefined) {
        updates.push(`phone_number_encrypted = $${paramIndex++}`);
        values.push(data.phoneNumber ? Buffer.from(encrypt(data.phoneNumber)) : null);
      }

      if (data.age !== undefined) {
        if (!isValidAge(data.age)) {
          throw new BadRequestError('Age must be between 1 and 120');
        }
        updates.push(`age = $${paramIndex++}`);
        values.push(data.age);
      }

      if (data.incomeRange !== undefined) {
        updates.push(`income_range = $${paramIndex++}`);
        values.push(data.incomeRange);
      }

      if (data.occupation !== undefined) {
        updates.push(`occupation = $${paramIndex++}`);
        values.push(data.occupation);
      }

      if (data.familyComposition !== undefined) {
        updates.push(`family_adults = $${paramIndex++}`);
        values.push(data.familyComposition.adults);
        updates.push(`family_children = $${paramIndex++}`);
        values.push(data.familyComposition.children);
        updates.push(`family_seniors = $${paramIndex++}`);
        values.push(data.familyComposition.seniors);
      }

      if (data.location !== undefined) {
        if (!isValidLocation(data.location)) {
          throw new BadRequestError('Location must include state and district');
        }
        updates.push(`location_state = $${paramIndex++}`);
        values.push(data.location.state);
        updates.push(`location_district = $${paramIndex++}`);
        values.push(data.location.district);
        updates.push(`location_block = $${paramIndex++}`);
        values.push(data.location.block || null);
        updates.push(`location_village = $${paramIndex++}`);
        values.push(data.location.village || null);
        updates.push(`location_pincode = $${paramIndex++}`);
        values.push(data.location.pincode || null);
      }

      if (data.primaryNeeds !== undefined) {
        updates.push(`primary_needs = $${paramIndex++}`);
        values.push(data.primaryNeeds);
      }

      if (data.preferredLanguage !== undefined) {
        updates.push(`preferred_language = $${paramIndex++}`);
        values.push(data.preferredLanguage);
      }

      if (data.preferredMode !== undefined) {
        updates.push(`preferred_mode = $${paramIndex++}`);
        values.push(data.preferredMode);
      }

      if (updates.length === 0) {
        throw new BadRequestError('No fields to update');
      }

      // Add updated_at
      updates.push(`updated_at = NOW()`);

      // Add userId to values
      values.push(userId);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);
      const profile = this.mapRowToProfile(result.rows[0]);

      // Log audit trail
      await this.logAudit(userId, 'profile_updated', { userId, updates: Object.keys(data) });

      logger.info('Profile updated', { userId });

      return profile;
    } catch (error) {
      logger.error('Profile update failed', { userId, error });
      throw error;
    }
  }

  /**
   * Deletes a user profile
   * @param userId - User ID
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      // Check if profile exists
      await this.getProfile(userId);

      // Log audit trail before deletion
      await this.logAudit(userId, 'profile_deleted', { userId });

      // Delete profile (cascade will delete related records)
      const query = 'DELETE FROM users WHERE user_id = $1';
      await db.query(query, [userId]);

      logger.info('Profile deleted', { userId });
    } catch (error) {
      logger.error('Profile deletion failed', { userId, error });
      throw error;
    }
  }

  /**
   * Maps database row to UserProfile object
   * @param row - Database row
   * @returns UserProfile
   */
  private mapRowToProfile(row: any): UserProfile {
    return {
      userId: row.user_id,
      phoneNumber: row.phone_number_encrypted
        ? decrypt(row.phone_number_encrypted.toString())
        : undefined,
      age: row.age,
      incomeRange: row.income_range,
      occupation: row.occupation,
      familyComposition: {
        adults: row.family_adults,
        children: row.family_children,
        seniors: row.family_seniors,
      },
      location: {
        state: row.location_state,
        district: row.location_district,
        block: row.location_block,
        village: row.location_village,
        pincode: row.location_pincode,
      },
      primaryNeeds: row.primary_needs,
      preferredLanguage: row.preferred_language,
      preferredMode: row.preferred_mode,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  }

  /**
   * Logs audit trail for profile operations
   * @param userId - User ID
   * @param action - Action performed
   * @param details - Additional details
   */
  private async logAudit(userId: string, action: string, details: any): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await db.query(query, [userId, action, 'profile', userId, JSON.stringify(details)]);
    } catch (error) {
      logger.error('Audit logging failed', { error });
      // Don't throw error, just log it
    }
  }

  /**
   * Checks if a profile exists
   * @param userId - User ID
   * @returns True if exists
   */
  async profileExists(userId: string): Promise<boolean> {
    try {
      const query = 'SELECT user_id FROM users WHERE user_id = $1';
      const result = await db.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Profile existence check failed', { userId, error });
      return false;
    }
  }
}

export const profileService = new ProfileService();
