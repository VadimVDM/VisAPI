# Visanet Webhooks Module

**Purpose**: Receives document issue reports from Visanet application and sends Hebrew WhatsApp notifications via CBB using Meta templates.

**Created**: October 5, 2025
**Last Updated**: October 5, 2025

---

## Overview

Processes applicant document issues webhook (`POST /api/v1/webhooks/visanet/mistakes`), stores issue data, looks up applicant in Airtable, builds Hebrew WhatsApp template variables, and sends via CBB API using the `fix_mistake_global_hebrew` template.

## Architecture

```
Visanet Webhook → VisanetWebhooksController → ApplicantIssuesService
                                                ↓
                                    ┌───────────┴────────────┐
                                    ↓                        ↓
                        IssuesMessageBuilderService   AirtableLookupService
                                    ↓                        ↓
                          Template Variables          Applicant + Country
                                    ↓                        ↓
                                    └───────────┬────────────┘
                                                ↓
                                     CbbClientService.sendTemplateMessage()
                                                ↓
                                   WhatsApp Template Delivery
```

## WhatsApp Template: `fix_mistake_global_hebrew`

**Template Structure**:

```
שלום {{1}},

נתקלנו בבעיות עם המסמכים שהעליתם למערכת. על מנת לאשר את בקשתכם עבור ויזה ל{{2}}, נדרשים התיקונים הבאים:
*{{3}}*
{{4}}

את התמונות ניתן לשלוח ישירות כאן בוואטסאפ ✅

במידה ויש לכם שאלות או אתם זקוקים לעזרה נוספת, אל תהססו לפנות אלינו - אנחנו כאן כדי לעזור.

בברכה,
צוות ויזה.נט
```

**Variables**:

- `{{1}}` - Applicant name (e.g., "דוד כהן")
- `{{2}}` - Destination country in Hebrew (e.g., "אנגליה", "הודו", "ארה״ב")
- `{{3}}` - Category header with emoji (e.g., "📸 תמונת פנים" or "בעיות במסמכים")
- `{{4}}` - Issues list (bullet for single, numbered for multiple)

**Smart Formatting**:

- **Single issue**: `• תצלום הדרכון חסר - חובה לצלם את העמוד הראשי...`
- **Multiple issues (same category)**: `1) issue\n2) issue\n3) issue`
- **Multiple categories**: Combined numbered list with header "בעיות במסמכים"

## Endpoint Details

**POST** `/api/v1/webhooks/visanet/mistakes`

- **Authentication**: API Key with `webhook:visanet` or `logs:write` scope
- **Header**: `X-API-Key: your_key_here`
- **Content-Type**: `application/json`

### Request Body

```json
{
  "applicantId": "apl_jwGu1dBAxeOc",
  "issues": {
    "face_photo": [{ "value": "without_shirt", "label": "Without Shirt" }],
    "passport_photo": [
      { "value": "with_shadow_light", "label": "With Shadow/Light" },
      { "value": "code_hidden_at_bottom", "label": "Code Hidden at Bottom" }
    ],
    "business": [],
    "passport_expiry": [],
    "application_details": []
  }
}
```

### Response

```json
{
  "success": true,
  "message": "Issues received and WhatsApp notification sent",
  "issueRecordId": "uuid",
  "details": {
    "applicantId": "apl_jwGu1dBAxeOc",
    "applicantName": "דוד כהן",
    "orderId": "IL250928IN7",
    "totalIssues": 2,
    "whatsappSent": true
  }
}
```

## Database: `applicant_issues`

**Key Columns**:

- `applicant_id` - Visanet applicant ID (e.g., apl_jwGu1dBAxeOc)
- `order_id` - Populated after Airtable lookup
- `issues` - JSONB object with categorized issues
- `applicant_name`, `applicant_email`, `applicant_phone` - From Airtable
- `whatsapp_notification_sent` - Delivery tracking flag
- `whatsapp_message_id`, `whatsapp_contact_id` - WhatsApp IDs
- `whatsapp_template_used` - Template name (fix_mistake_global_hebrew)
- `whatsapp_correlation_id` - Message ID correlation tracking
- `status` - `received` → `lookup_completed` → `notification_sent` / `failed`
- `error_message`, `error_code` - Error tracking

**Indexes**: `applicant_id`, `order_id`, `status`, `created_at`, `whatsapp_notification_sent`

## Issue Categories & Translations

**5 Categories** (60+ issue types total):

1. 📸 **Face Photo** (`face_photo`) - 17 issues
2. 🛂 **Passport Photo** (`passport_photo`) - 11 issues
3. 💼 **Business Documents** (`business`) - 4 issues
4. ⏰ **Passport Expiry** (`passport_expiry`) - 5 issues
5. 📋 **Application Details** (`application_details`) - 5 issues

**Translation Constants** (`constants/issue-translations.ts`):

- `ISSUE_TRANSLATIONS_HE` - Issue value → Hebrew description (60+ entries)
- `CATEGORY_LABELS_HE` - Category → Hebrew label with emoji
- `WHATSAPP_TEMPLATE_NAME` - Template identifier

**Issue descriptions are concise, clear, and professional** - optimized for WhatsApp readability.

## Message Flow

1. **Webhook Received** → Create `applicant_issues` record (status: `received`)
2. **Airtable Lookup** → Search completed view by applicantId (currently uses orderId)
3. **Extract Data** → Name, phone, email, country, order ID from Airtable
4. **Build Template Variables** → Generate {{1}}, {{2}}, {{3}}, {{4}} values
5. **Send WhatsApp** → Via `sendTemplateMessage()` with template variables
6. **Update Record** → Mark as `notification_sent`, store template name & message ID

## Services

### `ApplicantIssuesService`

**Main processing logic**:

- `processApplicantIssues()` - End-to-end webhook processing
- `createIssueRecord()` - Database insert
- `updateIssueRecord()` - Status updates
- `extractApplicantName/Phone/Email/CountryName()` - Parse Airtable fields

### `IssuesMessageBuilderService`

**Template variable construction**:

- `buildTemplateVariables()` - Generates template {{1}}-{{4}} variables
- `getTemplateName()` - Returns 'fix_mistake_global_hebrew'
- `countTotalIssues()` - Issue counter across categories
- `groupNonEmptyIssues()` - Filters empty categories

**Export**: `IssueTemplateVariables` interface for type safety

## Module Dependencies

- `SupabaseModule` - Database access
- `BackendCoreCbbModule` - WhatsApp template sending via CBB
- `AirtableModule` - Applicant lookup with country extraction

## Configuration & Setup

### 1. Create API Key

```bash
pnpm create-admin-key
# Creates key with webhook:visanet scope
```

### 2. Sync WhatsApp Template

Template must exist in Meta Business Manager and be synced to backend:

```bash
# Manual sync (if endpoint requires auth)
POST /api/v1/whatsapp/templates/sync

# Or automatic sync happens hourly via cron
```

### 3. Airtable Field Mapping

**Current**: Uses `orderId` for lookup (NOT `applicantId`)
**Country Extraction**: Searches fields: Country, Destination Country, Visa Country
**TODO**: Coordinate with Visanet on correct identifier or extend Airtable lookup

### 4. Phone Normalization

Leading `+` is automatically removed before sending to CBB.

## Testing

### Run Tests

```bash
# Jest unit tests
pnpm nx test backend --testFile=issues-message-builder.service.spec.ts

# Standalone template variable test
node apps/backend/src/webhooks/visanet/scripts/test-template-variables.mjs
```

### Test Endpoint

```bash
curl -X POST https://api.visanet.app/api/v1/webhooks/visanet/mistakes \
  -H "X-API-Key: your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantId": "apl_jwGu1dBAxeOc",
    "issues": {
      "face_photo": [],
      "passport_photo": [
        {"value": "with_shadow_light", "label": "With Shadow/Light"}
      ],
      "business": [],
      "passport_expiry": [],
      "application_details": []
    }
  }'
```

## Common Issues

1. **Applicant Not Found**: Currently searches by `orderId`, not `applicantId` - ensure correct field mapping
2. **No Phone Number**: Fails if Airtable record has no phone field
3. **No Country Found**: Defaults to "היעד" if no country field found in Airtable
4. **Missing Translation**: Falls back to English label if Hebrew translation not found
5. **API Key**: Requires `webhook:visanet` OR `logs:write` scope
6. **Template Not Synced**: Run `/api/v1/whatsapp/templates/sync` if template not found

## Template Variable Examples

**Single Issue**:

```
{{1}}: דוד כהן
{{2}}: אנגליה
{{3}}: 🛂 תצלום דרכון
{{4}}: • תצלום הדרכון חסר - חובה לצלם את העמוד הראשי עם פרטי הדרכון המלאים.
```

**Multiple Issues (Same Category)**:

```
{{1}}: שרה לוי
{{2}}: הודו
{{3}}: 🛂 תצלום דרכון
{{4}}: 1) תצלום הדרכון חתוך בצדדים - חובה שיראו את כל העמוד.
2) תצלום הדרכון עם קוד מוסתר למטה - חובה שיראו את כל העמוד במלואו, כולל הקוד בתחתית.
```

**Multiple Categories**:

```
{{1}}: מיכאל אברהם
{{2}}: ארה״ב
{{3}}: בעיות במסמכים
{{4}}: 1) תמונת הפנים חסרה - חובה לצרף תמונת פנים ברורה.
2) תצלום הדרכון עם צל/אור שפוגע בקריאות - חובה שהדרכון יהיה קריא במלואו.
```

---

**Version**: v1.1.0
**Status**: ✅ Production Ready (WhatsApp Template Integration)
**Template**: `fix_mistake_global_hebrew` (Meta approved)
