/**
 * Response when triggering a scraper job
 */
export class ScraperJobResponseDto {
  /** Unique job ID for tracking */
  jobId: string;

  /** Scraper type that was triggered */
  scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta';

  /** Current job status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found' | 'retry';

  /** Message describing the job */
  message: string;

  /** Order ID if associated */
  orderId?: string;

  /** Application ID if associated */
  applicationId?: string;

  /** Job creation timestamp */
  createdAt: string;
}

/**
 * Response with scraper job status
 */
export class ScraperJobStatusDto {
  /** Unique job ID */
  jobId: string;

  /** Scraper type */
  scraperType: 'esta' | 'vietnam-evisa' | 'korea-keta';

  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found' | 'retry';

  /** Document URL if completed */
  documentUrl?: string;

  /** Signed URL for temporary access */
  signedUrl?: string;

  /** Filename */
  filename?: string;

  /** File size in bytes */
  size?: number;

  /** Download timestamp */
  downloadedAt?: string;

  /** Processing duration in ms */
  duration?: number;

  /** Error message if failed */
  error?: string;

  /** Error code if failed */
  errorCode?: string;

  /** Whether job will be retried */
  shouldRetry?: boolean;

  /** When to retry */
  retryAfter?: string;

  /** Retry count */
  retryCount?: number;

  /** Job timestamps */
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Response with list of scraper jobs
 */
export class ScraperJobListDto {
  jobs: ScraperJobStatusDto[];
  total: number;
  page: number;
  pageSize: number;
}