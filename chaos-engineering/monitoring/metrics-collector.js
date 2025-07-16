#!/usr/bin/env node

/**
 * Metrics Collector for Chaos Engineering Experiments
 *
 * This script collects system metrics during chaos experiments
 * and outputs them in a structured format for analysis.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MetricsCollector {
  constructor(options = {}) {
    this.apiUrl =
      options.apiUrl || process.env.VISAPI_API_URL || 'http://localhost:3000';
    this.apiKey = options.apiKey || process.env.VISAPI_API_KEY;
    this.prometheusUrl =
      options.prometheusUrl ||
      process.env.PROMETHEUS_URL ||
      'http://localhost:9090';
    this.duration = options.duration || 300; // 5 minutes
    this.interval = options.interval || 10; // 10 seconds
    this.outputFile = options.outputFile || null;
    this.experiment = options.experiment || 'unknown';

    this.metrics = [];
    this.startTime = Date.now();
    this.isRunning = false;

    console.log(`Metrics Collector initialized:`);
    console.log(`  API URL: ${this.apiUrl}`);
    console.log(`  Prometheus URL: ${this.prometheusUrl}`);
    console.log(`  Duration: ${this.duration}s`);
    console.log(`  Interval: ${this.interval}s`);
    console.log(`  Experiment: ${this.experiment}`);
  }

  async start() {
    console.log('Starting metrics collection...');
    this.isRunning = true;

    // Collect baseline metrics
    await this.collectMetrics('baseline');

    // Set up interval collection
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }

      const elapsed = (Date.now() - this.startTime) / 1000;
      if (elapsed >= this.duration) {
        clearInterval(intervalId);
        await this.stop();
        return;
      }

      await this.collectMetrics('interval');
    }, this.interval * 1000);

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, stopping metrics collection...');
      clearInterval(intervalId);
      await this.stop();
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, stopping metrics collection...');
      clearInterval(intervalId);
      await this.stop();
    });
  }

  async collectMetrics(phase) {
    const timestamp = new Date().toISOString();
    const elapsed = (Date.now() - this.startTime) / 1000;

    console.log(
      `[${timestamp}] Collecting metrics (${phase}, elapsed: ${elapsed.toFixed(
        1
      )}s)`
    );

    const metrics = {
      timestamp,
      elapsed,
      phase,
      experiment: this.experiment,
      api: await this.collectApiMetrics(),
      queue: await this.collectQueueMetrics(),
      system: await this.collectSystemMetrics(),
      prometheus: await this.collectPrometheusMetrics(),
    };

    this.metrics.push(metrics);

    // Log key metrics
    this.logKeyMetrics(metrics);
  }

  async collectApiMetrics() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.apiUrl}/api/v1/healthz`);
      const responseTime = Date.now() - startTime;

      return {
        status: response.status,
        responseTime,
        available: response.ok,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 0,
        responseTime: -1,
        available: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async collectQueueMetrics() {
    try {
      const headers = this.apiKey ? { 'X-API-Key': this.apiKey } : {};
      const response = await fetch(`${this.apiUrl}/api/v1/queue/metrics`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          ...data,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          available: false,
          status: response.status,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        available: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: await this.getMemoryUsage(),
        cpu: await this.getCpuUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkStats(),
        processes: await this.getProcessInfo(),
      };

      return metrics;
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async collectPrometheusMetrics() {
    try {
      const queries = [
        'up',
        'http_requests_total',
        'http_request_duration_seconds',
        'queue_depth_total',
        'job_latency_seconds',
      ];

      const metrics = {};

      for (const query of queries) {
        try {
          const response = await fetch(
            `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(
              query
            )}`
          );
          if (response.ok) {
            const data = await response.json();
            metrics[query] = data.data;
          }
        } catch (error) {
          metrics[query] = { error: error.message };
        }
      }

      return {
        available: true,
        queries: metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getMemoryUsage() {
    return new Promise((resolve) => {
      const free = spawn('free', ['-m']);
      let output = '';

      free.stdout.on('data', (data) => {
        output += data.toString();
      });

      free.on('close', () => {
        const lines = output.split('\n');
        const memLine = lines.find((line) => line.startsWith('Mem:'));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          resolve({
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            free: parseInt(parts[3]) || 0,
            available: parseInt(parts[6]) || 0,
            unit: 'MB',
          });
        } else {
          resolve({ error: 'Unable to parse memory info' });
        }
      });
    });
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const top = spawn('top', ['-bn1']);
      let output = '';

      top.stdout.on('data', (data) => {
        output += data.toString();
      });

      top.on('close', () => {
        const lines = output.split('\n');
        const cpuLine = lines.find((line) => line.includes('Cpu(s)'));
        if (cpuLine) {
          const match = cpuLine.match(/(\d+\.?\d*)%.*?(\d+\.?\d*)%.*?id/);
          if (match) {
            resolve({
              used: parseFloat(match[1]) || 0,
              idle: parseFloat(match[2]) || 0,
              unit: '%',
            });
          } else {
            resolve({ error: 'Unable to parse CPU info' });
          }
        } else {
          resolve({ error: 'CPU info not found' });
        }
      });
    });
  }

  async getDiskUsage() {
    return new Promise((resolve) => {
      const df = spawn('df', ['-h', '.']);
      let output = '';

      df.stdout.on('data', (data) => {
        output += data.toString();
      });

      df.on('close', () => {
        const lines = output.split('\n');
        const diskLine = lines[1]; // Skip header
        if (diskLine) {
          const parts = diskLine.split(/\s+/);
          resolve({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountpoint: parts[5],
          });
        } else {
          resolve({ error: 'Unable to parse disk info' });
        }
      });
    });
  }

  async getNetworkStats() {
    return new Promise((resolve) => {
      const netstat = spawn('netstat', ['-i']);
      let output = '';

      netstat.stdout.on('data', (data) => {
        output += data.toString();
      });

      netstat.on('close', () => {
        const lines = output.split('\n');
        const interfaces = [];

        for (let i = 2; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim()) {
            const parts = line.split(/\s+/);
            if (parts.length >= 10) {
              interfaces.push({
                name: parts[0],
                mtu: parts[1],
                rxPackets: parseInt(parts[3]) || 0,
                rxErrors: parseInt(parts[4]) || 0,
                txPackets: parseInt(parts[7]) || 0,
                txErrors: parseInt(parts[8]) || 0,
              });
            }
          }
        }

        resolve({ interfaces });
      });
    });
  }

  async getProcessInfo() {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['aux']);
      let output = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.on('close', () => {
        const lines = output.split('\n');
        const processes = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (
            line.includes('node') ||
            line.includes('worker') ||
            line.includes('main.js')
          ) {
            const parts = line.split(/\s+/);
            if (parts.length >= 11) {
              processes.push({
                pid: parseInt(parts[1]) || 0,
                cpu: parseFloat(parts[2]) || 0,
                memory: parseFloat(parts[3]) || 0,
                command: parts.slice(10).join(' '),
              });
            }
          }
        }

        resolve({ processes });
      });
    });
  }

  logKeyMetrics(metrics) {
    const api = metrics.api;
    const queue = metrics.queue;
    const system = metrics.system;

    console.log(
      `  API: ${api.available ? 'UP' : 'DOWN'} (${api.responseTime}ms)`
    );
    console.log(
      `  Queue: ${queue.available ? 'UP' : 'DOWN'} (${
        queue.waiting || 0
      } waiting, ${queue.failed || 0} failed)`
    );
    console.log(
      `  Memory: ${system.memory.used || 0}MB / ${system.memory.total || 0}MB`
    );
    console.log(`  CPU: ${system.cpu.used || 0}%`);
    console.log(`  Disk: ${system.disk.usePercent || 'N/A'}`);
  }

  async stop() {
    console.log('Stopping metrics collection...');
    this.isRunning = false;

    // Collect final metrics
    await this.collectMetrics('final');

    // Generate report
    await this.generateReport();

    console.log('Metrics collection completed.');
    process.exit(0);
  }

  async generateReport() {
    const report = {
      experiment: this.experiment,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: (Date.now() - this.startTime) / 1000,
      totalDataPoints: this.metrics.length,
      summary: this.generateSummary(),
      metrics: this.metrics,
    };

    // Write to file if specified
    if (this.outputFile) {
      fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
      console.log(`Report written to: ${this.outputFile}`);
    }

    // Print summary
    console.log('\n=== METRICS SUMMARY ===');
    console.log(`Experiment: ${report.experiment}`);
    console.log(`Duration: ${report.duration.toFixed(1)}s`);
    console.log(`Data Points: ${report.totalDataPoints}`);
    console.log(
      `API Availability: ${report.summary.api.availability.toFixed(1)}%`
    );
    console.log(
      `Average Response Time: ${report.summary.api.avgResponseTime.toFixed(
        1
      )}ms`
    );
    console.log(
      `Queue Availability: ${report.summary.queue.availability.toFixed(1)}%`
    );
    console.log(
      `Average Memory Usage: ${report.summary.system.avgMemoryUsage.toFixed(
        1
      )}%`
    );
    console.log(
      `Average CPU Usage: ${report.summary.system.avgCpuUsage.toFixed(1)}%`
    );
    console.log('========================\n');
  }

  generateSummary() {
    const validMetrics = this.metrics.filter(
      (m) => m.api && m.queue && m.system
    );

    if (validMetrics.length === 0) {
      return { error: 'No valid metrics collected' };
    }

    // API metrics
    const apiAvailable = validMetrics.filter((m) => m.api.available).length;
    const apiResponseTimes = validMetrics
      .filter((m) => m.api.responseTime > 0)
      .map((m) => m.api.responseTime);

    // Queue metrics
    const queueAvailable = validMetrics.filter((m) => m.queue.available).length;

    // System metrics
    const memoryUsages = validMetrics
      .filter((m) => m.system.memory.total > 0)
      .map((m) => (m.system.memory.used / m.system.memory.total) * 100);
    const cpuUsages = validMetrics
      .filter((m) => m.system.cpu.used !== undefined)
      .map((m) => m.system.cpu.used);

    return {
      api: {
        availability: (apiAvailable / validMetrics.length) * 100,
        avgResponseTime:
          apiResponseTimes.length > 0
            ? apiResponseTimes.reduce((a, b) => a + b, 0) /
              apiResponseTimes.length
            : 0,
        maxResponseTime: Math.max(...apiResponseTimes, 0),
        minResponseTime: Math.min(...apiResponseTimes, 0),
      },
      queue: {
        availability: (queueAvailable / validMetrics.length) * 100,
      },
      system: {
        avgMemoryUsage:
          memoryUsages.length > 0
            ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
            : 0,
        avgCpuUsage:
          cpuUsages.length > 0
            ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length
            : 0,
        maxMemoryUsage: Math.max(...memoryUsages, 0),
        maxCpuUsage: Math.max(...cpuUsages, 0),
      },
    };
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'duration':
        options.duration = parseInt(value);
        break;
      case 'interval':
        options.interval = parseInt(value);
        break;
      case 'output':
        options.outputFile = value;
        break;
      case 'experiment':
        options.experiment = value;
        break;
      case 'api-url':
        options.apiUrl = value;
        break;
      case 'api-key':
        options.apiKey = value;
        break;
      case 'prometheus-url':
        options.prometheusUrl = value;
        break;
      case 'help':
        console.log(`
Usage: node metrics-collector.js [OPTIONS]

Options:
  --duration SECONDS      Duration of metrics collection (default: 300)
  --interval SECONDS      Collection interval (default: 10)
  --output FILE          Output file path
  --experiment NAME      Experiment name
  --api-url URL          VisAPI URL
  --api-key KEY          API key
  --prometheus-url URL   Prometheus URL
  --help                 Show this help

Examples:
  node metrics-collector.js --duration 60 --experiment redis_failover
  node metrics-collector.js --output /tmp/metrics.json --interval 5
                `);
        process.exit(0);
    }
  }

  const collector = new MetricsCollector(options);
  collector.start().catch(console.error);
}

module.exports = MetricsCollector;
