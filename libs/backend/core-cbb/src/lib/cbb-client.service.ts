import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  Contact,
  CreateContactDto,
  MessageResponse,
  SendTextMessageDto,
  SendFileMessageDto,
  Flow,
  FindContactResponse,
  CbbApiResponse,
  CBB_ENDPOINTS,
  WHATSAPP_CHANNEL_NAME,
  CBBContactData,
  CBBContact,
  WhatsAppValidationResponse,
} from '@visapi/shared-types';

export class CbbApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'CbbApiError';
  }
}

export class ContactNotFoundError extends Error {
  constructor(phone: string) {
    super(`Contact not found for phone: ${phone}`);
    this.name = 'ContactNotFoundError';
  }
}

@Injectable()
export class CbbClientService {
  private readonly logger = new Logger(CbbClientService.name);
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseURL = this.configService.get<string>('cbb.apiUrl');
    this.apiKey = this.configService.get<string>('cbb.apiKey');
    this.timeout = this.configService.get<number>('cbb.timeout');
    this.retryAttempts = this.configService.get<number>('cbb.retryAttempts');

    if (!this.apiKey) {
      this.logger.warn('CBB_API_KEY not configured - WhatsApp messages will fail');
    }
  }

  /**
   * Find contact by phone number
   */
  async findContactByPhone(phone: string): Promise<Contact | null> {
    try {
      this.logger.debug(`Finding contact by phone: ${phone}`);
      
      const response = await this.makeRequest<FindContactResponse>('GET', CBB_ENDPOINTS.FIND_CONTACT, {
        params: {
          field_id: 'phone',
          value: phone,
        },
      });

      return response.data?.contact || null;
    } catch (error) {
      if (error instanceof CbbApiError && error.statusCode === 404) {
        return null;
      }
      this.logger.error(`Failed to find contact by phone ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contactData: CreateContactDto): Promise<Contact> {
    try {
      this.logger.debug(`Creating contact for phone: ${contactData.phone}`);
      
      const response = await this.makeRequest<Contact>('POST', CBB_ENDPOINTS.CONTACTS, {
        data: contactData,
      });

      this.logger.debug(`Contact created with ID: ${response.data?.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create contact for ${contactData.phone}:`, error);
      throw error;
    }
  }

  /**
   * Send text message to contact
   */
  async sendTextMessage(contactId: number, text: string): Promise<MessageResponse> {
    try {
      this.logger.debug(`Sending text message to contact ${contactId}`);
      
      const payload: SendTextMessageDto = {
        text,
        channel: WHATSAPP_CHANNEL_NAME,
      };

      const response = await this.makeRequest<MessageResponse>('POST', CBB_ENDPOINTS.SEND_TEXT(contactId), {
        data: payload,
      });

      this.logger.debug(`Text message sent to contact ${contactId}:`, response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send text message to contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Send file/media message to contact
   */
  async sendFileMessage(
    contactId: number,
    fileUrl: string,
    fileType: 'image' | 'document' | 'video' | 'audio'
  ): Promise<MessageResponse> {
    try {
      this.logger.debug(`Sending ${fileType} message to contact ${contactId}`);
      
      const payload: SendFileMessageDto = {
        url: fileUrl,
        type: fileType,
        channel: WHATSAPP_CHANNEL_NAME,
      };

      const response = await this.makeRequest<MessageResponse>('POST', CBB_ENDPOINTS.SEND_FILE(contactId), {
        data: payload,
      });

      this.logger.debug(`File message sent to contact ${contactId}:`, response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send file message to contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Send flow (template) to contact
   */
  async sendFlow(contactId: number, flowId: number): Promise<MessageResponse> {
    try {
      this.logger.debug(`Sending flow ${flowId} to contact ${contactId}`);
      
      const response = await this.makeRequest<MessageResponse>('POST', CBB_ENDPOINTS.SEND_FLOW(contactId, flowId));

      this.logger.debug(`Flow sent to contact ${contactId}:`, response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send flow ${flowId} to contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Get all available flows
   */
  async getFlows(): Promise<Flow[]> {
    try {
      this.logger.debug('Fetching available flows');
      
      const response = await this.makeRequest<Flow[]>('GET', CBB_ENDPOINTS.FLOWS);

      this.logger.debug(`Found ${response.data?.length || 0} flows`);
      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch flows:', error);
      throw error;
    }
  }

  /**
   * Get contact details by ID
   */
  async getContact(contactId: number): Promise<Contact> {
    try {
      this.logger.debug(`Fetching contact details for ID: ${contactId}`);
      
      const response = await this.makeRequest<Contact>('GET', `${CBB_ENDPOINTS.CONTACTS}/${contactId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Get contact by ID (phone number)
   */
  async getContactById(id: string): Promise<CBBContact | null> {
    try {
      this.logger.debug(`Getting contact by ID: ${id}`);
      
      const response = await this.makeRequest<CBBContact>('GET', `/contacts/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof CbbApiError && error.statusCode === 404) {
        return null;
      }
      this.logger.error(`Failed to get contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create contact with custom fields
   */
  async createContactWithFields(data: CBBContactData): Promise<CBBContact> {
    try {
      this.logger.debug(`Creating contact with fields for phone: ${data.phone}`);
      
      const payload: any = {
        id: data.id,
        phone: data.phone,
        name: data.name,
        email: data.email,
        customFields: data.cufs,
      };

      // Add optional fields only if provided and not undefined
      if (data.gender && data.gender !== undefined) {
        payload.gender = data.gender;
        this.logger.debug(`Setting gender to: ${data.gender}`);
      }
      if (data.language && data.language !== undefined) {
        payload.language = data.language;
        this.logger.debug(`Setting language to: ${data.language}`);
      }

      const response = await this.makeRequest<CBBContact>('POST', '/contacts', {
        data: payload,
      });

      this.logger.debug(`Contact created with ID: ${response.data?.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create contact for ${data.phone}:`, error);
      throw error;
    }
  }

  /**
   * Update contact custom fields ONLY
   * CBB API requires using field name as ID and sending value as formData
   */
  async updateContactFields(id: string, cufs: Record<string, any>): Promise<CBBContact> {
    try {
      this.logger.debug(`Updating contact custom fields for ID: ${id}`);
      
      // Update each custom field individually using field name as ID
      for (const [fieldName, fieldValue] of Object.entries(cufs)) {
        try {
          this.logger.debug(`Updating custom field ${fieldName} = ${fieldValue}`);
          
          // Use form data as CBB expects
          const formData = new URLSearchParams();
          formData.append('value', String(fieldValue));
          
          await this.makeRequest('POST', `/contacts/${id}/custom_fields/${fieldName}`, {
            data: formData.toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          
          this.logger.debug(`Updated custom field ${fieldName} successfully`);
        } catch (error) {
          this.logger.error(`Failed to update custom field ${fieldName}:`, error);
          // Continue updating other fields even if one fails
        }
      }

      // Return the contact data (CBB doesn't return updated contact from field updates)
      return {
        id: id,
        phone: id,
        name: '',
        email: '',
        hasWhatsApp: true,
        customFields: cufs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update contact ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update contact - CBB API allows updating some basic fields and custom fields
   * Basic fields that CAN be updated: email, first_name (through custom field endpoint)
   * Basic fields that CANNOT be updated: gender, language (only set during creation)
   */
  async updateContactComplete(data: CBBContactData): Promise<CBBContact> {
    try {
      this.logger.debug(`Updating contact ID: ${data.id}`);
      
      // Update email if provided (CBB allows email update through custom field endpoint)
      if (data.email) {
        try {
          this.logger.debug(`Updating email to: ${data.email}`);
          const formData = new URLSearchParams();
          formData.append('value', data.email);
          
          await this.makeRequest('POST', `/contacts/${data.id}/custom_fields/email`, {
            data: formData.toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          this.logger.debug('Email updated successfully');
        } catch (error) {
          this.logger.error('Failed to update email:', error);
        }
      }
      
      // Update first_name if provided (use complete name as-is)
      if (data.name) {
        try {
          this.logger.debug(`Updating first_name to: ${data.name}`);
          const formData = new URLSearchParams();
          formData.append('value', data.name);
          
          await this.makeRequest('POST', `/contacts/${data.id}/custom_fields/first_name`, {
            data: formData.toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          this.logger.debug('First name updated successfully');
        } catch (error) {
          this.logger.error('Failed to update first_name:', error);
        }
      }
      
      // Note: gender and language cannot be updated after creation
      if (data.gender || data.language) {
        this.logger.warn('CBB API limitation: Cannot update gender or language for existing contacts');
      }
      
      // Update custom fields
      if (data.cufs && Object.keys(data.cufs).length > 0) {
        await this.updateContactFields(data.id, data.cufs);
      }
      
      // Return the contact data we have (CBB doesn't return updated contact from field updates)
      return {
        id: data.id,
        phone: data.phone,
        name: data.name,
        email: data.email,
        hasWhatsApp: true,
        customFields: data.cufs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update contact ${data.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate if phone has WhatsApp
   * NOTE: CBB API doesn't have a WhatsApp validation endpoint
   * We assume if contact exists, they have WhatsApp capability
   */
  async validateWhatsApp(phone: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if contact ${phone} exists (assuming WhatsApp if exists)`);
      
      // Try to get the contact - if it exists, assume WhatsApp is available
      const contact = await this.getContactById(phone);
      return contact !== null;
    } catch (error) {
      this.logger.warn(`Failed to validate WhatsApp for ${phone}:`, error);
      return false;
    }
  }

  /**
   * Make HTTP request to CBB API with error handling and retries
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    options: {
      data?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-ACCESS-TOKEN': this.apiKey,  // CBB uses X-ACCESS-TOKEN header, not Authorization Bearer
      ...options.headers,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.logger.debug(`CBB API ${method} ${endpoint} (attempt ${attempt}/${this.retryAttempts})`);

        const config = {
          method,
          url,
          headers,
          timeout: this.timeout,
          ...(options.data && { data: options.data }),
          ...(options.params && { params: options.params }),
        };

        const response = await firstValueFrom(this.httpService.request<T>(config));
        
        // CBB API returns 200 with success: false for errors
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          const cbbResponse = response.data as CbbApiResponse<T>;
          if (!cbbResponse.success) {
            throw new CbbApiError(
              cbbResponse.error || cbbResponse.message || 'CBB API error',
              response.status,
              response.data
            );
          }
        }

        return response;
      } catch (error) {
        lastError = error;
        
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error || error.response.data?.message || error.message;
          
          // Don't retry on client errors (400-499)
          if (status >= 400 && status < 500) {
            throw new CbbApiError(message, status, error.response.data);
          }
          
          this.logger.warn(`CBB API ${method} ${endpoint} failed (attempt ${attempt}): ${status} ${message}`);
        } else {
          this.logger.warn(`CBB API ${method} ${endpoint} failed (attempt ${attempt}): ${error.message}`);
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError;
  }
}