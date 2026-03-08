import Joi from 'joi';
import { Language, IncomeRange, SchemeCategory, ApplicationStatus } from '../types';

// Language validation
export const languageSchema = Joi.string().valid('hi', 'ta', 'te', 'bn', 'mr', 'en');

// User profile validation schemas
export const userProfileSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  age: Joi.number().integer().min(1).max(120).required(),
  incomeRange: Joi.string().valid('below-1L', '1L-3L', '3L-5L', 'above-5L').required(),
  occupation: Joi.string().max(100).required(),
  familyComposition: Joi.object({
    adults: Joi.number().integer().min(0).required(),
    children: Joi.number().integer().min(0).required(),
    seniors: Joi.number().integer().min(0).required(),
    dependents: Joi.number().integer().min(0).optional(),
  }).required(),
  location: Joi.object({
    state: Joi.string().required(),
    district: Joi.string().required(),
    block: Joi.string().empty('').optional(),
    village: Joi.string().empty('').optional(),
    pincode: Joi.string().pattern(/^\d{6}$/).empty('').optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
    }).optional(),
  }).required(),
  primaryNeeds: Joi.array().items(Joi.string()).min(1).required(),
  preferredLanguage: languageSchema.required(),
  preferredMode: Joi.string().valid('voice', 'text', 'both').required(),
  consentGiven: Joi.boolean().required(),
  consentDate: Joi.date().optional(),
});

// Scheme validation schemas
export const schemeSchema = Joi.object({
  schemeId: Joi.string().uuid().optional(),
  officialName: Joi.string().max(500).required(),
  category: Joi.string().valid(
    'agriculture',
    'education',
    'health',
    'housing',
    'employment',
    'pension',
    'women_welfare',
    'child_welfare',
    'disability',
    'financial_inclusion',
    'other'
  ).required(),
  level: Joi.string().valid('central', 'state').required(),
  state: Joi.string().when('level', {
    is: 'state',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  launchDate: Joi.date().required(),
  endDate: Joi.date().optional(),
  active: Joi.boolean().default(true),
  officialWebsite: Joi.string().uri().optional(),
  helplineNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
});

// Application validation schemas
export const applicationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  schemeId: Joi.string().uuid().required(),
  formData: Joi.object().optional(),
});

// Fraud analysis validation schemas
export const fraudAnalysisSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  contentType: Joi.string().valid('message', 'call_transcript', 'url').required(),
  content: Joi.string().required(),
  metadata: Joi.object({
    senderNumber: Joi.string().optional(),
    timestamp: Joi.date().optional(),
    platform: Joi.string().optional(),
  }).optional(),
});

// Conversation interaction validation schemas
export const textInteractionSchema = Joi.object({
  message: Joi.string().max(1000).required(),
  language: languageSchema.required(),
  sessionId: Joi.string().uuid().optional(),
});

export const voiceInteractionSchema = Joi.object({
  audio: Joi.string().required(), // base64 encoded
  language: languageSchema.optional(),
  sessionId: Joi.string().uuid().optional(),
  lowBandwidthMode: Joi.boolean().optional(),
});

// Financial education validation schemas
export const lessonStartSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  lessonId: Joi.string().required(),
});

export const exerciseSubmitSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  sessionId: Joi.string().uuid().required(),
  exerciseId: Joi.string().required(),
  answer: Joi.string().required(),
});

/**
 * Validates data against a Joi schema
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validate<T>(schema: Joi.Schema, data: any): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw new ValidationError('Validation failed', details);
  }

  return value as T;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public details: Array<{ field: string; message: string }>;

  constructor(message: string, details: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Sanitizes user input to prevent XSS and injection attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');

  // Limit length
  sanitized = sanitized.substring(0, 1000);

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates age is within acceptable range
 * @param age - Age to validate
 * @returns True if valid
 */
export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= 1 && age <= 120;
}

/**
 * Validates location has required fields
 * @param location - Location object to validate
 * @returns True if valid
 */
export function isValidLocation(location: any): boolean {
  return (
    location &&
    typeof location.state === 'string' &&
    location.state.length > 0 &&
    typeof location.district === 'string' &&
    location.district.length > 0
  );
}

/**
 * Validates income range
 * @param incomeRange - Income range to validate
 * @returns True if valid
 */
export function isValidIncomeRange(incomeRange: string): incomeRange is IncomeRange {
  return ['below-1L', '1L-3L', '3L-5L', 'above-5L'].includes(incomeRange);
}

/**
 * Validates language code
 * @param language - Language code to validate
 * @returns True if valid
 */
export function isValidLanguage(language: string): language is Language {
  return ['hi', 'ta', 'te', 'bn', 'mr', 'en'].includes(language);
}

/**
 * Ensures a route parameter is a string (not an array)
 * @param param - Route parameter from req.params
 * @returns String value
 * @throws ValidationError if param is an array or undefined
 */
export function ensureString(param: string | string[] | undefined, paramName: string = 'parameter'): string {
  if (param === undefined) {
    throw new ValidationError(`${paramName} is required`, [{ field: paramName, message: `${paramName} is required` }]);
  }
  if (Array.isArray(param)) {
    throw new ValidationError(`${paramName} must be a single value`, [{ field: paramName, message: `${paramName} must be a single value, not an array` }]);
  }
  return param;
}
