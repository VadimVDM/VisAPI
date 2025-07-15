import { Test, TestingModule } from '@nestjs/testing';
import { PiiRedactionService } from './pii-redaction.service';

describe('PiiRedactionService', () => {
  let service: PiiRedactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PiiRedactionService],
    }).compile();

    service = module.get<PiiRedactionService>(PiiRedactionService);
  });

  describe('redactPii', () => {
    it('should redact phone numbers', () => {
      const testCases = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '123.456.7890',
        '1234567890',
      ];

      testCases.forEach(phone => {
        const result = service.redactPii(`Call me at ${phone}`);
        expect(result.text).toBe('Call me at [PHONE_REDACTED]');
        expect(result.piiFound).toBe(true);
        expect(result.redactedFields).toContain('phone_number');
      });
    });

    it('should redact email addresses', () => {
      const testCases = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.org',
      ];

      testCases.forEach(email => {
        const result = service.redactPii(`Contact us at ${email}`);
        expect(result.text).toBe('Contact us at [EMAIL_REDACTED]');
        expect(result.piiFound).toBe(true);
        expect(result.redactedFields).toContain('email');
      });
    });

    it('should redact credit card numbers', () => {
      const testCases = [
        '1234 5678 9012 3456',
        '1234-5678-9012-3456',
        '1234.5678.9012.3456',
        '1234567890123456',
      ];

      testCases.forEach(card => {
        const result = service.redactPii(`Card: ${card}`);
        expect(result.text).toBe('Card: [CARD_REDACTED]');
        expect(result.piiFound).toBe(true);
        expect(result.redactedFields).toContain('credit_card');
      });
    });

    it('should redact SSN numbers', () => {
      const testCases = [
        '123-45-6789',
        '123456789',
      ];

      testCases.forEach(ssn => {
        const result = service.redactPii(`SSN: ${ssn}`);
        expect(result.text).toBe('SSN: [SSN_REDACTED]');
        expect(result.piiFound).toBe(true);
        expect(result.redactedFields).toContain('ssn');
      });
    });

    it('should redact IP addresses', () => {
      const testCases = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ];

      testCases.forEach(ip => {
        const result = service.redactPii(`Server IP: ${ip}`);
        expect(result.text).toBe('Server IP: [IP_REDACTED]');
        expect(result.piiFound).toBe(true);
        expect(result.redactedFields).toContain('ip_address');
      });
    });

    it('should redact multiple PII types in one text', () => {
      const text = 'Contact John at john@example.com or call +1234567890. IP: 192.168.1.1';
      const result = service.redactPii(text);
      
      expect(result.text).toBe('Contact John at [EMAIL_REDACTED] or call [PHONE_REDACTED]. IP: [IP_REDACTED]');
      expect(result.piiFound).toBe(true);
      expect(result.redactedFields).toContain('email');
      expect(result.redactedFields).toContain('phone_number');
      expect(result.redactedFields).toContain('ip_address');
    });

    it('should handle empty or null input', () => {
      expect(service.redactPii('')).toEqual({
        text: '',
        piiFound: false,
        redactedFields: [],
      });

      expect(service.redactPii(null as any)).toEqual({
        text: '',
        piiFound: false,
        redactedFields: [],
      });

      expect(service.redactPii(undefined as any)).toEqual({
        text: '',
        piiFound: false,
        redactedFields: [],
      });
    });

    it('should handle non-string input', () => {
      const result = service.redactPii(123 as any);
      expect(result.text).toBe('');
      expect(result.piiFound).toBe(false);
    });

    it('should not modify text without PII', () => {
      const text = 'This is a normal message without sensitive data';
      const result = service.redactPii(text);
      
      expect(result.text).toBe(text);
      expect(result.piiFound).toBe(false);
      expect(result.redactedFields).toEqual([]);
    });
  });

  describe('redactPiiFromObject', () => {
    it('should redact PII from object properties', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        metadata: {
          ip: '192.168.1.1',
          notes: 'Contact at jane@test.com',
        },
      };

      const result = service.redactPiiFromObject(obj);

      expect(result.obj.name).toBe('John Doe');
      expect(result.obj.email).toBe('[EMAIL_REDACTED]');
      expect(result.obj.phone).toBe('[PHONE_REDACTED]');
      expect(result.obj.metadata.ip).toBe('[IP_REDACTED]');
      expect(result.obj.metadata.notes).toBe('Contact at [EMAIL_REDACTED]');
      expect(result.piiFound).toBe(true);
      expect(result.redactedFields).toContain('email');
      expect(result.redactedFields).toContain('phone_number');
      expect(result.redactedFields).toContain('ip_address');
    });

    it('should handle arrays', () => {
      const arr = [
        'john@example.com',
        '+1234567890',
        'normal text',
      ];

      const result = service.redactPiiFromObject(arr);

      expect(result.obj[0]).toBe('[EMAIL_REDACTED]');
      expect(result.obj[1]).toBe('[PHONE_REDACTED]');
      expect(result.obj[2]).toBe('normal text');
      expect(result.piiFound).toBe(true);
    });

    it('should handle nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              email: 'deep@example.com',
            },
          },
        },
      };

      const result = service.redactPiiFromObject(obj);

      expect(result.obj.level1.level2.level3.email).toBe('[EMAIL_REDACTED]');
      expect(result.piiFound).toBe(true);
    });

    it('should handle non-object input', () => {
      const result = service.redactPiiFromObject('test@example.com');
      expect(result.obj).toBe('[EMAIL_REDACTED]');
      expect(result.piiFound).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(service.redactPiiFromObject(null).obj).toBe(null);
      expect(service.redactPiiFromObject(undefined).obj).toBe(undefined);
    });
  });

  describe('containsPii', () => {
    it('should detect PII presence', () => {
      expect(service.containsPii('Contact: john@example.com')).toBe(true);
      expect(service.containsPii('Call +1234567890')).toBe(true);
      expect(service.containsPii('Normal text')).toBe(false);
      expect(service.containsPii('')).toBe(false);
      expect(service.containsPii(null as any)).toBe(false);
    });
  });

  describe('getPiiStats', () => {
    it('should return PII statistics', () => {
      const text = 'Contact john@example.com or jane@test.com, call +1234567890 or +0987654321';
      const stats = service.getPiiStats(text);

      expect(stats.email).toBe(2);
      expect(stats.phone_number).toBe(2);
      expect(stats.credit_card).toBe(0);
      expect(stats.ssn).toBe(0);
    });

    it('should handle empty text', () => {
      const stats = service.getPiiStats('');
      expect(Object.values(stats).every(count => count === 0)).toBe(true);
    });
  });

  describe('pattern management', () => {
    it('should allow adding custom patterns', () => {
      const customRegex = /CUSTOM-\d{4}/g;
      service.addPattern('custom', customRegex, '[CUSTOM_REDACTED]');

      const result = service.redactPii('Code: CUSTOM-1234');
      expect(result.text).toBe('Code: [CUSTOM_REDACTED]');
      expect(result.piiFound).toBe(true);
    });

    it('should allow removing patterns', () => {
      service.removePattern('email');
      
      const result = service.redactPii('Contact: john@example.com');
      expect(result.text).toBe('Contact: john@example.com');
      expect(result.piiFound).toBe(false);
    });

    it('should return all patterns', () => {
      const patterns = service.getPatterns();
      expect(patterns).toHaveProperty('email');
      expect(patterns).toHaveProperty('phone');
      expect(patterns).toHaveProperty('creditCard');
    });
  });
});