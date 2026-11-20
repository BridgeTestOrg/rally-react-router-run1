Perceive any attached/referenced design comp with your OWN vision and map it to the existing codebase BEFORE the `jira-ticket-writer` drafts. This is the pre-writer perception step: the orchestrating recipe agent (already a frontier vision model) opens the comp, classifies it against the shared fidelity taxonomy, researches the code, and writes a structured comp→codebase map the writer consumes. The writer stays text-only and never opens images — it only reads the map you produce here.

This step is gated and backend-safe. It runs the perception with the ORCHESTRATING agent's own vision — a local image via the Read tool, or an already-attached Jira comp fetched as raw bytes via the BAPI-562 binary-safe `attachment` download (operation `download`) into a worktree `file_path`. It does NOT call `describe_image()`, does NOT depend on `src/python/llms/vision.py`, and does NOT require the `CHEAP_MODEL` vision path or any vision-model upgrade or procurement. The heavy visual reasoning is done for free by the agent that already runs the recipe.

## Inputs

- Run manifest: `{docs_dir}/idea-to-ticket/{slug}-{run_id}/run-manifest.json` (source of truth for `idea`, `scope`, `readiness`). Read whichever prior artifacts exist under `{docs_dir}/idea-to-ticket/{slug}-{run_id}/` (research pack, resolved uncertainties, goals-and-nfrs, standards checklist) and proceed without the ones that do not.
- Output artifact (this step writes it): `{docs_dir}/idea-to-ticket/{slug}-{run_id}/comp-analysis.json` — the structured comp→codebase map the drafting step reads.

## Callers

The steps below are the **recipe path** and are unchanged for the `idea-to-ticket` recipe.

**Define-tickets path.** When `/define-tickets --auto` runs this procedure, the command names an exploration-adjacent artifact directory. Read the exploration document and any materials the task references instead of run-manifest artifacts, and write `comp-analysis.json` in that named directory. Assume no run manifest and no label. Apply the same gate, classification, and mapping rules. If the analysis is degraded for any reason, write `applicable: false`, a degradation `reason`, and `warnings` that identify the material needing manual review. When no qualifying comp exists, write the clean not-applicable artifact with no degradation warning. Degraded analysis never blocks the command.

## Instructions

1. **Gate first — evaluate only text/material metadata, never open an image yet.** Proceed to any image work ONLY when BOTH conditions hold:
   - a design comp is **referenced or attached** (a local image path in the idea/materials, or an already-attached Jira comp with an `attachment_id`), AND
   - the requested work is **design/UI work** (a frontend/fullstack change with a visual surface).

   This gate is deliberately conservative. A **backend-only** request, a **no-comp** request, or a **non-design** request fails the gate.

2. **Not-applicable branch (gate fails) — short-circuit immediately.** When either gate condition is not met, write `comp-analysis.json` with `applicable: false`, a short `reason`, and the `gate` evidence fields, then **return immediately** — do NOT open any image, do NOT download any attachment, do NOT inject any fidelity/comp/visual language, and add no measurable latency. A backend-only or no-comp authoring input must be byte-for-byte unaffected downstream. Concretely, the not-applicable artifact is:

   ```json
   { "applicable": false, "reason": "backend-only work; no design comp referenced", "gate": { "comp_referenced": false, "design_ui_work": false }, "warnings": [] }
   ```

3. **Applicable branch — obtain and OPEN the comp with your own vision.** When the gate passes:
   - **Local image path** → open it directly with the Read tool.
   - **Already-attached Jira comp** → fetch it as raw bytes using the BAPI-562 binary-safe `attachment` capability with operation `download`, passing the comp's `attachment_id` and a worktree `file_path`; the download saves the PNG/JPEG bytes to that `file_path` inside the project root, then open the saved file with the Read tool.
   - You are the orchestrating vision model — reason over the actual pixels yourself. Do NOT call `describe_image()`, do NOT use `src/python/llms/vision.py` / `CHEAP_MODEL`, and do NOT delegate perception to the text-only `jira-ticket-writer` subagent.

4. **Degraded paths are skip-clean and warn-not-halt.** If the comp is missing, unreadable, an unsupported format, external-only (an `http(s)` URL you cannot fetch into a worktree `file_path`), or turns out not to be a usable design comp, write a valid `comp-analysis.json` with `applicable: false`, a `reason`, and a populated `warnings` array describing what failed, then return. A missing, unreadable, or non-comp image NEVER blocks downstream drafting and NEVER requires further image work after the failure.

5. **Classify the opened comp using the shared fidelity taxonomy (do not fork it).** Using your own vision, classify the comp as exactly one of these four classes — the same labels the downstream final plan reviewer uses (`src/python/llms/agents/planner_agent/final_plan_review_agent.py`, `_get_runtime_verification_instructions`), so authoring, planning, and implementation all agree:
   - `full comp`
   - `wireframe`
   - `annotated-screenshot-of-existing-UI`
   - `unknown`

   Record `fidelity_classification` with a `class` (one of the four), a `confidence` value, and a short `reasoning` string.

6. **Apply class-appropriate mapping depth — no over-specification.** Match the per-class rules exactly:
   - **full comp** (confident) → map exact existing components, Jinja2 templates, SCSS/CSS tokens, and routes; strict/exact component + token depth is used ONLY here.
   - **wireframe** → map layout and structure only (regions, order, rough proportions, responsive behavior); defer color, type, spacing, and component polish to the repo design system, NOT to the wireframe.
   - **annotated-screenshot-of-existing-UI** → map ONLY the delta against the current UI; preserve everything outside the annotated region and do not reproduce the screenshot wholesale.
   - **unknown / low confidence** → fall back to the design-system floor rather than mapping pixels.

   **Hard rule:** strict/exact mapping depth is enabled ONLY for a confidently-classified full comp. Fail toward the design system, never toward reproducing an ambiguous image.

7. **Research the codebase and map each region/element to concrete existing code.** Inspect the working tree (search, grep, file reads) for the existing UI implementation surfaces: reusable components, Jinja2 templates, plain CSS/SCSS tokens and design-system styles, routes, and reusable frontend patterns. Only cite files you actually inspected — do not invent file paths, component names, tokens, or routes. For each region/element of the comp, produce a `mappings[]` entry containing:
   - `region` — the comp region or element name.
   - `visual_description` — a short description of what it looks like.
   - `components` — mapped existing component file(s).
   - `templates` — mapped existing Jinja2 template(s).
   - `tokens` — style/token references (SCSS/CSS tokens or design-system styles).
   - `routes` — route reference(s) where the element lives or should wire.
   - `confidence` — confidence for this mapping.
   - `implementation_guidance` — concrete guidance (e.g. "reuse component X", "extend template Y", "use token Z", "wire route R").

8. **Write the structured map to a stable schema.** Write `comp-analysis.json` at `{docs_dir}/idea-to-ticket/{slug}-{run_id}/comp-analysis.json` with these fields:
   - `applicable` — boolean; `true` only after a comp was both detected AND successfully opened.
   - `reason` — short string explaining the applicability decision.
   - `gate` — the two-condition gate evidence (`comp_referenced`, `design_ui_work`).
   - `comp` — provenance of the opened comp (source kind, path or `attachment_id`, filename, MIME type when known).
   - `fidelity_classification` — `{ class, confidence, reasoning }`, present only when `applicable` is true.
   - `mappings` — array of the per-region entries defined in step 7 (present only when `applicable` is true).
   - `design_system_floor` — the design-system fallback guidance to use for wireframe/unknown/low-confidence regions.
   - `warnings` — array of degraded-path notes (may be empty).
   - `writer_guidance` — instructions for the downstream drafting step: when `applicable` is `true`, Requirements must cite the mapped components/templates/tokens/routes as concrete implementation guidance; when `applicable` is `false` or the map is missing, the writer must ignore this artifact and mention no comp analysis, design comp, or visual-fidelity language unless the original request independently requires it.

9. **Never over-write.** Write the artifact exactly once at the path above. Downstream steps (`draft-and-critique.md`) read it; do not move it.

## Return

Confirm the path written (`{docs_dir}/idea-to-ticket/{slug}-{run_id}/comp-analysis.json`), whether the analysis was `applicable`, the fidelity `class` when applicable, and any `warnings`.
