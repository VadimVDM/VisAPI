import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CBBSyncMetricsService } from './services/cbb-sync-metrics.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Queue')
@Controller('v1/queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly syncMetricsService: CBBSyncMetricsService,
  ) {}

  @Get('metrics')
  @UseGuards(ApiKeyGuard)
  @Scopes('queues:read')
  @ApiBearerAuth('api-key')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiResponse({ status: 200, description: 'Returns queue metrics' })
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Get('metrics/cbb-sync')
  @UseGuards(ApiKeyGuard)
  @Scopes('queues:read')
  @ApiBearerAuth('api-key')
  @ApiOperation({ summary: 'Get CBB sync metrics' })
  @ApiResponse({ status: 200, description: 'Returns CBB sync metrics summary' })
  async getCBBSyncMetrics() {
    return this.syncMetricsService.getMetricsSummary();
  }
}
