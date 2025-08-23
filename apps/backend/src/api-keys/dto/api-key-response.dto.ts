import { ApiProperty } from '@nestjs/swagger';
import type { ApiKeyRecord } from '@visapi/shared-types';

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the API key',
    example: 'afe8c3a7-3b1d-4c9f-8e2a-1b2c3d4e5f6g',
  })
  id!: string;

  @ApiProperty({
    description: 'Name or description of the API key',
    example: 'Production API Key',
  })
  name!: string;

  @ApiProperty({
    description: 'Key prefix for identification (first 8 characters)',
    example: 'vapi_12345678',
    nullable: true,
  })
  prefix!: string | null;

  @ApiProperty({
    description: 'Array of permission scopes',
    example: ['workflows:read', 'workflows:create'],
    isArray: true,
  })
  scopes!: string[];

  @ApiProperty({
    description: 'Expiration timestamp in ISO 8601 format',
    example: '2024-12-31T23:59:59.999Z',
    nullable: true,
  })
  expires_at!: string | null;

  @ApiProperty({
    description: 'User ID who created this key',
    example: 'user-123',
    nullable: true,
  })
  created_by!: string | null;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 format',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Last usage timestamp in ISO 8601 format',
    example: '2024-01-15T12:30:45.123Z',
    nullable: true,
  })
  last_used_at!: string | null;

  @ApiProperty({
    description: 'Last update timestamp in ISO 8601 format',
    example: '2024-01-15T12:30:45.123Z',
  })
  updated_at!: string;

  /**
   * Creates a response DTO from an API key record, excluding sensitive fields
   */
  static fromRecord(record: ApiKeyRecord): ApiKeyResponseDto {
    const { hashed_secret, ...safeFields } = record;
    void hashed_secret; // Exclude sensitive field
    return safeFields as ApiKeyResponseDto;
  }
}

export class ApiKeyWithSecretResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: 'The raw API key secret (only shown once upon creation)',
    example: 'vapi_12345678_abcdef1234567890abcdef1234567890',
  })
  key!: string;

  @ApiProperty({
    description: 'Security notice about the key',
    example: 'Save this key securely. It will not be shown again.',
  })
  message!: string;

  /**
   * Creates a response DTO with the raw key (for creation response only)
   */
  static fromRecordWithKey(
    record: ApiKeyRecord,
    key: string,
    message: string = 'Save this key securely. It will not be shown again.'
  ): ApiKeyWithSecretResponseDto {
    const baseResponse = ApiKeyResponseDto.fromRecord(record);
    return {
      ...baseResponse,
      key,
      message,
    };
  }
}