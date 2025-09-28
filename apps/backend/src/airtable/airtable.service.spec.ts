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
    return Promise.resolve(this.store.has(key) ? (this.store.get(key) as unknown as T) : null);
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.store.set(key, value as unknown as AirtableLookupResponseDto);
    return Promise.resolve();
  }
}

class StatusMessageGeneratorStub {
  async generateStatusMessage(fields: Record<string, unknown>): Promise<string | null> {
    const status = fields['Status'] as string;
    const domainBranch = fields['Domain Branch'] as string;

    // Only generate for IL domain with Active status
    if (domainBranch === 'IL 🇮🇱' && status?.includes('Active')) {
      return '*סטטוס עדכני: הבקשה ממתינה לאישור* ⏳\n\nבקשתכם עבור תיירות לחצי שנה לבריטניה הוגשה בהצלחה ונמצאת כעת בטיפול מול הרשויות הממשלתיות בבריטניה 🇬🇧\n\nבדרך כלל התהליך נמשך עד 3 ימי עסקים.\n\nנעדכן אתכם כאן בוואטסאפ ובמייל מיד עם קבלת האישור.';
    }
    return null;
  }
}

describe('AirtableLookupService', () => {
  const createService = (
    options?: {
      config?: ConfigServiceStub;
      cache?: CacheServiceStub;
      statusMessageGenerator?: StatusMessageGeneratorStub;
    },
  ) => {
    const config =
      options?.config ?? new ConfigServiceStub('key', 'base', 'tbl123');
    const cache = options?.cache ?? new CacheServiceStub();
    const statusMessageGenerator = options?.statusMessageGenerator ?? new StatusMessageGeneratorStub();

    const service = new AirtableLookupService(
      config as unknown as ConfigService,
      cache as unknown as CacheServiceStub,
      statusMessageGenerator as any,
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
    const pythonRecord = {
      id: 'rec123',
      fields: {
        ID: 'IL250928IN7',
        Email: 'test@example.com',
        Status: 'Active 🔵',
        Name: 'Test User',
        Phone: '1234567890',
        'Domain Branch': 'US 🇺🇸'
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    };

    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [pythonRecord],
        },
      });

    const result = await service.lookup('email', 'test@example.com');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    // Should contain Status, Email, and any other verification fields
    expect(result.record).toEqual({
      id: 'rec123',
      fields: {
        ID: 'IL250928IN7',
        Status: 'Active 🔵',
        Email: 'test@example.com',
        Phone: '1234567890',
        'Domain Branch': 'US 🇺🇸'
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    });

    // Ensure result was cached
    const cacheKey = cache.generateKey('airtable:lookup', [
      'email',
      'test@example.com',
    ]);
    await expect(cache.get(cacheKey)).resolves.toEqual(result);
  });

  it('maps a single record by phone to found status', async () => {
    const { service, cache } = createService();
    const pythonRecord = {
      id: 'rec456',
      fields: {
        ID: 'IL250928LK1',
        Phone: '972507921512',
        Status: 'Processing 🟡',
        Name: 'Phone User',
        Email: 'phoneuser@example.com',
        'Domain Branch': 'IL 🇮🇱'
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    };

    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [pythonRecord],
        },
      });

    const result = await service.lookup('phone' as AirtableLookupField, '972507921512');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    // Should contain Status, Phone, Email, and any other verification fields
    expect(result.record).toEqual({
      id: 'rec456',
      fields: {
        ID: 'IL250928LK1',
        Status: 'Processing 🟡',
        Phone: '972507921512',
        Email: 'phoneuser@example.com',
        'Domain Branch': 'IL 🇮🇱'
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    });

    // Ensure result was cached
    const cacheKey = cache.generateKey('airtable:lookup', [
      'phone',
      '972507921512',
    ]);
    await expect(cache.get(cacheKey)).resolves.toEqual(result);
  });

  it('retries phone search with Israeli number variant when no results', async () => {
    const { service, cache } = createService();
    const pythonRecord = {
      id: 'rec789',
      fields: {
        ID: 'IL250928MA3',
        Phone: '9720507921512',  // Stored with zero
        Status: 'Completed ✅',
        Name: 'Israeli User',
        Email: 'israeli@example.com',
        'Domain Branch': 'IL 🇮🇱'
      },
      createdTime: '2024-01-02T00:00:00.000Z',
    };

    const executeSpy = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [pythonRecord],
          meta: {
            used_phone_variant: true,
            variant_used: '9720507921512'
          }
        },
      });

    // Search with number without zero, but it finds the one with zero
    const result = await service.lookup('phone' as AirtableLookupField, '972507921512');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    // Should contain Status, Phone, Email, and any other verification fields
    expect(result.record).toEqual({
      id: 'rec789',
      fields: {
        ID: 'IL250928MA3',
        Status: 'Completed ✅',
        Phone: '9720507921512',
        Email: 'israeli@example.com',
        'Domain Branch': 'IL 🇮🇱'
      },
      createdTime: '2024-01-02T00:00:00.000Z',
    });

    // Verify the script was called with the correct value
    expect(executeSpy).toHaveBeenCalledWith(
      JSON.stringify({ field: 'phone', value: '972507921512' }),
      expect.any(Object)
    );
  });

  it('generates status message for IL orders with Active status', async () => {
    const { service, cache } = createService();
    const pythonRecord = {
      id: 'recIL123',
      fields: {
        ID: 'IL250928UK1',
        Email: 'israeli@example.com',
        Status: 'Active 🔵',
        Phone: '972507921512',
        'Domain Branch': 'IL 🇮🇱',
        Country: 'United Kingdom',
        Type: 'eVisa',
        Intent: 'Tourism',
        Validity: '6 Months',
        Priority: 'Regular',
        'Processing Time': 3,
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    };

    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [pythonRecord],
        },
      });

    const result = await service.lookup('email', 'israeli@example.com');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    expect(result.statusMessage).toBeDefined();
    expect(result.statusMessage).toContain('*סטטוס עדכני: הבקשה ממתינה לאישור* ⏳');
    expect(result.statusMessage).toContain('בריטניה');
    expect(result.statusMessage).toContain('🇬🇧');
    expect(result.statusMessage).toContain('3 ימי עסקים');
  });

  it('includes applications data for Issue status', async () => {
    const { service } = createService();
    const pythonRecord = {
      id: 'recIssue123',
      fields: {
        ID: 'IL250928IN9',
        Email: 'issue@example.com',
        Status: 'Issue 🛑',
        Phone: '972501234567',
        'Domain Branch': 'IL 🇮🇱',
        'Applications ↗': ['recApp1', 'recApp2'],
      },
      expanded: {
        Applications_expanded: [
          {
            id: 'recApp1',
            fields: {
              UUID: 'app_IL250928IN9-1',
              Status: 'Issue - Missing Document',
              'Applicant Name': 'John Doe',
              'Passport Number': '123456789',
              'Issue Description': 'Passport photo unclear',
            },
          },
          {
            id: 'recApp2',
            fields: {
              UUID: 'app_IL250928IN9-2',
              Status: 'Issue - Incorrect Info',
              'Applicant Name': 'Jane Doe',
              'Passport Number': '987654321',
              'Issue Description': 'Birth date mismatch',
            },
          },
        ],
      },
      createdTime: '2024-01-01T00:00:00.000Z',
    };

    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(AirtableLookupService.prototype as any, 'executePythonScript')
      .mockResolvedValue({
        response: {
          status: 'ok',
          matches: [pythonRecord],
        },
      });

    const result = await service.lookup('email', 'issue@example.com');

    expect(result.status).toBe(AirtableLookupStatus.FOUND);
    expect(result.applications).toBeDefined();
    expect(result.applications).toHaveLength(2);
    expect(result.applications![0]).toHaveProperty('id', 'recApp1');
    expect(result.applications![0].fields).toHaveProperty('Status', 'Issue - Missing Document');
    expect(result.applications![1]).toHaveProperty('id', 'recApp2');
    expect(result.applications![1].fields).toHaveProperty('Status', 'Issue - Incorrect Info');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AirtableLookupService.prototype as any,
      'executePythonScript',
    );

    const result = await service.lookup('email', 'cached@example.com');

    expect(result).toEqual(cachedResponse);
    expect(pythonSpy).not.toHaveBeenCalled();
  });
});
