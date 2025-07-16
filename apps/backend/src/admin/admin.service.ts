import { Injectable } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@visapi/shared-types';

@Injectable()
export class AdminService {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue(QUEUE_NAMES.SLACK) private slackQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private whatsappQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PDF) private pdfQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DLQ) private dlqQueue: Queue
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/api/v1/admin/queues');

    createBullBoard({
      queues: [
        new BullMQAdapter(this.slackQueue, {
          readOnlyMode: false,
        }),
        new BullMQAdapter(this.whatsappQueue, {
          readOnlyMode: false,
        }),
        new BullMQAdapter(this.pdfQueue, {
          readOnlyMode: false,
        }),
        new BullMQAdapter(this.dlqQueue, {
          readOnlyMode: false,
        }),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  getRouter(): ReturnType<ExpressAdapter['getRouter']> {
    return this.serverAdapter.getRouter();
  }
}
