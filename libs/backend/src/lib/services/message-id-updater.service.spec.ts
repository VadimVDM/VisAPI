import { Test, TestingModule } from '@nestjs/testing';
import { MessageIdUpdaterService } from './message-id-updater.service';
import { ConfigService } from '@visapi/core-config';

describe('MessageIdUpdaterService', () => {
  let service: MessageIdUpdaterService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageIdUpdaterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MessageIdUpdaterService>(MessageIdUpdaterService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseCorrelationData', () => {
    describe('CBB Format', () => {
      it('should parse CBB JSON format with contact ID', () => {
        const input = '{"c":"972535777550"}';
        const result = service.parseCorrelationData(input);

        expect(result).toEqual({
          contactId: '972535777550',
        });
      });

      it('should parse CBB format with different phone numbers', () => {
        const testCases = [
          { input: '{"c":"972509400505"}', expected: '972509400505' },
          { input: '{"c":"351913072727"}', expected: '351913072727' },
          { input: '{"c":"972547887623"}', expected: '972547887623' },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = service.parseCorrelationData(input);
          expect(result?.contactId).toBe(expected);
        });
      });

      it('should handle JSON with extra whitespace', () => {
        const input = '{ "c" : "972535777550" }';
        const result = service.parseCorrelationData(input);

        expect(result).toEqual({
          contactId: '972535777550',
        });
      });

      it('should return null for JSON without "c" field', () => {
        const input = '{"phone":"972535777550"}';
        const result = service.parseCorrelationData(input);

        expect(result).toBeNull();
      });

      it('should return null for empty JSON', () => {
        const input = '{}';
        const result = service.parseCorrelationData(input);

        expect(result).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should return null for null input', () => {
        const result = service.parseCorrelationData(null as any);
        expect(result).toBeNull();
      });

      it('should return null for undefined input', () => {
        const result = service.parseCorrelationData(undefined as any);
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = service.parseCorrelationData('');
        expect(result).toBeNull();
      });

      it('should return null for invalid JSON', () => {
        const input = '{invalid json}';
        const result = service.parseCorrelationData(input);

        expect(result).toBeNull();
      });

      it('should return null for non-JSON string', () => {
        const input = 'just a regular string';
        const result = service.parseCorrelationData(input);

        expect(result).toBeNull();
      });

      it('should handle JSON with null "c" value', () => {
        const input = '{"c":null}';
        const result = service.parseCorrelationData(input);

        expect(result).toBeNull();
      });

      it('should handle JSON with numeric "c" value', () => {
        const input = '{"c":972535777550}';
        const result = service.parseCorrelationData(input);

        expect(result).toEqual({
          contactId: 972535777550,
        });
      });
    });
  });

  describe('createCorrelationData', () => {
    it('should create correlation data in delimited format', () => {
      const result = service.createCorrelationData(
        'IL251109VN18',
        '972535777550',
        'order_confirmation',
        'temp_IL251109VN18_order_confirmation_1762715949915',
      );

      expect(result).toBe(
        'IL251109VN18:972535777550:order_confirmation:temp_IL251109VN18_order_confirmation_1762715949915',
      );
    });

    it('should handle special characters in data', () => {
      const result = service.createCorrelationData(
        'IL251109-VN18',
        '972-535-777-550',
        'order:confirmation',
        'temp_IL251109_order_confirmation_1762715949915',
      );

      expect(result).toBe(
        'IL251109-VN18:972-535-777-550:order:confirmation:temp_IL251109_order_confirmation_1762715949915',
      );
    });

    it('should preserve all fields in output', () => {
      const orderId = 'ORDER123';
      const contactId = '972123456789';
      const messageType = 'visa_approval';
      const tempMessageId = 'temp_xyz';

      const result = service.createCorrelationData(
        orderId,
        contactId,
        messageType,
        tempMessageId,
      );

      expect(result).toContain(orderId);
      expect(result).toContain(contactId);
      expect(result).toContain(messageType);
      expect(result).toContain(tempMessageId);
    });
  });
});
