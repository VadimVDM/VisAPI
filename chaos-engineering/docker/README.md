# Docker-based Chaos Engineering for VisAPI

This directory contains Docker-based chaos engineering setup for testing the resilience of the VisAPI platform in an isolated environment.

## Overview

The Docker chaos testing environment provides:

- Isolated network for chaos experiments
- Containerized VisAPI services (backend, worker)
- Supporting infrastructure (Redis, PostgreSQL, Prometheus, Grafana)
- Chaos engineering tools (Pumba, network manipulation)
- Mock external services for testing

## Quick Start

### Prerequisites

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Ensure you're in the VisAPI project root
cd /Users/vadim/Projects/VisAPI
```

### Start Chaos Environment

```bash
# Start the chaos testing environment
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml up -d

# Check service status
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml ps

# View logs
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml logs -f
```

### Run Chaos Experiments

```bash
# Access the chaos runner container
docker exec -it chaos-runner bash

# Run network chaos experiment
./scripts/network-chaos.sh redis_unreachable -d 60 --environment docker

# Run service chaos experiment
./scripts/service-chaos.sh kill_worker -d 60 --environment docker

# Run resource chaos experiment
./scripts/resource-chaos.sh memory_pressure -d 60 --environment docker
```

### Stop Chaos Environment

```bash
# Stop all services
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml down

# Remove volumes (optional)
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml down -v
```

## Services

### Core Services

| Service     | Container              | Port | Description           |
| ----------- | ---------------------- | ---- | --------------------- |
| Backend API | `visapi-backend-chaos` | 3000 | NestJS API gateway    |
| Worker      | `visapi-worker-chaos`  | -    | BullMQ job processors |
| PostgreSQL  | `chaos-postgres`       | 5432 | Database              |
| Redis       | `chaos-redis`          | 6379 | Queue and cache       |

### Monitoring Services

| Service    | Container          | Port | Description        |
| ---------- | ------------------ | ---- | ------------------ |
| Prometheus | `chaos-prometheus` | 9090 | Metrics collection |
| Grafana    | `chaos-grafana`    | 3001 | Visualization      |

### Chaos Services

| Service          | Container        | Description                  |
| ---------------- | ---------------- | ---------------------------- |
| Network Chaos    | `chaos-network`  | Network delay injection      |
| Resource Chaos   | `chaos-resource` | Memory/CPU stress testing    |
| Container Killer | `chaos-killer`   | Random container termination |
| Chaos Runner     | `chaos-runner`   | Chaos Toolkit execution      |

### Mock Services

| Service    | Container    | Port | Description    |
| ---------- | ------------ | ---- | -------------- |
| Mock Slack | `mock-slack` | 1080 | Mock Slack API |

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chaos Network (172.20.0.0/16)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Backend    │    │    Worker    │    │   Database   │  │
│  │   :3000      │◄──►│              │◄──►│   :5432      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              │                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Redis      │    │ Prometheus   │    │   Grafana    │  │
│  │   :6379      │    │   :9090      │    │   :3001      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Chaos Runner │    │ Network Chaos│    │ Mock Services│  │
│  │   :8080      │    │   (Pumba)    │    │   :1080      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Chaos Scenarios

### Network Chaos

```bash
# Block Redis connections
docker exec chaos-network /etc/network-chaos/iptables-rules.sh block-redis

# Add network latency
docker exec chaos-network /etc/network-chaos/iptables-rules.sh add-latency redis

# Restore network
docker exec chaos-network /etc/network-chaos/iptables-rules.sh restore
```

### Container Chaos

```bash
# Kill worker container
docker exec chaos-killer pumba kill --signal SIGTERM visapi-worker-chaos

# Add memory stress
docker exec chaos-resource pumba stress --stress-memory 256m visapi-backend-chaos

# Add CPU stress
docker exec chaos-resource pumba stress --stress-cpu 2 visapi-backend-chaos
```

### Service Chaos

```bash
# Access chaos runner
docker exec -it chaos-runner bash

# Run service failure experiments
./scripts/service-chaos.sh kill_worker -d 30 --environment docker
./scripts/service-chaos.sh memory_leak -d 60 --environment docker
./scripts/service-chaos.sh cpu_spike -d 45 --environment docker
```

## Monitoring

### Prometheus Metrics

Access Prometheus at http://localhost:9090

Key metrics to monitor:

- `http_request_duration_seconds`
- `http_requests_total`
- `queue_depth_total`
- `job_latency_seconds`

### Grafana Dashboards

Access Grafana at http://localhost:3001

- Username: `admin`
- Password: `chaos123`

Pre-configured dashboards:

- VisAPI System Overview
- Chaos Experiment Metrics
- Network Performance
- Container Resources

### Health Checks

```bash
# Check service health
curl http://localhost:3000/api/v1/healthz

# Check queue metrics
curl http://localhost:3000/api/v1/queue/metrics

# Check Prometheus metrics
curl http://localhost:9090/metrics
```

## Configuration

### Environment Variables

Set these in your `.env` file or export them:

```bash
# VisAPI Configuration
export VISAPI_API_URL=http://localhost:3000
export VISAPI_API_KEY=your_api_key_here

# Chaos Configuration
export CHAOS_SCRIPTS_DIR=/chaos-engineering/scripts
export ENVIRONMENT=docker

# Monitoring Configuration
export PROMETHEUS_URL=http://localhost:9090
export GRAFANA_URL=http://localhost:3001
```

### Custom Chaos Scripts

Place custom chaos scripts in `./scripts/`:

- `network-chaos.sh` - Network partition simulation
- `service-chaos.sh` - Service failure simulation
- `resource-chaos.sh` - Resource exhaustion
- `external-chaos.sh` - External service failures

### Prometheus Configuration

Edit `./prometheus/prometheus.yml` to add scraping targets:

```yaml
scrape_configs:
  - job_name: 'visapi-backend'
    static_configs:
      - targets: ['visapi-backend-chaos:3000']
  - job_name: 'visapi-worker'
    static_configs:
      - targets: ['visapi-worker-chaos:3001']
```

## Safety Features

### Automatic Recovery

All chaos experiments include automatic recovery:

- Network rules are restored after experiment
- Containers are restarted if killed
- Resource limits are removed
- Health checks validate recovery

### Emergency Stop

```bash
# Stop all chaos experiments immediately
docker exec chaos-runner ./safety/emergency-stop.sh

# Restart all services
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml restart
```

### Blast Radius Control

- Isolated network prevents external impact
- Resource limits prevent system overload
- Time-bounded experiments auto-terminate
- Container labels enable selective targeting

## Troubleshooting

### Common Issues

**Services not starting:**

```bash
# Check service logs
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml logs [service]

# Check service health
docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml ps
```

**Network connectivity issues:**

```bash
# Check network configuration
docker network inspect chaos-network

# Test connectivity between services
docker exec visapi-backend-chaos ping chaos-redis
```

**Chaos experiments not working:**

```bash
# Check chaos runner logs
docker logs chaos-runner

# Verify scripts are executable
docker exec chaos-runner ls -la /chaos-engineering/scripts/
```

**Resource constraints:**

```bash
# Check container resources
docker stats

# Increase resource limits in docker-compose.yml
```

### Debug Commands

```bash
# Access containers
docker exec -it visapi-backend-chaos bash
docker exec -it chaos-runner bash

# Check network rules
docker exec chaos-network iptables -L -n

# Monitor resource usage
docker exec chaos-resource top

# View chaos experiment logs
docker exec chaos-runner tail -f /chaos-engineering/logs/latest.log
```

## Best Practices

1. **Start Small**: Begin with low-impact experiments
2. **Monitor Continuously**: Watch metrics during experiments
3. **Document Results**: Keep logs of all experiments
4. **Automate Recovery**: Always include rollback procedures
5. **Isolate Testing**: Use separate network and containers
6. **Validate Health**: Check system health before/after experiments

## Integration with CI/CD

### GitHub Actions

```yaml
name: Chaos Engineering Tests
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  chaos-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start Chaos Environment
        run: |
          docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml up -d
          sleep 30
      - name: Run Chaos Experiments
        run: |
          docker exec chaos-runner ./scripts/network-chaos.sh redis_unreachable -d 60
          docker exec chaos-runner ./scripts/service-chaos.sh kill_worker -d 30
      - name: Cleanup
        run: |
          docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml down -v
```

## Advanced Features

### Custom Chaos Actions

Create custom chaos actions by extending the chaos runner:

```python
# /chaos-engineering/docker/chaos-runner/custom_actions.py
import docker
import time

def chaos_network_partition(container_name, duration):
    client = docker.from_env()
    container = client.containers.get(container_name)

    # Implement custom network partition logic
    pass
```

### Metrics Collection

Monitor chaos experiments with custom metrics:

```bash
# Collect metrics during chaos
docker exec chaos-runner ./monitoring/metrics-collector.js \
  --experiment redis_failover \
  --duration 300 \
  --output /chaos-engineering/reports/
```

### Automated Reports

Generate automated chaos experiment reports:

```bash
# Generate experiment report
docker exec chaos-runner ./monitoring/report-generator.js \
  --experiment redis_failover \
  --format html \
  --output /chaos-engineering/reports/
```

---

**⚠️ Important**: This Docker environment is for testing purposes only. Do not use production data or credentials in this environment.
