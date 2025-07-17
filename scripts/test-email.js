#!/usr/bin/env node

/**
 * Test script to verify email service is working
 */

const { NestFactory } = require('@nestjs/core');
const { EmailModule } = require('../dist/apps/backend/src/email/email.module.js');
const { EmailService } = require('../dist/libs/backend/email-service/index.js');

async function testEmail() {
  try {
    console.log('Starting email service test...');
    
    // Create a standalone application with the email module
    const app = await NestFactory.createApplicationContext(EmailModule);
    const emailService = app.get(EmailService);
    
    console.log('Email service initialized successfully');
    
    // Test the service configuration
    console.log('Testing email service configuration...');
    
    // Send a test email
    const result = await emailService.sendTestEmail('test@example.com');
    
    console.log('Test email result:', JSON.stringify(result, null, 2));
    
    await app.close();
    
  } catch (error) {
    console.error('Email service test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEmail();