import logger from '../../utils/logger';

export interface CompressionOptions {
  targetReduction: number; // Target reduction percentage (e.g., 0.5 for 50%)
  quality?: 'low' | 'medium' | 'high';
}

export interface CompressionResult {
  compressedAudio: Buffer;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
}

/**
 * Audio Compression Utility
 * Compresses audio for low-bandwidth transmission
 */
export class AudioCompressor {
  /**
   * Compresses audio buffer
   * @param audioBuffer - Original audio buffer
   * @param options - Compression options
   * @returns Compression result
   */
  async compress(audioBuffer: Buffer, options: CompressionOptions): Promise<CompressionResult> {
    const originalSize = audioBuffer.length;

    try {
      // In production, you would use a library like ffmpeg or opus
      // to actually compress the audio
      
      // Example with ffmpeg (pseudo-code):
      /*
      const ffmpeg = require('fluent-ffmpeg');
      
      const quality = this.getQualitySettings(options.quality || 'medium');
      
      const compressedBuffer = await new Promise((resolve, reject) => {
        ffmpeg(audioBuffer)
          .audioCodec('libopus')
          .audioBitrate(quality.bitrate)
          .audioFrequency(quality.sampleRate)
          .audioChannels(1) // Mono
          .format('opus')
          .on('end', (stdout, stderr) => resolve(Buffer.from(stdout)))
          .on('error', reject)
          .pipe();
      });
      */

      // Placeholder implementation
      // Simulates compression by reducing buffer size
      const targetSize = Math.floor(originalSize * (1 - options.targetReduction));
      const compressedAudio = this.simulateCompression(audioBuffer, targetSize);

      const compressedSize = compressedAudio.length;
      const reductionPercentage = ((originalSize - compressedSize) / originalSize) * 100;

      logger.info('Audio compressed', {
        originalSize,
        compressedSize,
        reductionPercentage: `${reductionPercentage.toFixed(2)}%`,
      });

      return {
        compressedAudio,
        originalSize,
        compressedSize,
        reductionPercentage,
      };
    } catch (error) {
      logger.error('Audio compression failed', { error });
      // Return original audio if compression fails
      return {
        compressedAudio: audioBuffer,
        originalSize,
        compressedSize: originalSize,
        reductionPercentage: 0,
      };
    }
  }

  /**
   * Determines if compression is needed based on bandwidth
   * @param bandwidth - Available bandwidth in kbps
   * @returns True if compression is needed
   */
  shouldCompress(bandwidth?: number): boolean {
    if (!bandwidth) {
      return false;
    }

    // Compress if bandwidth is below 3G speeds (approximately 384 kbps)
    return bandwidth < 384;
  }

  /**
   * Gets quality settings based on quality level
   * @param quality - Quality level
   * @returns Quality settings
   */
  private getQualitySettings(quality: 'low' | 'medium' | 'high') {
    const settings = {
      low: {
        bitrate: '16k',
        sampleRate: 8000,
        codec: 'opus',
      },
      medium: {
        bitrate: '24k',
        sampleRate: 16000,
        codec: 'opus',
      },
      high: {
        bitrate: '32k',
        sampleRate: 24000,
        codec: 'opus',
      },
    };

    return settings[quality];
  }

  /**
   * Simulates audio compression (placeholder)
   * In production, this would use actual audio compression
   * @param audioBuffer - Original audio
   * @param targetSize - Target size in bytes
   * @returns Compressed audio buffer
   */
  private simulateCompression(audioBuffer: Buffer, targetSize: number): Buffer {
    // This is a placeholder that just truncates the buffer
    // In production, you would use proper audio compression
    if (targetSize >= audioBuffer.length) {
      return audioBuffer;
    }

    return audioBuffer.subarray(0, targetSize);
  }

  /**
   * Estimates bandwidth from connection info
   * @param connectionType - Connection type (e.g., '2g', '3g', '4g', 'wifi')
   * @returns Estimated bandwidth in kbps
   */
  estimateBandwidth(connectionType?: string): number {
    const bandwidthMap: Record<string, number> = {
      '2g': 50,
      'slow-2g': 25,
      '3g': 384,
      '4g': 10000,
      'wifi': 50000,
    };

    return bandwidthMap[connectionType?.toLowerCase() || '3g'] || 384;
  }

  /**
   * Calculates optimal compression ratio based on bandwidth
   * @param bandwidth - Available bandwidth in kbps
   * @returns Compression ratio (0-1)
   */
  calculateCompressionRatio(bandwidth: number): number {
    if (bandwidth >= 384) {
      return 0; // No compression needed
    } else if (bandwidth >= 200) {
      return 0.3; // 30% reduction
    } else if (bandwidth >= 100) {
      return 0.5; // 50% reduction
    } else {
      return 0.7; // 70% reduction
    }
  }
}

export const audioCompressor = new AudioCompressor();
