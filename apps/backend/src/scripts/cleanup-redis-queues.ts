#!/usr/bin/env node
/**
 * Redis Queue Cleanup Script
 *
 * CRITICAL: This script removes ALL jobs and duplicate queue metadata from Redis.
 * Used to clean up after the queue name mismatch issue that caused duplicate processing.
 *
 * DO NOT run this if you have pending jobs that need to be processed!
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const REDIS_URL = process.env['REDIS_URL'] || process.env['REDIS_PUBLIC_URL'];

if (!REDIS_URL) {
  console.error('❌ Missing REDIS_URL or REDIS_PUBLIC_URL');
  process.exit(1);
}

async function cleanupQueues() {
  console.log('🧹 Starting Redis queue cleanup...\n');

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
  });

  try {
    // Get all keys matching queue patterns
    console.log('📋 Scanning for queue keys...');

    const patterns = [
      'bull:*', // All BullMQ queues
      'WHATSAPP_MESSAGES:*', // Wrong uppercase constant name
      'cgb-sync:*', // Typo in queue name
      'CBB_SYNC:*', // Wrong uppercase constant
    ];

    let allKeys: string[] = [];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        console.log(`Found ${keys.length} keys matching pattern: ${pattern}`);
        allKeys = allKeys.concat(keys);
      }
    }

    // Group keys by queue name for analysis
    const queueGroups = new Map<string, string[]>();

    for (const key of allKeys) {
      const match = key.match(/^(?:bull:)?([^:]+):/);
      if (match) {
        const queueName = match[1];
        if (!queueGroups.has(queueName)) {
          queueGroups.set(queueName, []);
        }
        queueGroups.get(queueName)?.push(key);
      }
    }

    console.log('\n📊 Queue Analysis:');
    console.log('==================');

    for (const [queueName, keys] of queueGroups) {
      console.log(`\n Queue: ${queueName}`);
      console.log(`   Total keys: ${keys.length}`);

      // Check for specific key types
      const metaKeys = keys.filter((k) => k.includes(':meta'));
      const jobKeys = keys.filter((k) => k.match(/:\d+$/));
      const waitKeys = keys.filter((k) => k.includes(':wait'));
      const activeKeys = keys.filter((k) => k.includes(':active'));
      const completedKeys = keys.filter((k) => k.includes(':completed'));
      const failedKeys = keys.filter((k) => k.includes(':failed'));

      if (metaKeys.length) console.log(`   - Meta keys: ${metaKeys.length}`);
      if (jobKeys.length) console.log(`   - Job data: ${jobKeys.length}`);
      if (waitKeys.length) console.log(`   - Waiting: ${waitKeys.length}`);
      if (activeKeys.length) console.log(`   - Active: ${activeKeys.length}`);
      if (completedKeys.length)
        console.log(`   - Completed: ${completedKeys.length}`);
      if (failedKeys.length) console.log(`   - Failed: ${failedKeys.length}`);
    }

    // Identify queues to clean
    const queuesToClean = [
      'WHATSAPP_MESSAGES', // Wrong - should be whatsapp-messages
      'cgb-sync', // Typo - should be cbb-sync
      'CBB_SYNC', // Wrong - should be cbb-sync
    ];

    // Also clean the correct queues to remove old jobs
    const correctQueues = [
      'whatsapp-messages',
      'cbb-sync',
      'critical',
      'default',
      'bulk',
    ];

    console.log('\n🗑️  Cleaning duplicate/wrong queue names...');

    for (const queueName of queuesToClean) {
      const keys = queueGroups.get(queueName) || [];
      if (keys.length > 0) {
        console.log(
          `   Removing ${keys.length} keys for wrong queue: ${queueName}`,
        );
        for (const key of keys) {
          await redis.del(key);
        }
      }
    }

    console.log('\n🧹 Cleaning old jobs from correct queues...');

    for (const queueName of correctQueues) {
      try {
        const queue = new Queue(queueName, {
          connection: { url: REDIS_URL },
        });

        // Get job counts before cleaning
        const counts = await queue.getJobCounts();
        console.log(`\n   Queue: ${queueName}`);
        console.log(
          `   Before: waiting=${counts.waiting}, active=${counts.active}, completed=${counts.completed}, failed=${counts.failed}`,
        );

        // Clean all job states (remove ALL old jobs)
        if (counts.waiting > 0) {
          await queue.clean(0, 0, 'wait');
          console.log(`   ✅ Cleaned ${counts.waiting} waiting jobs`);
        }

        if (counts.active > 0) {
          await queue.clean(0, 0, 'active');
          console.log(`   ✅ Cleaned ${counts.active} active jobs`);
        }

        if (counts.completed > 0) {
          await queue.clean(0, 0, 'completed');
          console.log(`   ✅ Cleaned ${counts.completed} completed jobs`);
        }

        if (counts.failed > 0) {
          await queue.clean(0, 0, 'failed');
          console.log(`   ✅ Cleaned ${counts.failed} failed jobs`);
        }

        if (counts.delayed > 0) {
          await queue.clean(0, 0, 'delayed');
          console.log(`   ✅ Cleaned ${counts.delayed} delayed jobs`);
        }

        // Drain any remaining jobs
        await queue.drain();

        // Resume queue if paused
        const isPaused = await queue.isPaused();
        if (isPaused) {
          await queue.resume();
          console.log(`   ✅ Resumed paused queue`);
        }

        await queue.close();
      } catch (error) {
        console.error(`   ❌ Error cleaning queue ${queueName}:`, error);
      }
    }

    console.log('\n✨ Cleanup complete!');

    // Final verification
    console.log('\n📊 Final Verification:');
    console.log('======================');

    for (const queueName of correctQueues) {
      try {
        const queue = new Queue(queueName, {
          connection: { url: REDIS_URL },
        });

        const counts = await queue.getJobCounts();
        const isPaused = await queue.isPaused();

        console.log(`${queueName}:`);
        console.log(`  Status: ${isPaused ? '⏸️ PAUSED' : '✅ ACTIVE'}`);
        console.log(
          `  Jobs: waiting=${counts.waiting}, active=${counts.active}, failed=${counts.failed}`,
        );

        await queue.close();
      } catch (error) {
        console.error(`  Error checking ${queueName}:`, error);
      }
    }

    await redis.quit();
    console.log('\n🎉 All duplicate queues removed and old jobs cleared!');
    console.log(
      '⚠️  IMPORTANT: Only NEW orders will be processed going forward.',
    );
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await redis.quit();
    process.exit(1);
  }
}

// Run cleanup
cleanupQueues()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
