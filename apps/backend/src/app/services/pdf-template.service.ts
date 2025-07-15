import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PdfTemplate {
  name: string;
  html: string;
  compiled: HandlebarsTemplateDelegate;
}

@Injectable()
export class PdfTemplateService {
  private templates: Map<string, PdfTemplate> = new Map();
  private readonly templatesDir = path.join(process.cwd(), 'templates', 'pdf');

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(PdfTemplateService.name);
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: string | Date, format: string) => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    });

    // Currency formatting helper
    Handlebars.registerHelper('currency', (amount: number, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
  }

  /**
   * Load and compile a template
   */
  async loadTemplate(templateName: string): Promise<PdfTemplate> {
    // Check cache first
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      const html = await fs.readFile(templatePath, 'utf-8');
      const compiled = Handlebars.compile(html);

      const template: PdfTemplate = {
        name: templateName,
        html,
        compiled,
      };

      // Cache the compiled template
      this.templates.set(templateName, template);
      this.logger.info({ templateName }, 'Template loaded and compiled');

      return template;
    } catch (error) {
      this.logger.error({ error, templateName }, 'Failed to load template');
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Render a template with data
   */
  async renderTemplate(templateName: string, data: any): Promise<string> {
    const template = await this.loadTemplate(templateName);
    
    try {
      const html = template.compiled(data);
      this.logger.debug({ templateName, dataKeys: Object.keys(data) }, 'Template rendered');
      return html;
    } catch (error) {
      this.logger.error({ error, templateName }, 'Failed to render template');
      throw new Error(`Failed to render template: ${templateName}`);
    }
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      this.logger.error({ error }, 'Failed to list templates');
      return [];
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templates.clear();
    this.logger.info('Template cache cleared');
  }
}