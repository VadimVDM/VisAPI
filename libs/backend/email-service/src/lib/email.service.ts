import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateMagicLinkEmail } from './magic-link-template';
import { generateWelcomeEmail } from './welcome-template';
import { generatePasswordResetEmail } from './password-reset-template';
import { generateEmailVerificationEmail } from './email-verification-template';
import type { EmailData, SupabaseEmailHookData, EmailSendResult } from './email.types';
import { sendEmailWithResend, validateEmailData } from './resend-integration';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly supabaseUrl: string;
  private readonly resendApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.fromEmail = this.config.get<string>('resend.fromEmail') || 'VisAPI <noreply@visanet.app>';
    this.supabaseUrl = this.config.get<string>('supabase.url') || '';
    this.resendApiKey = this.config.get<string>('resend.apiKey') || '';
    
    if (!this.resendApiKey) {
      throw new Error('RESEND_API_KEY is required for email service');
    }
    
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL is required for email service');
    }
  }

  /**
   * Process Supabase auth hook and send appropriate email
   */
  async processAuthHook(hookData: SupabaseEmailHookData): Promise<EmailSendResult> {
    try {
      const { user, email_data } = hookData;
      let emailContent: { subject: string; html: string; text: string };

      // Generate appropriate email based on action type
      switch (email_data.email_action_type) {
        case 'magic_link':
          emailContent = generateMagicLinkEmail({
            supabase_url: this.supabaseUrl,
            email_action_type: email_data.email_action_type,
            redirect_to: email_data.redirect_to,
            token_hash: email_data.token_hash,
            token: email_data.token,
            user_email: user.email,
          });
          break;

        case 'signup':
          emailContent = generateEmailVerificationEmail({
            supabase_url: this.supabaseUrl,
            email_action_type: email_data.email_action_type,
            redirect_to: email_data.redirect_to,
            token_hash: email_data.token_hash,
            token: email_data.token,
            user_email: user.email,
          });
          break;

        case 'recovery':
          emailContent = generatePasswordResetEmail({
            supabase_url: this.supabaseUrl,
            email_action_type: email_data.email_action_type,
            redirect_to: email_data.redirect_to,
            token_hash: email_data.token_hash,
            token: email_data.token,
            user_email: user.email,
          });
          break;

        case 'invite':
          // Use magic link template for invites
          emailContent = generateMagicLinkEmail({
            supabase_url: this.supabaseUrl,
            email_action_type: email_data.email_action_type,
            redirect_to: email_data.redirect_to,
            token_hash: email_data.token_hash,
            token: email_data.token,
            user_email: user.email,
          });
          // Customize subject for invites
          emailContent.subject = 'You\'ve been invited to VisAPI';
          break;

        case 'email_change':
          // Use email verification template for email changes
          emailContent = generateEmailVerificationEmail({
            supabase_url: this.supabaseUrl,
            email_action_type: email_data.email_action_type,
            redirect_to: email_data.redirect_to,
            token_hash: email_data.token_hash,
            token: email_data.token,
            user_email: user.email,
          });
          emailContent.subject = 'Confirm Your Email Change - VisAPI';
          break;

        default:
          throw new Error(`Unsupported email action type: ${String(email_data.email_action_type)}`);
      }

      // Send email using our method
      const result = await this.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        from: this.fromEmail,
      });

      this.logger.log(`Auth email sent successfully to ${user.email} for action: ${email_data.email_action_type}`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process auth hook: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<EmailSendResult> {
    try {
      const emailContent = generateWelcomeEmail({
        user_email: userEmail,
        user_name: userName,
      });

      const result = await this.sendEmail({
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        from: this.fromEmail,
      });

      this.logger.log(`Welcome email sent successfully to ${userEmail}`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send welcome email to ${userEmail}: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send generic email using Resend
   */
  async sendEmail(emailData: EmailData): Promise<EmailSendResult> {
    try {
      this.logger.debug(`Preparing to send email to ${emailData.to} with subject: ${emailData.subject}`);
      
      // Validate email data
      const validation = validateEmailData(emailData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Set default from email if not provided
      const emailToSend = {
        ...emailData,
        from: emailData.from || this.fromEmail,
      };

      // Send via Resend integration
      const result = await sendEmailWithResend(emailToSend, this.resendApiKey);
      
      if (result.success) {
        this.logger.log(`Email sent successfully to ${emailData.to}, MessageID: ${result.messageId}`);
      } else {
        this.logger.error(`Email send failed to ${emailData.to}: ${result.error}`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Email send failed: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(toEmail: string): Promise<EmailSendResult> {
    return this.sendEmail({
      to: toEmail,
      subject: 'VisAPI Email Service Test',
      html: `
        <h2>VisAPI Email Service Test</h2>
        <p>This is a test email to verify that the Resend integration is working correctly.</p>
        <p><strong>Test sent at:</strong> ${new Date().toISOString()}</p>
        <p>If you received this email, the integration is working! 🎉</p>
      `,
      text: `
VisAPI Email Service Test

This is a test email to verify that the Resend integration is working correctly.

Test sent at: ${new Date().toISOString()}

If you received this email, the integration is working! 🎉
      `,
    });
  }
}