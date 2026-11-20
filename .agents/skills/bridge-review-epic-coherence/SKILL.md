---
name: bridge-review-epic-coherence
description: Run Bridge's review-epic-coherence workflow when explicitly invoked as $bridge-review-epic-coherence.
---

# Bridge workflow: review-epic-coherence

Check an existing epic's children as a set against the epic's acceptance criteria — a read-only diagnostic report.

This skill is explicitly invoked as `$bridge-review-epic-coherence <input>`.
Treat the text after `$bridge-review-epic-coherence` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

<!-- Platform coverage: this command reaches Cursor + Claude Code. The companion
     `epic-coherence-reviewer` agent (agents/src/epic-coherence-reviewer.md) reaches
     Claude Code + GitHub Copilot. Union: Cursor, Copilot, and Claude Code all get
     this review, either via the agent or the command. -->

# Instructions

`$ARGUMENTS` is one epic key (e.g. `BAPI-837`) and, for now, an explicit `--tickets` list of its child keys. This command builds one normalized input document from the epic and its children, then runs the shared epic-coherence procedure in **report** mode. It writes a local record. It changes no ticket.

A `blocked` or `not_checked` report from this command (shown to you as `Needs your decision` or `Couldn't check`) is **diagnostic — not a clearance**. It gates no drafting surface: `$bridge-define-tickets`, `$bridge-plan-epic`, and `$bridge-idea-to-ticket` each run their own drafting-mode check before creation.

If any step fails, stop immediately and report which step failed and why, preserving the epic key and child keys the user entered.

## Step 1 — Parse and Validate Arguments

1. Split `$ARGUMENTS` on whitespace.
   - The first token matching the Jira key pattern (`[A-Z][A-Z0-9]+-\d+`) that is **not** after `--tickets` is the `epic_key`.
   - If `--tickets` appears, every token after it (up to the end of input) is the child-key list.
2. **Validate before any review work:**
   - Exactly one `epic_key` must resolve. Zero or more than one is a usage error.
   - If `--tickets` is present, it must be followed by at least one key, and every key must match the Jira key pattern. A malformed flag or key is a usage error.
   - Do not accept a backend mode (for example `--local` or `--jira`) as an argument. Treat any other flag as a usage error.
3. On a usage error, stop and report:
   ```
   Usage: $bridge-review-epic-coherence EPIC-KEY [--tickets K1 K2 ...]
   ```
   For `--tickets` with no keys, also say: "`--tickets` requires at least one ticket key."

## Step 2 — Read the Epic and Detect the Backend

1. Call `get_ticket` with the `epic_key`. If it fails, stop and report the error.
2. Decide whether this repository uses the local ticket backend **only from what the tool returned**. A `local://tickets/` URL in the returned metadata identifies local mode, and a returned `ticket_backend` field is also evidence. Never infer the backend from an unmarked error, and never ask the user for it.
3. Extract the epic's acceptance criteria and each one's **verification sentence** from the description. When a criterion has no verification sentence, leave `verification` empty. The reviewer raises an advisory finding for it.

## Step 3 — Require Explicit Child Keys

If `--tickets` was **not** supplied, stop here. Do not start a reviewer. Ask the user to rerun with `--tickets` and say why:

- **Local backend:** "Epics and parent links do not exist in local ticket mode, so an epic's children cannot be listed from the epic key. Rerun with `--tickets K1 K2 ...`."
- **Jira backend:** "No read-only child-enumeration surface is available to this client, so the epic's children cannot be listed from the epic key. Rerun with `--tickets K1 K2 ...`."

Never work around this. Do not use the billable epic estimation tool to list children. Do not use ticket labels or a label-filtered ticket search: both are Jira-only.

## Step 4 — Build the Input Document

1. Call `get_ticket` for **each** child key.
2. For each child, build one manifest entry with `id` (the ticket key), `title`, `scope` (a short statement of what the child does, from its description), `size_band` (when the ticket states one, else empty), `depends_on`, and `recommended_after` (from the ticket when stated, else empty lists). Add `touched_files` only when the ticket names repository-relative file paths explicitly.
3. Build a separate `child_evidence` array. For each child, add its `acceptance_criteria` and its `body`.
4. If a child cannot be read, keep it in the manifest and record the inaccessible material as an explicit `input` gap. Never drop it silently.
5. **Omit `owns_verifications` entirely**, so the reviewer derives ownership from the children's own acceptance criteria.
6. Write `epic-coherence-input.json` with `epic` (`key`, `title`, `acceptance_criteria`), `design_text` (the epic description), `manifest`, and `child_evidence`.

## Step 5 — Resolve Paths

1. Call the `ping` tool and read `docs_dir` from its first (JSON) content item.
2. Use the epic key **lowercased** as the slug.
3. Confine both the input document and the records to `<docs_dir>/epic-plans/<slug>/`. Create the directory if needed. Never write outside it.

## Step 6 — Run the Shared Procedure in Report Mode

Read the shared procedure at `.bridge/procedures/review-epic-coherence-procedure.md` in this project. The Bridge installer scaffolds it there. Only if that file does not exist, read `docs/install/review-epic-coherence-procedure.md`; only if that file does not exist either, read `mcp_server/instructions/review-epic-coherence.md` in this checkout. A file that exists but cannot be read is a failure: never fall back to a later location. If it is unreadable or none of the three exists, stop and report that the shared procedure is not usable. Give the fill-only terminal repair guidance below. Do not improvise a substitute review.

At this procedure-read failure, retain the source-checkout fallback and the stage's existing refusal or optional warning/skip behavior. Name the exact `.bridge/procedures/review-epic-coherence-procedure.md` procedure and affected stage/keys. On Linux, from the established project root, run `npx -y @bridge_gpt/mcp-server@0.2.77 repair-assets --project-root <established-root> --host <claude|cursor|codex|copilot>` in a terminal (quote the root for the shell). On macOS and Windows, in-place repair is unsupported: re-run start-tickets for worktrees or the existing Bridge --init/install workflow for project scaffolds. Repair fills missing packaged files only; resolve permission/non-file/unsafe-link problems separately. Refresh/reconnect, reread that same procedure, and resume only if the original stage allows it. Do not repair customer instruction overrides.

Follow it with:
- **input document path:** the file from Step 4;
- **output directory:** `<docs_dir>/epic-plans/<slug>/`;
- **mode:** `report`;
- **unattended:** true only when `auto_approve_external == "true"`; otherwise false.

The procedure runs the `epic-coherence-reviewer` once, applies its escalation rule (stating cost and asking before any council), and writes `epic-coherence.json` and `epic-coherence.md`.

## Step 7 — Report

Reply with:

1. The **gap-check result**, in the plain words from "What the user sees" in the shared procedure: `No gaps found`, `Needs your decision`, or `Couldn't check`.
   Present both counts: gaps in how the work is split, and notes. Explain that the result is based on the gaps in how the work is split only. Describe each ticket-local item as `a note that would be added to ticket N`, and say the check changed no ticket.
2. Whether the run was **independent**, prominently. If it was not (`independent: false`), say first that this check ran in my own session, not by a separate reviewer, so it's less independent, and offer an attended fresh-context rerun.
3. **Who covers each requirement** — the coverage bullets, one per epic acceptance criterion.
4. The **next action**.
5. The paths of `epic-coherence.json` and `epic-coherence.md`.

State plainly that a `Needs your decision` or `Couldn't check` result is **diagnostic — not a clearance**, and that this gap check gates no drafting surface — each drafting surface runs its own drafting-mode check before creation.

## Step 8 — Offer a Comment (Jira Only)

Only when the tool evidence from Step 2 **positively identifies Jira**, offer to post the coverage map as a comment on the epic with `add_comment`. Call it only after an explicit yes. Never post automatically. On the local backend, do not offer a comment at all.

## Final Report

On success, display the Step 7 reply. On failure, display the message from the step that failed, preserving the epic key and child keys the user entered.
