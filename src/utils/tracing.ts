import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

/**
 * Trace context
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * Active traces storage
 */
const activeTraces = new Map<string, TraceContext>();

/**
 * Creates a new trace
 */
export function createTrace(metadata: Record<string, any> = {}): TraceContext {
  const traceId = uuidv4();
  const spanId = uuidv4();
  const startTime = Date.now();

  const trace: TraceContext = {
    traceId,
    spanId,
    startTime,
    metadata,
  };

  activeTraces.set(traceId, trace);

  return trace;
}

/**
 * Creates a child span
 */
export function createSpan(
  traceId: string,
  parentSpanId: string,
  metadata: Record<string, any> = {}
): TraceContext {
  const spanId = uuidv4();
  const startTime = Date.now();

  const span: TraceContext = {
    traceId,
    spanId,
    parentSpanId,
    startTime,
    metadata,
  };

  return span;
}

/**
 * Ends a trace or span
 */
export function endTrace(trace: TraceContext, metadata: Record<string, any> = {}): void {
  const duration = Date.now() - trace.startTime;

  logger.info('Trace completed', {
    traceId: trace.traceId,
    spanId: trace.spanId,
    parentSpanId: trace.parentSpanId,
    duration,
    ...trace.metadata,
    ...metadata,
  });

  if (!trace.parentSpanId) {
    activeTraces.delete(trace.traceId);
  }
}

/**
 * Gets active trace by ID
 */
export function getTrace(traceId: string): TraceContext | undefined {
  return activeTraces.get(traceId);
}

/**
 * Express middleware for request tracing
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing trace ID from upstream
  const existingTraceId = req.headers['x-trace-id'] as string;

  const trace = existingTraceId
    ? createSpan(existingTraceId, req.headers['x-parent-span-id'] as string, {
        method: req.method,
        path: req.path,
        ip: req.ip,
      })
    : createTrace({
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

  // Attach trace to request
  (req as any).trace = trace;

  // Add trace headers to response
  res.setHeader('X-Trace-Id', trace.traceId);
  res.setHeader('X-Span-Id', trace.spanId);

  // End trace when response finishes
  res.on('finish', () => {
    endTrace(trace, {
      statusCode: res.statusCode,
    });
  });

  next();
}

/**
 * Traces an async function
 */
export async function traceAsync<T>(
  name: string,
  fn: (trace: TraceContext) => Promise<T>,
  parentTrace?: TraceContext
): Promise<T> {
  const trace = parentTrace
    ? createSpan(parentTrace.traceId, parentTrace.spanId, { operation: name })
    : createTrace({ operation: name });

  try {
    const result = await fn(trace);
    endTrace(trace, { success: true });
    return result;
  } catch (error) {
    endTrace(trace, { success: false, error: (error as Error).message });
    throw error;
  }
}

/**
 * Traces a synchronous function
 */
export function traceSync<T>(
  name: string,
  fn: (trace: TraceContext) => T,
  parentTrace?: TraceContext
): T {
  const trace = parentTrace
    ? createSpan(parentTrace.traceId, parentTrace.spanId, { operation: name })
    : createTrace({ operation: name });

  try {
    const result = fn(trace);
    endTrace(trace, { success: true });
    return result;
  } catch (error) {
    endTrace(trace, { success: false, error: (error as Error).message });
    throw error;
  }
}
