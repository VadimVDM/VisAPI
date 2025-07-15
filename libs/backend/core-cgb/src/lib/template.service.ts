import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Flow } from '@visapi/shared-types';
import { CgbClientService } from './cgb-client.service';

export interface TemplateMapping {
  templateName: string;
  flowId: number;
  description?: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateMappings = new Map<string, number>();
  private flowsCache: Flow[] | null = null;
  private flowsCacheExpiry = 0;
  private readonly cacheTimeout: number;

  constructor(
    private readonly cgbClient: CgbClientService,
    private readonly configService: ConfigService
  ) {
    this.cacheTimeout = this.configService.get<number>('cgb.cacheTimeout') * 1000; // Convert to milliseconds
    this.initializeTemplateMappings();
  }

  /**
   * Get flow ID for a template name
   */
  async getTemplateFlowId(templateName: string): Promise<number> {
    // Check if we have a configured mapping
    const mappedFlowId = this.templateMappings.get(templateName);
    if (mappedFlowId) {
      this.logger.debug(`Using mapped flow ID ${mappedFlowId} for template: ${templateName}`);
      return mappedFlowId;
    }

    // Try to find flow by name
    const flows = await this.getFlows();
    const matchingFlow = flows.find(flow => 
      flow.name.toLowerCase() === templateName.toLowerCase() ||
      flow.name.toLowerCase().includes(templateName.toLowerCase())
    );

    if (matchingFlow) {
      this.logger.debug(`Found flow ${matchingFlow.id} for template: ${templateName}`);
      // Cache the mapping for future use
      this.templateMappings.set(templateName, matchingFlow.id);
      return matchingFlow.id;
    }

    throw new Error(`Template '${templateName}' not found in available flows`);
  }

  /**
   * Process template variables (for future use with more complex templates)
   */
  async processTemplateVariables(
    templateName: string,
    variables: Record<string, any>
  ): Promise<any> {
    this.logger.debug(`Processing variables for template: ${templateName}`, variables);
    
    // For now, return variables as-is
    // In the future, this could handle variable transformation,
    // validation, or mapping to CGB flow variables
    return variables;
  }

  /**
   * Validate that a template exists
   */
  async validateTemplate(templateName: string): Promise<boolean> {
    try {
      await this.getTemplateFlowId(templateName);
      return true;
    } catch (error) {
      this.logger.debug(`Template validation failed for ${templateName}:`, error.message);
      return false;
    }
  }

  /**
   * Get all available flows with caching
   */
  async getFlows(): Promise<Flow[]> {
    const now = Date.now();
    
    // Return cached flows if still valid
    if (this.flowsCache && now < this.flowsCacheExpiry) {
      this.logger.debug('Using cached flows');
      return this.flowsCache;
    }

    try {
      this.logger.debug('Fetching flows from CGB API');
      const flows = await this.cgbClient.getFlows();
      
      // Update cache
      this.flowsCache = flows;
      this.flowsCacheExpiry = now + this.cacheTimeout;
      
      this.logger.debug(`Cached ${flows.length} flows for ${this.cacheTimeout / 1000} seconds`);
      return flows;
    } catch (error) {
      this.logger.error('Failed to fetch flows:', error);
      
      // Return cached flows if available, even if expired
      if (this.flowsCache) {
        this.logger.warn('Using expired flows cache due to API error');
        return this.flowsCache;
      }
      
      throw error;
    }
  }

  /**
   * Get available template names
   */
  async getAvailableTemplates(): Promise<TemplateMapping[]> {
    const flows = await this.getFlows();
    const templates: TemplateMapping[] = [];

    // Add configured mappings
    for (const [templateName, flowId] of this.templateMappings.entries()) {
      const flow = flows.find(f => f.id === flowId);
      templates.push({
        templateName,
        flowId,
        description: flow?.description || flow?.name,
      });
    }

    // Add flows that aren't explicitly mapped
    for (const flow of flows) {
      const isAlreadyMapped = Array.from(this.templateMappings.values()).includes(flow.id);
      if (!isAlreadyMapped) {
        templates.push({
          templateName: flow.name.toLowerCase().replace(/\s+/g, '_'),
          flowId: flow.id,
          description: flow.description || flow.name,
        });
      }
    }

    return templates;
  }

  /**
   * Initialize template mappings from environment variables
   */
  private initializeTemplateMappings(): void {
    // Load template mappings from environment variables
    const templateMappings = [
      { env: 'CGB_TEMPLATE_VISA_APPROVED', name: 'visa_approved' },
      { env: 'CGB_TEMPLATE_VISA_REJECTED', name: 'visa_rejected' },
      { env: 'CGB_TEMPLATE_DOCUMENT_REQUEST', name: 'document_request' },
      { env: 'CGB_TEMPLATE_APPOINTMENT_REMINDER', name: 'appointment_reminder' },
      { env: 'CGB_TEMPLATE_STATUS_UPDATE', name: 'status_update' },
    ];

    for (const mapping of templateMappings) {
      const flowId = this.configService.get<string>(mapping.env);
      if (flowId) {
        const parsedFlowId = parseInt(flowId, 10);
        if (!isNaN(parsedFlowId)) {
          this.templateMappings.set(mapping.name, parsedFlowId);
          this.logger.debug(`Mapped template ${mapping.name} to flow ${parsedFlowId}`);
        } else {
          this.logger.warn(`Invalid flow ID for ${mapping.env}: ${flowId}`);
        }
      }
    }

    this.logger.debug(`Initialized ${this.templateMappings.size} template mappings`);
  }

  /**
   * Clear flows cache (useful for testing)
   */
  clearCache(): void {
    this.flowsCache = null;
    this.flowsCacheExpiry = 0;
    this.logger.debug('Template flows cache cleared');
  }

  /**
   * Add or update template mapping
   */
  setTemplateMapping(templateName: string, flowId: number): void {
    this.templateMappings.set(templateName, flowId);
    this.logger.debug(`Added template mapping: ${templateName} -> ${flowId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    flowsCached: boolean; 
    flowsCount: number; 
    templateMappings: number;
    cacheExpiresIn: number;
  } {
    const now = Date.now();
    return {
      flowsCached: this.flowsCache !== null && now < this.flowsCacheExpiry,
      flowsCount: this.flowsCache?.length || 0,
      templateMappings: this.templateMappings.size,
      cacheExpiresIn: Math.max(0, this.flowsCacheExpiry - now),
    };
  }
}