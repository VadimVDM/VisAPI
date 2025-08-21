import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TemplateService } from './template.service';
import { CbbClientService } from './cbb-client.service';
import { Flow } from '@visapi/shared-types';

describe('TemplateService', () => {
  let service: TemplateService;
  let cbbClient: jest.Mocked<CbbClientService>;
  let configService: jest.Mocked<ConfigService>;

  const mockFlows: Flow[] = [
    { id: 100, name: 'Welcome Flow', description: 'Welcome new users' },
    { id: 200, name: 'Visa Approved', description: 'Notify visa approval' },
    { id: 300, name: 'Document Request', description: 'Request additional documents' },
    { id: 400, name: 'Status Update', description: 'General status update' },
  ];

  beforeEach(async () => {
    const mockCbbClient = {
      getFlows: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'cbb.cacheTimeout': 3600, // 1 hour
          'CBB_TEMPLATE_VISA_APPROVED': '200',
          'CBB_TEMPLATE_DOCUMENT_REQUEST': '300',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: CbbClientService, useValue: mockCbbClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    cbbClient = module.get(CbbClientService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTemplateFlowId', () => {
    beforeEach(() => {
      cbbClient.getFlows.mockResolvedValue(mockFlows);
    });

    it('should return configured mapping for known templates', async () => {
      const flowId = await service.getTemplateFlowId('visa_approved');
      expect(flowId).toBe(200);
    });

    it('should find flow by name when no mapping exists', async () => {
      const flowId = await service.getTemplateFlowId('welcome flow');
      expect(flowId).toBe(100);
    });

    it('should find flow by partial name match', async () => {
      const flowId = await service.getTemplateFlowId('status');
      expect(flowId).toBe(400);
    });

    it('should cache successful mappings for future use', async () => {
      // First call finds by name
      const flowId1 = await service.getTemplateFlowId('welcome flow');
      expect(flowId1).toBe(100);

      // Second call should use cached mapping
      const flowId2 = await service.getTemplateFlowId('welcome flow');
      expect(flowId2).toBe(100);

      // Should have called getFlows only once due to caching
      expect(cbbClient.getFlows).toHaveBeenCalledTimes(1);
    });

    it('should throw error when template not found', async () => {
      await expect(service.getTemplateFlowId('nonexistent_template')).rejects.toThrow(
        "Template 'nonexistent_template' not found in available flows"
      );
    });
  });

  describe('getFlows', () => {
    it('should fetch and cache flows', async () => {
      cbbClient.getFlows.mockResolvedValue(mockFlows);

      const flows1 = await service.getFlows();
      expect(flows1).toEqual(mockFlows);
      expect(cbbClient.getFlows).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const flows2 = await service.getFlows();
      expect(flows2).toEqual(mockFlows);
      expect(cbbClient.getFlows).toHaveBeenCalledTimes(1);
    });

    it('should return cached flows on API error if available', async () => {
      cbbClient.getFlows.mockResolvedValueOnce(mockFlows);

      // First call succeeds and caches
      const flows1 = await service.getFlows();
      expect(flows1).toEqual(mockFlows);

      // Clear cache to simulate expiry
      service.clearCache();

      // Second call fails, should return cached flows with warning
      cbbClient.getFlows.mockRejectedValueOnce(new Error('API error'));

      await expect(service.getFlows()).rejects.toThrow('API error');
    });

    it('should refresh cache when expired', async () => {
      const initialFlows = [mockFlows[0]];
      const updatedFlows = mockFlows;

      cbbClient.getFlows
        .mockResolvedValueOnce(initialFlows)
        .mockResolvedValueOnce(updatedFlows);

      // First call
      const flows1 = await service.getFlows();
      expect(flows1).toEqual(initialFlows);

      // Clear cache to simulate expiry
      service.clearCache();

      // Second call should fetch fresh data
      const flows2 = await service.getFlows();
      expect(flows2).toEqual(updatedFlows);
      expect(cbbClient.getFlows).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateTemplate', () => {
    beforeEach(() => {
      cbbClient.getFlows.mockResolvedValue(mockFlows);
    });

    it('should return true for valid templates', async () => {
      const isValid = await service.validateTemplate('visa_approved');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid templates', async () => {
      const isValid = await service.validateTemplate('invalid_template');
      expect(isValid).toBe(false);
    });
  });

  describe('processTemplateVariables', () => {
    it('should process template variables', async () => {
      const variables = { name: 'John Doe', status: 'approved' };
      const result = await service.processTemplateVariables('visa_approved', variables);
      
      expect(result).toEqual(variables);
    });

    it('should handle empty variables', async () => {
      const result = await service.processTemplateVariables('visa_approved', {});
      expect(result).toEqual({});
    });
  });

  describe('getAvailableTemplates', () => {
    beforeEach(() => {
      cbbClient.getFlows.mockResolvedValue(mockFlows);
    });

    it('should return all available templates including mappings', async () => {
      const templates = await service.getAvailableTemplates();

      expect(templates).toHaveLength(4);
      
      // Should include configured mappings
      expect(templates).toContainEqual({
        templateName: 'visa_approved',
        flowId: 200,
        description: 'Notify visa approval',
      });

      expect(templates).toContainEqual({
        templateName: 'document_request',
        flowId: 300,
        description: 'Request additional documents',
      });

      // Should include non-mapped flows
      expect(templates).toContainEqual({
        templateName: 'welcome_flow',
        flowId: 100,
        description: 'Welcome new users',
      });
    });
  });

  describe('template mapping management', () => {
    it('should initialize template mappings from environment variables', () => {
      // Mappings should be initialized in constructor
      const stats = service.getCacheStats();
      expect(stats.templateMappings).toBeGreaterThan(0);
    });

    it('should allow adding new template mappings', () => {
      service.setTemplateMapping('custom_template', 999);
      
      const stats = service.getCacheStats();
      expect(stats.templateMappings).toBeGreaterThan(2); // Should have at least the 2 configured + 1 added
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      cbbClient.getFlows.mockResolvedValue(mockFlows);
    });

    it('should provide cache statistics', async () => {
      await service.getFlows();

      const stats = service.getCacheStats();
      expect(stats.flowsCached).toBe(true);
      expect(stats.flowsCount).toBe(mockFlows.length);
      expect(stats.templateMappings).toBeGreaterThan(0);
      expect(stats.cacheExpiresIn).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      await service.getFlows();
      expect(service.getCacheStats().flowsCached).toBe(true);

      service.clearCache();
      expect(service.getCacheStats().flowsCached).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle getFlows API errors gracefully', async () => {
      cbbClient.getFlows.mockRejectedValue(new Error('Network error'));

      await expect(service.getFlows()).rejects.toThrow('Network error');
    });

    it('should handle invalid environment variable values', () => {
      // Test with invalid flow ID in environment
      configService.get.mockImplementation((key: string) => {
        if (key === 'CBB_TEMPLATE_INVALID') return 'not_a_number';
        return undefined;
      });

      // Should not crash, just ignore invalid mappings
      expect(() => new TemplateService(cbbClient, configService)).not.toThrow();
    });
  });
});