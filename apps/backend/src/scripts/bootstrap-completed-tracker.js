#!/usr/bin/env node

/**
 * Bootstrap script for Airtable completed tracker
 * Loads all existing completed records into Redis
 *
 * Usage: node bootstrap-completed-tracker.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

async function bootstrap() {
  const apiKey = process.env.ADMIN_API_KEY;
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api';

  if (!apiKey) {
    console.error('❌ ADMIN_API_KEY environment variable is required');
    console.log('Run: pnpm create-admin-key');
    process.exit(1);
  }

  console.log('🚀 Starting Airtable completed tracker bootstrap...');
  console.log(`📍 API URL: ${apiUrl}`);

  try {
    const response = await fetch(`${apiUrl}/v1/airtable/completed/bootstrap`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Bootstrap successful!`);
      console.log(`📊 ${result.recordCount} records loaded into tracker`);
    } else {
      console.log('⚠️  Bootstrap skipped - already initialized');
      console.log('To re-bootstrap, first reset the tracker via API');
    }
  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    process.exit(1);
  }
}

// Run bootstrap
bootstrap().catch(console.error);
