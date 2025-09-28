import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { CacheService } from '@visapi/backend-cache';
import { SupabaseService } from '@visapi/core-supabase';
import { ApiKeyRecord } from '@visapi/shared-types';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import {
  AirtableLookupResponseDto,
  AirtableLookupStatus,
  AirtableRecordDto,
} from './dto/airtable-lookup-response.dto';
import { StatusMessageGeneratorService } from './services/status-message-generator.service';

export type AirtableLookupField = 'email' | 'orderId' | 'phone';

export interface LookupContext {
  apiKey?: ApiKeyRecord;
  correlationId?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface PythonLookupSuccess {
  status: 'ok';
  matches: PythonAirtableRecord[];
  meta?: {
    execution_ms?: number;
    used_fallback?: boolean;
  };
}

interface PythonLookupError {
  status: 'error';
  error: string;
  code?: string;
  details?: unknown;
}

type PythonLookupResponse = PythonLookupSuccess | PythonLookupError;

type PythonAirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  expanded?: Record<string, unknown>;
};

@Injectable()
export class AirtableLookupService {
  private readonly logger = new Logger(AirtableLookupService.name);
  private readonly scriptPath = process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'airtable', 'scripts', 'airtable_lookup.py')
    : join(__dirname, 'scripts', 'airtable_lookup.py');
  private readonly executionTimeoutMs = 15000;
  private readonly cacheTtlSeconds = 300; // 5 minutes default TTL

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly statusMessageGenerator: StatusMessageGeneratorService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async lookup(
    field: AirtableLookupField,
    value: string,
    context?: LookupContext,
  ): Promise<AirtableLookupResponseDto> {
    const sanitizedValue = value.trim();
    const startTime = Date.now();
    const correlationId = context?.correlationId || uuidv4();

    if (!sanitizedValue) {
      throw new BadRequestException('Lookup value must not be empty');
    }

    const apiKey = this.configService.airtableApiKey;
    const baseId = this.configService.airtableBaseId;
    const tableId = this.configService.airtableTableId;
    const viewId = this.configService.airtableViewId;

    if (!apiKey || !baseId || !tableId) {
      throw new ServiceUnavailableException(
        'Airtable integration is not configured. Please set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_ID.',
      );
    }

    const cacheKey = this.cacheService.generateKey('airtable:lookup', [
      field,
      sanitizedValue,
    ]);
    const cached = await this.cacheService.get<AirtableLookupResponseDto>(
      cacheKey,
    );
    if (cached) {
      // Log cache hit
      await this.logApiRequest(
        field,
        sanitizedValue,
        200,
        cached,
        Date.now() - startTime,
        true,
        context,
        correlationId,
      );
      return cached;
    }

    if (!existsSync(this.scriptPath)) {
      this.logger.error(`Airtable lookup script missing at ${this.scriptPath}`);
      throw new InternalServerErrorException(
        'Airtable lookup script is missing from deployment bundle.',
      );
    }

    const payload = JSON.stringify({ field, value: sanitizedValue });

    let pythonResponse: PythonLookupResponse;
    try {
      const { response } = await this.executePythonScript(payload, {
        AIRTABLE_API_KEY: apiKey,
        AIRTABLE_BASE_ID: baseId,
        AIRTABLE_TABLE_ID: tableId,
        ...(viewId ? { AIRTABLE_VIEW_ID: viewId } : {}),
      });
      pythonResponse = response;
    } catch (error) {
      this.logger.error('Failed to execute Airtable lookup script', error as Error);
      // Log error
      await this.logApiRequest(
        field,
        sanitizedValue,
        500,
        null,
        Date.now() - startTime,
        false,
        context,
        correlationId,
        error as Error,
      );
      throw new InternalServerErrorException(
        'Failed to execute Airtable lookup integration.',
      );
    }

    if (pythonResponse.status === 'error') {
      const hint =
        pythonResponse.code === 'AIRTABLE_IMPORT_ERROR'
          ? ' Install the pyairtable package in the backend runtime environment.'
          : '';
      const message = pythonResponse.error || 'Airtable lookup failed.';
      this.logger.warn(`Airtable lookup script returned error: ${message}`);
      // Log error response
      await this.logApiRequest(
        field,
        sanitizedValue,
        503,
        pythonResponse,
        Date.now() - startTime,
        false,
        context,
        correlationId,
        new Error(message),
        pythonResponse.code,
      );
      throw new ServiceUnavailableException(message + hint);
    }

    const matches = pythonResponse.matches ?? [];

    let response: AirtableLookupResponseDto;

    if (matches.length === 0) {
      response = {
        status: AirtableLookupStatus.NONE,
        message: 'none',
      };
    } else if (matches.length === 1) {
      const mappedRecord = this.mapRecord(matches[0]);
      const fullFields = matches[0].fields || {};

      // Generate status message for IL orders
      const statusMessage = this.statusMessageGenerator.generateStatusMessage(
        fullFields
      );

      // Extract applications if status is Issue
      let applications: Record<string, unknown>[] | undefined;
      const statusField = fullFields['Status'];
      if (typeof statusField === 'string' && statusField.includes('Issue')) {
        // Check if we have expanded data with Applications
        interface ExpandedData {
          expanded?: {
            Applications_expanded?: Record<string, unknown>[];
          };
        }
        const expandedData = matches[0] as unknown as ExpandedData;
        if (expandedData.expanded?.Applications_expanded) {
          applications = expandedData.expanded.Applications_expanded;
        }
      }

      response = {
        status: AirtableLookupStatus.FOUND,
        message: 'found',
        record: mappedRecord,
        ...(statusMessage && { statusMessage }),
        ...(applications && { applications }),
      };
    } else {
      response = {
        status: AirtableLookupStatus.MULTIPLE,
        message: 'multiple found',
      };
    }

    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);

    // Log successful request
    await this.logApiRequest(
      field,
      sanitizedValue,
      200,
      response,
      Date.now() - startTime,
      false,
      context,
      correlationId,
      undefined,
      undefined,
      response.status === AirtableLookupStatus.FOUND ? (response.record?.id || null) : null,
    );

    return response;
  }

  private mapRecord(record: PythonAirtableRecord): AirtableRecordDto {
    // Extract key fields for verification
    const fields = record.fields ?? {};
    const filteredFields: Record<string, unknown> = {};

    // Include Status, ID, Email, Phone, Domain Branch, and Country fields for status message generation
    const fieldsToInclude = ['Status', 'ID', 'Email', 'Phone', 'Domain Branch', 'Country', 'Type', 'Intent', 'Entry Count', 'Validity', 'Priority', 'Processing Time'];
    for (const fieldName of fieldsToInclude) {
      if (fieldName in fields) {
        filteredFields[fieldName] = fields[fieldName];
      }
    }

    const mapped: AirtableRecordDto = {
      id: record.id,
      fields: filteredFields,
      createdTime: record.createdTime,
    };

    // Do not include expanded data to keep response clean

    return mapped;
  }

  private async executePythonScript(
    payload: string,
    environment: Record<string, string>,
  ): Promise<{ response: PythonLookupResponse }> {
    return new Promise((resolve, reject) => {
      const childEnv: NodeJS.ProcessEnv = {
        ...process.env,
        ...environment,
      };

      const child = spawn('python3', [this.scriptPath], {
        env: childEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        this.logger.error('Airtable lookup python script timed out.');
        child.kill('SIGKILL');
        reject(new Error('Airtable lookup timed out'));
      }, this.executionTimeoutMs);

      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.on('error', (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });

      child.on('close', (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        const stdoutContent = Buffer.concat(stdout).toString('utf8').trim();
        const stderrContent = Buffer.concat(stderr).toString('utf8').trim();

        if (stderrContent) {
          this.logger.warn(`Airtable lookup python stderr: ${stderrContent}`);
        }

        if (code !== 0) {
          const error = new Error(
            `Python script exited with code ${code ?? 'unknown'}`,
          );
          (error as Error & { stdout?: string; stderr?: string }).stdout =
            stdoutContent;
          (error as Error & { stdout?: string; stderr?: string }).stderr =
            stderrContent;
          reject(error);
          return;
        }

        if (!stdoutContent) {
          reject(new Error('No data returned from python script'));
          return;
        }

        try {
          const response = JSON.parse(stdoutContent) as PythonLookupResponse;
          resolve({ response });
        } catch {
          const parseError = new Error('Failed to parse python script output');
          (parseError as Error & { stdout?: string }).stdout = stdoutContent;
          reject(parseError);
        }
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }

  private async logApiRequest(
    field: AirtableLookupField,
    value: string,
    status: number,
    response: AirtableLookupResponseDto | PythonLookupResponse | null,
    responseTimeMs: number,
    cacheHit: boolean,
    context?: LookupContext,
    correlationId?: string,
    error?: Error,
    errorCode?: string,
    recordId?: string | null,
  ): Promise<void> {
    try {
      const logEntry = {
        level: error ? 'error' : 'info',
        message: `Airtable lookup: ${field}=${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`,
        metadata: {
          endpoint: '/api/v1/airtable/lookup',
          method: 'POST',
          request_params: {
            field,
            value: value.length > 100 ? value.substring(0, 100) + '...' : value,
          },
          response_status: status,
          response_data: response ? {
            status: 'status' in response ? response.status : undefined,
            message: 'message' in response ? response.message : undefined,
            hasRecord: !!(response && 'record' in response && response.record),
            hasStatusMessage: !!(response && 'statusMessage' in response && response.statusMessage),
          } : null,
          response_time_ms: responseTimeMs,
          api_key_id: context?.apiKey?.id || null,
          api_key_prefix: context?.apiKey?.prefix || null,
          user_agent: context?.userAgent || null,
          ip_address: context?.ipAddress || null,
          lookup_field: field,
          lookup_value: value.length > 100 ? value.substring(0, 100) + '...' : value,
          lookup_status: response && 'status' in response ? response.status : null,
          record_id: recordId,
          cache_hit: cacheHit,
          error_message: error?.message || null,
          error_code: errorCode || null,
          correlation_id: correlationId,
        },
        pii_redacted: true,
        created_at: new Date().toISOString(),
      };

      // Insert into Supabase logs table
      const { error: insertError } = await this.supabaseService.serviceClient
        .from('logs')
        .insert(logEntry);

      if (insertError) {
        this.logger.error('Failed to log API request to Supabase', insertError);
      }
    } catch (logError) {
      // Don't throw, just log locally
      this.logger.error('Failed to log API request', logError);
    }
  }
}
