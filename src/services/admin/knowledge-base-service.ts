import { GovernmentScheme, Language } from '../../types';
import { db } from '../../db/connection';
import { vectorDB } from '../rag/vector-db';
import { embeddingService } from '../rag/embedding-service';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scheme version
 */
interface SchemeVersion {
  versionId: string;
  schemeId: string;
  version: number;
  changes: string;
  updatedBy: string;
  updatedAt: Date;
  data: Partial<GovernmentScheme>;
}

/**
 * Knowledge Base Service
 * Manages scheme data and versioning
 */
export class KnowledgeBaseService {
  /**
   * Creates a new scheme
   * @param scheme - Scheme data
   * @param createdBy - Admin user ID
   * @returns Created scheme
   */
  async createScheme(scheme: Omit<GovernmentScheme, 'schemeId'>, createdBy: string): Promise<GovernmentScheme> {
    try {
      const schemeId = uuidv4();

      // Validate scheme data
      this.validateScheme(scheme);

      const query = `
        INSERT INTO schemes (
          scheme_id, official_name, category, level, state,
          launch_date, end_date, active, official_website,
          helpline_number, version, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'verified')
        RETURNING *
      `;

      await db.query(query, [
        schemeId,
        scheme.officialName,
        scheme.category,
        scheme.level,
        scheme.state,
        scheme.launchDate,
        scheme.endDate,
        scheme.active,
        scheme.officialWebsite,
        scheme.helplineNumber,
      ]);

      // Insert multilingual content
      await this.insertSchemeContent(schemeId, scheme);

      // Insert eligibility rules
      await this.insertEligibilityRules(schemeId, scheme.eligibilityRules);

      // Index in vector database
      await this.indexScheme(schemeId, scheme);

      // Create version record
      await this.createVersion(schemeId, 1, 'Initial creation', createdBy, scheme);

      logger.info('Scheme created', { schemeId, createdBy });

      return { ...scheme, schemeId };
    } catch (error) {
      logger.error('Failed to create scheme', { error });
      throw error;
    }
  }

  /**
   * Updates an existing scheme
   * @param schemeId - Scheme ID
   * @param updates - Updated data
   * @param updatedBy - Admin user ID
   * @param changes - Description of changes
   * @returns Updated scheme
   */
  async updateScheme(
    schemeId: string,
    updates: Partial<GovernmentScheme>,
    updatedBy: string,
    changes: string
  ): Promise<GovernmentScheme> {
    try {
      // Get current version
      const currentScheme = await this.getScheme(schemeId);
      const newVersion = currentScheme.metadata.version + 1;

      // Update scheme
      const query = `
        UPDATE schemes
        SET 
          official_name = COALESCE($2, official_name),
          category = COALESCE($3, category),
          level = COALESCE($4, level),
          state = COALESCE($5, state),
          active = COALESCE($6, active),
          version = $7,
          last_updated = NOW()
        WHERE scheme_id = $1
        RETURNING *
      `;

      await db.query(query, [
        schemeId,
        updates.officialName,
        updates.category,
        updates.level,
        updates.state,
        updates.active,
        newVersion,
      ]);

      // Update multilingual content if provided
      if (updates.localizedNames || updates.shortDescription || updates.detailedDescription) {
        await this.updateSchemeContent(schemeId, updates);
      }

      // Update eligibility rules if provided
      if (updates.eligibilityRules) {
        await this.updateEligibilityRules(schemeId, updates.eligibilityRules);
      }

      // Re-index in vector database
      await this.reindexScheme(schemeId, updates);

      // Create version record
      await this.createVersion(schemeId, newVersion, changes, updatedBy, updates);

      // Flag affected recommendations
      await this.flagAffectedRecommendations(schemeId);

      logger.info('Scheme updated', { schemeId, version: newVersion, updatedBy });

      return await this.getScheme(schemeId);
    } catch (error) {
      logger.error('Failed to update scheme', { schemeId, error });
      throw error;
    }
  }

  /**
   * Gets scheme version history
   * @param schemeId - Scheme ID
   * @returns Version history
   */
  async getVersionHistory(schemeId: string): Promise<SchemeVersion[]> {
    try {
      const query = `
        SELECT * FROM scheme_versions
        WHERE scheme_id = $1
        ORDER BY version DESC
      `;

      const result = await db.query(query, [schemeId]);

      return result.rows.map((row) => ({
        versionId: row.version_id,
        schemeId: row.scheme_id,
        version: row.version,
        changes: row.changes,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
        data: row.data,
      }));
    } catch (error) {
      logger.error('Failed to get version history', { schemeId, error });
      throw error;
    }
  }

  /**
   * Rolls back to a previous version
   * @param schemeId - Scheme ID
   * @param targetVersion - Version to rollback to
   * @param rolledBackBy - Admin user ID
   * @returns Rolled back scheme
   */
  async rollbackToVersion(
    schemeId: string,
    targetVersion: number,
    rolledBackBy: string
  ): Promise<GovernmentScheme> {
    try {
      // Get target version data
      const versionQuery = `
        SELECT * FROM scheme_versions
        WHERE scheme_id = $1 AND version = $2
      `;

      const versionResult = await db.query(versionQuery, [schemeId, targetVersion]);

      if (versionResult.rows.length === 0) {
        throw new Error('Version not found');
      }

      const versionData = versionResult.rows[0].data;

      // Update scheme with version data
      return await this.updateScheme(
        schemeId,
        versionData,
        rolledBackBy,
        `Rolled back to version ${targetVersion}`
      );
    } catch (error) {
      logger.error('Failed to rollback scheme', { schemeId, targetVersion, error });
      throw error;
    }
  }

  /**
   * Parses and imports scheme document
   * @param document - Document content
   * @param format - Document format (pdf, docx, html)
   * @param createdBy - Admin user ID
   * @returns Parsed scheme data
   */
  async parseAndImportDocument(
    document: Buffer,
    format: 'pdf' | 'docx' | 'html',
    createdBy: string
  ): Promise<Partial<GovernmentScheme>> {
    try {
      // In production, use document parsing libraries (pdf-parse, mammoth, cheerio)
      logger.info('Document parsing initiated', { format, createdBy, size: document.length });

      // Placeholder implementation
      const parsedData: Partial<GovernmentScheme> = {
        officialName: 'Parsed Scheme Name',
        category: 'agriculture' as const,
        level: 'central',
        active: false, // Require manual review
      };

      return parsedData;
    } catch (error) {
      logger.error('Failed to parse document', { format, error });
      throw error;
    }
  }

  /**
   * Validates scheme data
   * @param scheme - Scheme data
   */
  private validateScheme(scheme: Partial<GovernmentScheme>): void {
    if (!scheme.officialName) {
      throw new Error('Official name is required');
    }

    if (!scheme.category) {
      throw new Error('Category is required');
    }

    if (!scheme.level) {
      throw new Error('Level is required');
    }

    if (scheme.level === 'state' && !scheme.state) {
      throw new Error('State is required for state-level schemes');
    }

    // Validate eligibility rules structure
    if (scheme.eligibilityRules) {
      for (const rule of scheme.eligibilityRules) {
        if (!rule.type || !rule.operator) {
          throw new Error('Invalid eligibility rule structure');
        }
      }
    }
  }

  /**
   * Inserts multilingual content
   * @param schemeId - Scheme ID
   * @param scheme - Scheme data
   */
  private async insertSchemeContent(schemeId: string, scheme: Partial<GovernmentScheme>): Promise<void> {
    const languages: Language[] = ['en', 'hi', 'ta', 'te', 'bn', 'mr'];

    for (const lang of languages) {
      const query = `
        INSERT INTO scheme_content (scheme_id, language, localized_name, short_description, detailed_description)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await db.query(query, [
        schemeId,
        lang,
        scheme.localizedNames?.[lang] || scheme.officialName,
        scheme.shortDescription?.[lang] || '',
        scheme.detailedDescription?.[lang] || '',
      ]);
    }
  }

  /**
   * Updates multilingual content
   * @param schemeId - Scheme ID
   * @param updates - Updated data
   */
  private async updateSchemeContent(schemeId: string, updates: Partial<GovernmentScheme>): Promise<void> {
    const languages: Language[] = ['en', 'hi', 'ta', 'te', 'bn', 'mr'];

    for (const lang of languages) {
      const query = `
        UPDATE scheme_content
        SET 
          localized_name = COALESCE($3, localized_name),
          short_description = COALESCE($4, short_description),
          detailed_description = COALESCE($5, detailed_description)
        WHERE scheme_id = $1 AND language = $2
      `;

      await db.query(query, [
        schemeId,
        lang,
        updates.localizedNames?.[lang],
        updates.shortDescription?.[lang],
        updates.detailedDescription?.[lang],
      ]);
    }
  }

  /**
   * Inserts eligibility rules
   * @param schemeId - Scheme ID
   * @param rules - Eligibility rules
   */
  private async insertEligibilityRules(schemeId: string, rules: any[]): Promise<void> {
    for (const rule of rules) {
      const query = `
        INSERT INTO eligibility_rules (scheme_id, rule_type, operator, parameters)
        VALUES ($1, $2, $3, $4)
      `;

      await db.query(query, [schemeId, rule.type, rule.operator, JSON.stringify(rule.parameters)]);
    }
  }

  /**
   * Updates eligibility rules
   * @param schemeId - Scheme ID
   * @param rules - Updated rules
   */
  private async updateEligibilityRules(schemeId: string, rules: any[]): Promise<void> {
    // Delete existing rules
    await db.query('DELETE FROM eligibility_rules WHERE scheme_id = $1', [schemeId]);

    // Insert new rules
    await this.insertEligibilityRules(schemeId, rules);
  }

  /**
   * Indexes scheme in vector database
   * @param schemeId - Scheme ID
   * @param scheme - Scheme data
   */
  private async indexScheme(schemeId: string, scheme: Partial<GovernmentScheme>): Promise<void> {
    try {
      // Create document text
      const text = `${scheme.officialName}\n${scheme.shortDescription?.en || ''}\n${scheme.detailedDescription?.en || ''}`;

      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(text);

      // Store in vector database
      await vectorDB.upsert([
        {
          id: schemeId,
          values: embedding,
          metadata: {
            schemeId,
            schemeName: scheme.officialName || '',
            category: scheme.category || '',
            content: text,
          },
        },
      ]);

      logger.info('Scheme indexed', { schemeId });
    } catch (error) {
      logger.error('Failed to index scheme', { schemeId, error });
    }
  }

  /**
   * Re-indexes scheme in vector database
   * @param schemeId - Scheme ID
   * @param updates - Updated data
   */
  private async reindexScheme(schemeId: string, updates: Partial<GovernmentScheme>): Promise<void> {
    // Get full scheme data
    const scheme = await this.getScheme(schemeId);

    // Re-index with updated data
    await this.indexScheme(schemeId, { ...scheme, ...updates });
  }

  /**
   * Creates version record
   * @param schemeId - Scheme ID
   * @param version - Version number
   * @param changes - Description of changes
   * @param updatedBy - Admin user ID
   * @param data - Scheme data
   */
  private async createVersion(
    schemeId: string,
    version: number,
    changes: string,
    updatedBy: string,
    data: Partial<GovernmentScheme>
  ): Promise<void> {
    const query = `
      INSERT INTO scheme_versions (scheme_id, version, changes, updated_by, data)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await db.query(query, [schemeId, version, changes, updatedBy, JSON.stringify(data)]);
  }

  /**
   * Flags affected recommendations
   * @param schemeId - Scheme ID
   */
  private async flagAffectedRecommendations(schemeId: string): Promise<void> {
    try {
      // Get users who have this scheme in their recommendations
      const query = `
        SELECT DISTINCT user_id
        FROM user_recommendations
        WHERE scheme_id = $1
      `;

      const result = await db.query(query, [schemeId]);

      // Flag recommendations for review
      for (const row of result.rows as Array<{ user_id: string }>) {
        await db.query(
          `UPDATE user_recommendations 
           SET needs_review = true, flagged_at = NOW() 
           WHERE user_id = $1 AND scheme_id = $2`,
          [row.user_id, schemeId]
        );
      }

      logger.info('Recommendations flagged', { schemeId, affectedUsers: result.rows.length });
    } catch (error) {
      logger.error('Failed to flag recommendations', { schemeId, error });
    }
  }

  /**
   * Gets scheme by ID
   * @param schemeId - Scheme ID
   * @returns Government scheme
   */
  private async getScheme(schemeId: string): Promise<GovernmentScheme> {
    const query = 'SELECT * FROM schemes WHERE scheme_id = $1';
    const result = await db.query(query, [schemeId]);

    if (result.rows.length === 0) {
      throw new Error('Scheme not found');
    }

    // Map to GovernmentScheme (simplified)
    return result.rows[0] as any;
  }

  /**
   * Translates scheme to all supported languages
   * @param schemeId - Scheme ID
   * @param sourceLanguage - Source language
   * @returns Translation status
   */
  async translateScheme(schemeId: string, sourceLanguage: Language = 'en'): Promise<void> {
    try {
      const { translationService } = await import('../translation/translation-service');

      // Get scheme content in source language
      const contentQuery = `
        SELECT * FROM scheme_content
        WHERE scheme_id = $1 AND language = $2
      `;

      const result = await db.query(contentQuery, [schemeId, sourceLanguage]);

      if (result.rows.length === 0) {
        throw new Error('Source content not found');
      }

      const sourceContent = result.rows[0];
      const allLanguages: Language[] = ['hi', 'ta', 'te', 'bn', 'mr', 'en'];
      const targetLanguages = allLanguages.filter((lang) => lang !== sourceLanguage);

      // Translate to each target language
      for (const targetLang of targetLanguages) {
        const translatedName = await translationService.translate(
          sourceContent.localized_name,
          sourceLanguage,
          targetLang
        );

        const translatedShortDesc = await translationService.translate(
          sourceContent.short_description,
          sourceLanguage,
          targetLang
        );

        const translatedDetailedDesc = await translationService.translate(
          sourceContent.detailed_description,
          sourceLanguage,
          targetLang
        );

        // Update or insert translated content
        const upsertQuery = `
          INSERT INTO scheme_content (scheme_id, language, localized_name, short_description, detailed_description)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (scheme_id, language)
          DO UPDATE SET
            localized_name = EXCLUDED.localized_name,
            short_description = EXCLUDED.short_description,
            detailed_description = EXCLUDED.detailed_description
        `;

        await db.query(upsertQuery, [
          schemeId,
          targetLang,
          translatedName,
          translatedShortDesc,
          translatedDetailedDesc,
        ]);
      }

      logger.info('Scheme translated', { schemeId, sourceLanguage, targetLanguages });
    } catch (error) {
      logger.error('Failed to translate scheme', { schemeId, error });
      throw error;
    }
  }

  /**
   * Syncs scheme data from government API
   * @param apiEndpoint - Government API endpoint
   * @param apiKey - API key (if required)
   * @returns Synced schemes count
   */
  async syncFromGovernmentAPI(apiEndpoint: string, apiKey?: string): Promise<number> {
    try {
      // In production, integrate with actual government APIs
      // Examples: MyScheme API, DBT Bharat API, etc.
      logger.info('Syncing from government API', { apiEndpoint });

      // Placeholder implementation
      // In real implementation:
      // 1. Fetch data from government API
      // 2. Parse and validate data
      // 3. Create or update schemes
      // 4. Handle errors and retries

      const syncedCount = 0;

      logger.info('Government API sync completed', { syncedCount });

      return syncedCount;
    } catch (error) {
      logger.error('Failed to sync from government API', { apiEndpoint, error });
      throw error;
    }
  }

  /**
   * Schedules periodic sync from government APIs
   * @param apiEndpoint - Government API endpoint
   * @param intervalHours - Sync interval in hours
   */
  schedulePeriodicSync(apiEndpoint: string, intervalHours: number = 24): void {
    setInterval(
      async () => {
        try {
          await this.syncFromGovernmentAPI(apiEndpoint);
        } catch (error) {
          logger.error('Scheduled sync failed', { apiEndpoint, error });
        }
      },
      intervalHours * 60 * 60 * 1000
    );

    logger.info('Periodic sync scheduled', { apiEndpoint, intervalHours });
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
