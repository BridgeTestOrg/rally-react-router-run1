---
name: bridge-parse-repository
description: Run Bridge's parse-repository workflow when explicitly invoked as $bridge-parse-repository.
---

# Bridge workflow: parse-repository

Queue a background job to parse and index the repository for Bridge API's AI agents.

This skill is explicitly invoked as `$bridge-parse-repository <input>`.
Treat the text after `$bridge-parse-repository` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

Execute all steps in this command as a simple linear sequence of MCP tool calls.

## Step 1 — Parse Arguments

Parse `$ARGUMENTS` for an optional `directory_path` argument (a subdirectory path to scope the parse to, e.g., `src/python`). If no argument is provided, the entire repository will be parsed. If `$ARGUMENTS` is provided but invalid (e.g., contains special characters that suggest it's not a path), report an error.

## Step 2 — Queue Parse Job

Call the `parse_repository` MCP tool with:
- `directory_path`: set to the parsed `directory_path` from Step 1 if provided, otherwise omit the parameter

If the response indicates parsing is already in progress, display:

```
Repository parsing is already in progress. A previous parse job has not yet completed.

Ask your agent to check progress with the `parse_repository` tool (`action` set to `"status"`), or wait a few minutes and try again.
```

Stop and do not proceed to the summary.

If the call fails or returns an error, stop immediately and display:

```
Failed to queue parse job: <error message from the tool>
```

## Summary

On successful queuing, display:

```
Repository parse job queued successfully.

Scope: <entire repository or directory_path if provided>

Processing typically takes several minutes for large repositories.
Ask your agent to check progress with the `parse_repository` tool (`action` set to `"status"`).
```

After the parse completes, AI-generated plans and clarifying questions will reflect the latest code changes.
