import { Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@visapi/shared-types';

const logger = new Logger('ScraperStorageUtil');

/**
 * Upload scraped document to Supabase storage
 */
export async function uploadDocumentToSupabase(
  buffer: Buffer,
  filename: string,
  bucketName: string = 'documents'
): Promise<{
  url: string;
  signedUrl: string;
  path: string;
}> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Generate unique path with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `scraped/${timestamp}-${filename}`;

  logger.log(`Uploading document to Supabase: ${path}`);

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    logger.error('Failed to upload document to Supabase:', error);
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  logger.log(`Document uploaded successfully: ${data.path}`);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  // Get signed URL (valid for 7 days)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(data.path, 7 * 24 * 60 * 60); // 7 days

  if (signedError) {
    logger.warn('Failed to create signed URL:', signedError);
  }

  return {
    url: urlData.publicUrl,
    signedUrl: signedData?.signedUrl || urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete document from Supabase storage
 */
export async function deleteDocumentFromSupabase(
  path: string,
  bucketName: string = 'documents'
): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  logger.log(`Deleting document from Supabase: ${path}`);

  const { error } = await supabase.storage.from(bucketName).remove([path]);

  if (error) {
    logger.error('Failed to delete document from Supabase:', error);
    throw new Error(`Supabase delete failed: ${error.message}`);
  }

  logger.log(`Document deleted successfully: ${path}`);
}