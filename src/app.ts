import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import { register } from './utils/metrics';
import { tracingMiddleware } from './utils/tracing';
import logger from './utils/logger';

// Import routes
import interactionRoutes from './routes/interaction';
import profileRoutes from './routes/profile';
import schemeRoutes from './routes/schemes';
import applicationRoutes from './routes/applications';
import fraudRoutes from './routes/fraud';
import educationRoutes from './routes/education';
import adminRoutes from './routes/admin';
import complianceRoutes from './routes/compliance';

// Debug: Log route imports
logger.info('Routes imported', {
  interaction: typeof interactionRoutes,
  profile: typeof profileRoutes,
  schemes: typeof schemeRoutes,
  applications: typeof applicationRoutes,
  fraud: typeof fraudRoutes,
  education: typeof educationRoutes,
  admin: typeof adminRoutes,
  compliance: typeof complianceRoutes,
});

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.nodeEnv === 'production' 
      ? ['https://yourdomain.com'] 
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Distributed tracing
  app.use(tracingMiddleware);

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use(generalRateLimiter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // API routes
  logger.info('Registering API routes...');
  app.use('/api/v1/interact', interactionRoutes);
  app.use('/api/v1/profile', profileRoutes);
  app.use('/api/v1/schemes', schemeRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/fraud', fraudRoutes);
  app.use('/api/v1/education', educationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/compliance', complianceRoutes);
  logger.info('API routes registered successfully');

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
