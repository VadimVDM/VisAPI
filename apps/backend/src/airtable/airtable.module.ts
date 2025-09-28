import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@visapi/core-config';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { AirtableController } from './airtable.controller';
import { AirtableLookupService } from './airtable.service';
import { StatusMessageGeneratorService } from './services/status-message-generator.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    forwardRef(() => QueueModule), // Import QueueModule for WhatsAppTranslationService
  ],
  controllers: [AirtableController],
  providers: [AirtableLookupService, StatusMessageGeneratorService],
  exports: [AirtableLookupService],
})
export class AirtableModule {}
