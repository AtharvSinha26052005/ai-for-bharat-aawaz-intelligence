import {
  sanitizeInput,
  sanitizeSearchQuery,
  escapeHtml,
  validateAndSanitizeUserId,
} from './sanitization';

describe('sanitization utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).toBe('Click me');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeInput(input);
      expect(result).toBe('alert(1)');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should preserve safe text', () => {
      const input = 'This is safe text';
      expect(sanitizeInput(input)).toBe('This is safe text');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove HTML tags from search query', () => {
      const query = '<script>alert("xss")</script>agriculture';
      const result = sanitizeSearchQuery(query);
      expect(result).toBe('agriculture');
    });

    it('should remove special characters', () => {
      const query = 'agriculture@#$%scheme';
      const result = sanitizeSearchQuery(query);
      expect(result).toBe('agriculturescheme');
    });

    it('should preserve alphanumeric and common punctuation', () => {
      const query = 'agriculture scheme-2024 (test)';
      const result = sanitizeSearchQuery(query);
      expect(result).toBe('agriculture scheme-2024 (test)');
    });

    it('should limit query length', () => {
      const longQuery = 'a'.repeat(300);
      const result = sanitizeSearchQuery(longQuery);
      expect(result.length).toBe(200);
    });

    it('should handle empty query', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeSearchQuery(null as any)).toBe('');
      expect(sanitizeSearchQuery(undefined as any)).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const text = '<div>Test & "quotes"</div>';
      const result = escapeHtml(text);
      expect(result).toBe('&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;&#x2F;div&gt;');
    });

    it('should escape single quotes', () => {
      const text = "It's a test";
      const result = escapeHtml(text);
      expect(result).toBe('It&#x27;s a test');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });

    it('should preserve safe text', () => {
      const text = 'Safe text without special chars';
      expect(escapeHtml(text)).toBe('Safe text without special chars');
    });
  });

  describe('validateAndSanitizeUserId', () => {
    it('should accept valid userId', () => {
      const userId = 'user123';
      expect(validateAndSanitizeUserId(userId)).toBe('user123');
    });

    it('should accept userId with hyphens and underscores', () => {
      const userId = 'user-123_test';
      expect(validateAndSanitizeUserId(userId)).toBe('user-123_test');
    });

    it('should trim whitespace', () => {
      const userId = '  user123  ';
      expect(validateAndSanitizeUserId(userId)).toBe('user123');
    });

    it('should throw error for empty userId', () => {
      expect(() => validateAndSanitizeUserId('')).toThrow('Invalid userId');
    });

    it('should throw error for userId with special characters', () => {
      expect(() => validateAndSanitizeUserId('user@123')).toThrow('Invalid userId');
      expect(() => validateAndSanitizeUserId('user#123')).toThrow('Invalid userId');
      expect(() => validateAndSanitizeUserId('user<script>')).toThrow('Invalid userId');
    });

    it('should throw error for too long userId', () => {
      const longUserId = 'a'.repeat(101);
      expect(() => validateAndSanitizeUserId(longUserId)).toThrow('Invalid userId');
    });

    it('should throw error for non-string input', () => {
      expect(() => validateAndSanitizeUserId(null as any)).toThrow('Invalid userId');
      expect(() => validateAndSanitizeUserId(undefined as any)).toThrow('Invalid userId');
    });
  });
});
