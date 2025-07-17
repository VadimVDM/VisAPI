import { Resend } from 'resend';
import type { EmailData, EmailSendResult } from './email.types';

/**
 * Send email using Resend Node.js SDK
 */
export async function sendEmailWithResend(emailData: EmailData, apiKey: string): Promise<EmailSendResult> {
  try {
    // Initialize Resend client
    const resend = new Resend(apiKey);

    // Extract email from "Name <email>" format for Resend
    let fromEmail = emailData.from || 'noreply@visanet.app';
    
    // Resend supports "Name <email>" format directly
    // But we should ensure the email domain is verified in Resend

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to], // Resend expects an array
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    return {
      success: true,
      messageId: data?.id || `resend-${Date.now()}`,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate email data before sending
 */
export function validateEmailData(emailData: EmailData): { valid: boolean; error?: string } {
  if (!emailData.to) {
    return { valid: false, error: 'Recipient email is required' };
  }

  if (!emailData.subject) {
    return { valid: false, error: 'Email subject is required' };
  }

  if (!emailData.html && !emailData.text) {
    return { valid: false, error: 'Either HTML or text content is required' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailData.to)) {
    return { valid: false, error: `Invalid recipient email: ${emailData.to}` };
  }

  if (emailData.from && !emailRegex.test(emailData.from.replace(/.*<(.+)>.*/, '$1'))) {
    // Extract email from "Name <email>" format
    const fromEmail = emailData.from.match(/<(.+)>/)?.[1] || emailData.from;
    if (!emailRegex.test(fromEmail)) {
      return { valid: false, error: `Invalid sender email: ${emailData.from}` };
    }
  }

  return { valid: true };
}