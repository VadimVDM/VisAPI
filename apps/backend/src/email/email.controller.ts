import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
  Logger,
  Get,
  Query,
} from '@nestjs/common';
import { EmailService } from '@visapi/email-service';
import type { SupabaseEmailHookData } from '@visapi/email-service';

interface WebhookHeaders {
  'webhook-id'?: string;
  'webhook-timestamp'?: string;
  'webhook-signature'?: string;
}

@Controller('v1/email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Handle Supabase auth email hooks
   * This endpoint replaces Supabase's default email sending
   */
  @Post('auth-hook')
  async handleAuthHook(
    @Body() payload: SupabaseEmailHookData,
    @Headers() headers: WebhookHeaders,
  ) {
    try {
      this.logger.log(`Received auth hook for user: ${payload.user?.email}, action: ${payload.email_data?.email_action_type}`);
      
      // Validate payload
      if (!payload.user?.email || !payload.email_data) {
        throw new HttpException(
          'Invalid webhook payload: missing user email or email_data',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Log webhook headers for debugging
      this.logger.debug('Webhook headers:', {
        id: headers['webhook-id'],
        timestamp: headers['webhook-timestamp'],
        signature: headers['webhook-signature'] ? '[REDACTED]' : 'missing',
      });

      // Process the auth hook
      const result = await this.emailService.processAuthHook(payload);

      if (!result.success) {
        throw new HttpException(
          `Failed to send email: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
      };

    } catch (error) {
      this.logger.error(`Auth hook processing failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error processing auth hook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send welcome email endpoint
   */
  @Post('welcome')
  async sendWelcomeEmail(
    @Body() body: { email: string; name?: string },
  ) {
    try {
      if (!body.email) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.emailService.sendWelcomeEmail(body.email, body.name);

      if (!result.success) {
        throw new HttpException(
          `Failed to send welcome email: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: 'Welcome email sent successfully',
        messageId: result.messageId,
      };

    } catch (error) {
      this.logger.error(`Welcome email failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error sending welcome email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test email endpoint for verification
   */
  @Get('test')
  async sendTestEmail(@Query('to') toEmail: string) {
    try {
      if (!toEmail) {
        throw new HttpException('Email parameter "to" is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.emailService.sendTestEmail(toEmail);

      if (!result.success) {
        throw new HttpException(
          `Failed to send test email: ${result.error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      };

    } catch (error) {
      this.logger.error(`Test email failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error sending test email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check for email service
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'email',
      timestamp: new Date().toISOString(),
      integration: 'resend',
    };
  }
}