---
name: bridge-review-ticket
description: Run Bridge's review-ticket workflow when explicitly invoked as $bridge-review-ticket.
---

# Bridge workflow: review-ticket

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
interactive: true
arguments: {"positionals":[{"name":"ticketKey","type":"string","required":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"noRefreshBase","flag":"--no-refresh-base","type":"boolean"},{"name":"baseBranch","flag":"--base-branch","type":"string"},{"name":"baseSha","flag":"--base-sha","type":"string"}]}
---

# Review Ticket

This skill is explicitly invoked as `$bridge-review-ticket <input>`.
Treat the text after `$bridge-review-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

This command is recipe-driven. Do not call MCP tools directly -- the recipe determines which tools to call and with what parameters.

1. Parse `$ARGUMENTS` to extract:
   - A required `ticket_key` matching the ticket key pattern (`[A-Z][A-Z0-9_]{0,19}-\d+`, e.g. `MY_PROJ-248` or `A-1`). The whole token must match; never accept a valid-looking substring of a longer invalid token.
   - An optional position-independent `--auto` flag.
   - An optional position-independent `--rounds=<n>` argument, where `<n>` is `1` or `2`.
   - An optional position-independent `--no-refresh-base` flag.
   - An optional position-independent `--base-branch=<branch>` argument.
   - An optional position-independent `--base-sha=<sha>` argument.

   Tokenize `$ARGUMENTS` on whitespace. The first token matching the ticket key pattern is the `ticket_key`; ignore any additional ticket-key tokens. The presence of a `--auto` token (anywhere in `$ARGUMENTS`) sets `auto_approve` to `true`. A token matching `--rounds=1` sets `rounds` to `1`; a token matching `--rounds=2` sets `rounds` to `2`. If no `--rounds` token is present, leave `rounds` unset (omitted) so the backend's difficulty-adaptive review policy can decide the review shape when enabled for this repo; when adaptive routing is disabled, unavailable, or the ticket's difficulty cannot be resolved, the backend falls back to a full premium second-opinion review. The presence of a `--no-refresh-base` token sets `no_refresh_base` to `true`. A token matching `--base-branch=<branch>` sets `base_branch` to `<branch>`. A token matching `--base-sha=<sha>` sets `base_sha` to `<sha>`.

   `--auto`, `--rounds`, `--no-refresh-base`, `--base-branch`, and `--base-sha` are all independent and may be supplied in any combination.

   If `$ARGUMENTS` is empty or contains no token matching the ticket key pattern, stop immediately and display:
   ```
   Invalid ticket key format. Expected: PROJ-123 [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=BRANCH] [--base-sha=SHA]
   Usage: $bridge-review-ticket <ticket_key> [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=BRANCH] [--base-sha=SHA]
   ```

   If a `--rounds` token is present but its value is not `1` or `2`, stop and display:
   ```
   Invalid --rounds value. Expected: --rounds=1 or --rounds=2 (omit to let the backend decide adaptively; default falls back to a full review)
   Usage: $bridge-review-ticket <ticket_key> [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=BRANCH] [--base-sha=SHA]
   ```

2. Call the `get_pipeline_recipe` MCP tool with:
   - `pipeline`: `"review-ticket"`
   - `variables`: `{ "ticket_key": "<ticket_key>", "base_branch": "<base_branch or "">", "base_sha": "<base_sha or "">", "no_refresh_base": "<"true" if --no-refresh-base was passed, else "">" }`
   - `auto_approve`: `true` — only when `--auto` was passed; otherwise omit this field entirely.
   - `rounds`: `1` — only when `--rounds=1` was explicitly passed on the command; `2` — only when `--rounds=2` was explicitly passed. When `--rounds` was NOT supplied, omit `rounds` entirely (do not pass `rounds: null`) so the backend's difficulty-adaptive review policy can choose the review shape when enabled for this repo. An explicit `rounds` value is forwarded to the backend and forces the review shape: `--rounds=1` requests a single-pass review, and `--rounds=2` forces the full second-opinion review even when adaptive routing is enabled. Do NOT translate `rounds` into `skip_steps` — the backend executor now owns all round orchestration (including any second-opinion rounds), so the recipe carries a single `request_ticket_review` step and you never pass `skip_steps` for round control.

   Example combined-mode payload (`--rounds=1 --auto --base-branch=develop`):
   ```json
   {
     "pipeline": "review-ticket",
     "variables": { "ticket_key": "PROJ-123", "base_branch": "develop", "base_sha": "", "no_refresh_base": "" },
     "auto_approve": true,
     "rounds": 1
   }
   ```

   Example explicit full-review payload (`--rounds=2`), which forces the full second-opinion review even if adaptive routing is enabled for this repo:
   ```json
   {
     "pipeline": "review-ticket",
     "variables": { "ticket_key": "PROJ-123", "base_branch": "", "base_sha": "", "no_refresh_base": "" },
     "rounds": 2
   }
   ```

   Example adaptive payload (no `--rounds`), which lets the backend policy executor decide the review shape (falling back to a full premium review when adaptive routing is disabled or the ticket's difficulty cannot be resolved):
   ```json
   {
     "pipeline": "review-ticket",
     "variables": { "ticket_key": "PROJ-123", "base_branch": "", "base_sha": "", "no_refresh_base": "" }
   }
   ```

   If the tool returns an error, stop and report the failure.

3. Read and strictly obey the `agent_instructions` field in the response. Execute each step in order, announcing each as **Step N of M: <description>**.

4. After all steps complete, display a summary:
   ```
   ## Pipeline Complete

   **Ticket**: <ticket_key>
   **Steps executed**: N of M
   **Status**: Success / Failed at step N
   ```
