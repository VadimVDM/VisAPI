import { Module } from '@nestjs/common';
import { SupabaseModule } from '@visapi/core-supabase';
import { BackendCoreCbbModule } from '@visapi/backend-core-cbb';
import { AirtableModule } from '../../airtable/airtable.module';
import { VisanetWebhooksController } from './visanet-webhooks.controller';
import { ApplicantIssuesService } from './services/applicant-issues.service';
import { IssuesMessageBuilderService } from './services/issues-message-builder.service';

/**
 * Visanet Webhooks Module
 * Handles incoming webhooks from Visanet application
 */
@Module({
  imports: [SupabaseModule, BackendCoreCbbModule, AirtableModule],
  controllers: [VisanetWebhooksController],
  providers: [ApplicantIssuesService, IssuesMessageBuilderService],
  exports: [ApplicantIssuesService, IssuesMessageBuilderService],
})
export class VisanetWebhooksModule {}
