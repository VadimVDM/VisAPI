/**
 * Standalone script to test Hebrew WhatsApp message generation
 * Run with: node apps/backend/src/webhooks/visanet/scripts/generate-test-messages.mjs
 */

// Hebrew translations
const ISSUE_TRANSLATIONS_HE = {
  // Face Photo Issues
  photo_is_missing: 'תמונת הפנים חסרה - חובה לצרף תמונת פנים ברורה.',

  // Passport Photo Issues
  passport_missing:
    'תצלום הדרכון חסר - חובה לצלם את העמוד הראשי עם פרטי הדרכון המלאים.',
  cut_on_sides: 'תצלום הדרכון חתוך בצדדים - חובה שיראו את כל העמוד.',
  code_hidden_at_bottom:
    'תצלום הדרכון עם קוד מוסתר למטה - חובה שיראו את כל העמוד במלואו, כולל הקוד בתחתית.',
  with_shadow_light:
    'תצלום הדרכון עם צל/אור שפוגע בקריאות - חובה שהדרכון יהיה קריא במלואו.',
};

const CATEGORY_LABELS_HE = {
  face_photo: '📸 תמונת פנים',
  passport_photo: '🛂 תצלום דרכון',
  business: '💼 מסמכים עסקיים',
  passport_expiry: '⏰ תוקף דרכון',
  application_details: '📋 פרטי בקשה',
};

const MESSAGE_TEMPLATES_HE = {
  greeting: (name) => `שלום ${name},`,
  intro:
    'נתקלנו בבעיות עם המסמכים שהעלית למערכת. על מנת לעבד את הבקשה שלך, נדרשים התיקונים הבאים:',
  closing:
    'לאחר ששלחת את המסמכים המעודכנים, נעבד את הבקשה שלך בהקדם האפשרי.\n\nאם יש לך שאלות, אנחנו כאן לעזור! 💚',
  signature: 'צוות ויזאנט',
};

function buildIssuesMessage(applicantName, issues) {
  const parts = [];

  // Greeting
  parts.push(MESSAGE_TEMPLATES_HE.greeting(applicantName));
  parts.push(''); // Empty line

  // Intro
  parts.push(MESSAGE_TEMPLATES_HE.intro);
  parts.push(''); // Empty line

  // Build issues by category
  const categories = [
    'face_photo',
    'passport_photo',
    'business',
    'passport_expiry',
    'application_details',
  ];

  for (const categoryKey of categories) {
    const categoryIssues = issues[categoryKey];
    if (categoryIssues && categoryIssues.length > 0) {
      // Category header with emoji
      const categoryLabel = CATEGORY_LABELS_HE[categoryKey] || categoryKey;
      parts.push(`*${categoryLabel}*`);

      // Add each issue in this category
      for (const issue of categoryIssues) {
        const translation = ISSUE_TRANSLATIONS_HE[issue.value];
        if (translation) {
          parts.push(`• ${translation}`);
        } else {
          parts.push(`• ${issue.label}`);
        }
      }

      parts.push(''); // Empty line after each category
    }
  }

  // Closing message
  parts.push(MESSAGE_TEMPLATES_HE.closing);
  parts.push(''); // Empty line

  // Signature
  parts.push(MESSAGE_TEMPLATES_HE.signature);

  return parts.join('\n');
}

// Run the tests
console.log(
  '\n╔════════════════════════════════════════════════════════════════╗',
);
console.log(
  '║       Hebrew WhatsApp Messages - Test Scenarios               ║',
);
console.log(
  '╚════════════════════════════════════════════════════════════════╝\n',
);

// Scenario 1: Face photo missing + Passport missing
const scenario1 = {
  face_photo: [
    {
      value: 'photo_is_missing',
      label: 'Photo is Missing',
    },
  ],
  passport_photo: [
    {
      value: 'passport_missing',
      label: 'Passport Missing',
    },
  ],
  business: [],
  passport_expiry: [],
  application_details: [],
};

const message1 = buildIssuesMessage('דוד כהן', scenario1);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 1: Face Photo Missing + Passport Missing          │');
console.log('│ Applicant: דוד כהן                                          │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(message1);
console.log('\n' + '─'.repeat(65) + '\n');

// Scenario 2: Passport cut on sides + Code hidden at bottom
const scenario2 = {
  face_photo: [],
  passport_photo: [
    {
      value: 'cut_on_sides',
      label: 'Cut on Sides',
    },
    {
      value: 'code_hidden_at_bottom',
      label: 'Code Hidden at Bottom',
    },
  ],
  business: [],
  passport_expiry: [],
  application_details: [],
};

const message2 = buildIssuesMessage('שרה לוי', scenario2);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 2: Passport Cut on Sides + Code Hidden            │');
console.log('│ Applicant: שרה לוי                                          │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(message2);
console.log('\n' + '─'.repeat(65) + '\n');

// Scenario 3: Passport with shadow/light
const scenario3 = {
  face_photo: [],
  passport_photo: [
    {
      value: 'with_shadow_light',
      label: 'With Shadow/Light',
    },
  ],
  business: [],
  passport_expiry: [],
  application_details: [],
};

const message3 = buildIssuesMessage('מיכאל אברהם', scenario3);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 3: Passport with Shadow/Light                     │');
console.log('│ Applicant: מיכאל אברהם                                      │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(message3);
console.log('\n' + '─'.repeat(65) + '\n');

console.log('✅ All Hebrew message generation tests completed!\n');
