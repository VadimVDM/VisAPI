import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LogService } from './services/log.service';
import { LogFiltersDto, PaginatedLogsDto, LogStatsDto } from './dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';

@ApiTags('logs')
@Controller('api/v1/logs')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @Scopes('logs:read')
  @ApiOperation({ summary: 'Get logs with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of logs',
    type: PaginatedLogsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getLogs(
    @Query(new ValidationPipe({ transform: true })) filters: LogFiltersDto,
  ): Promise<PaginatedLogsDto> {
    const result = await this.logService.getLogs(filters);
    
    return {
      logs: result.logs,
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      has_more: result.offset + result.limit < result.total,
    };
  }

  @Get('stats')
  @Scopes('logs:read')
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Log statistics',
    type: LogStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getLogStats(): Promise<LogStatsDto> {
    const stats = await this.logService.getLogStats();
    
    return {
      total: stats.total,
      by_level: stats.byLevel,
      with_pii: stats.withPii,
      recent_count: stats.recentCount,
    };
  }

  @Get('workflow/:workflowId')
  @Scopes('logs:read')
  @ApiOperation({ summary: 'Get logs for a specific workflow' })
  @ApiResponse({
    status: 200,
    description: 'Logs for the specified workflow',
    type: [LogStatsDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getLogsByWorkflow(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
  ) {
    return this.logService.getLogsByWorkflow(workflowId);
  }

  @Get('job/:jobId')
  @Scopes('logs:read')
  @ApiOperation({ summary: 'Get logs for a specific job' })
  @ApiResponse({
    status: 200,
    description: 'Logs for the specified job',
    type: [LogStatsDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getLogsByJob(@Param('jobId') jobId: string) {
    return this.logService.getLogsByJob(jobId);
  }
}