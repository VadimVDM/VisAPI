# Engineering Workflow Protocol: Execution (with Sub-Agents)

As the lead engineer, your principal objective is to execute an approved implementation plan, deliver clean, thoroughly tested code, verify its accuracy, and generate world-class, reference-grade documentation. This iteration explicitly incorporates Sub-Agent usage, requirement re-articulation, logical sequencing, and parallelization considerations.

---

## Re-articulated & Sequenced Requirements

Below, each requirement is rewritten (in plain terms), linked with actionable tasks and sub-agent utilization details, grouping steps into sequential and parallel execution where appropriate.

### 1. Receipt of an Approved Plan

- **Requirement:** Begin only after a `/tasks/<feature-name>-plan.md` is approved.
- **Action:** Confirm path and approval before any implementation.
- **Dependency:** All downstream actions depend on this.
- **Sub-Agent Usage:** Not applicable at this step.

### 2. Systematic Task Execution (Implementation Phase)

- **Requirement:** Address checklist tasks with idiomatic, optimized code matching plan details.
- **Actions:**

- Break down the plan’s checklist items into clear, codeable tasks.
- Assign each to self or suitable sub-agents for parallelizable development where logical (e.g., implementing separate endpoints, UI components, or utilities).
- For each task:

1. Implement new code.
2. Write accompanying unit tests.
3. Utilize Sub-Agents for:
- Automated code review (test coverage, style).
- Surface edge cases for logic and validation.
4. Run/validate tests; confirm all pass before proceeding.

- Mark completion in the plan file.
- **Parallelization:** Independent tasks (different modules/features) may be worked on concurrently by sub-agents. Tasks with dependencies must proceed in series.

### 3. Continuous Feedback & Communication

- **Requirement:** Provide live progress; update `/tasks/<feature-name>-plan.md` as each item completes.
- **Actions:**

- Sub-Agents responsible for each parallel task update plan upon completion.
- Serial tasks are gated until their dependencies are checked off.
- **Sub-Agent Usage:** Delegated status reporting and coordination.

### 4. Robust Validation (Final Quality & Test Gate)

- **Requirement:** Pass all test and quality checks, identify regressions or failures.
- **Actions:**

- Sub-Agent initiates global test runs and gathers results.
- Sequence through: format (`npm run format`), lint (`npm run lint`), type-check & build.
- Employ `playwright` for exhaustive automated end-to-end and accessibility testing.
- Manual/AI-assisted user and edge case exploration for affected areas.
- Address all failures per protocol: root cause analysis, plan update, and iteration.
- **Parallelization:** Test, lint, and type-check tasks can be parallelized where supported.

### 5. Documentation and Delivery

- **Requirement:** Preserve comprehensive records, generate implementation report, finalize artifacts.
- **Actions:**

1. Mark all checklist items complete, date the plan file, archive to `/tasks/completed/`, and update roadmap.
2. Delegate to Documentation Sub-Agent:
- Fill out `/docs/<feature-name>-implementation.md` using prescribed template.
- Ensure deep explanations, not surface-level summaries.
3. Confirm all artifacts align with deployed reality.

- **Parallelization:** Documentation can be started as implementation winds down but must be finalized after confirming features are production-ready.

### 6. Deviation & Change Control

- **Requirement:** Pause if blockers or scope changes arise; log and await user approval.
- **Actions:**

- During implementation or test, any agent detecting a strategic blocker halts related work, logs deviation, and notifies for user approval.
- **Parallelization:** Only affected work streams pause; independent streams may continue.

---

## Sub-Agent Utilization Overview

- **Implementation Tasks:** Sub-Agents can build unrelated features/tests in parallel.
- **Test Execution & Linting:** Can be distributed and run concurrently.
- **Documentation Drafting:** Doc Sub-Agent collates notes and begins drafting in parallel with later implementation steps.
- **Status Reporting:** Continuous updates from all sub-agents to central plan file.
- **Blocker/Deviation Awareness:** Any agent pauses streams as protocol dictates.

---

## Logical & Sequential Order With Dependencies

1. Confirm approved plan is present.
2. Decompose plan into actionable, logically grouped tasks, identifying dependencies.
3. Assign tasks to self/sub-agents: parallelize where feasible, serialize where dependent.
4. For each parallel/serialized task set:
- Implement feature.
- Write/run tests (in tandem).
- Complete code review and validation.
- Report status and mark completion in plan.
5. After implementation, sub-agents handle formatting, linting, type-check/build, and aggregate results.
6. Run global test suite and execute final QA (manual and automated).
7. Fix failures via root-analysis, update plan, iterate until all checks pass.
8. Date and archive completed plan, update roadmap documents.
9. Documentation sub-agent completes final implementation report.

---

## Complete TODO List

- [ ] Confirm presence and approval of `/tasks/<feature-name>-plan.md`.
- [ ] Break down plan into sequential and parallel tasks, noting dependencies.
- [ ] Assign tasks to self/sub-agents for implementation and concurrent unit testing.
- [ ] Mark each finished task in the plan; sub-agents update status in real time.
- [ ] For any blocker, halt affected streams, log deviation, await user response.
- [ ] Upon task completion, run formatting, linting, type-check/build in parallel.
- [ ] Run global automated and manual tests (by respective agents).
- [ ] Iterate and retest on any failures.
- [ ] When all checks pass, date and archive the plan, move to `/tasks/completed/`, update roadmap as needed.
- [ ] Documentation agent completes and proofreads `/docs/<feature-name>-implementation.md`.
- [ ] Confirm all artifacts/documentation accurately reflect deployed state.