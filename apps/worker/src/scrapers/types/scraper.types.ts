/**
 * Base types for all visa document scrapers
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ScraperType = 'esta' | 'vietnam-evisa' | 'korea-keta';

export type ScraperStatus =
  | 'pending'      // Job created, not started
  | 'running'      // Currently scraping
  | 'completed'    // Successfully downloaded document
  | 'failed'       // Failed to download
  | 'not_found'    // Document not available yet
  | 'retry';       // Will retry later

export interface ScraperCredentials {
  /** Applicant email or username */
  email?: string;
  /** Application reference number */
  referenceNumber?: string;
  /** Passport number */
  passportNumber?: string;
  /** Date of birth (ISO 8601) */
  dateOfBirth?: string;
  /** Additional country-specific fields */
  [key: string]: JsonValue | undefined;
}

export interface ScraperJobData {
  /** Unique job ID */
  jobId: string;
  /** Type of visa to scrape */
  scraperType: ScraperType;
  /** Credentials/identifiers for login/lookup */
  credentials: ScraperCredentials;
  /** Order ID for tracking */
  orderId?: string;
  /** Application ID for tracking */
  applicationId?: string;
  /** Max retry attempts */
  maxRetries?: number;
  /** Current retry count */
  retryCount?: number;
  /** Job creation timestamp */
  createdAt: string;
  /** Optional webhook URL for completion notification */
  webhookUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, JsonValue>;
}

export interface ScraperJobResult {
  /** Whether scraping succeeded */
  success: boolean;
  /** Job ID for tracking */
  jobId: string;
  /** Scraper type used */
  scraperType: ScraperType;
  /** Final status */
  status: ScraperStatus;
  /** Supabase storage URL if document downloaded */
  documentUrl?: string;
  /** Signed URL for temporary access */
  signedUrl?: string;
  /** Document filename */
  filename?: string;
  /** Document size in bytes */
  size?: number;
  /** MIME type */
  mimeType?: string;
  /** Download timestamp */
  downloadedAt?: string;
  /** Processing duration in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Error code for categorization */
  errorCode?: string;
  /** Whether job should be retried */
  shouldRetry?: boolean;
  /** Retry after timestamp */
  retryAfter?: string;
  /** Screenshots for debugging (base64 encoded) */
  screenshots?: string[];
  /** Additional result metadata */
  metadata?: Record<string, JsonValue>;
}

export interface BrowserConfig {
  /** Whether to run browser in headless mode */
  headless: boolean;
  /** Browser timeout in ms */
  timeout: number;
  /** User agent string */
  userAgent?: string;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** Whether to enable JavaScript */
  javascript: boolean;
  /** Whether to load images */
  images: boolean;
  /** Additional Playwright launch options */
  launchOptions?: Record<string, JsonValue>;
}

export interface ScraperOptions {
  /** Browser configuration */
  browserConfig?: Partial<BrowserConfig>;
  /** Whether to take screenshots on error */
  screenshotsOnError?: boolean;
  /** Maximum wait time for document availability (ms) */
  maxWaitTime?: number;
  /** Delay between actions (ms) */
  actionDelay?: number;
}