import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [SupabaseService, StorageService],
  exports: [SupabaseService, StorageService],
})
export class SupabaseModule {}
