# Chaos Engineering Suite

A comprehensive chaos engineering toolkit for testing the resilience of the VisAPI system. This suite simulates various failure scenarios to validate system recovery, error handling, and monitoring capabilities.

## 🚀 Quick Start

```bash
# Set safe mode (required)
export CHAOS_SAFE_MODE=1

# Run a single experiment
./run-chaos.sh network-partition --duration 5

# Run all experiments
./run-chaos.sh full-chaos --duration 10 --intensity medium

# Check status
./run-chaos.sh --status

# Generate report
./run-chaos.sh --report-only
```

## 📋 Available Experiments

### 1. Network Partition (`network-partition`)

**Purpose**: Simulates Redis connectivity failures by blocking network connections.

**What it tests**:

- Queue system behavior during Redis outages
- Application resilience to external dependency failures
- Recovery mechanisms when connectivity is restored

**Script**: `scripts/network-partition.sh`

**Usage**:

```bash
./run-chaos.sh network-partition --duration 10
# or directly:
sudo ./scripts/network-partition.sh 10 redis-host.com
```

### 2. Service Failure (`service-failure`)

**Purpose**: Simulates random service crashes and process restarts.

**What it tests**:

- Process restart mechanisms
- Service recovery time
- Queue job handling during restarts
- Health check reliability

**Script**: `scripts/service-failure.sh`

**Usage**:

```bash
./run-chaos.sh service-failure --duration 10
# or directly:
./scripts/service-failure.sh 10 60  # 10 minutes, 60s intervals
```

### 3. Resource Exhaustion (`resource-exhaustion`)

**Purpose**: Simulates CPU, memory, and disk resource pressure.

**What it tests**:

- System behavior under resource constraints
- Performance degradation patterns
- Resource monitoring and alerting
- Graceful degradation mechanisms

**Script**: `scripts/resource-exhaustion.sh`

**Usage**:

```bash
./run-chaos.sh resource-exhaustion --duration 10 --intensity high
# or directly:
./scripts/resource-exhaustion.sh 10 mixed high
```

### 4. External Service Failure (`external-service-failure`)

**Purpose**: Simulates external API failures (Slack, WhatsApp, email services).

**What it tests**:

- Retry mechanisms and backoff strategies
- Error handling for external service failures
- Fallback behavior when APIs are unavailable
- Circuit breaker patterns

**Script**: `scripts/external-service-failure.sh`

**Usage**:

```bash
./run-chaos.sh external-service-failure --duration 15 --failure-rate 75
# or directly:
sudo ./scripts/external-service-failure.sh 15 all 75
```

### 5. Full Chaos (`full-chaos`)

**Purpose**: Runs all experiments in sequence with recovery time between tests.

**What it tests**:

- Overall system resilience
- Cumulative effect of multiple failure types
- System recovery between different stress scenarios

**Usage**:

```bash
./run-chaos.sh full-chaos --duration 5 --intensity medium
```

## 🛠️ Installation & Setup

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y curl jq netcat-openbsd stress-ng python3 python3-pip bc

# macOS
brew install curl jq netcat stress-ng python3

# Python packages
pip3 install requests
```

### Environment Setup

```bash
# Required: Enable safe mode
export CHAOS_SAFE_MODE=1

# Optional: Custom configuration
export CHAOS_DURATION=10
export CHAOS_INTENSITY=medium
export CHAOS_FAILURE_RATE=50
```

### Directory Structure

```
chaos-engineering/
├── run-chaos.sh                 # Main orchestrator
├── scripts/
│   ├── network-partition.sh     # Network failure simulation
│   ├── service-failure.sh       # Process crash simulation
│   ├── resource-exhaustion.sh   # Resource pressure simulation
│   └── external-service-failure.sh # External API failure simulation
├── reports/                     # Generated reports and metrics
│   ├── experiments/             # Individual experiment results
│   ├── metrics/                 # Collected metrics
│   └── logs/                    # Experiment logs
└── README.md                    # This file
```

## 📊 Monitoring & Metrics

### Collected Metrics

Each experiment collects comprehensive metrics:

**System Metrics**:

- CPU utilization and load average
- Memory usage and availability
- Disk I/O and space utilization
- Network connectivity status

**Application Metrics**:

- Service health status
- API response times
- Process counts and memory usage
- Queue depth and job processing rates

**Failure Metrics**:

- Recovery times
- Error rates
- Retry attempts
- Fallback activations

### Metric Storage

Metrics are stored in JSON format:

```json
{
  "experiment": "network-partition",
  "start_time": 1642788000,
  "duration_minutes": 10,
  "metrics": [
    {
      "timestamp": 1642788010,
      "service_status": "healthy",
      "response_time": 0.045,
      "redis_status": "unreachable",
      "queue_depth": 25
    }
  ]
}
```

### Report Generation

HTML reports are automatically generated with:

- Experiment summaries
- Success/failure rates
- Performance graphs
- Recommendations

## 🔧 Configuration Options

### Main Runner Options

```bash
./run-chaos.sh [experiment] [OPTIONS]

Options:
  --duration MINUTES      Duration for each experiment (default: 5)
  --intensity LEVEL       Intensity: low, medium, high (default: medium)
  --failure-rate PERCENT  Failure rate for external services (default: 50)
  --report-only          Generate report from existing results
  --status               Show current experiment status
  --help                 Show help message
```

### Intensity Levels

**Low**:

- 50% resource utilization
- 25% failure rate
- Shorter durations

**Medium**:

- 100% resource utilization
- 50% failure rate
- Standard durations

**High**:

- 200% resource utilization
- 75% failure rate
- Extended stress periods

## 🛡️ Safety Features

### Pre-flight Checks

Before running experiments, the system performs safety checks:

1. **Environment Verification**: Ensures `CHAOS_SAFE_MODE` is set
2. **Script Availability**: Verifies all required scripts exist
3. **Service Health**: Confirms backend service is running
4. **Tool Availability**: Checks required tools are installed
5. **Resource Availability**: Validates sufficient system resources
6. **Endpoint Accessibility**: Tests health endpoints

### Safety Mechanisms

- **Automatic Cleanup**: Scripts clean up processes and configurations on exit
- **Signal Handlers**: Graceful shutdown on SIGINT/SIGTERM
- **Resource Limits**: Prevents system overload
- **Timeout Protection**: Experiments have built-in timeouts
- **Rollback Procedures**: Automatic restoration of original state

### Emergency Procedures

If experiments cause system instability:

```bash
# Kill all chaos processes
pkill -f "chaos"
pkill -f "stress-ng"

# Restore hosts file (if modified)
sudo cp /etc/hosts.chaos-backup /etc/hosts

# Remove iptables rules
sudo iptables -F OUTPUT

# Restart services if needed
sudo systemctl restart your-service
```

## 📈 Best Practices

### Running Experiments

1. **Always use staging environments** - Never run in production
2. **Set CHAOS_SAFE_MODE=1** - Required safety flag
3. **Monitor during experiments** - Watch system metrics
4. **Have rollback procedures** - Plan for emergency recovery
5. **Document findings** - Keep records of issues discovered

### Scheduling

```bash
# Run daily chaos tests
0 2 * * * /path/to/run-chaos.sh full-chaos --duration 5

# Run specific tests weekly
0 3 * * 1 /path/to/run-chaos.sh network-partition --duration 10
```

### Integration with CI/CD

```yaml
# Example GitHub Actions workflow
name: Chaos Engineering
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Chaos Tests
        env:
          CHAOS_SAFE_MODE: 1
        run: |
          ./chaos-engineering/run-chaos.sh full-chaos --duration 5
```

## 🔍 Troubleshooting

### Common Issues

**Permission Errors**:

```bash
# Some scripts require sudo for system modifications
sudo ./run-chaos.sh network-partition
sudo ./run-chaos.sh external-service-failure
```

**Missing Tools**:

```bash
# Install missing dependencies
sudo apt-get install stress-ng  # Ubuntu/Debian
brew install stress-ng          # macOS
```

**Port Conflicts**:

```bash
# Check for conflicting processes
lsof -i :8888
netstat -tuln | grep 8888
```

### Debug Mode

Enable detailed logging:

```bash
export CHAOS_DEBUG=1
./run-chaos.sh network-partition --duration 5
```

### Log Files

Check experiment logs:

```bash
# Main runner log
tail -f chaos-engineering/reports/chaos-runner.log

# Individual experiment logs
tail -f /tmp/network-partition-chaos.log
tail -f /tmp/service-failure-chaos.log
```

## 📚 Advanced Usage

### Custom Experiments

Extend the suite with custom experiments:

```bash
# Create new experiment script
cp scripts/network-partition.sh scripts/custom-experiment.sh
# Edit and customize...

# Add to main runner
# Edit run-chaos.sh and add to EXPERIMENTS array
```

### Integration with Monitoring

```bash
# Send metrics to monitoring system
curl -X POST "http://monitoring-system/metrics" \
  -H "Content-Type: application/json" \
  -d @/tmp/network-partition-metrics.json
```

### Automated Analysis

```bash
# Analyze results with custom scripts
./analyze-results.py chaos-engineering/reports/experiments/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

### Adding New Experiments

1. Create script in `scripts/` directory
2. Follow existing naming conventions
3. Include comprehensive logging
4. Add safety checks and cleanup
5. Update main runner configuration
6. Document in README

## 📄 License

This chaos engineering suite is part of the VisAPI project and follows the same licensing terms.

## 🆘 Support

For issues, questions, or contributions:

- Check existing logs and metrics
- Review troubleshooting section
- Create issue with detailed information
- Include experiment outputs and system information

---

**Remember**: Chaos engineering is about learning and improving system resilience. Always run experiments safely and learn from the results to build more robust systems.
