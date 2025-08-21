#!/usr/bin/env tsx
/**
 * Trigger CBB Contact Sync via Queue for a specific order
 * This uses the actual backend queue system
 * Usage: npx tsx scripts/trigger-cbb-sync.ts [order-id]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Load environment variables
config({ path: resolve(__dirname, '../.env.backend') });

const ORDER_ID = process.argv[2] || 'IL250821IN1';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function triggerCBBSync() {
  console.log('🚀 Triggering CBB Contact Sync via Queue');
  console.log(`📌 Order ID: ${ORDER_ID}`);
  console.log(`📡 Redis URL: ${REDIS_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log('━'.repeat(50));

  try {
    // Create Redis connection
    const connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    // Create queue instance
    const cbbSyncQueue = new Queue('cbb-sync', {
      connection,
    });

    // Add job to queue
    const job = await cbbSyncQueue.add(
      'sync-contact',
      { orderId: ORDER_ID },
      {
        delay: 1000, // 1 second delay
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    console.log(`✅ CBB sync job queued successfully!`);
    console.log(`  • Job ID: ${job.id}`);
    console.log(`  • Job Name: ${job.name}`);
    console.log(`  • Queue: cbb-sync`);
    console.log(`  • Order ID: ${ORDER_ID}`);
    console.log('━'.repeat(50));

    // Wait a moment for job to be picked up
    console.log('⏳ Waiting for job to be processed...');
    
    // Check job status after a delay
    setTimeout(async () => {
      const jobStatus = await job.getState();
      
      console.log(`\n📊 Job Status: ${jobStatus}`);

      if (jobStatus === 'completed') {
        const result = await job.returnvalue;
        console.log('\n🎉 Job completed successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
      } else if (jobStatus === 'failed') {
        const failedReason = await job.failedReason;
        console.log('\n❌ Job failed!');
        console.log('Reason:', failedReason);
      }

      // Close connections
      await cbbSyncQueue.close();
      await connection.quit();
      process.exit(0);
    }, 10000); // Wait 10 seconds

  } catch (error: any) {
    console.error(`\n❌ Failed to queue CBB sync:`, error.message);
    process.exit(1);
  }
}

// Run the trigger
triggerCBBSync().catch(console.error);