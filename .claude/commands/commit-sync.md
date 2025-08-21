# Git Commit and Sync Protocol

This document outlines the standard procedure for committing and synchronizing changes with the remote repository. Following these steps ensures a clean, consistent, and understandable version history.

---

## 1. Pre-Commit Checklist

Before committing, ensure the following steps are completed:

1.  **Review Changes:** Carefully review all modified and newly created files to ensure they are correct and ready for commit.
2.  **Stage Files:** Add the relevant files to the staging area using `git add <files>`.
    - **Best Practice:** It is strongly recommended to keep code changes and documentation updates in separate, atomic commits.

---

## 2. Commit Message Standards

All commit messages must be clear, concise, and follow a semantic format.

### Format

`type(scope): concise description`

- **`type`**: Must be one of the following: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- **`scope`**: A noun describing the area of the codebase affected (e.g., `auth`, `stripe`, `ui`).
- **`description`**: A short, imperative-mood summary of the change.

### Examples

- **Code Commit:** `feat(auth): add OAuth2 integration with Google`
- **Docs Commit:** `docs(stripe): create guide for processing webhooks`
- **Test Commit:** `test(profile): add unit tests for avatar upload`

---

## 3. Workflow

1.  **Commit Staged Changes:**
    - Execute `git commit -m "type(scope): description"`.

2.  **Push to Remote:**
    - After committing, push the changes to the remote repository to synchronize them with the main branch using `git push origin <branch>`.
