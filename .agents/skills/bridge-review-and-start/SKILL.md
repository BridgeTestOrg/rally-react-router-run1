---
name: bridge-review-and-start
description: Run Bridge's review-and-start workflow when explicitly invoked as $bridge-review-and-start.
---

# Bridge workflow: review-and-start

## Codex auto-mode recovery policy

Apply this overlay ONLY in a Codex skill invocation with --auto, including its
inline nested review/implementation recipe with auto_approve: true. Without
--auto, follow the canonical workflow unchanged. This overlay grants no new tool
permissions and does not apply to server-orchestrated execution or other hosts.

### Scope and precedence

For the named cases below, this overlay replaces immediate-stop/escalation wording
in the canonical command and returned recipe/instruction text with bounded recovery
inside the failing step. These named exceptions also qualify the command's
"strictly obey the agent_instructions" requirement: follow the recipe with these
Codex-only exceptions, rather than letting its immediate-stop wording cancel them.
In particular, the recipe preamble's on_error "halt"
means stop after the applicable recovery below fails, not on its first recoverable
attempt. It does not make any failed mandatory step optional. All other stop
conditions, ownership rules, and approvals remain authoritative. Exhausted recovery
attempts are not a terminal outcome for the worker's own unfinished work.
Continue from the recovered step; never restart a full command, rerun completed
review decisions, or launch another worker as recovery.

### Shared budgets and safe retry rules

- For a transient transport failure, rate limit, or temporary service error on a
  known read-only retrieval, allow at most two retries after the initial failure.
  Honor a server retry delay with an available bounded wait; if none is available,
  report the delay/blocker instead of spinning. Terminal application states,
  invalid arguments, authentication, and authorization errors are not transient.
- Allow at most two combined recovery attempts per failing step for local setup,
  reconciled writes, and code repairs. An attempt is one diagnosed repair/retry
  plus its verification. Share the count across nested commands and failure
  categories; changing the error text or switching from setup to code does not
  reset it. A stricter existing step limit wins. Existing CI max_iterations and
  max_minutes remain authoritative for its correction loop, with no added rounds
  or reset budgets. Pending/resuming wait windows are not recovery attempts;
  preserve their existing session and wall-clock budgets.
- Inspect actual errors and existing state before acting. End recovery early when
  the same failure recurs without new evidence or a materially different repair.
  Use documented runners and existing authorized dependencies/services, preserving
  ticket/file ownership. Never change dependency versions, provision paid services,
  acquire credentials, change shared infrastructure, or weaken checks as recovery.
- A documented, safely repeatable LOCAL install/build may resume after inspecting
  partial local state, its effects, and whether the original process still runs.
  Do not require proof that it made no local changes; do require safe repeatability
  in the owned worktree, within the combined budget. A setup command with external
  side effects also obeys the external-write rule below.
- Before retrying an EXTERNAL write, reconcile authoritative state for the exact
  ticket, operation, branch, and head. Reuse a proven successful result. Repeat only
  after confirmed nonapplication and continued authorization, or with a documented
  idempotency key that safely covers the same operation. Unknown external write
  outcomes are blockers. Never classify tools by name alone: a get tool may also
  register state or persist artifacts. Reconcile local commits before repeating
  them too, so a lost response cannot create duplicate commits.

### Named recovery exceptions

1. **Recipe retrieval and read failures.** In review-ticket and implement-ticket,
   replace "If the tool returns an error, stop and report the failure" for
   get_pipeline_recipe with the bounded read retry rule above. The same rule
   applies to transient read failures within their steps before on_error "halt".
   Do not retry a terminal server response or an explicitly exhausted narrower
   read limit. Once the read succeeds, execute the returned recipe normally.
2. **Review failure before handoff.** In review-and-implement Phase 1, replace the
   immediate halt on "Status: Failed at step N" only for an eligible recoverable
   failure. Diagnose and resume that same review step using its accepted artifacts
   and the budgets above. For a failed upload, reconcile the exact remote artifact
   before any repeat. Never restart review-ticket, regenerate paid review work,
   repeat completed decisions, or consume stale/withheld artifacts. Only a fully
   successful review permits Phase 2/3; otherwise retain the worktree and branch,
   report the unrecovered failure, and do not spawn implementation.
3. **Checkpoint commit/push failure.** Replace checkpoint-work.md Step 4's immediate
   failure stop, and implement-ticket's matching commit/push stop, only while safe
   recovery remains. Inspect HEAD, index, and the exact remote branch first; a lost
   response may follow a successful commit or push. Repair an actionable owned
   hook/test/setup failure within the combined budget, preserving hooks and the
   canonical staging/commit procedure. Before retrying a transient push, prove
   that the intended head was not applied and that it remains a normal authorized
   fast-forward. An unreadable, diverged, or unexpectedly changed remote stops
   recovery. Repeat the durability proof and record_checkpoint only after local
   HEAD equals the observed remote tip. Detached HEAD, an in-progress merge/rebase/
   cherry-pick, authorization denials, and unsafe commit-message paths still stop.
4. **Verification escalation.** In execute-plan-verification.md, before escalating
   a local setup problem, failed test, or actionable review finding in owned code,
   diagnose, repair, and rerun the affected verification within the shared budget.
   This does not extend existing rendered-UI cycles. Preserve failure history and
   report the actual final observation at its head; only a successful rerun proves
   a fix. Never label an assertion failure as a missing capability or weaken a
   test. When recovery fails, retain the unresolved failure, record the remaining
   obligation honestly under the continuation rule below, and continue other
   authorized work. Publication/readiness holds remain in force.
5. **Current-head CI/review corrections.** Only in monitor-ci-checks.md's configured
   fix_and_iterate branch (Step 6), item 10 also owns actionable changes_requested findings
   from an authoritative required review for the CURRENT head, even when the
   review transport check succeeded. This is the narrow exception to "corrections
   ONLY for failing required checks". For URL-only failure_detail, first attempt
   an authorized read of that exact failed job's logs/annotations before treating
   it as non-actionable. Diagnose, fix, and verify owned code within the existing
   loop's iteration/time limits. Apply this correction pass before Step 6 item 9.4's
   nothing-to-commit exit; never exit just because the tree was clean before fixes.
   Commit/push through the existing guards and recheck CI/review for the new pushed
   head. If findings remain non-actionable, retain the warning and unresolved
   failure. poll_only and custom keep their existing authority and limits. An
   --epic-worker skips CI monitoring/correction; epic orchestration owns it.

### Stops that recovery never overrides

Never automatically resubmit paid plan/review generation, force regeneration, or
execute a lost_after_retries retry command. Follow recovery_get or the existing
retrieval path for the ORIGINAL run; preserve accepted-artifact freshness rules.
A terminal review/plan state or artifact persistence/freshness failure cannot be
bypassed with files left on disk. Keep terminal review preflight failures and the
mergeability gate's existing exhausted-read stop.

Keep launcher/handoff failures terminal: a nonzero exit can still have spawned a
worker, so never automatically repeat a launcher invocation. Never bypass human
gates, authentication/authorization failures, file ownership, publication/readiness
holds, commit/push guards, or terminal server states. Never force-push, disable
hooks/tests, alter gate policy, or re-enter implement-ticket/planning for CI fixes.

When a recovery strategy is exhausted, that ends the strategy, not the session. Unsafe
recovery still stops the affected operation. Re-entering a command, nesting a workflow,
or relabeling a failure never resets the combined two-attempt retry budget. The worker
retains the unresolved result and continues independent authorized work; with none
left, it follows the outside-blocker or host-forced-end rule below without
manufacturing a gap or claiming completion. The continuation rule governs
implementation work only: it authorizes no implementation or publication in a
review-only workflow.

<!-- BEGIN BRIDGE WORKER CONTINUATION RULE -->
**Continue, reconsider, or record an honest gap**

- **A hold that lists your own (`self_recorded`) blockers is not the end of the run.** Finish your own unfinished work, record it with `record_phase_result`, and call `create_pull_request` again.
- **Before recording any step as escalated or cannot-do, reconsider once.** Try a corrected command, a disposable fixture or local service, an equivalent check, or a CI-covered deferral, using capabilities already provisioned for this repository. Never search for or obtain credentials.
- **If a review or verification step truly can't be done, record an honest gap and continue other work.** Running out of budget never makes unfinished implementation, unwritten tests, or failing assertions gap-eligible.
- **Never mark a step `executed` that you didn't run or write.**
- **An incomplete run ends only on an observed outside blocker or a host-forced end.** Before a forced end, commit, push, and call `record_checkpoint`. A person running the session can always stop it. Normal completion and existing safety stops still apply. Open a PR only through `create_pull_request`'s readiness check.
<!-- END BRIDGE WORKER CONTINUATION RULE -->

Never claim completion or advance past a failed mandatory step.


---
schedulable: true
arguments: {"positionals":[{"name":"ticketKeys","type":"string","required":true,"variadic":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"agent","flag":"--agent","type":"string"},{"name":"host","flag":"--host","type":"string"},{"name":"baseBranch","flag":"--base-branch","type":"string"},{"name":"maxParallel","flag":"--max-parallel","type":"string"},{"name":"dryRun","flag":"--dry-run","type":"boolean"},{"name":"guardStaleBranch","flag":"--guard-stale-branch","type":"boolean"},{"name":"tier","flag":"--tier","type":"string"}]}
---

# Review and Start: $ARGUMENTS

This skill is explicitly invoked as `$bridge-review-and-start <input>`.
Treat the text after `$bridge-review-and-start` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

This command takes one or more Jira ticket keys (e.g., `BAPI-248` or `BAPI-248 BAPI-250` — both flow through the identical ordered `keys: string[]` path) and spawns one refreshed, self-contained Worktrunk worktree per ticket, each running `$bridge-review-and-implement <KEY>`: review runs in that spawned session, then a per-ticket human proceed/halt gate, and — only on approval — that session hands the ticket off to a **fresh implementation session** that reuses the same worktree. Review and implementation thus run in two separate agent sessions per ticket, not one shared context. It is the **recommended front door** for chaining "review these tickets, then implement the ones that pass" starting from *existing ticket keys* (the entry point `$bridge-idea-to-pr` lacks, since its server orchestrator only accepts an idea).

It is a thin shim over the packaged `start-tickets` CLI, invoked with `--workflow review-and-implement`: this command performs the same connectivity check and branch enrichment as `$bridge-start-tickets`, then hands off to the identical worktree/base-refresh/model-routing/credential/cross-platform-spawn/`doctor` engine — reused verbatim. The review→implement halt-gate decision logic lives entirely in the spawned `$bridge-review-and-implement` session, never here or in the CLI. Using `start-tickets --workflow review-and-implement` directly (documented in `commands/src/start-tickets.md`) remains available as the lower-level launcher seam this command drives.

---

# Instructions

You are executing a 4-stage pipeline that resolves connectivity and per-ticket branch names, then spawns N parallel Worktrunk worktrees via the packaged CLI's `--workflow review-and-implement` seam. Execute all stages in sequence directly in the main thread.

## Stage 0 — Argument Parsing and Connectivity Check

1. **Parse `$ARGUMENTS`** into ticket keys and pass-through flags:
   - **Ticket keys**: every whitespace-separated token matching `[A-Z]+-[0-9]+` (e.g., `BAPI-248`). A single key and multiple keys flow through the identical ordered `keys: string[]` path — there is no separate single-ticket code path. If zero keys are found, stop immediately and display:
     ```
     No ticket keys found in arguments. Expected one or more keys like BAPI-248.
     Usage: $bridge-review-and-start [flags] <KEY> [KEY ...] (e.g., $bridge-review-and-start BAPI-248 BAPI-250)
     ```
   - **`--auto`**: a single chain-level flag. When present, it is forwarded to `start-tickets --auto`, which threads it into BOTH the review and implementation phases of every spawned `$bridge-review-and-implement <KEY>` session.
   - **`--rounds`**: normalize `--rounds 1`/`--rounds=1` and `--rounds 2`/`--rounds=2` to `--rounds=<n>`; reject any other value. This value is forwarded to the review phase of every spawned session.
   - **Selected agent**: validate `--agent <name>` / `--agent=<name>` against `claude|cursor-agent|codex`. It takes precedence over an optional `--host <platform>` / `--host=<platform>`. When no agent was supplied, resolve `--host` through the same host-aware capability matrix as `$bridge-start-tickets`; a non-runnable host returns manual-continuation guidance. In a Codex session with neither flag, set `--agent codex --host codex` for Stage 3; otherwise forward every supplied flag to the CLI so it makes the authoritative final decision.
   - **Command host default: none.** This line is specialized to `cursor` only in the Cursor command asset. If neither `--agent` nor `--host` was supplied and this default is `cursor`, forward `--host cursor` to the CLI. Never infer the host from the presence of a `.cursor` directory; an explicit `--agent` or `--host` always wins.
   - **User-supplied base branch**: validate `--base-branch <branch>` / `--base-branch=<branch>` using the same non-empty/≤255-character/no-leading-dash/no-control-character rules as `$bridge-start-tickets` Stage 0. A user-supplied value takes precedence over Stage 2a's `config_field` resolution below.
   - **`--tier`**: normalize `--tier cheap|basic|premium` / `--tier=<tier>` to `--tier=<tier>`; reject any other value before invoking the CLI. It is a manual override: it is forwarded exactly as validated to the single `start-tickets --workflow review-and-implement` invocation, which applies it to the review tab and hands it to the fresh implementation session, so both phases run on that tier. It is not an automatic snapshot.
   - **`--max-parallel N`**: a positive integer; the CLI's own default (3) applies when omitted.
   - **`--dry-run`**: a boolean toggle.
   - **`--guard-stale-branch`**: a boolean toggle forwarded verbatim to `start-tickets`. It turns on the F7 stale-branch guard: a pre-existing `feature/<KEY>` branch whose tip is **not** an ancestor of the resolved base is refused with a `create-failed` row and the stale-worktree remedy, instead of being silently reused. Pass it when a re-cut branch would re-derive the same deterministic name and otherwise land on the previous run's branch. Omitted by default, so an ordinary human run keeps reusing a same-named branch.
   - Reject malformed input before proceeding: an unsupported flag, a ticket key not matching `[A-Z]+-[0-9]+`, an unsupported `--agent`/`--rounds`/`--base-branch`/`--tier` value — stop and report the malformed argument.

2. **Connectivity check**: Call the `ping` MCP tool (no parameters). If the ping fails or does not return `"status": "ok"`, stop immediately and display:
   ```
   Connectivity check failed. Please verify:
   - Check that the Bridge API MCP server is configured in your editor's MCP settings
   - Check that BAPI_BASE_URL is set and the server is reachable
   - Check that BAPI_API_KEY is valid
   - Check that BAPI_REPO_NAME matches a configured repository
   ```

This stage is **critical** — stop immediately on failure. Do not proceed to Stage 1.

## Stage 1 — Acknowledge CLI Pre-flight

The packaged `start-tickets` CLI (driven with `--workflow review-and-implement` in Stage 3) owns all platform pre-flight checks, refreshed worktree creation, secret-free credential provisioning, difficulty→model-tier routing, and cross-platform terminal spawning — identical to `$bridge-start-tickets`. This command does not duplicate or re-verify any of that; see `commands/src/start-tickets.md` Stage 1 for the full prerequisite/provisioning description it drives. This command does not expose `--conductor`, `--terminal`, or `--no-refresh-main`/`--no-refresh-base` — it stays scoped to the front-door flags listed above. `--guard-stale-branch` is the one safety flag it *does* forward: `--conductor` implies that guard in the CLI, but this front door must not enable the observability context (a run id, hook provisioning, run-started emission) that `--conductor` also switches on, so the guard is reachable here on its own. Proceed to Stage 2.

## Stage 2 — Resolve Base Branch + Enrich Branch Names (best-effort)

### Stage 2a — Resolve Base Branch

Identical to `$bridge-start-tickets` Stage 2a: if the user supplied `--base-branch`, use it and skip the `config_field` lookup entirely. Otherwise call `config_field` (`operation: "get"`, `field_name: "base_branch"`) and treat a non-empty string `value` as the configured base branch; treat `null`, an empty/whitespace-only string, an HTTP `400` response, or any other lookup failure as "unset" and omit `--base-branch` from Stage 3 (the CLI then defaults to `main`). When forwarding a resolved value into the Stage 3 Bash invocation, apply the same mandatory single-quote escaping rule as `$bridge-start-tickets` (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating it into the command string — never expand it unquoted.

### Stage 2b — Enrich Branch Names

Identical to `$bridge-start-tickets` Stage 2b: for each ticket key without a user-provided `--branch` override, call `get_ticket` (`ticket_number` set to the key, `save_locally: false`), slugify its `summary` (lowercase, collapse runs of `[^a-z0-9]+` to a single `-`, trim leading/trailing dashes, truncate to at most 40 characters preferring a dash boundary), and build `feature/<KEY>-<slug>`. On any per-key failure (404, network error, empty slug), emit a warning and let the CLI apply its default `feature/<KEY>` for that key only; never stop the pipeline. Credentials never reach the Bash-spawned CLI — this enrichment stays in the command, exactly as in `$bridge-start-tickets`.

This stage is **non-critical** — warnings are acceptable; the pipeline continues with the fallback branch for any key that fails enrichment.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Resolve the packaged-CLI launcher **once**, before the Stage 3 shell-out, and reuse that one resolved value for every packaged-CLI invocation in this command. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Apply this command's mandatory single-quote escaping rule (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating `<launcher>` into a Bash command string. Never expand it unquoted.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

Worked examples and printed remediation hints below show the **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

### Dry-run intended-actions preview

When the user passed `--dry-run`, print an intended-actions preview **before** the Stage 3 shell-out. The preview names the resolved launcher explicitly, so an operator can see at a glance whether this run will use the published package or a local build:

```
Intended actions (dry run — nothing is created)
  Launcher: <the resolved <launcher> value, exactly as it will be escaped into the shell command>
  Command:  <launcher> start-tickets --workflow review-and-implement <flags> <ticket-keys>
  Tickets:  <the ordered ticket keys>
```

When the override is set, show the **escaped** launcher exactly as it will appear in the Bash command string, so the preview and the command cannot disagree. `--dry-run` is then forwarded to the resolved launcher, which does the previewing of its own actions: **no worktree is created, no agent tab or session is opened, and no worker process is spawned.** Do not state or imply otherwise.

## Stage 3 — Invoke the Packaged CLI

Use the **Bash tool** to invoke exactly **one** CLI invocation covering every requested key — never a per-key loop:

```
<launcher> start-tickets --workflow review-and-implement <pass-through-flags> <base-branch-flag> <branch-overrides> <ticket-keys>
```

Where:
- `<pass-through-flags>` forwards `--auto` (only if supplied), the normalized `--rounds=<n>` (only if supplied), `--agent <name>` and `--host <platform>` (only if supplied; forward both when both were supplied so the CLI enforces agent precedence), the Cursor command asset's `--host cursor` default only when neither was supplied, the validated `--tier=<tier>` (only if supplied), `--max-parallel N` (only if supplied), `--dry-run` (only if supplied), and `--guard-stale-branch` (only if supplied) verbatim.
- `<base-branch-flag>` is `--base-branch '<escaped-value>'` only when a value was resolved in Stage 2a; otherwise omitted entirely.
- `<branch-overrides>` is the list of `--branch KEY=BRANCH` flags assembled in Stage 2b.
- `<ticket-keys>` is the original ordered list of keys parsed in Stage 0.

Credentials are never placed in this shell command — the same secret-free provisioning path `$bridge-start-tickets` uses applies here unchanged.

Example, single key, hands-off:

```
npx -y @bridge_gpt/mcp-server start-tickets --workflow review-and-implement --auto --rounds=1 --branch BAPI-248=feature/BAPI-248-add-pr-rating-pre-evaluation-step BAPI-248
```

Example, multiple keys, manual per-ticket gate (no `--auto`):

```
npx -y @bridge_gpt/mcp-server start-tickets --workflow review-and-implement --branch BAPI-248=feature/BAPI-248-add-pr-rating-pre-evaluation-step --branch BAPI-250=feature/BAPI-250-deep-research-durability BAPI-248 BAPI-250
```

Pass through the CLI's stdout and stderr to the user verbatim. If the CLI exits non-zero, treat that as a critical failure: report the exit code and the CLI's error output, and stop.

This stage is **critical** — propagate any non-zero exit from the packaged CLI.

## Stage 4 — Final Report

Once the CLI exits 0, parse its `Summary` section (one stable line per ticket: `KEY  branch=BRANCH  status=STATUS`, optional trailing `path=PATH`) and reformat it as a markdown table, identical in shape to `$bridge-start-tickets` Stage 4 (`Ticket | Branch | Status`; statuses `dry-run`, `spawned`, `create-failed`, `spawn-failed`).

This report describes **worktree/spawn status only**. State explicitly in the report:
- Each successfully spawned session first runs `$bridge-review-ticket` and its own per-ticket halt gate; on successful review and approval (or `--auto`), it then opens a **fresh implementation session** (`$bridge-implement-ticket`) that reuses the same worktree. Review and implementation run in two separate agent sessions, not one shared context. This parent session does not observe or report either the review outcome or the later implementation outcome. Never claim or imply that review or implementation has completed.
- When `--dry-run` was passed, state explicitly that no worktrees were created and no tabs/sessions were opened.
- The two phases make separate model decisions. Normally the spawned review tab uses the **review threshold** (`consumer=review`), while the fresh implementation session uses the **implementation-tier decision snapshotted before review** and carried as `--auto-tier`; that snapshot is not refreshed after review, so the two tiers can differ. A manual `--tier` is the deliberate exception: it forces the review tab and the implementation session onto the same tier. Separately, a non-auto (including a non-auto scheduled) run pauses at each ticket's own gate rather than proceeding hands-off. For an `--auto` run, each ticket's eventual implementation completion is observed in its own fresh implementation tab, not here.

If the CLI reported any `create-failed`/`spawn-failed` statuses, or Stage 2b emitted enrichment warnings, list them under a `Warnings:` heading. If there were none, omit that section.

See `docs/claude/parallel-worktrees.md` for the underlying runbook this command builds on, and `commands/src/review-and-implement.md` for the per-ticket review→gate→implement composition each spawned session runs.
