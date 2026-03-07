import serverless from 'serverless-http';
import { createApp } from './app';
import { config, validateConfig } from './config';
import { db } from './db/connection';
import { redis } from './db/redis';
import logger from './utils/logger';

let isInitialized = false;

const initializeDependencies = async () => {
    if (isInitialized) return;
    
    try {
        // Validate configuration
        validateConfig();
        logger.info('Configuration validated');

        // Test database connection
        try {
            await db.query('SELECT NOW()');
            logger.info('Database connected');
        } catch (dbError) {
            logger.error('Database connection failed during init', { error: dbError });
            // We don't throw here to allow the app to potentially recover or at least start up
        }

        // Test Redis connection - non-blocking and with short timeout
        try {
            const redisPromise = redis.set('health', 'ok', 10);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
            );
            await Promise.race([redisPromise, timeoutPromise]);
            logger.info('Redis connected');
        } catch (redisError) {
            logger.warn('Redis connection failed or timed out during init, proceeding without Redis', { error: redisError });
        }
        
        isInitialized = true;
    } catch (error) {
        logger.error('Critical initialization error', { error });
        throw error;
    }
};

// Create Express app
const app = createApp();

async function startServer(): Promise<void> {
  try {
    await initializeDependencies();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.close();
          logger.info('Database connection closed');

          await redis.close();
          logger.info('Redis connection closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server if not running in AWS Lambda
if (!process.env.LAMBDA_TASK_ROOT) {
  startServer();
}

// Export Lambda handler
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await initializeDependencies();
  return serverlessHandler(event, context);
};
