import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ApplicantIssuesService } from './services/applicant-issues.service';
import {
  ApplicantIssuesWebhookDto,
  ApplicantIssuesResponseDto,
} from './dto/applicant-issues.dto';

@ApiTags('Visanet Webhooks')
@Controller('v1/webhooks/visanet')
export class VisanetWebhooksController {
  constructor(
    private readonly applicantIssuesService: ApplicantIssuesService,
  ) {}

  @Post('mistakes')
  @UseGuards(ApiKeyGuard)
  @Scopes('webhook:visanet', 'logs:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive applicant issue reports from Visanet',
    description:
      'Processes applicant document issues from Visanet, stores in database, looks up applicant in Airtable, and sends WhatsApp notification via CBB with Hebrew issue descriptions',
  })
  @ApiBearerAuth('api-key')
  @ApiBody({
    type: ApplicantIssuesWebhookDto,
    description: 'Applicant issues webhook payload from Visanet',
    examples: {
      passport_photo_issues: {
        value: {
          applicantId: 'apl_jwGu1dBAxeOc',
          issues: {
            face_photo: [],
            passport_photo: [
              {
                value: 'with_shadow_light',
                label: 'With Shadow/Light',
              },
              {
                value: 'code_hidden_at_bottom',
                label: 'Code Hidden at Bottom',
              },
            ],
            business: [],
            passport_expiry: [],
            application_details: [],
          },
        },
        summary: 'Passport photo issues example',
      },
      business_docs_missing: {
        value: {
          applicantId: 'apl_nplhi2XM6X8j',
          issues: {
            face_photo: [],
            passport_photo: [],
            business: [
              {
                value: 'missing_invitation_letter',
                label: 'Missing Invitation Letter',
              },
              {
                value: 'missing_business_card',
                label: 'Missing Business Card',
              },
            ],
            passport_expiry: [],
            application_details: [],
          },
        },
        summary: 'Business documents missing example',
      },
      face_photo_issues: {
        value: {
          applicantId: 'apl_FosSKB6JDIKx',
          issues: {
            face_photo: [
              {
                value: 'without_shirt',
                label: 'Without Shirt',
              },
            ],
            passport_photo: [],
            business: [],
            passport_expiry: [],
            application_details: [],
          },
        },
        summary: 'Face photo issue example',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Issues processed successfully',
    type: ApplicantIssuesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async handleApplicantIssues(
    @Body() dto: ApplicantIssuesWebhookDto,
    @Headers() headers: Record<string, string>,
  ): Promise<ApplicantIssuesResponseDto> {
    const correlationId =
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      `mistakes-${Date.now()}`;

    return this.applicantIssuesService.processApplicantIssues(
      dto,
      correlationId,
    );
  }
}
