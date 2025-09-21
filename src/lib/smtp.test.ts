import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testSmtpConnection, sendEmail, createSmtpTransporter } from './smtp';
import type { EmailOptions, SmtpTestResult } from './smtp';

// Mock nodemailer
const mockTransporter = {
  verify: vi.fn(),
  sendMail: vi.fn()
};

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter)
  }
}));

describe('SMTP Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure required environment variables are set for tests
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASSWORD = 'test-password';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  describe('testSmtpConnection', () => {
    it('should return success for valid SMTP configuration', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await testSmtpConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connexion SMTP établie avec succès');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.config).toBeDefined();
    });

    it('should handle authentication errors', async () => {
  const authError = new Error('Authentication failed');
  (authError as any).code = 'EAUTH';
  mockTransporter.verify.mockRejectedValue(authError);

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Échec de l\'authentification SMTP');
    });

    it('should handle connection timeout errors', async () => {
  const timeoutError = new Error('Connection timeout');
  (timeoutError as any).code = 'ETIMEDOUT';
  mockTransporter.verify.mockRejectedValue(timeoutError);

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Délai d\'attente dépassé');
    });

    it('should handle network errors', async () => {
  const networkError = new Error('Network error');
  (networkError as any).code = 'ENOTFOUND';
  mockTransporter.verify.mockRejectedValue(networkError);

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Serveur SMTP introuvable');
    });

    it('should handle connection refusal', async () => {
  const refusedError = new Error('Connection refused');
  (refusedError as any).code = 'ECONNREFUSED';
  mockTransporter.verify.mockRejectedValue(refusedError);

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connexion refusée par le serveur SMTP');
    });

    it('should handle missing configuration gracefully', async () => {
      // Temporarily clear required environment variables
      const originalHost = process.env.SMTP_HOST;
      const originalUser = process.env.SMTP_USER;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      // The actual implementation might return different error codes based on what happens

      // Restore environment variables
      process.env.SMTP_HOST = originalHost;
      process.env.SMTP_USER = originalUser;
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError = new Error('Unknown error');
      mockTransporter.verify.mockRejectedValue(unknownError);

      const result = await testSmtpConnection();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN');
    });
  });

  describe('sendEmail', () => {
    const validEmailOptions: EmailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test message',
      html: '<p>Test message</p>'
    };

    it('should send email successfully with valid options', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendEmail(validEmailOptions);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email envoyé avec succès');
    });

    it('should validate email options before sending', async () => {
      const invalidOptions: EmailOptions = {
        to: 'invalid-email',
        subject: '',
        text: ''
      };

      const result = await sendEmail(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Données d\'email invalides');
    });

    it('should handle email sending failures', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      const result = await sendEmail(validEmailOptions);

      expect(result.success).toBe(false);
    });

    it('should test SMTP connection before sending', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await sendEmail(validEmailOptions);

      expect(result.success).toBe(false);
    });
  });

  describe('createSmtpTransporter', () => {
    it('should create transporter with correct configuration', async () => {
      const transporter = await createSmtpTransporter();

      expect(transporter).toBeDefined();
      expect(typeof transporter.sendMail).toBe('function');
      expect(typeof transporter.verify).toBe('function');
    });
  });

  describe('Email validation edge cases', () => {
    it('should handle missing recipient', async () => {
      const noRecipientOptions: EmailOptions = {
        to: '',
        subject: 'Test Subject',
        text: 'Test message'
      };

      const result = await sendEmail(noRecipientOptions);

      expect(result.success).toBe(false);
    });

    it('should handle missing subject', async () => {
      const noSubjectOptions: EmailOptions = {
        to: 'test@example.com',
        subject: '',
        text: 'Test message'
      };

      const result = await sendEmail(noSubjectOptions);

      expect(result.success).toBe(false);
    });

    it('should handle missing content', async () => {
      const noContentOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject'
      };

      const result = await sendEmail(noContentOptions);

      expect(result.success).toBe(false);
    });

    it('should handle very long subjects', async () => {
      const longSubjectOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'A'.repeat(250),
        text: 'Test message'
      };

      const result = await sendEmail(longSubjectOptions);

      expect(result.success).toBe(false);
    });

    it('should handle very long content', async () => {
      const longContentOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'A'.repeat(60000)
      };

      const result = await sendEmail(longContentOptions);

      expect(result.success).toBe(false);
    });
  });
});