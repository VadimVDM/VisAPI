import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface SlackJobData {
  channel: string;
  message: string;
  template?: string;
  variables?: Record<string, JsonValue>;
}

@Injectable()
export class SlackProcessor {
  private readonly logger = new Logger(SlackProcessor.name);

  async process(job: Job<SlackJobData>) {
    const { channel, message, template, variables } = job.data;

    this.logger.log(`Processing Slack message to channel: ${channel}`);

    try {
      // For now, simulate Slack API call
      // In Sprint 2, we'll implement the actual Slack SDK
      await this.simulateSlackSend(channel, message, template, variables);

      return {
        success: true,
        channel,
        messageId: `sim_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send Slack message:`, error);
      throw error;
    }
  }

  private async simulateSlackSend(
    channel: string,
    message: string,
    template?: string,
    variables?: Record<string, JsonValue>,
  ) {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + Math.random() * 400),
    );

    this.logger.log(`[SIMULATED] Slack message sent to ${channel}: ${message}`);

    if (template) {
      this.logger.log(
        `[SIMULATED] Using template: ${template} with variables:`,
        variables,
      );
    }

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Simulated Slack API error');
    }
  }
}
