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

  // Mapping of field names to CBB field IDs
  private readonly fieldIdMap: Record<string, string> = {
    'Email': '-12',
    'email': '-12',
    'Phone Number': '-8',
    'phone': '-8',
    'customer_name': '779770',
    'visa_country': '877737',
    'visa_type': '527249',
    'OrderNumber': '459752',
    'visa_quantity': '949873',
    'order_urgent': '763048',
    'order_priority': '470125',
    'order_date': '661549',
    'order_days': '271948', // Processing days for template
    'visa_intent': '837162',
    'visa_entries': '863041',
    'visa_validity': '816014',
    'visa_flag': '824812',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseURL = this.configService.get<string>('cbb.apiUrl') ?? '';
    this.apiKey = this.configService.get<string>('cbb.apiKey') ?? '';
    this.timeout = this.configService.get<number>('cbb.timeout') ?? 30000;
    this.retryAttempts = this.configService.get<number>('cbb.retryAttempts') ?? 3;

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
   * Note: CBB returns a response even for non-existent contacts, but with empty fields
   * We need to check if the contact actually has data to determine if it exists
   */
  async getContactById(id: string): Promise<CBBContact | null> {
    try {
      this.logger.debug(`Getting contact by ID: ${id}`);
      
      const response = await this.makeRequest<CBBContact>('GET', `/contacts/${id}`);
      const contact = response.data;
      
      // CBB returns an object even for non-existent contacts, but with empty fields
      // Check if this is a real contact by verifying it has actual data
      if (!contact.phone || contact.phone === '') {
        this.logger.debug(`Contact ${id} doesn't really exist (empty phone field)`);
        return null;
      }
      
      return contact;
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
      
      // Convert custom fields to CBB actions format
      const actions = [];
      if (data.cufs) {
        for (const [fieldName, fieldValue] of Object.entries(data.cufs)) {
          if (fieldValue !== undefined && fieldValue !== null) {
            actions.push({
              action: 'set_field_value',
              field_name: fieldName,
              value: String(fieldValue),
            });
          }
        }
      }

      const payload: any = {
        phone: data.phone,
        email: data.email,
        first_name: data.name,  // Use full name as first name
        last_name: '',  // Leave last name empty
        actions: actions,
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

      const response = await this.makeRequest<any>('POST', '/contacts', {
        data: payload,
      });

      // CBB returns success: true and data.id with the phone number as ID
      const contactId = response.data?.data?.id || response.data?.id || data.phone;
      this.logger.debug(`Contact created with ID: ${contactId}`);
      
      // Return a properly formatted CBBContact object
      return {
        id: contactId,
        phone: data.phone,
        name: data.name ?? '',
        email: data.email ?? '',
        hasWhatsApp: true,
        customFields: data.cufs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create contact for ${data.phone}:`, error);
      throw error;
    }
  }

  /**
   * Update contact custom fields ONLY
   * CBB API requires using field ID (not field name) and sending value as formData
   */
  async updateContactFields(id: string, cufs: Record<string, any>): Promise<CBBContact> {
    try {
      this.logger.debug(`Updating contact custom fields for ID: ${id}`);
      
      // Update each custom field individually using field ID
      for (const [fieldName, fieldValue] of Object.entries(cufs)) {
        try {
          // Get the field ID from our mapping
          const fieldId = this.fieldIdMap[fieldName];
          if (!fieldId) {
            this.logger.warn(`Unknown field name: ${fieldName}, skipping update`);
            continue;
          }

          this.logger.debug(`Updating custom field ${fieldName} (ID: ${fieldId}) = ${fieldValue}`);
          
          // Use form data as CBB expects
          const formData = new URLSearchParams();
          formData.append('value', String(fieldValue));
          
          await this.makeRequest('POST', `/contacts/${id}/custom_fields/${fieldId}`, {
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
   * Update contact - CBB API only allows updating custom fields for existing contacts
   * Basic fields (first_name, email, etc.) cannot be updated after creation
   */
  async updateContactComplete(data: CBBContactData): Promise<CBBContact> {
    try {
      this.logger.debug(`Updating contact ID: ${data.id}`);
      
      // Check if basic fields differ - if so, warn that they can't be updated
      if (data.name || data.email) {
        this.logger.warn(
          `CBB API limitation: Cannot update basic fields (name, email) for existing contacts. ` +
          `Contact ${data.id} will keep its original name and email. Only custom fields will be updated.`
        );
      }
      
      // Update custom fields only
      if (data.cufs && Object.keys(data.cufs).length > 0) {
        await this.updateContactFields(data.id, data.cufs);
      }
      
      // Ensure we use the phone number as the contact ID (which is how CBB works)
      const contactId = data.id || data.phone;
      
      // Return the contact data we have (CBB doesn't return updated contact from field updates)
      return {
        id: contactId,
        phone: data.phone,
        name: data.name ?? '',
        email: data.email ?? '',
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
   * We assume all contacts have WhatsApp capability since CBB is a WhatsApp platform
   */
  async validateWhatsApp(phone: string): Promise<boolean> {
    try {
      this.logger.debug(`Validating WhatsApp for ${phone} - assuming available (CBB is WhatsApp-first)`);
      
      // CBB is a WhatsApp messaging platform, so we assume all contacts can receive WhatsApp
      // The actual validation happens when we try to send the message
      return true;
    } catch (error) {
      this.logger.warn(`Error in WhatsApp validation for ${phone}:`, error);
      // Even on error, we return true to attempt sending since CBB will handle the actual validation
      return true;
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

    let lastError: Error = new Error('All retry attempts failed');

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.logger.debug(`CBB API ${method} ${endpoint} (attempt ${attempt}/${this.retryAttempts})`);

        const config = {
          method,
          url,
          headers,
          timeout: this.timeout,
          ...(options.data ? { data: options.data } : {}),
          ...(options.params ? { params: options.params } : {}),
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
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        lastError = errorInstance;
        
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          const status = axiosError.response?.status;
          const message = axiosError.response?.data?.error || axiosError.response?.data?.message || errorInstance.message;
          
          // Don't retry on client errors (400-499)
          if (status >= 400 && status < 500) {
            throw new CbbApiError(message, status, axiosError.response?.data);
          }
          
          this.logger.warn(`CBB API ${method} ${endpoint} failed (attempt ${attempt}): ${status} ${message}`);
        } else {
          this.logger.warn(`CBB API ${method} ${endpoint} failed (attempt ${attempt}): ${errorInstance.message}`);
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

  /**
   * Send WhatsApp templated message via CBB send_content endpoint
   * Uses WhatsApp Business API template format with variables
   * @param contactId The contact ID (phone number)
   * @param templateName The template name (e.g., 'order_confirmation_global')
   * @param languageCode The language code (e.g., 'he' for Hebrew)
   * @param parameters Array of template parameters in order
   */
  async sendWhatsAppTemplate(
    contactId: string, 
    templateName: string, 
    languageCode: string, 
    parameters: string[]
  ): Promise<any> {
    this.logger.debug(`Sending WhatsApp template '${templateName}' to contact ${contactId}`);
    this.logger.debug(`Language: ${languageCode}, Parameters: ${parameters.length}`);
    
    // Build the WhatsApp template message format
    const templatePayload = {
      messages: [
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: contactId,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: [
              {
                type: "body",
                parameters: parameters.map(param => ({
                  type: "text",
                  text: param
                }))
              }
            ]
          }
        }
      ]
    };
    
    try {
      const response = await this.makeRequest('POST', `/contacts/${contactId}/send_content`, {
        data: templatePayload
      });
      
      this.logger.debug(`WhatsApp template '${templateName}' sent successfully to contact ${contactId}`);
      this.logger.debug('CBB Response:', response.data);
      
      return {
        success: true,
        template: templateName,
        contact_id: contactId,
        response: response.data
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template '${templateName}':`, error);
      throw error;
    }
  }

  /**
   * Send WhatsApp order confirmation message
   * Uses the order_confirmation_global template in Hebrew
   */
  async sendOrderConfirmation(
    contactId: string,
    orderData: {
      customerName: string;
      country: string;
      countryFlag: string;
      orderNumber: string;
      visaType: string;
      applicantCount: string;
      paymentAmount: string;
      processingDays: string;
    }
  ): Promise<any> {
    this.logger.debug(`Sending order confirmation to ${contactId} for order ${orderData.orderNumber}`);
    
    // Template parameters in the correct order
    const parameters = [
      orderData.customerName,     // {{1}}
      orderData.country,          // {{2}}
      orderData.countryFlag,      // {{3}}
      orderData.orderNumber,      // {{4}}
      orderData.visaType,         // {{5}}
      orderData.applicantCount,   // {{6}}
      orderData.paymentAmount,    // {{7}}
      orderData.processingDays    // {{8}}
    ];
    
    return this.sendWhatsAppTemplate(
      contactId,
      'order_confirmation_global',
      'he', // Hebrew
      parameters
    );
  }
}