---
schedulable: true
interactive: true
arguments: {"positionals":[{"name":"ticketKey","type":"string","required":true}],"flags":[{"name":"auto","flag":"--auto","type":"boolean"},{"name":"rounds","flag":"--rounds","type":"string"},{"name":"noRefreshBase","flag":"--no-refresh-base","type":"boolean"},{"name":"baseBranch","flag":"--base-branch","type":"string"},{"name":"baseSha","flag":"--base-sha","type":"string"}]}
---

# Review Ticket

$ARGUMENTS

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
   Usage: /review-ticket <ticket_key> [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=BRANCH] [--base-sha=SHA]
   ```

   If a `--rounds` token is present but its value is not `1` or `2`, stop and display:
   ```
   Invalid --rounds value. Expected: --rounds=1 or --rounds=2 (omit to let the backend decide adaptively; default falls back to a full review)
   Usage: /review-ticket <ticket_key> [--auto] [--rounds=1|2] [--no-refresh-base] [--base-branch=BRANCH] [--base-sha=SHA]
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
