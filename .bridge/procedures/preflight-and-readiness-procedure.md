Initialize the idea-to-ticket run directory and classify the idea's readiness and scope.

## Inputs

- Idea: `{idea}`
- Slug: `{slug}`
- Run ID: `{run_id}`
- Docs directory: `{docs_dir}`
- Project standards: response from the immediately preceding `get_project_standards` step. If that step returned an error envelope or a 404, treat the project standards as unavailable and proceed; do not halt.

## Callers

Two callers use this procedure. Everything below is the **recipe path** and applies unchanged when the `idea-to-ticket` recipe runs it.

**Define-tickets path.** When `/define-tickets --auto` runs this procedure, the command names the artifact directory and a unique local run id in its invocation. Use that directory in place of the recipe run directory, and write the readiness artifact there. Do not write `run-manifest.json`, do not compute or look up any label, and do not query Jira. Classify readiness and scope exactly as below and report both axes to the command. Scope is recorded only; it does not choose the eventual ticket shape. A `too_vague_to_ticket` result is reported to the command, which halts before it explores the codebase.

## Instructions

1. Create the run directory:
   ```
   mkdir -p {docs_dir}/idea-to-ticket/{slug}-{run_id}
   ```
   Every artifact produced by this pipeline run lives under this run directory. No Jira mutation may occur in any later step until `run-manifest.json` has been written to this directory.

2. Classify the idea on two independent axes:

   **Readiness** (one of):
   - `ready_to_draft` — the idea is concrete enough that a clear ticket draft can be produced.
   - `needs_clarification` — the idea is reasonable but missing key answers; clarifying questions must be raised in `open-questions.md` later.
   - `research_first` — drafting is blocked on external/codebase research; deep or narrow research must come first.
   - `too_vague_to_ticket` — the idea is not actionable yet; do not produce a ticket.

   **Scope** (one of):
   - `task` — a single Jira Task (default when ambiguous).
   - `spike` — a single Jira Spike. Resolve `spike` only on the objective
     condition that the idea has **no committed production-code deliverable** —
     the same trigger as exception E2 in `docs/bridge-ticket-authoring.md`. This
     is a deliverable that is absent, not a judgement about whether the work
     feels investigative. **Any uncertainty resolves to `task`.** This decision
     is made HERE and only here: the `scope` you write into the manifest is what
     selects the spike ticket format downstream, and `jira-ticket-writer` is
     explicitly forbidden from deciding it for itself.
   - `epic_candidate` — the idea decomposes into a Jira Epic plus multiple child tickets.

3. Halt locally if readiness is `too_vague_to_ticket`. Write the manifest anyway (see step 4) so the local artifacts record the halt; then stop without continuing the rest of the pipeline. Do not attempt any Jira mutation.

4. Write `run-manifest.json` to `{docs_dir}/idea-to-ticket/{slug}-{run_id}/run-manifest.json`. Required fields:
   - `idea` — the original `{idea}` text.
   - `idea_hash` — `{idea_hash}`; informational run identity only, never a ticket label or search filter.
   - `slug` — `{slug}`.
   - `run_id` — `{run_id}`.
   - `run_dir` — `{docs_dir}/idea-to-ticket/{slug}-{run_id}/`.
   - `readiness` — one of the four readiness values above.
   - `scope` — one of the three scope values above.
   - `project_standards_available` — `true` if `get_project_standards` returned a usable result, `false` otherwise.
   - `created_at` — ISO 8601 timestamp.

5. The manifest is the resumability artifact for the whole run. Do not include secrets or raw credentials. Keep the file under a few KB.

## Return

Confirm the run directory and `run-manifest.json` were created, and report the classified `readiness` and `scope`. If readiness is `too_vague_to_ticket`, also report that the pipeline must stop without Jira mutation.
