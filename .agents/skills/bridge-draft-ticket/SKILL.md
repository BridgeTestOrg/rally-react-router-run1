---
name: bridge-draft-ticket
description: Run Bridge's draft-ticket workflow when explicitly invoked as $bridge-draft-ticket.
---

# Bridge workflow: draft-ticket

Draft a local Markdown Jira ticket via the Jira Ticket Writer — no Jira issue is created or updated.

This skill is explicitly invoked as `$bridge-draft-ticket <input>`.
Treat the text after `$bridge-draft-ticket` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

`$ARGUMENTS` is the complete description of what the ticket should cover. This command delegates drafting exclusively to the `jira-ticket-writer` agent and produces only a verified local Markdown file — it never creates, updates, or attaches to a Jira issue. To upload a drafted ticket to Jira, use an approved creation workflow separately.

If any step fails, stop immediately and report which step failed and why, preserving the original description.

## Step 1 — Validate the Description

Treat the complete, original `$ARGUMENTS` value as the description, verbatim — do not derive a title or select a subset of it.

If `$ARGUMENTS` is empty or whitespace-only, stop immediately and report:
```
Usage: $bridge-draft-ticket <description of the problem, feature, or improvement>
```
Do not attempt to synthesize ticket content from an empty description.

## Step 2 — Resolve the Output Directory

Read the `BAPI_DOCS_DIR` environment variable. If it is not set, default to `docs/tmp`. Store this value as `docs_dir`. The required output directory is `{docs_dir}/tickets/`.

## Step 3 — Delegate to the Jira Ticket Writer

Invoke the `jira-ticket-writer` agent through the Task tool (or a host equivalent you have confirmed can resolve it). This delegation is the only drafting operation this command performs — do not compose a ticket title, summary, requirements, acceptance criteria, or any other ticket body content here, and do not name or invoke a Jira mutation tool (`create_ticket`, `update_ticket_description`, or similar) anywhere in this command.

Pass the subagent exactly:
- The original description, verbatim (from Step 1).
- The requirement to create the Markdown draft under `{docs_dir}/tickets/`.
- The requirement to return the exact final file path of the draft it wrote, followed by the writer's terminal `open-questions` report. The report contract is:

  > Exactly one fenced code block with info string `open-questions` must end the writer's reply, with no trailing prose. Its content is either the literal `none` alone or one entry per unsettled choice in the form `- question: … / why it blocks: … / options: …`, with all three fields non-empty. Empty, duplicate, mixed, incomplete, or non-terminal blocks are malformed. Missing or malformed blocks require writer revision and never mean "settled." The block is reply-only and never belongs in the ticket body.

Do not copy the writer agent's sizing, research, epic-threshold, approval-gate, or ticket-composition rules into this prompt — those policies belong to the agent, not this command.

**If the writer agent is unavailable in the current host** (for example, no Task-equivalent capability can resolve `jira-ticket-writer` — this is expected in Cursor, which has no `.cursor/agents/` mirror for this agent), this is an unsupported-environment failure. Stop and report:
```
$bridge-draft-ticket requires an agent-enabled host that can invoke the jira-ticket-writer agent. This
environment cannot resolve it. Switch to a supported agent-enabled environment (e.g. Claude Code),
or ask the repository tooling owner for guidance.
```
Preserve the original description in this failure report. Do not attempt to draft inline as a substitute.

## Step 4 — Verify the Output

1. **Capture exactly one path** from the agent's response. The path is the first line of the reply. Only when its standard lookup failed or a configured instruction conflicted does a reply carry a standard warning: a fenced code block with info string `ticket-standard`, holding `Ticket standard: …` and `Standard conflicts: …`, just before the terminal `open-questions` block. Find it by its info string, never by line position. Its lines are not paths, and they do not count toward the single-path rule. Retain that pair separately from the path, exactly as the writer returned it. If the response names no path, or more than one plausible output path, this is an output-verification failure — not an agent-invocation failure. Stop and report:
   ```
   The Jira Ticket Writer did not return a single verifiable draft path. No substitute was drafted
   inline. Original description preserved below.
   ```
2. **Confirm the returned path** identifies a Markdown file under the resolved `{docs_dir}/tickets/` directory, and that the exact file exists on disk.
3. **If the agent claimed success but the file does not exist**, treat this as false success — an output-verification failure, distinct from an agent-invocation failure. Stop and report the same output-verification message as above. Do not generate replacement content.
4. **Validate the writer's report** independently of the path, directory, extension, and file-existence checks above. The reply must end with exactly one valid terminal `open-questions` block. If it is missing or malformed, re-invoke the writer once as a revision, using the original description and the resolved output location. If the block is still missing or malformed, this is an output-verification failure: report the same message beginning "The Jira Ticket Writer did not return a single verifiable draft path", and say in the details that the report contract was not met.
5. **A valid non-empty block is reportable, not fatal.** This command only creates a local file, so unresolved questions are shown in the Final Report. They do not stop the command. Do not continue into an upload.
6. **Scan the verified draft for open-decision phrases (warning only).** Scan the final local draft, not the writer's reply. The canonical list, from `docs/bridge-ticket-authoring.md`:

   <!-- BEGIN OPEN-DECISION PHRASES -->
   - must settle
   - settle this before
   - before planning
   - the caller must
   - owner confirms
   - owner must confirm
   - confirm with the owner
   - stop if not met
   - check the precondition first
   - TBD
   - to be decided
   <!-- END OPEN-DECISION PHRASES -->

   Matching semantics (warning only):
   - Match case-insensitively, as whole phrases with word boundaries.
   - Before scanning, drop fenced code blocks and `{noformat}` regions.
   - Report one warning per matching line, not one per phrase. Quote from the start of the sentence that holds the line's first match through the end of the line.
   - A phrase match is an advisory signal for a person to review. It never halts drafting, never hides an upload gate, and never refuses a launch.
   - Keep the full list out of routine reports. Report only the matching lines.

   A phrase match is not an invalid writer report. Keep the two separate.

Never write a standard report the writer did not return, and never put the pair into the draft file. No `ticket-standard` block is normal: add no note. Report a malformed one and continue; it does not fail the draft.

Distinguish the two failure kinds explicitly in whichever report you give: an agent-invocation failure (Step 3) means the writer could not be reached or run at all; an output-verification failure (this step) means the writer ran but its output could not be verified.

## Final Report

**On success**, display:

> **Draft ready**: {verified exact path}
> {only on a warning: **Standard warning**: the writer's `Ticket standard:` line and `Standard conflicts:` line}
>
> **Open questions**: each question with its blocking reason and options, or `none`.
>
> No Jira ticket was created or updated. Review the draft, then use an approved creation workflow
> when you're ready to upload it.

When the phrase scan found matches, add a subordinate **Warnings** section after the open questions, one line per matching line.

Stop after this instruction. Do not offer or initiate automatic continuation into a Jira creation step.

**On failure**, display the agent-invocation or output-verification failure message from Step 3 or Step 4, preserving the original description and stating plainly that no substitute was drafted inline.
