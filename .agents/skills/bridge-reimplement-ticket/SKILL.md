---
name: bridge-reimplement-ticket
description: Run Bridge's reimplement-ticket workflow when explicitly invoked as $bridge-reimplement-ticket.
---

# Bridge workflow: reimplement-ticket

# Reimplement Ticket: $ARGUMENTS

This skill is explicitly invoked as `$bridge-reimplement-ticket <input>`.
Treat the text after `$bridge-reimplement-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

This command retrieves the reimplement context for a previously-implemented Jira ticket via MCP, then implements follow-up changes inline. Use this for small follow-up requests on tickets that have already been through the plan+implement cycle.

If any critical stage fails (Stage 0 or Stage 1), stop immediately and report which stage failed and why.

---

# Instructions

You are executing a 4-stage pipeline to implement follow-up changes on a Jira ticket using assembled reimplement context. Execute all stages in sequence.

## Stage 0 — Setup and Argument Parsing

1. **Parse `$ARGUMENTS`**: Extract a required `ticket_key`, an optional `--second-opinion` flag, and an optional `--provider` flag.
   - Split `$ARGUMENTS` on whitespace.
   - If `--second-opinion` appears followed by a provider name (one of `openai`, `anthropic`, `gemini`), capture that provider as `second_opinion_value`.
   - If `--second-opinion` appears without a provider name following it (or is the last token), set `second_opinion_value = "auto"`.
   - If `--second-opinion` is absent, set `second_opinion_value = null`.
   - If `--provider` appears followed by a provider name (one of `openai`, `anthropic`, `gemini`), capture that provider as `provider_value`.
   - If `--provider` appears without a valid provider name following it (or is the last token), stop immediately and report: "Usage error: --provider requires a provider name (openai, anthropic, or gemini)."
   - If `--provider` is absent, set `provider_value = null`.
   - If both `--second-opinion` and `--provider` are present, `--second-opinion` takes precedence (set `provider_value = null`).
   - The remaining token (after removing flags and their arguments) is the `ticket_key`.
   - If `ticket_key` is empty or does not match the expected format (one or more uppercase letters, a hyphen, and one or more digits), stop immediately and display:

   ```
   Invalid ticket key format: '<value>'. Expected format: PROJ-123 (uppercase letters, hyphen, digits).
   Usage: $bridge-reimplement-ticket <ticket_key> [--second-opinion [provider]] [--provider <name>] (e.g., $bridge-reimplement-ticket BAPI-150)
   ```

This stage is **critical** — stop immediately on failure. Do not proceed to Stage 1.

## Stage 1 — Request and Retrieve Reimplement Context

Call the `request_reimplement_context` MCP tool with:
- `ticket_number`: the parsed `ticket_key` from Stage 0
- `wait_for_result`: `true`
- `save_locally`: `true`
- `second_opinion`: set to `second_opinion_value` if it is non-null; omit the parameter entirely if `second_opinion_value` is null
- `provider`: set to `provider_value` if it is non-null; omit the parameter entirely if `provider_value` is null

If the tool returns an error or 404 persists after polling, stop immediately and display:

```
Failed to retrieve reimplement context for <ticket_key>.
This may mean:
- The ticket has not been previously processed by Bridge API
- Background processing failed — check server logs
- The ticket does not exist in Jira

Try running $bridge-plan-ticket <ticket_key> first if this is a new ticket.
```

On success, read and internalize the returned context markdown. This document contains:
- A summary of changes (if applicable)
- New/changed information since last processing (comments, description changes, attachments)
- The original ticket description
- The existing implementation plan (at the bottom, for reference only)

This stage is **critical** — stop immediately on failure. Do not proceed to Stage 2.

## Stage 2 — Implement Follow-Up Changes

Execute changes inline in this conversation. Work directly so the user can see all progress and approve tool calls.

Follow these rules:

1. **Focus on the new information.** The context document identifies what has changed since the last implementation. Focus your changes on addressing the new/changed requirements.
2. **Reference the existing plan as supplementary guidance only.** The plan at the bottom of the context describes the original implementation, not the follow-up. Use it to understand the existing code structure, not as a step-by-step guide.
3. **Make code changes** as directed by the new information.
4. **Run tests and checks** to verify your changes don't break existing functionality.
5. **Do NOT run `git commit` or `git push`.** Leave all changes uncommitted for developer review.
6. **Scope guard**: If the follow-up changes are too large in scope (e.g., fundamentally restructuring the original implementation, touching more than 5-6 files, or requiring new infrastructure), stop and ask the user for guidance rather than attempting everything. Follow-up reimplementations should be small and targeted.
7. **If a change is ambiguous or blocked**, note the issue clearly and continue with the next change rather than halting entirely.

This stage is **critical** — if a blocking error prevents further progress, stop and report the failure.

## Stage 3 — Final Summary Report

Display a structured report after all stages complete:

```
## Reimplement Complete

**Ticket**: <ticket_key>

**Changes Made**:
- <brief summary of each change>

**Developer Action Items**:
- All changes are uncommitted. Review the changes with `git diff` before committing.
- Run the project's test suite to verify nothing is broken before committing.

**Warnings**:
<If any issues arose during implementation (scope concerns, ambiguous requirements,
files that couldn't be modified), list them here. If no warnings, omit this section.>
```

## Final Report

On success, display the structured report from Stage 3 confirming that the follow-up changes are complete.

On failure at any critical stage (Stage 0 or Stage 1), display which stage failed and the error details.
