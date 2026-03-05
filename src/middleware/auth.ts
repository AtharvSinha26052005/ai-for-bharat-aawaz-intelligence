import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { redis } from '../db/redis';
import logger from '../utils/logger';

export interface JWTPayload {
  userId: string;
  role: 'user' | 'admin' | 'support';
  language: string;
  preferredLanguage?: string;
  iat: number;
  exp: number;
  jti: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Extracts JWT token from request headers
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Checks if token is revoked
 */
async function isTokenRevoked(jti: string): Promise<boolean> {
  const revoked = await redis.get(`revoked:${jti}`);
  return revoked === 'true';
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Check if token is revoked
    if (await isTokenRevoked(payload.jti)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't fail if missing
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

      if (!(await isTokenRevoked(payload.jti))) {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Authorization middleware factory
/**
 * Checks if user has required role
 */
export function authorize(...allowedRoles: Array<'user' | 'admin' | 'support'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}

/**
 * Alias for authorize - requires specific role
 */
export const requireRole = authorize;

/**
 * Generates JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>): string {
  const jti = require('crypto').randomBytes(16).toString('hex');

  return jwt.sign(
    {
      ...payload,
      jti,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiry,
    } as jwt.SignOptions
  );
}

/**
 * Generates refresh token
 */
export function generateRefreshToken(userId: string): string {
  const jti = require('crypto').randomBytes(16).toString('hex');

  return jwt.sign(
    {
      userId,
      type: 'refresh',
      jti,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.refreshExpiry,
    } as jwt.SignOptions
  );
}

/**
 * Revokes a token
 */
export async function revokeToken(jti: string): Promise<void> {
  // Store revoked token for the duration of its validity
  await redis.set(`revoked:${jti}`, 'true', 900); // 15 minutes
  logger.info('Token revoked', { jti });
}

/**
 * Verifies refresh token and generates new access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as any;

    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (await isTokenRevoked(payload.jti)) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Generate new access token
    return generateToken({
      userId: payload.userId,
      role: 'user', // Default role, should be fetched from database
      language: 'en',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    throw error;
  }
}
