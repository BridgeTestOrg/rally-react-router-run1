---
schedulable: true
interactive: true
arguments: {"positionals":[{"name":"ticketKeys","type":"string","required":true,"variadic":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"review","flag":"--review","type":"string","repeatable":true},{"name":"agent","flag":"--agent","type":"string"},{"name":"model","flag":"--model","type":"string"},{"name":"maxParallel","flag":"--max-parallel","type":"string"},{"name":"dryRun","flag":"--dry-run","type":"boolean"},{"name":"noRefreshBase","flag":"--no-refresh-base","type":"boolean"},{"name":"baseBranch","flag":"--base-branch","type":"string"}]}
---

# Review Tickets: $ARGUMENTS

$ARGUMENTS

This command is the single review front door for one or more Jira ticket keys. **Exactly one resolved ticket key** is reviewed **inline in the current session**: it invokes `/review-ticket <KEY>` directly, with no terminal tab, no worktree, and no packaged CLI subcommand. **Two or more resolved ticket keys** fall back to the packaged `@bridge_gpt/mcp-server` CLI subcommand `review-tickets`, which opens one terminal tab per ticket running the selected agent with `/review-ticket <KEY> [--auto] [--rounds=<1|2>]`. By default `--rounds` is omitted so the backend routes each review by difficulty (difficulty-adaptive review); pass an explicit `--rounds=1|2` (globally or per ticket) to force the review shape. Unlike `/start-tickets`, the multi-key path creates no Worktrunk worktrees — but it requires `git` on PATH: the parent process fetches `origin/<base_branch>` once and pins a single `base_sha` for the whole batch before spawning tabs (BAPI-474), so every spawned review grounds its codebase evaluation against the same freshly-fetched base tree. Pass `--no-refresh-base` to skip this and restore the prior git-free, in-place-grounded behavior. Each spawned tab's model is routed by the review threshold (BAPI-1343): the CLI asks `/model-tier?consumer=review` per ticket and passes the mapped `--model` only when the server reports configured (or anomaly) review thresholds. An explicit `--model` always wins and skips the lookup; legacy mode, a failed lookup, or an older server that does not echo the review consumer launches the tab with no `--model`, as before. The single-key inline path performs no batch fetch and pins no shared `base_sha` — `/review-ticket` grounds its own review independently (see Stage 2 below).

---

# Instructions

## Stage 0 — Parse Arguments, Validate, and Check Connectivity

1. **Parse `$ARGUMENTS`** to extract ticket keys, review modes, and pass-through flags:

   - **Recognized flags and their values are consumed first.** `--review`, `--agent`, `--model`, `--base-branch`, and every other value-taking flag, plus the value token immediately following it (or the `=value` suffix on the same token), are removed from consideration before ticket keys are resolved. **Every remaining whitespace-separated token** matching `[A-Z]+-[0-9]+` (e.g., `BAPI-1`) is a resolved positional ticket key. Jira-key-shaped text that appears **inside** a flag value (e.g. the `BAPI-1` inside `--review BAPI-1=auto,rounds=1`, or a coincidentally key-shaped `--model` or `--agent` value) is never added to the positional ticket-key list — it was already consumed as part of that flag. If zero resolved positional keys remain, stop immediately and display:
     ```
     No ticket keys found. Expected one or more keys like BAPI-1.
     Usage: /review-tickets [flags] KEY [KEY ...]
     ```

   - **Review mode interpretation** (per ticket or global):
     - `auto` or `--auto` → per-ticket or global auto-approve flag.
     - `single-pass`, `one-pass`, `rounds=1`, or `--rounds=1` → `rounds=1` (single-pass review).
     - `full`, `two-pass`, `rounds=2`, or `--rounds=2` → `rounds=2` (full second-opinion review).
     - **omitted rounds → `adaptive`**: when no rounds mode is given for a ticket, do NOT choose a round count — leave it adaptive so the backend's difficulty-adaptive review policy decides the shape. `adaptive` is a distinct mode from `1` and `2`.
     - `--auto` and `--rounds` are independent: both may apply to the same ticket.
     - **Repeated or conflicting `--review KEY=...` overrides for the same key are last-wins**: the last occurrence of an override targeting a given key is the one that applies, matching this repository's existing last-wins CLI convention. A sole-key override such as `--review BAPI-123=auto,rounds=2` resolves to exactly the same state as explicit global `--auto --rounds=2` for that key.

     The backend executor now owns all review round orchestration (including any second-opinion rounds) server-side — there is no client-side step to skip, so this command never sends `skip_steps` and never translates `--rounds=1` into skipping a second-opinion step. An explicit `--rounds` value forwarded to each spawned `/review-ticket` forces the review shape (`1` = single pass, `2` = full second-opinion review). A spawned `/review-ticket` invoked without any `--rounds` (the default) lets the backend's difficulty-adaptive review policy decide the shape (falling back to a full premium second-opinion review when adaptive routing is disabled, unavailable, or the ticket's difficulty cannot be resolved). This command therefore forwards **no** `--rounds` by default; it only forwards `--rounds` when the caller explicitly supplies a rounds mode (globally via `--rounds`, or per ticket via `--review`).

   - **Homogeneous modes** (two or more resolved keys only): when all tickets share the same auto and rounds mode, translate into global `--auto` (if all auto) and, only when all tickets share the same *explicit* rounds value, global `--rounds=1|2`. When all tickets are adaptive (no rounds given), omit `--rounds` entirely — do not synthesize a default.

   - **Heterogeneous modes** (two or more resolved keys only): when tickets differ in auto or rounds mode, translate into repeatable `--review KEY=auto,rounds=N` overrides. Only emit a `rounds=N` subtoken for tickets given an explicit `1`/`2`; adaptive tickets carry no `rounds` subtoken (a bare `--review KEY=auto` if they are auto, or no override at all). Do NOT set global `--auto` when only some tickets are auto-approved, and do NOT set global `--rounds` when only some tickets have an explicit rounds value.

   - **Pass-through flags**: collect `--dry-run`, `--max-parallel N`, `--agent claude|cursor-agent|codex`, `--model VALUE`, `--no-refresh-base`, and `--base-branch VALUE` if supplied. In a Codex session, pass `--agent codex` when no agent was supplied. Codex batch sessions use `$bridge-review-ticket` and require the current repository's skill bundle and repository-bound Bridge MCP scope before spawn.

   - **Validate `--base-branch`** (applies before dispatch, for both the single-key and multi-key paths): accept either `--base-branch VALUE` or `--base-branch=VALUE`. After trimming, the value must be non-empty, at most 255 characters, must not start with `-`, and must not contain ASCII control characters (`0x00`–`0x1F` or `0x7F`). Reject a malformed value:
     ```
     Invalid --base-branch value: <reason>
     Usage: /review-tickets [flags] KEY [KEY ...]
     ```

2. **Connectivity check**: after parsing and validation succeed (i.e. at least one ticket key resolved and `--base-branch`, if supplied, is valid), and **before** the ticket-count dispatch below and before either dispatch path's `--dry-run` handling, call the `ping` MCP tool. If it fails or does not return `"status": "ok"`, stop immediately and display:
   ```
   Connectivity check failed. Please verify:
   - Check that the Bridge API MCP server is configured in your editor's MCP settings
   - Check that BAPI_BASE_URL is set and the server is reachable
   - Check that BAPI_API_KEY is valid
   - Check that BAPI_REPO_NAME matches a configured repository
   ```

## Stage 1 — Dispatch by Resolved Ticket Count

Count the resolved positional ticket keys from Stage 0:

- **Exactly one key** → Stage 2, the single-key inline path. Do not resolve the packaged-CLI launcher, spawn a terminal tab, or perform the batch base-branch fetch/pin on this path.
- **Two or more keys** → Stage 4, the packaged CLI fan-out (unchanged from today).

(Zero keys already stopped in Stage 0 and never reaches this dispatch.)

## Stage 2 — Single-Key Inline Review

This path reviews the sole resolved key **in the current agent session**, mirroring how `/review-and-implement` invokes `/review-ticket` inline. It keeps the current session's model and is not routed by the review threshold; to get a threshold-routed review of one ticket, spawn it as a tab instead.

1. **Construct the inline invocation** in this deterministic order: `/review-ticket <KEY>`, followed conditionally by:
   - `--auto` — forwarded when either the global `--auto` flag or the resolved per-key `--review KEY=...` override enables auto-approve for this key.
   - `--rounds=1` or `--rounds=2` — forwarded only when the resolved mode for this key (global `--rounds`, or a `rounds=N` subtoken in a `--review KEY=...` override targeting this key) contains an explicit round count. When the resolved mode is adaptive (no explicit rounds given anywhere for this key), omit `--rounds` entirely so the backend's difficulty-adaptive review policy decides the shape.
   - `--no-refresh-base` — forwarded unchanged when supplied.
   - `--base-branch=<value>` — the validated Stage 0 value, normalized to the `/review-ticket`-accepted `--base-branch=<value>` form, when supplied.

   `--agent`, `--model`, and `--max-parallel` are accepted for interface stability (they are fan-out concerns with no meaning for a single inline review) but are **never** added to the constructed invocation. When any of the three is supplied, print exactly one advisory line to **stderr** before continuing:
   ```
   Note: --agent, --model, and --max-parallel do not apply to a single-key inline review and were ignored.
   ```

2. **`--dry-run`**: after the unconditional Stage 0 `ping` and any stderr inert-flag advisory above, write only the constructed invocation to **stdout**:
   ```
   /review-ticket <KEY> [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=<value>]
   ```
   Then stop immediately. Do not invoke `/review-ticket`, resolve the packaged-CLI launcher, open a terminal tab, perform the batch fetch/base-SHA pin, or enter Stage 5's summary rendering.

3. **Otherwise**, invoke the constructed `/review-ticket` command **inline, in this same session** — the same composition shape `/review-and-implement` uses for its own inline review phase. This path performs **no** batch `git fetch` and pins **no** shared `base_sha`: `/review-ticket` independently grounds its review through `fresh_base` materialization of a fresh `git archive` from `origin/<base>` (see `docs/BAPI-474-ground-review-against-fresh-base.md`), and the forwarded `--no-refresh-base` / `--base-branch` flags control that independent grounding.

4. When the inline reviewer completes, the `/review-tickets` orchestration for this invocation is finished. Do not parse or render packaged-CLI `Summary:` output — that format belongs to the multi-key path only.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Used only by the multi-key fan-out (Stage 4) below — the single-key inline path (Stage 2) never resolves or uses this launcher.

Resolve the packaged-CLI launcher **once**, before the first shell-out below, and reuse that one resolved value for every packaged-CLI invocation in this command. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Apply this command's mandatory single-quote escaping rule (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating `<launcher>` into a Bash command string. Never expand it unquoted.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

Worked examples and printed remediation hints below show the **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

## Stage 4 — Invoke the Packaged CLI (two or more keys)

Use the **Bash tool** to invoke exactly one CLI invocation:

```
<launcher> review-tickets [--auto] [--rounds=1|2] [--review KEY=auto,rounds=N ...] [--agent <name>] [--model <alias>] [--max-parallel N] [--dry-run] [--no-refresh-base] [--base-branch BRANCH] KEY [KEY ...]
```

- `review-tickets` runs all tabs from the current repository cwd — it creates no worktrees.
- The command never runs `wt` or `git-wt` — but it now requires `git` on PATH (BAPI-474): before spawning any tabs, the parent process fetches `origin/<base_branch>` once and pins a single `base_sha` for the whole batch, so a mid-batch `origin` advance can never mix bases within one run. Pass `--no-refresh-base` to skip the fetch and restore the prior git-free, in-place-grounded behavior.
- Prerequisites: macOS `osascript` + `git`, Windows `wt.exe` or PowerShell + `git`, Linux `tmux` + `git` (git is not required when `--no-refresh-base` is passed).

Pass through the CLI's stdout and stderr verbatim. If the CLI exits non-zero, treat it as a critical failure and report the exit code and error output.

## Stage 5 — Final Report (two or more keys)

Once the CLI exits 0, parse its `Summary:` lines (each shaped like `KEY  auto=<true|false>  rounds=<1|2|adaptive>  agent=<agent>  model=<alias|default>  status=<status>`) and render as a markdown table (`rounds=adaptive` means the backend chose the shape by difficulty):

```
| Ticket   | Auto  | Rounds   | Agent  | Model   | Status  |
|----------|-------|----------|--------|---------|---------|
| BAPI-1   | false | adaptive | claude | default | spawned |
| BAPI-2   | true  | 1        | claude | default | spawned |
```

Render any CLI `Warnings:` lines below the table. If there were none, omit the warnings section.
