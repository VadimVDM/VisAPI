import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
import type { ScraperJobData } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { nanoid } from 'nanoid';
import { TriggerScraperDto } from './dto/scraper-request.dto';
import {
  ScraperJobResponseDto,
  ScraperJobStatusDto,
} from './dto/scraper-response.dto';
import type {
  OrderData,
  ScraperCredentials,
  ScraperJobRecord,
} from './types/scraper.types';

/**
 * Maps countries to scraper types
 */
const COUNTRY_TO_SCRAPER_MAP: Record<
  string,
  'esta' | 'vietnam-evisa' | 'korea-keta'
> = {
  // USA - ESTA
  usa: 'esta',
  'united states': 'esta',
  united_states: 'esta',
  us: 'esta',

  // Vietnam - eVisa
  vietnam: 'vietnam-evisa',
  'viet nam': 'vietnam-evisa',
  vietnamese: 'vietnam-evisa',

  // Korea - K-ETA
  korea: 'korea-keta',
  'south korea': 'korea-keta',
  south_korea: 'korea-keta',
  'republic of korea': 'korea-keta',
  kor: 'korea-keta',
  kr: 'korea-keta',
};

/**
 * Scraper Service
 * Handles visa document scraping job creation and tracking
 */
@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SCRAPER) private readonly scraperQueue: Queue,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Trigger a new scraper job
   */
  async triggerScraper(dto: TriggerScraperDto): Promise<ScraperJobResponseDto> {
    this.logger.log(`Triggering scraper: ${JSON.stringify(dto)}`);

    // Validate that we have either orderId or credentials
    if (!dto.orderId && !dto.credentials) {
      throw new BadRequestException(
        'Either orderId or credentials must be provided',
      );
    }

    // If orderId is provided, fetch order data
    let orderData: OrderData | null = null;
    let scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta';
    let credentials: ScraperCredentials;

    if (dto.orderId) {
      orderData = await this.fetchOrderData(dto.orderId);

      // Determine scraper type from product_country
      if (dto.country) {
        scraperType = this.mapCountryToScraper(dto.country);
      } else {
        const productCountry = orderData.product_country?.toLowerCase();
        if (!productCountry) {
          throw new BadRequestException(
            'Order does not have product_country field',
          );
        }
        scraperType = this.mapCountryToScraper(productCountry);
      }

      // Extract credentials from order data
      credentials = this.extractCredentialsFromOrder(
        orderData,
        scraperType,
        dto.applicationId,
      );

      // Merge with any provided credentials
      if (dto.credentials) {
        credentials = { ...credentials, ...dto.credentials };
      }
    } else {
      // Use provided credentials and country
      if (!dto.country) {
        throw new BadRequestException(
          'Country must be provided when not using orderId',
        );
      }
      scraperType = this.mapCountryToScraper(dto.country);
      credentials = dto.credentials || {};
    }

    // Validate credentials based on scraper type
    this.validateCredentials(scraperType, credentials);

    // Generate unique job ID
    const jobId = nanoid();

    // Prepare job data
    const jobData: ScraperJobData = {
      jobId,
      scraperType,
      credentials,
      orderId: dto.orderId,
      applicationId: dto.applicationId,
      maxRetries: 3,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      webhookUrl: dto.webhookUrl,
      metadata: dto.metadata || {},
    };

    // Store job in database
    await this.createScraperJob(jobData);

    // Queue job
    await this.scraperQueue.add(JOB_NAMES.SCRAPE_VISA_DOCUMENT, jobData, {
      jobId,
      priority: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    this.logger.log(`Scraper job queued: ${jobId} (${scraperType})`);

    return {
      jobId,
      scraperType,
      status: 'pending',
      message: `Scraper job created successfully for ${scraperType}`,
      orderId: dto.orderId,
      applicationId: dto.applicationId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get scraper job status
   */
  async getJobStatus(jobId: string): Promise<ScraperJobStatusDto> {
    const { data, error } = await this.supabase.serviceClient
      .from('scraper_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Scraper job not found: ${jobId}`);
    }

    return this.mapJobToStatusDto(data as ScraperJobRecord);
  }

  /**
   * List scraper jobs for an order
   */
  async listJobsForOrder(orderId: string): Promise<ScraperJobStatusDto[]> {
    const { data, error } = await this.supabase.serviceClient
      .from('scraper_jobs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list jobs for order ${orderId}:`, error);
      throw error;
    }

    return (data || []).map((job) =>
      this.mapJobToStatusDto(job as ScraperJobRecord),
    );
  }

  /**
   * Map country string to scraper type
   */
  private mapCountryToScraper(
    country: string,
  ): 'esta' | 'vietnam-evisa' | 'korea-keta' {
    const normalized = country.toLowerCase().trim();
    const scraperType = COUNTRY_TO_SCRAPER_MAP[normalized];

    if (!scraperType) {
      throw new BadRequestException(
        `Unsupported country for scraping: ${country}. Supported: USA, Vietnam, South Korea`,
      );
    }

    return scraperType;
  }

  /**
   * Fetch order data from database
   */
  private async fetchOrderData(orderId: string): Promise<OrderData> {
    const { data, error } = await this.supabase.serviceClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    return data as OrderData;
  }

  /**
   * Extract credentials from order data based on scraper type
   */
  private extractCredentialsFromOrder(
    orderData: OrderData,
    scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta',
    applicationId?: string,
  ): ScraperCredentials {
    const applicantsData = orderData.applicants_data || [];

    // Find specific applicant if applicationId provided
    let applicant = applicantsData[0]; // Default to first applicant
    if (applicationId && applicantsData.length > 0) {
      const found = applicantsData.find((app) => app.id === applicationId);
      if (found) {
        applicant = found;
      }
    }

    if (!applicant) {
      throw new BadRequestException('No applicant data found in order');
    }

    const credentials: ScraperCredentials = {};

    // Common fields
    credentials.email = orderData.client_email;
    credentials.passportNumber = applicant.passport?.number;
    credentials.dateOfBirth = applicant.passport?.dateOfBirth;

    // Scraper-specific fields
    switch (scraperType) {
      case 'esta':
        // ESTA needs application number (from visa_details if exists)
        if (orderData.visa_details?.applications) {
          const visaApp =
            orderData.visa_details.applications.find(
              (app) => app.applicationId === applicationId,
            ) || orderData.visa_details.applications[0];
          credentials.applicationNumber = visaApp?.applicationId;
        }
        break;

      case 'vietnam-evisa':
        // Vietnam eVisa needs application code
        if (orderData.visa_details?.applications) {
          const visaApp =
            orderData.visa_details.applications.find(
              (app) => app.applicationId === applicationId,
            ) || orderData.visa_details.applications[0];
          credentials.applicationNumber = visaApp?.applicationId;
        }
        break;

      case 'korea-keta':
        // Korea K-ETA needs application number
        if (orderData.visa_details?.applications) {
          const visaApp =
            orderData.visa_details.applications.find(
              (app) => app.applicationId === applicationId,
            ) || orderData.visa_details.applications[0];
          credentials.applicationNumber = visaApp?.applicationId;
        }
        break;
    }

    return credentials;
  }

  /**
   * Validate credentials based on scraper type
   */
  private validateCredentials(
    scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta',
    credentials: ScraperCredentials,
  ): void {
    const required: string[] = [];

    switch (scraperType) {
      case 'esta':
        required.push('passportNumber', 'dateOfBirth', 'applicationNumber');
        break;
      case 'vietnam-evisa':
        required.push('email', 'dateOfBirth', 'applicationNumber');
        break;
      case 'korea-keta':
        required.push('passportNumber', 'dateOfBirth', 'applicationNumber');
        break;
    }

    const missing = required.filter((field) => !credentials[field]);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required credentials for ${scraperType}: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Create scraper job record in database
   */
  private async createScraperJob(jobData: ScraperJobData): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('scraper_jobs')
      .insert({
        job_id: jobData.jobId,
        scraper_type: jobData.scraperType,
        status: 'pending',
        credentials: jobData.credentials,
        order_id: jobData.orderId,
        retry_count: jobData.retryCount || 0,
        max_retries: jobData.maxRetries || 3,
        webhook_url: jobData.webhookUrl,
        metadata: jobData.metadata,
      });

    if (error) {
      this.logger.error(`Failed to create scraper job in database:`, error);
      throw error;
    }
  }

  /**
   * Map database job to DTO
   */
  private mapJobToStatusDto(job: ScraperJobRecord): ScraperJobStatusDto {
    return {
      jobId: job.job_id,
      scraperType: job.scraper_type,
      status: job.status,
      documentUrl: job.document_url,
      signedUrl: job.signed_url,
      filename: job.filename,
      size: job.file_size,
      downloadedAt: job.downloaded_at,
      duration: job.duration_ms,
      error: job.error_message,
      errorCode: job.error_code,
      shouldRetry: job.should_retry,
      retryAfter: job.retry_after,
      retryCount: job.retry_count,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    };
  }
}
