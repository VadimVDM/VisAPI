# CBB WhatsApp Integration Library

ChatGPT Builder (CBB) API integration for WhatsApp Business messaging using pre-approved templates.

## Purpose

Provides WhatsApp Business messaging capabilities via CBB's API, handling contact management, template-based message sending, and flow template execution.

## Key Components

### CbbClientService
- Full CBB API client with retry logic and error handling
- Contact CRUD operations with custom field support
- WhatsApp Business template messaging with parameter support
- Order confirmation template with Hebrew translations
- Phone number validation and contact resolution

## Authentication

CBB uses `X-ACCESS-TOKEN` header authentication (not Bearer token).

## Important Notes

- **Contact IDs**: CBB uses phone numbers as IDs (e.g., "972507758758")
- **Template Requirement**: WhatsApp Business API requires pre-approved templates only
- **Template Format**: Uses `messaging_product: "whatsapp"` format with components
- **Dynamic Content**: Plain text messages create in CBB but don't deliver via WhatsApp
- **Field Mapping**: Custom fields mapped by ID, not name (see fieldIdMap)
- **API Limitations**: Cannot update basic contact fields after creation

## Usage Example

```typescript
// Create contact with custom fields
const contact = await cbbService.createContactWithFields({
  id: phone,
  phone: phone,
  name: 'Customer Name',
  email: 'customer@example.com',
  cufs: {
    customer_name: 'John Doe',
    visa_country: 'USA',
    OrderNumber: 'ORD-123'
  }
});

// Send WhatsApp template message
await cbbService.sendWhatsAppTemplate(
  contactId,
  'order_confirmation_global',
  'he', // Hebrew
  [customerName, country, flag, orderNum, visaType, count, amount, days]
);

// Send order confirmation template
await cbbService.sendOrderConfirmation(contactId, {
  customerName: 'ישראל ישראלי',
  country: 'בריטניה',
  countryFlag: '🇬🇧',
  orderNumber: 'ORD-123',
  visaType: 'תיירות שנה',
  applicantCount: '2',
  paymentAmount: '99',
  processingDays: '3'
});

// Send using flow template
await cbbService.sendFlow(contactId, flowId);
```

## WhatsApp Template Format

WhatsApp Business API requires this specific template format:

```json
{
  "messages": [
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "972507758758",
      "type": "template",
      "template": {
        "name": "order_confirmation_global",
        "language": {
          "code": "he"
        },
        "components": [
          {
            "type": "body",
            "parameters": [
              { "type": "text", "text": "Customer Name" },
              { "type": "text", "text": "Country" },
              { "type": "text", "text": "🇬🇧" },
              { "type": "text", "text": "ORD-123" },
              { "type": "text", "text": "Visa Type" },
              { "type": "text", "text": "2" },
              { "type": "text", "text": "99" },
              { "type": "text", "text": "3" }
            ]
          }
        ]
      }
    }
  ]
}
```

## Field ID Mapping

```typescript
'Email': '-12'
'Phone Number': '-8'  
'customer_name': '779770'
'visa_country': '877737'
'visa_type': '527249'
'OrderNumber': '459752'
// ... see fieldIdMap for complete list
```

## Error Handling

- `CbbApiError`: General API errors with status codes
- `ContactNotFoundError`: Specific error for missing contacts
- Automatic retry with exponential backoff for transient failures

Last Updated: August 22, 2025