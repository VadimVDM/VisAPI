import { Injectable } from '@nestjs/common';

export interface PiiRedactionResult {
  text: string;
  piiFound: boolean;
  redactedFields: string[];
}

@Injectable()
export class PiiRedactionService {
  // PII detection patterns - ordered by specificity to avoid conflicts
  private readonly patterns: {
    [key: string]: { regex: RegExp; replacement: string; name: string };
  } = {
    // Process credit cards first (more specific)
    creditCard: {
      regex: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
      replacement: '[CARD_REDACTED]',
      name: 'credit_card',
    },
    // Process phone numbers after credit cards (less specific)
    phone: {
      regex: /(\s|^)(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      replacement: '$1[PHONE_REDACTED]',
      name: 'phone_number',
    },
    email: {
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      replacement: '[EMAIL_REDACTED]',
      name: 'email',
    },
    ssn: {
      regex: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      replacement: '[SSN_REDACTED]',
      name: 'ssn',
    },
    ipAddress: {
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      replacement: '[IP_REDACTED]',
      name: 'ip_address',
    },
    // Generic patterns for common PII keywords
    address: {
      regex:
        /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl)\b/gi,
      replacement: '[ADDRESS_REDACTED]',
      name: 'address',
    },
    // API keys and tokens
    apiKey: {
      regex: /\b[A-Za-z0-9]{32,}\b/g,
      replacement: '[API_KEY_REDACTED]',
      name: 'api_key',
    },
    // UUIDs (potential sensitive identifiers)
    uuid: {
      regex:
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      replacement: '[UUID_REDACTED]',
      name: 'uuid',
    },
  };

  /**
   * Redact PII from text content
   */
  redactPii(text: string): PiiRedactionResult {
    if (!text || typeof text !== 'string') {
      return {
        text: '',
        piiFound: false,
        redactedFields: [],
      };
    }

    let redactedText = text;
    const redactedFields: string[] = [];

    // Apply each pattern
    for (const pattern of Object.values(this.patterns)) {
      const matches = redactedText.match(pattern.regex);
      if (matches && matches.length > 0) {
        redactedText = redactedText.replace(pattern.regex, pattern.replacement);
        redactedFields.push(pattern.name);
      }
    }

    return {
      text: redactedText,
      piiFound: redactedFields.length > 0,
      redactedFields,
    };
  }

  /**
   * Redact PII from an object (recursively)
   */
  redactPiiFromObject(obj: unknown): {
    obj: unknown;
    piiFound: boolean;
    redactedFields: string[];
  } {
    if (obj === null || obj === undefined) {
      return { obj, piiFound: false, redactedFields: [] };
    }

    if (typeof obj === 'string') {
      const result = this.redactPii(obj);
      return {
        obj: result.text,
        piiFound: result.piiFound,
        redactedFields: result.redactedFields,
      };
    }

    if (typeof obj !== 'object') {
      return { obj, piiFound: false, redactedFields: [] };
    }

    const redactedObj: Record<string, unknown> | unknown[] = Array.isArray(obj)
      ? []
      : {};
    let globalPiiFound = false;
    const globalRedactedFields: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const result = this.redactPiiFromObject(value);
      if (Array.isArray(redactedObj)) {
        redactedObj.push(result.obj);
      } else {
        redactedObj[key] = result.obj;
      }

      if (result.piiFound) {
        globalPiiFound = true;
        globalRedactedFields.push(...result.redactedFields);
      }
    }

    return {
      obj: redactedObj,
      piiFound: globalPiiFound,
      redactedFields: [...new Set(globalRedactedFields)],
    };
  }

  /**
   * Check if text contains PII without redacting
   */
  containsPii(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    return Object.values(this.patterns).some((pattern) =>
      pattern.regex.test(text),
    );
  }

  /**
   * Get PII detection statistics
   */
  getPiiStats(text: string): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const pattern of Object.values(this.patterns)) {
      const matches = text.match(pattern.regex);
      stats[pattern.name] = matches ? matches.length : 0;
    }

    return stats;
  }

  /**
   * Add custom PII pattern
   */
  addPattern(name: string, regex: RegExp, replacement: string): void {
    this.patterns[name] = {
      regex,
      replacement,
      name,
    };
  }

  /**
   * Remove PII pattern
   */
  removePattern(name: keyof PiiRedactionService['patterns']): void {
    delete this.patterns[name];
  }

  /**
   * Get all configured patterns
   */
  getPatterns(): Record<
    string,
    { regex: RegExp; replacement: string; name: string }
  > {
    return { ...this.patterns };
  }
}
