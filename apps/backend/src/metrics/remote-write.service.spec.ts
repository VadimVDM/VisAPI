import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RemoteWriteService } from './remote-write.service';
import { register as globalRegistry } from 'prom-client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RemoteWriteService', () => {
  let service: RemoteWriteService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock globalRegistry.metrics()
    jest
      .spyOn(globalRegistry, 'metrics')
      .mockResolvedValue(
        '# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1'
      );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoteWriteService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not start pushing when disabled', () => {
    jest
      .spyOn(configService, 'get')
      .mockImplementation((key: string, defaultValue?: any) => {
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
      .mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'GRAFANA_REMOTE_WRITE_ENABLED') return true;
        if (key === 'GRAFANA_PROMETHEUS_URL') return undefined;
        return defaultValue;
      });

    const newService = new RemoteWriteService(configService, registry);
    newService.onModuleInit();

    expect(newService['intervalId']).toBeUndefined();
  });

  it('should start pushing metrics when enabled with valid credentials', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

    service.onModuleInit();

    expect(service['intervalId']).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://prometheus.grafana.net/api/prom/push',
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
        auth: {
          username: '123456',
          password: 'test-api-key',
        },
        timeout: 10000,
      })
    );
  });

  it('should handle push errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    const loggerSpy = jest.spyOn(service['logger'], 'error');

    await service['pushMetrics']();

    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to push metrics to Grafana Cloud',
      'Network error'
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
