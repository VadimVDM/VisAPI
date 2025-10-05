/**
 * Test script to show WhatsApp template variables generation
 * Run with: node apps/backend/src/webhooks/visanet/scripts/test-template-variables.mjs
 */

// Hebrew translations (subset for testing)
const ISSUE_TRANSLATIONS_HE = {
  photo_is_missing: 'תמונת הפנים חסרה - חובה לצרף תמונת פנים ברורה.',
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
};

const TEMPLATE_NAME = 'fix_mistake_global_hebrew';

function buildTemplateVariables(applicantName, countryName, issues) {
  const categoryKeys = Object.keys(issues).filter((k) => issues[k].length > 0);

  let categoryHeader = '';
  let issuesList = '';

  if (categoryKeys.length === 1) {
    const categoryKey = categoryKeys[0];
    const categoryIssues = issues[categoryKey];
    categoryHeader = CATEGORY_LABELS_HE[categoryKey] || categoryKey;

    if (categoryIssues.length === 1) {
      // Single issue - bullet point
      const issue = categoryIssues[0];
      const translation = ISSUE_TRANSLATIONS_HE[issue.value];
      issuesList = `• ${translation}`;
    } else {
      // Multiple issues - numbered list
      const lines = categoryIssues.map((issue, index) => {
        const translation = ISSUE_TRANSLATIONS_HE[issue.value];
        return `${index + 1}) ${translation}`;
      });
      issuesList = lines.join('\n');
    }
  } else if (categoryKeys.length > 1) {
    // Multiple categories - combine with numbered list
    categoryHeader = 'בעיות במסמכים';
    const lines = [];
    let issueNumber = 1;

    for (const categoryKey of categoryKeys) {
      const categoryIssues = issues[categoryKey];
      for (const issue of categoryIssues) {
        const translation = ISSUE_TRANSLATIONS_HE[issue.value];
        lines.push(`${issueNumber}) ${translation}`);
        issueNumber++;
      }
    }
    issuesList = lines.join('\n');
  }

  return {
    applicantName,
    countryName,
    categoryHeader,
    issuesList,
  };
}

// Run tests
console.log(
  '\n╔════════════════════════════════════════════════════════════════╗',
);
console.log(
  '║       WhatsApp Template Variables - Test Scenarios            ║',
);
console.log(
  '╚════════════════════════════════════════════════════════════════╝\n',
);

// Scenario 1: Single issue
const scenario1 = {
  face_photo: [],
  passport_photo: [{ value: 'passport_missing', label: 'Passport Missing' }],
};

const vars1 = buildTemplateVariables('דוד כהן', 'אנגליה', scenario1);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 1: Single Issue (Passport Missing)                │');
console.log('│ Applicant: דוד כהן | Country: אנגליה                        │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(`Template: ${TEMPLATE_NAME}`);
console.log(`{{1}} applicantName: ${vars1.applicantName}`);
console.log(`{{2}} countryName: ${vars1.countryName}`);
console.log(`{{3}} categoryHeader: ${vars1.categoryHeader}`);
console.log(`{{4}} issuesList:\n${vars1.issuesList}`);
console.log('\n' + '─'.repeat(65) + '\n');

// Scenario 2: Multiple issues same category
const scenario2 = {
  face_photo: [],
  passport_photo: [
    { value: 'cut_on_sides', label: 'Cut on Sides' },
    { value: 'code_hidden_at_bottom', label: 'Code Hidden at Bottom' },
  ],
};

const vars2 = buildTemplateVariables('שרה לוי', 'הודו', scenario2);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 2: Multiple Issues (2 passport issues)            │');
console.log('│ Applicant: שרה לוי | Country: הודו                          │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(`Template: ${TEMPLATE_NAME}`);
console.log(`{{1}} applicantName: ${vars2.applicantName}`);
console.log(`{{2}} countryName: ${vars2.countryName}`);
console.log(`{{3}} categoryHeader: ${vars2.categoryHeader}`);
console.log(`{{4}} issuesList:\n${vars2.issuesList}`);
console.log('\n' + '─'.repeat(65) + '\n');

// Scenario 3: Multiple categories
const scenario3 = {
  face_photo: [{ value: 'photo_is_missing', label: 'Photo is Missing' }],
  passport_photo: [{ value: 'with_shadow_light', label: 'With Shadow/Light' }],
};

const vars3 = buildTemplateVariables('מיכאל אברהם', 'ארה״ב', scenario3);

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Scenario 3: Multiple Categories (face + passport)          │');
console.log('│ Applicant: מיכאל אברהם | Country: ארה״ב                     │');
console.log('└─────────────────────────────────────────────────────────────┘');
console.log(`Template: ${TEMPLATE_NAME}`);
console.log(`{{1}} applicantName: ${vars3.applicantName}`);
console.log(`{{2}} countryName: ${vars3.countryName}`);
console.log(`{{3}} categoryHeader: ${vars3.categoryHeader}`);
console.log(`{{4}} issuesList:\n${vars3.issuesList}`);
console.log('\n' + '─'.repeat(65) + '\n');

console.log('✅ All template variable generation tests completed!\n');
