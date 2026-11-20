---
name: bridge-estimate-ticket
description: Run Bridge's estimate-ticket workflow when explicitly invoked as $bridge-estimate-ticket.
---

# Bridge workflow: estimate-ticket

Estimate a single Jira ticket — a one-ticket shortcut over the shared epic estimation orchestrator.

This skill is explicitly invoked as `$bridge-estimate-ticket <input>`.
Treat the text after `$bridge-estimate-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

`$ARGUMENTS` is exactly one Jira ticket key (e.g. `BAPI-123`), plus an optional `--allow-partial` flag. This command calls the existing `estimate_epic` MCP tool with a single-key `ticket_keys` payload and renders the result in single-ticket language. It does not register a new MCP tool and does not support an epic key or a multi-key list — use `$bridge-estimate-epic` for those.

If any step fails, stop immediately and report which step failed and why, preserving the user's originally entered input.

## Step 1 — Parse Arguments

1. **Scan every token** in `$ARGUMENTS` for the Jira key pattern `[A-Z][A-Z0-9]+-\d+`, in input order, counting every match rather than stopping at the first one.
2. `--allow-partial` may appear anywhere; if present, set `allow_partial_value = true`. If absent, omit `allow_partial` entirely (never pass `false`).
3. **Zero resolved keys** — stop immediately and report:
   ```
   Resolved keys: none
   Usage: $bridge-estimate-ticket KEY [--allow-partial]
   ```
4. **More than one resolved key** (including a key repeated more than once) — stop immediately and report every resolved key, including duplicates, and state that `$bridge-estimate-ticket` accepts exactly one key:
   ```
   Resolved keys: <KEY-1>, <KEY-2>, ...
   $bridge-estimate-ticket accepts exactly one ticket key. For multiple tickets, use $bridge-estimate-epic --tickets KEY-1 KEY-2 ...
   ```
5. **Exactly one resolved key** — proceed to Step 2 with that key.

Do not invent a `mode`, `epic_key`, or `recreate` parameter — none exist on the underlying tool.

## Step 2 — Call the Tool

1. Call the `estimate_epic` MCP tool with:
   - Absent `--allow-partial`: exactly `{ticket_keys: [KEY]}`.
   - Present `--allow-partial`: exactly `{ticket_keys: [KEY], allow_partial: true}`.
   Never include `epic_key`, `mode`, `recreate`, or an explicit `false`/`null` value for `allow_partial`.

2. **If the tool is unavailable or unregistered** (a missing-tool error, or the host reports no such tool), this is a profile configuration gap, not an estimation failure — there is no fallback estimation path. Report:
   ```
   The `estimate_epic` tool is not available. It is registered only when the MCP server's estimation
   profile is active. Ask whoever manages this project's MCP configuration to restart the server with
   one of:
     BRIDGE_MCP_PROFILE=estimation
     BRIDGE_MCP_PROFILE=core,estimation   (or any comma-separated profile list containing "estimation")
     BRIDGE_MCP_PROFILE=full
   If you don't have configuration access, contact the project or MCP configuration owner.
   ```

3. **If the parsed response has a non-empty `error` field**, this is a definitive failure — stop before any success rendering:
   - Render `message` as the primary explanation, when present.
   - Show `error` secondarily, as a technical code, when `message` is present.
   - When `message` is absent or empty, render `error` alone as the explanation.

## Step 3 — Render the Result

On success, render single-ticket language — do not dump raw JSON by default:

1. **Top**: the requested Jira key, `estimate_label`, and the final estimate (`final_hours` / `final_minutes`) as the primary heading.
2. **Immediately after**: `math_source`.
3. **Next**: `child_ticket_keys` and the per-ticket detail, presented compactly using the tool's existing response semantics.
4. **Only if non-empty**: `failed_child_keys` and `skipped_child_keys`, without epic-oriented headings or empty sections.
5. **Side-effect disclosure** — always include, directly after the rendered result:
   ```
   Note: $bridge-estimate-ticket adds no new side effects or override flags of its own, but the underlying
   estimate_epic tool may write a Jira comment and/or update story points when this repository's
   configuration enables write-back. That behavior cannot be overridden per MCP call, so this command
   is not guaranteed to be strictly read-only.
   ```

Use backticks for Jira keys and technical identifiers (e.g. `BAPI-123`).

## Final Report

On successful completion, display the structured summary from Step 3, including the side-effect disclosure. On failure, display the error/usage message from the step that failed, preserving the user's originally entered input.
