# Optimized AI Handoff & Project Context Command

**Objective:** Seamlessly capture, summarize, and transfer the current work state, learnings, and essential technical context into the designated project documentation file. This ensures uninterrupted, harmonious collaboration and handoff between AI coding sessions by preserving all critical information for reliable project continuity.

---

### **Optimized AI Instructions**

1. **Pause & Locate Documentation File:**

- Immediately pause the current task.
- Identify the primary project markdown file for tracking (e.g., `sprint-plan.md`, `README.md`, `claude.md`).
- **If unsure which file to use, prompt the user for clarification before continuing.**

2. **Efficiently Update Progress:**

- Review session tasks and objectives.
- Concisely update the document:
- Mark completed tasks (`- [x] Task...`).
- Update statuses of in-progress tasks.
- Add newly identified tasks.
- Summarize key accomplishments.

3. **Distill Learnings & Best Practices:**

- Synthesize session learnings.
- Create a "Key Takeaways" section:
- Document successful strategies, tools, and commands.
- Note dead-ends or inefficient approaches to avoid.
- Record any new or updated conventions and best practices for code and workflow harmony.

4. **Skillfully Record Handoff Context:**

- Provide a thorough "AI Context for Next Session" section with:
- **Current Goal:** Clearly state the present technical objective.
- **File Status:** List all modified, unsaved, or critical files relevant to this session.
- **Recent Activity:** Summarize the last several technical actions (e.g., "applied patch to `auth.ts`", "tested login endpoint - success").
- **Key Variables/State:** Note session-specific variables/configs/data present in memory.
- **Open Questions:** List unresolved items or data needed from the user.
- **Next Immediate Step:** Define the exact first technical action for the next session.

---

**Example Update Structure:**

## Project X - `YYYY-MM-DD` AI Session Summary

### Progress Update

- [x] Built authentication endpoint.
- [ ] Refactored database schema (ongoing).
- [ ] Developed tests for authentication.

**Summary:** Implemented `POST /login` endpoint and started restructuring `users` table.

### Key Takeaways

- **Worked Well:** Leveraged `bcrypt` for password hashing and modularized authentication logic.
- **To Avoid:** Inefficiencies using unindexed columns—switched to indexed `email` field.
- **Best Practices:** Continue modular approach for endpoints and favor indexed columns for queries.

### AI Context for Next Session

- **Current Goal:** Finalize SQL migration for `users` and `profiles` in `supabase/migrations/....sql`.
- **File Status:** `lib/supabase/queries/users.ts` modified for schema changes, not yet tested.
- **Recent Activity:** Discussed foreign key links between `users` and `profiles`.
- **Next Immediate Step:** Apply and test new migration.

**IMPORTANT:** Ensure no context or technical insights from this session are lost; maximize cross-session AI synergy by providing full and precise context.

Optimizing prompt…

Applying best practices for accuracy and safety.

Request changes (optional)
