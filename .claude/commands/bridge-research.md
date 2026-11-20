Run multi-source, fact-checked web research via Bridge API and save a cited report locally.

$ARGUMENTS

---

# Instructions

Execute all steps in this command as a simple linear sequence of MCP tool calls.

## Step 1 — Parse Arguments

Parse `$ARGUMENTS`:
- The required `query` is the full text of `$ARGUMENTS` after removing any recognized flags.
- An optional `--ticket <KEY>` flag captures a Jira ticket key (e.g., `BAPI-123`) to associate the research with a specific ticket. If `--ticket` appears, treat the immediately following token as the ticket key and remove both from the query.
- If `$ARGUMENTS` is empty, or the query (after flag removal) is blank, stop immediately and display:

```
Usage: /bridge-research <question> [--ticket PROJ-123]
Example: /bridge-research "Best practices for rate limiting in FastAPI?"
```

## Step 2 — Resolve Docs Directory

Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`.

## Step 3 — Run Research

Call `request_deep_research` with:
- `query`: the parsed question
- `wait_for_result`: `true`
- `ticket_number`: the value from `--ticket` if provided; omit this parameter entirely if not present

This step polls until the research completes (up to 45 minutes; most runs take 5-30) and returns the full cited report directly. The tool appends a literal `Saved to <path>` line to its result — extract that line and store the path as `saved_path`.

If the tool returns an error, stop immediately and display:

```
Research failed: <error message from the tool>
```

If a required saved report disappears before consumption, retrieve the existing result with `get_deep_research(task_id)` using the task ID from this request and its supported `save_locally` option. For an existing council report needed as research input, use `get_council(council_id)` with the known council ID; use local-save options only where that tool supports them. Follow the configured docs path and persist only terminal eligible report content, never pending/error envelopes. If the identifier or eligible result is unavailable, report that recreation is needed; do not guess IDs, scan arbitrary outputs, use installer repair, or silently rerun paid research.

## Step 4 — Confirm

Display a confirmation message:

```
Research complete.
Saved to: {saved_path}
```

## Final Summary

Display a summary block:

```
## Bridge Research Report

- **Query**: <query>
- **Status**: Completed
- **Local File**: {saved_path}
```

On failure at any step, stop immediately, display which step failed and the error details, and do not proceed.
