---
schedulable: true
interactive: true
arguments: {"positionals":[{"name":"ticketKey","type":"string","required":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"baseBranch","flag":"--base-branch","type":"string"},{"name":"agent","flag":"--agent","type":"string"},{"name":"tier","flag":"--tier","type":"string"}]}
---

# Review and Implement: $ARGUMENTS

$ARGUMENTS

This command runs inside a single already-created worktree (typically spawned by `/start-tickets --workflow review-and-implement`, or its front door `/review-and-start`). It reviews the ticket via `/review-ticket` **in this same session**, pauses at a per-ticket human proceed/halt gate, and — only on approval — hands the ticket off to a **freshly spawned implementation session** (`start-tickets --workflow implement`) that reuses this same worktree. Review and implementation therefore run in **two separate agent sessions/contexts**: the review session ends the moment the fresh implementation session is spawned, and the fresh session reads all reviewed ticket state back from the server rather than inheriting this session's transcript. It creates no *new* worktrees, refreshes no base branch, and does not monitor sibling sessions — those responsibilities stay in the launcher (`start-tickets`) and the parent front-door command.

---

# Instructions

## Argument Parsing

Parse `$ARGUMENTS`:

1. **Ticket key**: exactly one required token matching the Jira key pattern (`[A-Z][A-Z0-9]+-\d+`). If zero tokens match, or more than one token matches, stop immediately and display:
   ```
   Invalid ticket key. Expected exactly one key, e.g. PROJ-123.
   Usage: /review-and-implement <ticket_key> [--auto] [--rounds=1|2] [--base-branch=BRANCH]
   ```
2. **`--auto`**: an optional position-independent flag. When present, sets chain-level `auto_approve` to `true`. This single flag applies to BOTH the review phase and the implementation phase below — there is no separate review-auto or implementation-auto state.
3. **`--rounds`**: an optional position-independent `--rounds <n>` / `--rounds=<n>` argument, `1` or `2`. Normalize either form to `--rounds=<n>`. Reject any other value:
   ```
   Invalid --rounds value. Expected: --rounds=1 or --rounds=2.
   Usage: /review-and-implement <ticket_key> [--auto] [--rounds=1|2] [--base-branch=BRANCH]
   ```
   When omitted, forward no `--rounds` to `/review-ticket` (the backend's difficulty-adaptive review policy decides the shape).
4. **`--base-branch`**: an optional position-independent `--base-branch <branch>` / `--base-branch=<branch>` argument. Validate it using the same rules `/start-tickets` Stage 0 uses: after trimming, non-empty, at most 255 characters, must not start with `-`, and must not contain ASCII control characters (`0x00`–`0x1F` or `0x7F`). Reject a malformed value:
   ```
   Invalid --base-branch value: <reason>
   Usage: /review-and-implement <ticket_key> [--auto] [--rounds=1|2] [--base-branch=BRANCH]
   ```
5. **`--tier`**: an optional position-independent `--tier <tier>` / `--tier=<tier>` argument, one of `cheap`, `basic`, or `premium`. It is the **manual** tier (the launcher passes it when the operator gave `--tier`). Retain a valid value separately as `<manualTier>`, distinct from the automatic snapshot in Phase 1. Reject any other value:
   ```
   Invalid --tier value. Expected: --tier=cheap, --tier=basic, or --tier=premium.
   Usage: /review-and-implement <ticket_key> [--auto] [--rounds=1|2] [--base-branch=BRANCH] [--tier=cheap|basic|premium]
   ```
6. **Executor identity**: accept optional position-independent `--agent claude|cursor-agent|codex` and `--host claude-code|cursor|codex` in either space or `=` form. For example, `--agent cursor-agent` and `--agent=cursor-agent` both select Cursor; the launcher supplies `--agent codex --host codex` for Codex. Resolve `--agent` first when both are present; otherwise map the host to its registered agent. If neither is supplied in a Codex session, resolve `codex` as both agent and host. Map the effective agent to its host (`claude-code`, `cursor`, or `codex`) for handoff; an explicit agent wins over a conflicting host. Reject an unknown value before review. Retain the resolved pair for the fresh-session handoff; do not infer it from the main checkout.

## Phase 0 — Capture Worktree Identity (before review)

Before any review work runs, perform the **capture step of the Cleanup Helper** (below): record this ticket worktree's absolute top-level path and current branch, and resolve the main checkout. These captured values are the ONLY inputs the later cleanup and handoff steps use — capturing them up front means a mid-run branch switch cannot redirect a later `git worktree remove`/`git branch -D` at the wrong target.

## Cleanup Helper

A single named procedure invoked when the implementation gate is declined (Phase 2). It never runs on a review failure or the success path: a failed review must leave this session's working directory available for a retry, and a successful handoff reuses the worktree. Perform its steps exactly; it is local to this command's workflow and adds **no** new cleanup CLI flag, launcher subcommand, or MCP surface.

**Capture (run in Phase 0, before `/review-ticket`):**

1. Capture the ticket worktree's **absolute top-level path** with `git rev-parse --show-toplevel` and its **current branch** with `git rev-parse --abbrev-ref HEAD`, both run from inside this worktree. Call these `<capturedPath>` and `<capturedBranch>`.
2. Resolve the **main checkout** from `git worktree list --porcelain`: parse the `worktree <path>` records exactly, retaining each path verbatim **without splitting on whitespace** (a path may contain spaces), and select the main (non-linked, bare-repo-backed) checkout. **Refuse to treat `<capturedPath>` (the current ticket worktree) as the main checkout** — if the resolution is ambiguous or would resolve to the ticket worktree itself, abort cleanup and report retention instead. Call the result `<mainCheckout>`.

**Remove (run only when a halt path fires):**

3. Confirm `<capturedPath>` is still **registered against `<capturedBranch>`** in `git worktree list --porcelain` before deleting anything. If the path is unregistered, detached, or bound to a different branch than captured, **do not remove** — report retention.
4. Confirm the ticket worktree is **clean** with `git status --porcelain` (run against `<capturedPath>`). If the output is non-empty (uncommitted or untracked changes), **report and retain** it — never force-remove unexpected local work.
5. From `<mainCheckout>` (never from inside the ticket worktree), run `git worktree remove <capturedPath>` using shell-safe single-quoting of `<capturedPath>` and **no `--force`**.
6. Only **after** the worktree removal succeeds, and again from `<mainCheckout>`, run `git branch -D -- <capturedBranch>` (shell-safe quoting). Preserve this remove-then-delete ordering; never delete the branch first.
7. Report the exact branch and worktree removed (e.g. `Cleaned up worktree <capturedPath> and branch <capturedBranch>`), or, on any failure, a **bounded** cleanup-failure message that names what could not be removed and contains no credential or raw secret material.

## Phase 1 — Review (inline)

### Pre-review tier snapshot

When a valid `<manualTier>` was received, **skip the snapshot entirely**: make no `get_ticket` tier request, because the manual tier is handed to the implementation session as-is in Phase 3. Otherwise, before invoking `/review-ticket`, call the `get_ticket` MCP tool with `ticket_number` set to `<ticket_key>` and `include_model_tier` set to `true`, and record a **tier snapshot** from the `tier` field it merges into the response — the **raw backend difficulty tier**, resolved before any CLI posture adjustment. Retain the value **only** when it is one of the recognized tiers `cheap`, `basic`, or `premium`; treat any tool error, missing/`null` payload, or unrecognized value as an **unresolved** snapshot. Never derive the snapshot from the review agent's alias, this command's own invocation flags, a routing summary line, or an already posture-adjusted effective tier — it must be the raw backend field only.

A tier-snapshot failure is **non-critical**: do NOT abort — continue into review. When the snapshot is unresolved, print a concise, non-secret warning that `--auto-tier` will be omitted from the implementation handoff and normal difficulty routing will run in the fresh implementation session. The snapshot exists only to let the fresh implementation session reuse the review-time raw-tier decision (via `--auto-tier`, Phase 3) instead of recomputing it; it is a coarse `cheap|basic|premium` label, never a raw model alias, and it is transported ONLY as a raw baseline — this command never implements posture resolution or downshifting itself. The implementation session independently resolves its own optimization posture at launch and applies any `maximize_subscription` downshift to the carried baseline exactly once; a different effective tier between review and implementation is expected behavior when posture changes between the two sessions, not a workflow failure — the implementation session's `[model-routing]` stderr line (carrying the baseline, posture, adjustment, effective tier, and alias) is the visibility surface for that decision, not this command. When the server reports configured model-tier thresholds (BAPI-1343), the snapshot is already the final tier and is not downshifted; the snapshot request itself is unchanged: it adds no consumer parameter, so it is the **pre-review implementation-tier decision** from the server's default implementation consumer. This is deliberately not the review threshold. The spawned review tab's own model was chosen by the launcher from the review threshold, and the snapshot is not refreshed after review, so the review and implementation sessions normally run on different tiers. A carried `--auto-tier` is the implementation launch baseline; on that launch, a review-consumer marker read only decides whether the `maximize_subscription` posture may downshift it and never replaces it.

### Run review

Invoke `/review-ticket <ticket_key>` **inline, in this same session**, forwarding:
- `--auto` when chain-level `auto_approve` is `true`.
- The normalized `--rounds=<n>` when `--rounds` was supplied.
- `--base-branch=<branch>` when it was supplied.

While a review wait reports resumed progress (`resuming: true`), keep waiting; on a terminal `lost_after_retries` error, show the retry command the tool printed and stop — never issue it yourself.

`/review-ticket` grounds its codebase evaluation against a **fresh `git archive` of `origin/<base>`**, materialized into an isolated temp directory via `fresh_base` with `action: "materialize"` (see `docs/BAPI-474-ground-review-against-fresh-base.md`) — **not against this worktree's own working tree** (i.e. fresh-base grounding is not worktree-local). Review therefore behaves identically whether run standalone or, as here, inside a worktree that `start-tickets` already created; the worktree's isolation exists for the implementation phase below, not for review's codebase grounding.

If the review pipeline itself fails (any step reports `Status: Failed at step N`), halt this ticket immediately — in **both** auto and non-auto mode — before Phase 2 or Phase 3 run. **Retain the worktree and branch.** This session is rooted in that directory; deleting it prevents a follow-up turn from starting, including a retry of a failed Jira upload. Report the retained path and branch alongside:
```
Review failed for <ticket_key> at step N. Implementation was not started.
```
and stop. No implementation session is spawned. The user can retry the failed step in this session without re-running completed review decisions; once the review completes, the normal Phase 3 handoff can reuse the captured branch.

## Phase 2 — Halt Gate

`/review-ticket` produces **decisions that rewrite the ticket** — it does NOT emit a binary approve/decline verdict token. Do not parse, infer, or synthesize an approve/decline signal from its output; no such token exists to parse.

- **When chain-level `auto_approve` is `true`** and Phase 1 completed successfully: skip this gate entirely and proceed straight to Phase 3.
- **Otherwise** (non-auto, and Phase 1 completed successfully): after the ticket has been rewritten, ask the user exactly:
  ```
  Proceed to implementation for <ticket_key>? (y/N)
  ```
  Treat an empty response, any negative response (`n`, `no`, or similar), or any ambiguous/unrecognized response as **decline** — do not guess intent. On decline, invoke the **Cleanup Helper** to remove this ticket's worktree and branch, then report:
  ```
  Declined implementation for <ticket_key>. The worktree and branch were cleaned up.
  ```
  and stop. Do not spawn an implementation session.
- On an explicit affirmative response (`y` or `yes`), proceed to Phase 3.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Resolve the packaged-CLI launcher **once**, before the first shell-out below, and reuse that one resolved value for every packaged-CLI invocation in this command. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Apply this command's mandatory single-quote escaping rule (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating `<launcher>` into a Bash command string. Never expand it unquoted.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

Worked examples and printed remediation hints below show the **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

## Phase 3 — Implement (fresh session handoff)

**Never invoke `/implement-ticket` inline in this session.** Instead, spawn a fresh implementation session that reuses this worktree, then end this review session.

1. **Resolve the launcher directory.** Run the handoff from the `<mainCheckout>` resolved in Phase 0 — `start-tickets` manages worktrees and must run from the main checkout, never from inside the ticket worktree.
2. **Construct exactly one launcher command** for this single ticket key, using the `<launcher>` resolved above:
   ```
   <launcher> start-tickets --workflow implement <handoff-flags> <ticket_key>
   ```
   Assemble `<handoff-flags>` conditionally:
   - `--tier=<manualTier>` **only** when a valid `<manualTier>` was received in Argument Parsing item 5. This forces the fresh implementation session onto the same exact tier the operator chose for the review tab. When `<manualTier>` is present, do **not** pass `--auto-tier` (the two flags are mutually exclusive and no snapshot was taken).
   - `--auto-tier=<snapshot>` **only** when there is no `<manualTier>` and the Phase 1 tier snapshot resolved to a valid `cheap|basic|premium` value. When the snapshot is unresolved, **omit any tier-handoff flag entirely** so the fresh launcher follows its normal fail-open difficulty routing. Never pass the machine-carried snapshot through `--tier` — that flag is the strict human override (used above only for a `--tier` the operator supplied), is applied exactly as supplied, and never evaluates optimization posture; `--auto-tier` carries the raw snapshot through the fresh session's own posture resolution instead, so a `maximize_subscription` downshift is never silently skipped for a chained handoff.
   - `--branch <ticket_key>=<capturedBranch>` **only** when `<capturedBranch>` differs from the launcher default `feature/<ticket_key>` (i.e. an enriched branch such as `feature/<KEY>-<slug>`). This reuses the existing worktree/branch via the launcher's `switch` path instead of cutting a new one; when the branch is already the bare `feature/<ticket_key>`, no override is needed.
   - `--auto` **only** when chain-level `auto_approve` is active.
   - `--agent <resolved-agent>` and `--host <resolved-host>` when executor identity was supplied. For a Codex session, always pass `--agent codex --host codex`, even if the outer caller supplied an overriding host, so the implementation launcher cannot default to Claude.
   - `--base-branch=<value>` **only** when this command received `--base-branch` (Argument Parsing item 4). A fresh terminal does not inherit this session's environment, so re-emitting the flag is the only way the base survives into the implementation launcher — which exports it to the worker as `BAPI_BASE_BRANCH`, and the create-PR step targets it. Escape the value exactly as `/start-tickets` values are escaped: replace every single quote in the branch with `'\''`, then wrap the complete value in single quotes before inserting it into the launcher command.
3. **Credential invariant.** `BAPI_API_KEY` and every other credential MUST be absent from this launcher command and its environment assignment — the spawned CLI resolves credentials on its own through `resolveBapiCredentials` / the user-scoped credential store. Never inline a key, authorization header, or credential-store payload into the command string.
4. **Starter prompt boundary.** The fresh session's starter prompt is `/implement-ticket <ticket_key>` for Claude/Cursor or `$bridge-implement-ticket <ticket_key>` for Codex (plus `--auto` when auto is active) — the launcher builds it. The review transcript, the tier snapshot, the branch metadata, and any review decisions are **excluded** from that prompt; the fresh session reads all reviewed ticket state back from the server.
5. **On success** (launcher exits `0` and reports the ticket spawned): **end this review session immediately.** Do not monitor, parse, or wait for any output from the fresh implementation session — that session owns the implementation lifecycle from here.
6. **On a non-zero launcher exit**: treat it as a **handoff failure**. Report the exit code and the launcher's error output, and **retain** the existing clean worktree for a manual retry — do **not** invoke the Cleanup Helper (a failed handoff is not a decline). 

## Scope

This command composes `/review-ticket` (inline) and a fresh `start-tickets --workflow implement` handoff; it owns none of their internals and must not:
- create, re-cut, or switch a *new* Worktrunk worktree itself (the fresh launcher reuses the existing one),
- refresh or fetch the launcher's base branch,
- monitor or coordinate with sibling `/review-and-implement` sessions spawned for other tickets,
- orchestrate the parent `start-tickets` / `/review-and-start` session,
- carry the review transcript, tier snapshot, or branch metadata into the fresh implementation session's starter prompt.

A halt affects **this ticket only**: a review failure retains its worktree for recovery, while a declined gate cleans up its worktree/branch. Neither path touches sibling worktrees. The fresh implementation session receives only `/implement-ticket <ticket_key> [--auto]` for Claude/Cursor or `$bridge-implement-ticket <ticket_key> [--auto]` for Codex as its starter prompt and reads all reviewed ticket state back from the server.
