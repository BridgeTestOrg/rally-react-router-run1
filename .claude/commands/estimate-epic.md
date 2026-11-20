Estimate an entire Jira Epic or an explicit ticket-key group via the shared epic estimation orchestrator.

$ARGUMENTS

---

# Instructions

`$ARGUMENTS` is either a Jira Epic key (e.g. `BAPI-518`) or an explicit `--tickets` key list — never both. This command calls the `estimate_epic` MCP tool, which delegates to the Bridge API epic estimation orchestrator, and renders the structured result.

If any step fails, stop immediately and report which step failed and why, preserving the user's originally entered epic key or ticket list in the report.

## Step 1 — Parse Arguments

1. **Parse `$ARGUMENTS`**: Extract exactly one key-source input, plus an optional `--allow-partial` flag.
   - Split `$ARGUMENTS` on whitespace.
   - If `--tickets` appears, every token after it (up to the next flag or end of input) is the explicit ticket-key list — this is the `ticket_keys` mode.
   - Otherwise, the first token matching the Jira key pattern (`[A-Z][A-Z0-9]+-\d+`) is the `epic_key` — this is the epic mode.
   - `--allow-partial` may appear anywhere; if present, set `allow_partial_value = true`. If absent, omit `allow_partial` entirely (do not pass `false`).
   - Never resolve both an `epic_key` and a `ticket_keys` list from the same invocation — usage is one mode or the other.

2. **Validate input**:
   - Usage forms: `/estimate-epic EPIC-KEY` or `/estimate-epic --tickets KEY-1 KEY-2 ...`, plus optional `--allow-partial`.
   - If neither an `epic_key` nor a `--tickets` list can be resolved, stop immediately and report:
     ```
     Usage: /estimate-epic EPIC-KEY [--allow-partial]
            /estimate-epic --tickets KEY-1 KEY-2 ... [--allow-partial]
     ```
   - If `--tickets` is present but followed by zero keys, stop immediately and report: "`--tickets` requires at least one ticket key."
   - Do not invent or pass a `mode` parameter — there isn't one; the tool infers the source from whichever of `epic_key`/`ticket_keys` is supplied.

## Step 2 — Call the Tool

Call the `estimate_epic` MCP tool with:
- `epic_key`: the resolved epic key — **only** when in epic mode. Omit entirely in ticket-key mode.
- `ticket_keys`: the resolved ticket-key list — **only** when in ticket-key mode. Omit entirely in epic mode.
- `allow_partial`: `allow_partial_value` if `--allow-partial` was passed; omit entirely otherwise (never pass `null`, an empty string, or an empty array for any absent field).

Never pass both `epic_key` and `ticket_keys` in the same call.

If the tool returns an error envelope (a JSON object with an `error` field), stop and report the error message, preserving the epic key or ticket list the user originally entered.

## Step 3 — Render the Result

Render the successful result as a structured report — do not dump raw JSON by default:

1. **Top**: the final estimate and its scale label (`estimate_label`) as the primary heading — this is the strongest element of the report.
2. **Immediately after the summary**: `math_source`.
3. **Next**: resolved child ticket keys (`child_ticket_keys`) and the per-child breakdown, presented compactly.
4. **Only if non-empty**: a compact warning section listing `failed_child_keys` and `skipped_child_keys`.

Keep the happy-path report concise and scannable. Use backticks for Jira keys and technical identifiers (e.g. `BAPI-518`).

> Note: this tool does not accept a `recreate` parameter — the underlying epic estimation orchestrator (BAPI-522) always reuses cached child estimates and has no recreate knob to forward to.

## Final Report

On successful completion, display a structured summary per Step 3 above. On failure, display the error message returned by the tool (or the usage error from Step 1), preserving the user's originally entered epic key or ticket list.
