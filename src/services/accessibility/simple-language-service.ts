import logger from '../../utils/logger';

/**
 * Simple Language Service
 * Simplifies text for low-literacy users
 */
export class SimpleLanguageService {
  private complexToSimple: Record<string, string> = {
    // Government/bureaucratic terms
    'eligibility': 'who can get this',
    'application': 'form',
    'beneficiary': 'person who gets help',
    'subsidy': 'money help',
    'documentation': 'papers',
    'verification': 'checking',
    'disbursement': 'payment',
    'implementation': 'doing',
    'facilitate': 'help',
    'utilize': 'use',
    'commence': 'start',
    'terminate': 'end',
    'subsequent': 'next',
    'prior': 'before',
    'aforementioned': 'said before',
    'herein': 'here',
    'thereof': 'of it',
    'pursuant': 'according to',

    // Financial terms
    'interest rate': 'extra money to pay',
    'principal': 'main amount',
    'collateral': 'security',
    'credit score': 'money trust score',
    'loan': 'borrowed money',
    'debt': 'money owed',
    'savings': 'saved money',
    'investment': 'money put to grow',
    'insurance': 'safety money',
    'premium': 'payment',
    'claim': 'asking for money back',

    // Technical terms
    'authenticate': 'prove who you are',
    'authorize': 'give permission',
    'validate': 'check if correct',
    'process': 'handle',
    'submit': 'send',
    'retrieve': 'get',
    'modify': 'change',
    'delete': 'remove',
  };

  /**
   * Simplifies text for low-literacy users
   * @param text - Original text
   * @param language - Language code
   * @returns Simplified text
   */
  simplify(text: string, language: string = 'en'): string {
    try {
      let simplified = text;

      // Replace complex terms with simple ones
      for (const [complex, simple] of Object.entries(this.complexToSimple)) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        simplified = simplified.replace(regex, simple);
      }

      // Break long sentences (>20 words) into shorter ones
      simplified = this.breakLongSentences(simplified);

      // Remove passive voice where possible
      simplified = this.simplifyPassiveVoice(simplified);

      // Use simpler punctuation
      simplified = this.simplifyPunctuation(simplified);

      logger.debug('Text simplified', { originalLength: text.length, simplifiedLength: simplified.length });

      return simplified;
    } catch (error) {
      logger.error('Failed to simplify text', { error });
      return text; // Return original on error
    }
  }

  /**
   * Breaks long sentences into shorter ones
   */
  private breakLongSentences(text: string): string {
    const sentences = text.split(/\.\s+/);
    const simplified: string[] = [];

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);

      if (words.length > 20) {
        // Try to break at conjunctions
        const breakPoints = ['and', 'but', 'or', 'because', 'so', 'when', 'if'];
        let broken = false;

        for (const breakPoint of breakPoints) {
          const index = words.findIndex((w) => w.toLowerCase() === breakPoint);
          if (index > 5 && index < words.length - 5) {
            simplified.push(words.slice(0, index).join(' ') + '.');
            simplified.push(words.slice(index + 1).join(' '));
            broken = true;
            break;
          }
        }

        if (!broken) {
          simplified.push(sentence);
        }
      } else {
        simplified.push(sentence);
      }
    }

    return simplified.join('. ');
  }

  /**
   * Simplifies passive voice to active voice
   */
  private simplifyPassiveVoice(text: string): string {
    // Simple passive voice patterns
    const patterns = [
      { passive: /is required to/gi, active: 'must' },
      { passive: /are required to/gi, active: 'must' },
      { passive: /is needed/gi, active: 'need' },
      { passive: /are needed/gi, active: 'need' },
      { passive: /is provided/gi, active: 'we provide' },
      { passive: /are provided/gi, active: 'we provide' },
      { passive: /will be sent/gi, active: 'we will send' },
      { passive: /has been approved/gi, active: 'we approved' },
    ];

    let simplified = text;

    for (const pattern of patterns) {
      simplified = simplified.replace(pattern.passive, pattern.active);
    }

    return simplified;
  }

  /**
   * Simplifies punctuation
   */
  private simplifyPunctuation(text: string): string {
    return text
      .replace(/;/g, '.') // Replace semicolons with periods
      .replace(/:/g, ' -') // Replace colons with dashes
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
  }

  /**
   * Checks if text is simple enough (6th grade reading level)
   * @param text - Text to check
   * @returns Whether text is simple enough
   */
  isSimpleEnough(text: string): boolean {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/);

    // Average words per sentence (target: <15)
    const avgWordsPerSentence = words.length / sentences.length;

    // Average syllables per word (target: <2)
    const avgSyllablesPerWord = words.reduce((sum, word) => sum + this.countSyllables(word), 0) / words.length;

    // Flesch Reading Ease score (target: >60)
    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    return fleschScore > 60;
  }

  /**
   * Counts syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let syllables = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);

      if (isVowel && !previousWasVowel) {
        syllables++;
      }

      previousWasVowel = isVowel;
    }

    // Adjust for silent 'e'
    if (word.endsWith('e')) {
      syllables--;
    }

    return Math.max(1, syllables);
  }

  /**
   * Provides patient error guidance
   * @param error - Error message
   * @param language - Language code
   * @returns User-friendly error message
   */
  providePatientErrorGuidance(error: string, language: string = 'en'): string {
    const guidance: Record<string, string> = {
      en: `Don't worry! Let's try again. ${this.simplify(error, language)}. Take your time.`,
      hi: `चिंता मत करो! फिर से कोशिश करते हैं। ${error}। अपना समय लें।`,
      ta: `கவலைப்படாதீர்கள்! மீண்டும் முயற்சிக்கலாம். ${error}। உங்கள் நேரத்தை எடுத்துக் கொள்ளுங்கள்.`,
      te: `చింతించకండి! మళ్లీ ప్రయత్నిద్దాం. ${error}. మీ సమయం తీసుకోండి.`,
      bn: `চিন্তা করবেন না! আবার চেষ্টা করি। ${error}। আপনার সময় নিন।`,
      mr: `काळजी करू नका! पुन्हा प्रयत्न करूया. ${error}. तुमचा वेळ घ्या.`,
    };

    return guidance[language] || guidance.en;
  }
}

export const simpleLanguageService = new SimpleLanguageService();
