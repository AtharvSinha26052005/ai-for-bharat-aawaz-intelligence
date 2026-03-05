import { Language } from '../../types';
import { db } from '../../db/connection';
import { redisClient } from '../../db/redis';
import logger from '../../utils/logger';
import { config } from '../../config';

/**
 * Translation glossary entry
 */
interface GlossaryEntry {
  term: string;
  translations: Record<Language, string>;
  category: 'scheme' | 'financial' | 'legal' | 'general';
  context?: string;
}

/**
 * Translation Service
 * Handles multilingual translation with glossary support
 */
export class TranslationService {
  private glossary: Map<string, GlossaryEntry> = new Map();
  private initialized = false;

  /**
   * Initializes the translation service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadGlossary();
    this.initialized = true;
    logger.info('Translation service initialized');
  }

  /**
   * Translates text from one language to another
   * @param text - Text to translate
   * @param fromLanguage - Source language
   * @param toLanguage - Target language
   * @param useGlossary - Whether to use glossary terms
   * @returns Translated text
   */
  async translate(
    text: string,
    fromLanguage: Language,
    toLanguage: Language,
    useGlossary: boolean = true
  ): Promise<string> {
    try {
      // If same language, return original
      if (fromLanguage === toLanguage) {
        return text;
      }

      // Check cache first
      const cacheKey = `translation:${fromLanguage}:${toLanguage}:${text}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('Translation cache hit', { fromLanguage, toLanguage });
        return cached;
      }

      // Replace glossary terms before translation
      let processedText = text;
      const glossaryReplacements: Array<{ original: string; placeholder: string; translation: string }> = [];

      if (useGlossary) {
        for (const [term, entry] of this.glossary.entries()) {
          const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
          if (regex.test(processedText)) {
            const placeholder = `__GLOSSARY_${glossaryReplacements.length}__`;
            const translation = entry.translations[toLanguage] || term;
            glossaryReplacements.push({ original: term, placeholder, translation });
            processedText = processedText.replace(regex, placeholder);
          }
        }
      }

      // Translate using external API (Google Translate or similar)
      let translated = await this.translateWithAPI(processedText, fromLanguage, toLanguage);

      // Replace placeholders with glossary translations
      for (const replacement of glossaryReplacements) {
        translated = translated.replace(replacement.placeholder, replacement.translation);
      }

      // Cache the result
      await redisClient.set(cacheKey, translated, 86400); // Cache for 24 hours

      logger.info('Text translated', { fromLanguage, toLanguage, length: text.length });

      return translated;
    } catch (error) {
      logger.error('Translation failed', { fromLanguage, toLanguage, error });
      // Return original text as fallback
      return text;
    }
  }

  /**
   * Translates text to multiple languages
   * @param text - Text to translate
   * @param fromLanguage - Source language
   * @param toLanguages - Target languages
   * @returns Translations in all target languages
   */
  async translateBatch(
    text: string,
    fromLanguage: Language,
    toLanguages: Language[]
  ): Promise<Record<Language, string>> {
    const translations: Partial<Record<Language, string>> = {};

    await Promise.all(
      toLanguages.map(async (lang) => {
        translations[lang] = await this.translate(text, fromLanguage, lang);
      })
    );

    return translations as Record<Language, string>;
  }

  /**
   * Gets translation for a specific term from glossary
   * @param term - Term to translate
   * @param toLanguage - Target language
   * @returns Translation or original term
   */
  getGlossaryTerm(term: string, toLanguage: Language): string {
    const entry = this.glossary.get(term.toLowerCase());
    if (entry) {
      return entry.translations[toLanguage] || term;
    }
    return term;
  }

  /**
   * Adds a term to the glossary
   * @param term - Term in English
   * @param translations - Translations in all languages
   * @param category - Category
   * @param context - Optional context
   */
  async addGlossaryTerm(
    term: string,
    translations: Record<Language, string>,
    category: GlossaryEntry['category'],
    context?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO translation_glossary (term, translations, category, context)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (term) DO UPDATE
        SET translations = $2, category = $3, context = $4, updated_at = NOW()
      `;

      await db.query(query, [term, JSON.stringify(translations), category, context]);

      // Update in-memory glossary
      this.glossary.set(term.toLowerCase(), {
        term,
        translations,
        category,
        context,
      });

      logger.info('Glossary term added', { term, category });
    } catch (error) {
      logger.error('Failed to add glossary term', { term, error });
      throw error;
    }
  }

  /**
   * Validates translation consistency across languages
   * @param originalText - Original text
   * @param translations - Translations in different languages
   * @returns Consistency report
   */
  async validateConsistency(
    originalText: string,
    translations: Record<Language, string>
  ): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if all required languages are present
    const requiredLanguages: Language[] = ['en', 'hi', 'ta', 'te', 'bn', 'mr'];
    for (const lang of requiredLanguages) {
      if (!translations[lang] || translations[lang].trim() === '') {
        issues.push(`Missing translation for ${lang}`);
      }
    }

    // Check if glossary terms are consistently translated
    for (const [term, entry] of this.glossary.entries()) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      if (regex.test(originalText)) {
        for (const lang of requiredLanguages) {
          const expectedTranslation = entry.translations[lang];
          if (expectedTranslation && !translations[lang]?.includes(expectedTranslation)) {
            issues.push(
              `Glossary term "${term}" not consistently translated in ${lang} (expected: ${expectedTranslation})`
            );
          }
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  /**
   * Detects ambiguous translations
   * @param text - Text to check
   * @param language - Language
   * @returns Ambiguity report
   */
  async detectAmbiguity(
    text: string,
    language: Language
  ): Promise<{
    hasAmbiguity: boolean;
    ambiguousTerms: Array<{ term: string; clarification: string }>;
  }> {
    const ambiguousTerms: Array<{ term: string; clarification: string }> = [];

    // Common ambiguous terms in government schemes
    const ambiguityPatterns: Record<string, string> = {
      'scheme': 'योजना (government program) or स्कीम (plan)',
      'benefit': 'लाभ (advantage) or फायदा (profit)',
      'application': 'आवेदन (form submission) or एप्लिकेशन (software)',
      'form': 'फॉर्म (document) or रूप (shape)',
    };

    for (const [term, clarification] of Object.entries(ambiguityPatterns)) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      if (regex.test(text)) {
        ambiguousTerms.push({ term, clarification });
      }
    }

    return {
      hasAmbiguity: ambiguousTerms.length > 0,
      ambiguousTerms,
    };
  }

  /**
   * Translates using external API
   * @param text - Text to translate
   * @param fromLanguage - Source language
   * @param toLanguage - Target language
   * @returns Translated text
   */
  private async translateWithAPI(
    text: string,
    fromLanguage: Language,
    toLanguage: Language
  ): Promise<string> {
    // In production, this would use Google Translate API or similar
    // For now, return a placeholder implementation
    
    // Simulate API call
    logger.debug('Translating with external API', { fromLanguage, toLanguage, textLength: text.length });

    // This is a placeholder - in production, integrate with actual translation API
    // Example with Google Translate:
    // const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     q: text,
    //     source: fromLanguage,
    //     target: toLanguage,
    //     key: config.googleTranslateApiKey,
    //   }),
    // });
    // const data = await response.json();
    // return data.data.translations[0].translatedText;

    // For now, return original text with language marker
    return `[${toLanguage}] ${text}`;
  }

  /**
   * Loads glossary from database
   */
  private async loadGlossary(): Promise<void> {
    try {
      const query = 'SELECT * FROM translation_glossary WHERE active = true';
      const result = await db.query(query);

      for (const row of result.rows) {
        this.glossary.set(row.term.toLowerCase(), {
          term: row.term,
          translations: row.translations,
          category: row.category,
          context: row.context,
        });
      }

      // Add default glossary entries if database is empty
      if (this.glossary.size === 0) {
        await this.initializeDefaultGlossary();
      }

      logger.info('Glossary loaded', { entries: this.glossary.size });
    } catch (error) {
      logger.error('Failed to load glossary', { error });
      // Initialize with default entries
      await this.initializeDefaultGlossary();
    }
  }

  /**
   * Initializes default glossary entries
   */
  private async initializeDefaultGlossary(): Promise<void> {
    const defaultEntries: GlossaryEntry[] = [
      {
        term: 'Pradhan Mantri Jan Dhan Yojana',
        translations: {
          en: 'Pradhan Mantri Jan Dhan Yojana',
          hi: 'प्रधानमंत्री जन धन योजना',
          ta: 'பிரதான மந்திரி ஜன் தன் யோஜனா',
          te: 'ప్రధాన మంత్రి జన్ ధన్ యోజన',
          bn: 'প্রধানমন্ত্রী জন ধন যোজনা',
          mr: 'प्रधानमंत्री जन धन योजना',
        },
        category: 'scheme',
      },
      {
        term: 'Aadhaar',
        translations: {
          en: 'Aadhaar',
          hi: 'आधार',
          ta: 'ஆதார்',
          te: 'ఆధార్',
          bn: 'আধার',
          mr: 'आधार',
        },
        category: 'legal',
      },
      {
        term: 'subsidy',
        translations: {
          en: 'subsidy',
          hi: 'सब्सिडी',
          ta: 'மானியம்',
          te: 'సబ్సిడీ',
          bn: 'ভর্তুকি',
          mr: 'अनुदान',
        },
        category: 'financial',
      },
      {
        term: 'eligibility',
        translations: {
          en: 'eligibility',
          hi: 'पात्रता',
          ta: 'தகுதி',
          te: 'అర్హత',
          bn: 'যোগ্যতা',
          mr: 'पात्रता',
        },
        category: 'general',
      },
      {
        term: 'application',
        translations: {
          en: 'application',
          hi: 'आवेदन',
          ta: 'விண்ணப்பம்',
          te: 'దరఖాస్తు',
          bn: 'আবেদন',
          mr: 'अर्ज',
        },
        category: 'general',
      },
    ];

    for (const entry of defaultEntries) {
      this.glossary.set(entry.term.toLowerCase(), entry);
      
      // Try to save to database
      try {
        await this.addGlossaryTerm(
          entry.term,
          entry.translations,
          entry.category,
          entry.context
        );
      } catch (error) {
        // Ignore database errors during initialization
        logger.warn('Failed to save default glossary entry', { term: entry.term });
      }
    }

    logger.info('Default glossary initialized', { entries: defaultEntries.length });
  }

  /**
   * Escapes special regex characters
   * @param str - String to escape
   * @returns Escaped string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const translationService = new TranslationService();
