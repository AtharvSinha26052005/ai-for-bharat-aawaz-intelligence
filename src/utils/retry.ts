import logger from './logger';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Retries a function with exponential backoff
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @returns Result of function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const finalConfig: RetryConfig = {
    maxAttempts: config?.maxAttempts || 3,
    initialDelay: config?.initialDelay || 1000,
    maxDelay: config?.maxDelay || 30000,
    backoffMultiplier: config?.backoffMultiplier || 2,
    jitter: config?.jitter !== undefined ? config.jitter : true,
  };

  let lastError: Error;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === finalConfig.maxAttempts) {
        logger.error('Max retry attempts reached', {
          attempts: attempt,
          error: lastError.message,
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, finalConfig.maxDelay);

      // Add jitter to prevent thundering herd
      const jitteredDelay = finalConfig.jitter
        ? currentDelay * (0.5 + Math.random() * 0.5)
        : currentDelay;

      logger.warn('Retrying after failure', {
        attempt,
        delay: jitteredDelay,
        error: lastError.message,
      });

      await sleep(jitteredDelay);

      // Increase delay for next attempt
      delay *= finalConfig.backoffMultiplier;
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if error is retryable
 * @param error - Error to check
 * @returns True if retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.response && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  return false;
}

/**
 * Retries a function only for retryable errors
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @returns Result of function
 */
export async function retryOnRetryableError<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  return retryWithBackoff(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) {
        throw error;
      }
      throw error;
    }
  }, config);
}
