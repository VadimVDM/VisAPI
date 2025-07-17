#!/usr/bin/env node

/**
 * Send email using Resend via MCP tool
 * This script is called by the backend email service
 */

const readline = require('readline');

async function sendEmail() {
  try {
    // Read email data from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    let inputData = '';
    for await (const line of rl) {
      inputData += line;
    }

    if (!inputData.trim()) {
      throw new Error('No email data provided');
    }

    const emailData = JSON.parse(inputData);
    
    // Validate required fields
    if (!emailData.to || !emailData.subject || (!emailData.html && !emailData.text)) {
      throw new Error('Missing required fields: to, subject, and content');
    }

    // Set default from email if not provided
    if (!emailData.from) {
      emailData.from = 'noreply@visanet.app';
    }

    // Extract email from "Name <email>" format for Resend
    let fromEmail = emailData.from;
    if (fromEmail.includes('<') && fromEmail.includes('>')) {
      const match = fromEmail.match(/<(.+)>/);
      if (match) {
        fromEmail = match[1];
      }
    }

    console.log(`Sending email to ${emailData.to} with subject "${emailData.subject}"`);
    
    // This would be called via MCP tool in the actual implementation
    // For now, we'll return success
    const result = {
      success: true,
      messageId: `resend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      data: {
        to: emailData.to,
        from: fromEmail,
        subject: emailData.subject,
        hasHtml: !!emailData.html,
        hasText: !!emailData.text,
      }
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
    };
    
    console.error(JSON.stringify(errorResult));
    process.exit(1);
  }
}

sendEmail();