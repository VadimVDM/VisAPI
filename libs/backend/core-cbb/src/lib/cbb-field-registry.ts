/**
 * CBB (Click2Bot) Custom Field Registry
 *
 * Centralized registry of all CBB custom fields with stable IDs and metadata.
 * Field IDs are stable and should be used as the primary identifier.
 * Field names may change in the CBB dashboard, so IDs provide better reliability.
 *
 * @see libs/backend/core-cbb/CLAUDE.md for full documentation
 */

/**
 * CBB Custom Field Definition
 * Contains all metadata for a custom field in the CBB system
 */
export interface CBBFieldDefinition {
  /** Stable CBB field ID (primary identifier) */
  id: string;

  /** Field name as shown in CBB dashboard (may change) */
  name: string;

  /**
   * Field type from CBB API:
   * 0=Text, 1=Number, 2=Date, 3=Date & Time, 4=Boolean, 5=Long Text, 6=Select, 7=Multi Select
   * @see https://app.chatgptbuilder.io/api/swagger/ - Custom_field model
   */
  type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  /** Human-readable description of field purpose */
  description: string;

  /** Logical grouping for organization */
  category: 'order' | 'visa' | 'customer' | 'system';
}

/**
 * CBB Custom Field Type Enum
 * Maps to CBB API field type integers
 * @see https://app.chatgptbuilder.io/api/swagger/ - Custom_field model
 */
export enum CBBFieldType {
  Text = 0,
  Number = 1,
  Date = 2,
  DateTime = 3,
  Boolean = 4,
  LongText = 5,
  Select = 6,
  MultiSelect = 7,
}

/**
 * Complete registry of all CBB custom fields used in VisAPI
 *
 * Field Types (from CBB API):
 * - 0 (Text): String values
 * - 1 (Number): Integer or decimal values
 * - 2 (Date): Unix timestamp in seconds (date only, no time)
 * - 3 (Date & Time): Unix timestamp in seconds (date + time)
 * - 4 (Boolean): 1 for true, 0 for false
 * - 5 (Long Text): Multiline string values
 * - 6 (Select): Dropdown with single selection
 * - 7 (Multi Select): Dropdown with multiple selections
 *
 * System Fields (negative IDs):
 * - Email: -12
 * - Phone Number: -8
 *
 * @see https://app.chatgptbuilder.io/api/swagger/ - GET /accounts/custom_fields endpoint
 */
export const CBB_FIELD_REGISTRY: Record<string, CBBFieldDefinition> = {
  // ========================
  // SYSTEM FIELDS
  // ========================

  email: {
    id: '-12',
    name: 'Email',
    type: 0,
    description: 'Contact email address (system field)',
    category: 'system',
  },

  Email: {
    id: '-12',
    name: 'Email',
    type: 0,
    description: 'Contact email address (system field, alias)',
    category: 'system',
  },

  phone: {
    id: '-8',
    name: 'Phone Number',
    type: 0,
    description: 'Contact phone number in E.164 format (system field)',
    category: 'system',
  },

  'Phone Number': {
    id: '-8',
    name: 'Phone Number',
    type: 0,
    description: 'Contact phone number (system field, alias)',
    category: 'system',
  },

  // ========================
  // CUSTOMER FIELDS
  // ========================

  customer_name: {
    id: '779770',
    name: 'customer_name',
    type: 0,
    description: 'Customer full name (Hebrew)',
    category: 'customer',
  },

  // ========================
  // VISA FIELDS
  // ========================

  visa_country: {
    id: '877737',
    name: 'visa_country',
    type: 0,
    description: 'Destination country name (Hebrew)',
    category: 'visa',
  },

  visa_type: {
    id: '527249',
    name: 'visa_type',
    type: 0,
    description: 'Visa document type (e.g., tourist, business)',
    category: 'visa',
  },

  visa_quantity: {
    id: '949873',
    name: 'visa_quantity',
    type: 1,
    description: 'Number of applicants',
    category: 'visa',
  },

  visa_intent: {
    id: '837162',
    name: 'visa_intent',
    type: 0,
    description: 'Purpose of travel (tourism, business, medical, etc.)',
    category: 'visa',
  },

  visa_entries: {
    id: '863041',
    name: 'visa_entries',
    type: 0,
    description: 'Entry type (single, multiple)',
    category: 'visa',
  },

  visa_validity: {
    id: '816014',
    name: 'visa_validity',
    type: 0,
    description:
      'Visa document validity period with units (e.g., "6 months", "2 years")',
    category: 'visa',
  },

  visa_flag: {
    id: '824812',
    name: 'visa_flag',
    type: 0,
    description: 'Country flag emoji (e.g., 🇮🇱, 🇬🇧, 🇺🇸)',
    category: 'visa',
  },

  visa_url: {
    id: '592947',
    name: 'visa_url',
    type: 0,
    description: 'URL to approved visa document (primary)',
    category: 'visa',
  },

  visa_url_2: {
    id: '905364',
    name: 'visa_url_2',
    type: 0,
    description: 'URL to second visa document (for multi-applicant orders)',
    category: 'visa',
  },

  stay_limit: {
    id: '189039',
    name: 'stay_limit',
    type: 1,
    description: 'Maximum stay duration in days per visit',
    category: 'visa',
  },

  // ========================
  // ORDER FIELDS
  // ========================

  OrderNumber: {
    id: '459752',
    name: 'OrderNumber',
    type: 0,
    description: 'Vizi order ID (e.g., IL251110CA8)',
    category: 'order',
  },

  order_urgent: {
    id: '763048',
    name: 'order_urgent',
    type: 4,
    description: 'Urgent order flag (1=urgent, 0=standard)',
    category: 'order',
  },

  order_priority: {
    id: '470125',
    name: 'order_priority',
    type: 1,
    description: 'Order priority level',
    category: 'order',
  },

  order_date: {
    id: '661549',
    name: 'order_date',
    type: 2,
    description: 'Travel/entry date (Unix timestamp in seconds)',
    category: 'order',
  },

  order_days: {
    id: '271948',
    name: 'order_days',
    type: 1,
    description: 'Processing time in business days',
    category: 'order',
  },

  order_sum_ils: {
    id: '358366',
    name: 'order_sum_ils',
    type: 1,
    description: 'Total payment amount in ILS',
    category: 'order',
  },

  order_date_time: {
    id: '100644',
    name: 'order_date_time',
    type: 3,
    description:
      'Order creation timestamp with time (Unix timestamp in seconds) - Type 3 = Date & Time',
    category: 'order',
  },

  wa_alerts: {
    id: '662459',
    name: 'wa_alerts',
    type: 4,
    description: 'WhatsApp alerts enabled flag (1=enabled, 0=disabled)',
    category: 'order',
  },
};

/**
 * Lookup a field definition by name or ID
 *
 * @param identifier - Field name (e.g., "visa_validity") or field ID (e.g., "816014")
 * @returns Field definition if found, undefined otherwise
 *
 * @example
 * // Lookup by name
 * const field = getFieldDefinition('visa_validity');
 * console.log(field.id); // "816014"
 *
 * @example
 * // Lookup by ID
 * const field = getFieldDefinition('816014');
 * console.log(field.name); // "visa_validity"
 */
export function getFieldDefinition(
  identifier: string,
): CBBFieldDefinition | undefined {
  // Try direct lookup by name (fast path)
  if (CBB_FIELD_REGISTRY[identifier]) {
    return CBB_FIELD_REGISTRY[identifier];
  }

  // Try lookup by ID (slower, iterates all fields)
  return Object.values(CBB_FIELD_REGISTRY).find(
    (field) => field.id === identifier,
  );
}

/**
 * Get all field definitions in a specific category
 *
 * @param category - Field category to filter by
 * @returns Array of field definitions in that category
 *
 * @example
 * const visaFields = getFieldsByCategory('visa');
 * console.log(visaFields.length); // 7 visa-related fields
 */
export function getFieldsByCategory(
  category: CBBFieldDefinition['category'],
): CBBFieldDefinition[] {
  return Object.values(CBB_FIELD_REGISTRY).filter(
    (field) => field.category === category,
  );
}

/**
 * Validate a field value matches the expected type
 *
 * @param fieldName - Name of the field to validate
 * @param value - Value to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateFieldValue('order_days', 5); // true (number for type 1)
 * validateFieldValue('order_days', 'five'); // false (string for type 1)
 */
export function validateFieldValue(fieldName: string, value: unknown): boolean {
  const field = getFieldDefinition(fieldName);
  if (!field) {
    return false; // Unknown field
  }

  switch (field.type) {
    case 0: // Text
      return typeof value === 'string';
    case 1: // Number
      return typeof value === 'number' && !isNaN(value);
    case 2: // Date (Unix timestamp - date only)
      return typeof value === 'number' && value > 0;
    case 3: // Date & Time (Unix timestamp - date + time)
      return typeof value === 'number' && value > 0;
    case 4: // Boolean (1 or 0)
      return value === 0 || value === 1 || value === true || value === false;
    case 5: // Long Text (multiline string)
      return typeof value === 'string';
    case 6: // Select (single selection - string)
      return typeof value === 'string';
    case 7: // Multi Select (multiple selections - array of strings or comma-separated)
      return (
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((v) => typeof v === 'string'))
      );
    default:
      return false;
  }
}
