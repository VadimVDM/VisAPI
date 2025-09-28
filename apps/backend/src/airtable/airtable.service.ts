import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@visapi/core-config';
import { CacheService } from '@visapi/backend-cache';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  AirtableLookupResponseDto,
  AirtableLookupStatus,
  AirtableRecordDto,
} from './dto/airtable-lookup-response.dto';
import { StatusMessageGeneratorService } from './services/status-message-generator.service';

export type AirtableLookupField = 'email' | 'orderId' | 'phone';

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
  ) {}

  async lookup(
    field: AirtableLookupField,
    value: string,
  ): Promise<AirtableLookupResponseDto> {
    const sanitizedValue = value.trim();

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
      const statusMessage = await this.statusMessageGenerator.generateStatusMessage(
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
}
