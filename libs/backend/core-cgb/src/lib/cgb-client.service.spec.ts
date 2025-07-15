import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CgbClientService, CgbApiError } from './cgb-client.service';
import { Contact, CreateContactDto, Flow, WHATSAPP_CHANNEL_NAME } from '@visapi/shared-types';

describe('CgbClientService', () => {
  let service: CgbClientService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    apiUrl: 'https://api.test.com',
    apiKey: 'test_api_key',
    timeout: 30000,
    retryAttempts: 3,
  };

  const mockContact: Contact = {
    id: 123,
    page_id: 456,
    first_name: 'John',
    last_name: 'Doe',
    channel: 5,
    profile_pic: '',
    locale: 'en',
    gender: 1,
    timezone: 0,
    last_sent: 1640995200000,
    last_delivered: 1640995200000,
    last_seen: 1640995200000,
    last_interaction: 1640995200000,
    subscribed_date: '2022-01-01 00:00:00',
    subscribed: 1,
    tags: [],
    custom_fields: [],
    phone: '+1234567890',
  };

  beforeEach(async () => {
    const mockHttpService = {
      request: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'cgb.apiUrl': mockConfig.apiUrl,
          'cgb.apiKey': mockConfig.apiKey,
          'cgb.timeout': mockConfig.timeout,
          'cgb.retryAttempts': mockConfig.retryAttempts,
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CgbClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CgbClientService>(CgbClientService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findContactByPhone', () => {
    it('should find contact by phone number', async () => {
      const mockResponse: AxiosResponse = {
        data: { contact: mockContact, found: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.findContactByPhone('+1234567890');

      expect(result).toEqual(mockContact);
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${mockConfig.apiUrl}/contacts/find_by_custom_field`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
        params: {
          field_id: 'phone',
          value: '+1234567890',
        },
      });
    });

    it('should return null when contact not found', async () => {
      const mockResponse: AxiosResponse = {
        data: { contact: null, found: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.findContactByPhone('+1234567890');

      expect(result).toBeNull();
    });

    it('should return null on 404 error', async () => {
      const error = {
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
      };

      httpService.request.mockReturnValue(throwError(() => error));

      const result = await service.findContactByPhone('+1234567890');

      expect(result).toBeNull();
    });

    it('should throw CgbApiError on other errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      httpService.request.mockReturnValue(throwError(() => error));

      await expect(service.findContactByPhone('+1234567890')).rejects.toThrow(CgbApiError);
    });
  });

  describe('createContact', () => {
    it('should create a new contact', async () => {
      const createDto: CreateContactDto = {
        phone: '+1234567890',
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockResponse: AxiosResponse = {
        data: mockContact,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.createContact(createDto);

      expect(result).toEqual(mockContact);
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${mockConfig.apiUrl}/contacts`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
        data: createDto,
      });
    });
  });

  describe('sendTextMessage', () => {
    it('should send text message to contact', async () => {
      const contactId = 123;
      const text = 'Hello, this is a test message';

      const mockResponse: AxiosResponse = {
        data: { success: true, message_id: 'msg_123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.sendTextMessage(contactId, text);

      expect(result).toEqual({ success: true, message_id: 'msg_123' });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${mockConfig.apiUrl}/contacts/${contactId}/send/text`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
        data: {
          text,
          channel: WHATSAPP_CHANNEL_NAME,
        },
      });
    });
  });

  describe('sendFileMessage', () => {
    it('should send file message to contact', async () => {
      const contactId = 123;
      const fileUrl = 'https://example.com/image.jpg';
      const fileType = 'image';

      const mockResponse: AxiosResponse = {
        data: { success: true, message_id: 'msg_124' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.sendFileMessage(contactId, fileUrl, fileType);

      expect(result).toEqual({ success: true, message_id: 'msg_124' });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${mockConfig.apiUrl}/contacts/${contactId}/send/file`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
        data: {
          url: fileUrl,
          type: fileType,
          channel: WHATSAPP_CHANNEL_NAME,
        },
      });
    });
  });

  describe('sendFlow', () => {
    it('should send flow to contact', async () => {
      const contactId = 123;
      const flowId = 456;

      const mockResponse: AxiosResponse = {
        data: { success: true, message_id: 'msg_125' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.sendFlow(contactId, flowId);

      expect(result).toEqual({ success: true, message_id: 'msg_125' });
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `${mockConfig.apiUrl}/contacts/${contactId}/send/${flowId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
      });
    });
  });

  describe('getFlows', () => {
    it('should fetch available flows', async () => {
      const mockFlows: Flow[] = [
        { id: 1, name: 'Welcome Flow', description: 'Welcome new users' },
        { id: 2, name: 'Visa Approved', description: 'Notify visa approval' },
      ];

      const mockResponse: AxiosResponse = {
        data: mockFlows,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const result = await service.getFlows();

      expect(result).toEqual(mockFlows);
      expect(httpService.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${mockConfig.apiUrl}/accounts/flows`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockConfig.apiKey}`,
        },
        timeout: mockConfig.timeout,
      });
    });
  });

  describe('retry mechanism', () => {
    it('should retry on network errors', async () => {
      const networkError = new Error('Network timeout');
      const successResponse: AxiosResponse = {
        data: mockContact,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request
        .mockReturnValueOnce(throwError(() => networkError))
        .mockReturnValueOnce(throwError(() => networkError))
        .mockReturnValueOnce(of(successResponse));

      const result = await service.findContactByPhone('+1234567890');

      expect(result).toEqual(mockContact);
      expect(httpService.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors (4xx)', async () => {
      const clientError = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
      };

      httpService.request.mockReturnValue(throwError(() => clientError));

      await expect(service.findContactByPhone('+1234567890')).rejects.toThrow(CgbApiError);
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });

    it('should handle CGB API success: false responses', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: false, error: 'Invalid phone number' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      await expect(service.findContactByPhone('+1234567890')).rejects.toThrow(CgbApiError);
    });
  });

  describe('configuration validation', () => {
    it('should warn when API key is not configured', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      configService.get.mockImplementation((key: string) => {
        if (key === 'cgb.apiKey') return '';
        return mockConfig[key.replace('cgb.', '')];
      });

      // Create new instance to trigger constructor
      new CgbClientService(httpService, configService);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CGB_API_KEY not configured')
      );

      warnSpy.mockRestore();
    });
  });
});