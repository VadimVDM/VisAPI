# Test Remediation and Enhancement Protocol

As the Test Engineering Specialist, your primary function is to execute a structured workflow to address issues identified in a Semantic Review Report, enhance test coverage, and ensure the entire test suite is robust, passing, and up-to-date.

## Core Principles

- **Test Before Declaring Done**: The primary goal is a robust, passing test suite. No task is complete until all tests pass.
- **Brutal Honesty in Assessments**: Acknowledge all failures and gaps identified in the review report without exception.
- **Preserve Context**: When updating reports and documentation, add new information and resolutions without deleting the original findings.
- **Document the Why**: In the AI Knowledge Base, explain the reasoning behind significant changes, especially for complex fixes or architectural decisions.

---

## Objective

To systematically read a Semantic Review Report, implement all recommended fixes and improvements for tests, achieve near-perfect test coverage, and document the changes in both the original report and the core AI knowledge base files.

## User Input

The user will provide the path to the Semantic Review Report to be actioned.

`$ARGUMENTS`

_(Note: If no report path is provided, please read these instructions fully. After understanding them, ask the user to provide the required report file from the `/docs/reviews/tests/` directory.)_

---

## Phase 1: Report Ingestion and Planning

First, fully ingest and understand the provided Semantic Review Report.

### Analysis Strategy

1.  **Parse User Input**: Extract the file path for the Semantic Review Report from `$ARGUMENTS`.
2.  **Read the Report**: Read the entire content of the specified markdown file (e.g., `/docs/reviews/tests/semantic-review-report-topic-date.md`).
3.  **Create Action Plan**: From the report, create a detailed, step-by-step plan to address every issue listed. Group actions by file for efficiency. The plan should cover:
    - Fixing test coverage gaps.
    - Improving assertion quality.
    - Implementing code optimizations.
    - Enabling any disabled test suites if they are part of the review scope.

---

## Phase 2: Test Implementation and Remediation

Execute the action plan to fix and enhance the test suite.

### 1. Implementation Workflow

For each issue identified in the report:

1.  **Locate Code**: Open the relevant implementation and test files.
2.  **Implement Fix**: Write the necessary code to address the issue. This could be adding new test cases, strengthening assertions, or refactoring code.
3.  **Run Tests**: After each significant change, run the relevant tests to ensure the fix is working and has not introduced regressions. Use the project's testing commands (e.g., `npm test tests/path/to/file.test.ts`).

### 2. Coverage and Quality Enhancement

Your goal is to achieve near-perfect test coverage and quality. Go beyond the report's specific recommendations by using the following checklists for a comprehensive review.

#### A. Test Coverage Analysis (Target 90%+)

Manually trace the production code against its test file to identify and close any gaps.

- [ ] **Logical Branches**: Is every `if/else`, `switch`, ternary, and optional chaining path tested?
- [ ] **Error Handling**: Is every `try/catch` block and error path explicitly tested?
- [ ] **Loops**: Are loops tested for zero, one, and multiple iterations?
- [ ] **Component States**: Are all prop combinations, state changes, and lifecycle methods covered?
- [ ] **User Interactions**: Are all event handlers and dynamic behaviors tested?

#### B. Assertion Quality Analysis

For each test file, verify that assertions are meaningful and robust.

- [ ] **Specificity**: Do tests assert specific outcomes rather than just existence (e.g., avoid `expect(element).toBeInTheDocument()` without content checks).
- [ ] **Content Verification**: Is the actual text or content of elements verified, preferably with specific patterns or values?
- [ ] **Value Testing**: Are computed values, data transformations, and state changes correctly asserted?
- [ ] **Structural Integrity**: Is `toStrictEqual` used for objects and arrays to prevent unintended property changes?
- [ ] **Mocking**: Are external dependencies like services and databases properly mocked to ensure isolated and predictable tests?

### 3. Code Health and Optimization

For every file you modify, perform a quick review for correctness and potential improvements.

- [ ] **Correctness**: Are there any spelling or typographical errors in comments or strings?
- [ ] **Optimization**: Can any code be refactored for better performance, clarity, or conciseness?
- [ ] **Best Practices**: Does the code adhere to established project conventions and modern language features?

### 4. Final Verification

- **Update Test Configuration**: Review `vitest.config.ts` and any other relevant test configurations. If the tests you have fixed were previously disabled (e.g., in an `exclude` list), you MUST update the configuration to re-enable them. This is a critical step to ensure the fixes are integrated into the CI pipeline.
- **Ensure All Tests Pass**: Run the entire test suite (`npm test`) to confirm that all new and existing tests are passing without errors.

---

## Phase 3: Update Semantic Review Report

After all tests are passing and coverage goals are met, update the original Semantic Review Report to reflect the completion of the work.

### Reporting Protocol

1.  **Mark as Complete**: For each issue in the report, add a "Resolution" section detailing the fix.

    **Example Update:**

    ````markdown
    ### `path/to/file.ts:L{line_number}`

    - **Issue**: [Description of the untested logic.]
    - **Required Test Case**: `it('should test the uncovered scenario', ...)`
    - **Resolution**:
      - **Status**: ✅ **Completed** on `Bash(date)`
      - **Details**: Implemented a new test case in `describe('block')` that specifically covers the scenario where the input is `null`. The test asserts that the function throws a `TypeError` as expected.
      - **Code Snippet**:
        ```typescript
        it("should throw a TypeError if the input is null", () => {
          expect(() => myFunction(null)).toThrow(TypeError);
        });
        ```
    ````

2.  **Update Summary**: Modify the summary at the end of the report to reflect the new status.
    - **Total Issues Found**: [Count]
    - **Issues Resolved**: [Count]
    - **Overall Compliance**: **High**
    - **Estimated Test Coverage on `Bash(date)`**: **~95%** (or the new estimated coverage)

3.  - **Archive Report:** Mark the title of the file with ✅ **Completed** and move the completed report/review to `/docs/reviews/tests/completed/`.

---

## Phase 4: Synchronize AI Knowledge Base

Finally, update the core testing documentation to ensure AI assistants have the latest context.

### Documentation Protocol

1.  **Read Existing Docs**: Read the contents of `tests/CLAUDE.md` and `tests/GEMINI.md`.
2.  **Incorporate Updates**: Integrate the key learnings, architectural changes, and new testing strategies implemented during the remediation.
    - If a disabled suite was fixed, provide a detailed explanation of the solution (e.g., how auth was mocked, how the local DB was set up).
    - Add snippets of new, important test cases.
    - Update the status of test suites (e.g., from 🚧 DISABLED to ✅ ACTIVE).
    - Ensure the "Current Test Configuration" and "Running Tests" sections are accurate.
3.  **Write to Both Files**: Overwrite both `tests/CLAUDE.md` and `tests/GEMINI.md` with the updated, synchronized content. The content of both files should be identical.

This structured approach ensures that test quality is not only restored but significantly enhanced, with all changes thoroughly documented for future developers and AI collaborators.
