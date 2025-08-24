import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';
import { PinoLogger } from 'nestjs-pino';

describe('StorageService', () => {
  let service: StorageService;
  let mockSupabaseService: any;
  let mockLogger: any;

  beforeEach(async () => {
    // Mock Supabase storage client
    const mockStorage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      remove: jest.fn(),
      createSignedUrl: jest.fn(),
      getPublicUrl: jest.fn(),
      list: jest.fn(),
    };

    mockSupabaseService = {
      serviceClient: {
        storage: mockStorage,
      },
      client: {
        storage: {
          from: jest.fn().mockReturnValue({
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: 'https://example.com/public/test.pdf' },
            }),
          }),
        },
      },
    };

    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockBuffer = Buffer.from('test content');
      const mockPath = 'test/file.pdf';

      mockSupabaseService.serviceClient.storage.upload.mockResolvedValue({
        data: { path: mockPath },
        error: null,
      });

      mockSupabaseService.serviceClient.storage.createSignedUrl.mockResolvedValue(
        {
          data: { signedUrl: 'https://example.com/signed/test.pdf' },
          error: null,
        },
      );

      const result = await service.uploadFile(mockPath, mockBuffer);

      expect(result).toEqual({
        path: mockPath,
        publicUrl: 'https://example.com/public/test.pdf',
        signedUrl: 'https://example.com/signed/test.pdf',
      });

      expect(
        mockSupabaseService.serviceClient.storage.upload,
      ).toHaveBeenCalledWith(mockPath, mockBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });
    });

    it('should handle upload errors', async () => {
      const mockError = new Error('Upload failed');
      mockSupabaseService.serviceClient.storage.upload.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        service.uploadFile('test.pdf', Buffer.from('test')),
      ).rejects.toThrow(mockError);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockSupabaseService.serviceClient.storage.remove.mockResolvedValue({
        error: null,
      });

      await expect(service.deleteFile('test.pdf')).resolves.not.toThrow();

      expect(
        mockSupabaseService.serviceClient.storage.remove,
      ).toHaveBeenCalledWith(['test.pdf']);
    });
  });

  describe('createSignedUrl', () => {
    it('should create signed URL with default expiry', async () => {
      const mockSignedUrl = 'https://example.com/signed/test.pdf';
      mockSupabaseService.serviceClient.storage.createSignedUrl.mockResolvedValue(
        {
          data: { signedUrl: mockSignedUrl },
          error: null,
        },
      );

      const result = await service.createSignedUrl('test.pdf');

      expect(result).toBe(mockSignedUrl);
      expect(
        mockSupabaseService.serviceClient.storage.createSignedUrl,
      ).toHaveBeenCalledWith(
        'test.pdf',
        86400, // 24 hours
      );
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      mockSupabaseService.serviceClient.storage.list.mockResolvedValue({
        data: [{ name: 'test.pdf' }],
        error: null,
      });

      const result = await service.fileExists('folder/test.pdf');

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      mockSupabaseService.serviceClient.storage.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.fileExists('folder/test.pdf');

      expect(result).toBe(false);
    });
  });
});
