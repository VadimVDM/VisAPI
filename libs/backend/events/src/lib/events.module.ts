import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { AuditEventHandler } from './audit-event.handler';
import { SupabaseModule } from '@visapi/core-supabase';
import { LoggingModule } from '@visapi/backend-logging';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    SupabaseModule,
    LoggingModule,
  ],
  providers: [EventBusService, AuditEventHandler],
  exports: [EventBusService],
})
export class EventsModule {}
