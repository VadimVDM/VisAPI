import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type TemplateData = Record<string, JsonValue>;

interface HandlebarsHelperOptions {
  fn: (context: unknown) => string;
  inverse: (context: unknown) => string;
}

@Injectable()
export class PdfTemplateService {
  private readonly logger = new Logger(PdfTemplateService.name);
  private readonly compiledTemplates = new Map<
    string,
    HandlebarsTemplateDelegate
  >();
  private readonly templatesDir = path.join(process.cwd(), 'templates', 'pdf');

  constructor() {
    this.registerHelpers();
    void this.ensureTemplatesDirectory();
  }

  async compileTemplate(
    templateName: string,
    data: TemplateData,
  ): Promise<string> {
    const template = await this.getTemplate(templateName);
    const processedData = this.preprocessData(data);

    try {
      const html = template(processedData);
      return this.wrapWithLayout(html, templateName);
    } catch (error: unknown) {
      const message = this.describeError(error);
      this.logger.error(
        `Failed to render template ${templateName}: ${message}`,
      );
      throw new Error(`Template rendering failed: ${message}`);
    }
  }

  processHtml(html: string, data: TemplateData): string {
    if (!html.includes('{{')) {
      return html;
    }

    try {
      const template = Handlebars.compile(html);
      const processedData = this.preprocessData(data);
      return template(processedData);
    } catch (error: unknown) {
      const message = this.describeError(error);
      this.logger.error(`Failed to process HTML with Handlebars: ${message}`);
      throw new Error(`HTML processing failed: ${message}`);
    }
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    });

    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    Handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
    Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase();
    });

    Handlebars.registerHelper(
      'ifEquals',
      function (
        arg1: unknown,
        arg2: unknown,
        options: HandlebarsHelperOptions,
      ) {
        return arg1 === arg2 ? options.fn(this) : options.inverse(this);
      },
    );
  }

  private async getTemplate(
    templateName: string,
  ): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName);
    }

    // Try loading from file system
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      await fs.access(templatePath);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);
      this.compiledTemplates.set(templateName, compiled);
      this.logger.log(`Loaded template from file: ${templateName}`);
      return compiled;
    } catch {
      // Try loading from examples if not found
      const examplePath = path.join(
        this.templatesDir,
        'examples',
        `${templateName}.hbs`,
      );
      try {
        const exampleContent = await fs.readFile(examplePath, 'utf-8');
        const compiled = Handlebars.compile(exampleContent);
        this.compiledTemplates.set(templateName, compiled);
        this.logger.log(`Loaded example template: ${templateName}`);
        return compiled;
      } catch {
        throw new Error(
          `Template not found: ${templateName}. Please create ${templatePath}`,
        );
      }
    }
  }

  private async ensureTemplatesDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      await fs.mkdir(path.join(this.templatesDir, 'examples'), {
        recursive: true,
      });

      // Create example templates if they don't exist
      await this.createExampleTemplates();
    } catch (error: unknown) {
      const message = this.describeError(error);
      this.logger.warn(`Failed to ensure templates directory: ${message}`);
    }
  }

  private async createExampleTemplates() {
    const examples = [
      { name: 'invoice', content: this.getExampleInvoiceTemplate() },
      { name: 'receipt', content: this.getExampleReceiptTemplate() },
      { name: 'report', content: this.getExampleReportTemplate() },
    ];

    for (const example of examples) {
      const examplePath = path.join(
        this.templatesDir,
        'examples',
        `${example.name}.hbs`,
      );
      try {
        await fs.access(examplePath);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(examplePath, example.content, 'utf-8');
        this.logger.log(`Created example template: ${example.name}`);
      }
    }
  }

  private preprocessData(data: TemplateData): TemplateData {
    const processed: TemplateData = { ...data };

    const dateValue = data.date;
    if (typeof dateValue === 'string') {
      processed.formattedDate = new Date(dateValue).toLocaleDateString();
    }

    const itemsValue = data.items;
    if (Array.isArray(itemsValue)) {
      const normalizedItems = itemsValue
        .map((item) =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? ({ ...item } as Record<string, JsonValue>)
            : null,
        )
        .filter((item): item is Record<string, JsonValue> => item !== null)
        .map((item) => {
          const quantity = this.toNumber(item.quantity, 1);
          const price = this.toNumber(item.price, 0);
          return {
            ...item,
            total: quantity * price,
          } as Record<string, JsonValue>;
        });

      processed.items = normalizedItems as JsonValue;

      const subtotal = normalizedItems.reduce((sum, item) => {
        const total = this.toNumber(item.total, 0);
        return sum + total;
      }, 0);

      processed.subtotal = subtotal;
      const taxValue = this.toNumber(data.tax, subtotal * 0.17);
      processed.tax = taxValue;
      processed.total = subtotal + taxValue;
    }

    (['subtotal', 'tax', 'total', 'amount'] as const).forEach((key) => {
      const rawValue = processed[key];
      if (typeof rawValue === 'number') {
        processed[`${key}Formatted`] = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(rawValue);
      }
    });

    return processed;
  }

  async getAvailableTemplates(): Promise<
    Array<{ name: string; path: string; isExample: boolean }>
  > {
    const templates: Array<{ name: string; path: string; isExample: boolean }> =
      [];

    try {
      // Get custom templates
      const customFiles = await fs.readdir(this.templatesDir);
      for (const file of customFiles) {
        if (file.endsWith('.hbs')) {
          templates.push({
            name: file.replace('.hbs', ''),
            path: path.join(this.templatesDir, file),
            isExample: false,
          });
        }
      }

      // Get example templates
      const examplesDir = path.join(this.templatesDir, 'examples');
      const exampleFiles = await fs.readdir(examplesDir);
      for (const file of exampleFiles) {
        if (file.endsWith('.hbs')) {
          templates.push({
            name: file.replace('.hbs', ''),
            path: path.join(examplesDir, file),
            isExample: true,
          });
        }
      }
    } catch (error: unknown) {
      const message = this.describeError(error);
      this.logger.error(`Failed to list templates: ${message}`);
    }

    return templates;
  }

  clearCache(): void {
    this.compiledTemplates.clear();
    this.logger.log('Template cache cleared');
  }

  private wrapWithLayout(content: string, templateName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #2c3e50; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin: 25px 0 15px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #3498db; color: white; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #ecf0f1; }
    tr:hover { background: #f8f9fa; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
    .info-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total-section { margin-top: 30px; text-align: right; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #7f8c8d; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
  }

  private getExampleInvoiceTemplate(): string {
    return `
<div class="header">
  <div>
    <h1>INVOICE</h1>
    <p>{{companyName}}</p>
  </div>
  <div style="text-align: right;">
    <strong>#{{invoiceNumber}}</strong><br>
    Date: {{formattedDate}}<br>
    Due: {{dueDate}}
  </div>
</div>
<div class="info-section">
  <h2>Bill To:</h2>
  <strong>{{customerName}}</strong><br>
  {{customerAddress}}
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{description}}</td>
      <td>{{quantity}}</td>
      <td>{{formatCurrency price}}</td>
      <td>{{formatCurrency total}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
<div class="total-section">
  <p>Subtotal: {{subtotalFormatted}}</p>
  <p>Tax: {{taxFormatted}}</p>
  <p><strong>Total: {{totalFormatted}}</strong></p>
</div>`;
  }

  private getExampleReceiptTemplate(): string {
    return `
<h1>Payment Receipt</h1>
<div class="info-section">
  <p><strong>Receipt #:</strong> {{receiptNumber}}</p>
  <p><strong>Date:</strong> {{formattedDate}}</p>
  <p><strong>Customer:</strong> {{customerName}}</p>
  <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
  <p><strong>Description:</strong> {{description}}</p>
  <h2 style="color: #27ae60;">{{amountFormatted}}</h2>
</div>`;
  }

  private getExampleReportTemplate(): string {
    return `
<h1>{{title}}</h1>
{{#if subtitle}}<h2>{{subtitle}}</h2>{{/if}}
<p>Generated: {{formattedDate}}</p>
<div>{{{content}}}</div>`;
  }

  private toNumber(value: JsonValue | undefined, fallback: number): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
}
