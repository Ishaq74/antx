// Security validation utilities for the auth system

/**
 * Validates email format using a more comprehensive regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

/**
 * Validates password strength according to security requirements
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  
  if (password.length > 128) {
    errors.push("Le mot de passe ne peut pas dépasser 128 caractères");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'admin', 'password123', 'qwerty'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Ce mot de passe est trop commun");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates username format and security requirements
 */
export function validateUsername(username: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push("Le nom d'utilisateur doit contenir au moins 3 caractères");
  }
  
  if (username.length > 20) {
    errors.push("Le nom d'utilisateur ne peut pas dépasser 20 caractères");
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores");
  }
  
  if (/^[_-]/.test(username) || /[_-]$/.test(username)) {
    errors.push("Le nom d'utilisateur ne peut pas commencer ou finir par un tiret ou underscore");
  }

  // Check for reserved usernames
  const reservedUsernames = ['admin', 'administrator', 'root', 'api', 'www', 'mail', 'ftp', 'support'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    errors.push("Ce nom d'utilisateur est réservé");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates OTP format (6 digits)
 */
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const data = rateLimitStore.get(identifier);

  if (!data || now > data.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (data.count >= maxAttempts) {
    return false;
  }

  data.count++;
  return true;
}

/**
 * Cleans up expired rate limit entries
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup rate limit store every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}