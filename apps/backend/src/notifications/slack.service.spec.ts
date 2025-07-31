import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@visapi/core-config';
import { SlackService } from './slack.service';
import { GrafanaWebhookPayload } from '@visapi/shared-types';
import { of, throwError } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';

describe('SlackService', () => {
  let service: SlackService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload: GrafanaWebhookPayload = {
    dashboardId: 1,
    evalMatches: [
      {
        value: 75.5,
        metric: 'cpu_usage',
        tags: { host: 'server-1' },
      },
    ],
    message: 'CPU usage is above threshold',
    orgId: 1,
    panelId: 2,
    ruleId: 3,
    ruleName: 'High CPU Usage',
    ruleUrl: 'https://grafana.example.com/d/dashboard/panel',
    state: 'alerting',
    tags: { severity: 'high' },
    title: 'High CPU Usage Alert',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn().mockReturnValue(of({ data: { ok: true } })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            slackEnabled: true,
            slackWebhookUrl: 'https://hooks.slack.com/services/test/webhook',
            slackDefaultChannel: '#alerts',
            slackSigningSecret: 'test-secret',
          },
        },
        {
          provide: `PinoLogger:${SlackService.name}`,
          useValue: {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SlackService>(SlackService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendGrafanaAlert', () => {
    it('should send Grafana alert successfully', async () => {
      await service.sendGrafanaAlert(mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook',
        expect.objectContaining({
          channel: '#alerts',
          username: 'VisAPI Monitoring',
          icon_emoji: ':chart_with_upwards_trend:',
          text: expect.stringContaining('ALERTING'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: 'danger',
              title: 'High CPU Usage',
              title_link: 'https://grafana.example.com/d/dashboard/panel',
              text: 'CPU usage is above threshold',
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );
    });

    it('should skip alert when Slack is disabled', async () => {
      (configService as any).slackEnabled = false;

      await service.sendGrafanaAlert(mockPayload);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle missing webhook URL', async () => {
      (configService as any).slackWebhookUrl = '';

      await service.sendGrafanaAlert(mockPayload);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.sendGrafanaAlert(mockPayload)).rejects.toThrow(
        'Network error',
      );
    });

    it('should format resolved alert correctly', async () => {
      const resolvedPayload: GrafanaWebhookPayload = {
        ...mockPayload,
        state: 'ok',
        message: 'CPU usage is back to normal',
      };

      await service.sendGrafanaAlert(resolvedPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          text: expect.stringContaining('OK'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: 'good',
              pretext: expect.stringContaining('OK Alert'),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });
  });

  describe('sendCustomAlert', () => {
    it('should send custom alert successfully', async () => {
      await service.sendCustomAlert('Test message', 'warning', '#test');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook',
        expect.objectContaining({
          channel: '#test',
          username: 'VisAPI System',
          icon_emoji: ':robot_face:',
          text: ':warning: Test message',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: 'warning',
              text: 'Test message',
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );
    });

    it('should use default channel when none specified', async () => {
      await service.sendCustomAlert('Test message');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          channel: '#alerts',
        }),
        expect.any(Object),
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.sendCustomAlert('Test message')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('validateWebhookSignature', () => {
    it('should return true for valid signature', async () => {
      const payload = '{"test": "data"}';
      const timestamp = '1234567890';
      const signature =
        'v0=' +
        crypto
          .createHmac('sha256', 'test-secret')
          .update(`v0:${timestamp}:${payload}`)
          .digest('hex');

      const result = await service.validateWebhookSignature(
        payload,
        timestamp,
        signature,
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      const payload = '{"test": "data"}';
      const timestamp = '1234567890';
      const signature = 'v0=invalid_signature';

      const result = await service.validateWebhookSignature(
        payload,
        timestamp,
        signature,
      );

      expect(result).toBe(false);
    });

    it('should return true when no signing secret is configured', async () => {
      (configService as any).slackSigningSecret = '';

      const result = await service.validateWebhookSignature(
        'payload',
        '123',
        'sig',
      );

      expect(result).toBe(true);
    });
  });
});
