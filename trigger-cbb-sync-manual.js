#!/usr/bin/env node

const { Queue } = require('bullmq');

// Redis connection for Railway
const connection = {
  host: 'hopper.proxy.rlwy.net',
  port: 25566,
  password: 'YZXQzxRhQGvqOSgKFUWALCwIGNcaAaRz'
};

async function triggerSync() {
  const orderId = 'TEST_20250821_160313';
  
  console.log(`Triggering CBB sync for order: ${orderId}`);
  
  const cbbSyncQueue = new Queue('cbb-sync', { connection });
  
  const job = await cbbSyncQueue.add(
    'sync-contact',
    { orderId },
    {
      delay: 1000,
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  
  console.log(`CBB sync job queued with ID: ${job.id}`);
  console.log('Job will process in 1 second...');
  
  await cbbSyncQueue.close();
}

triggerSync().catch(console.error);
