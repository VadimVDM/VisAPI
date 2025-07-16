# Game Day Facilitation Guide

## Overview

This guide provides step-by-step instructions for facilitating a VisAPI Game Day chaos engineering session. The session tests system resilience through controlled failure scenarios.

**Duration**: 3 hours  
**Frequency**: Quarterly (recommended)  
**Team Size**: 5-8 participants  

## Pre-Game Day Preparation (1 Week Before)

### 1. Schedule & Communications
- [ ] Book 3-hour calendar slot with all participants
- [ ] Send calendar invite with agenda and pre-reading
- [ ] Book war room (physical or virtual)
- [ ] Ensure no production deployments scheduled
- [ ] Notify customer success team

### 2. Technical Preparation
- [ ] Verify chaos engineering toolkit is updated
- [ ] Test all runbooks in staging environment
- [ ] Ensure monitoring dashboards are accessible
- [ ] Verify all participants have necessary access
- [ ] Prepare backup communication channels

### 3. Documentation Review
- [ ] Review all experiment runbooks
- [ ] Update contact information
- [ ] Prepare report templates
- [ ] Create shared folder for artifacts

## Game Day Roles & Responsibilities

### Core Roles (Required)

1. **Facilitator** (You)
   - Leads the session
   - Manages timeline
   - Ensures safety protocols
   - Coordinates communication

2. **Chaos Engineer**
   - Executes experiments
   - Monitors safety conditions
   - Implements emergency stops
   - Documents technical details

3. **Monitoring Observer**
   - Watches all dashboards
   - Reports metrics
   - Identifies anomalies
   - Records timeline

4. **Incident Commander**
   - Makes recovery decisions
   - Coordinates response
   - Manages escalations
   - Leads problem-solving

5. **Scribe**
   - Documents all actions
   - Records decisions
   - Captures lessons learned
   - Manages report templates

### Optional Roles

6. **Customer Advocate**
   - Monitors user experience
   - Checks customer-facing systems
   - Reports business impact

7. **Security Observer**
   - Monitors for security implications
   - Ensures data integrity
   - Validates access controls

## Game Day Timeline

### T-30 minutes: Pre-Session Setup
```
□ Start recording session (if applicable)
□ Open communication channels (Slack/Teams)
□ Verify all participants present
□ Confirm emergency stop procedures
□ Test screen sharing and tools
□ Final system health check
```

### T-15 minutes: Briefing
```
□ Welcome and introductions
□ Review agenda and timeline
□ Assign roles and responsibilities
□ Review safety protocols
□ Confirm abort criteria
□ Answer questions
```

### T+0: Session Start

#### Hour 1: Redis Failover (0:00-0:45)
**Facilitator Script:**
```
"We're starting with our Redis failover scenario. This tests our queue 
system resilience. [Chaos Engineer], please initiate the Redis partition 
as documented in the runbook. [Monitoring Observer], call out any 
alerts as they fire. Expected recovery time is 10 minutes."
```

**Checkpoints:**
- [ ] 0:05 - Failure confirmed
- [ ] 0:10 - Automatic detection verified
- [ ] 0:20 - Recovery initiated
- [ ] 0:30 - Service restored
- [ ] 0:45 - Debrief complete

#### Break (0:45-0:55)
- Quick debrief of first experiment
- Stretch break
- Address any concerns

#### Hour 2: Worker Failure (0:55-1:40)
**Facilitator Script:**
```
"Next we're testing worker process failures. This validates our job 
processing resilience. We'll simulate both memory exhaustion and 
process crashes. Target recovery is 15 minutes."
```

**Checkpoints:**
- [ ] 1:00 - First worker failure
- [ ] 1:10 - Load redistribution verified
- [ ] 1:20 - Additional failures induced
- [ ] 1:30 - Full recovery
- [ ] 1:40 - Metrics reviewed

#### Hour 3: External Services (1:40-2:25)
**Facilitator Script:**
```
"Our final experiment tests external dependency failures. We'll 
simulate WhatsApp API and Supabase storage outages. Focus on 
graceful degradation and data consistency."
```

**Checkpoints:**
- [ ] 1:45 - External services blocked
- [ ] 1:55 - Degraded mode verified
- [ ] 2:05 - Recovery procedures initiated
- [ ] 2:15 - Services restored
- [ ] 2:25 - Consistency validated

### T+2:30: Wrap-up Session (2:25-3:00)

#### Immediate Debrief (15 minutes)
**Questions to Cover:**
1. "What surprised us today?"
2. "What worked better than expected?"
3. "What failed in unexpected ways?"
4. "What should we fix immediately?"

#### Action Items (10 minutes)
- Identify P0 issues requiring immediate fixes
- Assign owners to critical items
- Set follow-up meeting if needed

#### Closing (10 minutes)
- Thank participants
- Confirm report deadline
- Schedule lessons learned meeting
- Stop recording

## Safety Protocols

### Abort Criteria
Immediately stop experiments if:
- Production user impact exceeds 10%
- Data corruption detected
- Uncontrolled cascading failures
- Team member calls for stop
- External emergency

### Emergency Stop Procedure
```bash
# EMERGENCY STOP COMMAND
cd chaos-engineering/
./EMERGENCY-STOP-ALL.sh

# Verify all experiments stopped
./experiments/status.sh
```

### Communication Escalation
1. Team Slack channel
2. Engineering Manager
3. On-call phone
4. CTO/VP Engineering

## Facilitation Best Practices

### Do's ✅
- Keep strict time boundaries
- Encourage questions
- Maintain calm demeanor
- Focus on learning, not blame
- Document everything
- Celebrate successful recoveries
- Take breaks as scheduled

### Don'ts ❌
- Skip safety checks
- Rush through experiments
- Allow scope creep
- Ignore abort criteria
- Blame individuals
- Hide failures
- Extend beyond 3 hours

## Communication Templates

### Start of Experiment
```
"Starting [EXPERIMENT NAME] at [TIME].
Expected duration: [X] minutes
Expected impact: [DESCRIPTION]
Abort keyword: STOP

[Chaos Engineer], please proceed."
```

### During Issues
```
"We're seeing [ISSUE]. 
Current metrics: [METRICS]
[Incident Commander], what's your call?
Should we continue or abort?"
```

### Experiment Complete
```
"[EXPERIMENT] complete at [TIME].
Recovery time: [X] minutes
Issues noted: [COUNT]
Moving to debrief."
```

## Post-Game Day Tasks

### Immediate (Same Day)
- [ ] Thank you message to team
- [ ] Upload session recording
- [ ] Share raw notes in shared folder
- [ ] Create P0 tickets for critical issues

### Within 48 Hours
- [ ] Complete experiment reports
- [ ] Compile lessons learned
- [ ] Schedule follow-up meeting
- [ ] Update runbooks based on findings

### Within 1 Week
- [ ] Finalize Game Day report
- [ ] Get sign-offs from leadership
- [ ] Share results with broader team
- [ ] Update roadmap with improvements

## Facilitator Checklist

### Technical Requirements
- [ ] Chaos toolkit access
- [ ] Monitoring dashboard access
- [ ] Production read access
- [ ] Communication tools
- [ ] Recording software
- [ ] Timer/stopwatch

### Documents Needed
- [ ] This facilitation guide
- [ ] All experiment runbooks
- [ ] Report templates
- [ ] Contact list
- [ ] Architecture diagrams

### Mental Preparation
- Review all scenarios
- Prepare for unexpected outcomes
- Be ready to make quick decisions
- Stay calm under pressure
- Focus on learning objectives

## Common Challenges & Solutions

### Challenge: Experiment Won't Start
**Solution**: Have staging environment ready as backup. Can demonstrate concepts even if production test fails.

### Challenge: Recovery Takes Too Long
**Solution**: Set hard time limits. If recovery exceeds 2x RTO, abort and move to manual recovery.

### Challenge: Team Disagreement on Actions
**Solution**: Incident Commander has final say. Document dissenting opinions for lessons learned.

### Challenge: Real Production Issue During Game Day
**Solution**: Immediately abort Game Day. All hands on real issue. Reschedule Game Day.

## Success Metrics

A successful Game Day achieves:
- All planned experiments attempted
- Each experiment provides learnings
- No uncontrolled production impact
- Team coordination practiced
- Documentation improved
- Confidence increased

## Resources

### Quick Reference
- Emergency Stop: `./EMERGENCY-STOP-ALL.sh`
- Health Check: `curl https://api.visanet.app/api/v1/healthz`
- Grafana: https://grafana.com/d/ee4deafb-60c7-4cb1-a2d9-aa14f7ef334e
- Bull Board: https://api.visanet.app/admin/queue

### Contacts
- On-Call: Check PagerDuty
- Platform Team: #platform (Slack)
- Emergency: See escalation list

---

Remember: The goal is learning, not perfection. Failures during Game Day are successes - they reveal what needs improvement before a real incident occurs.