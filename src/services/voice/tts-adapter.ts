import { Language } from '../../types';
import { config } from '../../config';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { externalServiceDuration, externalServiceErrors } from '../../utils/metrics';
import { redis } from '../../db/redis';
import crypto from 'crypto';

export interface TTSOptions {
  language: Language;
  voiceGender?: 'male' | 'female' | 'neutral';
  speakingRate?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
}

export interface TTSResult {
  audioContent: Buffer;
  audioUrl?: string;
  cached: boolean;
}

/**
 * Text-to-Speech Adapter
 * Supports Google Text-to-Speech API
 */
export class TTSAdapter {
  private languageMap: Record<Language, string> = {
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    en: 'en-IN',
  };

  private voiceMap: Record<Language, Record<string, string>> = {
    hi: { female: 'hi-IN-Wavenet-A', male: 'hi-IN-Wavenet-B', neutral: 'hi-IN-Wavenet-C' },
    ta: { female: 'ta-IN-Wavenet-A', male: 'ta-IN-Wavenet-B', neutral: 'ta-IN-Wavenet-A' },
    te: { female: 'te-IN-Standard-A', male: 'te-IN-Standard-B', neutral: 'te-IN-Standard-A' },
    bn: { female: 'bn-IN-Wavenet-A', male: 'bn-IN-Wavenet-B', neutral: 'bn-IN-Wavenet-A' },
    mr: { female: 'mr-IN-Wavenet-A', male: 'mr-IN-Wavenet-B', neutral: 'mr-IN-Wavenet-A' },
    en: { female: 'en-IN-Wavenet-A', male: 'en-IN-Wavenet-B', neutral: 'en-IN-Wavenet-C' },
  };

  /**
   * Synthesizes speech from text
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Audio content
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    const start = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text, options);
      const cached = await this.getFromCache(cacheKey);

      if (cached) {
        logger.info('TTS cache hit', { language: options.language });
        return {
          audioContent: cached,
          cached: true,
        };
      }

      // Synthesize speech
      const audioContent = await this.googleTTS(text, options);

      // Cache the result
      await this.saveToCache(cacheKey, audioContent);

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.observe({ service: 'google-tts', operation: 'synthesize' }, duration);

      logger.info('Speech synthesized', {
        language: options.language,
        textLength: text.length,
        audioSize: audioContent.length,
        duration: `${duration}s`,
      });

      return {
        audioContent,
        cached: false,
      };
    } catch (error) {
      externalServiceErrors.inc({ service: 'google-tts', operation: 'synthesize' });
      logger.error('TTS synthesis failed', { error });
      throw new ExternalServiceError('Speech synthesis failed');
    }
  }

  /**
   * Google Text-to-Speech implementation
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Audio buffer
   */
  private async googleTTS(text: string, options: TTSOptions): Promise<Buffer> {
    // This is a placeholder implementation
    // In production, you would use @google-cloud/text-to-speech client library

    // Example implementation:
    /*
    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient({
      apiKey: config.speech.googleTTSApiKey,
    });

    const languageCode = this.languageMap[options.language];
    const voiceName = this.voiceMap[options.language][options.voiceGender || 'female'];

    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0.0,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    return Buffer.from(response.audioContent);
    */

    // Placeholder response for development
    // In production, this would return actual audio data
    return Buffer.from('audio-content-placeholder');
  }

  /**
   * Generates cache key for TTS result
   * @param text - Text content
   * @param options - TTS options
   * @returns Cache key
   */
  private getCacheKey(text: string, options: TTSOptions): string {
    const data = JSON.stringify({ text, options });
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `tts:${hash}`;
  }

  /**
   * Retrieves cached audio from Redis
   * @param key - Cache key
   * @returns Audio buffer or null
   */
  private async getFromCache(key: string): Promise<Buffer | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return Buffer.from(cached, 'base64');
      }
      return null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { error });
      return null;
    }
  }

  /**
   * Saves audio to Redis cache
   * @param key - Cache key
   * @param audioContent - Audio buffer
   */
  private async saveToCache(key: string, audioContent: Buffer): Promise<void> {
    try {
      // Cache for 24 hours
      await redis.set(key, audioContent.toString('base64'), 86400);
    } catch (error) {
      logger.warn('Cache save failed', { error });
    }
  }

  /**
   * Validates text for synthesis
   * @param text - Text to validate
   * @returns True if valid
   */
  validateText(text: string): boolean {
    // Check length (max 5000 characters for Google TTS)
    if (text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    // Check minimum length
    if (text.length < 1) {
      throw new Error('Text cannot be empty');
    }

    return true;
  }

  /**
   * Splits long text into chunks for synthesis
   * @param text - Text to split
   * @param maxLength - Maximum chunk length
   * @returns Array of text chunks
   */
  splitText(text: string, maxLength: number = 5000): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const ttsAdapter = new TTSAdapter();
