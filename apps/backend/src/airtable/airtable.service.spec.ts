import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { AirtableLookupService, AirtableLookupField } from './airtable.service';
import {
  AirtableLookupStatus,
  AirtableRecordDto,
} from './dto/airtable-lookup-response.dto';

class ConfigServiceStub implements Pick<ConfigService, 'airtableApiKey' | 'airtableBaseId' | 'airtableTableName' | 'airtableView'> {
  constructor(
    private readonly apiKey?: string,
    private readonly baseId?: string,
    private readonly tableName?: string,
    private readonly view?: string,
  ) {}

  get airtableApiKey(): string | undefined {
    return this.apiKey;
  }

  get airtableBaseId(): string | undefined {
    return this.baseId;
  }

  get airtableTableName(): string | undefined {
    return this.tableName;
  }

  get airtableView(): string | undefined {
    return this.view;
  }
}

describe('AirtableLookupService', () => {
  const createService = () =>
    new AirtableLookupService(
      new ConfigServiceStub('key', 'base', 'table') as ConfigService,
    );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when Airtable integration is not configured', async () => {
    const service = new AirtableLookupService(
      new ConfigServiceStub(undefined, undefined, undefined) as ConfigService,
    );

    await expect(service.lookup('email', 'test@example.com')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('maps a single record to found status', async () => {
    const service = createService();
    const record: AirtableRecordDto = {
      id: 'rec123',
      fields: { Email: 'test@example.com' },
      createdTime: '2024-01-01T00:00:00.000Z',
    };

    jest
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [record],
        },
      });

    const result = await service.lookup('email', 'test@example.com');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    expect(result.record).toEqual(record);
  });

  it('returns multiple status when more than one record is returned', async () => {
    const service = createService();
    const matches: AirtableRecordDto[] = [
      {
        id: 'rec1',
        fields: { ID: '123' },
        createdTime: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'rec2',
        fields: { ID: '124' },
        createdTime: '2024-01-02T00:00:00.000Z',
      },
    ];

    jest
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches,
        },
      });

    const result = await service.lookup('orderId' as AirtableLookupField, '123');

    expect(result.status).toBe(AirtableLookupStatus.MULTIPLE);
    expect(result.record).toBeUndefined();
  });

  it('throws when python script returns an error payload', async () => {
    const service = createService();

    jest
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'error',
          error: 'dependency missing',
          code: 'AIRTABLE_IMPORT_ERROR',
        },
      });

    await expect(service.lookup('email', 'test@example.com')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
