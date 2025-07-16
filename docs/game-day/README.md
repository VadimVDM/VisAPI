# Game Day Documentation

This directory contains all documentation for conducting Game Day chaos engineering sessions for the VisAPI platform.

## Overview

Game Day is a structured practice where we intentionally introduce failures into our production system to test resilience, validate recovery procedures, and improve our incident response capabilities.

**Frequency**: Quarterly  
**Duration**: 3 hours  
**Environment**: Production (with safety controls)  

## Documentation Structure

### 1. Experiment Runbooks

Detailed step-by-step guides for each chaos experiment:

- **[Redis Failover Runbook](./redis-failover-runbook.md)**  
  Tests queue system resilience during Redis connection failures
  
- **[Worker Failure Runbook](./worker-failure-runbook.md)**  
  Validates job processing during worker crashes and resource exhaustion
  
- **[External Service Failure Runbook](./external-service-failure-runbook.md)**  
  Ensures graceful degradation when third-party services fail
  
- **[Network Partition Runbook](./network-partition-runbook.md)**  
  Tests system behavior during network splits and connectivity issues

### 2. Templates

Standardized templates for documentation:

- **[Experiment Report Template](./experiment-report-template.md)**  
  For documenting individual experiment results
  
- **[Lessons Learned Template](./lessons-learned-template.md)**  
  For capturing overall Game Day insights and action items

### 3. Facilitation Guide

- **[Facilitation Guide](./facilitation-guide.md)**  
  Complete guide for Game Day facilitators including timeline, scripts, and best practices

## Quick Start

### For Participants

1. Review the [Facilitation Guide](./facilitation-guide.md) to understand the process
2. Read the runbooks for experiments you'll be involved in
3. Ensure you have access to all required systems
4. Join the Game Day session 15 minutes early for briefing

### For Facilitators

1. Schedule Game Day at least 1 week in advance
2. Review all documentation in this directory
3. Verify chaos engineering toolkit is working
4. Prepare communication channels and recording tools
5. Brief the team on safety protocols

## Safety First

⚠️ **Important Safety Rules:**

1. **Always have an emergency stop**: `./chaos-engineering/EMERGENCY-STOP-ALL.sh`
2. **Monitor user impact**: Abort if customer impact exceeds 10%
3. **Protect data**: Never run experiments that risk data loss
4. **Communicate clearly**: Use agreed abort keywords
5. **Document everything**: For learning and compliance

## Game Day Scenarios

### Scenario 1: Redis Failover
- **Impact**: Queue processing interruption
- **Duration**: 10-15 minutes
- **Recovery**: Automatic with manual verification
- **Key Learning**: Queue resilience and job recovery

### Scenario 2: Worker Process Failure
- **Impact**: Reduced processing capacity
- **Duration**: 15-20 minutes
- **Recovery**: Auto-scaling and redistribution
- **Key Learning**: Load balancing and degraded operations

### Scenario 3: External Service Outage
- **Impact**: Feature degradation
- **Duration**: 20-30 minutes
- **Recovery**: Circuit breakers and retries
- **Key Learning**: Graceful degradation patterns

### Scenario 4: Network Partition
- **Impact**: Component isolation
- **Duration**: 10-20 minutes
- **Recovery**: Automatic healing with consistency checks
- **Key Learning**: Split-brain handling and data consistency

## Key Metrics

Track these metrics for each experiment:

- **Time to Detect (TTD)**: How quickly issues are identified
- **Time to Alert (TTA)**: How fast alerts fire
- **Time to Mitigate (TTM)**: Initial response effectiveness
- **Time to Recover (TTR)**: Full service restoration
- **Data Integrity**: No data loss or corruption
- **User Impact**: Percentage of affected users

## Tools & Resources

### Required Access
- Chaos engineering toolkit
- Production monitoring (Grafana)
- Service provider dashboards
- Communication channels (Slack)
- Incident management tools

### Dashboards
- [Production Dashboard](https://grafana.com/d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e)
- [Queue Monitoring](https://api.visanet.app/admin/queue)
- [Alerting Dashboard](https://grafana.com/d/4582a630-7be8-41ec-98a0-2e65adeb9828)

### Commands Reference
```bash
# Emergency stop all experiments
./chaos-engineering/EMERGENCY-STOP-ALL.sh

# Check system health
curl https://api.visanet.app/api/v1/healthz

# View queue metrics
curl https://api.visanet.app/api/v1/queue/metrics -H "X-API-Key: $API_KEY"

# Check experiment status
./chaos-engineering/experiments/status.sh
```

## After Game Day

1. **Immediate**: Thank participants, share raw notes
2. **48 hours**: Complete experiment reports
3. **1 week**: Finalize lessons learned, create action items
4. **1 month**: Implement high-priority fixes
5. **Next quarter**: Schedule follow-up Game Day

## Best Practices

### Do's ✅
- Test in production (with controls)
- Document everything
- Celebrate learning from failures
- Involve diverse team members
- Follow time boxes strictly
- Share results broadly

### Don'ts ❌
- Skip safety briefings
- Extend beyond planned duration
- Blame individuals for issues
- Hide or minimize failures
- Run without proper preparation
- Impact real users unnecessarily

## Evolution

This documentation should evolve based on:
- Lessons learned from each Game Day
- New scenarios identified
- System architecture changes
- Team feedback
- Industry best practices

## Contact

For questions about Game Day:
- Slack: #platform-resilience
- Email: platform-team@visanet.com
- Wiki: Internal Game Day wiki page

---

**Remember**: The goal of Game Day is learning and improvement, not perfection. Every failure discovered is a future outage prevented.