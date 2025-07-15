import { Module } from '@nestjs/common';
import { SupabaseModule } from '@visapi/core-supabase';
import { QueueModule } from '../queue/queue.module';
import { CronSeederService } from './cron-seeder.service';

@Module({
  imports: [SupabaseModule, QueueModule],
  providers: [CronSeederService],
  exports: [CronSeederService],
})
export class CronModule {}