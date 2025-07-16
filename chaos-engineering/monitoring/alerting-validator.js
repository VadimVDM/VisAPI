#!/usr/bin/env node

/**
 * Alerting Validator for Chaos Engineering Experiments
 *
 * This script validates that alerts are properly triggered during chaos experiments
 * and that the alerting system is functioning correctly.
 */

const fs = require('fs');
const path = require('path');

class AlertingValidator {
  constructor(options = {}) {
    this.prometheusUrl =
      options.prometheusUrl ||
      process.env.PROMETHEUS_URL ||
      'http://localhost:9090';
    this.grafanaUrl =
      options.grafanaUrl || process.env.GRAFANA_URL || 'http://localhost:3001';
    this.slackWebhook = options.slackWebhook || process.env.SLACK_WEBHOOK_URL;
    this.alertmanagerUrl =
      options.alertmanagerUrl ||
      process.env.ALERTMANAGER_URL ||
      'http://localhost:9093';
    this.experiment = options.experiment || 'unknown';
    this.duration = options.duration || 300; // 5 minutes
    this.outputFile = options.outputFile || null;

    this.alerts = [];
    this.startTime = Date.now();
    this.expectedAlerts = [
      'APIHighLatency',
      'APIHighErrorRate',
      'QueueDepthHigh',
      'RedisDown',
      'ServiceDown',
    ];

    console.log(`Alerting Validator initialized:`);
    console.log(`  Prometheus URL: ${this.prometheusUrl}`);
    console.log(`  Grafana URL: ${this.grafanaUrl}`);
    console.log(`  Alertmanager URL: ${this.alertmanagerUrl}`);
    console.log(`  Experiment: ${this.experiment}`);
    console.log(`  Duration: ${this.duration}s`);
    console.log(`  Expected Alerts: ${this.expectedAlerts.join(', ')}`);
  }

  async start() {
    console.log('Starting alerting validation...');

    // Check initial alert state
    await this.checkAlertState('baseline');

    // Monitor alerts during experiment
    const intervalId = setInterval(async () => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      if (elapsed >= this.duration) {
        clearInterval(intervalId);
        await this.stop();
        return;
      }

      await this.checkAlertState('monitoring');
    }, 30000); // Check every 30 seconds

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, stopping alerting validation...');
      clearInterval(intervalId);
      await this.stop();
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, stopping alerting validation...');
      clearInterval(intervalId);
      await this.stop();
    });
  }

  async checkAlertState(phase) {
    const timestamp = new Date().toISOString();
    const elapsed = (Date.now() - this.startTime) / 1000;

    console.log(
      `[${timestamp}] Checking alert state (${phase}, elapsed: ${elapsed.toFixed(
        1
      )}s)`
    );

    const alertState = {
      timestamp,
      elapsed,
      phase,
      experiment: this.experiment,
      prometheus: await this.checkPrometheusAlerts(),
      alertmanager: await this.checkAlertmanagerAlerts(),
      grafana: await this.checkGrafanaAlerts(),
      slack: await this.checkSlackNotifications(),
    };

    this.alerts.push(alertState);

    // Log current alert status
    this.logAlertStatus(alertState);
  }

  async checkPrometheusAlerts() {
    try {
      const response = await fetch(`${this.prometheusUrl}/api/v1/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const alerts = data.data.alerts || [];

      const activeAlerts = alerts.filter((alert) => alert.state === 'firing');
      const pendingAlerts = alerts.filter((alert) => alert.state === 'pending');

      return {
        available: true,
        total: alerts.length,
        active: activeAlerts.length,
        pending: pendingAlerts.length,
        alerts: alerts.map((alert) => ({
          name: alert.labels.alertname,
          state: alert.state,
          activeAt: alert.activeAt,
          labels: alert.labels,
          annotations: alert.annotations,
        })),
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

  async checkAlertmanagerAlerts() {
    try {
      const response = await fetch(`${this.alertmanagerUrl}/api/v1/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const alerts = data.data || [];

      const activeAlerts = alerts.filter(
        (alert) => alert.status.state === 'active'
      );
      const suppressedAlerts = alerts.filter(
        (alert) => alert.status.state === 'suppressed'
      );

      return {
        available: true,
        total: alerts.length,
        active: activeAlerts.length,
        suppressed: suppressedAlerts.length,
        alerts: alerts.map((alert) => ({
          fingerprint: alert.fingerprint,
          status: alert.status,
          labels: alert.labels,
          annotations: alert.annotations,
          generatorURL: alert.generatorURL,
        })),
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

  async checkGrafanaAlerts() {
    try {
      // Note: This requires Grafana API key for authentication
      // For now, we'll just check if Grafana is accessible
      const response = await fetch(`${this.grafanaUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        available: true,
        status: data.database,
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

  async checkSlackNotifications() {
    if (!this.slackWebhook) {
      return {
        available: false,
        error: 'Slack webhook not configured',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Send a test notification to verify Slack integration
      const testMessage = {
        text: `Chaos Engineering Alert Test - ${this.experiment}`,
        attachments: [
          {
            color: 'warning',
            fields: [
              {
                title: 'Experiment',
                value: this.experiment,
                short: true,
              },
              {
                title: 'Time',
                value: new Date().toISOString(),
                short: true,
              },
            ],
          },
        ],
      };

      const response = await fetch(this.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        available: true,
        testSent: true,
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

  logAlertStatus(alertState) {
    const prometheus = alertState.prometheus;
    const alertmanager = alertState.alertmanager;
    const grafana = alertState.grafana;
    const slack = alertState.slack;

    console.log(
      `  Prometheus: ${prometheus.available ? 'UP' : 'DOWN'} (${
        prometheus.active || 0
      } active, ${prometheus.pending || 0} pending)`
    );
    console.log(
      `  Alertmanager: ${alertmanager.available ? 'UP' : 'DOWN'} (${
        alertmanager.active || 0
      } active, ${alertmanager.suppressed || 0} suppressed)`
    );
    console.log(`  Grafana: ${grafana.available ? 'UP' : 'DOWN'}`);
    console.log(`  Slack: ${slack.available ? 'UP' : 'DOWN'}`);

    // Log specific alerts
    if (prometheus.available && prometheus.alerts.length > 0) {
      prometheus.alerts.forEach((alert) => {
        const color = alert.state === 'firing' ? '\033[0;31m' : '\033[1;33m';
        console.log(`    ${color}${alert.name}: ${alert.state}\033[0m`);
      });
    }

    if (alertmanager.available && alertmanager.alerts.length > 0) {
      alertmanager.alerts.forEach((alert) => {
        const color =
          alert.status.state === 'active' ? '\033[0;31m' : '\033[1;33m';
        console.log(
          `    ${color}${alert.labels.alertname}: ${alert.status.state}\033[0m`
        );
      });
    }
  }

  async validateExpectedAlerts() {
    console.log('\n=== Validating Expected Alerts ===');

    const currentAlerts = this.alerts[this.alerts.length - 1];
    if (!currentAlerts || !currentAlerts.prometheus.available) {
      console.log('❌ Cannot validate alerts - Prometheus not available');
      return false;
    }

    const activeAlerts = currentAlerts.prometheus.alerts.filter(
      (alert) => alert.state === 'firing'
    );
    const activeAlertNames = activeAlerts.map((alert) => alert.name);

    let validationPassed = true;

    for (const expectedAlert of this.expectedAlerts) {
      if (activeAlertNames.includes(expectedAlert)) {
        console.log(`✅ ${expectedAlert}: TRIGGERED`);
      } else {
        console.log(`❌ ${expectedAlert}: NOT TRIGGERED`);
        validationPassed = false;
      }
    }

    // Check for unexpected alerts
    const unexpectedAlerts = activeAlertNames.filter(
      (name) => !this.expectedAlerts.includes(name)
    );
    if (unexpectedAlerts.length > 0) {
      console.log('\n⚠️  Unexpected alerts triggered:');
      unexpectedAlerts.forEach((alert) => {
        console.log(`  - ${alert}`);
      });
    }

    console.log(
      `\nValidation Result: ${validationPassed ? '✅ PASSED' : '❌ FAILED'}`
    );
    return validationPassed;
  }

  async validateAlertTiming() {
    console.log('\n=== Validating Alert Timing ===');

    const alertTimings = {};

    // Track when each alert first appeared
    for (const alertState of this.alerts) {
      if (alertState.prometheus.available) {
        for (const alert of alertState.prometheus.alerts) {
          if (alert.state === 'firing' && !alertTimings[alert.name]) {
            alertTimings[alert.name] = {
              firstSeen: alertState.elapsed,
              alertTime: alert.activeAt,
            };
          }
        }
      }
    }

    // Validate timing expectations
    const timingResults = {};

    for (const [alertName, timing] of Object.entries(alertTimings)) {
      const detectionTime = timing.firstSeen;

      // Expected detection times (in seconds)
      const expectedTimes = {
        APIHighLatency: 60, // Should detect within 1 minute
        APIHighErrorRate: 30, // Should detect within 30 seconds
        QueueDepthHigh: 120, // Should detect within 2 minutes
        RedisDown: 30, // Should detect within 30 seconds
        ServiceDown: 60, // Should detect within 1 minute
      };

      const expectedTime = expectedTimes[alertName] || 120; // Default 2 minutes
      const withinExpectedTime = detectionTime <= expectedTime;

      timingResults[alertName] = {
        detectionTime,
        expectedTime,
        withinExpectedTime,
      };

      const status = withinExpectedTime ? '✅' : '❌';
      console.log(
        `${status} ${alertName}: Detected in ${detectionTime}s (expected: <${expectedTime}s)`
      );
    }

    const allTimingsPassed = Object.values(timingResults).every(
      (result) => result.withinExpectedTime
    );
    console.log(
      `\nTiming Validation Result: ${
        allTimingsPassed ? '✅ PASSED' : '❌ FAILED'
      }`
    );

    return { results: timingResults, passed: allTimingsPassed };
  }

  async validateAlertRecovery() {
    console.log('\n=== Validating Alert Recovery ===');

    const recoveryResults = {};

    // Check if alerts have recovered (stopped firing)
    const firstAlertState = this.alerts.find(
      (state) => state.prometheus.available && state.prometheus.active > 0
    );
    const lastAlertState = this.alerts[this.alerts.length - 1];

    if (!firstAlertState || !lastAlertState) {
      console.log('❌ Cannot validate recovery - insufficient data');
      return false;
    }

    const initialAlerts = firstAlertState.prometheus.alerts.filter(
      (alert) => alert.state === 'firing'
    );
    const finalAlerts = lastAlertState.prometheus.alerts.filter(
      (alert) => alert.state === 'firing'
    );

    const initialAlertNames = initialAlerts.map((alert) => alert.name);
    const finalAlertNames = finalAlerts.map((alert) => alert.name);

    for (const alertName of initialAlertNames) {
      const recovered = !finalAlertNames.includes(alertName);
      recoveryResults[alertName] = recovered;

      const status = recovered ? '✅' : '❌';
      console.log(
        `${status} ${alertName}: ${recovered ? 'RECOVERED' : 'STILL FIRING'}`
      );
    }

    const allRecovered = Object.values(recoveryResults).every(Boolean);
    console.log(
      `\nRecovery Validation Result: ${
        allRecovered ? '✅ PASSED' : '❌ FAILED'
      }`
    );

    return { results: recoveryResults, passed: allRecovered };
  }

  async stop() {
    console.log('Stopping alerting validation...');

    // Check final alert state
    await this.checkAlertState('final');

    // Validate alerts
    const expectedValidation = await this.validateExpectedAlerts();
    const timingValidation = await this.validateAlertTiming();
    const recoveryValidation = await this.validateAlertRecovery();

    // Generate report
    await this.generateReport(
      expectedValidation,
      timingValidation,
      recoveryValidation
    );

    console.log('Alerting validation completed.');
    process.exit(0);
  }

  async generateReport(
    expectedValidation,
    timingValidation,
    recoveryValidation
  ) {
    const report = {
      experiment: this.experiment,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: (Date.now() - this.startTime) / 1000,
      expectedAlerts: this.expectedAlerts,
      validation: {
        expected: expectedValidation,
        timing: timingValidation,
        recovery: recoveryValidation,
      },
      summary: {
        totalChecks: this.alerts.length,
        prometheusAvailable: this.alerts.filter((a) => a.prometheus.available)
          .length,
        alertmanagerAvailable: this.alerts.filter(
          (a) => a.alertmanager.available
        ).length,
        grafanaAvailable: this.alerts.filter((a) => a.grafana.available).length,
        slackAvailable: this.alerts.filter((a) => a.slack.available).length,
      },
      alerts: this.alerts,
    };

    // Write to file if specified
    if (this.outputFile) {
      fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
      console.log(`Report written to: ${this.outputFile}`);
    }

    // Print summary
    console.log('\n=== ALERTING VALIDATION SUMMARY ===');
    console.log(`Experiment: ${report.experiment}`);
    console.log(`Duration: ${report.duration.toFixed(1)}s`);
    console.log(`Total Checks: ${report.summary.totalChecks}`);
    console.log(`Expected Alerts: ${expectedValidation ? 'PASSED' : 'FAILED'}`);
    console.log(
      `Timing Validation: ${timingValidation.passed ? 'PASSED' : 'FAILED'}`
    );
    console.log(
      `Recovery Validation: ${recoveryValidation.passed ? 'PASSED' : 'FAILED'}`
    );
    console.log(
      `Prometheus Availability: ${(
        (report.summary.prometheusAvailable / report.summary.totalChecks) *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `Alertmanager Availability: ${(
        (report.summary.alertmanagerAvailable / report.summary.totalChecks) *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `Grafana Availability: ${(
        (report.summary.grafanaAvailable / report.summary.totalChecks) *
        100
      ).toFixed(1)}%`
    );
    console.log(
      `Slack Availability: ${(
        (report.summary.slackAvailable / report.summary.totalChecks) *
        100
      ).toFixed(1)}%`
    );
    console.log('=====================================\n');
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
      case 'output':
        options.outputFile = value;
        break;
      case 'experiment':
        options.experiment = value;
        break;
      case 'prometheus-url':
        options.prometheusUrl = value;
        break;
      case 'grafana-url':
        options.grafanaUrl = value;
        break;
      case 'alertmanager-url':
        options.alertmanagerUrl = value;
        break;
      case 'slack-webhook':
        options.slackWebhook = value;
        break;
      case 'help':
        console.log(`
Usage: node alerting-validator.js [OPTIONS]

Options:
  --duration SECONDS         Duration of validation (default: 300)
  --output FILE             Output file path
  --experiment NAME         Experiment name
  --prometheus-url URL      Prometheus URL
  --grafana-url URL         Grafana URL
  --alertmanager-url URL    Alertmanager URL
  --slack-webhook URL       Slack webhook URL
  --help                    Show this help

Examples:
  node alerting-validator.js --duration 60 --experiment redis_failover
  node alerting-validator.js --output /tmp/alerts.json --experiment worker_failure
                `);
        process.exit(0);
    }
  }

  const validator = new AlertingValidator(options);
  validator.start().catch(console.error);
}

module.exports = AlertingValidator;
