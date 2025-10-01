import axios from 'axios';
import { ConfigService } from '@visapi/core-config';
import {
  CaptchaSolverService,
  RecaptchaSolveOptions,
} from './captcha-solver.service';
import { ScraperError } from './scraper-error';

jest.mock('axios');

jest.mock('@2captcha/captcha-solver', () => {
  const recaptchaMock = jest.fn();
  const solverInstance = { recaptcha: recaptchaMock };
  const SolverCtor = jest.fn(() => solverInstance);

  return {
    __esModule: true,
    default: {
      Solver: SolverCtor,
    },
    // Export for testing
    _mocks: {
      recaptcha: recaptchaMock,
      Solver: SolverCtor,
    },
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseOptions: RecaptchaSolveOptions = {
  siteKey: 'test-site-key',
  url: 'https://example.com',
};

const createService = (overrides?: {
  provider?: 'none' | 'capsolver' | '2captcha';
  apiKey?: string | null;
  timeoutMs?: number;
  pollIntervalMs?: number;
}) => {
  const configSnapshot = {
    provider: overrides?.provider ?? 'capsolver',
    apiKey: overrides?.apiKey ?? 'fake-key',
    timeoutMs: overrides?.timeoutMs ?? 5000,
    pollIntervalMs: overrides?.pollIntervalMs ?? 10,
  };

  const stubConfig = {
    get captchaSolverProvider() {
      return configSnapshot.provider;
    },
    get captchaSolverApiKey() {
      return configSnapshot.apiKey ?? undefined;
    },
    get captchaSolverTimeoutMs() {
      return configSnapshot.timeoutMs;
    },
    get captchaSolverPollIntervalMs() {
      return configSnapshot.pollIntervalMs;
    },
  } as unknown as ConfigService;

  return new CaptchaSolverService(stubConfig);
};

describe('CaptchaSolverService', () => {
  // Get references to the mocked functions
  const getMocks = (): { recaptcha: jest.Mock; Solver: jest.Mock } => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    return require('@2captcha/captcha-solver')._mocks;
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockedAxios.post.mockReset();
    // Reset 2Captcha mocks
    const { recaptcha, Solver } = getMocks();
    recaptcha.mockReset();
    Solver.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws ScraperError when solver is not configured', async () => {
    const service = createService({ provider: 'none', apiKey: null });

    await expect(service.solveRecaptchaV2(baseOptions)).rejects.toMatchObject<
      Partial<ScraperError>
    >({
      code: 'CAPTCHA_SOLVER_NOT_CONFIGURED',
      retryable: false,
    });
  });

  it('resolves token using CapSolver workflow', async () => {
    const service = createService({ provider: 'capsolver', pollIntervalMs: 5 });

    mockedAxios.post
      .mockResolvedValueOnce({ data: { errorId: 0, taskId: 'task-1' } })
      .mockResolvedValueOnce({
        data: {
          errorId: 0,
          status: 'ready',
          solution: { gRecaptchaResponse: 'capsolver-token' },
        },
      });

    const solvePromise = service.solveRecaptchaV2(baseOptions);

    await jest.advanceTimersByTimeAsync(5);

    await expect(solvePromise).resolves.toBe('capsolver-token');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- axios mock methods are bound by Jest
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post.mock.calls[0]?.[0]).toBe(
      'https://api.capsolver.com/createTask',
    );
    expect(mockedAxios.post.mock.calls[1]?.[0]).toBe(
      'https://api.capsolver.com/getTaskResult',
    );
  });

  it('resolves token using 2Captcha workflow', async () => {
    const { recaptcha, Solver } = getMocks();
    recaptcha.mockResolvedValue({ data: '2captcha-token' });

    const service = createService({ provider: '2captcha', pollIntervalMs: 5 });

    await expect(service.solveRecaptchaV2(baseOptions)).resolves.toBe(
      '2captcha-token',
    );

    expect(Solver).toHaveBeenCalledWith('fake-key', 5);
    expect(recaptcha).toHaveBeenCalledWith(
      expect.objectContaining({
        pageurl: 'https://example.com',
        googlekey: 'test-site-key',
      }),
    );
  });

  it('marks provider errors with non-retryable flag when applicable', async () => {
    const service = createService({ provider: 'capsolver' });

    mockedAxios.post.mockResolvedValueOnce({
      data: { errorId: 1, errorCode: 'ERROR_ZERO_BALANCE' },
    });

    await expect(service.solveRecaptchaV2(baseOptions)).rejects.toMatchObject<
      Partial<ScraperError>
    >({
      code: 'CAPTCHA_SOLVER_CREATE_FAILED',
      retryable: false,
    });
  });
});
