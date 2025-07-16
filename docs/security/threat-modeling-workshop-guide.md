# VisAPI Threat Modeling Workshop Guide

## Workshop Overview

This guide provides a structured approach to conducting threat modeling workshops for the VisAPI system. It includes facilitation instructions, exercises, and deliverables to ensure comprehensive security analysis.

## Pre-Workshop Preparation

### Required Materials

- [ ] System architecture diagrams (printed and digital)
- [ ] Data flow diagrams from `data-flow-diagram.md`
- [ ] STRIDE threat model template
- [ ] Risk assessment matrices
- [ ] Sticky notes and markers (for in-person sessions)
- [ ] Digital whiteboard tool (for remote sessions)
- [ ] Workshop attendance sheet
- [ ] Action item tracking template

### Participant Preparation

- [ ] Review system architecture documentation
- [ ] Familiarize with STRIDE methodology
- [ ] Prepare component ownership assignments
- [ ] Review previous security assessments
- [ ] Gather relevant security metrics

### Technical Setup

- [ ] Conference room with projector/screen
- [ ] Whiteboard or flipchart paper
- [ ] Laptops for documentation
- [ ] Network access for system demos
- [ ] Screen sharing capability for remote participants

## Workshop Structure

### Session 1: System Understanding (90 minutes)

#### Opening (15 minutes)

**Facilitator Actions:**

1. Welcome participants and introductions
2. Review workshop objectives and agenda
3. Establish ground rules for participation
4. Assign roles (facilitator, scribe, timekeeper)

**Key Points to Cover:**

- Workshop is collaborative, not blame-focused
- All perspectives are valuable
- Document everything for future reference
- Focus on realistic threats and practical solutions

#### Architecture Overview (45 minutes)

**Facilitator Actions:**

1. Present high-level system architecture
2. Walk through data flow diagrams
3. Identify trust boundaries
4. Map external dependencies

**Exercise 1: Architecture Validation**

- **Time:** 20 minutes
- **Participants:** Split into 3 groups
- **Task:** Each group reviews one architectural layer:
  - Group 1: Frontend and CDN layer
  - Group 2: API and application layer
  - Group 3: Database and external services
- **Deliverable:** Validated architecture diagram with corrections

**Exercise 2: Trust Boundary Mapping**

- **Time:** 20 minutes
- **Participants:** Whole group
- **Task:** Identify and mark trust boundaries on architecture diagram
- **Deliverable:** Trust boundary map with security zones

#### Data Flow Analysis (30 minutes)

**Facilitator Actions:**

1. Trace critical data flows
2. Identify data classification levels
3. Map data storage locations
4. Review data access patterns

**Exercise 3: Data Flow Tracing**

- **Time:** 25 minutes
- **Participants:** Split into 4 groups
- **Task:** Trace one critical data flow each:
  - Group 1: User authentication flow
  - Group 2: Webhook processing flow
  - Group 3: Queue job processing
  - Group 4: External API integration
- **Deliverable:** Detailed data flow sequence diagrams

**Break (15 minutes)**

### Session 2: Threat Identification (2 hours)

#### STRIDE Methodology Overview (20 minutes)

**Facilitator Actions:**

1. Explain STRIDE framework
2. Provide examples for each category
3. Review threat analysis techniques
4. Distribute STRIDE worksheets

**STRIDE Categories:**

- **Spoofing**: Identity verification failures
- **Tampering**: Data or system modifications
- **Repudiation**: Denial of actions
- **Information Disclosure**: Unauthorized data access
- **Denial of Service**: Service availability attacks
- **Elevation of Privilege**: Unauthorized access escalation

#### Component-Based Threat Analysis (90 minutes)

**Facilitator Actions:**

1. Divide system into logical components
2. Assign component ownership to participants
3. Guide threat identification process
4. Document threats using STRIDE template

**Exercise 4: Component Threat Analysis**

- **Time:** 60 minutes
- **Participants:** Split by component ownership
- **Components to analyze:**
  - Next.js Frontend (2 people)
  - NestJS API Gateway (3 people)
  - Supabase Database (2 people)
  - Upstash Redis Queue (2 people)
  - External Integrations (2 people)
- **Task:** Identify threats for each STRIDE category
- **Deliverable:** Threat identification worksheets

**Exercise 5: Cross-Component Threat Analysis**

- **Time:** 30 minutes
- **Participants:** Whole group
- **Task:** Identify threats that span multiple components
- **Focus areas:**
  - Authentication flows across components
  - Data flows between systems
  - Error handling and propagation
  - Session management across boundaries
- **Deliverable:** Cross-component threat matrix

#### Threat Prioritization (30 minutes)

**Facilitator Actions:**

1. Introduce risk assessment criteria
2. Guide threat scoring process
3. Facilitate group discussion on priorities
4. Document high-priority threats

**Exercise 6: Threat Risk Assessment**

- **Time:** 25 minutes
- **Participants:** Whole group
- **Task:** Score each identified threat using:
  - Impact: High (3), Medium (2), Low (1)
  - Likelihood: High (3), Medium (2), Low (1)
  - Risk Score: Impact × Likelihood
- **Deliverable:** Prioritized threat list

**Break (15 minutes)**

### Session 3: Mitigation Planning (90 minutes)

#### Current Security Controls Review (30 minutes)

**Facilitator Actions:**

1. Review existing security controls
2. Map controls to identified threats
3. Identify control gaps
4. Assess control effectiveness

**Exercise 7: Control Mapping**

- **Time:** 25 minutes
- **Participants:** Split into 2 groups
- **Task:**
  - Group 1: Map preventive controls to threats
  - Group 2: Map detective controls to threats
- **Deliverable:** Control coverage matrix

#### Mitigation Strategy Development (45 minutes)

**Facilitator Actions:**

1. Brainstorm mitigation strategies
2. Evaluate implementation feasibility
3. Prioritize mitigation efforts
4. Assign ownership for implementations

**Exercise 8: Mitigation Planning**

- **Time:** 40 minutes
- **Participants:** Split by threat priority
- **Task:** Develop mitigation strategies for top 10 threats
- **Focus areas:**
  - Technical controls
  - Process improvements
  - Policy updates
  - Monitoring enhancements
- **Deliverable:** Mitigation strategy document

#### Action Item Planning (15 minutes)

**Facilitator Actions:**

1. Consolidate action items
2. Assign owners and timelines
3. Define success criteria
4. Schedule follow-up reviews

**Exercise 9: Action Item Assignment**

- **Time:** 15 minutes
- **Participants:** Whole group
- **Task:** Create action item backlog with:
  - Priority level (P0-P3)
  - Owner assignment
  - Target completion date
  - Success criteria
- **Deliverable:** Action item backlog

### Session 4: Documentation and Next Steps (45 minutes)

#### Documentation Review (20 minutes)

**Facilitator Actions:**

1. Review captured information
2. Verify completeness
3. Clarify ambiguous items
4. Assign documentation tasks

#### Follow-up Planning (15 minutes)

**Facilitator Actions:**

1. Schedule regular review meetings
2. Define reporting mechanisms
3. Plan implementation checkpoints
4. Assign communication responsibilities

#### Workshop Wrap-up (10 minutes)

**Facilitator Actions:**

1. Summarize key findings
2. Acknowledge participant contributions
3. Confirm next steps
4. Collect feedback on workshop process

## Workshop Exercises and Templates

### Exercise Template: Component Threat Analysis

**Component Name:** ********\_********

**Component Owner:** ********\_********

**STRIDE Analysis:**

| Threat Type            | Threat Description | Impact | Likelihood | Risk Score | Current Controls | Mitigation Strategy |
| ---------------------- | ------------------ | ------ | ---------- | ---------- | ---------------- | ------------------- |
| Spoofing               |                    |        |            |            |                  |                     |
| Tampering              |                    |        |            |            |                  |                     |
| Repudiation            |                    |        |            |            |                  |                     |
| Information Disclosure |                    |        |            |            |                  |                     |
| Denial of Service      |                    |        |            |            |                  |                     |
| Elevation of Privilege |                    |        |            |            |                  |                     |

### Exercise Template: Data Flow Threat Analysis

**Data Flow:** ********\_********

**Data Classification:** ********\_********

**Trust Boundaries Crossed:** ********\_********

**Threat Analysis:**

| Step | Data State | Threats | Controls | Residual Risk |
| ---- | ---------- | ------- | -------- | ------------- |
| 1.   |            |         |          |               |
| 2.   |            |         |          |               |
| 3.   |            |         |          |               |
| 4.   |            |         |          |               |
| 5.   |            |         |          |               |

### Risk Assessment Matrix

| Risk Level | Score Range | Impact | Likelihood | Response Time |
| ---------- | ----------- | ------ | ---------- | ------------- |
| Critical   | 9           | High   | High       | Immediate     |
| High       | 6           | High   | Medium     | 1-2 weeks     |
| Medium     | 4           | Medium | Medium     | 1-2 months    |
| Low        | 1-3         | Low    | Low        | Next quarter  |

### Action Item Template

**Action Item ID:** ********\_********

**Priority:** P0 / P1 / P2 / P3

**Title:** ********\_********

**Description:** ********\_********

**Owner:** ********\_********

**Due Date:** ********\_********

**Success Criteria:** ********\_********

**Dependencies:** ********\_********

**Status:** Not Started / In Progress / Completed / Blocked

**Notes:** ********\_********

## Facilitation Guidelines

### Effective Facilitation Techniques

#### Encouraging Participation

- Use round-robin questioning
- Avoid judgment or criticism
- Ask open-ended questions
- Encourage diverse perspectives
- Manage dominant personalities

#### Managing Group Dynamics

- Keep discussions on topic
- Manage time effectively
- Ensure all voices are heard
- Handle conflicts constructively
- Maintain energy levels

#### Documentation Best Practices

- Assign dedicated scribe
- Use visual aids effectively
- Document decisions and rationale
- Capture action items clearly
- Review and confirm understanding

### Common Facilitation Challenges

#### Challenge: Participants Focus on Implementation Details

**Solution:** Redirect to threat identification first, implementation later

#### Challenge: Overwhelming Number of Low-Risk Threats

**Solution:** Focus on high-impact threats, park low-risk items for later

#### Challenge: Disagreement on Risk Levels

**Solution:** Use structured scoring criteria and group consensus

#### Challenge: Limited Security Knowledge

**Solution:** Provide STRIDE examples and encourage questions

#### Challenge: Time Management Issues

**Solution:** Use timeboxing and parking lot for off-topic items

## Post-Workshop Activities

### Immediate Actions (Within 24 hours)

- [ ] Compile and distribute workshop notes
- [ ] Create action item backlog in project management tool
- [ ] Schedule immediate follow-up for P0 items
- [ ] Update threat model documentation
- [ ] Communicate key findings to stakeholders

### Short-term Actions (Within 1 week)

- [ ] Validate threat model with security team
- [ ] Create implementation timeline
- [ ] Assign resources for high-priority items
- [ ] Update security documentation
- [ ] Schedule progress review meetings

### Long-term Actions (Within 1 month)

- [ ] Implement high-priority mitigations
- [ ] Update security policies and procedures
- [ ] Integrate findings into security training
- [ ] Plan quarterly threat model reviews
- [ ] Measure and report security improvements

## Workshop Metrics and Success Criteria

### Quantitative Metrics

- Number of threats identified
- Number of high-risk threats
- Percentage of threats with mitigations
- Average risk score reduction
- Action item completion rate

### Qualitative Metrics

- Participant satisfaction scores
- Quality of threat identification
- Effectiveness of mitigation strategies
- Improvement in security awareness
- Stakeholder confidence in security posture

### Success Criteria

- [ ] All critical components analyzed for threats
- [ ] All high-risk threats have mitigation plans
- [ ] Action items assigned with clear ownership
- [ ] Documentation updated and accessible
- [ ] Follow-up process established
- [ ] Stakeholder buy-in achieved

## Workshop Variations

### Remote Workshop Adaptations

- Use breakout rooms for group exercises
- Utilize digital whiteboard tools
- Extend session times for technical issues
- Provide pre-workshop technical setup
- Record sessions for later reference

### Large Team Workshops

- Divide into smaller working groups
- Use multiple facilitators
- Implement structured reporting back
- Focus on specific system areas
- Plan multi-day workshops

### Executive Summary Workshops

- Focus on business impact
- Emphasize risk-based discussions
- Provide clear ROI calculations
- Include compliance considerations
- Prepare executive-level deliverables

## Resources and References

### Internal Resources

- VisAPI architecture documentation
- Security policies and procedures
- Previous security assessments
- Incident response procedures
- Risk management framework

### External Resources

- OWASP Threat Modeling Guide
- Microsoft STRIDE methodology
- NIST Cybersecurity Framework
- SANS threat modeling resources
- Industry threat intelligence

### Tools and Software

- Mermaid for diagram creation
- Microsoft Threat Modeling Tool
- OWASP Threat Dragon
- Lucidchart for collaborative diagramming
- Jira for action item tracking

---

**Last Updated**: July 16, 2025  
**Version**: 1.0  
**Author**: Security Team  
**Review Date**: August 16, 2025

**Facilitator Certification**:

- Required training: Threat modeling fundamentals
- Recommended experience: 2+ security workshops
- Backup facilitator: Always assign for continuity

**Workshop Schedule**:

- Initial workshop: Within 2 weeks
- Follow-up review: 4 weeks post-workshop
- Quarterly reviews: Ongoing
- Annual full assessment: January 2026
