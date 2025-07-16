# Grafana Cloud Alert Rules Configuration

This directory contains the Grafana Cloud alert rules configuration for the VisAPI production monitoring system.

## Overview

The alert rules monitor key metrics from the VisAPI application and send notifications to Slack and optionally PagerDuty when thresholds are breached.

## Alert Rules

### 1. API Latency Alert (`api_latency_high`)

- **Metric**: `visapi_http_request_duration_seconds`
- **Threshold**: p95 > 200ms (production) / 500ms (staging)
- **Duration**: 5 minutes
- **Severity**: Warning
- **Description**: Triggers when API response times exceed acceptable thresholds

### 2. Error Rate Alert (`error_rate_high`)

- **Metric**: `visapi_http_requests_total`
- **Threshold**: Error rate > 5% (production) / 10% (staging)
- **Duration**: 5 minutes
- **Severity**: Critical
- **Description**: Triggers when the percentage of 5xx errors exceeds thresholds

### 3. Queue Depth Alert (`queue_depth_high`)

- **Metric**: `visapi_queue_depth_total`
- **Threshold**: > 1000 jobs (production) / 2000 jobs (staging)
- **Duration**: 5 minutes
- **Severity**: Warning
- **Description**: Triggers when the job queue has too many pending jobs

### 4. Redis Connection Failures (`redis_connection_failures`)

- **Metric**: `visapi_redis_operations_total`
- **Threshold**: Any failures in the last minute
- **Duration**: 1 minute
- **Severity**: Critical
- **Description**: Triggers immediately when Redis operations fail

## Notification Channels

### Slack Integration

- **Platform Alerts**: `#platform-alerts` channel for all alerts
- **Critical Alerts**: `#critical-alerts` channel for critical severity alerts
- **Format**: Structured messages with alert details and runbook links

### PagerDuty Integration (Optional)

- **Triggers**: Critical alerts for `redis_connection_failures` and `error_rate_high`
- **Severity**: Critical
- **Integration**: Uses PagerDuty Events API v2

## Configuration Files

### `grafana-alert-rules.yml`

Raw Grafana Cloud alert rules configuration in YAML format. This file contains:

- Alert rule definitions
- Notification policies
- Contact points
- Mute timings for maintenance windows

### Terraform Module (`/infrastructure/terraform/modules/grafana-cloud/`)

Infrastructure-as-Code configuration for managing Grafana Cloud resources:

- `main.tf`: Resource definitions
- `variables.tf`: Input variables
- `outputs.tf`: Output values

## Environment Variables

Required environment variables for Grafana Cloud integration:

```bash
# Grafana Cloud API Configuration
GRAFANA_CLOUD_API_KEY=your_grafana_cloud_api_key_here
GRAFANA_CLOUD_STACK_ID=your_grafana_cloud_stack_id_here
GRAFANA_CLOUD_ORG_ID=your_grafana_cloud_org_id_here

# Notification Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_integration_key_optional
```

## Deployment

### Using Terraform

1. **Configure Variables**: Update `terraform.tfvars` with your Grafana Cloud credentials

2. **Deploy**: Run Terraform to create the alert rules

   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Verify**: Check the Grafana Cloud UI to confirm alert rules are created

### Manual Configuration

If you prefer manual configuration:

1. **Import Rules**: Use the `grafana-alert-rules.yml` file to import rules via the Grafana Cloud UI
2. **Configure Notifications**: Set up Slack and PagerDuty contact points
3. **Test Alerts**: Verify that notifications are working correctly

## Maintenance Windows

The configuration includes a maintenance window mute timing:

- **Schedule**: Sundays 02:00-04:00 EST
- **Purpose**: Suppress alerts during planned maintenance
- **Scope**: All alert rules

## Runbook Links

Each alert includes a runbook link for troubleshooting:

- **API Latency**: https://github.com/visanet/visapi/wiki/runbooks/high-api-latency
- **Error Rate**: https://github.com/visanet/visapi/wiki/runbooks/high-error-rate
- **Queue Depth**: https://github.com/visanet/visapi/wiki/runbooks/high-queue-depth
- **Redis Failures**: https://github.com/visanet/visapi/wiki/runbooks/redis-connection-failure

## Alert Thresholds

| Environment | API Latency | Error Rate | Queue Depth |
| ----------- | ----------- | ---------- | ----------- |
| Production  | 200ms       | 5%         | 1000 jobs   |
| Staging     | 500ms       | 10%        | 2000 jobs   |

## Testing Alerts

To test the alert system:

1. **Simulate High Latency**: Add artificial delays to API responses
2. **Trigger Errors**: Deploy code that returns 5xx errors
3. **Fill Queue**: Submit many jobs to the queue system
4. **Redis Failures**: Temporarily disconnect Redis to trigger failures

## Monitoring Health

- **Grafana Cloud**: Check the Grafana Cloud UI for alert rule status
- **Slack**: Monitor the `#platform-alerts` channel for notifications
- **PagerDuty**: Verify incidents are created for critical alerts

## Support

For questions or issues with the alert configuration:

- **Documentation**: See the main [CLAUDE.md](../../../CLAUDE.md) file
- **Issues**: Create a GitHub issue in the repository
- **Contact**: Reach out to the platform team via Slack

---

**Last Updated**: July 16, 2025
**Version**: Sprint 4 - S4-DEV-04 Task Implementation
