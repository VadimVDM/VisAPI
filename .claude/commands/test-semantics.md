# Semantic Test and Code Quality Protocol

As the Semantic Quality Analyst, your role is to perform a comprehensive review of specified files to ensure code quality, test coverage, and semantic correctness are sound and stable.

## Objective

To systematically analyze implementation and test files, identify gaps in test coverage, evaluate the quality of assertions, and suggest code improvements. The final output is a detailed review report.

## User Input

The user will provide the scope of the review via arguments.

`$ARGUMENTS` = hi please research our auth setep and those files: please fully read: │
│ components/auth/CLAUDE.md, and │ │
│ │ │
│ docs/reviews/High-Priority-Refactoring-Report-2025-07-29.md, │
│ then AGAIN │ │
│ │ FULLY read tasks/auth-test-suite-plan.md ///// then │
│ please review the @tasks/auth-test-suite-plan.md here in │
│ text - give me improvmentes and/or optimization improvments │
│ and things we might have missed and how is best and most │
│ elegant to do things as of july 2025 for the full comphersive testing for the auth on live prodction and proper rtl

_(Note: If no arguments are provided, please read these instructions fully. After understanding them, ask the user to provide the required files, directories, or tasks for review.)_

---

## Phase 1: File Discovery and Inventory

First, identify and list all files within the scope of the review.

### File Discovery Strategy

1.  **Parse User Input**: Extract the specific files or directories provided in the `$ARGUMENTS`.
2.  **Expand Directories**: If a directory is provided, use `glob` to find all relevant implementation (`*.{ts,tsx,js,jsx}`) and test (`tests/**/*.{test,spec}.{ts,tsx,js,jsx}`) files.
3.  **Ensure Counterparts**: For every file identified, automatically include its corresponding implementation or test file.
    - Given `Component.tsx`, also include `tests/Component.test.tsx`.
    - Given `tests/Component.test.tsx`, also include `Component.tsx`.
4.  **Create Inventory**: Compile a complete list of files to be analyzed.

```markdown
### Files to Review:

**Implementation Files:**

- [ ] `path/to/file1.tsx`
- [ ] `path/to/file2.ts`

**Test Files:**

- [ ] `path/to/tests/file1.test.tsx`
- [ ] `path/to/tests/file2.test.ts`
```

---

## Phase 2: Comprehensive Analysis

For each file in the inventory, perform the following analysis steps. Review every file thoroughly and report all findings.

### 1. Test Coverage Analysis

Manually trace the production code against its test file to identify gaps. Do not rely on automated coverage reports.

**Checklist for Each Implementation File:**

- [ ] **Logical Branches**: Is every `if/else`, `switch`, ternary, and optional chaining path tested?
- [ ] **Error Handling**: Is every `try/catch` block and error path explicitly tested?
- [ ] **Loops**: Are loops tested for zero, one, and multiple iterations?
- [ ] **Component States**: Are all prop combinations, state changes, and lifecycle methods covered?
- [ ] **User Interactions**: Are all event handlers and dynamic behaviors tested?

### 2. Assertion Quality Analysis

For each test file, verify that assertions are meaningful and robust.

**Checklist for Each Test File:**

- [ ] **Specificity**: Do tests assert specific outcomes rather than just existence (e.g., `expect(element).toBeInTheDocument()`)
- [ ] **Content Verification**: Is the actual text or content of elements verified, preferably with specific patterns?
- [ ] **Value Testing**: Are computed values, data transformations, and state changes correctly asserted?
- [ ] **Structural Integrity**: Is `toStrictEqual` used for objects and arrays to prevent unintended property changes?
- [ ] **Mocking**: Are external dependencies like services and databases properly mocked to ensure isolated and predictable tests?

### 3. Code Syntax and Optimization Review

For every file, review for correctness and potential improvements.

**Checklist for Each File:**

- [ ] **Correctness**: Are there any spelling or typographical errors in comments or strings?
- [ ] **Optimization**: Can any code be refactored for better performance, clarity, or conciseness?
- [ ] **Best Practices**: Does the code adhere to established project conventions and modern language features?

---

## Phase 3: Reporting

After completing the analysis, generate a structured report and save it to `docs/reviews/tests/`.

### Report Template

````markdown
# Semantic Review Report - Main Topic - `Bash(date)`

## 1. Files Reviewed

- `path/to/file1.tsx`
- `path/to/tests/file1.test.tsx`
- ...

## 2. Test Coverage Gaps

### `path/to/file.ts:L{line_number}`

- **Issue**: [Description of the untested logic, branch, or error path.]
- **Existing Tests**:
  - `describe('block') > it('test case string')`
  - ...
- **Required Test Case**:
  - `describe('block') > it('should test the uncovered scenario', () => { ... })`

---

## 3. Assertion Quality Issues

### `path/to/tests/file.test.ts:L{line_number}`

- **Issue**: [Description of the weak assertion (e.g., "Only tests for element existence, not content").]
- **Current Assertion**:
  - `describe('block') > it('test with weak assertion')`
- **Recommended Improvement**:
  - `describe('block') > it('should be improved with stronger assertions', () => { /* specific, improved assertion */ })`

---

## 4. Code Analysis and Optimizations

### `path/to/file.ts:L{line_number}`

- **Issue**: [Brief description of the syntax error or optimization opportunity.]
- **Current Code**:
  ```typescript
  // Offending code snippet
  ```
````

- **Recommendation**:
  ```typescript
  // Improved code snippet
  ```

---

## 5. Summary

- **Total Issues Found**: [Count of all identified issues]
- **Overall Compliance**: [High-level assessment of standards compliance]
- **Estimated Test Coverage**: [Qualitative assessment of test coverage]

```

```
