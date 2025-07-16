import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SlackService } from './slack.service';
import { GrafanaWebhookPayload } from '@visapi/shared-types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('api/v1/notifications/slack')
export class SlackController {
  constructor(
    @InjectPinoLogger(SlackController.name)
    private readonly logger: PinoLogger,
    private readonly slackService: SlackService
  ) {}

  @Post('grafana-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Grafana webhook alerts',
    description:
      'Endpoint to receive and process Grafana webhook alerts, formatting them for Slack delivery',
  })
  @ApiHeader({
    name: 'X-Slack-Signature',
    description: 'Slack webhook signature for verification',
    required: false,
  })
  @ApiHeader({
    name: 'X-Slack-Request-Timestamp',
    description: 'Request timestamp for signature verification',
    required: false,
  })
  @ApiBody({
    description: 'Grafana webhook payload',
    type: Object,
    examples: {
      alerting: {
        summary: 'Alerting state',
        value: {
          dashboardId: 1,
          evalMatches: [
            {
              value: 75.5,
              metric: 'cpu_usage',
              tags: {
                host: 'server-1',
                env: 'production',
              },
            },
          ],
          message: 'CPU usage is above threshold',
          orgId: 1,
          panelId: 2,
          ruleId: 3,
          ruleName: 'High CPU Usage',
          ruleUrl: 'https://grafana.example.com/d/dashboard/panel',
          state: 'alerting',
          tags: {
            severity: 'high',
            team: 'platform',
          },
          title: 'High CPU Usage Alert',
          imageUrl: 'https://grafana.example.com/render/panel.png',
        },
      },
      resolved: {
        summary: 'Resolved state',
        value: {
          dashboardId: 1,
          evalMatches: [],
          message: 'CPU usage is back to normal',
          orgId: 1,
          panelId: 2,
          ruleId: 3,
          ruleName: 'High CPU Usage',
          ruleUrl: 'https://grafana.example.com/d/dashboard/panel',
          state: 'ok',
          tags: {
            severity: 'high',
            team: 'platform',
          },
          title: 'High CPU Usage Alert',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
        },
        message: {
          type: 'string',
          example: 'Alert processed and sent to Slack',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid webhook signature',
  })
  async handleGrafanaWebhook(
    @Body() payload: GrafanaWebhookPayload,
    @Headers('x-slack-signature') signature?: string,
    @Headers('x-slack-request-timestamp') timestamp?: string
  ) {
    try {
      // Validate required fields
      if (!payload.state || !payload.ruleName) {
        throw new BadRequestException(
          'Missing required fields: state, ruleName'
        );
      }

      // Validate webhook signature if present
      if (signature && timestamp) {
        const isValid = await this.slackService.validateWebhookSignature(
          JSON.stringify(payload),
          timestamp,
          signature
        );

        if (!isValid) {
          throw new UnauthorizedException('Invalid webhook signature');
        }
      }

      this.logger.info('Received Grafana webhook', {
        ruleName: payload.ruleName,
        state: payload.state,
        dashboardId: payload.dashboardId,
        panelId: payload.panelId,
      });

      // Process the alert and send to Slack
      await this.slackService.sendGrafanaAlert(payload);

      return {
        status: 'success',
        message: 'Alert processed and sent to Slack',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to process Grafana webhook', {
        error: error.message,
        ruleName: payload?.ruleName,
        state: payload?.state,
      });

      // Re-throw HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log internal errors but return success to avoid Grafana retries
      return {
        status: 'error',
        message: 'Failed to process alert',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('custom-alert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send custom alert to Slack',
    description: 'Send a custom alert message to Slack with specified severity',
  })
  @ApiBody({
    description: 'Custom alert payload',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Alert message',
          example: 'System maintenance completed successfully',
        },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'error'],
          description: 'Alert severity level',
          example: 'info',
        },
        channel: {
          type: 'string',
          description: 'Slack channel (optional)',
          example: '#alerts',
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Custom alert sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  async sendCustomAlert(
    @Body()
    body: {
      message: string;
      severity?: 'info' | 'warning' | 'error';
      channel?: string;
    }
  ) {
    try {
      if (!body.message) {
        throw new BadRequestException('Message is required');
      }

      this.logger.info('Sending custom Slack alert', {
        message: body.message,
        severity: body.severity || 'info',
        channel: body.channel,
      });

      await this.slackService.sendCustomAlert(
        body.message,
        body.severity || 'info',
        body.channel
      );

      return {
        status: 'success',
        message: 'Custom alert sent to Slack',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to send custom Slack alert', {
        error: error.message,
        message: body?.message,
        severity: body?.severity,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        status: 'error',
        message: 'Failed to send custom alert',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test Slack integration',
    description: 'Send a test message to verify Slack integration is working',
  })
  @ApiResponse({
    status: 200,
    description: 'Test message sent successfully',
  })
  async testSlackIntegration() {
    try {
      const testMessage =
        'This is a test message from VisAPI Slack integration';

      this.logger.info('Sending Slack integration test message');

      await this.slackService.sendCustomAlert(testMessage, 'info');

      return {
        status: 'success',
        message: 'Test message sent to Slack',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to send test Slack message', {
        error: error.message,
      });

      return {
        status: 'error',
        message: 'Failed to send test message',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
