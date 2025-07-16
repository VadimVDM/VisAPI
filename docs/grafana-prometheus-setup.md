# Grafana Cloud Prometheus Setup Guide

**Last Updated:** July 16, 2025  
**Status:** ✅ Implemented and Operational with Production Dashboards

This guide explains how to configure VisAPI to send metrics to Grafana Cloud using Prometheus remote write.

## Overview

VisAPI uses Prometheus metrics exposed at the `/metrics` endpoint. These metrics are pushed to Grafana Cloud every 30 seconds using the Prometheus remote write protocol via a custom RemoteWriteService.

## Setup Steps

### 1. Create Grafana Cloud Account

1. Go to [Grafana Cloud](https://grafana.com/)
2. Sign up for a free account
3. Note your stack URL (e.g., `visanet.grafana.net`)

### 2. Configure Prometheus Data Source

1. In Grafana Cloud, go to **Home** → **Connect Data**
2. Select **Prometheus Metrics**
3. Choose **Collect and send metrics to a fully-managed Prometheus Stack**
4. Select **Custom Setup Options**
5. Choose **From my local Prometheus server** (this gives us remote write credentials)

### 3. Generate API Token

1. Click **"Use an API token"**
2. Name it descriptively (e.g., `visapi-remote-write`)
3. Click **"Create token"**
4. Save the configuration details:
   - **URL**: The prometheus endpoint (e.g., `https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push`)
   - **Username**: Numeric ID (e.g., `123456`)
   - **Password**: The API key you generated

### 4. Configure Environment Variables

Add these to your `.env.backend` or deployment environment:

```bash
# Grafana Cloud Base Configuration (for API operations)
GRAFANA_CLOUD_API_KEY=glc_YOUR_API_KEY_HERE
GRAFANA_CLOUD_STACK_ID=your-stack-name
GRAFANA_CLOUD_ORG_ID=your-org-id

# Prometheus Remote Write (for pushing metrics)
GRAFANA_REMOTE_WRITE_ENABLED=true
GRAFANA_PROMETHEUS_URL=https://prometheus-prod-XX-prod-region.grafana.net/api/prom/push
GRAFANA_PROMETHEUS_USERNAME=your-prometheus-username
GRAFANA_PROMETHEUS_PASSWORD=glc_YOUR_PROMETHEUS_PASSWORD_HERE
GRAFANA_PUSH_INTERVAL_MS=30000
```

### 5. Deploy and Verify

1. Deploy your backend with the new environment variables
2. Check backend logs for: `Starting remote write to https://prometheus-prod-XX-prod-region.grafana.net/api/prom/push every 30000ms`
3. Go to Grafana Cloud → Explore
4. Select the Prometheus data source
5. Query for your metrics (e.g., `visapi_http_request_duration_seconds`)

## Metrics Available

The following metrics are exported:

### HTTP Metrics

- `visapi_http_request_duration_seconds` - Request duration histogram
- `visapi_http_requests_total` - Total requests counter
- `visapi_http_request_size_bytes` - Request size histogram
- `visapi_http_response_size_bytes` - Response size histogram

### Queue Metrics

- `visapi_queue_job_duration_seconds` - Job processing duration
- `visapi_queue_job_completed_total` - Completed jobs counter
- `visapi_queue_job_failed_total` - Failed jobs counter
- `visapi_queue_depth` - Current queue depth gauge
- `visapi_queue_stalled` - Stalled jobs gauge

### Business Metrics

- `visapi_workflow_triggered_total` - Workflow triggers counter
- `visapi_workflow_completed_total` - Workflow completions counter
- `visapi_workflow_failed_total` - Workflow failures counter
- `visapi_api_key_validation_total` - API key validations counter

### Default Node.js Metrics

- Process CPU, memory, handles
- Event loop lag
- Garbage collection stats

## Implementation Details

### RemoteWriteService

The metrics are pushed via a custom NestJS service (`apps/backend/src/metrics/remote-write.service.ts`):

- **Initialization**: Starts automatically when `GRAFANA_REMOTE_WRITE_ENABLED=true`
- **Push Interval**: Every 30 seconds (configurable via `GRAFANA_PUSH_INTERVAL_MS`)
- **Format**: Standard Prometheus text format
- **Authentication**: HTTP Basic Auth with username/password
- **Error Handling**: Graceful error handling with retry logic

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NestJS App    │───▶│ RemoteWriteService│───▶│ Grafana Cloud   │
│ (Metrics)       │    │ (Every 30s)     │    │ (Prometheus)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Troubleshooting

### Metrics Not Appearing

1. Check backend logs for: `Starting remote write to https://...`
2. Verify environment variables are set correctly
3. Ensure `GRAFANA_REMOTE_WRITE_ENABLED=true`
4. Check for error messages: `Failed to push metrics to Grafana Cloud`

### Authentication Errors

1. Regenerate API token in Grafana Cloud
2. Update `GRAFANA_PROMETHEUS_PASSWORD` with new token
3. Ensure username matches the numeric ID from Grafana

### High Memory Usage

Adjust push interval if needed:

```bash
GRAFANA_PUSH_INTERVAL_MS=60000  # Push every 60 seconds instead of 30
```

### Environment Variable Issues

Common configuration problems:

- **Remove legacy variables**: Ensure `PROMETHEUS_ENABLED` and `PROMETHEUS_PORT` are not set (conflicts with Grafana remote write)
- **No quotes in environment variables**: Values should be set without quotes in Render environment
- **Check all required variables**: Ensure all `GRAFANA_*` variables are properly configured

### Common Issues

- **400 Bad Request**: Check metrics format, ensure valid Prometheus format
- **401 Unauthorized**: Verify API credentials, check for quotes in environment variables
- **Connection refused**: Check network connectivity to Grafana Cloud
- **Metrics not appearing**: Verify `GRAFANA_REMOTE_WRITE_ENABLED=true` and check backend logs for RemoteWriteService messages

## Pre-Built Dashboards

VisAPI comes with two comprehensive dashboards already configured:

### 1. VisAPI Production Dashboard
**URL:** `/d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e/visapi-production-dashboard`

**Features:**
- **HTTP Request Rate**: Real-time request monitoring by method and route
- **Response Time (P95)**: 95th percentile latency with color-coded thresholds
- **Error Rate**: Percentage of 5xx errors with alerting thresholds
- **Queue Depth**: Current queue depth by priority level
- **Memory Usage**: Process memory and heap monitoring
- **Active Connections**: Live HTTP connection count
- **Job Processing Time**: P50, P95, P99 job latency percentiles
- **Failed Jobs**: Rate of failed jobs by type and queue

### 2. VisAPI Alerting Dashboard
**URL:** `/d/4582a630-7be8-41ec-98a0-2e65adeb9828/visapi-alerting-dashboard`

**Features:**
- **API Latency Alert**: Visual threshold for P95 > 200ms
- **Error Rate Alert**: Visual threshold for error rate > 5%
- **Queue Depth Alert**: Visual threshold for queue depth > 1000 jobs
- **Redis Connection Failures**: Real-time Redis error monitoring

### Key Metrics Queries

Common queries used in the dashboards:
- `rate(visapi_http_requests_total[5m])` - Request rate
- `histogram_quantile(0.95, rate(visapi_http_request_duration_seconds_bucket[5m]))` - 95th percentile latency
- `sum(visapi_queue_depth_total) by (queue, priority)` - Queue depth by priority
- `rate(visapi_http_requests_total{status_code=~"5.."}[5m]) / rate(visapi_http_requests_total[5m]) * 100` - Error rate percentage

## Security Notes

- The API key (`GRAFANA_PROMETHEUS_PASSWORD`) is sensitive - never commit it
- Use environment-specific tokens for staging/production
- Rotate tokens regularly (every 90 days recommended)
- The `/metrics` endpoint remains internal - not exposed publicly
