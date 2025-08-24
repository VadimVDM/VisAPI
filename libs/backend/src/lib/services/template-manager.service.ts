import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  Template,
  EnhancedTemplate,
  EnhancedValidationResult,
  QualityMetrics,
  ComplianceReport,
  OptimizationSuggestion,
  PerformanceMetrics,
} from '../types/whatsapp.types';

@Injectable()
export class TemplateManagerService {
  private readonly logger = new Logger(TemplateManagerService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly businessId: string;
  private templateCache: Map<string, EnhancedTemplate> = new Map();
  private lastSyncTime: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiVersion = this.configService.get('WABA_API_VERSION', 'v23.0');
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
    this.accessToken = this.configService.get('WABA_ACCESS_TOKEN', '');
    // Use phone number ID for template fetching
    this.businessId = this.configService.get('WABA_PHONE_NUMBER_ID', '');

    const syncInterval = parseInt(
      this.configService.get('WABA_AUTOMATED_TEMPLATE_SYNC_INTERVAL', '3600'),
      10,
    );

    if (syncInterval > 0) {
      setInterval(() => {
        this.syncTemplatesFromMeta().catch((error) => {
          this.logger.error(`Failed to sync templates: ${error.message}`);
        });
      }, syncInterval * 1000);
    }
  }

  async syncTemplatesFromMeta(): Promise<Template[]> {
    try {
      this.logger.log('Starting template sync from Meta');

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.businessId}/message_templates`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
              fields:
                'id,name,language,status,category,components,quality_score,rejected_reason',
              limit: 100,
            },
          },
        ),
      );

      const templates: Template[] = response.data.data || [];

      this.templateCache.clear();
      for (const template of templates) {
        const cacheKey = `${template.name}_${template.language}`;
        this.templateCache.set(cacheKey, {
          ...template,
          usage_count: 0,
          last_used: undefined,
          performance_metrics: {
            delivery_rate: 0,
            read_rate: 0,
            response_rate: 0,
          },
          compliance_status: this.determineComplianceStatus(template),
          optimization_suggestions: [],
        });
      }

      this.lastSyncTime = new Date();
      this.logger.log(`Synced ${templates.length} templates from Meta`);

      return templates;
    } catch (error: any) {
      this.logger.error(
        `Failed to sync templates from Meta: ${error.message}`,
        error.response?.data,
      );
      throw error;
    }
  }

  async getApprovedTemplates(
    language?: string,
    category?: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY',
  ): Promise<Template[]> {
    const templates = Array.from(this.templateCache.values());

    return templates.filter((template) => {
      const isApproved = template.status === 'APPROVED';
      const matchesLanguage = !language || template.language === language;
      const matchesCategory = !category || template.category === category;

      return isApproved && matchesLanguage && matchesCategory;
    });
  }

  async validateTemplateVariables(
    templateName: string,
    variables: Record<string, any>,
  ): Promise<EnhancedValidationResult> {
    const errors: Array<{
      field: string;
      message: string;
      suggestion?: string;
    }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    const templates = Array.from(this.templateCache.values()).filter(
      (t) => t.name === templateName,
    );

    if (templates.length === 0) {
      errors.push({
        field: 'template',
        message: `Template ${templateName} not found`,
        suggestion: 'Sync templates from Meta or check template name',
      });

      return {
        is_valid: false,
        errors,
        warnings,
      };
    }

    const template = templates[0];

    for (const component of template.components) {
      if (component.type === 'body' && component.parameters) {
        const requiredVars = component.parameters.length;
        const providedVars = Object.keys(variables).length;

        if (providedVars < requiredVars) {
          errors.push({
            field: 'variables',
            message: `Template requires ${requiredVars} variables, but only ${providedVars} provided`,
          });
        }

        for (let i = 0; i < component.parameters.length; i++) {
          const param = component.parameters[i];
          const varKey = `{{${i + 1}}}`;
          const varValue = variables[varKey];

          if (!varValue) {
            errors.push({
              field: varKey,
              message: `Missing required variable ${varKey}`,
            });
          } else if (param.type === 'text' && typeof varValue !== 'string') {
            errors.push({
              field: varKey,
              message: `Variable ${varKey} must be a string`,
            });
          } else if (param.type === 'currency' && !varValue.amount_1000) {
            errors.push({
              field: varKey,
              message: `Variable ${varKey} must include amount_1000`,
            });
          }
        }
      }
    }

    const qualityScore = template.quality_score || 0;
    if (qualityScore < 5) {
      warnings.push({
        field: 'quality',
        message: `Template has low quality score: ${qualityScore}/10`,
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      template_quality_impact: qualityScore,
    };
  }

  async getTemplate(
    name: string,
    language: string,
  ): Promise<EnhancedTemplate | null> {
    const cacheKey = `${name}_${language}`;
    const cached = this.templateCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    await this.syncTemplatesFromMeta();
    return this.templateCache.get(cacheKey) || null;
  }

  async analyzeTemplateQuality(templateName: string): Promise<QualityMetrics> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.businessId}/template_analytics`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
              template_names: templateName,
              fields: 'quality_score,delivered,read,sent,blocked,errors',
            },
          },
        ),
      );

      const data = response.data.data?.[0];
      if (!data) {
        return {
          overall_score: 0,
          delivery_rate: 0,
          read_rate: 0,
          block_rate: 0,
          spam_rate: 0,
          recommendations: ['No analytics data available'],
        };
      }

      const deliveryRate =
        data.sent > 0 ? (data.delivered / data.sent) * 100 : 0;
      const readRate =
        data.delivered > 0 ? (data.read / data.delivered) * 100 : 0;
      const blockRate = data.sent > 0 ? (data.blocked / data.sent) * 100 : 0;

      const recommendations: string[] = [];

      if (deliveryRate < 90) {
        recommendations.push(
          'Improve delivery rate by verifying phone numbers',
        );
      }
      if (readRate < 50) {
        recommendations.push('Enhance message content to increase engagement');
      }
      if (blockRate > 5) {
        recommendations.push('Review message frequency and content relevance');
      }
      if (data.quality_score < 7) {
        recommendations.push(
          'Consider revising template content for better quality score',
        );
      }

      return {
        overall_score: data.quality_score || 0,
        delivery_rate: deliveryRate,
        read_rate: readRate,
        block_rate: blockRate,
        spam_rate: data.errors?.spam_rate || 0,
        recommendations,
      };
    } catch (error: any) {
      this.logger.error(`Failed to analyze template quality: ${error.message}`);
      throw error;
    }
  }

  async checkTemplateCategoryCompliance(): Promise<ComplianceReport> {
    const templates = Array.from(this.templateCache.values());
    const report: ComplianceReport = {
      compliant_templates: 0,
      warning_templates: 0,
      violation_templates: 0,
      details: [],
    };

    for (const template of templates) {
      if (template.status === 'REJECTED') {
        report.violation_templates++;
        report.details.push({
          template_name: template.name,
          issue: template.rejected_reason || 'Template rejected',
          severity: 'high',
          recommendation: 'Review and resubmit template with corrections',
        });
      } else if (
        template.correct_category &&
        template.correct_category !== template.category
      ) {
        report.warning_templates++;
        report.details.push({
          template_name: template.name,
          issue: `Category mismatch: ${template.category} should be ${template.correct_category}`,
          severity: 'medium',
          recommendation: `Update template category to ${template.correct_category}`,
        });
      } else if (template.quality_score && template.quality_score < 5) {
        report.warning_templates++;
        report.details.push({
          template_name: template.name,
          issue: `Low quality score: ${template.quality_score}/10`,
          severity: 'low',
          recommendation: 'Improve template content and formatting',
        });
      } else {
        report.compliant_templates++;
      }
    }

    return report;
  }

  async getTemplateOptimizationSuggestions(
    templateName: string,
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const templates = Array.from(this.templateCache.values()).filter(
      (t) => t.name === templateName,
    );

    if (templates.length === 0) {
      return suggestions;
    }

    const template = templates[0];

    if (
      template.components.some(
        (c) => c.type === 'body' && (c.parameters?.length ?? 0) > 5,
      )
    ) {
      suggestions.push({
        type: 'content',
        description: 'Reduce number of variables for better readability',
        expected_impact: 'Improved user comprehension and engagement',
        implementation_difficulty: 'easy',
      });
    }

    if (!template.components.some((c) => c.type === 'button')) {
      suggestions.push({
        type: 'content',
        description: 'Add call-to-action buttons for better engagement',
        expected_impact: 'Increased click-through rates',
        implementation_difficulty: 'medium',
      });
    }

    if (template.quality_score && template.quality_score < 7) {
      suggestions.push({
        type: 'content',
        description: 'Revise template content to improve quality score',
        expected_impact: 'Better delivery rates and reduced spam marking',
        implementation_difficulty: 'medium',
      });
    }

    suggestions.push({
      type: 'timing',
      description:
        'Send messages during business hours (9 AM - 6 PM recipient time)',
      expected_impact: 'Higher read rates and engagement',
      implementation_difficulty: 'easy',
    });

    suggestions.push({
      type: 'personalization',
      description: 'Use customer name and relevant context in messages',
      expected_impact: 'Improved customer satisfaction and response rates',
      implementation_difficulty: 'easy',
    });

    return suggestions;
  }

  async getTemplatePerformanceMetrics(
    templateName: string,
    timeRange: { start: Date; end: Date },
  ): Promise<PerformanceMetrics> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/${this.businessId}/template_analytics`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
              template_names: templateName,
              start: Math.floor(timeRange.start.getTime() / 1000),
              end: Math.floor(timeRange.end.getTime() / 1000),
              fields: 'sent,delivered,read,replied,failed',
              granularity: 'daily',
            },
          },
        ),
      );

      const data = response.data.data?.[0];
      const metrics = {
        total_sent: data?.sent || 0,
        delivered: data?.delivered || 0,
        read: data?.read || 0,
        replied: data?.replied || 0,
        failed: data?.failed || 0,
        avg_time_to_read: 0,
        avg_time_to_reply: 0,
      };

      const deliveryRate =
        metrics.total_sent > 0
          ? (metrics.delivered / metrics.total_sent) * 100
          : 0;
      const readRate =
        metrics.delivered > 0 ? (metrics.read / metrics.delivered) * 100 : 0;
      const engagementRate =
        metrics.read > 0 ? (metrics.replied / metrics.read) * 100 : 0;

      return {
        template_name: templateName,
        time_range: timeRange,
        metrics,
        trends: {
          delivery_rate_change: 0,
          read_rate_change: 0,
          engagement_change: 0,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get template performance metrics: ${error.message}`,
      );
      throw error;
    }
  }

  private determineComplianceStatus(
    template: Template,
  ): 'compliant' | 'warning' | 'violation' {
    if (template.status === 'REJECTED') {
      return 'violation';
    }
    if (template.quality_score && template.quality_score < 5) {
      return 'warning';
    }
    if (
      template.correct_category &&
      template.correct_category !== template.category
    ) {
      return 'warning';
    }
    return 'compliant';
  }
}
