Task details follow at the end of this message. As lead engineer, execute the **Explore → Plan → Code → Test → Document** workflow, orchestrating and deploying multiple sub-agents for research, implementation, and testing while maintaining architectural oversight - run the sub-agents in parallel.

## 1. Explore

Use parallel subagents to thoroughly explore the codebase:

- Find and read all files relevant to the task (implementation targets, examples, configurations)
- Identify existing patterns, conventions, and architectural decisions
- Map dependencies and potential impact areas
- Return: file paths, code patterns, and implementation insights

## 2. Plan

Create a detailed implementation plan and save it as an MD file in `/tasks/`:

### Research Phase

Use parallel subagents to:

- Consult latest documentation via the `context7` MCP tool (recommended)
- Research unfamiliar concepts using web search
- Return only actionable information

### Planning Requirements

- Break down the task into specific, testable components
- Include test strategy (unit tests, integration tests, E2E tests as appropriate)
- Plan lookbook components if UI changes are involved
- Identify documentation updates needed
- Consider edge cases and error handling

### Task File Format

Create `/tasks/<feature-name>-plan.md` with:

```markdown
# [Feature Name] Implementation Plan

## Objective

Clear description of what needs to be accomplished

## Tasks

- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] Task 3: Description

## Technical Details

[Detailed breakdown of each task]

## Dependencies

[External dependencies, files to modify, etc.]

## Success Criteria

[How we'll know when it's done & the tests it will need to pass]
```

### User Clarification

If anything remains unclear, pause and ask the user before proceeding.

## 3. Code

### Implementation Guidelines

- Match existing codebase style and conventions
- Prefer descriptive variable and method names over extensive comments
- Follow established patterns for similar functionality
- Ensure proper error handling and logging

### MCP Tools Usage

Use these tools as needed:

- **supabase**: Direct database access and SQL operations (Project ID = pangdzwamawwgmvxnwkk)
- **render**: Direct backend access
- **vercel**: Direct frontend access
- **upstash**: Direct Redis access
- **resend**: Emails
- **grafana**: Monitoring, Grafana & Prometheus
- **playwright**: Web testing and accessibility testing
- **fetch** & **puppeteer**: Simple web browsing tasks
- **browserbase**: Headless browser automation and interaction (only live, browserbase can't access localhost)
- **filesystem, sequential-thinking, memory**: Core development tools

### Code Quality

After implementation:

1. Format code consistently:
   - Run project formatter if available (e.g., `npm run format`, `prettier`)
   - Otherwise, ensure consistent indentation and style
2. Build the project and resolve all errors
3. Address reasonable linter warnings
4. Ensure no console errors or warnings

### Progress Tracking

Update the task file in `/tasks/` as you complete each item:

```markdown
- [x] Task 1: Description ✓ Completed
```

## 4. Test

### Automated Testing

Use parallel subagents to:

- Run all existing test suites
- Execute new tests you've written
- Verify all tests pass without errors

### Manual Testing

For significant UX changes:

1. Create a comprehensive test checklist
2. Use browser testing via subagent
3. Verify all user flows work correctly
4. Check responsive behavior and edge cases

### Test Failure Protocol

If tests reveal issues:

- Return to the planning phase and think ultrahard
- Analyze root causes thoroughly
- Revise implementation approach
- Document lessons learned

## 5. Version Control

### Pre-commit Checklist

1. Review all modified and new files
2. Stage appropriate files: `git add <files>`

### Commit Process

1. Create clear, semantic commit messages:
   - Format: `type(scope): concise description`
   - Types: feat, fix, docs, style, refactor, test, chore
   - Example: `feat(auth): add OAuth2 integration`
2. Commit staged changes: `git commit -m "message"`
3. Push to origin: `git push origin <branch>`

## 6. Document

After completing all tasks:

1. Mark all tasks as completed in the `/tasks/<feature-name>-plan.md` file, add the time it was done at the top via Bash(date) and move the md file into the /tasks/completed folder
2. Create a comprehensive report in `/docs/<feature-name>-implementation.md`:

### Report Structure

```markdown
# [Feature/Task Name] Implementation

## Overview

Brief description of what was implemented

## Implementation Choices

- Key architectural decisions and rationale
- Trade-offs considered
- Technologies/patterns used

## Changes Made

- List of modified files with purpose
- New files created
- Dependencies added

## Testing

- Test coverage added
- Manual testing performed
- Edge cases considered

## Commands & Setup

Any commands or setup steps future developers should know

## Notes

Any caveats, known issues, or future improvements
```

**Remember**: Quality over speed. Take time to understand the codebase and make thoughtful decisions.

---

{{TASK}} or [If no task is provided, please read the instructions above and after understanding them fully, ask the user to provide the task]
