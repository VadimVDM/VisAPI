import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RemoteWriteService } from './remote-write.service';
import { register as globalRegistry } from 'prom-client';
import { pushTimeseries } from 'prometheus-remote-write';

jest.mock('prometheus-remote-write', () => ({
  pushTimeseries: jest.fn(),
}));

const mockPushTimeseries = pushTimeseries as jest.MockedFunction<
  typeof pushTimeseries
>;

describe('RemoteWriteService', () => {
  let service: RemoteWriteService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock globalRegistry.metrics()
    jest
      .spyOn(globalRegistry, 'metrics')
      .mockResolvedValue(
        '# HELP visapi_test_metric Test metric\n# TYPE visapi_test_metric counter\nvisapi_test_metric 1',
      );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoteWriteService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown = undefined) => {
              const config: Record<string, unknown> = {
                GRAFANA_REMOTE_WRITE_ENABLED: true,
                GRAFANA_PROMETHEUS_URL:
                  'https://prometheus.grafana.net/api/prom/push',
                GRAFANA_PROMETHEUS_USERNAME: '123456',
                GRAFANA_PROMETHEUS_PASSWORD: 'test-api-key',
                GRAFANA_PUSH_INTERVAL_MS: 1000, // 1 second for testing
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RemoteWriteService>(RemoteWriteService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (service['intervalId']) {
      clearInterval(service['intervalId']);
    }
    mockPushTimeseries.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not start pushing when disabled', () => {
    jest
      .spyOn(configService, 'get')
      .mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'GRAFANA_REMOTE_WRITE_ENABLED') return false;
        return defaultValue;
      });

    const newService = new RemoteWriteService(configService);
    newService.onModuleInit();

    expect(newService['intervalId']).toBeUndefined();
  });

  it('should not start pushing when credentials are missing', () => {
    jest
      .spyOn(configService, 'get')
      .mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'GRAFANA_REMOTE_WRITE_ENABLED') return true;
        if (key === 'GRAFANA_PROMETHEUS_URL') return undefined;
        return defaultValue;
      });

    const newService = new RemoteWriteService(configService);
    newService.onModuleInit();

    expect(newService['intervalId']).toBeUndefined();
  });

  it('should start pushing metrics when enabled with valid credentials', async () => {
    mockPushTimeseries.mockResolvedValueOnce({ status: 200, statusText: 'OK' });

    service.onModuleInit();

    expect(service['intervalId']).toBeDefined();

    // Wait for the initial push to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockPushTimeseries).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        url: 'https://prometheus.grafana.net/api/prom/push',
        auth: {
          username: '123456',
          password: 'test-api-key',
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'visapi-remote-write/1.0',
        },
      }),
    );
  });

  it('should handle push errors gracefully', async () => {
    const error = new Error('Network error');
    mockPushTimeseries.mockRejectedValueOnce(error);
    const loggerSpy = jest.spyOn(service['logger'], 'error');

    await service['pushMetrics']();

    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to push metrics to Grafana Cloud',
      error,
    );
  });

  it('should stop pushing on module destroy', () => {
    service.onModuleInit();
    const intervalId = service['intervalId'];
    expect(intervalId).toBeDefined();

    service.onModuleDestroy();
    expect(service['intervalId']).toBe(intervalId); // Same reference, but cleared
  });
});
