/**
 * Input sanitization utilities for security
 * Validates Requirement 15.1: Sanitize HTML to prevent XSS attacks
 */

/**
 * Sanitizes a string by removing HTML tags and potentially dangerous characters
 * This prevents XSS attacks by stripping out HTML/script tags
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string safe for rendering
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove script tags and their content first
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitizes search query input
 * Validates Requirement 15.1: Add input sanitization for search queries
 * 
 * @param query - The search query to sanitize
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = sanitizeInput(query);
  
  // Remove special characters that could be used for injection
  // Allow alphanumeric, spaces, and common punctuation
  sanitized = sanitized.replace(/[^\w\s\-.,!?()]/g, '');
  
  // Limit length to prevent DoS
  const MAX_QUERY_LENGTH = 200;
  if (sanitized.length > MAX_QUERY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
  }
  
  return sanitized;
}

/**
 * Escapes HTML special characters to prevent XSS
 * 
 * @param text - The text to escape
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const htmlEscapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Validates and sanitizes userId
 * Validates Requirement 15.6: Validate userId before API calls
 * 
 * @param userId - The userId to validate
 * @returns Sanitized userId
 * @throws Error if userId is invalid
 */
export function validateAndSanitizeUserId(userId: string): string {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId: userId must be a non-empty string');
  }
  
  // Remove any whitespace
  const sanitized = userId.trim();
  
  // Validate format: alphanumeric, hyphens, and underscores only
  const validUserIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validUserIdPattern.test(sanitized)) {
    throw new Error('Invalid userId: userId contains invalid characters');
  }
  
  // Limit length
  const MAX_USERID_LENGTH = 100;
  if (sanitized.length > MAX_USERID_LENGTH) {
    throw new Error('Invalid userId: userId is too long');
  }
  
  return sanitized;
}
