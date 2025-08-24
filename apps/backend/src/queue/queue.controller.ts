import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CBBSyncMetricsService } from './services/cbb-sync-metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Queue')
@Controller('v1/queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly syncMetricsService: CBBSyncMetricsService,
  ) {}

  @Get('metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('queues:read')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiResponse({ status: 200, description: 'Returns queue metrics' })
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Get('metrics/cbb-sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('queues:read')
  @ApiOperation({ summary: 'Get CBB sync metrics' })
  @ApiResponse({ status: 200, description: 'Returns CBB sync metrics summary' })
  async getCBBSyncMetrics() {
    return this.syncMetricsService.getMetricsSummary();
  }
}
