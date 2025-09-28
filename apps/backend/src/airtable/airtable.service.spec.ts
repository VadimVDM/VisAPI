import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { AirtableLookupService, AirtableLookupField } from './airtable.service';
import {
  AirtableLookupResponseDto,
  AirtableLookupStatus,
  AirtableRecordDto,
} from './dto/airtable-lookup-response.dto';

class ConfigServiceStub
  implements
    Pick<
      ConfigService,
      'airtableApiKey' | 'airtableBaseId' | 'airtableTableId' | 'airtableViewId'
    >
{
  constructor(
    private readonly apiKey?: string,
    private readonly baseId?: string,
    private readonly tableId?: string,
    private readonly viewId?: string,
  ) {}

  get airtableApiKey(): string | undefined {
    return this.apiKey;
  }

  get airtableBaseId(): string | undefined {
    return this.baseId;
  }

  get airtableTableId(): string | undefined {
    return this.tableId;
  }

  get airtableViewId(): string | undefined {
    return this.viewId;
  }
}

class CacheServiceStub {
  private store = new Map<string, AirtableLookupResponseDto>();

  generateKey(prefix: string, params: unknown): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.store.has(key) ? (this.store.get(key) as unknown as T) : null);
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.store.set(key, value as unknown as AirtableLookupResponseDto);
  }
}

describe('AirtableLookupService', () => {
  const createService = (
    options?: {
      config?: ConfigServiceStub;
      cache?: CacheServiceStub;
    },
  ) => {
    const config =
      options?.config ?? new ConfigServiceStub('key', 'base', 'tbl123');
    const cache = options?.cache ?? new CacheServiceStub();

    const service = new AirtableLookupService(
      config as unknown as ConfigService,
      cache as unknown as any,
    );

    return { service, cache };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when Airtable integration is not configured', async () => {
    const { service } = createService({
      config: new ConfigServiceStub(undefined, undefined, undefined),
    });

    await expect(service.lookup('email', 'test@example.com')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('maps a single record to found status', async () => {
    const { service, cache } = createService();
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

    // Ensure result was cached
    const cacheKey = cache.generateKey('airtable:lookup', [
      'email',
      'test@example.com',
    ]);
    await expect(cache.get(cacheKey)).resolves.toEqual(result);
  });

  it('returns multiple status when more than one record is returned', async () => {
    const { service } = createService();
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
    const { service } = createService();

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

  it('returns cached response when available without hitting python layer', async () => {
    const cache = new CacheServiceStub();
    const cachedResponse: AirtableLookupResponseDto = {
      status: AirtableLookupStatus.NONE,
      message: 'none',
    };
    jest.spyOn(cache, 'get').mockResolvedValue(cachedResponse);

    const { service } = createService({ cache });

    const pythonSpy = jest.spyOn(
      AirtableLookupService.prototype as any,
      'executePythonScript',
    );

    const result = await service.lookup('email', 'cached@example.com');

    expect(result).toEqual(cachedResponse);
    expect(pythonSpy).not.toHaveBeenCalled();
  });
});
