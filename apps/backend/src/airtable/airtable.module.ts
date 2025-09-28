import { Module } from '@nestjs/common';
import { ConfigModule } from '@visapi/core-config';
import { AuthModule } from '../auth/auth.module';
import { AirtableController } from './airtable.controller';
import { AirtableLookupService } from './airtable.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [AirtableController],
  providers: [AirtableLookupService],
  exports: [AirtableLookupService],
})
export class AirtableModule {}
