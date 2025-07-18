/**
 * Validation utility functions shared across the application
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '').substring(0, 1000); // Limit length
}

export function redactPII(text: string): string {
  // Basic PII redaction patterns
  return text
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL_REDACTED]'
    )
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD_REDACTED]')
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE_REDACTED]');
}

// Password validation types and interfaces
export interface PasswordStrength {
  score: number; // 0-4 (weak to very strong)
  feedback: string[];
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasDigits: boolean;
  hasSymbols: boolean;
  hasMinLength: boolean;
  isValid: boolean;
}

export interface PasswordRequirements {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireDigits: boolean;
  requireSymbols: boolean;
}

// Default password requirements matching Supabase settings
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSymbols: true,
};

export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordStrength {
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const hasMinLength = password.length >= requirements.minLength;

  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (!hasMinLength) {
    feedback.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += 1;
  }

  // Check character requirements
  if (requirements.requireLowercase && !hasLowercase) {
    feedback.push('Password must contain lowercase letters');
  } else if (hasLowercase) {
    score += 1;
  }

  if (requirements.requireUppercase && !hasUppercase) {
    feedback.push('Password must contain uppercase letters');
  } else if (hasUppercase) {
    score += 1;
  }

  if (requirements.requireDigits && !hasDigits) {
    feedback.push('Password must contain digits');
  } else if (hasDigits) {
    score += 1;
  }

  if (requirements.requireSymbols && !hasSymbols) {
    feedback.push('Password must contain symbols (!@#$%^&*...)');
  } else if (hasSymbols) {
    score += 1;
  }

  // Bonus points for extra length and diversity
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Check for common patterns and reduce score
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123|abc|password|qwerty/i, // Common sequences
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid common patterns and repeated characters');
      break;
    }
  }

  const isValid = 
    hasMinLength &&
    (!requirements.requireLowercase || hasLowercase) &&
    (!requirements.requireUppercase || hasUppercase) &&
    (!requirements.requireDigits || hasDigits) &&
    (!requirements.requireSymbols || hasSymbols);

  return {
    score: Math.min(4, score),
    feedback,
    hasLowercase,
    hasUppercase,
    hasDigits,
    hasSymbols,
    hasMinLength,
    isValid,
  };
}

export function generateSecurePassword(length: number = 14): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Ensure we have at least one character from each required category
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest with random characters from all categories
  const allChars = lowercase + uppercase + digits + symbols;
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
