# Pre-Game Day Checklist

This checklist ensures all preparations are complete before conducting a chaos engineering Game Day session.

## 📅 Schedule and Planning (1 Week Before)

### Session Logistics

- [ ] **Date and Time Confirmed**: 3-4 hour block scheduled
- [ ] **All Team Members Available**: Core team members confirmed
- [ ] **Conference Room Booked**: Room with projector and multiple monitors
- [ ] **Calendar Invites Sent**: Include agenda and preparation materials
- [ ] **Zoom Room Reserved**: Backup for remote participants
- [ ] **Stakeholder Notification**: Inform leadership of planned session

### Team Preparation

- [ ] **Roles Assigned**: Each team member knows their role
- [ ] **Materials Shared**: All runbooks and checklists distributed
- [ ] **Pre-reading Completed**: Team reviews chaos engineering principles
- [ ] **Objectives Clarified**: Success criteria communicated to all
- [ ] **Questions Addressed**: Pre-session Q&A completed

## 🔧 Technical Setup (2-3 Days Before)

### System Health Verification

- [ ] **Production System Stable**: No ongoing incidents or deployments
- [ ] **Staging Environment Ready**: Mirror of production configured
- [ ] **Database Backups Current**: Recent backups verified
- [ ] **Infrastructure Monitoring**: All systems reporting healthy

### Monitoring and Alerting

- [ ] **Prometheus Operational**: All metrics collecting properly
  ```bash
  curl -f http://localhost:9090/api/v1/query?query=up
  ```
- [ ] **Grafana Dashboards**: All dashboards loading correctly
  ```bash
  curl -f http://localhost:3001/api/health
  ```
- [ ] **Alertmanager Configured**: Alert rules active and tested
- [ ] **Slack Integration**: Alert notifications working
- [ ] **PagerDuty Integration**: Escalation procedures tested

### Chaos Engineering Tools

- [ ] **Chaos Toolkit Installed**: Latest version available
  ```bash
  pip install chaostoolkit
  chaos --version
  ```
- [ ] **Custom Scripts Tested**: All chaos scripts executable
  ```bash
  ./chaos-engineering/scripts/network-chaos.sh --dry-run
  ./chaos-engineering/scripts/service-chaos.sh --dry-run
  ```
- [ ] **Docker Environment**: Chaos testing environment ready
  ```bash
  docker-compose -f chaos-engineering/docker/docker-compose.chaos.yml up -d
  ```
- [ ] **API Keys Configured**: All required credentials available
- [ ] **Safety Scripts**: Emergency stop procedures tested

## 🛡️ Safety Preparations (1 Day Before)

### Emergency Procedures

- [ ] **Emergency Contacts**: Updated contact list available
- [ ] **Escalation Procedures**: Clear escalation chain defined
- [ ] **Rollback Procedures**: Tested and documented
- [ ] **Communication Channels**: All channels operational
- [ ] **Emergency Stop Script**: Tested and accessible
  ```bash
  ./chaos-engineering/safety/emergency-stop.sh --verify
  ```

### Backup and Recovery

- [ ] **System Backups**: Recent backups of all critical data
- [ ] **Configuration Backups**: Current configuration snapshots
- [ ] **Recovery Procedures**: Tested and documented
- [ ] **Data Integrity Checks**: Baseline data checksums recorded
- [ ] **Service Dependencies**: External service contacts available

### Risk Assessment

- [ ] **Blast Radius Limited**: Experiments scoped to safe boundaries
- [ ] **Business Impact Assessed**: Low-impact time window chosen
- [ ] **Customer Communication**: Plan for customer notification if needed
- [ ] **Regulatory Compliance**: Ensure experiments meet compliance requirements

## 📋 Environment Setup (Day Of)

### Physical Setup

- [ ] **Conference Room Setup**: Projector and monitors configured
- [ ] **Network Connectivity**: Stable WiFi and ethernet available
- [ ] **Power Supply**: Adequate power for all devices
- [ ] **Whiteboard/Flipchart**: Available for documenting observations
- [ ] **Printed Materials**: Runbooks and checklists printed

### Digital Setup

- [ ] **Monitoring Dashboards**: All dashboards accessible on big screen
- [ ] **Communication Channels**: Slack channels active
- [ ] **Documentation Tools**: Shared documents ready for collaboration
- [ ] **Screen Sharing**: Zoom/Teams setup for remote participants
- [ ] **Recording Setup**: Session recording enabled (if desired)

## 👥 Team Readiness

### Role Confirmation

- [ ] **Game Day Facilitator**: Present and prepared
- [ ] **Chaos Engineer**: Tools tested and ready
- [ ] **Monitoring Observer**: Dashboards configured
- [ ] **Incident Commander**: Procedures reviewed
- [ ] **Documentation Scribe**: Templates ready

### Knowledge Verification

- [ ] **System Architecture**: All team members understand system
- [ ] **Incident Procedures**: Response procedures reviewed
- [ ] **Chaos Tools**: Team familiar with tools and scripts
- [ ] **Communication Protocols**: Everyone knows communication channels
- [ ] **Safety Procedures**: Emergency procedures understood

## 📊 Baseline Establishment

### Performance Metrics

- [ ] **API Response Times**: Baseline measurements recorded
- [ ] **Queue Processing**: Normal processing rates documented
- [ ] **Error Rates**: Current error rates measured
- [ ] **Resource Usage**: CPU, memory, disk usage recorded
- [ ] **External Dependencies**: Third-party service status verified

### System Health

- [ ] **All Services Running**: No failed services or processes
- [ ] **Database Connectivity**: All database connections healthy
- [ ] **Queue Health**: All queues processing normally
- [ ] **External APIs**: All external integrations operational
- [ ] **Monitoring Coverage**: All systems being monitored

## 🔍 Final Verification (1 Hour Before)

### System Status

- [ ] **No Active Incidents**: Production system stable
- [ ] **No Ongoing Deployments**: No changes in progress
- [ ] **All Monitors Green**: All health checks passing
- [ ] **Team Availability**: All team members present and ready
- [ ] **Tools Accessible**: All chaos engineering tools working

### Documentation Ready

- [ ] **Runbooks Available**: All experiment runbooks accessible
- [ ] **Checklists Printed**: Physical copies available
- [ ] **Templates Prepared**: Report templates ready
- [ ] **Shared Documents**: Real-time collaboration documents setup
- [ ] **Emergency Contacts**: Contact list easily accessible

## 🚀 Go/No-Go Decision

### Go Criteria (All Must Be Met)

- [ ] **System Healthy**: All systems operational and stable
- [ ] **Team Ready**: All required team members present
- [ ] **Tools Working**: All chaos engineering tools tested
- [ ] **Safety Net**: Emergency procedures tested and ready
- [ ] **Monitoring Active**: All monitoring and alerting functional
- [ ] **Communication Open**: All communication channels active

### No-Go Criteria (Any Triggers Postponement)

- [ ] **Active Incidents**: Any ongoing production incidents
- [ ] **System Instability**: Recent deployments or configuration changes
- [ ] **Monitoring Issues**: Critical monitoring systems down
- [ ] **Team Unavailable**: Key team members not present
- [ ] **Safety Concerns**: Any safety procedures not ready
- [ ] **Business Impact**: High-impact business activities scheduled

## 📝 Pre-Session Briefing

### 15-Minute Team Huddle

- [ ] **Objectives Review**: Confirm session goals and success criteria
- [ ] **Role Assignment**: Verify each person's role and responsibilities
- [ ] **Safety Reminder**: Review emergency procedures and signals
- [ ] **Timeline Walkthrough**: Confirm experiment schedule and timing
- [ ] **Communication Check**: Test all communication channels
- [ ] **Questions Addressed**: Final questions and concerns resolved

### Final Preparation

- [ ] **Experiment Order**: Confirm sequence of experiments
- [ ] **Success Criteria**: Review metrics and thresholds
- [ ] **Documentation Plan**: Confirm what will be documented
- [ ] **Break Schedule**: Plan for breaks and discussions
- [ ] **Contingency Plans**: Review backup plans for each experiment

## ⚠️ Last-Minute Considerations

### Weather the Storm

- [ ] **Mindset Preparation**: Team prepared for failures and learning
- [ ] **Psychological Safety**: Blame-free environment established
- [ ] **Learning Focus**: Emphasis on improvement, not perfection
- [ ] **Celebration Ready**: Plan to celebrate learnings and discoveries
- [ ] **Follow-up Planned**: Next steps and action items process ready

### Executive Briefing

- [ ] **Leadership Informed**: Key stakeholders aware of session
- [ ] **Business Context**: Clear understanding of business value
- [ ] **Risk Communication**: Risks and mitigations communicated
- [ ] **Success Metrics**: Clear definition of success shared
- [ ] **Follow-up Plan**: Post-session communication plan ready

---

## 📞 Emergency Contacts

**Game Day Facilitator**: [Name] - [Phone] - [Email]
**Engineering Manager**: [Name] - [Phone] - [Email]  
**On-Call Engineer**: [Phone] - [PagerDuty]
**Platform Lead**: [Name] - [Phone] - [Email]

## 🔗 Quick Links

- **Monitoring Dashboards**: http://localhost:3001/dashboards
- **Chaos Scripts**: `/chaos-engineering/scripts/`
- **Emergency Procedures**: `/chaos-engineering/safety/`
- **Slack Channel**: #chaos-engineering-gameday
- **Zoom Room**: [Game Day Zoom Link]

---

**✅ Checklist Complete**: All items verified and ready for Game Day session.

**❌ Items Outstanding**: Address any incomplete items before proceeding.

**⚠️ Proceed with Caution**: Only proceed if all safety criteria are met.

---

_This checklist should be completed by the Game Day Facilitator and verified by the Engineering Manager before any chaos engineering session begins._
