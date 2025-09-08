import { IsString, IsOptional, IsEnum, IsObject, IsUrl, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PdfSource {
  TEMPLATE = 'template',
  URL = 'url',
  HTML = 'html',
}

export enum PdfFormat {
  A4 = 'A4',
  LETTER = 'Letter',
  LEGAL = 'Legal',
  A3 = 'A3',
}

export enum PdfOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

export enum PdfPriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

// Type for template data - can be extended based on template requirements
export type TemplateData = Record<string, string | number | boolean | null | undefined | TemplateData | TemplateData[]>;

// Type for job metadata
export type JobMetadata = Record<string, string | number | boolean | null | undefined>;

export class PdfOptionsDto {
  @ApiPropertyOptional({ enum: PdfFormat, default: PdfFormat.A4 })
  @IsEnum(PdfFormat)
  @IsOptional()
  format?: PdfFormat = PdfFormat.A4;

  @ApiPropertyOptional({ enum: PdfOrientation, default: PdfOrientation.PORTRAIT })
  @IsEnum(PdfOrientation)
  @IsOptional()
  orientation?: PdfOrientation = PdfOrientation.PORTRAIT;

  @ApiPropertyOptional({ description: 'Page margins in pixels', example: { top: 20, bottom: 20, left: 20, right: 20 } })
  @IsObject()
  @IsOptional()
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  @ApiPropertyOptional({ description: 'Include page numbers', default: false })
  @IsBoolean()
  @IsOptional()
  pageNumbers?: boolean = false;

  @ApiPropertyOptional({ description: 'Header HTML template' })
  @IsString()
  @IsOptional()
  headerTemplate?: string;

  @ApiPropertyOptional({ description: 'Footer HTML template' })
  @IsString()
  @IsOptional()
  footerTemplate?: string;

  @ApiPropertyOptional({ description: 'Print background graphics', default: true })
  @IsBoolean()
  @IsOptional()
  printBackground?: boolean = true;
}

export class GeneratePdfDto {
  @ApiProperty({ enum: PdfSource, description: 'Source type for PDF generation' })
  @IsEnum(PdfSource)
  source: PdfSource;

  @ApiPropertyOptional({ description: 'Template name (required if source is template)', example: 'invoice' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'URL to convert to PDF (required if source is url)' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'HTML content (required if source is html)' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiProperty({ description: 'Data to populate template or HTML', example: { name: 'John Doe', amount: 100 } })
  @IsObject()
  @IsOptional()
  data?: TemplateData;

  @ApiPropertyOptional({ description: 'Output filename without extension', example: 'invoice-2025-01' })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiPropertyOptional({ description: 'PDF generation options' })
  @ValidateNested()
  @Type(() => PdfOptionsDto)
  @IsOptional()
  options?: PdfOptionsDto;

  @ApiPropertyOptional({ enum: PdfPriority, default: PdfPriority.NORMAL })
  @IsEnum(PdfPriority)
  @IsOptional()
  priority?: PdfPriority = PdfPriority.NORMAL;

  @ApiPropertyOptional({ description: 'Webhook URL for completion notification' })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Metadata to attach to the job' })
  @IsObject()
  @IsOptional()
  metadata?: JobMetadata;
}