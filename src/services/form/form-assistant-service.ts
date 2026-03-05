import { GovernmentScheme, UserProfile, Language } from '../../types';
import { ragService } from '../rag/rag-service';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';

/**
 * Document requirement with alternatives
 */
interface DocumentRequirement {
  documentType: string;
  description: string;
  mandatory: boolean;
  alternatives?: string[];
  howToObtain?: string;
}

/**
 * Form field guidance
 */
interface FormFieldGuidance {
  fieldName: string;
  description: string;
  example: string;
  commonMistakes: string[];
  validationRules?: string;
}

/**
 * Application guide
 */
interface ApplicationGuide {
  schemeId: string;
  schemeName: string;
  steps: string[];
  documentChecklist: DocumentRequirement[];
  fieldGuidance: FormFieldGuidance[];
  submissionInstructions: {
    method: string[];
    locations: string[];
    timeline: string;
    additionalNotes: string;
  };
  commonMistakes: string[];
}

/**
 * Form Assistant Service
 * Provides step-by-step guidance for scheme applications
 */
export class FormAssistantService {
  /**
   * Generates complete application guide for a scheme
   * @param schemeId - Scheme ID
   * @param userId - User ID
   * @param language - Preferred language
   * @returns Application guide
   */
  async generateApplicationGuide(
    schemeId: string,
    userId: string,
    language: Language
  ): Promise<ApplicationGuide> {
    try {
      // Get scheme details
      const scheme = await this.getScheme(schemeId);
      
      // Get user profile for personalization
      const profile = await this.getUserProfile(userId);

      // Generate step-by-step guide
      const steps = await this.generateSteps(scheme, profile, language);

      // Generate document checklist
      const documentChecklist = await this.generateDocumentChecklist(scheme, profile, language);

      // Generate field guidance
      const fieldGuidance = await this.generateFieldGuidance(scheme, profile, language);

      // Generate submission instructions
      const submissionInstructions = await this.generateSubmissionInstructions(
        scheme,
        profile,
        language
      );

      // Identify common mistakes
      const commonMistakes = await this.identifyCommonMistakes(scheme, language);

      const guide: ApplicationGuide = {
        schemeId: scheme.schemeId,
        schemeName: scheme.officialName,
        steps,
        documentChecklist,
        fieldGuidance,
        submissionInstructions,
        commonMistakes,
      };

      logger.info('Application guide generated', { schemeId, userId, language });

      return guide;
    } catch (error) {
      logger.error('Failed to generate application guide', { schemeId, userId, error });
      throw error;
    }
  }

  /**
   * Suggests document alternatives when required documents are unavailable
   * @param documentType - Type of document
   * @param language - Preferred language
   * @returns Document alternatives
   */
  async suggestDocumentAlternatives(
    documentType: string,
    language: Language
  ): Promise<DocumentRequirement> {
    try {
      // Query RAG system for document alternatives
      const query = `What are acceptable alternatives for ${documentType} document in government scheme applications?`;
      const response = await ragService.retrieveAndGenerate(query, language);

      // Parse alternatives from response
      const alternatives = this.parseAlternatives(response.answer);

      // Get how to obtain instructions
      const howToObtainQuery = `How to obtain ${documentType} document in India?`;
      const howToObtainResponse = await ragService.retrieveAndGenerate(howToObtainQuery, language);

      const requirement: DocumentRequirement = {
        documentType,
        description: response.answer,
        mandatory: true,
        alternatives,
        howToObtain: howToObtainResponse.answer,
      };

      logger.info('Document alternatives suggested', { documentType, language });

      return requirement;
    } catch (error) {
      logger.error('Failed to suggest document alternatives', { documentType, error });
      throw error;
    }
  }

  /**
   * Generates step-by-step application guide
   * @param scheme - Government scheme
   * @param profile - User profile
   * @param language - Preferred language
   * @returns Array of steps
   */
  private async generateSteps(
    scheme: GovernmentScheme,
    profile: UserProfile,
    language: Language
  ): Promise<string[]> {
    const query = `Provide step-by-step instructions for applying to ${scheme.officialName} scheme for a ${profile.occupation} from ${profile.location.district}, ${profile.location.state}`;
    
    const response = await ragService.retrieveAndGenerate(query, language, profile);

    // Parse steps from response (assuming numbered list format)
    const steps = this.parseSteps(response.answer);

    return steps;
  }

  /**
   * Generates document checklist
   * @param scheme - Government scheme
   * @param profile - User profile
   * @param language - Preferred language
   * @returns Document checklist
   */
  private async generateDocumentChecklist(
    scheme: GovernmentScheme,
    profile: UserProfile,
    language: Language
  ): Promise<DocumentRequirement[]> {
    const checklist: DocumentRequirement[] = [];

    // Get required documents from scheme
    for (const doc of scheme.requiredDocuments) {
      const docName = doc.documentName;
      const alternatives = await this.getDocumentAlternatives(docName, language);
      const howToObtain = await this.getHowToObtain(docName, language);

      checklist.push({
        documentType: docName,
        description: `${docName} is required for ${scheme.officialName}`,
        mandatory: true,
        alternatives,
        howToObtain,
      });
    }

    return checklist;
  }

  /**
   * Generates field-by-field guidance
   * @param scheme - Government scheme
   * @param profile - User profile
   * @param language - Preferred language
   * @returns Field guidance
   */
  private async generateFieldGuidance(
    scheme: GovernmentScheme,
    profile: UserProfile,
    language: Language
  ): Promise<FormFieldGuidance[]> {
    // Common form fields for government schemes
    const commonFields = [
      'Full Name',
      'Date of Birth',
      'Aadhaar Number',
      'Mobile Number',
      'Address',
      'Income',
      'Bank Account Number',
      'IFSC Code',
    ];

    const guidance: FormFieldGuidance[] = [];

    for (const field of commonFields) {
      const query = `Explain how to fill the "${field}" field in ${scheme.officialName} application form with example for ${profile.occupation}`;
      const response = await ragService.retrieveAndGenerate(query, language, profile);

      guidance.push({
        fieldName: field,
        description: response.answer,
        example: this.generateExample(field, profile),
        commonMistakes: await this.getCommonMistakesForField(field, language),
      });
    }

    return guidance;
  }

  /**
   * Generates submission instructions
   * @param scheme - Government scheme
   * @param profile - User profile
   * @param language - Preferred language
   * @returns Submission instructions
   */
  private async generateSubmissionInstructions(
    scheme: GovernmentScheme,
    profile: UserProfile,
    language: Language
  ): Promise<ApplicationGuide['submissionInstructions']> {
    const query = `How to submit application for ${scheme.officialName} in ${profile.location.district}, ${profile.location.state}? Include submission methods, locations, and timelines.`;
    
    const response = await ragService.retrieveAndGenerate(query, language, profile);

    return {
      method: ['Online Portal', 'Offline at Government Office', 'Through CSC'],
      locations: [`District Office - ${profile.location.district}`, 'Block Office', 'Gram Panchayat'],
      timeline: 'Submit within 30 days of document collection',
      additionalNotes: response.answer,
    };
  }

  /**
   * Identifies common mistakes for a scheme
   * @param scheme - Government scheme
   * @param language - Preferred language
   * @returns Common mistakes
   */
  private async identifyCommonMistakes(
    scheme: GovernmentScheme,
    language: Language
  ): Promise<string[]> {
    const query = `What are the most common mistakes people make when applying for ${scheme.officialName}?`;
    const response = await ragService.retrieveAndGenerate(query, language);

    return this.parseMistakes(response.answer);
  }

  /**
   * Gets document alternatives
   * @param documentType - Document type
   * @param language - Preferred language
   * @returns Alternatives
   */
  private async getDocumentAlternatives(
    documentType: string,
    language: Language
  ): Promise<string[]> {
    const query = `What are acceptable alternatives for ${documentType}?`;
    const response = await ragService.retrieveAndGenerate(query, language);
    return this.parseAlternatives(response.answer);
  }

  /**
   * Gets how to obtain instructions
   * @param documentType - Document type
   * @param language - Preferred language
   * @returns Instructions
   */
  private async getHowToObtain(documentType: string, language: Language): Promise<string> {
    const query = `How to obtain ${documentType} in India?`;
    const response = await ragService.retrieveAndGenerate(query, language);
    return response.answer;
  }

  /**
   * Gets common mistakes for a field
   * @param fieldName - Field name
   * @param language - Preferred language
   * @returns Common mistakes
   */
  private async getCommonMistakesForField(
    fieldName: string,
    language: Language
  ): Promise<string[]> {
    const query = `What are common mistakes when filling ${fieldName} in government forms?`;
    const response = await ragService.retrieveAndGenerate(query, language);
    return this.parseMistakes(response.answer);
  }

  /**
   * Generates example for a field
   * @param fieldName - Field name
   * @param profile - User profile
   * @returns Example value
   */
  private generateExample(fieldName: string, profile: UserProfile): string {
    const examples: Record<string, string> = {
      'Full Name': 'Rajesh Kumar Singh',
      'Date of Birth': '15/08/1985',
      'Aadhaar Number': '1234 5678 9012',
      'Mobile Number': '+91 98765 43210',
      'Address': `Village ${profile.location.village}, Block ${profile.location.block}, ${profile.location.district}, ${profile.location.state} - ${profile.location.pincode}`,
      'Income': '₹50,000 per year',
      'Bank Account Number': '1234567890123456',
      'IFSC Code': 'SBIN0001234',
    };

    return examples[fieldName] || 'Example not available';
  }

  /**
   * Parses steps from text
   * @param text - Text containing steps
   * @returns Array of steps
   */
  private parseSteps(text: string): string[] {
    // Simple parsing - split by numbered list
    const lines = text.split('\n');
    const steps: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\d+\./.test(trimmed)) {
        steps.push(trimmed.replace(/^\d+\.\s*/, ''));
      }
    }

    return steps.length > 0 ? steps : [text];
  }

  /**
   * Parses alternatives from text
   * @param text - Text containing alternatives
   * @returns Array of alternatives
   */
  private parseAlternatives(text: string): string[] {
    const lines = text.split('\n');
    const alternatives: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        alternatives.push(trimmed.replace(/^[-•]\s*/, ''));
      }
    }

    return alternatives.length > 0 ? alternatives : [];
  }

  /**
   * Parses mistakes from text
   * @param text - Text containing mistakes
   * @returns Array of mistakes
   */
  private parseMistakes(text: string): string[] {
    return this.parseAlternatives(text); // Same parsing logic
  }

  /**
   * Gets scheme from database
   * @param schemeId - Scheme ID
   * @returns Government scheme
   */
  private async getScheme(schemeId: string): Promise<GovernmentScheme> {
    const query = 'SELECT * FROM schemes WHERE scheme_id = $1';
    const result = await db.query(query, [schemeId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Scheme not found');
    }

    // Map to GovernmentScheme (simplified)
    const row = result.rows[0];
    return {
      schemeId: row.scheme_id,
      officialName: row.official_name,
      localizedNames: {} as any,
      shortDescription: {} as any,
      detailedDescription: {} as any,
      category: row.category,
      level: row.level,
      state: row.state,
      launchDate: row.launch_date,
      endDate: row.end_date,
      active: row.active,
      benefits: [],
      eligibilityRules: [],
      requiredDocuments: row.required_documents || [],
      officialWebsite: row.official_website,
      helplineNumber: row.helpline_number,
      officialSources: [],
      metadata: {
        lastUpdated: row.last_updated,
        version: row.version,
        updatedBy: 'system',
        verificationStatus: row.verification_status,
      },
    };
  }

  /**
   * Gets user profile from database
   * @param userId - User ID
   * @returns User profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
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
}

export const formAssistantService = new FormAssistantService();
