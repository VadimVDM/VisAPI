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
  CgbApiResponse,
  CGB_ENDPOINTS,
  WHATSAPP_CHANNEL_NAME,
} from '@visapi/shared-types';

export class CgbApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'CgbApiError';
  }
}

export class ContactNotFoundError extends Error {
  constructor(phone: string) {
    super(`Contact not found for phone: ${phone}`);
    this.name = 'ContactNotFoundError';
  }
}

@Injectable()
export class CgbClientService {
  private readonly logger = new Logger(CgbClientService.name);
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseURL = this.configService.get<string>('cgb.apiUrl');
    this.apiKey = this.configService.get<string>('cgb.apiKey');
    this.timeout = this.configService.get<number>('cgb.timeout');
    this.retryAttempts = this.configService.get<number>('cgb.retryAttempts');

    if (!this.apiKey) {
      this.logger.warn('CGB_API_KEY not configured - WhatsApp messages will fail');
    }
  }

  /**
   * Find contact by phone number
   */
  async findContactByPhone(phone: string): Promise<Contact | null> {
    try {
      this.logger.debug(`Finding contact by phone: ${phone}`);
      
      const response = await this.makeRequest<FindContactResponse>('GET', CGB_ENDPOINTS.FIND_CONTACT, {
        params: {
          field_id: 'phone',
          value: phone,
        },
      });

      return response.data?.contact || null;
    } catch (error) {
      if (error instanceof CgbApiError && error.statusCode === 404) {
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
      
      const response = await this.makeRequest<Contact>('POST', CGB_ENDPOINTS.CONTACTS, {
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

      const response = await this.makeRequest<MessageResponse>('POST', CGB_ENDPOINTS.SEND_TEXT(contactId), {
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

      const response = await this.makeRequest<MessageResponse>('POST', CGB_ENDPOINTS.SEND_FILE(contactId), {
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
      
      const response = await this.makeRequest<MessageResponse>('POST', CGB_ENDPOINTS.SEND_FLOW(contactId, flowId));

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
      
      const response = await this.makeRequest<Flow[]>('GET', CGB_ENDPOINTS.FLOWS);

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
      
      const response = await this.makeRequest<Contact>('GET', `${CGB_ENDPOINTS.CONTACTS}/${contactId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Make HTTP request to CGB API with error handling and retries
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    options: {
      data?: any;
      params?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.logger.debug(`CGB API ${method} ${endpoint} (attempt ${attempt}/${this.retryAttempts})`);

        const config = {
          method,
          url,
          headers,
          timeout: this.timeout,
          ...(options.data && { data: options.data }),
          ...(options.params && { params: options.params }),
        };

        const response = await firstValueFrom(this.httpService.request<T>(config));
        
        // CGB API returns 200 with success: false for errors
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
          const cgbResponse = response.data as CgbApiResponse<T>;
          if (!cgbResponse.success) {
            throw new CgbApiError(
              cgbResponse.error || cgbResponse.message || 'CGB API error',
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
            throw new CgbApiError(message, status, error.response.data);
          }
          
          this.logger.warn(`CGB API ${method} ${endpoint} failed (attempt ${attempt}): ${status} ${message}`);
        } else {
          this.logger.warn(`CGB API ${method} ${endpoint} failed (attempt ${attempt}): ${error.message}`);
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