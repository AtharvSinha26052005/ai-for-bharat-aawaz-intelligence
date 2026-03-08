import { db } from '../db/connection';
import { InterestedSchemeData, InterestedSchemeCreateRequest } from '../types/interested-schemes';

export class InterestedSchemesRepository {
  async insert(scheme: InterestedSchemeCreateRequest): Promise<string> {
    const query = `
      INSERT INTO interested_schemes (
        profile_id, scheme_name, scheme_slug, scheme_description,
        scheme_benefits, scheme_ministry, scheme_apply_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (profile_id, scheme_slug) DO NOTHING
      RETURNING id
    `;

    const values = [
      scheme.profile_id,
      scheme.scheme_name,
      scheme.scheme_slug || null,
      scheme.scheme_description || null,
      scheme.scheme_benefits || null,
      scheme.scheme_ministry || null,
      scheme.scheme_apply_link || null,
    ];

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      // Scheme already exists, return existing ID
      const existingQuery = `
        SELECT id FROM interested_schemes 
        WHERE profile_id = $1 AND scheme_slug = $2
      `;
      const existingResult = await db.query(existingQuery, [scheme.profile_id, scheme.scheme_slug]);
      return existingResult.rows[0].id;
    }
    
    return result.rows[0].id;
  }

  async findByProfileId(profileId: string): Promise<InterestedSchemeData[]> {
    const query = `
      SELECT * FROM interested_schemes 
      WHERE profile_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [profileId]);
    return result.rows as InterestedSchemeData[];
  }

  async deleteById(id: string, profileId: string): Promise<boolean> {
    const query = `
      DELETE FROM interested_schemes 
      WHERE id = $1 AND profile_id = $2
    `;
    const result = await db.query(query, [id, profileId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async exists(profileId: string, schemeSlug: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM interested_schemes 
        WHERE profile_id = $1 AND scheme_slug = $2
      ) as exists
    `;
    const result = await db.query(query, [profileId, schemeSlug]);
    return result.rows[0].exists;
  }
}
