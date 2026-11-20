Run the project's full test suite (unit and E2E) using the project-configured test stacks, triage failures, fix test-code issues, and produce a structured health-check report.

$ARGUMENTS

---

# Instructions

This command discovers how to run tests by reading per-project configuration from the Bridge API, not from hardcoded paths. Stages run only when the project has the corresponding stack configured.

## Stage 0 — Argument Parsing and Setup

1. **Parse `$ARGUMENTS`** for optional flags. Supported flags:
   - `--skip-e2e` — skip the E2E test stage even if an E2E stack is configured (e.g., when no local server is running)
   - `--unit-only` — shorthand that implies `--skip-e2e`

   Resolve flags to boolean variables:
   - Start with: `run_unit = true`, `run_e2e = true`
   - If `--unit-only` is present: set `run_e2e = false`
   - If `--skip-e2e` is present: set `run_e2e = false`
   - Unknown flags: note them in the final report as "Unrecognized flag ignored" but do not fail

2. **Generate a run timestamp** using the current date and time in `YYYY-MM-DD-HH-MM` format (e.g., `2026-03-10-14-35`). Store this as `run_timestamp`. Both output documents will use this value.

This stage has no failure conditions — proceed to Stage 1.

## Stage 1 — Resolve Project Config via MCP

Read the per-project test setup from the Bridge database. Every subsequent stage is driven by what these calls return.

1. **Resolve docs directory**: Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`.

2. **Read unit-test stack**: Call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to `unit_testing_stack`. Store the returned value as `unit_stack` (may be null/empty).

3. **Read unit-test instructions**: Call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to `unit_testing_instructions`. Store the returned value as `unit_instructions` (may be null/empty).

4. **Read E2E stack**: Call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to `e2e_testing_stack`. Store as `e2e_stack`.

5. **Read E2E instructions**: Call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to `e2e_testing_instructions`. Store as `e2e_instructions`.

6. **Compute configuration booleans**:
   - `unit_configured` = `true` if either `unit_stack` or `unit_instructions` is a non-empty string; otherwise `false`
   - `e2e_configured` = `true` if either `e2e_stack` or `e2e_instructions` is a non-empty string; otherwise `false`

7. **Create the output directory**:
   ```
   mkdir -p {docs_dir}/testing/
   ```
   If this fails, stop immediately and report: `Cannot create output directory {docs_dir}/testing/ — check permissions.`

If any MCP call fails (e.g., the API is unreachable or returns 4xx/5xx), stop immediately and report which call failed. Do not fall back to hardcoded commands — the whole point of this command is that test setup lives in config.

## Stage 2 — Unit / Standard Tests

If `run_unit` is `false`, skip this stage and record: `Unit tests: SKIPPED — run_unit was set to false (this should not happen in normal use; report as a bug).`

If `unit_configured` is `false`, skip and record:
```
Unit tests: SKIPPED — no unit_testing_stack or unit_testing_instructions configured for this repo. Configure them with /learn-repository (a project admin must run it) or the project setup UI before running /run-tests.
```

Otherwise:

1. Read `unit_instructions` carefully. It is the source of truth for **how to run unit tests in this repo** — runner binary, paths, environment activation, sub-suites (if the project distinguishes "unit" from "integration", both belong in this stage), and any flags. Pair it with `unit_stack` (a short label, e.g., `Pytest`, `Jest + React Testing Library`) for context.

2. **Derive the test command(s)**: Extract the literal shell commands the instructions describe. If the instructions describe multiple sub-suites (e.g., a fast unit batch and a slower integration batch), plan to run each as a **separate batch** in the order described. Do not invent runners or paths that the instructions do not mention.

3. **If the instructions do not specify any runnable command**, skip and record:
   ```
   Unit tests: SKIPPED — unit_testing_instructions does not describe how to invoke tests; update that field with /teach-bridge, or re-run /learn-repository (a project admin must run it).
   ```

4. **Run each batch sequentially** in the terminal. **Continue to the next batch even if the current one has failures.** Capture the full output of each batch, including the runner's summary line (e.g., `47 passed, 3 failed in 12.4s` or `Tests: 5 failed, 22 passed`).

5. For each failing test, apply the **Triage Logic** (below), then record the result.

## Stage 3 — E2E Tests

If `run_e2e` is `false`, skip this stage and record: `E2E tests: SKIPPED — --skip-e2e or --unit-only flag was set.`

If `e2e_configured` is `false`, skip and record:
```
E2E tests: SKIPPED — no e2e_testing_stack or e2e_testing_instructions configured (the project may not have an E2E suite).
```

Otherwise:

1. Read `e2e_instructions`. It is the source of truth for the E2E runner, spec paths, browser config, and any prerequisites. Pair with `e2e_stack` for context.

2. **Detect server prerequisites**: If `e2e_instructions` indicates that a local server must be running (look for explicit cues such as "server", "running", "localhost", "started", "dev server", a URL, or a port number) and describes a readiness check, perform that check exactly as described. If the instructions describe a server prerequisite but do not describe a check, attempt the check the instructions imply (e.g., curl the URL the instructions mention) and skip the stage if it fails:
   ```
   E2E tests: SKIPPED — e2e_testing_instructions describe a server prerequisite that wasn't met. Start the server per the instructions and re-run.
   ```

3. **Derive the test command(s)** from the instructions, including any spec-directory batching the instructions specify.

4. **If the instructions do not specify any runnable command**, skip and record:
   ```
   E2E tests: SKIPPED — e2e_testing_instructions does not describe how to invoke tests; update that field with /teach-bridge, or re-run /learn-repository (a project admin must run it).
   ```

5. **Run each batch sequentially** in the terminal. **Continue to the next batch even if the current one has failures.** Capture the full output and summary line of each batch.

6. For each failing test, apply the **Triage Logic** (below), then record the result.

## Triage Logic

For every failing test, examine the test file and the code it tests. Classify as ONE of the following:

### TEST-CODE ISSUE — fix it directly

Classify as a test-code issue if ANY of the following applies:
- The test asserts against a hardcoded value that no longer matches current behavior (outdated mock data)
- The test imports or calls a function that was renamed, moved, or removed
- The test asserts on a response field that was restructured
- The test expects a specific error message string that has since changed
- A fixture references a removed table column, model field, or schema member

**Action**: Apply a minimal, targeted fix to the test file only. Then re-run just that failing test, using the runner described in the relevant instructions field (`unit_instructions` for unit-test failures, `e2e_instructions` for E2E failures). Adapt the runner invocation that the instructions provide to target a single test, following whatever convention the instructions or stack idiomatically use.

If the re-run **still fails** after your fix, do not make further edits — escalate to implementation-code issue instead and revert your change.

### IMPLEMENTATION-CODE ISSUE (or UNCERTAIN) — document, do not fix

Classify as an implementation issue if ANY of the following applies:
- The production function raises an unexpected exception
- A handler returns the wrong status code or response shape for a documented behavior
- Business logic produces incorrect output that the test correctly asserts against
- You are not confident the test is wrong

**Action**: Do NOT modify any file outside the test directories described in `unit_testing_instructions` / `e2e_testing_instructions`. When in doubt about whether a path is test-only, treat it as production code and escalate. Record the failure in the implementation-issues document for the user to triage.

## Stage 4 — Write Output Documents

### Document 1: Test Run Report (always write this)

Write to: `{docs_dir}/testing/test-run-{run_timestamp}.md`

```markdown
# Test Run: {run_timestamp}

## Configuration
- Unit stack: {unit_stack or "not configured"}
- E2E stack: {e2e_stack or "not configured"}
- Unit tests: RUN | SKIPPED — (reason)
- E2E tests: RUN | SKIPPED — (reason)

## Unit Tests
**Stack**: {unit_stack or "not configured"}
**Result**: X passed, Y failed (sum across batches)

### Batch 1: `<command>`
**Result**: X passed, Y failed
**Fixes applied**:
- `path/to/test_file`: brief description of what was fixed
- (or "none" if no fixes were needed)

### Batch 2: `<command>`
...

**Failures escalated as implementation issues**: N

## E2E Tests
**Stack**: {e2e_stack or "not configured"}
**Result**: X passed, Y failed (sum across batches)

### Batch 1: `<command>`
**Result**: X passed, Y failed
**Fixes applied**: ...

### Batch 2: `<command>`
...

**Failures escalated as implementation issues**: N

## Overall Summary
- Total test fixes applied: N
- Suspected implementation issues found: N
- Implementation issues document: {docs_dir}/testing/implementation-issues-{run_timestamp}.md
  (or "not created — no issues found")
```

### Document 2: Implementation Issues (only write if issues were found)

If at least one failure was escalated as an implementation-code issue, write to:
`{docs_dir}/testing/implementation-issues-{run_timestamp}.md`

```markdown
# Suspected Implementation Issues: {run_timestamp}

These test failures were NOT fixed. They may indicate bugs in production code.
A developer should investigate each item before merging.

## Issue 1
- **Test**: `path/to/test_file::test_function_name`
- **Tier**: unit | e2e
- **Failure message**: (paste the key assertion or exception line)
- **Why not fixed**: (brief reasoning, e.g., "production function raises KeyError on valid input")

## Issue 2
...
```

If no implementation issues were found, do NOT create this file.

## Final Output

After writing all documents, print this summary:

```
Test run complete: {run_timestamp}
Report saved to: {docs_dir}/testing/test-run-{run_timestamp}.md
Implementation issues: {docs_dir}/testing/implementation-issues-{run_timestamp}.md (if applicable)
No suspected implementation issues found. (if none)
```
