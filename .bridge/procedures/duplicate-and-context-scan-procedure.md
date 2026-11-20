Detect existing tickets that duplicate or relate to this idea before any ticket mutation.

## Inputs

- Run manifest: `{docs_dir}/idea-to-ticket/{slug}-{run_id}/run-manifest.json`.
- Research pack: `{docs_dir}/idea-to-ticket/{slug}-{run_id}/research-pack.md` (if produced).
- Pipeline variable `allow_duplicate` controls override behavior (for this run, `allow_duplicate` = `{allow_duplicate}`). Treat the literal string `"true"` as override; any other value (including `"false"`, missing, or empty) is non-override.

## Callers

Two callers use this procedure. The **recipe path** is everything under Instructions below and uses label-free searches. The **define-tickets path** is the separate branch at the end of that section; it is used only by `/define-tickets --auto`, and both paths omit labels.

## Instructions

> **Orchestrator-directed step.** This agent task is part of the full-automation chain and is authorized to call `get_tickets` as directed below — performing an orchestrator-directed tool call is not "re-orchestrating".

1. Build at least two ticket searches from the manifest using the `query` parameter:
   - **Title/keyword query**: use the most salient nouns from `idea` and `slug` as title/text keywords. Prefer 2-4 concrete terms over long natural-language sentences. Run via `get_tickets`.
   - **Candidate-title query**: run `get_tickets` with a concise candidate ticket title. Compare returned scope with the idea rather than treating a text match as proof.
   - Never pass `labels`. Cross-run duplicate detection is a title/text assessment in both Jira and local mode, not a stable idea-hash guarantee. Same-run creation recovery uses confirmed real keys in `upload-state.json`; never use a search result to reconcile an uncertain create automatically.

2. For each returned ticket, capture: ticket key, summary, status, and a short reason it matched (which query, which keyword).

3. Classify the overall verdict as one of:
   - `duplicate` — at least one returned ticket clearly describes the same work as `idea`.
   - `related` — returned tickets are adjacent or partial overlaps but not the same work.
   - `none_found` — no meaningful matches.
   - `unable_to_check` — the ticket search itself failed (network error, auth error, JQL rejection). Record the failure and pick this verdict.

4. Write `{docs_dir}/idea-to-ticket/{slug}-{run_id}/duplicate-assessment.json` with at minimum:
   - `verdict` — one of the four values above.
   - `matches` — array of `{ticket_key, summary, status, reason}` objects (may be empty).
   - `queries_used` — array of the actual JQL/search strings sent.
   - `allow_duplicate` — the resolved value of `{allow_duplicate}` for this run.

5. Halt behavior:
   - If `verdict` is `duplicate` and `allow_duplicate` is not `"true"`, halt locally. Do not continue the pipeline. Tell the user that the duplicate halt is strict and that re-running with `--allow-duplicate` overrides it.
   - If `verdict` is `duplicate` and `allow_duplicate` is `"true"`, continue the pipeline but keep the duplicate evidence in the assessment file so downstream steps can reference it (e.g., to add a "supersedes" note to the draft).
   - For `related`, `none_found`, and `unable_to_check`, continue without halting.

### Define-tickets path

Used only when `/define-tickets --auto` runs this procedure. The command names the artifact directory, a unique local run id, and the resolved `allow_duplicate` literal in its invocation. There is no run manifest and no label.

1. Run at least two `get_tickets` searches using its `query` parameter: one keyword search built from the salient nouns of the task, and one search on the candidate ticket title. Never pass `labels`; both caller paths use label-free queries.
2. Capture each returned ticket's key, summary, status, and a short reason it matched. Classify the verdict as `duplicate`, `related`, `none_found`, or `unable_to_check`, using the same definitions as above.
3. Write `duplicate-assessment.json` to the named artifact directory with `verdict`, `matches`, `queries_used`, and the resolved `allow_duplicate` value.
4. Halt behavior for this path: a `duplicate` verdict halts the command unless `allow_duplicate` is the literal string `"true"`. That override applies only to a known `duplicate` verdict. An `unable_to_check` verdict is never overridden. The command halts as `stage_failed` and names the duplicate scan. Matches found here were not created by this run.

## Return

Confirm `duplicate-assessment.json` was written, report `verdict`, and report whether the run is halting or continuing.
