import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Application Metrics
export const activeSessions = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active user sessions',
  registers: [register],
});

export const eligibilityEvaluations = new Counter({
  name: 'eligibility_evaluations_total',
  help: 'Total number of eligibility evaluations',
  labelNames: ['result'],
  registers: [register],
});

export const fraudAnalyses = new Counter({
  name: 'fraud_analyses_total',
  help: 'Total number of fraud analyses',
  labelNames: ['risk_level'],
  registers: [register],
});

export const voiceInteractions = new Counter({
  name: 'voice_interactions_total',
  help: 'Total number of voice interactions',
  labelNames: ['language'],
  registers: [register],
});

// External Service Metrics
export const externalServiceDuration = new Histogram({
  name: 'external_service_duration_seconds',
  help: 'Duration of external service calls in seconds',
  labelNames: ['service', 'operation'],
  registers: [register],
});

export const externalServiceErrors = new Counter({
  name: 'external_service_errors_total',
  help: 'Total number of external service errors',
  labelNames: ['service', 'operation'],
  registers: [register],
});

// Database Metrics
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  registers: [register],
});

export const databaseErrors = new Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation'],
  registers: [register],
});
