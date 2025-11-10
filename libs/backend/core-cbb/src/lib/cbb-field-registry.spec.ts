/**
 * Unit tests for CBB Field Registry
 * Tests field lookup, validation, and metadata retrieval
 */

import {
  CBBFieldDefinition,
  CBBFieldType,
  CBBFieldRegistry,
  getFieldDefinition,
  getFieldById,
  getFieldsByCategory,
  validateFieldValue,
} from './cbb-field-registry';

describe('CBBFieldRegistry', () => {
  describe('getFieldDefinition', () => {
    it('should retrieve field by name', () => {
      const field = getFieldDefinition('visa_validity');

      expect(field).toBeDefined();
      expect(field?.id).toBe('816014');
      expect(field?.name).toBe('visa_validity');
      expect(field?.type).toBe(CBBFieldType.Text);
      expect(field?.category).toBe('visa');
    });

    it('should retrieve field by ID', () => {
      const field = getFieldDefinition('816014');

      expect(field).toBeDefined();
      expect(field?.id).toBe('816014');
      expect(field?.name).toBe('visa_validity');
    });

    it('should return undefined for unknown field', () => {
      const field = getFieldDefinition('unknown_field');

      expect(field).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const field = getFieldDefinition('');

      expect(field).toBeUndefined();
    });

    it('should handle case-insensitive lookup', () => {
      // Field names should be case-sensitive (lowercase required)
      const lowerField = getFieldDefinition('visa_validity');
      const upperField = getFieldDefinition('VISA_VALIDITY');

      expect(lowerField).toBeDefined();
      expect(upperField).toBeUndefined(); // Case-sensitive
    });
  });

  describe('getFieldById', () => {
    it('should retrieve field by ID', () => {
      const field = getFieldById('816014');

      expect(field).toBeDefined();
      expect(field?.name).toBe('visa_validity');
    });

    it('should return undefined for unknown ID', () => {
      const field = getFieldById('999999');

      expect(field).toBeUndefined();
    });

    it('should retrieve system field by negative ID', () => {
      const field = getFieldById('-12');

      expect(field).toBeDefined();
      expect(field?.name).toBe('email');
    });
  });

  describe('getFieldsByCategory', () => {
    it('should retrieve all system fields', () => {
      const fields = getFieldsByCategory('system');

      expect(fields.length).toBeGreaterThanOrEqual(2);
      expect(fields.some((f) => f.name === 'email')).toBe(true);
      expect(fields.some((f) => f.name === 'phone')).toBe(true);
    });

    it('should retrieve all visa fields', () => {
      const fields = getFieldsByCategory('visa');

      expect(fields.length).toBeGreaterThanOrEqual(9);
      expect(fields.some((f) => f.name === 'visa_validity')).toBe(true);
      expect(fields.some((f) => f.name === 'visa_country')).toBe(true);
      expect(fields.some((f) => f.name === 'visa_type')).toBe(true);
    });

    it('should retrieve all order fields', () => {
      const fields = getFieldsByCategory('order');

      expect(fields.length).toBeGreaterThanOrEqual(8);
      expect(fields.some((f) => f.name === 'OrderNumber')).toBe(true);
      expect(fields.some((f) => f.name === 'order_days')).toBe(true);
      expect(fields.some((f) => f.name === 'wa_alerts')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const fields = getFieldsByCategory('unknown' as any);

      expect(fields).toEqual([]);
    });
  });

  describe('validateFieldValue', () => {
    describe('Text fields', () => {
      it('should accept string values', () => {
        const result = validateFieldValue('visa_validity', '6 months');

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept number values (converted to string)', () => {
        const result = validateFieldValue('visa_validity', 180);

        expect(result.valid).toBe(true);
      });

      it('should accept boolean values (converted to string)', () => {
        const result = validateFieldValue('visa_validity', true);

        expect(result.valid).toBe(true);
      });

      it('should reject null/undefined', () => {
        const result = validateFieldValue('visa_validity', null as any);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });
    });

    describe('Number fields', () => {
      it('should accept number values', () => {
        const result = validateFieldValue('order_days', 5);

        expect(result.valid).toBe(true);
      });

      it('should accept numeric strings', () => {
        const result = validateFieldValue('order_days', '5');

        expect(result.valid).toBe(true);
      });

      it('should reject non-numeric strings', () => {
        const result = validateFieldValue('order_days', 'not a number');

        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be a number');
      });

      it('should reject boolean for number fields', () => {
        const result = validateFieldValue('order_days', true);

        expect(result.valid).toBe(false);
      });
    });

    describe('Boolean fields', () => {
      it('should accept boolean true', () => {
        const result = validateFieldValue('order_urgent', true);

        expect(result.valid).toBe(true);
      });

      it('should accept boolean false', () => {
        const result = validateFieldValue('order_urgent', false);

        expect(result.valid).toBe(true);
      });

      it('should accept string "true"', () => {
        const result = validateFieldValue('order_urgent', 'true');

        expect(result.valid).toBe(true);
      });

      it('should accept string "false"', () => {
        const result = validateFieldValue('order_urgent', 'false');

        expect(result.valid).toBe(true);
      });

      it('should reject non-boolean strings', () => {
        const result = validateFieldValue('order_urgent', 'maybe');

        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be a boolean');
      });

      it('should reject numbers for boolean fields', () => {
        const result = validateFieldValue('order_urgent', 1);

        expect(result.valid).toBe(false);
      });
    });

    describe('Date fields', () => {
      it('should accept ISO date strings', () => {
        const result = validateFieldValue(
          'order_date_time',
          '2025-11-10T12:00:00Z',
        );

        expect(result.valid).toBe(true);
      });

      it('should accept Date objects', () => {
        const result = validateFieldValue('order_date_time', new Date());

        expect(result.valid).toBe(true);
      });

      it('should accept unix timestamps', () => {
        const result = validateFieldValue('order_date_time', 1699632000000);

        expect(result.valid).toBe(true);
      });

      it('should reject invalid date strings', () => {
        const result = validateFieldValue('order_date_time', 'not a date');

        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be a valid date');
      });
    });

    it('should return valid for unknown fields (no validation)', () => {
      const result = validateFieldValue('unknown_field', 'any value');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Field Coverage', () => {
    it('should have all confirmed field IDs', () => {
      const expectedFields = [
        { name: 'visa_validity', id: '816014' },
        { name: 'visa_url', id: '592947' },
        { name: 'visa_url_2', id: '905364' },
        { name: 'customer_name', id: '779770' },
        { name: 'order_date_time', id: '100644' },
        { name: 'visa_country', id: '877737' },
        { name: 'visa_entries', id: '863041' },
        { name: 'visa_intent', id: '837162' },
        { name: 'visa_quantity', id: '949873' },
        { name: 'visa_type', id: '527249' },
        { name: 'OrderNumber', id: '459752' },
        { name: 'order_days', id: '271948' },
        { name: 'order_priority', id: '470125' },
        { name: 'order_sum_ils', id: '358366' },
        { name: 'order_urgent', id: '763048' },
        { name: 'wa_alerts', id: '662459' },
        { name: 'stay_limit', id: '189039' },
        { name: 'email', id: '-12' },
        { name: 'phone', id: '-8' },
      ];

      for (const { name, id } of expectedFields) {
        const field = getFieldDefinition(name);
        expect(field).toBeDefined();
        expect(field?.id).toBe(id);
      }
    });

    it('should have correct field types', () => {
      // Text fields (type 0)
      expect(getFieldDefinition('visa_validity')?.type).toBe(CBBFieldType.Text);
      expect(getFieldDefinition('customer_name')?.type).toBe(CBBFieldType.Text);

      // Number fields (type 1)
      expect(getFieldDefinition('order_days')?.type).toBe(CBBFieldType.Number);
      expect(getFieldDefinition('order_sum_ils')?.type).toBe(
        CBBFieldType.Number,
      );
      expect(getFieldDefinition('visa_quantity')?.type).toBe(
        CBBFieldType.Number,
      );

      // Boolean fields (type 4)
      expect(getFieldDefinition('order_urgent')?.type).toBe(
        CBBFieldType.Boolean,
      );
      expect(getFieldDefinition('wa_alerts')?.type).toBe(CBBFieldType.Boolean);

      // Date fields (type 2)
      expect(getFieldDefinition('order_date')?.type).toBe(CBBFieldType.Date);

      // Date & Time fields (type 3)
      expect(getFieldDefinition('order_date_time')?.type).toBe(
        CBBFieldType.DateTime,
      );
    });
  });

  describe('Registry Structure', () => {
    it('should have all fields accessible', () => {
      const allFields = Object.values(CBBFieldRegistry);

      expect(allFields.length).toBeGreaterThanOrEqual(22);
    });

    it('should have unique field IDs', () => {
      const allFields = Object.values(CBBFieldRegistry);
      const ids = allFields.map((f) => f.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have unique field names', () => {
      const allFields = Object.values(CBBFieldRegistry);
      const names = allFields.map((f) => f.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it('should have valid categories', () => {
      const validCategories = ['system', 'customer', 'visa', 'order'];
      const allFields = Object.values(CBBFieldRegistry);

      for (const field of allFields) {
        expect(validCategories).toContain(field.category);
      }
    });
  });
});
