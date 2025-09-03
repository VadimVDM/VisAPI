import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface StorageUploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface StorageFile {
  path: string;
  publicUrl: string;
  signedUrl?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly BUCKET_NAME = 'receipts';
  private readonly SIGNED_URL_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    path: string,
    buffer: Buffer,
    options: StorageUploadOptions = {},
  ): Promise<StorageFile> {
    const {
      contentType = 'application/pdf',
      cacheControl = '3600',
      upsert = true,
    } = options;

    try {
      // Upload file to storage
      const { data, error } = await this.supabase.serviceClient.storage
        .from(this.BUCKET_NAME)
        .upload(path, buffer, {
          contentType,
          cacheControl,
          upsert,
        });

      if (error) {
        this.logger.error(`Failed to upload file to storage: ${path}`, error.stack);
        throw error;
      }

      // Get public URL
      const publicUrl = this.getPublicUrl(path);

      // Generate signed URL for temporary access
      const signedUrl = await this.createSignedUrl(path);

      this.logger.log(`File uploaded successfully: ${path}`);

      return {
        path: data.path,
        publicUrl,
        signedUrl,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${path}`, (error as any)?.stack);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const { error } = await this.supabase.serviceClient.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        this.logger.error(`Failed to delete file from storage: ${path}`, error.stack);
        throw error;
      }

      this.logger.log(`File deleted successfully: ${path}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${path}`, (error as any)?.stack);
      throw error;
    }
  }

  /**
   * Create a signed URL for temporary access
   */
  async createSignedUrl(
    path: string,
    expiresIn = this.SIGNED_URL_EXPIRY,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.serviceClient.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) {
        this.logger.error(`Failed to create signed URL: ${path}`, error.stack);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error(`Error creating signed URL: ${path}`, (error as any)?.stack);
      throw error;
    }
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(path: string): string {
    const { data } = this.supabase.client.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.serviceClient.storage
        .from(this.BUCKET_NAME)
        .list(path.substring(0, path.lastIndexOf('/')), {
          search: path.substring(path.lastIndexOf('/') + 1),
        });

      if (error) {
        this.logger.error(`Failed to check if file exists: ${path}`, error.stack);
        return false;
      }

      return data.length > 0;
    } catch (error) {
      this.logger.error(`Error checking file existence: ${path}`, (error as any)?.stack);
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string, limit = 100, offset = 0): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.serviceClient.storage
        .from(this.BUCKET_NAME)
        .list(prefix, {
          limit,
          offset,
        });

      if (error) {
        this.logger.error(`Failed to list files: ${prefix}`, error.stack);
        throw error;
      }

      return data.map((file) => `${prefix}/${file.name}`);
    } catch (error) {
      this.logger.error(`Error listing files: ${prefix}`, (error as any)?.stack);
      throw error;
    }
  }
}
