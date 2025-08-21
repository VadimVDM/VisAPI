import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { register as globalRegistry } from 'prom-client';
import { pushTimeseries, Timeseries } from 'prometheus-remote-write';

@Injectable()
export class RemoteWriteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemoteWriteService.name);
  private intervalId: NodeJS.Timeout | undefined;
  private readonly enabled: boolean;
  private readonly url: string;
  private readonly username: string;
  private readonly password: string;
  private readonly pushIntervalMs: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      'GRAFANA_REMOTE_WRITE_ENABLED',
      false,
    );
    this.url = this.configService.get<string>('GRAFANA_PROMETHEUS_URL') || '';
    this.username =
      this.configService.get<string>('GRAFANA_PROMETHEUS_USERNAME') || '';
    this.password =
      this.configService.get<string>('GRAFANA_PROMETHEUS_PASSWORD') || '';
    this.pushIntervalMs = this.configService.get<number>(
      'GRAFANA_PUSH_INTERVAL_MS',
      30000,
    ); // 30 seconds default
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Remote write is disabled');
      return;
    }

    const isCloudEnabled = this.configService.get<boolean>(
      'GRAFANA_CLOUD_ENABLED',
      true,
    );

    if (isCloudEnabled) {
      // Grafana Cloud mode - requires auth
      if (!this.url || !this.username || !this.password) {
        this.logger.warn(
          'Remote write is enabled but cloud credentials are missing',
        );
        return;
      }
    } else {
      // Self-hosted mode - only needs URL
      if (!this.url) {
        this.logger.warn(
          'Remote write is enabled but Prometheus URL is missing',
        );
        return;
      }
    }

    this.startPushing();
  }

  private startPushing(): void {
    this.logger.log(
      `Starting remote write to ${this.url} every ${this.pushIntervalMs}ms`,
    );

    // Initial push
    void this.pushMetrics();

    // Schedule regular pushes
    this.intervalId = setInterval(() => {
      void this.pushMetrics();
    }, this.pushIntervalMs);
  }

  private async pushMetrics(): Promise<void> {
    try {
      const metrics = await globalRegistry.metrics();

      // Filter to only include visapi_ metrics to reduce payload size
      const filteredMetrics = metrics
        .split('\n')
        .filter(
          (line) =>
            line.includes('visapi_') ||
            line.startsWith('# TYPE visapi_') ||
            line.startsWith('# HELP visapi_'),
        )
        .join('\n');

      if (!filteredMetrics.trim()) {
        this.logger.warn('No visapi_ metrics found to push');
        return;
      }

      this.logger.debug(
        `Converting ${filteredMetrics.split('\n').length} lines of metrics to protobuf format`,
      );

      // Parse metrics and convert to protobuf TimeSeries format
      const timeSeries = this.parseMetricsToTimeSeries(filteredMetrics);

      if (timeSeries.length === 0) {
        this.logger.warn('No time series data parsed from metrics');
        return;
      }

      const isCloudEnabled = this.configService.get<boolean>(
        'GRAFANA_CLOUD_ENABLED',
        true,
      );

      this.logger.debug(
        `Pushing ${timeSeries.length} time series to ${isCloudEnabled ? 'Grafana Cloud' : 'self-hosted Grafana'}`,
      );

      // Configure based on cloud vs self-hosted
      const config = isCloudEnabled
        ? {
            url: this.url,
            auth: {
              username: this.username,
              password: this.password,
            },
            timeout: 10000,
            verbose: false,
            headers: {
              'User-Agent': 'visapi-remote-write/1.0',
            },
          }
        : {
            url:
              this.url || 'http://grafana.railway.internal:9090/api/v1/write',
            timeout: 10000,
            verbose: false,
            headers: {
              'User-Agent': 'visapi-remote-write/1.0',
            },
          };

      // Use the prometheus-remote-write library to push metrics
      const result = await pushTimeseries(timeSeries, config);

      const destination = isCloudEnabled
        ? 'Grafana Cloud'
        : 'self-hosted Grafana';
      if (result.status === 200 || result.status === 204) {
        this.logger.debug(`Successfully pushed metrics to ${destination}`);
      } else {
        this.logger.error(
          `Failed to push metrics to ${destination}: ${result.status} ${result.statusText}`,
        );
        if (result.errorMessage) {
          this.logger.error(`Error message: ${result.errorMessage}`);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const isCloudEnabled = this.configService.get<boolean>(
        'GRAFANA_CLOUD_ENABLED',
        true,
      );
      const destination = isCloudEnabled
        ? 'Grafana Cloud'
        : 'self-hosted Grafana';
      this.logger.error(
        `Failed to push metrics to ${destination}`,
        errorMessage,
      );

      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as {
          status?: number;
          data?: unknown;
          headers?: unknown;
        };
        this.logger.error(`Status: ${response.status}`);
        this.logger.error(`Response: ${JSON.stringify(response.data)}`);
        if (response.headers) {
          this.logger.error(`Headers: ${JSON.stringify(response.headers)}`);
        }
      }
    }
  }

  private parseMetricsToTimeSeries(metrics: string): Timeseries[] {
    const lines = metrics.trim().split('\n');
    const timeSeries: Timeseries[] = [];
    const timestamp = Date.now();

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) {
        continue;
      }

      // Only process visapi_ metrics
      if (!line.includes('visapi_')) {
        continue;
      }

      // Parse metric line: metric_name{labels} value
      const match = line.match(
        /^([a-zA-Z_][a-zA-Z0-9_]*(?:\{[^}]*\})?) ([0-9.-]+)$/,
      );
      if (!match) {
        continue;
      }

      const [, metricWithLabels, value] = match;
      const [metricName, labelsStr] = metricWithLabels.split('{');

      // Create labels object for the timeseries
      const labels: { __name__: string; [key: string]: string } = {
        __name__: metricName,
      };

      if (labelsStr) {
        const labelPairs = labelsStr.slice(0, -1).split(','); // Remove closing }
        for (const pair of labelPairs) {
          const [key, val] = pair.split('=');
          if (key && val) {
            labels[key.trim()] = val.trim().replace(/^"(.*)"$/, '$1'); // Remove quotes
          }
        }
      }

      // Add app and version labels
      labels.app = 'visapi';
      labels.version = process.env.npm_package_version || 'unknown';

      // Create TimeSeries entry
      timeSeries.push({
        labels,
        samples: [
          {
            value: parseFloat(value),
            timestamp: timestamp,
          },
        ],
      });
    }

    return timeSeries;
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Stopped remote write');
    }
  }
}
