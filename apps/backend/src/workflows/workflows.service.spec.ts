import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { SupabaseService } from '@visapi/core-supabase';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';

describe('WorkflowsService', () => {
  let service: WorkflowsService;

  const mockSupabaseClient = {
    from: jest.fn(),
  };

  const mockWorkflowData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Workflow',
    description: 'A test workflow',
    enabled: true,
    schema: {
      triggers: [
        {
          type: 'cron',
          config: {
            schedule: '0 9 * * *',
          },
        },
      ],
      steps: [
        {
          id: 'step-1',
          type: 'whatsapp.send',
          config: {
            contact: '+1234567890',
            template: 'test_template',
          },
          retries: 3,
        },
      ],
      variables: { testVar: 'value' },
    },
    created_at: '2025-07-15T10:30:00Z',
    updated_at: '2025-07-15T10:30:00Z',
  };

  beforeEach(async () => {
    const mockSupabaseService = {
      client: mockSupabaseClient,
      serviceClient: mockSupabaseClient,
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    supabaseService = module.get<jest.Mocked<SupabaseService>>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new workflow', async () => {
      const createDto: CreateWorkflowDto = {
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        variables: { testVar: 'value' },
        schema: {
          triggers: [
            {
              type: 'cron',
              config: {
                schedule: '0 9 * * *',
              },
            },
          ],
          steps: [
            {
              id: 'step-1',
              type: 'whatsapp.send',
              config: {
                contact: '+1234567890',
                template: 'test_template',
              },
              retries: 3,
            },
          ],
        },
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockWorkflowData,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.create(createDto);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        enabled: createDto.enabled,
        schema: {
          ...createDto.schema,
          variables: createDto.variables,
        },
      });
      expect(result).toEqual({
        id: mockWorkflowData.id,
        name: mockWorkflowData.name,
        description: mockWorkflowData.description,
        enabled: mockWorkflowData.enabled,
        variables: mockWorkflowData.schema.variables,
        schema: mockWorkflowData.schema,
        created_at: mockWorkflowData.created_at,
        updated_at: mockWorkflowData.updated_at,
      });
    });

    it('should throw error when database operation fails', async () => {
      const createDto: CreateWorkflowDto = {
        name: 'Test Workflow',
        enabled: true,
        schema: {
          triggers: [{ type: 'cron', config: { schedule: '0 9 * * *' } }],
          steps: [
            {
              id: 'step-1',
              type: 'whatsapp.send',
              config: { contact: '+1234567890' },
            },
          ],
        },
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create workflow',
      );
    });
  });

  describe('findAll', () => {
    it('should return all workflows', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockWorkflowData],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.findAll();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWorkflowData.id);
    });

    it('should throw error when database operation fails', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.findAll()).rejects.toThrow(
        'Failed to fetch workflows',
      );
    });
  });

  describe('findOne', () => {
    it('should return a workflow by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockWorkflowData,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.findOne(mockWorkflowData.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockWorkflowData.id);
      expect(result.id).toBe(mockWorkflowData.id);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      const updateDto: UpdateWorkflowDto = {
        name: 'Updated Workflow',
        enabled: false,
      };

      const updatedWorkflowData = {
        ...mockWorkflowData,
        name: 'Updated Workflow',
        enabled: false,
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedWorkflowData,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.update(mockWorkflowData.id, updateDto);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.update).toHaveBeenCalledWith({
        name: updateDto.name,
        enabled: updateDto.enabled,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockWorkflowData.id);
      expect(result.name).toBe('Updated Workflow');
      expect(result.enabled).toBe(false);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const updateDto: UpdateWorkflowDto = {
        name: 'Updated Workflow',
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a workflow', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await service.remove(mockWorkflowData.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockWorkflowData.id);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findEnabled', () => {
    it('should return only enabled workflows', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockWorkflowData],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.findEnabled();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflows');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('enabled', true);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(true);
    });

    it('should throw error when database operation fails', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.findEnabled()).rejects.toThrow(
        'Failed to fetch enabled workflows',
      );
    });
  });
});
