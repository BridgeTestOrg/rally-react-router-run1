---
name: bridge-implement-ticket
description: Run Bridge's implement-ticket workflow when explicitly invoked as $bridge-implement-ticket.
---

# Bridge workflow: implement-ticket

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


# Implement Ticket

This skill is explicitly invoked as `$bridge-implement-ticket <input>`.
Treat the text after `$bridge-implement-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

This command starts the initial feature implementation workflow for a ticket.
Remaining work on an existing branch (review fixes, CI repairs, approved spec
changes, overlap or merge repairs, retained continuations, and integration
corrections) runs through the executor's versioned focused correction intent.
Those jobs must not invoke this command or a planning command. A resumed initial
workflow may inspect or reuse an existing plan, but plan reuse does not guarantee
that no planner operation is invoked.

This command is recipe-driven. Do not call MCP tools directly -- the recipe determines which tools to call and with what parameters.

1. Parse `$ARGUMENTS` to extract:
   - A required `ticket_key` matching the ticket key pattern (`[A-Z][A-Z0-9_]{0,19}-\d+`, e.g. `MY_PROJ-248` or `A-1`). The whole token must match; never accept a valid-looking substring of a longer invalid token.
   - Optional position-independent `--auto` and `--epic-worker` flags.

   Tokenize `$ARGUMENTS` on whitespace. The first token matching the ticket key pattern is the `ticket_key`; ignore any additional ticket-key tokens. The presence of a `--auto` token (anywhere in `$ARGUMENTS`) sets `auto_approve` to `true`.
   The presence of a `--epic-worker` token selects the Epic Implementer recipe. Only this marked invocation passes `skip_steps: ["config_field", "monitor-ci-checks"]` and `variables.verification_scope: "targeted"` to `get_pipeline_recipe`; plain invocations retain the full recipe.

   For a server-approved v2 verification contract, retain the originating policy
   and explicit epic-targeted scope from trusted starter/phase context. Only exact
   current-plan approved CI coverage joins authorize `remote_ci`, even for suites
   runnable locally. Mandatory local and uncertain-coverage work stays local.
   Preserve complete phase records and actual failures; focused tests never prove
   a broader suite. Ordinary and legacy invocations keep their original policy.

   If `$ARGUMENTS` is empty or contains no token matching the ticket key pattern, stop immediately and display:
   ```
   Invalid ticket key format. Expected: PROJ-123 [--auto]
   Usage: $bridge-implement-ticket <ticket_key> [--auto]
   ```

2. Call the `get_pipeline_recipe` MCP tool with:
   - `pipeline`: `"implement-ticket"`
   - `variables`: `{ "ticket_key": "<ticket_key>" }`
     For `--epic-worker` only, also include `"verification_scope": "targeted"` in `variables` and pass `skip_steps`: `["config_field", "monitor-ci-checks"]`.
   - `auto_approve`: `true` — only when `--auto` was passed; otherwise omit this field entirely.

   If the tool returns an error, stop and report the failure.

   Retain the **complete** JSON response — every step, plus `total_steps`, `auto_approve`, and `execution_mode`. `execution_mode` is `"inline"` here: you are the executor, there is no server-side orchestrator, and each step's instruction branches on that value.

3. Read and strictly obey the `agent_instructions` field in the response. Execute **every** step the response returned, in its resolved order, announcing each as **Step N of M: <description>** immediately before executing it. Traverse the whole array — never a fixed or remembered subset, which would silently omit the later steps.

   **A phase's durable-recording tool call is not the end of the command.** The `record_phase_result` and `record_checkpoint` tools return a success envelope; that envelope means the *current* `agent_task` step finished, nothing more. Continue immediately with the next step in the same turn. This applies in particular at the 3 → 4, 5 → 6, and 8 → 9 boundaries, which are where the recipe previously stopped: those instruction files used to end in a text envelope addressed to an orchestrator that does not exist inline, so the turn ended there and the run stalled with no error. None of these boundaries introduces an approval pause.

   **Background work is not completion.** Step 2's `request_plan_generation` submits
   without waiting. Step 3 must retrieve the terminal plan with repeated bounded
   `get_plan` calls (`budget_ms: 20000`); `state: "pending"` is normal. In `--auto`
   mode, a pending result is not a reason to ask the operator whether to continue
   or to end the headless turn. Keep opening bounded wait windows until the plan
   is ready or the tool returns a terminal error, even if several minutes have
   passed. Resumed progress (`resuming: true`) is still pending, so keep waiting; on a
   terminal `lost_after_retries` error, show the retry command the tool printed and
   stop — never issue it yourself. Do not invent a poll-count or elapsed-time cutoff. If the host itself
   prevents another tool call, report the pending state and the exact safe re-entry
   command; do not describe it as a plan-generation failure. If the submission
   outcome is ambiguous because of a dropped connection, use `get_plan` to inspect
   the existing run — never reissue the step automatically. If the configured local plan file is missing at consumption, retrieve that same ticket with `get_plan`, `budget_ms: 20000`, and `save_locally: true`. Continue bounded pending windows. Do not use packaged-asset repair or silently generate another paid plan; if no eligible completed result exists, report the exact artifact and request explicit recreation through the existing workflow. The same rule covers any ticket review
   started before the commit handoff: reach a terminal result through a bounded wait tool
   (`wait_for_ticket_review`, called again on each normal `state: "pending"` result) or the
   artifact's retrieval tool. A shell `sleep`, an unbounded foreground poll, and re-issuing
   the original generation request are all forbidden — the last abandons the run already in
   flight and starts a second billable one. This applies to pre-handoff prerequisites only;
   post-push CI belongs to the CI-monitoring step.

4. After all steps complete, display a summary:
   ```
   ## Pipeline Complete

   **Ticket**: <ticket_key>
   **Steps executed**: N of M
   **Status**: Success / Failed at step N

   **Branch**: <selected branch>
   **PR**: <pull request URL>
   **last_commit_sha**: <latest pushed head SHA>
   **Verification**: <each bounded command run, with its observed outcome>
   **Correction commit**: <subject of the correction commit pushed after verification, or "None">
   **Unresolved findings**: <findings reported but not fixed, or "None">
   ```

   Rules for this summary:

   - **`last_commit_sha` is the latest *pushed* head**, not the commit that opened
     the PR. The pipeline opens the pull request before running its bounded
     verification, so a correction pushed afterwards moves the head — report the
     head as it stands after the final push.
   - **`Status` describes pipeline execution, not a merge verdict.** "Success" means
     the recipe's steps ran to completion; it does not mean CI passed, that the code
     review approved the change, or that the ticket is mergeable.
   - **Never self-declare a gate outcome.** Do not label the summary with claims such
     as "CI passed", "checks green", "review approved", or "gate met". Report the
     exact check and review states you observed instead — the `ci` and `code_review`
     gates are authoritative and the reconciler observes them independently.

---

# Continuation and no-operator-questions rules (every `--auto` run)

These rules apply to every `--auto` run, Epic Implementer or not.

<!-- BEGIN BRIDGE WORKER CONTINUATION RULE -->
**Continue, reconsider, or record an honest gap**

- **A hold that lists your own (`self_recorded`) blockers is not the end of the run.** Finish your own unfinished work, record it with `record_phase_result`, and call `create_pull_request` again.
- **Before recording any step as escalated or cannot-do, reconsider once.** Try a corrected command, a disposable fixture or local service, an equivalent check, or a CI-covered deferral, using capabilities already provisioned for this repository. Never search for or obtain credentials.
- **If a review or verification step truly can't be done, record an honest gap and continue other work.** Running out of budget never makes unfinished implementation, unwritten tests, or failing assertions gap-eligible.
- **Never mark a step `executed` that you didn't run or write.**
- **An incomplete run ends only on an observed outside blocker or a host-forced end.** Before a forced end, commit, push, and call `record_checkpoint`. A person running the session can always stop it. Normal completion and existing safety stops still apply. Open a PR only through `create_pull_request`'s readiness check.
<!-- END BRIDGE WORKER CONTINUATION RULE -->

## Honest verification gaps in every run

An honest verification gap is not only for Epic Implementer runs. In any `--auto` run, a `unit_tests`, `e2e_tests`, or `rendered_ui_review` step that a missing capability stops (or a step with genuinely nothing to verify) may be recorded as a hand-off, as `execute-plan-verification.md` describes. Reconsider once before you record it. The server decides whether it counts from the run it can see; no persisted `--auto` flag controls it.

- In an ordinary run (no epic run), when every remaining blocker is an admitted gap, the server opens a **draft** pull request (`draft_pr`, reason `verification_gaps_recorded`). That is a successful publication, not a hold, and not proof that verification passed. Continue the recipe.
- Production work, unwritten tests, failed assertions, and plain escalations are never gaps. They stay unfinished work. `preexisting_at_base` counts only in an authorized Epic Implementer run; in an ordinary run that failure is yours to fix.
- After recording a gap, write readiness `disclosure.markdown` verbatim to `.bridge/epic-workarounds/<TICKET>.md`, commit it with `git add -f`, and then run the final verification rerun at that committed head. Later changes to the disclosure need no further commit: the pull request's managed `## Unverified gaps` section is the current view.
- For an outside escalation category, attach a `blocker_observation` with the denial or failure you observed (see `execute-plan.md`). Never search for or obtain credentials.

## No operator questions in auto mode

In `--auto` mode nobody is available to answer. Never stop to ask an operator a question. Settle the question yourself and keep going, so that work produced in the worktree reaches a checkpoint instead of being left there.

- The whole ticket is the goal in every phase. A checkpoint saves progress; it does not end the job.
- Make the design, schema, public API, dependency, and security changes the reviewed ticket and its accepted decisions authorize. That is produce work, not an escalation. Escalate only a change the ticket does not authorize, or an action outside this repository (shared or production databases, credentials, publishing, external services): record that step as `escalated` with a reasoned `escalationReason`. Finish every independent authorized step, then record the phase result and continue to `checkpoint-work.md`. Do not pause for an answer.
- If a turn, context, or time limit you cannot avoid forces an end (a host-forced end), settle only the **unfinished** owned steps as `escalated`, each with a reason. Keep every already-`executed` record exactly as it is. Record the phase result, then run the commit, push, and `record_checkpoint` sequence from `checkpoint-work.md` before ending. Choosing to stop is not a host-forced end.
- If the commit or push fails, follow `checkpoint-work.md`'s existing stop: report the failure and end. Do not call `record_checkpoint`, and do not rewrite executed records as escalated.

---

# Worker scope discipline and clean exit (Epic Implementer auto mode)

These rules apply only when you were launched under the Epic Implementer in auto mode (`--auto`); a normal interactive `$bridge-implement-ticket` run is unaffected.

## Declared file-scope discipline (N-2)

If your environment carries `BAPI_EPIC_IMPLEMENTER_DECLARED_TOUCHED_FILES_JSON` (a JSON array of the ticket's declared touched files), stay within that declared file boundary: do **not** create, modify, or delete files outside the declared set. Those out-of-scope files typically belong to a sibling ticket, and editing them risks a merge conflict or a silent clobber of the sibling's merged work. The pre-PR file-scope guard (run at the PR-creation step) will warn about any out-of-scope diff — treat that warning as a signal to re-check your scope, not as a blocker. When the variable is absent, empty, or invalid there is no declared boundary and this rule does not apply.

## Local-first verification and `remote_ci` deferral

Read the trusted `delivery.verification_context` from `get_phase_context` first. If it carries an approved v2 `approved_ci_coverage`, that policy decides which steps defer, and it takes precedence over everything below. Reading a workflow file never widens it.

When there is no approved policy, the scope decides:

- Only an epic worker (`--epic-worker`) in `targeted` verification scope with a **provider** gate profile may defer a whole-suite step by reading the workflow itself.
- Attended runs, including attended targeted runs, runs with a local gate profile, and `full` scope keep the local-first rule: run database-backed and whole-suite plan verification locally first, using the capabilities your worker already has. Find missing capabilities through the preflight and the command results, not by assumption.
- If a fact needed to establish the deferral is missing, run the step locally. That is not a setup requirement, a refusal, or a reason to call a new endpoint.

**What counts as a whole suite.** Judge a step by what its command actually runs, not by its name. A command that selects files, test IDs, node IDs, or a narrow directory is targeted and runs locally.

**What proves CI covers it.** Show the full chain: the plan command, then the equivalent CI suite invocation, then the named workflow job and step, then that step's failure reaching a configured required check. These do not prove coverage: a job that only appears in a `needs` chain, a step with an ignored failure (such as `continue-on-error`), an indirection you cannot read (a reusable workflow or opaque script), or an unexplained difference in working directory, arguments, or environment.

A lane CI picks by diff may defer only when its selector is readable and the current diff selects the lane. If the repository keeps an optional mapping, check it against the workflow. Missing or uncertain coverage stays local.

Local work does not go away. Targeted checks, likely-tests results, fast static guards, and the approved pre-PR check commands from your prompt still run locally under their existing rules and advisory budget. CI coverage never removes them.

Defer a step only when the rules above show that the pull request's required CI runs it. An illustrative job name is not proof that required CI covers the check. Record the deferral with all four parts:

- phase `pre_pr_verification`,
- disposition `escalated`,
- `prDependency: remote_ci`,
- an `escalationReason` that names the workflow file, job, step, required check, and the selection condition where one applies.

If you are unsure that required CI runs the check, or know it does not, run it locally. If you cannot run it locally either, record `escalated` **without** `prDependency`. That keeps the pre-PR hold. The existing delivery hold shows the unresolved capability to the epic operator. A request to "continue" never authorizes publishing around that hold. One exception: when the readiness view shows `gap_authority: granted` (unattended Epic Implementer runs only), a verification-only escalation is a carried gap and does not keep the hold. Open the PR normally. With `gap_authority` absent or a refusal token, this paragraph stands as written.

Non-examples. Missing implementation or documentation never uses `prDependency`. Uncertain CI coverage does not qualify. A check outside required CI does not qualify.

What happens next:

- An accepted deferral lets the PR open as an ordinary PR, with readiness `awaiting_post_pr`. Publishing and merging are separate.
- Green required CI at the current PR head closes the declared step.
- Failed, missing, or never-green required checks keep holding merge through the existing `ci_fix` job and conductor gates. Do not add polling, timeouts, or new escalation tokens.

The rule for a locally missing capability lives in `execute-plan-verification.md`; follow it as written. After recording a deferral, open the PR normally and finish the recipe, including the `verify-plan` gap close and the final push. Then exit as described in **Clean session exit (D2)**. Do not wait for CI.

### Continuing on a retained worktree

Call `get_ticket_delivery_readiness` first; inspect `get_phase_context` for `pre_pr_verification`, preserve still-current evidence, and re-run only stale or missing verification steps.

1. If `bound` is false, skip delivery-evidence work.
2. Match step-specific blockers to phase ownership and last records. Treat an unavailable assessment or a global unavailability blocker as unknown, not as current evidence.
3. Execution and submission are separate. Make ONE `record_phase_result` call for `pre_pr_verification`. It must settle every step that phase owns; report a step whose record is still current again as it stands.
4. Keep the existing handling for failed and unresolved checks. Do not treat them as settled, and do not re-run them as if they were missing evidence. Keep a `remote_ci` deferral while its command-to-check mapping and selection condition still hold. Refresh it when either changed. Run the step locally when coverage can no longer be shown. Waiting for CI never needs a local rerun, and CI closure is never reported as a locally executed pass.
5. Do one renewal pass and one confirming readiness read. If a blocker cannot be cleared, do not end the session: keep the branch, follow `create-pr.md`'s hold rule, and keep working. Blockers you recorded yourself (`self_recorded`) never end the run. Ending through the hold needs every remaining blocker to be an observed outside blocker (`external`) or a host-forced end. Never bypass publication guards. One narrower exception: with `gap_authority: granted` and a confirming readiness `outcome` of `awaiting_post_pr` or `complete`, the remaining blockers are carried gaps: continue to publication.

## Clean session exit (D2)

An `--epic-worker` invocation runs targeted verification in the open turn, creates the PR, closes plan gaps through `verify-plan`, and pushes its final branch state. It then exits cleanly. Epic-level orchestration observes CI after that exit: missing or failing checks block merge, and a separate `ci_fix` job handles failures. The Epic worker does not own the CI polling or correction loop.

After the final pipeline step completes, cleanly end your worker session (for example by issuing the `/exit` command) so the worktree is released and no idle process lingers — but **only when no follow-up remains that you still own**. Do **not** exit while any of the following is true:

- there are unresolved CI failures you are still correcting (the post-PR CI-correction loop in the CI-monitoring step still owns work),
- review changes were requested and you have not yet addressed them,
- there is a merge conflict on your PR that you still own — including one the CI-monitoring step's mergeability gate detected but has not yet resolved, or one that gate's resolution attempt left blocked,
- an explicit conflict-resolution approval from that mergeability gate's attended investigation flow is still pending,
- you have unpushed local commits.

**Finish your own background work first.** Before you write `.conductor/result.json`, post a final result, or end the turn, wait for or stop every background task and sub-agent this session started. Never end the job with your own task still running. Stopping a task does not make its check pass.

Exit only after your final branch state is pushed, the done-gate / CI-monitoring workflow required by the recipe has completed, and no CI/review follow-up remains. A clean `SessionEnd` is both the correct terminal lifecycle signal and the point at which the worker should exit.
