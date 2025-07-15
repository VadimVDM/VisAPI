import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SLACK },
      { name: QUEUE_NAMES.WHATSAPP },
      { name: QUEUE_NAMES.PDF },
      { name: QUEUE_NAMES.DLQ }
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
