import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@visapi/core-config';
import { ScraperError } from './scraper-error';

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

interface TwoCaptchaCreateResponse {
  errorId: number;
  errorCode?: string;
  taskId?: string | number;
}

interface TwoCaptchaResultResponse {
  errorId: number;
  errorCode?: string;
  status?: 'processing' | 'ready';
  solution?: {
    gRecaptchaResponse?: string;
  };
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
          `Unsupported captcha solver provider: ${this.provider}`,
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
    const payload: Record<string, any> = {
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
      .catch((error) => {
        this.logger.error('Failed to create CapSolver task', error);
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
        .catch((error) => {
          this.logger.error('CapSolver getTaskResult failed', error);
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
    const taskPayload: Record<string, any> = {
      type: options.enterprise
        ? 'RecaptchaV2EnterpriseTaskProxyLess'
        : 'RecaptchaV2TaskProxyLess',
      websiteURL: options.url,
      websiteKey: options.siteKey,
      isInvisible: options.invisible ?? true,
    };

    if (options.action) {
      taskPayload.pageAction = options.action;
    }
    if (options.dataS) {
      taskPayload.enterprisePayload = { s: options.dataS };
    }
    if (options.userAgent) {
      taskPayload.userAgent = options.userAgent;
    }
    if (options.minScore) {
      taskPayload.minScore = options.minScore;
    }

    const createResponse = await axios
      .post<TwoCaptchaCreateResponse>(
        'https://api.2captcha.com/createTask',
        {
          clientKey: this.apiKey,
          task: taskPayload,
        },
        {
          timeout: this.timeoutMs,
        },
      )
      .then((res) => res.data)
      .catch((error) => {
        this.logger.error('2Captcha createTask failed', error);
        throw new ScraperError('2Captcha task creation failed', {
          code: 'CAPTCHA_SOLVER_CREATE_FAILED',
          retryable: false,
        });
      });

    if (createResponse.errorId) {
      const message = createResponse.errorCode || 'Unknown 2Captcha error';
      this.logger.error(`2Captcha createTask error: ${message}`);
      throw new ScraperError(`2Captcha error: ${message}`, {
        code: 'CAPTCHA_SOLVER_CREATE_FAILED',
        retryable: this.isRetryableProviderError(createResponse.errorCode),
      });
    }

    const taskId = createResponse.taskId;
    if (!taskId) {
      throw new ScraperError('2Captcha did not return a task id', {
        code: 'CAPTCHA_SOLVER_NO_TASK_ID',
        retryable: false,
      });
    }

    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      await this.sleep(this.pollIntervalMs);

      const pollResponse = await axios
        .post<TwoCaptchaResultResponse>(
          'https://api.2captcha.com/getTaskResult',
          {
            clientKey: this.apiKey,
            taskId,
          },
          {
            timeout: this.timeoutMs,
          },
        )
        .then((res) => res.data)
        .catch((error) => {
          this.logger.error('2Captcha polling failed', error);
          throw new ScraperError('2Captcha polling failed', {
            code: 'CAPTCHA_SOLVER_POLL_FAILED',
            retryable: true,
          });
        });

      if (pollResponse.errorId) {
        const message = pollResponse.errorCode || 'Unknown 2Captcha error';
        this.logger.error(`2Captcha getTaskResult error: ${message}`);
        throw new ScraperError(`2Captcha error: ${message}`, {
          code: 'CAPTCHA_SOLVER_POLL_FAILED',
          retryable: this.isRetryableProviderError(pollResponse.errorCode),
        });
      }

      if (pollResponse.status === 'ready') {
        const token = pollResponse.solution?.gRecaptchaResponse;
        if (!token) {
          throw new ScraperError('2Captcha returned empty token', {
            code: 'CAPTCHA_SOLVER_EMPTY_TOKEN',
            retryable: true,
          });
        }
        return token;
      }
    }

    throw new ScraperError('2Captcha timed out while solving captcha', {
      code: 'CAPTCHA_SOLVER_TIMEOUT',
      retryable: true,
    });
  }

  private isRetryableProviderError(providerCode?: string): boolean {
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
}
