# Chaos Toolkit Configuration for VisAPI

This directory contains Chaos Toolkit experiments and configurations for testing the resilience of the VisAPI platform.

## Prerequisites

```bash
# Install Chaos Toolkit
pip install chaostoolkit
pip install chaostoolkit-kubernetes
pip install chaostoolkit-prometheus
pip install chaostoolkit-slack

# Verify installation
chaos --version
```

## Directory Structure

```
chaostoolkit/
├── experiments/         # Chaos experiment definitions
│   ├── redis-failover.json
│   ├── worker-failure.json
│   ├── external-service-failure.json
│   ├── network-partition.json
│   └── resource-exhaustion.json
├── environments/        # Environment-specific configurations
│   ├── local.json
│   ├── staging.json
│   └── production.json
├── plugins/            # Custom chaos actions
│   ├── visapi-actions.py
│   └── monitoring-actions.py
└── README.md
```

## Running Experiments

### Local Environment

```bash
# Set environment
export ENVIRONMENT=local

# Run Redis failover experiment
chaos run experiments/redis-failover.json

# Run worker failure experiment
chaos run experiments/worker-failure.json

# Run with specific environment config
chaos run experiments/redis-failover.json --var-file environments/local.json
```

### Staging Environment

```bash
# Set environment
export ENVIRONMENT=staging

# Run experiment with staging config
chaos run experiments/redis-failover.json --var-file environments/staging.json

# Validate experiment before running
chaos validate experiments/redis-failover.json
```

### Production Environment

```bash
# Set environment
export ENVIRONMENT=production

# ALWAYS validate first in production
chaos validate experiments/redis-failover.json --var-file environments/production.json

# Run with production config (requires approval)
chaos run experiments/redis-failover.json --var-file environments/production.json
```

## Experiment Categories

### Infrastructure Failures

- `redis-failover.json`: Redis connection failures
- `network-partition.json`: Network partition simulation
- `database-slowdown.json`: Database response delays

### Service Failures

- `worker-failure.json`: Worker process failures
- `api-gateway-failure.json`: API gateway failures
- `service-restart.json`: Service restart scenarios

### External Service Failures

- `external-service-failure.json`: External API failures
- `slack-api-failure.json`: Slack API failures
- `whatsapp-timeout.json`: WhatsApp API timeouts

### Resource Exhaustion

- `resource-exhaustion.json`: Memory and CPU exhaustion
- `disk-pressure.json`: Disk space exhaustion
- `fd-exhaustion.json`: File descriptor exhaustion

## Safety Features

### Rollback Actions

All experiments include automatic rollback actions to restore system state.

### Steady State Hypothesis

Each experiment defines a steady state hypothesis that must be validated before and after the experiment.

### Abort Conditions

Experiments can be aborted if critical conditions are met (e.g., system becomes unresponsive).

## Monitoring Integration

### Prometheus Metrics

Experiments automatically collect metrics during execution:

- API response times
- Error rates
- Queue depth
- Resource utilization

### Slack Notifications

Experiments send notifications to Slack channels:

- Experiment start/end
- Failures detected
- Recovery status

## Custom Actions

### VisAPI Actions

- `visapi_health_check`: Check API health endpoint
- `visapi_queue_status`: Check queue processing status
- `visapi_trigger_workflow`: Trigger test workflow
- `visapi_check_logs`: Check for error logs

### Monitoring Actions

- `collect_metrics`: Collect system metrics
- `validate_alerts`: Validate alert generation
- `measure_recovery_time`: Measure recovery times

## Environment Variables

Required environment variables for experiments:

```bash
# VisAPI Configuration
export VISAPI_API_URL=http://localhost:3000
export VISAPI_API_KEY=your_api_key_here

# Monitoring Configuration
export PROMETHEUS_URL=http://localhost:9090
export GRAFANA_URL=http://localhost:3001
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Environment-specific settings
export ENVIRONMENT=local|staging|production
```

## Best Practices

1. **Always Validate First**: Run `chaos validate` before executing
2. **Start Small**: Begin with low-impact experiments
3. **Monitor Continuously**: Watch metrics during experiments
4. **Document Results**: Keep experiment logs and results
5. **Review Regularly**: Update experiments based on system changes

## Troubleshooting

### Common Issues

**Experiment Fails to Start**:

- Check environment variables
- Verify API connectivity
- Validate JSON syntax

**Steady State Hypothesis Fails**:

- Check system health
- Verify monitoring endpoints
- Review baseline metrics

**Rollback Actions Fail**:

- Check system permissions
- Verify service status
- Review error logs

### Debug Mode

```bash
# Run with debug logging
chaos --log-level DEBUG run experiments/redis-failover.json

# Generate experiment report
chaos run experiments/redis-failover.json --report-path /tmp/chaos-report.json
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Chaos Engineering
on:
  schedule:
    - cron: '0 2 * * *' # Run daily at 2 AM
  workflow_dispatch:

jobs:
  chaos-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Chaos Toolkit
        run: pip install chaostoolkit
      - name: Run Chaos Experiments
        run: |
          chaos run chaos-engineering/chaostoolkit/experiments/redis-failover.json
```

### Scheduled Experiments

Regular chaos experiments can be scheduled using cron or CI/CD pipelines to ensure continuous resilience testing.

## Reporting

### Experiment Reports

Chaos Toolkit generates detailed reports including:

- Experiment timeline
- Hypothesis validation results
- Action execution logs
- Metrics collected
- Recovery information

### Metrics Dashboard

View real-time metrics during experiments:

- http://localhost:3001/dashboard (Grafana)
- http://localhost:9090 (Prometheus)

## Safety Considerations

1. **Blast Radius**: Limit experiment scope to prevent widespread impact
2. **Time Bounds**: Set maximum experiment duration
3. **Circuit Breakers**: Implement automatic experiment termination
4. **Rollback Procedures**: Always define rollback actions
5. **Monitoring**: Continuous monitoring during experiments
6. **Approval Process**: Require approval for production experiments

## Support

For issues or questions about chaos experiments:

1. Check experiment logs
2. Review monitoring dashboards
3. Consult system documentation
4. Contact the platform team

---

**⚠️ Important**: Always follow the principle of least privilege and run experiments in isolated environments before production use.
