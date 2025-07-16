import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { register as globalRegistry } from 'prom-client';
import { pushTimeseries } from 'prometheus-remote-write';

@Injectable()
export class RemoteWriteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemoteWriteService.name);
  private intervalId: NodeJS.Timeout;
  private readonly enabled: boolean;
  private readonly url: string;
  private readonly username: string;
  private readonly password: string;
  private readonly pushIntervalMs: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      'GRAFANA_REMOTE_WRITE_ENABLED',
      false
    );
    this.url = this.configService.get<string>('GRAFANA_PROMETHEUS_URL');
    this.username = this.configService.get<string>(
      'GRAFANA_PROMETHEUS_USERNAME'
    );
    this.password = this.configService.get<string>(
      'GRAFANA_PROMETHEUS_PASSWORD'
    );
    this.pushIntervalMs = this.configService.get<number>(
      'GRAFANA_PUSH_INTERVAL_MS',
      30000
    ); // 30 seconds default
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Remote write is disabled');
      return;
    }

    if (!this.url || !this.username || !this.password) {
      this.logger.warn('Remote write is enabled but credentials are missing');
      return;
    }

    this.startPushing();
  }

  private startPushing() {
    this.logger.log(
      `Starting remote write to ${this.url} every ${this.pushIntervalMs}ms`
    );

    // Initial push
    this.pushMetrics();

    // Schedule regular pushes
    this.intervalId = setInterval(() => {
      this.pushMetrics();
    }, this.pushIntervalMs);
  }

  private async pushMetrics() {
    try {
      const metrics = await globalRegistry.metrics();

      // Parse the metrics and convert them to time series format
      const timeSeries = this.parseMetricsToTimeSeries(metrics);
      
      if (timeSeries.length === 0) {
        this.logger.warn('No valid metrics found to push');
        return;
      }

      this.logger.debug(`Pushing ${timeSeries.length} time series to Grafana Cloud`);
      
      // Send using the remote write protocol
      await pushTimeseries(timeSeries, {
        url: this.url,
        auth: {
          username: this.username,
          password: this.password,
        },
      });
      
      this.logger.debug('Successfully pushed metrics to Grafana Cloud');
    } catch (error) {
      this.logger.error(
        'Failed to push metrics to Grafana Cloud',
        error.message
      );
      
      // Log more details about the error
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  private parseMetricsToTimeSeries(metrics: string): Array<{
    labels: { __name__: string; [key: string]: string };
    samples: Array<{ value: number; timestamp: number }>;
  }> {
    const lines = metrics.trim().split('\n');
    const timeSeries: Array<{
      labels: { __name__: string; [key: string]: string };
      samples: Array<{ value: number; timestamp: number }>;
    }> = [];
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
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\{[^}]*\})?) ([0-9.-]+)$/);
      if (!match) {
        continue;
      }

      const [, metricWithLabels, value] = match;
      const [metricName, labelsStr] = metricWithLabels.split('{');
      
      // Parse labels - start with __name__
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

      timeSeries.push({
        labels,
        samples: [
          {
            value: parseFloat(value),
            timestamp,
          },
        ],
      });
    }

    return timeSeries;
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Stopped remote write');
    }
  }
}
