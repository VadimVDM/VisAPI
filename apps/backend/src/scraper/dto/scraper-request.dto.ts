import { IsString, IsOptional, IsObject, IsEnum, IsBoolean } from 'class-validator';

export enum ScraperCountry {
  USA = 'usa',
  VIETNAM = 'vietnam',
  KOREA = 'korea',
  SOUTH_KOREA = 'south_korea',
}

/**
 * Request to trigger a visa document scraper job
 */
export class TriggerScraperDto {
  /** Order ID from orders table */
  @IsString()
  @IsOptional()
  orderId?: string;

  /** Application ID (if scraping for specific application) */
  @IsString()
  @IsOptional()
  applicationId?: string;

  /** Country/visa type to scrape (auto-detected from order if not provided) */
  @IsEnum(ScraperCountry)
  @IsOptional()
  country?: ScraperCountry;

  /** Flexible credentials object - structure depends on scraper type */
  @IsObject()
  @IsOptional()
  credentials?: {
    email?: string;
    referenceNumber?: string;
    applicationNumber?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    [key: string]: string | number | boolean | undefined;
  };

  /** Optional webhook URL for completion notification */
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  /** Force scraping even if document already exists */
  @IsBoolean()
  @IsOptional()
  force?: boolean;

  /** Additional metadata */
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Request to check scraper job status
 */
export class GetScraperStatusDto {
  @IsString()
  jobId: string;
}