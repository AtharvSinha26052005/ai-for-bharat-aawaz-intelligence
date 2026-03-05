import { Language } from '../../types';
import { sttAdapter, STTResult } from './stt-adapter';
import { ttsAdapter, TTSOptions, TTSResult } from './tts-adapter';
import { audioCompressor, CompressionOptions } from './audio-compression';
import logger from '../../utils/logger';
import { voiceInteractions } from '../../utils/metrics';

export interface VoiceInteractionRequest {
  audio: string; // base64 encoded
  language?: Language;
  sessionId?: string;
  lowBandwidthMode?: boolean;
  bandwidth?: number;
}

export interface VoiceInteractionResponse {
  sessionId: string;
  textResponse: string;
  audioResponse?: string; // base64 encoded
  transcription: string;
  detectedLanguage: Language;
  confidence: number;
  compressed: boolean;
}

/**
 * Voice Interface Service
 * Handles voice interactions including STT, TTS, and audio compression
 */
export class VoiceService {
  /**
   * Processes voice interaction
   * @param request - Voice interaction request
   * @returns Voice interaction response
   */
  async processVoiceInteraction(request: VoiceInteractionRequest): Promise<VoiceInteractionResponse> {
    try {
      // Decode audio from base64
      const audioBuffer = Buffer.from(request.audio, 'base64');

      // Validate audio
      sttAdapter.validateAudio(audioBuffer);

      // Transcribe audio to text
      const sttResult = await this.transcribeAudio(audioBuffer, request.language);

      // Record metrics
      voiceInteractions.inc({ language: sttResult.language });

      // Process the transcribed text (this would call the orchestration service)
      // For now, we'll use a placeholder response
      const textResponse = await this.processTextQuery(sttResult.text, sttResult.language);

      // Generate audio response
      let audioResponse: string | undefined;
      let compressed = false;

      if (!request.lowBandwidthMode || request.bandwidth === undefined || request.bandwidth >= 200) {
        const ttsResult = await this.synthesizeSpeech(textResponse, {
          language: sttResult.language,
          voiceGender: 'female',
        });

        // Compress audio if in low bandwidth mode
        if (request.lowBandwidthMode && request.bandwidth) {
          const compressionRatio = audioCompressor.calculateCompressionRatio(request.bandwidth);
          if (compressionRatio > 0) {
            const compressionResult = await audioCompressor.compress(ttsResult.audioContent, {
              targetReduction: compressionRatio,
              quality: 'medium',
            });
            audioResponse = compressionResult.compressedAudio.toString('base64');
            compressed = true;
          } else {
            audioResponse = ttsResult.audioContent.toString('base64');
          }
        } else {
          audioResponse = ttsResult.audioContent.toString('base64');
        }
      }

      return {
        sessionId: request.sessionId || this.generateSessionId(),
        textResponse,
        audioResponse,
        transcription: sttResult.text,
        detectedLanguage: sttResult.language,
        confidence: sttResult.confidence,
        compressed,
      };
    } catch (error) {
      logger.error('Voice interaction failed', { error });
      throw error;
    }
  }

  /**
   * Transcribes audio to text
   * @param audioBuffer - Audio buffer
   * @param language - Target language (optional)
   * @returns STT result
   */
  async transcribeAudio(audioBuffer: Buffer, language?: Language): Promise<STTResult> {
    if (language) {
      return sttAdapter.transcribe(audioBuffer, language);
    } else {
      // Detect language first
      const detectedLanguage = await sttAdapter.detectLanguage(audioBuffer);
      return sttAdapter.transcribe(audioBuffer, detectedLanguage);
    }
  }

  /**
   * Synthesizes speech from text
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns TTS result
   */
  async synthesizeSpeech(text: string, options: TTSOptions): Promise<TTSResult> {
    // Validate text
    ttsAdapter.validateText(text);

    // Split text if too long
    const chunks = ttsAdapter.splitText(text);

    if (chunks.length === 1) {
      return ttsAdapter.synthesize(text, options);
    }

    // Synthesize multiple chunks and concatenate
    const audioChunks: Buffer[] = [];
    for (const chunk of chunks) {
      const result = await ttsAdapter.synthesize(chunk, options);
      audioChunks.push(result.audioContent);
    }

    return {
      audioContent: Buffer.concat(audioChunks),
      cached: false,
    };
  }

  /**
   * Processes text query (placeholder)
   * In production, this would call the Core Orchestration Service
   * @param text - User query
   * @param language - User language
   * @returns Response text
   */
  private async processTextQuery(text: string, language: Language): Promise<string> {
    // This is a placeholder
    // In production, this would call the Core Orchestration Service
    // which would handle intent detection, routing, and response generation

    logger.info('Processing text query', { text, language });

    // Placeholder responses
    const responses: Record<Language, string> = {
      hi: 'आपके लिए कई योजनाएं उपलब्ध हैं। कृपया अपनी उम्र और आय बताएं।',
      ta: 'உங்களுக்கு பல திட்டங்கள் கிடைக்கின்றன. தயவுசெய்து உங்கள் வயது மற்றும் வருமானத்தை கூறுங்கள்.',
      te: 'మీకు అనేక పథకాలు అందుబాటులో ఉన్నాయి. దయచేసి మీ వయస్సు మరియు ఆదాయాన్ని తెలియజేయండి.',
      bn: 'আপনার জন্য অনেক প্রকল্প উপলব্ধ আছে। অনুগ্রহ করে আপনার বয়স এবং আয় জানান।',
      mr: 'तुमच्यासाठी अनेक योजना उपलब्ध आहेत. कृपया तुमचे वय आणि उत्पन्न सांगा।',
      en: 'Several schemes are available for you. Please provide your age and income.',
    };

    return responses[language] || responses.en;
  }

  /**
   * Generates a unique session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  /**
   * Detects language from audio
   * @param audio - Base64 encoded audio
   * @returns Detected language
   */
  async detectLanguage(audio: string): Promise<Language> {
    const audioBuffer = Buffer.from(audio, 'base64');
    sttAdapter.validateAudio(audioBuffer);
    return sttAdapter.detectLanguage(audioBuffer);
  }

  /**
   * Synthesizes speech for a given text and language
   * @param text - Text to synthesize
   * @param language - Target language
   * @param lowBandwidthMode - Whether to compress audio
   * @returns Base64 encoded audio
   */
  async textToSpeech(
    text: string,
    language: Language,
    lowBandwidthMode: boolean = false
  ): Promise<string> {
    const ttsResult = await this.synthesizeSpeech(text, {
      language,
      voiceGender: 'female',
    });

    if (lowBandwidthMode) {
      const compressionResult = await audioCompressor.compress(ttsResult.audioContent, {
        targetReduction: 0.5,
        quality: 'medium',
      });
      return compressionResult.compressedAudio.toString('base64');
    }

    return ttsResult.audioContent.toString('base64');
  }
}

export const voiceService = new VoiceService();
