# `/define-tickets` auto-mode procedure

This procedure carries the unattended-only instructions of `/define-tickets`. Only an
`--auto` run reads it. The command reads it once in Stage 0, right after flag parsing,
and then follows one section of it at each `**Only under --auto:**` pointer. Each
section below is headed by the command location it came from, and its text is the
command's original `--auto` instruction, moved here word for word. Sections that mention
"this stage", "item 5", "the attended instructions below", and similar mean that
location in `/define-tickets`.

An attended run never reads this procedure. The command keeps inline everything a run
needs to stop correctly when this file cannot be read: the "Auto mode (--auto)"
section, Stage 0 flag parsing and its load step, and the whole Final Report terminal
contract (the halt-reason list, each halt's fields, and the `create_failed` shape).

**Reread after a break.** A resumed or compacted `--auto` run reads this procedure
again before its next `--auto` step.

## Stage 0 item 5 — Project standards

create a unique local run id (for example the current epoch seconds) and the artifact directory `{docs_dir}/explorations/{slug}-{run_id}/`, then call `get_project_standards` once, before readiness. Treat a 404, an error envelope, a missing response, or an onboarding placeholder as unavailable: warn and continue. Retain the result, or an explicit `standards unavailable` state, for every writer and for the Final Report.

## Stage 0 item 6 — Readiness

immediately after standards, read the readiness procedure at `.bridge/procedures/preflight-and-readiness-procedure.md` in this project, where the Bridge installer scaffolds it. Only if that file does not exist, read `docs/install/preflight-and-readiness-procedure.md` (the location older installs used). Only if that file does not exist either, read `mcp_server/instructions/preflight-and-readiness.md` in this checkout. A file that exists but cannot be read is a failure: never fall back to a later location. If it is unreadable or none of the three exists, halt as `stage_failed` naming Stage 0. Follow its define-tickets path, naming the slug, the run id, and the artifact directory in the invocation. If readiness is `too_vague_to_ticket`, halt before Stage 1 as `too_vague`. Record the scope axis only; it does not decide the eventual ticket shape.

At this procedure-read failure, follow Procedure read failure for `.bridge/procedures/preflight-and-readiness-procedure.md` (`repair-assets`).

## Stage 2 — Duplicate scan

after this stage, run the duplicate scan. Read `.bridge/procedures/duplicate-and-context-scan-procedure.md` in this project first. Only if that file does not exist, read `docs/install/duplicate-and-context-scan-procedure.md`; only if that file does not exist either, read `mcp_server/instructions/duplicate-and-context-scan.md` in this checkout. A file that exists but cannot be read is a failure: never fall back to a later location. If it is unreadable or none of the three exists, halt as `stage_failed` naming Stage 2. Follow its define-tickets path, naming the slug, the run id, the resolved `allow_duplicate` literal, and the artifact directory in the invocation. Halt as `duplicate` on a known duplicate unless `allow_duplicate` is `"true"`. Halt an `unable_to_check` result as `stage_failed` naming the duplicate scan; `--allow-duplicate` never overrides it. This is the one halting check in this stage.

At this procedure-read failure, follow Procedure read failure for `.bridge/procedures/duplicate-and-context-scan-procedure.md` (`repair-assets`).

## Stage 3 — Open requirements halt

at the end of this stage, halt as `open_requirements` if any acceptance criterion or NFR is still `open`, and list those items. Rely on the Stage 1 evidence and the conservative `confirmed` / `assumed` rubric in step 4. Do not add a minimum-evidence halt. Do not run a separate screening procedure.

## Stage 4 — Proposed, unratified labels

label every acceptance criterion and every NFR `proposed, unratified` in the document, and use `Requirements proposed, unratified (--auto)` as the Status line instead of the attended status. No one has ratified them.

## Stage 4 — Comp analysis

after the document is written, and before Stage 8, run the comp analysis. Read `.bridge/procedures/comp-analysis-procedure.md` in this project first. Only if that file does not exist, read `docs/install/comp-analysis-procedure.md`; only if that file does not exist either, read `mcp_server/instructions/comp-analysis.md` in this checkout. A file that exists but cannot be read is a failure: never fall back to a later location. If it is unreadable or none of the three exists, halt as `stage_failed` naming Stage 4. Follow its define-tickets path, naming the artifact directory in the invocation; it writes `comp-analysis.json` there. Continue on a degraded analysis, which records `applicable: false`, a reason, and warnings; carry those warnings and the material needing manual review to the Final Report.

At this procedure-read failure, follow Procedure read failure for `.bridge/procedures/comp-analysis-procedure.md` (`repair-assets`).

## Stage 5 — Skip the page

skip this stage entirely. Do not call `generate_decision_page`, and go to Stage 6. The attended instructions below are unchanged.

## Stage 6 — No page and no operator

there is no page and no operator. Skip items 1 through 4, the page-commit loop, the implications confirmation prompt, and the drafting plan display. Produce the item 5 implications review from the proposed set and write it under `## Implications`. Compute the recommended drafting plan with the item 5 rules and record it in working state without showing it, then state the option taken in the Final Report. Pass no coherence `council_preapproval`, and never record `declined_by_operator`. Never record an attended acceptance or bypass override either. Map `--auto` to the literal `auto_approve = true` path in item 5. In item 6, keep the criteria `proposed, unratified`, set the Status line to `Requirements proposed, unratified (--auto)`, and never set "Requirements ratified". The attended instructions below are unchanged.

## Stage 7 item 2 — Run the recorded plan

execute the deterministic plan recorded by Stage 6, with no question. For `before`, first state the council cost and the approximately 15-minute poll, then call `request_council`. For `after`, state nothing here: Stage 8 runs it and states its cost before the paid call. For `none`, run no council. The task description names the criteria as proposed, unratified.

## Stage 8 item 4 — Unmeetable criterion

halt before any writer or `create_ticket` call as `open_requirements`, listing the criterion in `open_items` and explaining the review-derived cause in prose. The halt-reason list does not change.

## Stage 8 item 6 — Design pushback is output-only

the invitation for design pushback in item 6 is output-only. Do not wait for a reply.

## Stage 9 item 1 — Readiness follow-ups

do not pause or halt on these recommendations. Write each one as a `Readiness follow-ups` line in the Final Report. They are not `open` requirements, which halt earlier. Auto-mode readiness and every later reference to the criteria use the **proposed, unratified** set, never a settled or ratified one.

## Stage 9 item 2 — Child cap and open requirements

immediately after the split freezes, and before writing `epic-manifest.json`, count the implementable epic children or siblings. If the count is above the resolved `--max-children` cap, halt as `max_children` with both counts and a "split first" message. Never truncate the split. Apply the same cap again if an unattended coherence amendment re-freezes a changed split, before writing its replacement manifest or going further toward creation. Just before any writer or ticket-creation call, re-check for `open` acceptance criteria or NFRs and halt as `open_requirements` if any remain.

## Stage 9 item 3 — No upload gate

there is no upload gate. Clearance of every auto gate and draft completeness replace the affirmative, for siblings and an epic alike, and the upload prompt is never shown.

## Stage 9 item 3 — Writer contradictions

absorb a factual citation or line-number correction and continue; halt an unmeetable ratified obligation as `open_requirements`, but only when a draft exists and its report is a valid non-empty block; keep `stage_failed` for a writer that cannot produce its draft (it stops without a draft), and carry that writer's questions in the failure reason. This adds no halt reason and no pause.

## Stage 9 item 3 — Writer inputs

pass into **each** `jira-ticket-writer` invocation, whether epic parent, child, or sibling, the applicable `comp-analysis.json` path when it records `applicable: true`, the project-standards result or a `standards unavailable` note, and an instruction to label its criteria `proposed, unratified`. Keep the entry's criteria and manifest obligations verbatim. A degraded comp is never described as reviewed, and tickets are never described as standards-checked when standards were unavailable. A writer failure or any other critical failure before the first `create_ticket` call is a `stage_failed` halt.

## Stage 9 item 3 — Draft check failure

an unresolved failure takes the existing `stage_failed` writer-failure path, naming Stage 9 and the draft, before any Jira creation.

## Stage 9 item 3 — Writer report failure

unresolved failure halts as `stage_failed` before any Jira creation, naming Stage 9 and the affected entry. A report that is still invalid after its one revision follows this same writer-failure path.

## Stage 9 item 3 — Open writer questions

first answer each question the sources already settle. The sources are the frozen requirements and any contract they cite, the entry's research packet, and code evidence. A question is settled only when a source states the answer or rules out every other option. Never pick between options the sources leave open, and never answer by removing or weakening a ratified requirement. Re-invoke only the affected writer as a revision with the answer and its existing inputs, at most once per entry, and list each answer with its source in the Final Report. If any question remains, including one the writer returns again, halt as `open_requirements` before any `create_ticket` call. Put every remaining question in `open_items`, qualified by its entry (for example `child-2: {question}`). The halt-reason list does not change.

## Stage 9 item 3 — Changed epic split

halt as `epic_coherence`.

## Stage 9 item 3 — Tracking and creation failures

a `track_ticket` error warns and never halts: keep each confirmed key, name every untracked key in the report for reconciliation, and neither retry creation nor delete a ticket. A failed `create_ticket` attempt, even one with no key confirmed, is a `create_failed` halt. So is a failed post-create write of `epic-plan.dag.json` or `epic-plan.meta.json`. Report `created_keys` in creation order, which may be empty, and a precise `failed_entry`: the parent title, a child's manifest position and title, the failed sibling, or the failed filename. Tell a later run to reconcile those keys and that entry rather than replay creation.

## Return

This procedure returns nothing on its own. After each section, go back to the
`/define-tickets` pointer that sent you here and continue from that point. A halt
keeps the command's halt reason and terminal contract, written in its Final Report;
this procedure adds no halt reason and no terminal field.
