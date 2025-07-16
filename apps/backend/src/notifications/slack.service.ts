import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@visapi/core-config';
import {
  GrafanaWebhookPayload,
  SlackMessage,
  SlackAttachment,
  SlackField,
} from '@visapi/shared-types';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SlackService {
  constructor(
    @InjectPinoLogger(SlackService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {}

  async sendGrafanaAlert(payload: GrafanaWebhookPayload): Promise<void> {
    if (!this.configService.slackEnabled) {
      this.logger.debug('Slack integration disabled, skipping alert');
      return;
    }

    const webhookUrl = this.configService.slackWebhookUrl;
    if (!webhookUrl) {
      this.logger.error('Slack webhook URL not configured');
      return;
    }

    try {
      const slackMessage = this.formatGrafanaAlert(payload);

      this.logger.debug('Sending Slack alert', {
        ruleName: payload.ruleName,
        state: payload.state,
        channel: slackMessage.channel,
      });

      await firstValueFrom(
        this.httpService.post(webhookUrl, slackMessage, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
      );

      this.logger.info('Slack alert sent successfully', {
        ruleName: payload.ruleName,
        state: payload.state,
      });
    } catch (error) {
      this.logger.error('Failed to send Slack alert', {
        error: error.message,
        ruleName: payload.ruleName,
        state: payload.state,
      });
      throw error;
    }
  }

  private formatGrafanaAlert(payload: GrafanaWebhookPayload): SlackMessage {
    const severity = this.getAlertSeverity(payload.state);
    const color = this.getAlertColor(payload.state);
    const emoji = this.getAlertEmoji(payload.state);

    const fields: SlackField[] = [
      {
        title: 'Status',
        value: `${emoji} ${payload.state.toUpperCase()}`,
        short: true,
      },
      {
        title: 'Rule',
        value: payload.ruleName,
        short: true,
      },
    ];

    if (payload.dashboardId) {
      fields.push({
        title: 'Dashboard ID',
        value: payload.dashboardId.toString(),
        short: true,
      });
    }

    if (payload.panelId) {
      fields.push({
        title: 'Panel ID',
        value: payload.panelId.toString(),
        short: true,
      });
    }

    // Add evaluation matches if available
    if (payload.evalMatches && payload.evalMatches.length > 0) {
      const metrics = payload.evalMatches
        .map((match) => `${match.metric}: ${match.value}`)
        .join('\n');

      fields.push({
        title: 'Metrics',
        value: metrics,
        short: false,
      });
    }

    // Add tags if available
    if (payload.tags && Object.keys(payload.tags).length > 0) {
      const tags = Object.entries(payload.tags)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      fields.push({
        title: 'Tags',
        value: tags,
        short: false,
      });
    }

    const attachment: SlackAttachment = {
      color,
      pretext: `${severity} Alert: ${payload.title}`,
      title: payload.ruleName,
      title_link: payload.ruleUrl,
      text: payload.message,
      fields,
      footer: 'VisAPI Monitoring',
      footer_icon:
        'https://grafana.com/static/img/about/grafana_logo_swirl-events.svg',
      ts: Math.floor(Date.now() / 1000),
      mrkdwn_in: ['text', 'pretext'],
    };

    // Add image if available
    if (payload.imageUrl) {
      attachment.image_url = payload.imageUrl;
    }

    const message: SlackMessage = {
      channel: this.configService.slackDefaultChannel,
      username: 'VisAPI Monitoring',
      icon_emoji: ':chart_with_upwards_trend:',
      text: this.buildAlertText(payload),
      attachments: [attachment],
    };

    return message;
  }

  private buildAlertText(payload: GrafanaWebhookPayload): string {
    const emoji = this.getAlertEmoji(payload.state);

    let text = `${emoji} *${payload.state.toUpperCase()}*: ${payload.title}`;

    if (payload.state === 'alerting') {
      text += '\n:warning: *Action may be required*';
    } else if (payload.state === 'ok') {
      text += '\n:white_check_mark: *Issue resolved*';
    }

    return text;
  }

  private getAlertSeverity(state: string): string {
    switch (state) {
      case 'alerting':
        return 'CRITICAL';
      case 'no_data':
        return 'WARNING';
      case 'paused':
        return 'INFO';
      case 'pending':
        return 'INFO';
      case 'ok':
        return 'OK';
      default:
        return 'UNKNOWN';
    }
  }

  private getAlertColor(state: string): string {
    switch (state) {
      case 'alerting':
        return 'danger';
      case 'no_data':
        return 'warning';
      case 'paused':
        return '#808080'; // Gray
      case 'pending':
        return '#FFA500'; // Orange
      case 'ok':
        return 'good';
      default:
        return '#808080'; // Gray
    }
  }

  private getAlertEmoji(state: string): string {
    switch (state) {
      case 'alerting':
        return ':red_circle:';
      case 'no_data':
        return ':yellow_circle:';
      case 'paused':
        return ':pause_button:';
      case 'pending':
        return ':clock1:';
      case 'ok':
        return ':green_circle:';
      default:
        return ':grey_question:';
    }
  }

  async sendCustomAlert(
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    channel?: string
  ): Promise<void> {
    if (!this.configService.slackEnabled) {
      this.logger.debug('Slack integration disabled, skipping custom alert');
      return;
    }

    const webhookUrl = this.configService.slackWebhookUrl;
    if (!webhookUrl) {
      this.logger.error('Slack webhook URL not configured');
      return;
    }

    const color =
      severity === 'error'
        ? 'danger'
        : severity === 'warning'
        ? 'warning'
        : 'good';
    const emoji =
      severity === 'error'
        ? ':red_circle:'
        : severity === 'warning'
        ? ':warning:'
        : ':information_source:';

    const slackMessage: SlackMessage = {
      channel: channel || this.configService.slackDefaultChannel,
      username: 'VisAPI System',
      icon_emoji: ':robot_face:',
      text: `${emoji} ${message}`,
      attachments: [
        {
          color,
          text: message,
          footer: 'VisAPI System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, slackMessage, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
      );

      this.logger.info('Custom Slack alert sent successfully', {
        severity,
        channel: channel || this.configService.slackDefaultChannel,
      });
    } catch (error) {
      this.logger.error('Failed to send custom Slack alert', {
        error: error.message,
        severity,
        message,
      });
      throw error;
    }
  }

  async validateWebhookSignature(
    payload: string,
    timestamp: string,
    signature: string
  ): Promise<boolean> {
    const signingSecret = this.configService.slackSigningSecret;
    if (!signingSecret) {
      this.logger.warn(
        'Slack signing secret not configured, skipping signature validation'
      );
      return true; // Allow if no secret configured
    }

    try {
      const crypto = require('crypto');
      const basestring = `v0:${timestamp}:${payload}`;
      const mySignature =
        'v0=' +
        crypto
          .createHmac('sha256', signingSecret)
          .update(basestring)
          .digest('hex');

      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(mySignature, 'utf8')
      );
    } catch (error) {
      this.logger.error('Failed to validate webhook signature', {
        error: error.message,
      });
      return false;
    }
  }
}
