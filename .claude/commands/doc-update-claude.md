# 🏗️ CLAUDE.md Documentation Update Prompt

This prompt is for autonomously updating and refining all relevant `CLAUDE.md` documentation files across the project in light of new work, tasks, or changes completed today. It combines the scopes and workflows for both root-level and component-level docs.

---

## Scope

• Root-level `CLAUDE.md` (The root CLAUDE.md should be a clear, concise reference for AI assistants - not a verbose progress report. Essential facts only.)
• All top-level folder `CLAUDE.md` files (e.g. `frontend/CLAUDE.md`, `backend/CLAUDE.md`, ...)
• For a specified `<MAIN_FOLDER>` (e.g. `frontend/components`), include:
• `<MAIN_FOLDER>/CLAUDE.md`
• All `<MAIN_FOLDER>/*/CLAUDE.md` (nested sub-component docs)

## Objectives

1. Summarize each folder’s purpose at root level.
2. Keep root- and top-level docs short, clear, and welcoming.
3. Remove duplicated or outdated sections; tighten language and structure.
4. Ensure each sub-component doc highlights details unique to it.
5. Polish tone, update outdated info, check and fix internal links.
6. Check for current date via bash.

## Autonomous Workflow

1. **Read all target and affected docs thoroughly.**
2. For each section: decide to keep, rewrite, or remove as appropriate.
3. **Edit in place**—make direct changes to files; no temporary copies or approvals.
4. Move details down to more specific docs if not root-appropriate.
5. Resolve inconsistencies, fix broken links, update sections for clarity.
6. **Safeguard:** avoid deleting >50% of the content of any file unless the removed content is clearly duplicated or obsolete.

---

**Mindset:** Be decisive, respectful of existing knowledge, but unafraid to streamline for readability. Value clarity, minimal duplication, and helpful context. Act as a diligent documentation maintainer.