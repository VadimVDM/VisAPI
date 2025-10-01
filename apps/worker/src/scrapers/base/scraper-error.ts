export interface ScraperErrorOptions {
  /** Optional machine readable error code */
  code?: string;
  /** Whether the error should trigger queue retries */
  retryable?: boolean;
}

/**
 * Domain specific error to control retry semantics for scraper jobs
 */
export class ScraperError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, options: ScraperErrorOptions = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = options.code ?? 'SCRAPER_ERROR';
    this.retryable = options.retryable ?? true;
  }
}
