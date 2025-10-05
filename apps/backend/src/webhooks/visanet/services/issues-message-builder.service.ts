import { Injectable, Logger } from '@nestjs/common';
import {
  ISSUE_TRANSLATIONS_HE,
  CATEGORY_LABELS_HE,
  WHATSAPP_TEMPLATE_NAME,
} from '../constants/issue-translations';
import { IssuesCategoriesDto, IssueItemDto } from '../dto/applicant-issues.dto';

/**
 * Template variables for fix_mistake_global_hebrew WhatsApp template
 */
export interface IssueTemplateVariables {
  applicantName: string; // {{1}}
  countryName: string; // {{2}}
  categoryHeader: string; // {{3}}
  issuesList: string; // {{4}}
}

/**
 * Service for building WhatsApp template variables for applicant issues
 * Uses fix_mistake_global_hebrew template with numbered issue lists
 */
@Injectable()
export class IssuesMessageBuilderService {
  private readonly logger = new Logger(IssuesMessageBuilderService.name);

  /**
   * Build WhatsApp template variables for applicant issues
   * @param applicantName Name of the applicant
   * @param countryName Destination country name in Hebrew (e.g., "אנגליה", "הודו")
   * @param issues Issues grouped by category
   * @returns Template variables for fix_mistake_global_hebrew template
   */
  buildTemplateVariables(
    applicantName: string,
    countryName: string,
    issues: IssuesCategoriesDto,
  ): IssueTemplateVariables {
    this.logger.debug(
      `Building template variables for applicant: ${applicantName}, country: ${countryName}`,
    );

    const issuesByCategory = this.groupNonEmptyIssues(issues);
    const totalIssues = this.countTotalIssues(issuesByCategory);

    this.logger.debug(`Total issues found: ${totalIssues}`);

    // Get the first (and typically only) category with issues
    // Template supports one category header, so we combine all if multiple
    const categoryKeys = Object.keys(issuesByCategory);
    let categoryHeader = '';
    let issuesList = '';

    if (categoryKeys.length === 1) {
      // Single category - use emoji + category name as header
      const categoryKey = categoryKeys[0];
      const categoryIssues = issuesByCategory[categoryKey];
      categoryHeader = CATEGORY_LABELS_HE[categoryKey] || categoryKey;

      // Build issues list
      if (categoryIssues.length === 1) {
        // Single issue - use bullet point
        const issue = categoryIssues[0];
        const translation = ISSUE_TRANSLATIONS_HE[issue.value];
        if (translation) {
          issuesList = `• ${translation}`;
        } else {
          this.logger.warn(
            `No Hebrew translation found for issue: ${issue.value}`,
          );
          issuesList = `• ${issue.label}`;
        }
      } else {
        // Multiple issues - use numbered list (1) 2) 3))
        const lines: string[] = [];
        categoryIssues.forEach((issue, index) => {
          const translation = ISSUE_TRANSLATIONS_HE[issue.value];
          if (translation) {
            lines.push(`${index + 1}) ${translation}`);
          } else {
            this.logger.warn(
              `No Hebrew translation found for issue: ${issue.value}`,
            );
            lines.push(`${index + 1}) ${issue.label}`);
          }
        });
        issuesList = lines.join('\n');
      }
    } else if (categoryKeys.length > 1) {
      // Multiple categories - combine all issues with numbered list
      categoryHeader = 'בעיות במסמכים';
      const lines: string[] = [];
      let issueNumber = 1;

      for (const categoryKey of categoryKeys) {
        const categoryIssues = issuesByCategory[categoryKey];
        for (const issue of categoryIssues) {
          const translation = ISSUE_TRANSLATIONS_HE[issue.value];
          if (translation) {
            lines.push(`${issueNumber}) ${translation}`);
          } else {
            this.logger.warn(
              `No Hebrew translation found for issue: ${issue.value}`,
            );
            lines.push(`${issueNumber}) ${issue.label}`);
          }
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

  /**
   * Get template name for WhatsApp
   */
  getTemplateName(): string {
    return WHATSAPP_TEMPLATE_NAME;
  }

  /**
   * Group issues and filter out empty categories
   */
  private groupNonEmptyIssues(
    issues: IssuesCategoriesDto,
  ): Record<string, IssueItemDto[]> {
    const grouped: Record<string, IssueItemDto[]> = {};

    const categories: (keyof IssuesCategoriesDto)[] = [
      'face_photo',
      'passport_photo',
      'business',
      'passport_expiry',
      'application_details',
    ];

    for (const category of categories) {
      const categoryIssues = issues[category];
      if (categoryIssues && categoryIssues.length > 0) {
        grouped[category] = categoryIssues;
      }
    }

    return grouped;
  }

  /**
   * Count total issues across all categories
   */
  countTotalIssues(
    issues: IssuesCategoriesDto | Record<string, IssueItemDto[]>,
  ): number {
    let total = 0;

    if ('face_photo' in issues) {
      // It's IssuesCategoriesDto
      const cats = issues as IssuesCategoriesDto;
      total += cats.face_photo?.length || 0;
      total += cats.passport_photo?.length || 0;
      total += cats.business?.length || 0;
      total += cats.passport_expiry?.length || 0;
      total += cats.application_details?.length || 0;
    } else {
      // It's a Record
      for (const categoryIssues of Object.values(issues)) {
        total += categoryIssues.length;
      }
    }

    return total;
  }

  /**
   * Get issue summary for logging/debugging
   */
  getIssueSummary(issues: IssuesCategoriesDto): string {
    const totalIssues = this.countTotalIssues(issues);
    const categories = this.groupNonEmptyIssues(issues);
    const categoryCount = Object.keys(categories).length;

    return `${totalIssues} issues across ${categoryCount} categories`;
  }
}
