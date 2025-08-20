import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LogService } from './services/log.service';
import { LogFiltersDto, PaginatedLogsDto, LogStatsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('logs')
@Controller('v1/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @RequirePermissions('logs:read')
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
      logs: result.data.map((log) => ({
        ...log,
        metadata: log.metadata as Record<string, unknown>,
      })),
      total: result.pagination.total,
      offset: result.pagination.page,
      limit: result.pagination.limit,
      has_more:
        result.pagination.page * result.pagination.limit <
        result.pagination.total,
    };
  }

  @Get('stats')
  @RequirePermissions('logs:read')
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
  @RequirePermissions('logs:read')
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
  @RequirePermissions('logs:read')
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
