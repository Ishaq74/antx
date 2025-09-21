// Test setup file for Vitest
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'test-secret-for-vitest-only-not-production';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock SMTP configuration for testing
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.SMTP_FROM = 'noreply@test.com';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};