import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TemplateManagerService } from '@visapi/backend-whatsapp-business';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@ApiTags('WhatsApp Management')
@Controller('v1/whatsapp')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class WhatsAppManagementController {
  private readonly logger = new Logger(WhatsAppManagementController.name);

  constructor(private readonly templateManager: TemplateManagerService) {}

  @Post('templates/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually sync WhatsApp templates from Meta' })
  @ApiResponse({ status: 200, description: 'Templates synced successfully' })
  @ApiResponse({ status: 500, description: 'Sync failed' })
  async syncTemplates(): Promise<{
    success: boolean;
    count: number;
    templates: any[];
  }> {
    try {
      this.logger.log('Manual template sync triggered');

      const templates = await this.templateManager.syncTemplatesFromMeta();

      this.logger.log(`Successfully synced ${templates.length} templates`);

      return {
        success: true,
        count: templates.length,
        templates: templates.map((t) => ({
          name: t.name,
          language: t.language,
          status: t.status,
          category: t.category,
          quality_score: t.quality_score,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Template sync failed: ${error.message}`, error);
      throw error;
    }
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all approved WhatsApp templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(): Promise<any[]> {
    try {
      const templates = await this.templateManager.getApprovedTemplates();

      return templates.map((t) => ({
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category,
        quality_score: t.quality_score,
        components: t.components,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get templates: ${error.message}`, error);
      throw error;
    }
  }

  @Get('templates/compliance')
  @ApiOperation({ summary: 'Check template compliance status' })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async checkCompliance(): Promise<any> {
    try {
      const report =
        await this.templateManager.checkTemplateCategoryCompliance();
      return report;
    } catch (error) {
      this.logger.error(`Failed to check compliance: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }
}
