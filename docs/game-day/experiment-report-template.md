# Game Day Experiment Report Template

**Date**: _____________  
**Experiment**: _____________  
**Duration**: _____ minutes  
**Participants**: _____________  

## Executive Summary

Provide a 2-3 sentence summary of the experiment, its outcome, and key findings.

## Experiment Details

### Scenario
- **Type**: [Service Failure | Network Partition | Resource Exhaustion | External Dependency]
- **Severity**: [P0 | P1 | P2]
- **Components Affected**: _____________
- **Expected Impact**: _____________

### Timeline

| Time | Event | Observer |
|------|-------|----------|
| T-5 | Pre-experiment validation | |
| T+0 | Experiment initiated | |
| T+X | First detection | |
| T+X | Automatic response triggered | |
| T+X | Manual intervention | |
| T+X | Service restored | |
| T+X | Full recovery confirmed | |

## Metrics Collected

### Detection & Response
- **Time to Detect (TTD)**: _____ seconds
- **Time to Alert (TTA)**: _____ seconds  
- **Time to Mitigate (TTM)**: _____ minutes
- **Time to Recover (TTR)**: _____ minutes

### System Impact
- **Availability During Incident**: _____%
- **Requests Failed**: _____
- **Requests Degraded**: _____
- **Data Loss**: [None | _____ records]
- **Revenue Impact**: $_____

### Performance Metrics

| Metric | Pre-Incident | During Incident | Post-Recovery |
|--------|--------------|-----------------|---------------|
| API Latency (P50) | | | |
| API Latency (P95) | | | |
| API Latency (P99) | | | |
| Error Rate | | | |
| Throughput (req/s) | | | |

## Observations

### What Worked Well
1. 
2. 
3. 

### What Didn't Work
1. 
2. 
3. 

### Unexpected Behaviors
1. 
2. 

### User Impact
- **Customer Complaints**: _____
- **Support Tickets**: _____
- **SLA Breaches**: _____

## System Behavior Analysis

### Automated Systems
- [ ] Monitoring detected issue correctly
- [ ] Alerts fired appropriately  
- [ ] Circuit breakers activated
- [ ] Auto-scaling triggered
- [ ] Failover completed successfully

### Manual Interventions Required
1. 
2. 

### Recovery Process
- [ ] Automatic recovery successful
- [ ] Manual recovery steps required
- [ ] Data consistency verified
- [ ] All services restored

## Lessons Learned

### Technical Findings
1. 
2. 
3. 

### Process Improvements
1. 
2. 
3. 

### Documentation Gaps
1. 
2. 

## Action Items

| Priority | Item | Owner | Due Date | Status |
|----------|------|-------|----------|--------|
| P0 | | | | |
| P1 | | | | |
| P2 | | | | |

## Follow-Up Experiments

Based on findings, recommend follow-up experiments:
1. 
2. 

## Artifacts

### Logs & Traces
- Experiment logs: `logs/game-day/YYYY-MM-DD-experiment-name/`
- Traces: [Link to traces]
- Metrics snapshots: [Link to Grafana]

### Screenshots
- [Monitoring Dashboard During Incident]
- [Error Messages Shown to Users]
- [Recovery Progress]

## Approvals

- **Experiment Lead**: _____________ Date: _____
- **Platform Owner**: _____________ Date: _____
- **Engineering Manager**: _____________ Date: _____

---

## Appendix A: Raw Data

### Command Outputs
```bash
# Paste relevant command outputs here
```

### Log Excerpts
```
# Paste relevant log entries here
```

### Metrics Export
```json
// Paste metrics data here
```

## Appendix B: Incident Response Rating

Rate the incident response on a scale of 1-5:

| Category | Rating | Notes |
|----------|--------|-------|
| Detection Speed | ⭐⭐⭐⭐⭐ | |
| Alert Quality | ⭐⭐⭐⭐⭐ | |
| Runbook Effectiveness | ⭐⭐⭐⭐⭐ | |
| Communication | ⭐⭐⭐⭐⭐ | |
| Recovery Speed | ⭐⭐⭐⭐⭐ | |
| **Overall** | ⭐⭐⭐⭐⭐ | |