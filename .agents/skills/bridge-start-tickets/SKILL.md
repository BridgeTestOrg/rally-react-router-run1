---
name: bridge-start-tickets
description: Run Bridge's start-tickets workflow when explicitly invoked as $bridge-start-tickets.
---

# Bridge workflow: start-tickets

---
schedulable: true
arguments: {"positionals":[{"name":"ticketKeys","type":"string","required":true,"variadic":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"agent","flag":"--agent","type":"string"},{"name":"host","flag":"--host","type":"string"},{"name":"workflow","flag":"--workflow","type":"string"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"baseBranch","flag":"--base-branch","type":"string"},{"name":"maxParallel","flag":"--max-parallel","type":"string"},{"name":"dryRun","flag":"--dry-run","type":"boolean"},{"name":"guardStaleBranch","flag":"--guard-stale-branch","type":"boolean"},{"name":"tier","flag":"--tier","type":"string"}]}
---

# Start Tickets: $ARGUMENTS

This skill is explicitly invoked as `$bridge-start-tickets <input>`.
Treat the text after `$bridge-start-tickets` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

This command takes one or more Jira ticket keys (e.g., `BAPI-248 BAPI-250`) and invokes the packaged `@bridge_gpt/mcp-server` CLI subcommand `start-tickets`, which creates a Worktrunk worktree for each key and opens one tab/session per worktree running the **selected agent**. An explicit `--agent` wins; otherwise `--host` resolves a declared runnable host (Claude Code, Cursor, or OpenAI Codex), and an omitted host retains the Claude default. Copilot and other non-runnable hosts return manual-continuation guidance. Codex receives a verified per-process Bridge MCP scope bound to its worktree.

Because the orchestration ships inside the `@bridge_gpt/mcp-server` npm package (not a repo-local script), this command works for every consumer — including projects that installed the package via `--init`.

For existing ticket keys, `$bridge-review-and-start <KEYS>` is the **recommended front door**: it supplies the same connectivity check and branch enrichment as this command, then drives this same packaged CLI with `--workflow review-and-implement` so each worktree reviews the ticket before implementing it. Using `start-tickets --workflow review-and-implement` directly (documented below) remains available as the lower-level launcher seam.

Stage 0 and Stage 1 are critical (stop on failure). Stage 2 is non-critical (per-ticket enrichment failures fall back to the default branch and continue). Stage 3 is critical (propagate the packaged CLI's exit code).

---

# Instructions

You are executing a 4-stage pipeline that spawns N parallel Worktrunk worktrees and selected-agent sessions (Claude Code by default) via the packaged CLI. Execute all stages in sequence directly in the main thread.

## Stage 0 — Argument Parsing and Connectivity Check

1. **Parse `$ARGUMENTS`** into ticket keys, pass-through flags, and branch overrides:
   - **Ticket keys**: every whitespace-separated token matching `[A-Z]+-[0-9]+` (e.g., `BAPI-248`). If zero keys are found, stop immediately and display:

     ```
     No ticket keys found in arguments. Expected one or more keys like BAPI-248.
     Usage: $bridge-start-tickets [flags] <KEY> [KEY ...] (e.g., $bridge-start-tickets BAPI-248 BAPI-250)
     ```

   - **Pass-through flags**: collect any of `--agent <name>` (and the equals form `--agent=<name>`), `--host <platform>` (and the equals form `--host=<platform>`), `--terminal terminal|iterm`, `--dry-run`, `--auto`, `--no-refresh-main`, `--base-branch <branch>` (and the equals form `--base-branch=<branch>`), `--max-parallel N`, `--guard-stale-branch`, and `--tier cheap|basic|premium` (and the equals form `--tier=<tier>`) that the user supplied. These are forwarded verbatim to the CLI in Stage 3. `--tier` is the strict manual model-tier override and works for **both** workflows: the CLI applies it exactly as supplied to every spawned tab, skipping the per-ticket tier lookup and any optimization-posture adjustment. Validate it against the three allowed values and reject any other value before proceeding. Under `--workflow review-and-implement` the CLI also hands the same `--tier` to the spawned `$bridge-review-and-implement` session, which forwards it to its fresh implementation session — so a manual `--tier` deliberately forces the review tab and the implementation session onto one tier. `--guard-stale-branch` turns on the F7 stale-branch guard: a pre-existing `feature/<KEY>` branch whose tip is **not** an ancestor of the resolved base is refused with a `create-failed` row carrying the stale-worktree remedy, instead of being silently reused on top of another run's commits. It is off by default (a plain run keeps reusing a same-named branch) and is implied by `--conductor`. `--auto` makes each spawned agent run the selected workflow's slash command with `--auto` (hands-off); omit it to keep the spawned agents interactive.
   - **Selected agent**: track a `selected_agent` variable. Validate explicit `--agent <name>` / `--agent=<name>` against `claude`, `cursor-agent`, and `codex`; it always takes precedence. When omitted, accept optional `--host <platform>` and resolve it through the host capability matrix. A host lacking MCP configuration, custom commands, worktree provisioning, or session spawning returns manual-continuation guidance; it must never fall back to Claude. With neither flag in a Codex session, set `selected_agent` to `codex` and pass `--host codex` to the CLI. Otherwise retain the backward-compatible default `claude`.
   - **Selected workflow**: track a `selected_workflow` variable that defaults to `implement`. If the user passed `--workflow <value>` or `--workflow=<value>`, validate it against the two allowed values `implement` and `review-and-implement`, set `selected_workflow`, and reject any other value with the allowlist in the error. `implement` (the default) preserves today's behavior byte-for-byte — each spawned worktree runs `$bridge-implement-ticket <KEY> [--auto]`. `review-and-implement` spawns `$bridge-review-and-implement <KEY> [--auto] [--rounds=<n>]` instead, which runs `$bridge-review-ticket` then, after a per-ticket halt gate, `$bridge-implement-ticket` inside the same session. A single chain-level `--auto` applies to the selected workflow as a whole — under `review-and-implement` it auto-approves both the review and the implementation phase.
   - **Review rounds**: track a `review_rounds` value that defaults to unset. If the user passed `--rounds <n>` or `--rounds=<n>`, normalize it to `--rounds=1` or `--rounds=2` (reject any other value). `--rounds` is **review-only**: reject it (after parsing all flags, so flag order does not matter) if the final `selected_workflow` is not `review-and-implement`.
   - **User-supplied base branch**: track a `user_supplied_base_branch` boolean that defaults to `false`. If the user passed `--base-branch <branch>` or `--base-branch=<branch>`, set the boolean to `true` and capture the value. A user-supplied `--base-branch` value **takes precedence** over any value resolved from Bridge API config in Stage 2. Validate the user-supplied value before proceeding: after trimming surrounding whitespace it must be non-empty, at most 255 characters, must not start with `-`, and must not contain ASCII control characters (`0x00`–`0x1F` or `0x7F`); reject any malformed value with a clear error.
   - **User branch overrides**: collect any user-supplied repeatable `--branch KEY=BRANCH` flags. A user-provided override always takes precedence over Stage 2 enrichment for that key.
   - Reject malformed or unsupported combinations before proceeding: if a token looks like a flag but is not one of the supported flags, or a ticket key does not match `[A-Z]+-[0-9]+`, or a `--branch` value is not `KEY=BRANCH`, or `--agent`/`--host` is unrecognized, or `--workflow` names anything other than `implement`/`review-and-implement`, or `--rounds` is used outside `review-and-implement` or names anything other than `1`/`2`, or `--tier` names anything other than `cheap`/`basic`/`premium`, or `--base-branch` fails the validation rules above, stop and report the malformed argument.

2. **Connectivity check**: Call the `ping` MCP tool (no parameters). If the ping fails or does not return `"status": "ok"`, stop immediately and display:

   ```
   Connectivity check failed. Please verify:
   - Check that the Bridge API MCP server is configured in your editor's MCP settings
   - Check that BAPI_BASE_URL is set and the server is reachable
   - Check that BAPI_API_KEY is valid
   - Check that BAPI_REPO_NAME matches a configured repository
   ```

This stage is **critical** — stop immediately on failure. Do not proceed to Stage 1.

Read-only `npx -y @bridge_gpt/mcp-server doctor` diagnostics after a launch failure are explicitly allowed. The ban on duplicating mandatory launcher preflight does not prohibit doctor; it never repairs or installs anything automatically.

## Stage 1 — Acknowledge CLI Pre-flight

The packaged CLI runs its own per-platform pre-flight checks and then fetches `origin` and fast-forwards the local **configured base branch** (the value resolved in Stage 2 below, or `main` when none is configured) from `origin/<base>` so the new worktrees are based on an up-to-date base. The historical flag `--no-refresh-main` still controls this behavior — the flag name is preserved for backward compatibility, but it now skips refresh of whatever base branch resolves (default `main`). The required commands depend on the OS:

- **macOS**: `wt`, `git`, `osascript`.
- **Windows**: `git-wt`, `git`, Git for Windows / Git Bash (Worktrunk runs its `pre-start` / `post-start` hooks via Git Bash), and Windows Terminal **or** PowerShell.
- **Linux**: `wt`, `git`, `tmux`.

On **Windows** the Worktrunk binary is `git-wt` (its winget alias), which is a different tool from Windows Terminal's `wt.exe`: the CLI uses `git-wt` to **create worktrees** and `wt.exe` to **open a tab**, and never conflates the two. On **Linux** the CLI opens one detached `tmux` session per ticket (a window is added if that ticket's session already exists); attach later with `tmux attach -t <session>`. An unsupported OS (not macOS/Windows/Linux) fails fast with a clear "unsupported platform" message.

This stage simply notes that the CLI will fail fast if any prerequisite is missing or if local `main` has diverged from `origin/main` — you do not need to verify anything separately here, and you must not run any pre-flight commands yourself. When the CLI's pre-flight fails it now hints the user to run the read-only diagnostics command `npx -y @bridge_gpt/mcp-server doctor`, which reports found/missing for every prerequisite on the current OS — the pre-flight set plus `uv` plus the selected agent's command — and prints the manual install command for each missing one. `doctor` is strictly read-only and never installs anything; never run install commands automatically on the user's behalf. The CLI does not call any Bridge API tools; all credential-bearing work (branch enrichment in Stage 2) stays in this command. Proceed to Stage 2.

The packaged CLI also performs **secret-free Bridge API MCP provisioning** inside each created worktree: synchronously after the worktree is created and **before the agent tab/session is opened**, it writes both `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor) pointing at the `mcp-invoke` shim. These registrations are **secret-free** — they contain no `env` block and no API key, because the shim resolves credentials at runtime. If a spawned agent (or difficulty→model routing) reports missing Bridge API credentials, fix it by rerunning `$bridge-install-bridge` (its final stage persists the routing credential), by running `npx -y @bridge_gpt/mcp-server credentials migrate-agent-config --write-credentials` to migrate a key that lives only in `.mcp.json` / `.cursor/mcp.json`, or by adding a `bapi:<repo>` entry to the user-scoped credentials file (`~/.config/bridge/credentials.json`) — never by putting `BAPI_API_KEY` into the worktree `.mcp.json` or `.cursor/mcp.json` (that env is invisible to the Bash-spawned CLI).

This stage is **critical** in the sense that the CLI will abort if its pre-flight fails; you will see the error in Stage 3's output and must surface it.

## Stage 2 — Resolve Base Branch + Enrich Branch Names (best-effort)

### Stage 2a — Resolve configured `base_branch`

The CLI must be told which branch to cut new worktrees from. Resolution order:

1. If `user_supplied_base_branch` from Stage 0 is `true`, **skip the config-field lookup entirely** and use the user-supplied value. The user's explicit `--base-branch` always wins; never call `config_field` for `base_branch` in that case.
2. Otherwise, call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to `base_branch` (do not pass any other parameters; the tool resolves the repository from the MCP server's configured `BAPI_REPO_NAME`).
3. Parse the response. Treat the result as the **configured base branch** only when the response is a JSON object whose `value` field is a non-empty string after trimming surrounding whitespace.
4. Treat **all** of the following as "unset" — emit a single-line warning like `Warning: base_branch is unset; CLI will default to main` and **omit** the `--base-branch` flag entirely from the Stage 3 command (the CLI's own default is `main`):
   - `value` is `null`.
   - `value` is an empty string or a whitespace-only string.
   - The endpoint returns HTTP `400` (invalid field — happens before the registry includes `base_branch`).
   - The tool returns a network error, timeout, or non-JSON parse failure.
   - Any other lookup failure.
5. When the configured value is usable, capture it in a `resolved_base_branch` variable. **Do not** stop the pipeline on a lookup failure; fall through to the CLI default.

When forwarding `resolved_base_branch` into the Bash invocation in Stage 3, **shell-escape it safely**: replace every literal single quote `'` in the value with the four-character sequence `'\''`, then wrap the entire resulting string in single quotes (so the final argument looks like `'<escaped-value>'`). This is the standard POSIX single-quote escaping rule and is **mandatory** because `base_branch` is admin-configurable data that gets interpolated into a Bash command string; any unescaped single quote would otherwise break out of the surrounding quotes. Pass `--base-branch '<escaped-value>'` to the CLI as a single argv element — never expand the value unquoted into the command line.

### Stage 2b — Enrich Branch Names

Branch enrichment happens here, in the command, **before** invoking the CLI — the `get_ticket` MCP tool runs inside the MCP server process, which holds the Bridge API credentials the shell-spawned CLI does not have. For each parsed ticket key that does **not** already have a user-provided `--branch` override:

1. Call the `get_ticket` MCP tool with `ticket_number` set to the key only (its optional `include_model_tier` is not needed here).
2. From the response, extract the `summary` field. Slugify it: lowercase the string, replace every run of non-alphanumeric characters (`[^a-z0-9]+`) with a single dash `-`, trim leading and trailing dashes, and truncate to at most `40` characters (cutting at a dash boundary if possible).
3. The enriched branch name is `feature/<KEY>-<slug>`. Example: `BAPI-248` with summary `"Add PR rating pre-evaluation step"` becomes `feature/BAPI-248-add-pr-rating-pre-evaluation-step` (trimmed at 40 chars).
4. If the `get_ticket` call fails for a particular key (404, network error, missing summary) or produces an empty slug, emit a single-line warning like `Warning: could not enrich BAPI-248, falling back to feature/BAPI-248` and let the CLI apply its default `feature/<KEY>` for that key only. Do NOT stop the pipeline.
5. Build a list of `--branch <KEY>=<BRANCH>` arguments — one entry per key whose enrichment succeeded — and merge it with any user-provided overrides from Stage 0. **Do not** call `get_ticket` for keys that already have a user-provided override; those overrides win.

This stage is **non-critical** — warnings are acceptable, the pipeline continues with the fallback default for any key that fails. Do not call the Bridge API from the CLI itself; the CLI never has credentials.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Resolve the packaged-CLI launcher **once**, before the first shell-out below, and reuse that one resolved value for every packaged-CLI invocation in this command. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Use the trusted launcher words verbatim as the command prefix, preserving multiword prefixes such as `node /absolute/path/to/mcp_server/build/index.js`; never quote the entire prefix as one executable. The escaping rule applies to each dynamic argument independently.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

Worked examples and printed remediation hints below show the **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

## Stage 3 — Invoke the Packaged CLI

Use the **Bash tool** to invoke the packaged CLI. Build the command line as:

```
<launcher> start-tickets <pass-through-flags> <base-branch-flag> <branch-overrides> <ticket-keys>
```

Where:
- `<pass-through-flags>` are the supported flags collected in Stage 0 (`--agent`, `--host`, `--terminal`, `--dry-run`, `--auto`, `--no-refresh-main`, `--max-parallel`, `--guard-stale-branch`, and the validated `--tier=<tier>`), forwarded verbatim. Forward `--agent <name>` or `--host <platform>` only if the user supplied it; otherwise omit both and the CLI defaults to `claude`. When both were supplied, forward both so the CLI can enforce its documented `--agent` precedence. Forward `--auto` only if the user supplied it.
- Forward `--workflow <selected_workflow>` only when the user explicitly passed `--workflow`; otherwise omit it and the CLI defaults to `implement`. Forward the normalized `--rounds=<n>` from Stage 0 only when the user supplied it (which Stage 0 already guarantees is only possible under `review-and-implement`).
- `<base-branch-flag>` is `--base-branch '<escaped-value>'` (single-quoted using the Stage 2a escaping rule) **only when** the user supplied `--base-branch` in Stage 0 **or** Stage 2a's `config_field` lookup returned a non-empty configured value. When the configured value is unset / lookup fails / user did not supply one, **omit this flag entirely** so the CLI's own default (`main`) takes effect.
- `<branch-overrides>` is the list of `--branch KEY=BRANCH` flags assembled in Stage 2 (enrichment results merged with user overrides; omit any key whose enrichment failed and had no user override).
- `<ticket-keys>` is the original list of ticket keys parsed in Stage 0, space-separated and in the original order.

Example for two tickets after successful enrichment, throttled to 2 concurrent worktrees:

```
npx -y @bridge_gpt/mcp-server start-tickets \
  --max-parallel 2 \
  --branch BAPI-248=feature/BAPI-248-add-pr-rating-pre-evaluation-step \
  --branch BAPI-250=feature/BAPI-250-deep-research-durability \
  BAPI-248 BAPI-250
```

Example launching Cursor Agent instead of the default Claude Code:

```
npx -y @bridge_gpt/mcp-server start-tickets --agent cursor-agent BAPI-248
```

Example cutting worktrees from a non-`main` base (either user-supplied via `--base-branch develop` in Stage 0 or resolved from Bridge API config in Stage 2a):

```
npx -y @bridge_gpt/mcp-server start-tickets --base-branch develop BAPI-248
```

Example using the lower-level review-and-implement workflow directly (the `$bridge-review-and-start` command is the recommended front door for this; this form is documented here as the advanced launcher seam it drives):

```
npx -y @bridge_gpt/mcp-server start-tickets --workflow review-and-implement --auto --rounds=2 BAPI-248
```

Pass through the CLI's stdout and stderr and its deterministic spawned-session explanation once, including mixed-success results, before handling the exit code. If the CLI exits non-zero, treat that as a critical failure: report the exit code and the CLI's error output, and stop.

This stage is **critical** — propagate any non-zero exit from the packaged CLI.

## Stage 4 — Final Report

Once the CLI exits 0, parse its `Summary` section (one stable line per ticket in the form `KEY  branch=BRANCH  status=STATUS`, with an optional trailing `path=PATH`) and reformat it as a markdown table:

```
| Ticket   | Branch                                              | Status   |
|----------|-----------------------------------------------------|----------|
| BAPI-248 | feature/BAPI-248-add-pr-rating-pre-evaluation-step  | spawned  |
| BAPI-250 | feature/BAPI-250-deep-research-durability           | spawned  |
```

Status values are `dry-run`, `spawned`, `create-failed`, and `spawn-failed`. This table (and the report as a whole) describes **worktree/spawn status only** — it must never claim that review or implementation itself has completed; that work happens later, independently, inside each spawned session.

Rely on the CLI's deterministic spawned-session explanation already relayed in Stage 3. Do not repeat it or substitute guessed agent, folder, branch, terminal, or fallback destinations. Preserve the actual selected-agent wording, checked-out branch restriction, monitoring instructions, Linux attach commands, and multiple-session coordination caution. If destination metadata is unavailable, retain that uncertainty. Dry-run and all-failed rows are never running sessions. Under `review-and-implement`, review and fresh implementation are independent work, subject to the review halt gate; parent spawn status proves neither phase succeeded.

If the CLI reported any `create-failed` or `spawn-failed` statuses, or Stage 2 emitted any enrichment warnings, list them under a `Warnings:` heading at the bottom of the report. If there were none, omit that section.

Read the packaged README through MCP resource `bridge-api://readme`, section **Start Tickets troubleshooting**, for worktree folders, checked-out branches, monitoring, and read-only doctor follow-up.

## Difficulty-Based Implementation-Model Routing

Before launching the interactive agent for each ticket, the packaged CLI selects an
implementation **model tier** from the ticket's `difficulty` rating (1-10) and may
inject `--model` at the agent spawn boundary. This happens entirely inside the
CLI — it is **not** part of the server-side `$bridge-implement-ticket` recipe, because the
model an interactive agent session uses is fixed at the moment the process is launched.

- **Tier ladder:** `difficulty 1-2 → cheap`, `3-6 → basic`, `7-10 → premium`.
  Under the repo's `quality` optimization posture (also the fail-safe default) the
  premium tier starts one step earlier, at difficulty 6 (`6-10 → premium`, basic
  covers 3-5); `speed` and `maximize_subscription` keep the ladder above.
- **Separation of concerns:** the Python backend returns only the coarse tier
  (`cheap`/`basic`/`premium`) via `GET /jira/tickets/{KEY}/model-tier`; difficulty is
  computed on demand and cached when absent. Claude/Cursor use the TypeScript
  agent registry and Cursor validates against `cursor-agent --list-models`. Codex
  fetches `GET /jira/codex-model-catalog?repo_name=...` once per invocation;
  Bridge derives its bare IDs and revision directly from `MODEL_REGISTRY`.
- **Per-repo config:**
  - `difficulty_model_routing_enabled` — boolean, **default ON**. Set to `false` to
    disable routing for a repo (the CLI then omits `--model`).
  - `difficulty_model_tier_overrides` — a JSON object mapping a tier name to a model
    alias (e.g. `{"premium": "opus"}`), **not** raw CLI arguments. Only `cheap`,
    `basic`, and `premium` keys are accepted; aliases must match `^[A-Za-z0-9._:-]+$`.
    Applies to Claude/Cursor only; Codex uses the backend catalog.
- **Routing follows the workflow's phase.** The consumer asked of the server depends on what the spawned tab does:
  - `--workflow implement` requests the tier with no `consumer` parameter, so the server's default **implementation** consumer decides it (the ladder above).
  - `--workflow review-and-implement` requests it with `consumer=review`: the spawned tab is a review tab, so the stored **review** thresholds decide its model. The routing line reads `phase=review`, and the `[model-routing]` diagnostic carries `phase=review consumer=review`. Review routing accepts a response only if the server echoed `consumer: "review"` and stored review thresholds decided it. An older server that does not echo the consumer falls back to premium with reason `consumer-unrecognized`; a server with no configured review thresholds falls back to premium with reason `legacy`. Neither is ever reported as a review-threshold decision.
  - The **fresh implementation session** that `$bridge-review-and-implement` later spawns is an ordinary `implement` launch. It uses the implementation decision snapshotted before review (carried as `--auto-tier`), not a value refreshed after review. The two phases therefore normally run on **different** tiers.
  - **Manual `--tier`** is the deliberate exception: it is applied exactly as supplied, makes no tier lookup, and is handed to both phases, so both run on it.
  - **Carried `--auto-tier`** is the launch baseline for the implementation launch. Under `maximize_subscription` only, a threshold-marker read (with the workflow's consumer) decides whether posture may downshift that baseline; the response never replaces the carried tier. `quality` and `speed` make no marker request.
- **Fail-open:** routing never aborts a spawn. Credential, network, config, or
  no-tier routing failures retain the premium fallback for Claude/Cursor when
  its alias is valid. Codex omits `--model` on access, config, tier, catalog,
  revision, or alias failure and launches its configured default. Disabled
  routing also omits `--model`. Each degraded invocation emits a secret-free
  routing diagnostic. Bridge's catalog states provider policy, not whether the
  local Codex account can use a model; no supported non-interactive account
  entitlement probe is available, so the CLI reports that limitation.

### Model routing credential

Difficulty→model routing needs Bridge API credentials, and the shell-spawned
`start-tickets` CLI is a **different runtime surface** from the MCP server: a
`BAPI_API_KEY` that lives only in `.mcp.json` / `.cursor/mcp.json` is visible to
the MCP server but **not** to the Bash-spawned CLI, so routing silently degrades.
The durable source of truth both runtimes can resolve is the user-scoped store
`~/.config/bridge/credentials.json`, keyed `bapi:<repo>`. If a routing-diagnostic
line reports the credential is missing (e.g. difficulty resolves as `?`), fix it
by any one of:

1. Rerun `$bridge-install-bridge` — its final stage now persists the validated routing
   credential into `~/.config/bridge/credentials.json` via the
   `persist_routing_credential` tool.
2. Migrate a key that lives **only** in `.mcp.json` / `.cursor/mcp.json` into the
   user-scoped store with the consent-gated, one-shot command:

   ```
   npx -y @bridge_gpt/mcp-server credentials migrate-agent-config --write-credentials
   ```

3. Manually add `BAPI_API_KEY` under the `bapi:<repo>` target in the user-scoped
   store `~/.config/bridge/credentials.json`.

Never put `BAPI_API_KEY` into a worktree `.mcp.json` / `.cursor/mcp.json` as a fix —
that env is invisible to the spawned CLI.

## Epic Implementer observability (opt-in via `--conductor`, BAPI-394)

The observability layer is **opt-in**. By default `start-tickets` spawns the plain
`cd <worktree> && <agent> '$bridge-implement-ticket <KEY> [--auto]'` — no
`BAPI_EPIC_IMPLEMENTER_*` env, no supervisor window, and no message-relay instruction.
Pass `--conductor` (e.g. `$bridge-start-tickets --conductor BAPI-123`) to enable the
observability layer below. `--conductor` only adds observability. It is not how an
epic is driven: an epic's children run through `drive-epic` — `$bridge-drive-epic-run <EPIC>`
on Claude Code or Cursor, or `drive-epic <EPIC>` on Codex or Copilot.

With `--conductor`, a run mints a single observability `run_id` and attributes each
worker's lifecycle events by `worker_id`, ticket key, and worktree path, and a
supervisor peer tab is opened. When the selected agent is **Claude Code**, the CLI
injects an Epic Implementer lifecycle hook into each created worktree's
`.claude/settings.local.json` so the spawned session emits local `run.started` /
`run.stopped` / `agent.notification` (and, when
`BAPI_EPIC_IMPLEMENTER_ENABLE_PRE_TOOL_USE=1`, `tool.intent`) events into the local
observability ledger. These hooks apply **only** when the selected agent is Claude
Code; other agents (e.g. `cursor-agent`) still participate in the run-level
`run.started` event but receive no per-worktree Claude hook. Inspect the ledger
with the `epic-implementer` CLI (e.g. `epic-implementer doctor`). Observability is
best-effort and never blocks or aborts a spawn.

Observability under `--conductor` is one-directional: workers emit lifecycle events
into the local ledger and nothing is passed back into a running session. (An
epic-tick dispatch always turns observability on, whatever this flag says.)
