---
name: bridge-plan-ticket
description: Run Bridge's plan-ticket workflow when explicitly invoked as $bridge-plan-ticket.
---

# Bridge workflow: plan-ticket

Generate an implementation plan for a Jira ticket, wait for the result, and save it locally.

This skill is explicitly invoked as `$bridge-plan-ticket <input>`.
Treat the text after `$bridge-plan-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

Execute all steps in this command as a simple linear sequence of MCP tool calls.

## Step 1 — Parse Arguments

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
   - If `ticket_key` is empty or missing, stop immediately and display:

   ```
   Usage: $bridge-plan-ticket <ticket_key> [--second-opinion [provider]] [--provider <name>] (e.g., $bridge-plan-ticket BAPI-150)
   ```

## Step 2 — Resolve Docs Directory

Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`.

## Step 3 — Generate Plan

Call the `request_plan_generation` MCP tool with:
- `ticket_number`: the parsed `ticket_key`
- `wait_for_result`: `true`
- `save_locally`: `true`
- `second_opinion`: set to `second_opinion_value` if non-null; omit entirely if null
- `provider`: set to `provider_value` if non-null; omit entirely if null

This step may take 1-5 minutes while the backend processes the plan.

If the tool returns an error, stop immediately and display:

```
Plan generation failed: <error message from the tool>
```

## Step 4 — Confirm Success

Display a confirmation message:

```
Plan generated successfully for <ticket_key>
Saved to: {docs_dir}/plans/<ticket_key>-plan.md
```

## Final Summary

Display a summary block:

```
## Plan Generation Report

- **Ticket**: <ticket_key>
- **Plan Status**: Generated successfully
- **Local File**: {docs_dir}/plans/<ticket_key>-plan.md
```

On failure at any step, stop immediately, display which step failed and the error details, and do not proceed.
