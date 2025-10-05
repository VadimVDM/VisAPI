#!/usr/bin/env node

const Redis = require('ioredis');
const { spawn } = require('child_process');
const { join } = require('path');

async function main() {
  // Redis connection
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(REDIS_URL);

  console.log('Connected to Redis...');

  // Fetch all records from Airtable
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;

  if (!apiKey || !baseId || !tableId) {
    throw new Error(
      'Missing required environment variables: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID',
    );
  }

  const scriptPath =
    process.env.NODE_ENV === 'production'
      ? join(
          process.cwd(),
          'airtable',
          'scripts',
          'airtable_completed_tracker.py',
        )
      : join(
          __dirname,
          '..',
          'airtable',
          'scripts',
          'airtable_completed_tracker.py',
        );

  console.log('Fetching records from Airtable...');

  const result = await new Promise((resolve, reject) => {
    const child = spawn('python3', [scriptPath], {
      env: {
        ...process.env,
        AIRTABLE_API_KEY: apiKey,
        AIRTABLE_BASE_ID: baseId,
        AIRTABLE_TABLE_ID: tableId,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const response = JSON.parse(stdout);
        resolve(response);
      } catch (err) {
        reject(new Error(`Failed to parse response: ${err.message}`));
      }
    });

    // Send the bootstrap payload
    const payload = JSON.stringify({
      mode: 'bootstrap',
      view_id: 'viwgYjpU6K6nXq8ii',
    });

    child.stdin.write(payload);
    child.stdin.end();
  });

  if (result.status !== 'ok') {
    throw new Error(`Script failed: ${result.error}`);
  }

  const records = result.matches || [];
  console.log(`Fetched ${records.length} records from Airtable`);

  // Extract record IDs
  const recordIds = records.map((record) => record.id);

  // Store in Redis
  const PROCESSED_IDS_KEY = 'airtable:completed:processed_ids';
  const LAST_CHECK_KEY = 'airtable:completed:last_check';
  const BOOTSTRAP_KEY = 'airtable:completed:bootstrap';
  const STATS_KEY = 'airtable:completed:stats';

  console.log('Storing record IDs in Redis...');

  // Add all IDs to the set
  if (recordIds.length > 0) {
    await redis.sadd(PROCESSED_IDS_KEY, ...recordIds);
  }

  // Set timestamps and stats
  const now = new Date().toISOString();
  await redis.set(LAST_CHECK_KEY, now);
  await redis.set(BOOTSTRAP_KEY, now);

  await redis.hmset(STATS_KEY, {
    bootstrap_date: now,
    total_processed: recordIds.length.toString(),
    last_successful_check: now,
  });

  console.log(`Successfully bootstrapped ${recordIds.length} records to Redis`);

  // Verify the data
  const count = await redis.scard(PROCESSED_IDS_KEY);
  console.log(`Verified: Redis set contains ${count} record IDs`);

  await redis.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
