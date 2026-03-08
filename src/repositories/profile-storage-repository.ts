import { db } from '../db/connection';
import { ProfileData } from '../types/profile-storage';

export class ProfileStorageRepository {
  async insert(profile: Omit<ProfileData, 'created_at'>): Promise<string> {
    const query = `
      INSERT INTO user_profiles (
        id, age, income_range, phone_number, aadhar_number, 
        gender, caste, occupation, state, district, 
        block, village, pincode, preferred_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      profile.id,
      profile.age,
      profile.income_range,
      profile.phone_number,
      profile.aadhar_number,
      profile.gender,
      profile.caste,
      profile.occupation,
      profile.state,
      profile.district,
      profile.block,
      profile.village,
      profile.pincode,
      profile.preferred_mode,
    ];

    const result = await db.query(query, values);
    return result.rows[0].id;
  }

  async findById(profileId: string): Promise<ProfileData | null> {
    const query = 'SELECT * FROM user_profiles WHERE id = $1';
    const result = await db.query(query, [profileId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as ProfileData;
  }
}
