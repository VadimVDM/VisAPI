import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@visapi/core-config';
import { ScraperError } from './scraper-error';
import TwoCaptcha from '@2captcha/captcha-solver';

export type CaptchaSolverProvider = 'capsolver' | '2captcha';

export interface RecaptchaSolveOptions {
  siteKey: string;
  url: string;
  action?: string | null;
  invisible?: boolean;
  enterprise?: boolean;
  /** Optional payload required by some enterprise integrations */
  dataS?: string | null;
  /** Custom user agent to forward to solver (if supported) */
  userAgent?: string;
  /** Desired score for v3 challenges */
  minScore?: number;
}

interface CapsolverTaskPayload {
  type: string;
  websiteURL: string;
  websiteKey: string;
  invisible?: boolean;
  pageAction?: string;
  enterprisePayload?: { s: string };
  userAgent?: string;
  minScore?: number;
}

interface TwoCaptchaRecaptchaOptions {
  pageurl: string;
  googlekey: string;
  enterprise?: number;
  invisible?: number;
  action?: string;
  data_s?: string;
}

interface CapsolverCreateResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
}

interface CapsolverResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status?: 'processing' | 'ready';
  solution?: {
    gRecaptchaResponse?: string;
  };
}

interface TwoCaptchaResult {
  data?: string;
}

interface TwoCaptchaSolver {
  recaptcha(options: TwoCaptchaRecaptchaOptions): Promise<TwoCaptchaResult>;
}

interface TwoCaptchaModule {
  Solver: new (apiKey: string, pollIntervalMs?: number) => TwoCaptchaSolver;
}

@Injectable()
export class CaptchaSolverService {
  private readonly logger = new Logger(CaptchaSolverService.name);
  private readonly provider: CaptchaSolverProvider | null;
  private readonly apiKey: string | null;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.captchaSolverProvider;
    this.provider = provider === 'none' ? null : provider;
    this.apiKey = this.configService.captchaSolverApiKey ?? null;
    this.timeoutMs = this.configService.captchaSolverTimeoutMs;
    this.pollIntervalMs = this.configService.captchaSolverPollIntervalMs;

    if (this.isEnabled()) {
      this.logger.log(
        `Captcha solver provider ${this.provider} initialized (timeout ${this.timeoutMs}ms, poll ${this.pollIntervalMs}ms)`,
      );
    } else {
      this.logger.warn(
        'Captcha solver not configured - reCAPTCHA challenges require manual resolution',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.provider && this.apiKey);
  }

  async solveRecaptchaV2(options: RecaptchaSolveOptions): Promise<string> {
    if (!this.isEnabled()) {
      throw new ScraperError('Captcha solver is not configured', {
        code: 'CAPTCHA_SOLVER_NOT_CONFIGURED',
        retryable: false,
      });
    }

    switch (this.provider) {
      case 'capsolver':
        return this.solveWithCapsolver(options);
      case '2captcha':
        return this.solveWithTwoCaptcha(options);
      default:
        throw new ScraperError(
          `Unsupported captcha solver provider: ${String(this.provider)}`,
          {
            code: 'CAPTCHA_SOLVER_UNSUPPORTED',
            retryable: false,
          },
        );
    }
  }

  private async solveWithCapsolver(
    options: RecaptchaSolveOptions,
  ): Promise<string> {
    const payload: CapsolverTaskPayload = {
      type: options.enterprise
        ? 'ReCaptchaV2EnterpriseTaskProxyLess'
        : 'ReCaptchaV2TaskProxyLess',
      websiteURL: options.url,
      websiteKey: options.siteKey,
      invisible: options.invisible ?? true,
    };

    if (options.action) {
      payload.pageAction = options.action;
    }
    if (options.dataS) {
      payload.enterprisePayload = { s: options.dataS };
    }
    if (options.userAgent) {
      payload.userAgent = options.userAgent;
    }
    if (options.minScore) {
      payload.minScore = options.minScore;
    }

    const requestBody = {
      clientKey: this.apiKey,
      task: payload,
    };

    const createResponse = await axios
      .post<CapsolverCreateResponse>(
        'https://api.capsolver.com/createTask',
        requestBody,
        {
          timeout: this.timeoutMs,
        },
      )
      .then((res) => res.data)
      .catch((error: unknown) => {
        const message = this.formatError(error);
        this.logger.error(`Failed to create CapSolver task: ${message}`);
        throw new ScraperError('CapSolver task creation failed', {
          code: 'CAPTCHA_SOLVER_CREATE_FAILED',
          retryable: false,
        });
      });

    if (createResponse.errorId) {
      const message =
        createResponse.errorDescription ||
        createResponse.errorCode ||
        'Unknown CapSolver error';
      this.logger.error(`CapSolver createTask error: ${message}`);
      throw new ScraperError(`CapSolver error: ${message}`, {
        code: 'CAPTCHA_SOLVER_CREATE_FAILED',
        retryable: this.isRetryableProviderError(createResponse.errorCode),
      });
    }

    const taskId = createResponse.taskId;
    if (!taskId) {
      throw new ScraperError('CapSolver did not return a taskId', {
        code: 'CAPTCHA_SOLVER_NO_TASK_ID',
        retryable: false,
      });
    }

    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      await this.sleep(this.pollIntervalMs);

      const statusResponse = await axios
        .post<CapsolverResultResponse>(
          'https://api.capsolver.com/getTaskResult',
          {
            clientKey: this.apiKey,
            taskId,
          },
          {
            timeout: this.timeoutMs,
          },
        )
        .then((res) => res.data)
        .catch((error: unknown) => {
          const message = this.formatError(error);
          this.logger.error(`CapSolver getTaskResult failed: ${message}`);
          throw new ScraperError('CapSolver polling failed', {
            code: 'CAPTCHA_SOLVER_POLL_FAILED',
            retryable: true,
          });
        });

      if (statusResponse.errorId) {
        const message =
          statusResponse.errorDescription ||
          statusResponse.errorCode ||
          'Unknown CapSolver error';
        this.logger.error(`CapSolver getTaskResult error: ${message}`);
        throw new ScraperError(`CapSolver error: ${message}`, {
          code: 'CAPTCHA_SOLVER_POLL_FAILED',
          retryable: this.isRetryableProviderError(statusResponse.errorCode),
        });
      }

      if (statusResponse.status === 'ready') {
        const token = statusResponse.solution?.gRecaptchaResponse;
        if (!token) {
          throw new ScraperError('CapSolver returned empty token', {
            code: 'CAPTCHA_SOLVER_EMPTY_TOKEN',
            retryable: true,
          });
        }

        return token;
      }
    }

    throw new ScraperError('CapSolver timed out while solving captcha', {
      code: 'CAPTCHA_SOLVER_TIMEOUT',
      retryable: true,
    });
  }

  private async solveWithTwoCaptcha(
    options: RecaptchaSolveOptions,
  ): Promise<string> {
    try {
      const apiKey = this.apiKey;
      if (!apiKey) {
        throw new ScraperError('2Captcha API key is not configured', {
          code: 'CAPTCHA_SOLVER_NOT_CONFIGURED',
          retryable: false,
        });
      }

      const module = TwoCaptcha as unknown as TwoCaptchaModule;
      const solver = new module.Solver(apiKey, this.pollIntervalMs);

      this.logger.log('[2Captcha] Submitting reCAPTCHA task...');

      // Build recaptcha options
      const recaptchaOptions: TwoCaptchaRecaptchaOptions = {
        pageurl: options.url,
        googlekey: options.siteKey,
      };

      // Add enterprise flag if needed
      if (options.enterprise) {
        recaptchaOptions.enterprise = 1;
      }

      // Add invisible flag if needed (2Captcha expects 1 for invisible)
      if (options.invisible) {
        recaptchaOptions.invisible = 1;
      }

      // Add action for v3 or enterprise
      if (options.action) {
        recaptchaOptions.action = options.action;
      }

      // Add data-s parameter for enterprise
      if (options.dataS) {
        recaptchaOptions.data_s = options.dataS;
      }

      // Submit and wait for solution
      const result = await solver.recaptcha(recaptchaOptions);

      if (!result?.data) {
        throw new ScraperError('2Captcha returned empty response', {
          code: 'CAPTCHA_SOLVER_EMPTY_TOKEN',
          retryable: true,
        });
      }

      this.logger.log('[2Captcha] Successfully received token');
      return result.data;
    } catch (error: unknown) {
      const message = this.formatError(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[2Captcha] Solve failed: ${message}`, stack);

      // Check for specific 2Captcha error codes
      const isRetryable = this.isTwoCaptchaErrorRetryable(message);

      throw new ScraperError(`2Captcha error: ${message}`, {
        code: 'CAPTCHA_SOLVER_FAILED',
        retryable: isRetryable,
      });
    }
  }

  private isTwoCaptchaErrorRetryable(errorMessage: string): boolean {
    const normalized = errorMessage.toUpperCase();
    const nonRetryableErrors = [
      'ERROR_WRONG_USER_KEY',
      'ERROR_KEY_DOES_NOT_EXIST',
      'ERROR_ZERO_BALANCE',
      'ERROR_WRONG_GOOGLEKEY',
      'ERROR_WRONG_CAPTCHA_ID',
      'ERROR_BAD_TOKEN_OR_PAGEURL',
    ];

    return !nonRetryableErrors.some((err) => normalized.includes(err));
  }

  private isRetryableProviderError(providerCode?: string | null): boolean {
    if (!providerCode) {
      return true;
    }

    const normalized = providerCode.toUpperCase();
    const nonRetryable = new Set([
      'ERROR_WRONG_USER_KEY',
      'INVALID_KEY',
      'ERROR_KEY_DOES_NOT_EXIST',
      'ERROR_ZERO_BALANCE',
      'ERROR_NO_SUCH_CAPCHA_ID',
      'CAPTCHA_NOT_READY',
    ]);

    return !nonRetryable.has(normalized);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatError(error: unknown): string {
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
