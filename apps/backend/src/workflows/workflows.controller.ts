import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { WorkflowValidationInterceptor } from './interceptors/workflow-validation.interceptor';

@ApiTags('workflows')
@Controller('v1/workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @RequirePermissions('workflows:create')
  @UseInterceptors(WorkflowValidationInterceptor)
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({
    status: 201,
    description: 'The workflow has been successfully created.',
    type: WorkflowResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - workflow validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async create(
    @Body() createWorkflowDto: CreateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.create(createWorkflowDto);
  }

  @Get()
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({
    status: 200,
    description: 'List of all workflows.',
    type: [WorkflowResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async findAll(): Promise<WorkflowResponseDto[]> {
    return this.workflowsService.findAll();
  }

  @Get('enabled')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get all enabled workflows' })
  @ApiResponse({
    status: 200,
    description: 'List of enabled workflows.',
    type: [WorkflowResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async findEnabled(): Promise<WorkflowResponseDto[]> {
    return this.workflowsService.findEnabled();
  }

  @Get(':id')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({
    status: 200,
    description: 'The workflow with the specified ID.',
    type: WorkflowResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('workflows:update')
  @UseInterceptors(WorkflowValidationInterceptor)
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({
    status: 200,
    description: 'The workflow has been successfully updated.',
    type: WorkflowResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - workflow validation failed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  @RequirePermissions('workflows:delete')
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({
    status: 204,
    description: 'The workflow has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.workflowsService.remove(id);
  }
}
