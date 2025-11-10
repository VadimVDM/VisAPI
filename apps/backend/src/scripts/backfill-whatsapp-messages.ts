#!/usr/bin/env node
/**
 * Backfill script for WhatsApp message tracking
 *
 * This script fixes historical messages that were stuck in "sent" status
 * due to CBB correlation issues. It matches webhook events with messages
 * by phone number and timestamp, then updates message IDs and statuses.
 *
 * Usage:
 *   pnpm ts-node apps/backend/src/scripts/backfill-whatsapp-messages.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --days N     Process messages from the last N days (default: 60)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

interface WebhookEvent {
  id: string;
  created_at: string;
  payload: any;
}

interface WhatsAppMessage {
  id: string;
  message_id: string;
  phone_number: string;
  created_at: string;
  status: string;
}

interface BackfillStats {
  totalWebhookEvents: number;
  totalMessagesProcessed: number;
  messagesCorrelated: number;
  messagesUpdated: number;
  messagesFailed: number;
  stuckMessagesFound: number;
  stuckMessagesMarkedFailed: number;
  errors: Array<{ messageId: string; error: string }>;
}

const stats: BackfillStats = {
  totalWebhookEvents: 0,
  totalMessagesProcessed: 0,
  messagesCorrelated: 0,
  messagesUpdated: 0,
  messagesFailed: 0,
  stuckMessagesFound: 0,
  stuckMessagesMarkedFailed: 0,
  errors: [],
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const daysIndex = args.indexOf('--days');
  const days = daysIndex >= 0 ? parseInt(args[daysIndex + 1]) || 60 : 60;

  console.log('🚀 WhatsApp Message Backfill Script');
  console.log(`📅 Processing messages from the last ${days} days`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Fetch webhook events with status updates
  console.log('📥 Fetching webhook events...');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: webhookEvents, error: webhookError } = await supabase
    .from('whatsapp_webhook_events')
    .select('id, created_at, payload')
    .eq('event_type', 'messages')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true });

  if (webhookError) {
    console.error('❌ Error fetching webhook events:', webhookError);
    process.exit(1);
  }

  stats.totalWebhookEvents = webhookEvents?.length || 0;
  console.log(`✅ Found ${stats.totalWebhookEvents} webhook events\n`);

  // Step 2: Process each webhook event
  console.log('🔄 Processing webhook events...\n');

  for (const event of webhookEvents || []) {
    await processWebhookEvent(event, supabase, dryRun);
  }

  // Step 3: Mark old stuck messages as FAILED
  console.log('\n🧹 Cleaning up stuck messages...\n');
  await markStuckMessagesAsFailed(supabase, dryRun);

  // Step 4: Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Backfill Summary');
  console.log('='.repeat(60));
  console.log(`Total webhook events:       ${stats.totalWebhookEvents}`);
  console.log(`Messages processed:         ${stats.totalMessagesProcessed}`);
  console.log(`Messages correlated:        ${stats.messagesCorrelated}`);
  console.log(`Messages updated:           ${stats.messagesUpdated}`);
  console.log(`Messages failed:            ${stats.messagesFailed}`);
  console.log(`Stuck messages found:       ${stats.stuckMessagesFound}`);
  console.log(`Stuck marked as failed:     ${stats.stuckMessagesMarkedFailed}`);
  console.log('='.repeat(60));

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err.messageId}: ${err.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to apply changes\n');
  } else {
    console.log('\n✅ Backfill completed successfully!\n');
  }
}

async function processWebhookEvent(
  event: WebhookEvent,
  supabase: any,
  dryRun: boolean,
): Promise<void> {
  try {
    const payload = event.payload;
    const statuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses || [];

    for (const status of statuses) {
      const wamid = status.id;
      const statusType = status.status;
      const timestamp = status.timestamp
        ? new Date(Number(status.timestamp) * 1000)
        : new Date(event.created_at);
      const bizOpaqueData = status.biz_opaque_callback_data;

      if (!wamid || !wamid.startsWith('wamid.') || !bizOpaqueData) {
        continue;
      }

      stats.totalMessagesProcessed++;

      // Parse CBB correlation data: {"c":"972535777550"}
      let phoneNumber: string | null = null;
      try {
        const parsed = JSON.parse(bizOpaqueData);
        phoneNumber = parsed.c;
      } catch {
        stats.errors.push({
          messageId: wamid,
          error: `Invalid correlation data: ${bizOpaqueData}`,
        });
        stats.messagesFailed++;
        continue;
      }

      if (!phoneNumber) {
        stats.errors.push({
          messageId: wamid,
          error: 'No phone number in correlation data',
        });
        stats.messagesFailed++;
        continue;
      }

      // Find matching message by phone + timestamp (within 10 minute window)
      const searchStart = new Date(timestamp.getTime() - 10 * 60 * 1000);
      const searchEnd = new Date(timestamp.getTime() + 10 * 60 * 1000);

      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('id, message_id, phone_number, status, created_at')
        .eq('phone_number', phoneNumber)
        .like('message_id', 'temp_%')
        .gte('created_at', searchStart.toISOString())
        .lte('created_at', searchEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!messages || messages.length === 0) {
        // No matching message found - might be already correlated or outside window
        continue;
      }

      const message = messages[0];
      stats.messagesCorrelated++;

      // Prepare updates
      const updates: any = {
        meta_message_id: wamid,
        updated_at: new Date().toISOString(),
      };

      // Update status if it's a delivery/read/failed event
      if (statusType === 'delivered') {
        updates.status = 'delivered';
        updates.delivered_at = timestamp.toISOString();
      } else if (statusType === 'read') {
        updates.status = 'read';
        updates.read_at = timestamp.toISOString();
      } else if (statusType === 'failed') {
        updates.status = 'failed';
        updates.failed_at = timestamp.toISOString();
        updates.failure_reason = status.errors?.[0]?.message || 'Unknown error';
      }

      // Also update message_id to the real WAMID
      if (message.message_id.startsWith('temp_')) {
        updates.message_id = wamid;
      }

      // Apply updates (if not dry run)
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('whatsapp_messages')
          .update(updates)
          .eq('id', message.id);

        if (updateError) {
          stats.errors.push({
            messageId: wamid,
            error: `Update failed: ${updateError.message}`,
          });
          stats.messagesFailed++;
        } else {
          stats.messagesUpdated++;
          console.log(`✅ ${message.message_id} → ${wamid} (${statusType})`);
        }
      } else {
        stats.messagesUpdated++;
        console.log(
          `🔍 [DRY RUN] Would update: ${message.message_id} → ${wamid} (${statusType})`,
        );
      }

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch (error) {
    console.error(`❌ Error processing webhook event ${event.id}:`, error);
  }
}

/**
 * Mark messages stuck in "sent" status as FAILED if they're >12 hours old
 * These messages never received webhook updates and are lost
 */
async function markStuckMessagesAsFailed(
  supabase: any,
  dryRun: boolean,
): Promise<void> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const { data: stuckMessages, error } = await supabase
    .from('whatsapp_messages')
    .select('id, message_id, phone_number, created_at, template_name, order_id')
    .eq('status', 'sent')
    .like('message_id', 'temp_%')
    .lt('created_at', twelveHoursAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching stuck messages:', error);
    return;
  }

  stats.stuckMessagesFound = stuckMessages?.length || 0;

  if (stats.stuckMessagesFound === 0) {
    console.log('✅ No stuck messages found (all good!)');
    return;
  }

  console.log(
    `⚠️  Found ${stats.stuckMessagesFound} messages stuck in "sent" status >12h`,
  );
  console.log('   These will be marked as FAILED (no webhook received)\n');

  for (const message of stuckMessages || []) {
    const age = Math.round(
      (Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60),
    );

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: 'No webhook received - message likely failed to send',
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      if (updateError) {
        console.error(
          `❌ Failed to update ${message.message_id}:`,
          updateError,
        );
      } else {
        stats.stuckMessagesMarkedFailed++;
        console.log(
          `❌ Marked as FAILED: ${message.message_id} (${age}h old, phone: ${message.phone_number})`,
        );
      }
    } else {
      stats.stuckMessagesMarkedFailed++;
      console.log(
        `🔍 [DRY RUN] Would mark as FAILED: ${message.message_id} (${age}h old, phone: ${message.phone_number})`,
      );
    }

    // Small delay to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
