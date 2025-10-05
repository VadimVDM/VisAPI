import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { ScraperService } from './scraper.service';
import { TriggerScraperDto } from './dto/scraper-request.dto';
import {
  ScraperJobResponseDto,
  ScraperJobStatusDto,
} from './dto/scraper-response.dto';

/**
 * Scraper Controller
 * Manages visa document scraping jobs for ESTA, Vietnam eVisa, and Korea K-ETA
 */
@Controller('v1/scraper')
@UseGuards(ApiKeyGuard)
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  /**
   * Trigger a new visa document scraper job
   *
   * POST /api/v1/scraper/trigger
   *
   * Required scope: integrations:scraper:trigger
   *
   * @example
   * // Trigger by order ID (auto-detects country and extracts credentials)
   * {
   *   "orderId": "IL250928IL12",
   *   "applicationId": "1759091492207"
   * }
   *
   * @example
   * // Trigger with manual credentials
   * {
   *   "country": "usa",
   *   "credentials": {
   *     "applicationNumber": "ABC123456",
   *     "passportNumber": "683105860",
   *     "dateOfBirth": "2016-10-06"
   *   }
   * }
   */
  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @Scopes('integrations:scraper:trigger')
  async triggerScraper(
    @Body() dto: TriggerScraperDto,
  ): Promise<ScraperJobResponseDto> {
    this.logger.log(`Triggering scraper job: ${JSON.stringify(dto)}`);
    return this.scraperService.triggerScraper(dto);
  }

  /**
   * Get scraper job status
   *
   * GET /api/v1/scraper/status/:jobId
   *
   * Required scope: integrations:scraper:read
   */
  @Get('status/:jobId')
  @Scopes('integrations:scraper:read')
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<ScraperJobStatusDto> {
    this.logger.log(`Getting scraper job status: ${jobId}`);
    return this.scraperService.getJobStatus(jobId);
  }

  /**
   * List scraper jobs for an order
   *
   * GET /api/v1/scraper/jobs?orderId=IL250928IL12
   *
   * Required scope: integrations:scraper:read
   */
  @Get('jobs')
  @Scopes('integrations:scraper:read')
  async listJobsForOrder(
    @Query('orderId') orderId: string,
  ): Promise<ScraperJobStatusDto[]> {
    this.logger.log(`Listing scraper jobs for order: ${orderId}`);
    return this.scraperService.listJobsForOrder(orderId);
  }

  /**
   * Get supported countries for scraping
   *
   * GET /api/v1/scraper/countries
   *
   * No authentication required
   */
  @Get('countries')
  getSupportedCountries() {
    return {
      countries: [
        {
          name: 'United States',
          code: 'usa',
          scraperType: 'esta',
          visaType: 'ESTA (Electronic System for Travel Authorization)',
          requiredCredentials: [
            'applicationNumber',
            'passportNumber',
            'dateOfBirth',
          ],
        },
        {
          name: 'Vietnam',
          code: 'vietnam',
          scraperType: 'vietnam-evisa',
          visaType: 'eVisa',
          requiredCredentials: ['email', 'referenceNumber', 'dateOfBirth'],
        },
        {
          name: 'South Korea',
          code: 'south_korea',
          scraperType: 'korea-keta',
          visaType: 'K-ETA (Korea Electronic Travel Authorization)',
          requiredCredentials: [
            'applicationNumber',
            'passportNumber',
            'dateOfBirth',
          ],
        },
      ],
    };
  }
}
