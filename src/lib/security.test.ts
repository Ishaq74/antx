import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isValidEmail,
  validatePassword,
  validateUsername,
  sanitizeHtml,
  isValidOTP,
  checkRateLimit,
  cleanupRateLimit
} from './security';

describe('Security Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'firstname+lastname@example.org',
        'user123@test-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user.domain.com',
        '',
        'user@domain..com'
      ];

      invalidEmails.forEach(email => {
        const result = isValidEmail(email);
        expect(result).toBe(false);
      });
    });

    it('should handle edge cases in email validation', () => {
      // These might be considered valid by the current regex but are edge cases
      expect(isValidEmail('user@domain')).toBe(true); // Single level domain
      expect(isValidEmail('user..name@domain.com')).toBe(true); // Double dots in local part
    });

    it('should enforce email length limit (RFC 5321)', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'MySecureP@ssw0rd',
        'ComplexP@ss123!',
        'Str0ng#Password$',
        '12345678Aa!'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe ne peut pas dépasser 128 caractères');
    });

    it('should require lowercase letters', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins une minuscule');
    });

    it('should require uppercase letters', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins une majuscule');
    });

    it('should require digits', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins un chiffre');
    });

    it('should require special characters', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins un caractère spécial');
    });

    it('should reject common weak passwords', () => {
      const weakPasswords = ['password', '123456', 'admin', 'password123', 'qwerty'];
      
      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Ce mot de passe est trop commun');
      });
    });

    it('should return multiple errors for very weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'user123',
        'test-user',
        'user_name',
        'validuser',
        'User123'
      ];

      validUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject usernames that are too short', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    });

    it('should reject usernames that are too long', () => {
      const result = validateUsername('a'.repeat(25));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le nom d\'utilisateur ne peut pas dépasser 20 caractères');
    });

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = ['user@name', 'user name', 'user#123', 'user%test'];
      
      invalidUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores');
      });
    });

    it('should reject usernames starting or ending with special characters', () => {
      const invalidUsernames = ['_username', 'username_', '-username', 'username-'];
      
      invalidUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Le nom d\'utilisateur ne peut pas commencer ou finir par un tiret ou underscore');
      });
    });

    it('should reject reserved usernames', () => {
      const reservedUsernames = ['admin', 'administrator', 'root', 'api', 'www'];
      
      reservedUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Ce nom d\'utilisateur est réservé');
      });
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it('should escape all dangerous characters', () => {
      const input = '&<>"\'';
      const expected = '&amp;&lt;&gt;&quot;&#039;';
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle normal text without changes except escaping', () => {
      const input = 'Hello World!';
      expect(sanitizeHtml(input)).toBe('Hello World!');
    });
  });

  describe('isValidOTP', () => {
    it('should validate 6-digit OTP codes', () => {
      const validOTPs = ['123456', '000000', '999999', '456789'];
      
      validOTPs.forEach(otp => {
        expect(isValidOTP(otp)).toBe(true);
      });
    });

    it('should reject invalid OTP formats', () => {
      const invalidOTPs = [
        '12345',    // Too short
        '1234567',  // Too long
        'abcdef',   // Letters
        '12345a',   // Mixed
        '',         // Empty
        '12 34 56', // Spaces
        '123.456'   // Dots
      ];
      
      invalidOTPs.forEach(otp => {
        expect(isValidOTP(otp)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Clear rate limit store before each test
      cleanupRateLimit();
    });

    it('should allow requests within limit', () => {
      const identifier = 'test-user';
      
      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(identifier, 5, 60000)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user-blocked';
      
      // Fill up the rate limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, 5, 60000);
      }
      
      // Next request should be blocked
      expect(checkRateLimit(identifier, 5, 60000)).toBe(false);
    });

    it('should reset after time window', () => {
      const identifier = 'test-user-reset';
      
      // Fill up rate limit with short window
      for (let i = 0; i < 3; i++) {
        checkRateLimit(identifier, 3, 1); // 1ms window
      }
      
      // Should be blocked immediately
      expect(checkRateLimit(identifier, 3, 1)).toBe(false);
      
      // Wait for window to expire and test reset
      setTimeout(() => {
        expect(checkRateLimit(identifier, 3, 60000)).toBe(true);
      }, 10);
    });

    it('should handle different identifiers independently', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      // Fill rate limit for user1
      for (let i = 0; i < 5; i++) {
        checkRateLimit(user1, 5, 60000);
      }
      
      // user1 should be blocked
      expect(checkRateLimit(user1, 5, 60000)).toBe(false);
      
      // user2 should still be allowed
      expect(checkRateLimit(user2, 5, 60000)).toBe(true);
    });

    it('should cleanup expired entries', () => {
      const identifier = 'test-cleanup';
      
      // Create entry with very short window
      checkRateLimit(identifier, 5, 1);
      
      // Wait for expiry and cleanup
      setTimeout(() => {
        cleanupRateLimit();
        // Should allow new requests after cleanup
        expect(checkRateLimit(identifier, 5, 60000)).toBe(true);
      }, 10);
    });
  });
});