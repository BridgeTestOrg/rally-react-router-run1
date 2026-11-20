---
name: bridge-plan-epic
description: Run Bridge's plan-epic workflow when explicitly invoked as $bridge-plan-epic.
---

# Bridge workflow: plan-epic

The advanced epic planner: decomposes an epic into sub-tasks with structured exploration documents, needs `emit-epic-implementer-bundle finalize` before launch, and never creates or approves a run.

This skill is explicitly invoked as `$bridge-plan-epic <input>`.
Treat the text after `$bridge-plan-epic` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

This command is recipe-driven. Do not call MCP tools directly -- the recipe determines which tools to call and with what parameters.

## Stage 0 — Setup

1. **Parse arguments**: Extract the input from `$ARGUMENTS`. Trim any surrounding whitespace. If the input is empty or whitespace-only, stop immediately and display:
   ```
   Usage: $bridge-plan-epic <description of the epic or Jira key>
   ```

2. **Jira key detection**: If the input matches a ticket key pattern (`[A-Z][A-Z0-9_]{0,19}-\d+`, e.g. `MY_PROJ-248` or `A-1`; the whole input must match), call the `get_ticket` MCP tool with that key to fetch the epic description. Use the ticket's description as the `epic_description`, and set `epic_key` to that Jira key. If the input does not match a Jira key, use the free-form text directly as the `epic_description` and set `epic_key` to an empty string `""` (there is no Jira epic to update). The recipe uses `epic_key` to decide whether to post the goals/NFRs + recommended implementation order as a comment on the epic.

3. **Generate slug**: Create a kebab-case slug from the epic description — take the first 6-8 meaningful words, strip non-alphanumeric characters (except hyphens), lowercase, and truncate to 60 characters. This becomes the `epic_slug`.

4. **Directory existence check**: Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Then run a terminal command to check if the directory `{docs_dir}/epic-plans/{epic_slug}` already exists:
   ```
   test -d {docs_dir}/epic-plans/{epic_slug} && echo "exists" || echo "not_found"
   ```
   If the directory exists, append `-{unix_timestamp}` to the `epic_slug` (e.g., `add-auth-provider-support-1710000000`).

## Stage 1 — Execution

5. Call the `get_pipeline_recipe` MCP tool with:
   - `pipeline`: `"plan-epic"`
   - `variables`: `{ "epic_description": "<resolved_description>", "epic_slug": "<slug>", "epic_key": "<jira_key_or_empty_string>" }`

   Note: Do NOT pass `docs_dir` in variables — it is auto-injected by the pipeline system.

   If the tool returns an error, stop and report the failure.

6. Read and strictly obey the `agent_instructions` field in the response. Execute each step in order, announcing each as **Step N of M: <description>**.

7. After all steps complete, display a summary. Stage 1 means **Plan saved**;
   planning establishes neither launch readiness nor run approval, including
   executor, policy, VCS, and indexing readiness. Even an input containing an
   epic key does not finalize child keys or artifacts. Do not run a readiness
   preview at this stage. Free-form/no-key completion is not applicable for a
   readiness check until a real epic and child tickets exist. Create the child tickets first, then run
   `emit-epic-implementer-bundle finalize` replacing every
   `TBD-N` key. Only a later artifact-eligible completion recommending launch
   uses `$bridge-define-tickets`'s Completion advisory pattern: one bounded read-only
   preview, selected target and returned refusal reason/remedy and
   `availability_text` verbatim, ready at preview time or readiness not confirmed,
   preserving saved work and actual launch confirmation/admission.
   ```
   ## Pipeline Complete

   **Epic**: <first 80 characters of epic_description>...
   **Slug**: <epic_slug>
   **Output**: <docs_dir>/epic-plans/<epic_slug>/overview.md
   **Steps executed**: N of M
   **Status**: Success / Failed at step N
   **Readiness**: Not checked — finalize real child keys and artifacts first.
   **Next step**: `$bridge-plan-epic` stores and approves nothing. Create the child tickets, run `emit-epic-implementer-bundle finalize` to replace every `TBD-N` key, then launch with `$bridge-drive-epic-run <epic_key>` (or `drive-epic <epic_key>`), which asks for confirmation before it creates a run.
   ```
