---
name: bridge-scan-test-coverage
description: Run Bridge's scan-test-coverage workflow when explicitly invoked as $bridge-scan-test-coverage.
---

# Bridge workflow: scan-test-coverage

Scan recently shipped tickets from git history and report which features have or could gain integration tests, and which can only be smoke tested.

This skill is explicitly invoked as `$bridge-scan-test-coverage <input>`.
Treat the text after `$bridge-scan-test-coverage` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

Scan the git history for recently shipped tickets and, for each shipped feature, determine whether it already has an integration test, whether it *could* gain one (per this repo's conventions — a test that genuinely executes the system end-to-end via real database operations, real LLM calls, or real FastAPI routing), and — where integration testing is not possible — how it could be smoke tested so it still genuinely executes the system.

This is an **investigation and discovery** command. Describe features (citing code) and *how* they would be tested at a high level. Do **not** design tests in detail, build or edit any tests, or modify feature code. Orchestrate this run in the main thread, and **fan out one subagent per shipped feature** for the per-feature investigation.

The report is written to a **durable, committed** directory (`docs/test-coverage/`), and a marker file records when the analysis last ran so subsequent runs only inspect git history since the last run.

## Stage 0 — Parse Arguments and Resolve Analysis Window

1. Read `$ARGUMENTS`. All flags are optional and default-safe. If a flag is malformed, ignore it and add a warning:
   - `--since=YYYY-MM-DD` — override the window start date.
   - `--full` — ignore the marker and use a default lookback of 6 months.
   - `--limit=N` — cap the number of features investigated (parse `N` as an integer; ignore if not a valid integer).
   With no arguments, run **incrementally** from the marker.

2. Set the durable directory to `docs/test-coverage/` (relative to the repo root) and the marker file to `docs/test-coverage/STATE.md`. This command deliberately does **not** use the configured docs directory (`ping`'s `docs_dir`) — its default (`docs/tmp`) is ephemeral, and this report must be durable.

3. Read `docs/test-coverage/STATE.md` if it exists. It records two values: `last_run_utc` (an ISO-8601 UTC timestamp) and `last_analyzed_commit` (a git commit SHA).

4. Resolve the analysis window with this precedence:
   - If `--since=YYYY-MM-DD` was given, use `git log --since=<date>`.
   - Else if `STATE.md` provides `last_analyzed_commit`, use the commit range `<last_analyzed_commit>..HEAD`.
   - Else (first run, no marker), default to `git log --since=<3 months ago>` (mirrors the `$bridge-scan-tickets` default of 3 months). Format the date as `YYYY-MM-DD`. Example: if today is 2026-07-07, the default `--since` is `2026-04-07`.
   - `--full` overrides the above and uses a 6-month lookback (`--since=<6 months ago>`).

5. Robustness of the marker: capture `head_sha` by running `git rev-parse HEAD`, and capture the current UTC timestamp now. These become the **new** marker values, but only write them after the report is successfully produced (Stage 4). If a stored `last_analyzed_commit` is not present in history (e.g. a rebase/rewrite), fall back to `git log --since=<the date part of last_run_utc>` and add a warning noting the fallback.

6. Initialize tracking variables:
   - `features` = [] (one entry per shipped feature)
   - `warnings` = [] (per-item failures and fallbacks; the run never aborts on these)

7. Display the resolved window, e.g. "Analyzing shipped features in `<range or --since date>` (HEAD = {head_sha})".

## Stage 1 — Collect Shipped Features from Git History

1. List merged commits in the resolved window with:
   ```bash
   git log <range> --first-parent --pretty=format:"%H|%h|%ad|%s" --date=short
   ```
   `--first-parent` yields roughly one entry per squashed PR merge.

2. For each commit, extract the ticket key by matching `^BAPI-[0-9]+` against the subject. Group commits by ticket key. Commits with no ticket prefix (e.g. `Fix 500 on ...`) each become a standalone feature labeled as an "untracked change".

3. For each group, collect the changed-file footprint across its commit(s) using `git show --stat <sha>` or `git diff --name-only`. This file footprint is the primary input to the per-feature investigation.

4. Best-effort enrichment: for each ticket key, call the `get_ticket` MCP tool to fetch the ticket summary. This is **fail-open** — Jira tokens can be expired — so on any error, add a warning and continue without the summary. Do not abort.

5. Build a `features` entry per group: `{ticket_key, subject, commit_shas, changed_files, jira_summary?}`. If `--limit=N` was given, keep only the first `N` features (most recent first).

6. Display: "Found {count} shipped features to investigate."

7. If `git log` returns no commits, skip to Stage 4 and write a report noting an empty window (and still refresh the marker).

## Stage 2 — Investigate Each Feature (fan out subagents)

For each feature in `features`, launch an **Explore** subagent (batch several in parallel). Give each subagent the feature's `ticket_key`, `subject`, `changed_files`, and `jira_summary`, and instruct it to do read-only investigation only — no edits, no test design, no solutioning — and to return a structured finding.

Each subagent must:

1. Read the changed files and describe what the feature does in 2–4 sentences, with concrete `file:line` citations.

2. Identify the feature's runtime surface — one or more of: real database operations (`postgres_client` / a DAL in `api/library/db/`), real LLM calls (`src/python/llms/ai_client.py`, `async_send_message_to_ai`), real FastAPI routing (a route handler under `api/routes/`), an MCP tool (`mcp_server/`), a shell-spawned / CLI flow, a frontend / Playwright surface, or pure logic / config / docs / tests.

3. Check whether an **integration test already exists**: search `tests/integration/` for a mirror path or for references to the changed modules/functions. The reliable classifier is a path under `tests/integration/` plus `@pytest.mark.integration` or reliance on the `--run-integration` flag (conventions in `docs/claude/testing-integration.md`). Cite any test found.

4. Classify the feature into exactly one `bucket`:
   - **`has_integration_test`** — already covered end-to-end; cite the existing integration test file.
   - **`integration_testable`** — no test yet, but the feature exercises real DB / LLM / routing and fits an existing `tests/integration/<area>/` pattern. Give a **high-level** approach only: which real entrypoint to call, which backend it would exercise, and the relevant cost/guard note (the gpt-5-nano override via `INTEGRATION_TEST_MODEL`; the local-DB `skipif` guard; `save_to_db=False`). Cite the entrypoint in code.
   - **`smoke_only`** — genuine end-to-end execution is possible but not as an automated integration test (e.g. MCP tool behavior inside a host, cross-platform terminal spawning, a headless agent session, or browser E2E). Describe how to smoke test it so it **genuinely executes the system**, citing the relevant runbook: the MCP smoke-test runbook under `mcp_server/smoke-test/`, `tests/mcp/`, `docs/claude/runbooks/self-install-smoke-test.md`, `docs/claude/runbooks/start-tickets-smoke-test.md`, or Playwright (`tests/playwright/`, which needs a running server plus `npm run build`).
   - **`not_testable`** — nothing to execute end-to-end (docs-only, a wording/comment change, pure config, or a test-only change); state why.

5. Return a structured finding with these fields: `ticket_key`, `subject`, `description_with_cites`, `surface`, `bucket`, `existing_test`, `approach`, `why_not`.

Collect all findings. If a per-feature subagent fails, add a warning and continue — never abort the whole run.

## Stage 3 — Classify and Synthesize

1. Deduplicate features that span multiple commits (merge by `ticket_key`).

2. Sort each finding into the two required report sections:
   - **Section 1 — Integration Testing (covered or addable):** findings with `bucket` `has_integration_test` (sub-group "Already covered") or `integration_testable` (sub-group "Could be added").
   - **Section 2 — Not Integration-Testable:** findings with `bucket` `smoke_only` (sub-group "Smoke-testable — how") or `not_testable` (sub-group "Not testable — why").

## Stage 4 — Write the Report and Update the Marker

1. Create the `docs/test-coverage/` directory if it does not exist. Choose the report path `docs/test-coverage/REPORT-<YYYYMMDD>.md`; if a same-day file already exists, append `-<HHMMSS>` to avoid clobbering it.

2. Write the report with this layout:
   - A title and a metadata block: generated-at UTC timestamp; the analysis window (`<from sha or since-date>` → `HEAD <head_sha>`); the feature count; and per-bucket tallies.
   - **Section 1 — Integration Testing: Covered or Addable.** One `### BAPI-NNN — <subject>` heading per feature, each with **What shipped** (with `file:line` citations), **Current coverage** (cite the existing integration test, or state "none"), and **How it could be integration tested (high level)**.
   - **Section 2 — Not Integration-Testable.** One heading per feature with the same feature description, plus **Why not integration-testable**, and — for `smoke_only` features — **How to smoke test (genuinely execute the system)** with the runbook citation.
   - A **Warnings** section listing each warning as a bullet — only if `warnings` is non-empty.

3. **Only after** the report file is written successfully, update the marker `docs/test-coverage/STATE.md` with the new `last_run_utc` (the UTC timestamp captured in Stage 0) and `last_analyzed_commit` set to `head_sha`. This date/commit marker is what makes the next run incremental. If the report write fails, do not touch `STATE.md`.

## Final Report

Print a short summary to chat:

```
**Test-coverage scan complete**

* Features analyzed: {count}
* Already covered by integration tests: {n_has}
* Integration-testable (could be added): {n_addable}
* Smoke-only: {n_smoke}
* Not testable: {n_none}

Report: docs/test-coverage/REPORT-<YYYYMMDD>.md
Marker updated: last_analyzed_commit = {head_sha}
```

If `warnings` is non-empty, add a "Warnings:" section listing each warning as a bullet. If there are no warnings, omit that section.
