import { redisClient } from '../../db/redis';
import logger from '../../utils/logger';

/**
 * Bandwidth level
 */
export type BandwidthLevel = 'high' | 'medium' | 'low' | 'very-low';

/**
 * Bandwidth metrics
 */
interface BandwidthMetrics {
  userId: string;
  level: BandwidthLevel;
  estimatedSpeed: number; // in kbps
  latency: number; // in ms
  detectedAt: Date;
  autoEnabled: boolean;
}

/**
 * Bandwidth Service
 * Detects and manages bandwidth optimization
 */
export class BandwidthService {
  private readonly CACHE_TTL = 300; // 5 minutes

  // Bandwidth thresholds (in kbps)
  private readonly THRESHOLDS = {
    HIGH: 1000, // > 1 Mbps
    MEDIUM: 500, // 500 kbps - 1 Mbps
    LOW: 200, // 200 kbps - 500 kbps (3G)
    VERY_LOW: 200, // < 200 kbps (2G)
  };

  /**
   * Detects bandwidth level from request
   * @param userId - User ID
   * @param requestSize - Size of request in bytes
   * @param responseTime - Response time in ms
   * @returns Bandwidth level
   */
  async detectBandwidth(
    userId: string,
    requestSize: number,
    responseTime: number
  ): Promise<BandwidthLevel> {
    try {
      // Calculate estimated speed (kbps)
      const estimatedSpeed = (requestSize * 8) / (responseTime / 1000) / 1000;

      // Determine bandwidth level
      let level: BandwidthLevel;
      if (estimatedSpeed >= this.THRESHOLDS.HIGH) {
        level = 'high';
      } else if (estimatedSpeed >= this.THRESHOLDS.MEDIUM) {
        level = 'medium';
      } else if (estimatedSpeed >= this.THRESHOLDS.LOW) {
        level = 'low';
      } else {
        level = 'very-low';
      }

      // Store metrics
      const metrics: BandwidthMetrics = {
        userId,
        level,
        estimatedSpeed,
        latency: responseTime,
        detectedAt: new Date(),
        autoEnabled: level === 'low' || level === 'very-low',
      };

      await this.saveMetrics(userId, metrics);

      logger.info('Bandwidth detected', {
        userId,
        level,
        estimatedSpeed: estimatedSpeed.toFixed(2),
        latency: responseTime,
      });

      return level;
    } catch (error) {
      logger.error('Bandwidth detection failed', { userId, error });
      return 'medium'; // Default to medium
    }
  }

  /**
   * Gets bandwidth metrics for user
   * @param userId - User ID
   * @returns Bandwidth metrics or null
   */
  async getMetrics(userId: string): Promise<BandwidthMetrics | null> {
    try {
      const data = await redisClient.get(`bandwidth:${userId}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get bandwidth metrics', { userId, error });
      return null;
    }
  }

  /**
   * Checks if low-bandwidth mode should be enabled
   * @param userId - User ID
   * @returns True if low-bandwidth mode should be enabled
   */
  async shouldEnableLowBandwidthMode(userId: string): Promise<boolean> {
    const metrics = await this.getMetrics(userId);
    if (!metrics) return false;

    return metrics.level === 'low' || metrics.level === 'very-low';
  }

  /**
   * Manually enables low-bandwidth mode
   * @param userId - User ID
   * @param enabled - Whether to enable
   */
  async setLowBandwidthMode(userId: string, enabled: boolean): Promise<void> {
    try {
      const metrics = await this.getMetrics(userId);

      if (metrics) {
        metrics.autoEnabled = false;
        await this.saveMetrics(userId, metrics);
      }

      // Store manual preference
      await redisClient.set(
        `bandwidth:manual:${userId}`,
        enabled ? 'true' : 'false',
        86400 // 24 hours
      );

      logger.info('Low-bandwidth mode manually set', { userId, enabled });
    } catch (error) {
      logger.error('Failed to set low-bandwidth mode', { userId, error });
    }
  }

  /**
   * Gets manual low-bandwidth preference
   * @param userId - User ID
   * @returns True if manually enabled
   */
  async getManualPreference(userId: string): Promise<boolean | null> {
    try {
      const data = await redisClient.get(`bandwidth:manual:${userId}`);
      if (!data) return null;
      return data === 'true';
    } catch (error) {
      logger.error('Failed to get manual preference', { userId, error });
      return null;
    }
  }

  /**
   * Determines if low-bandwidth mode is active
   * @param userId - User ID
   * @returns True if active
   */
  async isLowBandwidthModeActive(userId: string): Promise<boolean> {
    // Check manual preference first
    const manual = await this.getManualPreference(userId);
    if (manual !== null) return manual;

    // Check auto-detection
    return await this.shouldEnableLowBandwidthMode(userId);
  }

  /**
   * Gets optimization recommendations
   * @param userId - User ID
   * @returns Optimization recommendations
   */
  async getOptimizationRecommendations(userId: string): Promise<{
    compressAudio: boolean;
    prioritizeText: boolean;
    reduceMedia: boolean;
    enableCaching: boolean;
    offlineMode: boolean;
  }> {
    const metrics = await this.getMetrics(userId);

    if (!metrics) {
      return {
        compressAudio: false,
        prioritizeText: false,
        reduceMedia: false,
        enableCaching: true,
        offlineMode: false,
      };
    }

    switch (metrics.level) {
      case 'very-low':
        return {
          compressAudio: true,
          prioritizeText: true,
          reduceMedia: true,
          enableCaching: true,
          offlineMode: true,
        };
      case 'low':
        return {
          compressAudio: true,
          prioritizeText: true,
          reduceMedia: true,
          enableCaching: true,
          offlineMode: false,
        };
      case 'medium':
        return {
          compressAudio: true,
          prioritizeText: false,
          reduceMedia: false,
          enableCaching: true,
          offlineMode: false,
        };
      case 'high':
      default:
        return {
          compressAudio: false,
          prioritizeText: false,
          reduceMedia: false,
          enableCaching: true,
          offlineMode: false,
        };
    }
  }

  /**
   * Saves bandwidth metrics
   * @param userId - User ID
   * @param metrics - Bandwidth metrics
   */
  private async saveMetrics(userId: string, metrics: BandwidthMetrics): Promise<void> {
    try {
      await redisClient.set(
        `bandwidth:${userId}`,
        JSON.stringify(metrics),
        this.CACHE_TTL
      );
    } catch (error) {
      logger.error('Failed to save bandwidth metrics', { userId, error });
    }
  }
}

export const bandwidthService = new BandwidthService();
