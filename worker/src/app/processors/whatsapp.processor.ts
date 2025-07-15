import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface WhatsAppJobData {
  to: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
}

@Injectable()
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  async process(job: Job<WhatsAppJobData>) {
    const { to, message, template, variables } = job.data;

    this.logger.log(`Processing WhatsApp message to: ${to}`);

    try {
      // For now, simulate Twilio WhatsApp API call
      // In Sprint 3, we'll implement the actual Twilio SDK
      await this.simulateWhatsAppSend(to, message, template, variables);

      return {
        success: true,
        to,
        messageId: `wa_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message:`, error);
      throw error;
    }
  }

  private async simulateWhatsAppSend(
    to: string,
    message: string,
    template?: string,
    variables?: Record<string, any>
  ) {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 200 + Math.random() * 800)
    );

    this.logger.log(`[SIMULATED] WhatsApp message sent to ${to}: ${message}`);

    if (template) {
      this.logger.log(
        `[SIMULATED] Using template: ${template} with variables:`,
        variables
      );
    }

    // Simulate occasional failures (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('Simulated WhatsApp API error');
    }
  }
}
