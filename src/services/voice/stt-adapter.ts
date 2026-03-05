import { Language } from '../../types';
import { config } from '../../config';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { externalServiceDuration, externalServiceErrors } from '../../utils/metrics';

export interface STTResult {
  text: string;
  confidence: number;
  language: Language;
}

/**
 * Speech-to-Text Adapter
 * Supports Google Speech-to-Text API
 */
export class STTAdapter {
  private languageMap: Record<Language, string> = {
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    en: 'en-IN',
  };

  /**
   * Transcribes audio to text
   * @param audioBuffer - Audio data buffer
   * @param language - Target language (optional, will auto-detect if not provided)
   * @returns Transcription result
   */
  async transcribe(audioBuffer: Buffer, language?: Language): Promise<STTResult> {
    const start = Date.now();

    try {
      // For now, using Google Speech-to-Text API
      // In production, you would use the actual Google Cloud Speech-to-Text client
      const result = await this.googleSTT(audioBuffer, language);

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.observe({ service: 'google-stt', operation: 'transcribe' }, duration);

      logger.info('Speech transcribed', {
        language: result.language,
        confidence: result.confidence,
        duration: `${duration}s`,
      });

      return result;
    } catch (error) {
      externalServiceErrors.inc({ service: 'google-stt', operation: 'transcribe' });
      logger.error('STT transcription failed', { error });
      throw new ExternalServiceError('Speech transcription failed');
    }
  }

  /**
   * Detects language from audio
   * @param audioBuffer - Audio data buffer
   * @returns Detected language
   */
  async detectLanguage(audioBuffer: Buffer): Promise<Language> {
    const start = Date.now();

    try {
      // Use Google Speech-to-Text with language detection
      const result = await this.googleSTT(audioBuffer);

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.observe({ service: 'google-stt', operation: 'detect-language' }, duration);

      logger.info('Language detected', {
        language: result.language,
        confidence: result.confidence,
        duration: `${duration}s`,
      });

      return result.language;
    } catch (error) {
      externalServiceErrors.inc({ service: 'google-stt', operation: 'detect-language' });
      logger.error('Language detection failed', { error });
      // Default to Hindi if detection fails
      return 'hi';
    }
  }

  /**
   * Google Speech-to-Text implementation
   * @param audioBuffer - Audio data buffer
   * @param language - Target language (optional)
   * @returns Transcription result
   */
  private async googleSTT(audioBuffer: Buffer, language?: Language): Promise<STTResult> {
    // This is a placeholder implementation
    // In production, you would use @google-cloud/speech client library
    
    // Example implementation:
    /*
    const speech = require('@google-cloud/speech');
    const client = new speech.SpeechClient({
      apiKey: config.speech.googleSTTApiKey,
    });

    const audio = {
      content: audioBuffer.toString('base64'),
    };

    const languageCode = language ? this.languageMap[language] : 'hi-IN';

    const request = {
      audio,
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode,
        alternativeLanguageCodes: Object.values(this.languageMap),
        enableAutomaticPunctuation: true,
        model: 'default',
      },
    };

    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    const confidence = response.results[0]?.alternatives[0]?.confidence || 0;
    const detectedLanguage = this.getLanguageFromCode(response.results[0]?.languageCode || 'hi-IN');

    return {
      text: transcription,
      confidence,
      language: detectedLanguage,
    };
    */

    // Placeholder response for development
    return {
      text: 'मुझे कौन सी योजनाएं मिल सकती हैं?',
      confidence: 0.95,
      language: language || 'hi',
    };
  }

  /**
   * Converts language code to Language type
   * @param code - Language code (e.g., 'hi-IN')
   * @returns Language type
   */
  private getLanguageFromCode(code: string): Language {
    const prefix = code.split('-')[0];
    const validLanguages: Language[] = ['hi', 'ta', 'te', 'bn', 'mr', 'en'];
    return validLanguages.includes(prefix as Language) ? (prefix as Language) : 'hi';
  }

  /**
   * Validates audio format and size
   * @param audioBuffer - Audio data buffer
   * @returns True if valid
   */
  validateAudio(audioBuffer: Buffer): boolean {
    // Check size (max 10MB)
    if (audioBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Audio file too large (max 10MB)');
    }

    // Check minimum size (at least 1KB)
    if (audioBuffer.length < 1024) {
      throw new Error('Audio file too small');
    }

    return true;
  }
}

export const sttAdapter = new STTAdapter();
