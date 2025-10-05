/**
 * Hebrew translations for applicant issues
 * Used to construct WhatsApp messages for document fix requests
 */
export const ISSUE_TRANSLATIONS_HE: Record<string, string> = {
  // Face Photo Issues
  additional_people:
    'תמונת הפנים עם אנשים נוספים בתמונה - חובה תמונת פנים שלכם לבד.',
  black_and_white_face: 'תמונת הפנים בשחור/לבן - חובה תמונת פנים בצבע.',
  blurred_photo: 'תמונת הפנים מטושטשת - חובה תמונה ברורה באיכות טובה.',
  eyes_not_at_camera_level:
    'תמונת הפנים עם עיניים לא בגובה המצלמה - חובה להסתכל ישירות למצלמה.',
  face_cut_on_sides_top:
    'תמונת הפנים חתוכה בצדדים או למעלה - חובה שהתמונה תראה את כל הפנים בצורה מלאה.',
  hair_hiding_the_face:
    'תמונת הפנים עם שיער שמסתיר את הפנים - חובה שהפנים ייראו בצורה ברורה ולא מוסתרת.',
  head_body_not_straight:
    'תמונת הפנים עם ראש או גוף לא ישרים - חובה שהתמונה תהיה ישרה.',
  not_white_background:
    'תמונת הפנים עם רקע שאינו לבן - חובה להשתמש ברקע לבן בלבד.',
  photo_from_passport: 'תמונת הפנים מתוך הדרכון - חובה לצלם תמונה נפרדת.',
  photo_is_missing: 'תמונת הפנים חסרה - חובה לצרף תמונת פנים ברורה.',
  shadow_light_on_face:
    'תמונת הפנים עם צל או אור לא אחיד על הפנים - חובה לוודא תאורה טובה ואחידה.',
  shoulder_line_missing:
    'תמונת הפנים ללא קו כתפיים ברור - חובה שהתמונה תכלול את הכתפיים במלואן.',
  unnatural_facial_expression:
    'תמונת הפנים עם הבעת פנים לא טבעית - יש לשמור על הבעה נייטרלית ורגועה.',
  with_accessories:
    'תמונת הפנים עם אוזניות, כובע או אביזרים - חובה להצטלם ללא אביזרים.',
  with_glasses: 'תמונת הפנים עם משקפיים - אסור משקפיים בתמונה.',
  with_tank_top: 'תמונת הפנים עם גופיה - חובה ללבוש חולצה שמכסה את הכתפיים.',
  without_shirt: 'תמונת הפנים ללא חולצה - חובה ללבוש חולצה בתמונה.',
  wrong_photo:
    'תמונת הפנים שגויה - חובה להעלות תמונה עדכנית ואישית לבקשת הוויזה.',

  // Passport Photo Issues
  black_and_white_pass: 'תצלום הדרכון בשחור/לבן - חובה דרכון בצבע.',
  blurred_passport: 'תצלום הדרכון מטושטש - חובה תצלום קריא.',
  code_hidden_at_bottom:
    'תצלום הדרכון עם קוד מוסתר למטה - חובה שיראו את כל העמוד במלואו, כולל הקוד בתחתית.',
  cut_on_sides: 'תצלום הדרכון חתוך בצדדים - חובה שיראו את כל העמוד.',
  need_2_passport_pages:
    'תצלום הדרכון לא תקין - נא לשלוח צילום ברור של העמוד הראשי בדרכון, כולל העמוד שמופיע בצמוד אליו כאשר הדרכון פתוח. שני העמודים המחוברים יחד צריכים להופיע בתצלום.',
  not_straight: 'תצלום הדרכון לא ישר - חובה תמונה ישרה של העמוד.',
  passport_missing:
    'תצלום הדרכון חסר - חובה לצלם את העמוד הראשי עם פרטי הדרכון המלאים.',
  suspected_wrong_details:
    'אנו חושדים שיש טעות בפרטים שהוזנו בטופס - נא לשלוח צילום ברור של העמוד הראשי בדרכון לאימות.',
  with_shadow_light:
    'תצלום הדרכון עם צל/אור שפוגע בקריאות - חובה שהדרכון יהיה קריא במלואו.',
  wrong_passport:
    'תצלום הדרכון אינו תואם את הבקשה - חובה לצלם את העמוד הראשי עם פרטי הדרכון המלאים.',

  // Business Document Issues
  card_not_in_english:
    'חסר כרטיס ביקור באנגלית. הרשויות בהודו דורשות כרטיס ביקור באנגלית.',
  letter_not_in_english:
    'חסר מכתב הזמנה באנגלית. הרשויות בהודו דורשות מכתב באנגלית.',
  missing_business_card:
    'חסר כרטיס ביקור. הרשויות בהודו דורשות את כרטיס הביקור שלך באנגלית על מנת לקבל ויזת עסקים.',
  missing_invitation_letter:
    'חסר מכתב הזמנה. הרשויות בהודו דורשות מכתב הזמנה מבית עסק בהודו על מנת לקבל ויזת עסקים.',

  // Passport Expiry Issues
  expired_passport: 'הדרכון פג תוקף - חובה דרכון בתוקף על מנת לקבל ויזה.',
  passport_5_years_or_less:
    'הדרכון בתוקף ל־5 שנים או פחות - הרשויות בארה״ב דורשות דרכון בתוקף ל־10 שנים סה״כ לכל בגיר מעל גיל 18 כדי לקבל אישור ESTA.',
  passport_not_biometric:
    'הדרכון לא ביומטרי - הרשויות בארה״ב דורשות דרכון ביומטרי (עם תוקף ל־10 שנים לאזרחים בגירים) כדי לקבל אישור ESTA.',
  temporary_passport: 'הדרכון הינו דרכון זמני.',
  valid_less_than_6_months:
    'הדרכון עם תוקף פחות מחצי שנה קדימה - הרשויות ב{country} דורשות דרכון עם תוקף מעל חצי שנה מרגע הכניסה למדינה על מנת לקבל ויזה.',

  // Application Details Issues
  born_in_iran: 'סומן בטופס שארץ הלידה היא איראן.',
  born_in_iraq: 'סומן בטופס שארץ הלידה היא עיראק.',
  criminal_record: 'סומן בטופס שקיים עבר פלילי.',
  past_rejection: 'סומן בטופס שסורבת בעבר לויזה בארה״ב.',
  visit_in_cuba: 'סומן בטופס שהיה ביקור בקובה.',
};

/**
 * Category labels in Hebrew
 */
export const CATEGORY_LABELS_HE: Record<string, string> = {
  face_photo: '📸 תמונת פנים',
  passport_photo: '🛂 תצלום דרכון',
  business: '💼 מסמכים עסקיים',
  passport_expiry: '⏰ תוקף דרכון',
  application_details: '📋 פרטי בקשה',
};

/**
 * WhatsApp template name for issue notifications
 */
export const WHATSAPP_TEMPLATE_NAME = 'fix_mistake_global_hebrew';

/**
 * WhatsApp template structure:
 * {{1}} - Applicant name
 * {{2}} - Country name (destination country for visa)
 * {{3}} - Category header (emoji + category name)
 * {{4}} - Issues list (numbered: 1) issue 2) issue or single bullet for one issue)
 */
