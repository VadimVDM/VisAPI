import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheWarmingService } from './cache-warming.service';
import { CacheModule as BackendCacheModule } from '@visapi/backend-cache';

@Module({
  imports: [
    BackendCacheModule,
    CqrsModule,
    ScheduleModule.forRoot(),
  ],
  providers: [CacheWarmingService],
  exports: [CacheWarmingService],
})
export class CacheManagementModule {}