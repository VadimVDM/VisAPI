import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';

@ApiTags('Queue')
@Controller('api/v1/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics')
  @UseGuards(ApiKeyGuard)
  @Scopes('queues:read')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiSecurity('api-key')
  @ApiResponse({ status: 200, description: 'Returns queue metrics' })
  async getMetrics() {
    return this.queueService.getQueueMetrics();
  }
}
