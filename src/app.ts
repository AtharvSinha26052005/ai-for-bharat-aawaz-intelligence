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
import profileStorageRoutes from './routes/profile-storage';
import schemeRoutes from './routes/schemes';
import applicationRoutes from './routes/applications';
import fraudRoutes from './routes/fraud';
import educationRoutes from './routes/education';
import adminRoutes from './routes/admin';
import complianceRoutes from './routes/compliance';
import interestedSchemesRoutes from './routes/interested-schemes';

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
  app.use(
    helmet({
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
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [
        'https://d14gfq1u1sly2k.cloudfront.net',
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
      ],
    })
  );

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
  const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // API routes
  logger.info('Registering API routes...');

  const routes = [
    ['/interact', interactionRoutes],
    ['/profile', profileRoutes],
    ['/profiles', profileStorageRoutes],
    ['/schemes', schemeRoutes],
    ['/applications', applicationRoutes],
    ['/fraud', fraudRoutes],
    ['/education', educationRoutes],
    ['/admin', adminRoutes],
    ['/compliance', complianceRoutes],
    ['/interested-schemes', interestedSchemesRoutes],
  ];

  routes.forEach(([path, router]) => {
    app.use(`/api/v1${path}`, router as any);
  });

  logger.info('API routes registered successfully');

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}