import { Test, TestingModule } from '@nestjs/testing';
import { IssuesMessageBuilderService } from './issues-message-builder.service';
import { IssuesCategoriesDto } from '../dto/applicant-issues.dto';

describe('IssuesMessageBuilderService', () => {
  let service: IssuesMessageBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IssuesMessageBuilderService],
    }).compile();

    service = module.get<IssuesMessageBuilderService>(
      IssuesMessageBuilderService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('WhatsApp Template Variable Generation', () => {
    it('should generate correct template variables for single issue', () => {
      console.log(
        '\n╔════════════════════════════════════════════════════════════════╗',
      );
      console.log(
        '║       WhatsApp Template Variables - Test Scenarios            ║',
      );
      console.log(
        '╚════════════════════════════════════════════════════════════════╝\n',
      );

      // Scenario 1: Single issue - should use bullet point
      const scenario1: IssuesCategoriesDto = {
        face_photo: [],
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

      const vars1 = service.buildTemplateVariables(
        'דוד כהן',
        'אנגליה',
        scenario1,
      );

      console.log(
        '┌─────────────────────────────────────────────────────────────┐',
      );
      console.log(
        '│ Scenario 1: Single Issue (Passport Missing)                │',
      );
      console.log(
        '│ Applicant: דוד כהן | Country: אנגליה                        │',
      );
      console.log(
        '└─────────────────────────────────────────────────────────────┘',
      );
      console.log(`Template: ${service.getTemplateName()}`);
      console.log(`{{1}} applicantName: ${vars1.applicantName}`);
      console.log(`{{2}} countryName: ${vars1.countryName}`);
      console.log(`{{3}} categoryHeader: ${vars1.categoryHeader}`);
      console.log(`{{4}} issuesList:\n${vars1.issuesList}`);
      console.log('\n' + '─'.repeat(65) + '\n');

      // Scenario 2: Multiple issues in same category - should use numbered list
      const scenario2: IssuesCategoriesDto = {
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

      const vars2 = service.buildTemplateVariables(
        'שרה לוי',
        'הודו',
        scenario2,
      );

      console.log(
        '┌─────────────────────────────────────────────────────────────┐',
      );
      console.log(
        '│ Scenario 2: Multiple Issues (2 passport issues)            │',
      );
      console.log(
        '│ Applicant: שרה לוי | Country: הודו                          │',
      );
      console.log(
        '└─────────────────────────────────────────────────────────────┘',
      );
      console.log(`Template: ${service.getTemplateName()}`);
      console.log(`{{1}} applicantName: ${vars2.applicantName}`);
      console.log(`{{2}} countryName: ${vars2.countryName}`);
      console.log(`{{3}} categoryHeader: ${vars2.categoryHeader}`);
      console.log(`{{4}} issuesList:\n${vars2.issuesList}`);
      console.log('\n' + '─'.repeat(65) + '\n');

      // Scenario 3: Multiple categories - should combine all with numbered list
      const scenario3: IssuesCategoriesDto = {
        face_photo: [
          {
            value: 'photo_is_missing',
            label: 'Photo is Missing',
          },
        ],
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

      const vars3 = service.buildTemplateVariables(
        'מיכאל אברהם',
        'ארה״ב',
        scenario3,
      );

      console.log(
        '┌─────────────────────────────────────────────────────────────┐',
      );
      console.log(
        '│ Scenario 3: Multiple Categories (face + passport)          │',
      );
      console.log(
        '│ Applicant: מיכאל אברהם | Country: ארה״ב                     │',
      );
      console.log(
        '└─────────────────────────────────────────────────────────────┘',
      );
      console.log(`Template: ${service.getTemplateName()}`);
      console.log(`{{1}} applicantName: ${vars3.applicantName}`);
      console.log(`{{2}} countryName: ${vars3.countryName}`);
      console.log(`{{3}} categoryHeader: ${vars3.categoryHeader}`);
      console.log(`{{4}} issuesList:\n${vars3.issuesList}`);
      console.log('\n' + '─'.repeat(65) + '\n');

      // Assertions
      expect(vars1.applicantName).toBe('דוד כהן');
      expect(vars1.countryName).toBe('אנגליה');
      expect(vars1.categoryHeader).toBe('🛂 תצלום דרכון');
      expect(vars1.issuesList).toContain('• תצלום הדרכון חסר');

      expect(vars2.applicantName).toBe('שרה לוי');
      expect(vars2.countryName).toBe('הודו');
      expect(vars2.categoryHeader).toBe('🛂 תצלום דרכון');
      expect(vars2.issuesList).toContain('1)');
      expect(vars2.issuesList).toContain('2)');

      expect(vars3.applicantName).toBe('מיכאל אברהם');
      expect(vars3.countryName).toBe('ארה״ב');
      expect(vars3.categoryHeader).toBe('בעיות במסמכים');
      expect(vars3.issuesList).toContain('1)');
      expect(vars3.issuesList).toContain('2)');

      console.log('✅ All template variable generation tests passed!\n');
    });

    it('should return correct template name', () => {
      const templateName = service.getTemplateName();
      expect(templateName).toBe('fix_mistake_global_hebrew');
    });

    it('should count total issues correctly', () => {
      const issues: IssuesCategoriesDto = {
        face_photo: [{ value: 'photo_is_missing', label: 'Photo is Missing' }],
        passport_photo: [
          { value: 'cut_on_sides', label: 'Cut on Sides' },
          { value: 'code_hidden_at_bottom', label: 'Code Hidden at Bottom' },
        ],
        business: [],
        passport_expiry: [],
        application_details: [],
      };

      const totalIssues = service.countTotalIssues(issues);
      expect(totalIssues).toBe(3);
    });

    it('should generate issue summary', () => {
      const issues: IssuesCategoriesDto = {
        face_photo: [{ value: 'photo_is_missing', label: 'Photo is Missing' }],
        passport_photo: [
          { value: 'passport_missing', label: 'Passport Missing' },
        ],
        business: [],
        passport_expiry: [],
        application_details: [],
      };

      const summary = service.getIssueSummary(issues);
      expect(summary).toBe('2 issues across 2 categories');
    });
  });
});
