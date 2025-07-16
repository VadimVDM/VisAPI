import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { register as globalRegistry } from 'prom-client';
import axios from 'axios';

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

      const response = await axios.post(this.url, metrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
        auth: {
          username: this.username,
          password: this.password,
        },
        timeout: 10000,
      });

      if (response.status === 200 || response.status === 204) {
        this.logger.debug('Successfully pushed metrics to Grafana Cloud');
      } else {
        this.logger.warn(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to push metrics to Grafana Cloud',
        error.message
      );
    }
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Stopped remote write');
    }
  }
}
