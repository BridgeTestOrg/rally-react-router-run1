---
name: bridge-create-doc
description: Run Bridge's create-doc workflow when explicitly invoked as $bridge-create-doc.
---

# Bridge workflow: create-doc

Generate a design document (TDD, FSD, or PRD) for a Jira ticket, wait for the result, and save it locally.

This skill is explicitly invoked as `$bridge-create-doc <input>`.
Treat the text after `$bridge-create-doc` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

Execute all steps in this command as a simple linear sequence of MCP tool calls.

## Step 1 — Parse Arguments

1. **Parse `$ARGUMENTS`**: Extract a required `ticket_key`, a required `--doc-type` flag, an optional `--second-opinion` flag, and an optional `--provider` flag.
   - Split `$ARGUMENTS` on whitespace.
   - If `--doc-type` appears followed by one of `tdd`, `fsd`, or `prd`, capture that as `doc_type`.
   - If `--doc-type` is absent, or is followed by anything other than `tdd`/`fsd`/`prd` (or is the last token), stop immediately and report: "Usage error: --doc-type requires a document type (tdd, fsd, or prd)."
   - If `--second-opinion` appears followed by a provider name (one of `openai`, `anthropic`, `gemini`), capture that provider as `second_opinion_value`.
   - If `--second-opinion` appears without a provider name following it (or is the last token), set `second_opinion_value = "auto"`.
   - If `--second-opinion` is absent, set `second_opinion_value = null`.
   - If `--provider` appears followed by a provider name (one of `openai`, `anthropic`, `gemini`), capture that provider as `provider_value`.
   - If `--provider` appears without a valid provider name following it (or is the last token), stop immediately and report: "Usage error: --provider requires a provider name (openai, anthropic, or gemini)."
   - If `--provider` is absent, set `provider_value = null`.
   - If both `--second-opinion` and `--provider` are present, `--second-opinion` takes precedence (set `provider_value = null`).
   - The remaining token (after removing flags and their arguments) is the `ticket_key`.

2. **Validate ticket key format**: Confirm the ticket key matches the Jira key pattern `[A-Za-z][A-Za-z0-9]+-\d+`. If it does not match (or `ticket_key` is empty or missing), stop immediately and display:

   ```
   Usage: $bridge-create-doc <ticket_key> --doc-type <tdd|fsd|prd> [--second-opinion [provider]] [--provider <name>] (e.g., $bridge-create-doc BAPI-150 --doc-type fsd)
   ```

## Step 2 — Resolve Docs Directory

Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`.

## Step 3 — Generate Design Document

Call the `create_doc` MCP tool with:
- `ticket_number`: the validated `ticket_key`
- `doc_type`: the parsed `doc_type` (`tdd`, `fsd`, or `prd`)
- `wait_for_result`: `true`
- `save_locally`: `true`
- `second_opinion`: set to `second_opinion_value` if non-null; omit entirely if null
- `provider`: set to `provider_value` if non-null; omit entirely if null

This step may take 2-4 minutes while the backend processes the document.

If the tool returns an error, stop immediately and display:

```
Design document generation failed: <error message from the tool>
```

If generation did not finish, the document can be retrieved later with the `get_doc` MCP tool using the same `ticket_number` and `doc_type`.

## Step 4 — Confirm Success

Resolve the local file path from `doc_type`:
- `tdd` → `{docs_dir}/architecture/<ticket_key>-architecture-plan.md`
- `fsd` → `{docs_dir}/fsd/<ticket_key>-fsd-plan.md`
- `prd` → `{docs_dir}/prd/<ticket_key>-prd-plan.md`

Display a confirmation message:

```
Design document generated successfully for <ticket_key>
Saved to: <local file path>
```

## Final Summary

Display a summary block:

```
## Design Document Report

- **Ticket**: <ticket_key>
- **Doc Type**: <doc_type>
- **Status**: Generated successfully
- **Local File**: <local file path>
```

On failure at any step, stop immediately, display which step failed and the error details, and do not proceed.
