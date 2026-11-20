---
name: bridge-ai-council
description: Run Bridge's ai-council workflow when explicitly invoked as $bridge-ai-council.
---

# Bridge workflow: ai-council

Convene a multi-perspective council on a task via Bridge API and save the resulting report locally.

This skill is explicitly invoked as `$bridge-ai-council <input>`.
Treat the text after `$bridge-ai-council` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

Execute all steps in this command as a simple linear sequence of MCP tool calls.

## Step 1 — Parse Arguments

Parse `$ARGUMENTS`. The supported invocation is exactly:

```text
$bridge-ai-council <task description> [--mode technical|design|discovery|general] [--debate] [--lenses a,b] [--ticket PROJ-123]
```

Parsing rules:

- Keep every non-flag token in its original order; the joined result is the required `task_description`. Remove each recognized flag, and the value token that belongs to it, from that text.
- `--mode <value>` accepts exactly `technical`, `design`, `discovery`, or `general`. When `--mode` is omitted, the selected mode is `technical`.
- `--debate` is a valueless boolean flag. It takes no following token.
- `--lenses <a,b>` takes one comma-separated value. Split it on commas and keep the non-empty entries as the `lenses` array.
- `--ticket <KEY>` captures the immediately following token as the ticket key.
- A missing value for `--mode`, `--lenses`, or `--ticket` — including a value position occupied by another recognized flag — is a validation failure. Never let the next flag become a flag's value.

Validation must finish before any MCP tool call. Stop immediately, display the usage response below, and make no tool call when `$ARGUMENTS` is empty, when it contains only flags, when a flag that needs a value has none, or when `--mode` is given an unsupported value:

```text
Usage: $bridge-ai-council <task description> [--mode technical|design|discovery|general] [--debate] [--lenses a,b] [--ticket PROJ-123]
Example: $bridge-ai-council "How should we add rate limiting to the LLM client?" --mode technical
```

## Step 2 — Resolve Docs Directory

Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`. This is context only — do not slugify it, predict a filename from it, or otherwise construct a report path yourself.

## Step 3 — Convene the Council

Before calling the tool, tell the user calmly what to expect:

```text
Convening the AI council. This commonly takes around 15 minutes, and may continue in the background if the client deadline expires.
```

Then call `request_council` with:

- `task_description`: the parsed task text
- `mode`: the selected mode
- `wait_for_result`: `true`
- `save_locally`: `true`
- `debate`: `true` — include this parameter **only** when `--debate` was supplied
- `lenses`: the parsed array — include this parameter **only** when `--lenses` was supplied
- `ticket_number`: the captured key — include this parameter **only** when `--ticket` was supplied

Omit an optional parameter entirely rather than sending a placeholder: never send `debate` with a false value, never send an empty `lenses` array, and never send an empty `ticket_number` string. Do not send any other parameter — no `providers`, no `concerns`, no prior `council_id` to refine, and no lens pair of your own. Omitted `lenses` already defaults server-side; do not re-implement that default here.
`request_council` also accepts a per-request `model: "ULTRA_MODEL"` opt-in, which the server approves only for Advanced-and-up or exempt accounts and which adds a surcharge per ultra-served opinion per round (OpenAI 100, Anthropic 75, Gemini none); send it only when the user explicitly asks for an ultra council.

## Step 4 — Report the Outcome

Keep the report status-first and compact: status, then the next action, then supporting detail such as the saved path, `council_id`, or mode.

**Completed.** The tool appends a `Saved files:` block listing one `- <path>` line per saved report. Collect those lines as `saved_paths`; each entry is a `saved_path` reported by the tool. Display them before any optional task, mode, or `docs_dir` context, and never invent or predict a filename:

```text
AI council complete.
Saved to: {saved_path}
```

**Backgrounded.** A response that exceeded the client deadline but carries a `council_id` is a successful submission, not a failure. Do not display "failed", an error banner, or unrecoverable-error wording for it. Display the exact returned id and the recovery action:

```text
AI council submitted and still running in the background.
Retrieve it with `get_council` using {"council_id": "<the exact id returned>", "save_locally": true}.
```

**Not indexed.** When a `technical` or `discovery` request reports that the repository is not indexed, say so and name the workaround — those two modes are codebase-grounded and need an indexed repository, while `general` needs no index:

```text
This repository is not indexed, and {mode} mode needs an indexed repository.
Rerun the same task with `--mode general`.
```

**Failed.** A tool error that carries no `council_id` is a genuine failure. Surface the tool's own actionable message, stop, and do not invent a retrieval handle:

```text
AI council failed: <error message from the tool>
```

## Final Summary

Display a summary block:

```text
## AI Council Report

- **Saved to**: {saved_path}
- **Task**: <task_description>
- **Mode**: <selected mode>
- **Status**: Completed
```

For a backgrounded council, replace the saved-path line with the returned `council_id` and the `get_council` recovery action, and set the status to `Submitted — running in the background`.
