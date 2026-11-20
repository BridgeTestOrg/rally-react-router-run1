---
name: bridge-define-tickets
description: Run Bridge's define-tickets workflow when explicitly invoked as $bridge-define-tickets.
---

# Bridge workflow: define-tickets

Explore the codebase for a task, settle its acceptance criteria with the user, then propose a design that meets them.

This skill is explicitly invoked as `$bridge-define-tickets <input>`.
Treat the text after `$bridge-define-tickets` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

`$ARGUMENTS` is a free-form prompt describing a task you want to accomplish and your goals for it. This is **not** a Jira ticket key — it is plain text describing the work.

`$ARGUMENTS` accepts three flags, parsed in Stage 0: `--auto`, `--allow-duplicate`, and `--max-children=N`. Without `--auto`, every attended gate below runs exactly as written, and no flag grants a gate bypass.

Execute all exploration and analysis directly in the main conversation. The user should see exploration progress as it happens.

This command runs strictly outside-in, and the order is the point:

1. **Requirements first.** Establish what the system must do, how it must behave, and what standards it must meet — then get the user to ratify that on an interactive decision page. The page settles **requirements and ticket scope**. It never asks the user to pick a technical implementation.
2. **Then how.** Only once the criteria are ratified do you consider how to meet them, optionally with a council.
3. **Then the design.** You describe the final proposed design yourself, in the exploration doc. There is no second decision page.
4. **Then ticket(s).**

Never invert this. A design proposed against unratified criteria is a guess, and an implementation choice presented before the criteria are settled asks the user to commit to a solution for a problem they have not yet agreed on.

If any critical stage fails, stop immediately and report which stage failed and why.

## Attended path contract

An attended run takes one of two paths, chosen at the end of Stage 1 (see "Choose the path"). Neither path skips a review or weakens ratification.

| Path | Page | Implications | Plan | Upload |
| --- | --- | --- | --- | --- |
| Full | Generate and ratify | One output-only message, no stop | One output-only message, no stop | Explicit stop |
| Short | Generate and ratify | One output-only message, no stop | One output-only message, no stop | Explicit stop |

Under `define_tickets_plan_stop: ask` (Stage 6 item 5), implications and plan are one combined stop on either path.

Both attended paths keep the HTML requirements page with its ticket-count card, checkable acceptance criteria, `jira-ticket-writer` drafted bodies, and the explicit upload gate. These attended path rules do not apply under `--auto`: an `--auto` run has no path, no combined presentation, no path switch, and no overlap line. It keeps only the general speed-ups that this file marks as applying to both modes (the Stage 1 stop rule, research packets, and the materials pre-check).

**Stage labels (both modes).** Start each stage's first visible message with a plain line `Stage {N} — {stage name}`, for example `Stage 3 — Frame Acceptance Criteria`. It is a label only, with no clock reading; under `--auto` the terminal JSON block still ends the run.

## Decisions catalogue (attended only)

Record every decision or judgement call you make after ratification, as you make it, in the `## Decisions made for you` section of `{docs_dir}/explorations/{slug}.md`. The owner sees it at the upload gate and can reverse any entry before anything is created. Under `--auto`, write no catalogue: no heading and no entry.

- **Entry format.** One plain `-` bullet: `D-{n}`, the kind, what was decided, the option chosen, the alternatives, a one-line reason, and the affected entries (`parent`, `child-{N}`, `sibling-{N}`, or `all`).
- **When to record.** Record a judgement that affects the tickets, the scope, a review or its cost, or how a ratified requirement is met. Routine navigation and research are not decisions.
- **Kinds.** `plan`, `paid-review` (with its stated credits), `writer-answer`, `scope-change`, `needs-owner`, and the `gap-settlement` entries the epic hand-off procedure writes. A writer's wording or boundary contradiction that you resolve is a `writer-answer`.
- **Write first.** Append the entry and confirm it was saved before launching the review or writer it governs. If the write fails, start nothing it governs and report the document-write failure.
- **Append-only.** Never rewrite, reorder, or drop an entry. A resolution, replacement, or reversal is a new entry naming the one it changes (for example `resolves D-2`); derive each entry's status (open, resolved, or superseded) from those references. Only an unresolved `needs-owner` entry blocks creation.
- **Resume.** After compaction or a resume, continue from the next saved `D-{n}`; never restart the count.

## Procedures

**Procedure lookup rule.** Each procedure read lists its locations in order. Read a later one only if every earlier file does not exist. A file that exists but cannot be read is a failure: never fall back to a later location. This command's own `define-tickets-*` procedures and `procedure-read-failure` have two locations: `.bridge/procedures/{name}-procedure.md` in this project (scaffolded by the Bridge installer), then `mcp_server/instructions/{name}.md` in this checkout; "else" below means only if the earlier file does not exist.

**Procedure read failure.** When a procedure cannot be read, keep the refusal, halt, or warning written at that read, then follow `procedure-read-failure` (lookup rule) for it. If that cannot be read either, name the failing procedure and the affected stage and keys. On Linux, from the established project root, give `npx -y @bridge_gpt/mcp-server@0.2.77 repair-assets --project-root <established-root> --host <claude|cursor|codex|copilot>` to run in a terminal (quote the root for the shell). On macOS and Windows, in-place repair is unsupported: re-run start-tickets for worktrees or the existing Bridge --init/install workflow for project scaffolds. Repair fills missing packaged files only and never repairs customer instruction overrides. It never grants permission to continue.

## Auto mode (--auto)

`--auto` runs this command unattended. Every instruction marked **Only under --auto:** is skipped in attended mode, and every attended instruction stays as written for attended runs.

- `--auto` authorizes ticket creation **only after every gate clears**. It authorizes council cost only when that cost is stated before the council is requested.
- It sets Stage 6 `auto_approve` to the literal `true`, and binds `auto_approve_external = "true"` for the coherence procedure and its preflight.
- It never records an `accept` or `bypass` override. It never treats proposed requirements as ratified: every criterion and NFR stays `proposed, unratified`.
- Every auto stop, from Stage 0 onward, ends with the terminal contract in the Final Report.

## Stage 0 — Setup

1. **Parse flags and prompt**: Tokenize `$ARGUMENTS` on whitespace. Recognize these flags in any position, with no ordering requirement:
   - `--auto` — unattended mode (see Auto mode above).
   - `--allow-duplicate` — sets `allow_duplicate` to the literal `"true"`; otherwise it is `"false"`.
   - `--max-children=N` — the portfolio cap. `N` must be a positive integer; the default is `10`.

   Build the prompt text only from the non-flag tokens, joined with single spaces. No flag token is ever part of the prompt. `--allow-duplicate` and `--max-children` are accepted but have no effect without `--auto`, and they add no attended prompt.

   Any other token beginning with `--`, and any `--max-children` value that is non-positive or not an integer, is an invalid flag. Under `--auto`, stop with a `stage_failed` halt naming Stage 0 and the token. In attended mode, ask the user what the token meant; never fold it into the prompt.

   If the prompt is empty or whitespace-only, stop immediately and display: `Usage: $bridge-define-tickets <prompt describing your task and goals> [--auto] [--allow-duplicate] [--max-children=N]`

   **Load the auto-mode procedure (`--auto` only).** Right after flag parsing, before project standards and readiness, read `.bridge/procedures/define-tickets-auto-mode-procedure.md`, else `mcp_server/instructions/define-tickets-auto-mode.md` (Procedure lookup rule). If it cannot be read, halt as `stage_failed` naming Stage 0 and follow Procedure read failure (`repair-assets`). Follow it at each `**Only under --auto:**` pointer. A resumed or compacted `--auto` run rereads it before its next `--auto` step. An attended run never reads it.

2. **Resolve docs directory**: Call the `ping` MCP tool (no parameters) and read `docs_dir` from its first (JSON) content item. Store that path as `docs_dir`.

3. **Generate output slug**: Make a kebab-case slug from the first 6-8 meaningful words of the prompt: strip non-alphanumeric characters, lowercase, and truncate to 60 characters. It **must start with a letter** to be a valid Stage 5 `ticket_key` (`/^[A-Za-z][A-Za-z0-9_-]*$/`); otherwise prefix `exploration-`. If `{docs_dir}/explorations/{slug}.md` exists, append a short timestamp suffix (e.g., `-1710000000`) **to the `slug` variable itself**, not just the filename, so Stages 4, 5, and 8 all use the same slug. The output file path is `{docs_dir}/explorations/{slug}.md`.

   **Attended only:** Call `config_field` once with `operation: "get", field_name: "define_tickets_plan_stop"`; resolve `define_tickets_plan_stop` by Stage 6 item 5.

4. **Initialize tracking**: Prepare to track `key_files_examined` (list of files read during exploration), `web_searches` (list of topics searched), and `research_queries` (list of deep research queries). Also prepare `run_path` (`short`, `full`, or `auto`) and `escalated` (`false`) for the path decisions below.

5. **Project standards.** **Only under --auto:** follow "Stage 0 item 5 — Project standards" in the auto-mode procedure.

6. **Readiness.** **Only under --auto:** follow "Stage 0 item 6 — Readiness" in the auto-mode procedure.

If this stage fails, stop immediately and report the error. Do not proceed to Stage 1.

## Stage 1 — Codebase Exploration

This is the core discovery stage. It applies in both modes. Explore until the stop rule at the end of this stage is met, then stop.

**Load the discovery procedure (both modes, once).** Read `.bridge/procedures/define-tickets-discovery-procedure.md`, else `mcp_server/instructions/define-tickets-discovery.md` (Procedure lookup rule). It holds the detail for Stages 1 to 4 and the six Stage 7 signals. If it cannot be read, follow Procedure read failure (`repair-assets`) and stop: attended, report the failure and create nothing; under `--auto`, halt as `stage_failed` naming Stage 1. A resumed or compacted run rereads it before its next use.

1–6. **Explore.** Follow "Stage 1 items 1–6 — Explore" in the discovery procedure, tracking files in `key_files_examined`. Resist designing a solution while you read.

**Stop rule.** Stop exploring once you can name all four of these: the affected behavior, the files to change, the relevant callers and tests, and the risks. Do not keep reading to feel more certain. If a named uncertainty remains, investigate that uncertainty narrowly (the specific file, caller, or test that would settle it) rather than widening the sweep. Record the evidence for the four items with concrete `path:line` citations, because Stage 4 and the writer research packets in Stage 9 are built from it.

7. **Choose the path (attended only).** Under `--auto`, skip this item: there is no path, so set `run_path` to `auto`. In an attended run, choose short or full by "Stage 1 item 7 — Choose the path" in the discovery procedure; uncertainty always resolves to full. Announce the choice in one line with its reason, record it as `run_path` (`short` or `full`), and keep `escalated` as `false`. The owner can say "full path" at any point; see Switch to the full path in Stage 6.

This stage is non-blocking — always proceed to Stage 2 regardless of what you find, since the exploration informs what research is needed.

## Stage 2 — Research Unknowns

Follow "Stage 2 — Research unknowns" in the discovery procedure, tracking research in `research_queries` and `web_searches`.

This stage is non-blocking — failures degrade the quality of analysis but do not stop the command. Log a warning for any failed research and continue.

**Only under --auto:** follow "Stage 2 — Duplicate scan" in the auto-mode procedure.

## Stage 3 — Frame Acceptance Criteria

Establish what "done and correct" means. Everything in this stage is about the system's obligations, not its implementation. Do not name a technical approach here — that is Stage 8's job, and it does not happen until the user has ratified this framing.

1–2. **Frame the goal and derive the acceptance criteria (required).** Follow "Stage 3 items 1–2 — Frame and criteria" in the discovery procedure.

3. **Identify the non-functional requirements — the standards the system must meet (required).** Consider every one of these canonical NFR categories and include the ones that genuinely apply (omit the rest): security/privacy, performance/latency, reliability/failure-modes, observability/auditability, accessibility/UX, data-integrity/migration, compatibility, operability/config, compliance/SOC2, rollout/reversibility. For each NFR you include, write its `requirement` and its `implication` (what it changes about the implementation) — an NFR with no concrete implication is boilerplate; drop it.

4–6. **Classify, frame the open questions, and check for tension (required).** Follow "Stage 3 items 4–6 — Classify, questions, and tensions" in the discovery procedure. Open questions ask what the system must do, never how to build it.

**Attended ticket scope (required).** Before Stage 4, frame a Scope question with stable id `SCOPE-1`: "How many implementation tickets should encompass these requirements?" Recommend a positive integer count based on the full requirements, Stage 1 evidence, and the existing Stage 9 sizing guidance. Describe the approximate responsibility of each proposed ticket without choosing a technical implementation. Count implementation tickets only: an epic parent is additional, and must be disclosed separately when the proposed count is three or more. Every count option must cover all requirements; never offer a reduced-requirements option or manufacture tiny slices just to supply an alternative. Offer 2-4 options: concrete count alternatives where credible, or the recommended count plus "Discuss a different ticket count" when no credible alternative exists. Explain the coverage and sizing consequences of each and recommend exactly one concrete count. This question is mandatory even when all requirements are already settled. Under `--auto`, skip this attended scope framing; the existing design, split, and portfolio-cap rules remain authoritative.

This stage is inline analysis — no tool calls required. This stage is non-blocking — always proceed to Stage 4.

**Only under --auto:** follow "Stage 3 — Open requirements halt" in the auto-mode procedure.

## Stage 4 — Write Requirements Draft

Write what you know so far to disk, so the user has something to read alongside the decision page. The design is deliberately absent — it does not exist yet.

1. Create the `explorations/` directory under `docs_dir` if it does not exist.

2. Write the exploration document to the slug-based path determined in Stage 0 (`{docs_dir}/explorations/{slug}.md`) using the skeleton in "Stage 4 — Document skeleton" in the discovery procedure. Attended, end it with this section, which receives the entries described under Decisions catalogue:

```markdown
## Decisions made for you

None yet.
```

Under `--auto`, omit the `## Decisions made for you` section.

Do not add a design, an implementation plan, or a technical recommendation to this draft. Stage 8 adds those once the criteria are settled. The attended Ticket Scope section must include the ticket-count recommendation from Stage 3.

**Only under --auto:** follow "Stage 4 — Proposed, unratified labels" in the auto-mode procedure.

If the file cannot be written, stop immediately and report the failure.

**Only under --auto:** follow "Stage 4 — Comp analysis" in the auto-mode procedure.

## Stage 5 — Generate Requirements Decision Page

**Only under --auto:** follow "Stage 5 — Skip the page" in the auto-mode procedure.

Turn the Stage 3 framing into an interactive HTML decision page so the user can ratify the requirements by clicking. **This page settles requirements and ticket scope.** It must not contain a single technical implementation option — the user is agreeing on what the system must do and how many tickets should encompass it.

1. **Map the acceptance criteria to `acceptance_criteria`.** Each entry has `id`, `criterion`, `verification`, and `status`. Ids must be unique — a duplicate id is rejected, because the id is the key the page reports the user's stance under. Every criterion renders with an Agreed / Ask about this / Disagree control, so pass all of them, not only the open ones. Pass the NFRs the same way under `nfrs`.

2. **Map each open requirement question from Stage 3 step 5 to an actionable item.** Each entry has:
   - `id`: a short stable id, e.g. `R-1`, `R-2`.
   - `question`: the requirement question.
   - `options`: the 2-4 candidate answers (string array). Do **not** include "None of these" or "Ask about this" — the renderer auto-appends both.
   - `option_consequences`: what each answer would mean for the criteria, **parallel to and the same length as** `options`.
   - `why_it_matters`: the concrete impact line.
   - `recommendation_explanation`: why the recommended answer is best.
   - `recommendation_index`: the 0-based index of the recommended answer (must be within `options`).
   - `codebase_evidence` (optional): the Assessment paragraph plus `file:line` citations, shown collapsed.

   **The open-requirement cards are requirement questions, never implementation choices.** "Must revocation be immediate or is eventual acceptable?" is a valid card. "Should we use a short-TTL cache or pub/sub invalidation?" is not — it is a solution, it belongs to Stage 8, and putting it here defeats the purpose of the page. If you cannot phrase a card without naming a mechanism, it is not a requirement question. Always include the Stage 3 Scope question as an additional actionable item with id `SCOPE-1`, even when there are no open requirement questions. Give it the same `options`, parallel `option_consequences`, `why_it_matters`, `recommendation_explanation`, and valid `recommendation_index` fields as the other cards. Recommend a concrete count, not the discussion option. Never pass an empty `actionable_items` array from this command. Ticket scope is a planning constraint; it does not select a technical mechanism.

3. **Call `generate_decision_page`** with routing fields at the root and all heavy arrays nested under `content`:
   - `artifact_type`: `pre_ticket_planning` (renders the acceptance-criteria and goals panel above any cards).
   - `ticket_key`: the Stage 0 `slug` (a non-Jira slug is fine — it must start with a letter and contain only letters, digits, hyphens, or underscores).
   - `output_subdir`: `explorations` (so the page lands beside the markdown doc).
   - `output_filename`: `{slug}-requirements.html`.
   - `labels`: requirements-flavored overrides, e.g. `title` = "Requirements & Ticket Scope", `section_heading` = "Requirements & Scope Questions", and an `intro` that frames the page as agreeing on what the system must do and how many implementation tickets should encompass it before design work begins.
   - `content`: an object containing `system_goals` and `actionable_items`. **`system_goals` MUST ALWAYS be passed** inside `content` so the backend always writes a page. Never omit it, even if every criterion and NFR is confirmed. `acceptance_criteria` and `nfrs` both live inside `system_goals`. (Do not pass `implementation_order` inside `content` — that is for epic surfaces, not a single explored task.)

   **Read the decision-page procedure just before the call.** Read `.bridge/procedures/define-tickets-decision-page-procedure.md`, else `mcp_server/instructions/define-tickets-decision-page.md` (Procedure lookup rule). It holds the `ExploreTicketContent` schema and an example call. If it cannot be read, follow Procedure read failure (`repair-assets`) and treat the call as failed: give the visible warning below and settle the requirements and ticket scope through the Stage 6 chat fallback.

4. **Handle the response `status`:**
   - `no_decisions_needed`: no page was written. This should not occur when `system_goals` is always passed. Warn that the page was not written and use the Stage 6 chat fallback to settle both requirements and ticket scope; never bypass scope agreement.
   - `decision_page_generated`: surface the returned `file_path` and proceed to Stage 6. **Always proceed to Stage 6 when `decision_page_generated` is returned**, regardless of `actionable_items_count`. An unexpected zero-card response still requires requirements and scope agreement; it never bypasses Stage 6.

This stage is non-blocking: if `generate_decision_page` fails, do not halt. **You MUST output a highly visible warning** (e.g. **⚠ WARNING: The requirements page could not be generated** in bold) explaining that generation failed and that the user should review the criteria in the markdown doc written in Stage 4 instead. Do not silently continue — the failure must be diagnosable from your output. Then use the Stage 6 chat fallback to confirm both the criteria and a concrete implementation-ticket count before proceeding to Stage 7.

## Stage 6 — Ratify Requirements

**Only under --auto:** follow "Stage 6 — No page and no operator" in the auto-mode procedure.

Capture the user's stances, settle the criteria, gate on the implications review, and fold the result into the doc. Nothing downstream — including a council in Stage 7 — may start until the criteria are agreed and the final Stage 6 answer has advanced.

**Path (attended only).** Item 5 shows the implications review and the drafting plan in one output-only message on both paths. Re-evaluate the Switch to the full path triggers below on every owner reply in this stage.

1. **Direct the user to the page.** Provide the `file_path` from Stage 5 and tell them to open it in their browser. Explain that they are agreeing on what the system must do and the ticket count, and can accept, question, or reject each criterion or ask in chat before submitting.

2. **Q&A loop and commit signal.** Engage with each user message as either a commit or a discussion turn:
   - **Commit:** trim the full message and attempt to parse the entire trimmed message as JSON. Treat it as a commit only when the parsed value is an object with all three top-level fields: `ticket_key` (string), `decisions` (object), and `general_comment` (string). The first valid commit-shaped paste commits — do not over-validate the per-card fields. The page also submits `acceptance_criteria_feedback` and `nfr_feedback` objects, each keyed by criterion id or NFR category with a `stance` of `agreed`, `ask`, or `disagree` plus a `comment`.
   - **Discussion:** anything that is not commit-shaped JSON. Answer from the doc written in Stage 4 and from codebase lookups. If a JSON-shaped paste is missing one of the three required fields, say which field is missing rather than treating it as a freeform question.
   - **In-flight overrides:** when the user clearly changes an answer in chat ("AC-2 is wrong", "go with eventual for R-1") or gives new overarching guidance, record it as a working-memory override. On commit, the submitted JSON is the baseline and recorded overrides take precedence; post a one-line acknowledgement naming each overridden item before you rewrite the doc.

3. **Resolve every "ask" (hard rule).** After accepting a commit, scan all three: any item in `decisions` where `choice === "ask"`, any entry in `acceptance_criteria_feedback` where `stance === "ask"`, and any entry in `nfr_feedback` where `stance === "ask"`. For each, present the relevant evidence and continue the discussion until the user gives an explicit answer, which you record as an override. Do not proceed while any `ask` remains unresolved — do not honor "just skip those".

**Settle ticket scope (attended only, before item 5).** Resolve `SCOPE-1` from the submitted `decisions` using the offered option and any explicit chat overrides. A missing answer, `choice === "ask"`, `choice === "none"`, or "Discuss a different ticket count" requires discussion until the user explicitly agrees a positive integer count covering every requirement. Never infer agreement from the recommendation or from an unrelated approval. Record the agreed count, rationale, and approximate responsibilities in working state as `ticket_scope`; this is a binding planning constraint, not a system acceptance criterion. If generation failed, returned `no_decisions_needed`, or omitted the scope card, present the same scope question and recommendation in chat and explicitly settle it alongside the criteria. The fallback does not require a page commit JSON.

4. **Resolve every "disagree".** A disagree means the criterion is wrong as written. Work out with the user what it should say, restate it back, and get explicit agreement on the corrected wording. A rejected criterion is either rewritten or dropped — never carried forward as-is.

5. This surface's tracked stances are the `acceptance_criteria_feedback` and `nfr_feedback` objects captured above. **Review the wider implications, then gate on a decision.** Build the review from the complete settled set: the submitted `decisions`, any in-flight overrides recorded during the conversation (these take precedence over the submission), every `"none"` answer together with the reason given for it, `general_comment`, and — where this surface tracks acceptance-criterion or NFR stances — those stances too. Do not start the review until every `ask` has an explicit recorded resolution and every in-flight override has been applied.

   Consider three fixed categories, regardless of whether a decision was framed as technical, user-facing, or business-oriented:
   - **Program / application** — architecture, code paths, operability, maintenance burden, and requirements imposed on other parts of the software.
   - **User** — end users, new users performing setup, operators, and developers, including prerequisites, setup friction, and additional steps.
   - **Business** — cost, adoption, support load, compliance, and reversibility.

   Emit only the categories with material second-order implications. For each included category, write at most four one-line bullets of about 25 words, each naming who or what is affected and how — never a restatement of the selected decision. Close with a line naming every considered category that was omitted, e.g. `Considered, nothing material: business.` — omit this closing line only when all three categories have material implications.

   If the review cannot be produced, report that in one line (for example `Implications review unavailable.`) and skip only the missing review content. Record the assessment as unavailable, not as immaterial: its signals are neutral and the remaining evidence decides the recommendation. In an attended run, the unavailable notice appears at the top of the item 5 message below; an unavailable review is not by itself a reason to stop.

   **Choose the drafting plan.** Once requirements and ticket scope are settled, with every `ask` resolved and every override applied, assess the six Stage 7 signals against the settled set, then select the recommended plan. The recommendation follows this precedence:

   - **Review before the design** when evidence leaves multiple approaches unresolved, a criterion has no obvious implementation path, there is no codebase precedent, or research found competing approaches without a winner (signals 1, 2, 4, and 6).
   - **Otherwise, review after the design** when a criterion conflicts with another criterion or an NFR, ratification materially changed the problem, or the implications review was material, meaning it emitted at least one category (signals 3 and 5, or a material review).
   - **Otherwise, no council.**

   **Select the after-design tool.** For an after-design review, use `request_council` whenever a tension signal fires or the implications review was material. Otherwise use `second_opinion` only when the review reduces to exactly one or two separately answerable questions, with at most two calls and 10 credits. Use `request_council` for every other after-design scope.

   **Record the plan in working state before anything is shown or run.**

   ```text
   drafting_plan:
     council_choice: before | after | none
     review_tool: request_council | second_opinion    # only when council_choice is after
     review_scope: what the review covers
     review_questions: each concrete question with the current answer or an explicit uncertainty
     gap_check_policy: run_if_epic | skip
   ```

   Record the review scope and questions with the tool selection before any review executes, so the disclosed estimate and the later execution agree. `run_if_epic` is the recommended gap-check policy in every attended plan; `skip` stays an explicit alternative. Also keep the legacy attended `council_choice` that Stage 9 passes to the gap check: `approved` for `before` and `after`, `declined` for `none`.

   **Record the decision before anything runs (attended).** Append a `plan` entry for the plan taken (under `ask`, once the reply selects it), and a `paid-review` entry with its stated credits for each council or `second_opinion` in it.

   **Read the estimates.** Just before composing the message below, read `.bridge/procedures/define-tickets-drafting-plan-estimates-procedure.md`, else `mcp_server/instructions/define-tickets-drafting-plan-estimates.md` (Procedure lookup rule). Its figures, the only source for time and credits, are **rough, static guidance - not measured duration or usage**. If it cannot be read, follow Procedure read failure (`repair-assets`), show the plan with its time and credit figures marked unavailable, never invent them, and run no paid review whose credits you cannot state: record a `paid-review` entry saying it was not run and why, and offer it at the upload gate.

   **Show one output-only message (attended).** On both paths, show in one message the unavailable-review notice when needed, the implications review, then the plan, in plain language. Never put the words "trigger", "Stage 6", "create gate", "pre-approve", or "coherence" in what the user reads. Emit the plan in this shape:

   ```text
   Your requirements are settled. Here is my plan for the rest of the run.

   Recommended plan: {the recommended option, by number and name}
   Why: {one or two sentences naming the evidence behind the recommendation}

   Questions a review would check, with my current answer:
   - {concrete question, naming the criteria at issue}: {my current answer, or "I'm not sure"}

   {Only when define_tickets_plan_stop is ask:}
   Your options:
   1. Review before the design (as recommended) - {the council's scope}. If this becomes an epic, I'll also run a gap check on how the tickets are split. Then I'll draft every ticket and ask once before uploading. About {remaining time}.
   2. Review after the design - {a council or a second opinion, and its scope}. If this becomes an epic, I'll also run a gap check on how the tickets are split. Then I'll draft every ticket and ask once before uploading. About {remaining time}.
   3. No council, your choice - I design from my own analysis. If this becomes an epic, I'll still run a gap check on how the tickets are split. Then I'll draft every ticket and ask once before uploading. About {remaining time}.
   4. Skip the gap check - combine this with 1, 2, or 3 to skip the gap check if this becomes an epic. It saves time only if the work becomes an epic.

   Faster: {the same plan under the same assumptions, with the slowest planned review removed, and how much sooner that is}
   Whichever council option you pick also covers a review of how the tickets are split if the work becomes a high-risk epic, so I won't ask again.
   To change a requirement instead, just tell me which one.
   {End of the ask-only part.}

   These estimates assume {ticket shape, ticket count, design effort, reviewer rounds, and whether drafts can run in parallel}: about {remaining time} for the rest of the run. Expected review credits: {the review credits for the recommended plan}. Possible extra charges: {an additional council, or the retry from a technical council to a general one}. Writer and reviewer credits are unknown, so there is no all-inclusive total.

   You can reply at any time to change something.
   ```

   Under `ask`, put `(as recommended)` on the recommended option only and on no other; the example above shows it on option 1 for shape only. Every option shows its approximate remaining end-to-end time under the shared assumptions named in the plan. The faster alternative explains that removing a planned review is faster, and that skipping the conditional gap check is faster only if the work becomes an epic. When the recommended plan is already no council, say that it is **already the fastest available path**, and that skipping the gap check is faster only if the work becomes an epic. That is the sole exception to naming a faster alternative.

   **A paid review is approved by this message,** which states it with its credits before it starts, and authorizes only that review and credit range. Never start a paid review whose credits were not stated first. Before adding one or raising its cost, show an updated output-only disclosure and append a new `paid-review` entry; under `ask`, a material change goes back through the combined stop.

   **`define_tickets_plan_stop`.** This per-repository setting has exactly two values, `automatic` (the default) and `ask`. Only `ask` turns the stop on. Resolve it once from the Stage 0 read, trimmed and lowercased: `ask` selects `ask`; `automatic` or an explicit `value: null` selects `automatic` silently. Anything else (no `value`, malformed, blank, other or non-string value, missing tool, read error, older-server 400 `Invalid config field`) selects `automatic` with one line: `Couldn't read the plan-stop setting, so this run continues automatically.` A failed read is not fatal: no retry, no question, no Stage 0 stop, nothing echoed or recorded. Keep the value. On resume, re-read once only if lost before this message; never reread or reopen a pending, answered, or passed stop. `--auto` never reads it.

   - **`automatic`.** The message has no options and no question. Do not wait: Stages 7 and 8 run the recorded plan. Judge any later owner reply by intent, handling a requirement change first.
   - **`ask`.** End the message with the options above and one plain question, for example `Shall I go ahead with the recommended plan? You can also pick another option, ask a question, or tell me what to change.` Wait for the reply: one combined implications-and-plan stop on both paths, never offering confirm and proceed as separate choices.

   **Reading the reply (`ask` only).** Judge the reply by intent. Do not match exact words or normalize tokens.
   - A clear numbered choice, a clear verbal choice, or an explicitly named mixture such as "review after the design, skip the gap check" applies that plan. Read option 4 as a modifier on whichever council option is named.
   - One affirmative, such as "go ahead", "yes", or "looks good", settles the implications and selects the recommended plan, including its gap-check policy and any stated paid review.
   - An unclear reply authorizes nothing. Say what you could not tell and show the same plan again. Start no council, no second opinion, and no drafting pass from it.
   - **A new focus for a chosen review.** If the reply clearly selects a review and names only a new focus for it, echo it as a revised checklist in one or two lines, update `review_scope` and `review_questions`, and move on without another ordinary stop. If the reply asks a question, answer it first, then show the plan again in a compact form.
   - Keep only the final `drafting_plan` and its legacy `council_choice` in working state.

   **A requirement change comes first (both settings).** A reply that changes a requirement reopens it, even when it also approves or picks a plan. Re-settle it in chat, record the new override, rerun the entire implications review against the changed settled set, and show the resulting message again. Run nothing from the mixed reply. A named decision supersedes an earlier choice.

   Literal `auto_approve = true` emits the review, records the recommended plan, and skips showing the plan entirely; a missing or non-true `auto_approve` value follows the human-in-the-loop path above.

6. **Settle the criteria and update the doc.** Rewrite the Acceptance Criteria, Goals & NFRs, and Open Questions sections of `{docs_dir}/explorations/{slug}.md` to the agreed set: fold in every correction, resolve each answered requirement question into the criterion it affects, promote settled criteria out of `open`, and weave `general_comment` in as overarching guidance. Add or update the `## Implications` section with the latest review from item 5 — the final one after any reopen/review loop — or its one-line unavailable notice if generation was unavailable. Also record the selected drafting plan and its review scope under the doc's requirements sections. For attended runs, update `## Ticket Scope` with the agreed `ticket_scope` count, rationale, and approximate responsibilities; preserve it in all later document rewrites, and preserve the `## Decisions made for you` section the same way, never rewriting its entries. Set the doc's Status line to "Requirements ratified". Preserve all unaffected sections unchanged. **The settled criteria are now the contract** — every later stage is judged against them.

**Switch to the full path (attended only).** This is the one authoritative rule for leaving the short path. Later stages refer to it. It is one-way: a full-path run never returns to short. It never applies under `--auto`.
- **Triggers.** Any one of these: the owner asks for the full path (for example "full path" in any reply); the work needs three or more implementation slices, including an agreed `SCOPE-1` count of at least three; a forced-full area is newly discovered; a writer reports a behavior change; or the owner widens the scope.
- **When to check.** On every owner reply; at Stage 6; after the design and the split; whenever a writer returns; and before the upload gate. State each check in one line.
- **On a switch.** Announce it in one line that names the trigger. Set `run_path` to `full` and `escalated` to `true`, and add the trigger to the doc's `## Context`. Keep the research, the exploration document, the ratified requirement set, and every existing draft.
- **A switch owes no stop.** The item 5 message already covered the implications and the plan; reuse it. If the work becomes an epic, follow the existing epic flow, including the gap check, before any writer for the epic runs. **Epic procedure loading.** The three-or-more-slices trigger does not load the epic hand-off procedure by itself. An early switch, including an agreed `SCOPE-1` count of at least three in this stage, changes the attended path immediately but defers loading until Stage 9 freezes the epic split. A switch that happens inside Stage 9 after the split froze enters the single "Load the epic hand-off procedure" block there immediately before the first epic operation, unless the procedure was already read. The procedure is read at most once per run, and this rule adds no second lookup.
- **Requirements and drafts.** A changed requirement goes back through Stages 5 and 6 and then the design flow. Do not regenerate the requirements page for an unchanged requirement set. Keep existing drafts on a late switch, and redraft only the affected entries under Handling changes. Choosing a paid review does not, by itself, invalidate unaffected drafts.

This stage is non-blocking: if the user never commits, leave the doc as written in Stage 4, tell them the requirements are unratified, and stop without forcing a decision. Do not proceed to a council or a design on unratified criteria.

## Stage 7 — Council Gate

The criteria are ratified, and Stage 6 already recorded `drafting_plan`. This stage only **executes** a before-design council. It asks the operator nothing.

**Entry safeguard.** If a Stage 5 fallback (the requirements page could not be generated and the user confirmed the criteria in chat) reached this stage without Stage 6 item 5, run the implications assessment and the drafting-plan selection from Stage 6 item 5, and show the same item 5 message, with its `define_tickets_plan_stop` branch, before anything runs. Under `--auto`, show nothing. Do not edit Stage 5 and do not generate another requirements page.

The six signals are assessed in Stage 6 before the plan is shown. A council is cheap relative to committing the user to the wrong design.

1. **The six signals.** They are defined in "Stage 7 item 1 — The six signals" in the discovery procedure, numbered 1 to 6 in that order; Stage 6 item 5 assesses them.

2. **Run only on the recorded plan.** Run the council here only when `drafting_plan.council_choice == before`. When it is `after`, defer the review to Stage 8, once the design and sized slices exist. When it is `none`, an unclear reply left the plan unresolved, or a requirement was reopened and not re-settled, run no council here: go to Stage 8 on your own analysis. Never run a council without that recorded choice. Stage 7 asks the operator nothing.

   **Only under --auto:** follow "Stage 7 item 2 — Run the recorded plan" in the auto-mode procedure.

3. **Execute.** Call `request_council` with:
   - `task_description`: the task, the **ratified** acceptance criteria and NFRs from Stage 6, the specific uncertainty you summarized, and the recorded questions from `drafting_plan` (as revised by the user, if they were). Sent verbatim — this tool does not read from a file. State plainly that the criteria are settled and the council's job is to find how to meet them, not to revisit what they are. Its scope is "how, not what".
   - `mode`: `technical`.
   - `wait_for_result`: `true`. `save_locally`: `true`.

   While it runs, tell the user it is polling and roughly how long it may take (about 15 minutes, as disclosed in the plan).

   **Record the design-council evidence (attended only).** When the council completes, keep `design_council_evidence` in working state: the `council_id` the request returned, `design_revision` set to the SHA-256 hex digest of the exact `task_description` text you sent, and `split_reviewed: false` (this council ran before any split existed). A council that failed or timed out records nothing. The epic hand-off procedure copies this into the gap-check input as `design_council`; it is how the gap check knows a design council already ran. Under `--auto`, record nothing.

4. **Fold the result into your analysis.** Carry the council's approaches, objections, and any option you had not considered into Stage 8. If the council argues a ratified criterion is unmeetable, never drop or weaken it: append a `needs-owner` entry to the decisions catalogue (attended), which the upload gate shows and which blocks creation until the owner answers.

If the council fails or times out, note the failure visibly and proceed with your own analysis — a missing council degrades the design but does not invalidate it. This stage is non-blocking — always proceed to Stage 8.

## Stage 8 — Propose Final Design

Now describe how you would build it. A review the drafting plan scheduled for after the design runs in item 4. **Do not generate a decision page for this stage.** The requirements page was the user's decision surface; the design is your proposal, written into the doc and discussed in chat. Generating a second page here would ask the user to ratify a solution, which is not what this command does.

**Load the design procedure (both modes, once).** Read `.bridge/procedures/define-tickets-design-procedure.md`, else `mcp_server/instructions/define-tickets-design.md` (Procedure lookup rule). It holds the detail for items 1 to 3 and item 6. If it cannot be read, follow Procedure read failure (`repair-assets`) and stop before designing: attended, leave the document as Stage 6 wrote it and create nothing; under `--auto`, halt as `stage_failed` naming Stage 8.

1–3. **Work out, resolve, and commit to one design.** Follow "Stage 8 items 1–3 — Work out and commit to the design" in the design procedure.

   **Honor the agreed ticket count (attended only).** Build the design's implementation slices to match `ticket_scope`, preserving full requirements coverage and the existing sizing guidance. If design or a later review shows that a different count is needed, make the change yourself, with no owner question: update `ticket_scope` and `## Ticket Scope`, rerun the implications review for the changed scope, refresh the affected estimates, and append a `scope-change` entry with the old and new count and the coverage or sizing reason. Never force an unsafe split to keep a count, and never drop a requirement to fit one. Under `--auto`, no attended count or scope change record applies.

   **Check the path after the split (attended only).** After the design and its slices are recorded, re-evaluate the Switch to the full path triggers in Stage 6, in one line: three or more slices, a newly discovered forced-full area, or any other trigger switches the run before Stage 9 freezes the split.

   **Record the implementation slices with a size band.** Follow "Stage 8 item 3 — Record the slices with a size band" in the design procedure.

4. **Run the planned after-design review.** Run this only when `drafting_plan.council_choice == after`; otherwise skip it. It runs after the design and its sized slices are written, and before Stage 9 freezes the split. State the cost before the paid call, and again before any billable expansion. Use the tool and scope already recorded in `drafting_plan`.
   - **`request_council`:** call it with `mode: technical`, `wait_for_result: true`, and `save_locally: true`. Send the finished design, its slices, the unchanged ratified requirements, and the recorded questions in `task_description`, verbatim, with the scope "how, not what". When it completes, replace `design_council_evidence` in working state (attended only) with its `council_id`, `design_revision` set to the SHA-256 hex digest of the exact `task_description` text sent, and `split_reviewed: true`, because this council reviewed the sized slices. A failed council records nothing, and a `second_opinion` never counts as a design council.
   - **`second_opinion`:** follow "Stage 8 item 4 — Second opinion calls" in the design procedure: at most two calls and 10 credits.
   - **Fold usable findings** into both the proposed design and the affected slices, then update the coverage and the exploration document before you proceed.
   - **A finding that a ratified criterion is unmeetable** is never resolved by weakening the criterion. Attended: append a `needs-owner` entry instead of asking mid-run; the upload gate shows it, and nothing is created until the owner answers. **Only under --auto:** follow "Stage 8 item 4 — Unmeetable criterion" in the auto-mode procedure.
   - **A review that fails** (a tool error, an explicit failure or timeout state, or unusable output) is noted visibly. Continue on your own design. Never claim the review completed and never substitute another paid review. Record the affected scope and the follow-up in attended progress, in the exploration document, in the upload outline, and in the Final Report; under `--auto`, address the notice to the invoking operator or `$bridge-idea-to-pr` consumer through the existing artifacts and report prose.
   - A review failure never relaxes criterion coverage, readiness, or epic clearance.

5. **Rewrite `{docs_dir}/explorations/{slug}.md`** so it reads as a finished proposal, not a mechanical append. Set the Status line to "Design proposed". Keep the ratified Acceptance Criteria, Goals & NFRs, and `## Implications` sections intact — they are the contract and must not drift — and keep the `## Decisions made for you` section when it exists, and the Context's path record, intact too. The decisions catalogue is append-only: never rewrite, reorder, or drop an entry. Then add:

```markdown
## Approaches Considered

{Each candidate, what it would mean, and why it was or was not chosen. Note which came from the council, if one ran. If no alternatives were seriously considered, state that and why the path was obvious.}

## Proposed Design

{The recommended approach in enough detail to implement: how it works, the files to create or modify, the sequence of work, and the risks. Reference specific files with file_path:line_number format.}

## Criteria Coverage

{Each ratified criterion mapped to the part of the design that satisfies it, and how it will be verified. Any criterion the design only partially meets must say so plainly.}
```

6. **Present the design in chat and invite pushback.** Follow "Stage 8 item 6 — Present the design" in the design procedure.

7. **Find the blast radius (epic only).** Run this when the run will freeze an epic split under the Stage 9 threshold and its contractual exceptions, including an E1 contractual epic with fewer than three children. Add no separate three-slice threshold. It runs at the end of this stage, after the slices and their file lists are recorded and before the epic split freezes, in attended and `--auto` runs alike. Read the procedure at `.bridge/procedures/define-tickets-blast-radius-procedure.md` in this project, where the Bridge installer scaffolds it. Only if that file does not exist, read `mcp_server/instructions/define-tickets-blast-radius.md` in this checkout. A file that exists but cannot be read is a failure: never fall back to the checkout copy. Treat it like the epic hand-off procedure's read failure: attended, stop with the same repair guidance; under `--auto`, halt as `stage_failed` naming Stage 8. This adds no halt reason. Follow the procedure. Let its discoveries amend the provisional slice file lists before the split freezes, and write `{docs_dir}/epic-plans/{slug}/blast-radius.json` beside the manifest and input before the first epic `check --structural` invocation. Degraded discovery alone never halts. Siblings treat the procedure as advisory and need no artifact.

This stage is non-blocking — always proceed to Stage 9 once the design is written and summarized in chat, even if the user has not responded to it. The invitation in item 6 is not a question: do not stop and wait for a reply. The user can still object at the Stage 9 upload gate.

**Only under --auto:** follow "Stage 8 item 6 — Design pushback is output-only" in the auto-mode procedure.

## Stage 9 — Ticket Handoff

<!-- BEGIN BRIDGE TICKET-AUTHORING POSTURE -->
<!-- Canonical source: docs/bridge-ticket-authoring.md.
     This block is duplicated byte-identically onto every carrier. Never edit a
     copy: edit the canonical source and re-copy it verbatim. A cross-surface
     byte-equality test fails the build if any copy drifts by a single byte. -->

## Ticket-authoring posture

Deep reference: `docs/bridge-ticket-authoring.md`.

**Draft through the writer.** Every ticket body — an epic parent, an epic child,
and an ordinary sibling alike — is drafted by the `jira-ticket-writer` agent
before `create_ticket` is called. Do not compose a ticket description inline.

**Size the work.** Size each ticket by file-touch breadth and depth plus rough
lines of code (LOC) changed:

- `S = 1-2 files / <~80 LOC`
- `M = ~3-8 files / ~80-400 LOC`
- `L = ~8-15 files / ~400-900 LOC`
- `XL = >15 files / >~900 LOC`

Target size priority: **L (target) -> XL (when the work does not fit in L) -> M
(third choice) -> S (only when unavoidable)**. This applies equally to a
standalone ticket and to an epic child.

Aim each slice at L. When one will not fit, grow it to XL rather than splitting
it — split only when the slice is genuinely two independent pieces of work,
never merely to land inside a band. Bridge's grooming and implementation process
handles a large vertical slice well and is overkill on small ones: every extra
ticket is another worktree, another PR, another rebase, and another chance for
two workers to touch the same file. Reach for M because the work genuinely is
that size, not to avoid an XL.

Beyond roughly 40 files or ~3000 LOC, split anyway. Past that point review
turnaround and rebase cost dominate the run's budget, and a review that wedges
holds the gate to its full retry ceiling before anyone notices.

**Group at three.** Three or more implementable tickets is an epic: propose an
epic parent plus an ordered child manifest, and resolve this surface's own
approval gate before anything is created. One or two tickets are ordinary
siblings — no epic parent, no manifest. The threshold is exactly three.

**Hand off once.** An epic handoff names exactly one conductor entry point,
`drive-epic`, which selects the runnable path itself. Never present a choice
between conductors.

**Planted placeholders hand over.** A ticket that plants a placeholder test or
stub for a later ticket says so, and the later ticket's body gives explicit
permission to replace that placeholder. A rule such as "never edit existing
assertions" never covers a planted placeholder.

**Departure is closed-list only.** These three exceptions, and no others, permit
departing from the rules above. Invoking one requires no announcement.

- **E1 External-tracker mirroring** — a recorded upstream identifier exists and
  its granularity is contractual. Bypasses sizing and the epic threshold.
- **E2 Discovery-only spike** — no committed production-code deliverable.
  Bypasses sizing only; does not bypass drafting through the writer.
- **E3 Authorized incident containment** — tied to an active incident record,
  not to schedule pressure. Bypasses sizing and the epic threshold.

The list is closed. Anything outside it is an escalation to the operator, not a
judgement call. Explicitly refused as grounds for departure: a single-file
trivial fix (that is `S` reached through the normal path, not an exception),
generic time pressure, "already well specified", "faster without the writer",
developer discretion, minor refactor, unattended mode, context limits, and "hard
to decompose" (XL is the normal overflow, so that is the ordinary path and not a
departure). Writer unavailability escalates; it never silently authorizes inline
drafting.

<!-- END BRIDGE TICKET-AUTHORING POSTURE -->

1. **Assess readiness.** The work is ready to become a ticket when the criteria are ratified, the design is proposed, and no criterion is left unresolved or only partially covered, except one held by an unresolved `needs-owner` entry, which reaches the upload gate and blocks creation there. If something is still open, say what it is and recommend the follow-up that would close it rather than creating a ticket on a soft foundation:
   Recommend the follow-up in "Stage 9 item 1 — Readiness follow-ups" in the design procedure: a wider council, a second opinion, or more research.

   **Only under --auto:** follow "Stage 9 item 1 — Readiness follow-ups" in the auto-mode procedure.

2. **Decompose once, check the split, draft every entry, then ask once to upload.** When the work is ready, freeze the split before you draft, and show the whole thing at the upload gate. Never present the gate bare — the user cannot consent to a plan they have not been shown.

   **The order is fixed:** design and split, including any after-design review; for an epic, freeze → structural check (`epic-coherence-input check --structural`) → fresh whole-manifest review → agent settlement (the epic hand-off procedure's Step 2b) → when settlement amended the manifest, re-freeze, structural check, and the next whole-manifest review; then the writer drafts; then the draft check (`epic-coherence-input check-drafts`); then the final attended upload approval. A gap check never runs after drafting, and no owner question comes between the gap check and the first writer launch.

   **Late escalation (attended only).** If a Switch to the full path trigger fires after drafts exist and the work becomes an epic, the gap check for the new epic manifest still runs before any further writer work for the affected entries. Drafts retained from the earlier sibling flow are kept, not discarded, and are redrafted only where the new manifest or Handling changes make them affected. This qualifies the fixed order for that case only. The same late escalation runs the blast-radius prepass: work that becomes an epic here follows the blast-radius procedure, reuses any still-applicable discoveries, and writes `blast-radius.json` before its first epic `check --structural` invocation.

   Count the implementation slices Stage 8 recorded. In attended runs, require that count to equal the agreed `ticket_scope` count before freezing the split. That count decides the shape, and the threshold is exactly three:

   - **Three or more slices → propose an epic.** Freeze an epic parent plus an ordered child manifest in one pass. Per child: title, scope boundary, size band, `depends_on` (hard prerequisites that must land first), `recommended_after` (soft sequencing preferences that are not blockers), a one-line order rationale, `owns_verifications`, and `handoff_roles`. `handoff_roles` lists the `{thing, role}` hand-off roles the child plays, with a stable `thing` id (`H-1`, …) shared by every child that touches the same value and a `role` from `write`, `read`, `caller`, `start`, `steady_state`, `wind_down`, and `consumer`; mark the child that owns the end-to-end test of the cross-child flow with `e2e: true` on its `owns_verifications` entry. When no value passes between children, the design says so in a `no_cross_child_flow:` line instead. `owns_verifications` is a list of `{epic_ac, obligation}` entries, exactly as `review-epic-coherence.md` defines the field: `epic_ac` is a ratified criterion id, and `obligation` is the concrete part of that criterion's verification sentence this child will carry out. Fill it in now, in the same pass that freezes the split. When the ratified design assigns an epic criterion's verification to a concrete **owner-run** step — for example a release-checklist step a person runs outside the Epic Implementer — do not force a child to own it: declare a `non_child_owners` entry instead, with `id` (for example `OR-1`, never a child id), `kind` (`owner_run`), `who`, `step_ref`, `step_text` (copied verbatim from the design), `records_result_in`, and `owns_verifications`. That obligation never goes into a child's acceptance criteria. Keep hard prerequisites strictly separate from soft sequencing. A child may be `XL`; grow one rather than splitting it to fit, and split only past roughly 40 files / ~3000 LOC.
   - **One or two slices → ordinary siblings.** No epic parent, no manifest, no decomposition pass. Just the ticket or the pair. **Siblings run no epic coherence check**: no reviewer call, record, extra outline line, or prompt. The existing gates contain the residual risk: step 3 creates only the set shown at the upload gate, and the writer drafts every body. If the work is really epic-shaped, tell the user so and regroup it as an epic before creation. Attended runs have one allowed addition for exactly two ordinary siblings, the main-agent overlap check in step 3. It is not an epic coherence check, and it is the only extra sibling outline line.

   This decomposition is the **single authoritative split** for the rest of the stage. It is decided here, once, with the whole portfolio in view; step 3 renders bodies against it and does not revisit it.

   **Only under --auto:** follow "Stage 9 item 2 — Child cap and open requirements" in the auto-mode procedure.

   **Load the epic hand-off procedure (epic only, once).** Only now, with an epic split frozen and the `--max-children` guard above passed, read the epic hand-off procedure: `.bridge/procedures/define-tickets-epic-handoff-procedure.md`, else `mcp_server/instructions/define-tickets-epic-handoff.md` (Procedure lookup rule). Read it once per run, then follow it at each epic-only pointer in this stage. This adds no flag, no state file, and no separate entry point. A sibling run never reads it: a run that never froze an epic does not read the procedure, not during exploration and not for a split that stays at one or two slices. If a frozen epic is later revised down to one or two slices, keep the earlier read, follow the sibling path, and skip the epic-only sections without rereading. A switch to the full path that makes the work an epic (see Switch to the full path in Stage 6) enters this same load block immediately before the first epic operation, unless the procedure was already read. If it cannot be read, stop; never rebuild the epic instructions from memory. Attended: stop with the repair guidance below. Under `--auto`: halt as `stage_failed` naming Stage 9, adding no halt reason and no terminal field.

At this procedure-read failure, follow Procedure read failure for `.bridge/procedures/define-tickets-epic-handoff-procedure.md` (`repair-assets`).

   **Epic gap check (epic only).** Follow "Step 2 — Epic gap check (frozen manifest)" in the epic hand-off procedure, before any writer runs. Siblings skip this.

   **Settle leftover gaps (epic only).** Follow "Step 2b — Settle leftover gaps" in the epic hand-off procedure, after the gap check and before any writer runs. Siblings skip this.

   **Coherence procedure lookup.** The epic hand-off procedure's Step 2 requests this lookup when it runs a gap check; read nothing here otherwise. Read `.bridge/procedures/review-epic-coherence-procedure.md`; only if that does not exist, `docs/install/review-epic-coherence-procedure.md`; only if that does not exist either, `mcp_server/instructions/review-epic-coherence.md` (Procedure lookup rule). If it cannot be read, stop: the shared procedure is not usable, so use the repair guidance below. Never improvise a substitute review.

At this procedure-read failure, follow Procedure read failure for `.bridge/procedures/review-epic-coherence-procedure.md` (`repair-assets`).


3. **Draft every entry, ask once to upload, then create.** Nothing calls `create_ticket` before the upload gate below resolves with an explicit affirmative, and no entry is drafted before the split is frozen and any planned gap check has run.

   **Only under --auto:** follow "Stage 9 item 3 — No upload gate" in the auto-mode procedure.

   **Check the record before any writer (epic only).** Follow "Step 3 — Record check and full clearance" in the epic hand-off procedure before any writer runs (and, under `--auto`, full clearance before any writer; before the first `create_ticket` call in every run). Siblings skip this.


   **Load the writer-output procedure (both modes, once, before the first writer).** Read `.bridge/procedures/define-tickets-writer-output-procedure.md`, else `mcp_server/instructions/define-tickets-writer-output.md` (Procedure lookup rule). It holds the writer inputs, draft paths, report handling, parent manifest normalization, and the two-sibling overlap check. If it cannot be read, follow Procedure read failure (`repair-assets`) and launch no writer: attended, stop with the local artifacts and show no upload gate; under `--auto`, halt as `stage_failed` naming Stage 9. A resumed or compacted run rereads it before its next writer operation.

   Fan out **one `jira-ticket-writer` invocation per entry** in the frozen outline — the epic parent, each child, and each ordinary sibling. Each invocation is bound to exactly its own entry and renders a body against that entry's fixed boundary and size band. A child invocation must not re-split, merge, reorder, renumber, or rescope: the decomposition is already frozen, and an invocation that sees one entry is deciding on strictly less information than the pass that saw them all.
   For every epic child, pass its carried ticket-local findings beside `owns_verifications`, word for word. Before creation, fail closed if its draft drops any id, evidence, or smallest amendment.

   **Launch every writer at once.** If the host can run subagents in parallel, launch every per-entry invocation at once, in parallel, as separate agent calls in a single host message. Otherwise run them one after another with identical frozen entries, inputs, and output paths; that is progress, not a stop: say the parallel estimate no longer applies, give a revised rough duration, and record the fallback in the exploration document and the Final Report. Never relaunch an invocation that already started when a fallback or a partial launch failure occurs. Never draft inline. When each writer returns, re-evaluate the Switch to the full path triggers (attended only). A selective retry or a revision call also gets a research packet.

   **Writer inputs.** Follow "Invocation inputs" in the writer-output procedure.

   **Research packet (both modes, every invocation).** Every writer invocation includes a `Research packet` block: the parent, each child, each sibling, and every retry and revision call. Build each packet from the Stage 1 findings, mapped to that entry's Stage 8 slice. It holds the `path:line` references for the files that slice touches and why each matters, the relevant callers and tests, and the known risks. Every packet also holds the shared precedent, the global risks, and the repository and branch the findings came from. When you are unsure whether a finding bears on an entry, include it. The packet is added to the inputs above and replaces none of them: the verbatim criteria, Goals & NFRs, manifest fields, ownership obligations, carried findings, output paths, and automation-specific inputs all still go in unchanged. For an epic, each child's packet also holds the full `blast-radius.json` rows whose `child` is that child's manifest ID, and the parent's packet holds the artifact's file count, its coverage value, and its degraded flags. A sibling's packet needs no artifact. Tell the writer that the supplied packet is its primary research evidence: it reads code only to fill a named missing fact, including a missing exact quotation, or to resolve a contradiction. It states the reason for each additional read in its reply prose, and returns every contradiction to you. Where code and packet disagree, the code wins, and the writer must still report the contradiction rather than rescope or modify the frozen entry.

   **When a writer reports a contradiction.** Attended: the report is a Switch to the full path trigger when it shows a behavior change; otherwise you resolve it yourself as a wording or boundary change under Handling changes and append a `writer-answer` entry. Never rescope a frozen entry yourself. **Only under --auto:** follow "Stage 9 item 3 — Writer contradictions" in the auto-mode procedure.

   **Only under --auto:** follow "Stage 9 item 3 — Writer inputs" in the auto-mode procedure.

   **Draft paths and writer reports.** Follow "Draft paths, standard warnings, and the terminal report" in the writer-output procedure. Every writer reply must end with its terminal `open-questions` report.

   **Check every draft before the gate.** Every expected draft must exist at its assigned path and satisfy the verbatim obligation and carried-finding checks above before the upload gate can appear. For an epic, run this mechanical draft check immediately before **each** upload gate is shown, and again after any redraft. Resolve the trusted launcher prefix once and run:

   ```text
   <launcher> epic-coherence-input check-drafts --input <input-path> --drafts <draft-directory> --record <record-path>
   ```

   `<input-path>` and `<record-path>` are the current `epic-coherence-input.json` and `epic-coherence.json` in `{docs_dir}/epic-plans/{slug}/`, and `<draft-directory>` is this run's draft directory. It checks that each `child-{N}.md` holds its `owns_verifications` obligations (the `e2e` one included) and each carried finding's id, evidence, and smallest amendment word for word. Never reuse a pass after the input, the record, or any draft changed. A failure names the offending draft and blocks the gate: apply "Carried-finding repair" (writer-output procedure), else treat it as a writer defect and take the existing writer-correction path for that entry (one revision with the same inputs, then the writer-failure path). Attended, show no upload gate until it passes. **Only under --auto:** follow "Stage 9 item 3 — Draft check failure" in the auto-mode procedure. Validate each writer's reply alongside those checks: it must end with exactly one valid terminal `open-questions` block. Before that check, set aside any trailing `ticket-standard` blocks in the validation view. If those blocks are the only trailing content, their placement is a warning, not an `open-questions` defect. Unrelated trailing prose, and a missing, duplicate, malformed, or non-empty `open-questions` report, remain defects. A missing or malformed block gets exactly one writer revision, using the same entry, assigned draft path, research packet, and every other invocation input. Reinvoke only the missing or failed writers, and use sequential retries if parallel retries fail. If attended completion remains impossible, stop with the local artifacts, the exploration document and the drafts directory, and show no upload gate. **Only under --auto:** follow "Stage 9 item 3 — Writer report failure" in the auto-mode procedure.

   **Resolve open writer questions (usable draft with a valid non-empty block).** A valid block that is not `none` means the draft exists but a choice is unsettled. This is not a writer failure.
   - **Attended.** Answer each question yourself, without asking the owner, from the ratified requirements, the entry's research packet, and code evidence, taking the writer's recommended option when one exists. Append a `writer-answer` entry, then re-invoke only the affected writer as a revision with the answer, entry, draft path, research packet, and existing inputs. Never answer by removing or weakening a ratified requirement. A question that needs that, or one the writer returns again after your answer, becomes a `needs-owner` entry instead; the upload gate shows it and blocks creation until the owner answers. Never offer to accept an unsettled draft manually. The upload gate stays absent until every writer's block is `none` or each remaining question is held by an unresolved `needs-owner` entry. Only that held question is exempt: a missing or malformed report, an unrelated draft defect, a missing draft, and a failed draft check still take the writer-correction path.
   - **Only under --auto:** follow "Stage 9 item 3 — Open writer questions" in the auto-mode procedure.

   **Normalize the epic parent's manifest section (epic only, automatic, no stop).** Follow "Parent manifest section" in the writer-output procedure, before the upload gate.

   **Open-decision phrase backstop (warning only).** After every writer revision and after the parent normalization above, scan each final local draft for phrases that read like a request to settle a decision. Do this before showing the attended upload gate and before any automatic `create_ticket` call. A validated `open-questions` block stays authoritative. A phrase match never halts, never hides the upload gate, and never refuses creation. The canonical list, from `docs/bridge-ticket-authoring.md`:

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

   Attended, show each match as a named item qualified by its entry, directly after item 9 of the outline below. Show the gate as usual when the writer reports are otherwise clear. Under `--auto`, add each match to the Final Report's **Warnings**. A phrase-only match does not halt or suppress creation.

   **Two-sibling overlap check (attended only).** For exactly two ordinary siblings, follow "Two-sibling overlap check" in the writer-output procedure.

   Output the plan outline, kept to roughly one screen. For an epic, show it in this order:

   1. **Epic only, items 1–3.** Follow "Step 3 — Epic outline items 1–3" in the epic hand-off procedure (Gap check, Independence and notes, Who covers each requirement). Siblings skip them.
   4. **Plan** — the approach in one sentence.
   5. **Shape** — `epic` (with the parent's title) or `siblings`. Say which and why the count put it there.
   6. **Tickets ({n})** — one line per ticket: title, the slice of scope it covers, its size band, its ratified criterion ids, and — for an epic — its `depends_on` / `recommended_after` and order rationale. Say plainly when it is a single ticket.
   7. **Files** — the files to create or modify, grouped by area.
   8. **Sequence** — the ordered steps of the work, one line each.
   9. **Risks / not covered** — any criterion the design only partially meets, or `none`.
   9a. **Open-decision phrase warnings** — one named item per matching line, qualified by its entry (see the phrase backstop above), or omit when there are none. These are advisory and do not hide the gate.

   A sibling screen shows items 4 through 9 only: no gap-check sections. For exactly two attended siblings, it also shows the one overlap line from the check above.

   After the outline, also show the selected drafting-plan policies (council choice, review tool and scope when applicable, and gap-check policy), any review failure or sequential-writer fallback, and the path of every draft file.

   **Known gaps (epic only).** Follow "Step 3 — Known gaps (epic only)" in the epic hand-off procedure. Siblings skip this.

   **Decisions made for you (attended).** Then show the catalogue in plain language, without internal words such as "Stage 6", "trigger", or "coherence": every unresolved `needs-owner` entry first, under the heading `Needs your answer before anything is created`, then the rest in order, each with its `D-{n}` id, status, choice, alternatives, reason, and affected tickets. `gap-settlement` entries render the same way; Known gaps keeps its own list and reasons. With no entries, say in one line that no decisions were made for you.

   Then close each approval attempt with exactly the applicable question. Substitute the actual number of drafts for `N`, and use the singular line when there is one draft:

   ```
   Upload these N drafts to Jira? (yes / change something)
   Upload this draft to Jira? (yes / change something)
   ```

   This is the only approval gate for irreversible creation. Show it once per approval attempt; it carries no council-consent question.

   Before you show the gate, re-evaluate the Switch to the full path triggers one last time (attended only) and apply any switch first.

   **Reading the reply.** Judge by intent, not by an exact token.
   - **Full path first (attended only).** Process a request for the "full path" in the reply before interpreting any upload authorization in the same reply. The switch comes first, nothing uploads from that reply, and you show the updated gate once the switch's required work is done.
   - **Clear authorization.** A reply such as "yes", "upload", or "go ahead" that plainly asks to upload the shown drafts and asks for no change authorizes uploading exactly the displayed draft set. It accepts every gap listed under `Known gaps that will be recorded on the epic`: record exactly the displayed proposed acceptances and reasons as overrides of kind `accept` with the `finding_id`, the shown reason, `accepted_by: "operator (agent-drafted reason)"`, and the `round`. The verdict becomes `accepted_with_gaps` only when every remaining foundation blocker has its required override. It never chooses a split change and never spends the fix budget.
   - **Creation stays blocked** while any foundation gap is not on that list. Never read a general yes as permission to change the split.
   - **A plain "yes" with a `needs-owner` item unanswered creates nothing.** Record no acceptance from it either; say which items still need the owner's answer and show the gate again.
   - **The owner names a ticket for an unowned requirement or end-to-end test.** That is a split change: assign it, re-freeze, and continue under Handling changes. Nothing is created from that reply.
   - **The owner removes the requirement from scope.** That is a requirement change only the owner can make, and only here. Update the ratified set and record the change in the decisions catalogue, then continue under Handling changes: invalidate the affected coverage, review evidence, and drafts, rerun the structural check and a fresh whole-manifest review, redraft only the affected entries, rerun the draft check, and show a new gate. Nothing is created from that reply; creation needs a new "yes".
   - **Changing a decision.** "change something" may name any catalogue entry by its id, and an answer may resolve a `needs-owner` entry. Append a new entry that names the one it reverses or resolves; never edit the earlier entry. A requirement-level reversal goes back through Stages 5 and 6 and the design; any other reversal redrafts only the affected entries under Handling changes. Rerun the required checks, then show the gate again. A paid review that already ran stays listed as incurred. Nothing is created from that reply.
   - **A typed reason to create without a check that could not run** resolves "Couldn't check" as a `bypass` override. It is not upload approval: show the refreshed gate and wait for a new "yes".
   - An unfinished required council still needs the existing typed acceptance that names its `council_id`, and "Couldn't check" still needs its separate typed bypass. A general upload approval never substitutes for either.
   - Asking to change the split, naming a finding, or asking a question opens a discussion or a fix and creates nothing.
   - If a proposed reason, target, verdict, or the parent's coverage changes, redraft the parent and show another gate. A changed shown set, or any other approval-relevant item, means the gate must be shown again; the earlier reply authorizes nothing.
   - An empty, negative, or ambiguous reply uploads nothing: do not guess intent. Report both the exploration document and the drafts directory as the artifacts, and tell the user they can later ask their agent to use the Jira Ticket Writer to revise those drafts or to create the tickets from them. A reply that mixes authorization with a change request also uploads nothing: make the change first, then show the updated gate. Creation is irreversible, so never create a ticket without a clear authorization.

   **Handling changes.** Distinguish what changed.
   - **A wording or boundary change** stays in Stage 9. Compute the affected drafts from the changed entry content, shared criteria and NFRs, dependencies, verification obligations, carried findings, and parent coverage, not from the edited file list alone. Redraft only those entries, and the parent too whenever the split changes. Revalidate draft completeness, including the draft check, before showing the updated gate: every redrafted entry again needs a valid writer report, and the phrase scan is refreshed against the final drafts. After a late Switch to the full path, keep every draft that the switch left unaffected, redraft only the affected entries, and do not discard a draft because a paid review was selected.
   - **A change to an accepted requirement or goal** is not a wording change. Route it back through Stages 5 and 6, the implications review, the drafting-plan selection, and the Stage 8 design before drafting again.
   - **The affected set (epic).** Before reinvoking any writer after an epic change, compare the old and new frozen manifests and the relevant evidence, and write down the affected set with one reason per entry. It holds: every changed child; the old and the new holder of every changed hand-off role; every consumer of a changed `thing`; transitive `depends_on` dependents only where the changed contract actually reaches them; every child whose carried findings changed; and the parent whenever coverage, the overrides, or the split summary changed. When the impact is uncertain, or a new child does not map clearly to an old one, treat the entry as affected. A removed child leaves the upload set, and its positional draft and writer report are discarded, never reused for a different child. An unaffected draft is reused only with its existing, still-valid writer report. Only draft reuse is selective: every review round stays a whole-manifest review.
   - **A changed epic split** is re-frozen first: rewrite `epic-manifest.json` and the review input, which invalidates any clearance and proposed overrides bound to the previous digests. Rerun the structural check, and settle any new foundation finding in the epic hand-off procedure's Step 2b. Rerun a previously selected gap check using only the remaining run-wide ordinary-round, operator-fix, and confirmation capacity, resetting no budget. Rewrite a previously skipped check's skip record against the new digests without invoking a reviewer. If no permitted review capacity remains, use the existing explicit attended exception path or stop with the local artifacts. **Only under --auto:** follow "Stage 9 item 3 — Changed epic split" in the auto-mode procedure.

   **Load the post-create procedure (both modes, once, before the first `create_ticket` call).** Read `.bridge/procedures/define-tickets-post-create-procedure.md`, else `mcp_server/instructions/define-tickets-post-create.md` (Procedure lookup rule). It holds the materials pre-check and inputs and the real-key manifest write. If it cannot be read, follow Procedure read failure (`repair-assets`), then still create and track exactly as below, skip only the materials pass and the real-key manifest write, and warn for each affected key in the Final Report.

   Once the upload gate resolves with an explicit yes and, for an epic, the full clearance rule in the epic hand-off procedure holds, create exactly the approved set from the writer's drafts. Call `create_ticket` with `file_path` set to that entry's draft path, so the created description is identical to the file the materials pass reads. `create_ticket` prefers `file_path` over `description`.

   - **Siblings** — `create_ticket` per draft, unparented.
   - **Epic** — `create_ticket` with `issue_type` set to `Epic` for the parent first, capture the resolved epic key, then `create_ticket` with `parent_key` set to that key for each child in manifest order. The `parent_key` argument is required on every child call; never omit it.

   Create the tickets exactly as the outline named them — the split was decided and shown there, so do not create a different set than the user approved. If you now believe the split is wrong, say so and re-ask rather than changing it silently.

   **Track each ticket as you create it.** Immediately after each successful `create_ticket`, call `track_ticket` with that key and the ticket's description. See "Why track" in the post-create procedure.

   Tracking is **warn, not halt**: if `track_ticket` returns an error of any kind, record the reason for the final report and keep going. The ticket exists and is the thing that mattered; tracking can be repeated later.

   **Then gather and attach materials for each ticket.** For every ticket `create_ticket` created — the epic parent, each child, and each sibling — first inspect that ticket's assigned draft, then run the shared `gather-and-attach-materials.md` procedure only if the draft is not confirmed empty. This pre-check applies in both modes. The order per ticket is `create_ticket`, then `track_ticket`, then this pass, then the next ticket. The pre-check and, when needed, the procedure make up "this pass".

   **Materials pre-check and inputs.** Follow "Materials pre-check and inputs" in the post-create procedure for each ticket.

   Read `.bridge/procedures/gather-and-attach-materials-procedure.md`; only if that does not exist, `docs/install/gather-and-attach-materials-procedure.md`; only if that does not exist either, `mcp_server/instructions/gather-and-attach-materials.md` (Procedure lookup rule). Unlike the coherence procedure, an unreadable or missing procedure does not stop the run: warn that the materials pass was skipped, name the affected keys, and continue. For that procedure, follow Procedure read failure (`repair-assets`); the current pass stays warning/skip, and a later materials retry rereads the procedure after the repair. Never improvise a substitute pass.

   The pass is **warn, not halt**. An attach, delete, or provenance-update failure never halts the command and never changes a halt reason. A failed attach is not `create_failed`: that reason stays reserved for a failed `create_ticket` and a failed post-create write of `epic-plan.dag.json` or `epic-plan.meta.json`. Record each failure, with its key, for the final report.

   **On a partial failure, stop and report what exists.** First run the materials pass for every ticket that was created before the failure. Ticket creation is irreversible and there is no resume protocol here: report the epic key and every child key created so far, name the entry that failed, and tell the user to re-run naming the existing epic rather than repeating this command. Do not retry the failed call in a loop, and do not create the remaining children as though nothing happened — a half-built epic the user cannot see is worse than a stopped one they can.

   **Only under --auto:** follow "Stage 9 item 3 — Tracking and creation failures" in the auto-mode procedure.

   **Write the real-key manifest (epic only, advisory, after every child exists).** After the complete child-creation loop and every materials pass, and before the plan DAG step, follow "Real-key manifest" in the post-create procedure. It is warning-only: any failure, or a partial creation, writes nothing, adds a warning naming the epic key to the Final Report, and never halts. Never submit a placeholder key.

4. **Write the plan DAG.** Epic only: follow step 4 of the epic hand-off procedure. Siblings skip this step.

5. **Hand off once.** Epic only: follow step 5 of the epic hand-off procedure. Siblings skip this step.


This stage is non-blocking: if the user never answers, leave the doc as written in Stage 8 and stop without forcing a decision.

**Prompt budget.** An attended run has two ordinary stops on both paths, for an epic and for siblings alike: the requirements page and the upload gate. It has three when `define_tickets_plan_stop` is `ask`: the combined implications-and-plan stop is the third. Ambiguity-resolution turns, requested changes, and the existing typed exception paths do not add ordinary workflow gates. A switch to the full path owes no stop.

**Completion advisory (epic only).** Follow the section headed "Completion advisory — saved epic plans and tickets" in the epic hand-off procedure.

## Final Report

On successful completion of all stages, display:

> **Exploration Complete**
>
> **Prompt**: {first 80 characters of prompt}...
> **Output**: {full path to the exploration doc}
> **Requirements Page**: {full path to the generated requirements.html, or "not generated" when generation failed}
> **Acceptance Criteria**: {count} ratified ({count} corrected by the user, {count} still open)
> **Files Examined**: {count of key_files_examined}
> **Drafting plan**: {council option (before the design | review after the design | none, your choice)}{, review tool and scope when applicable}, gap check {run if epic | skipped}
> **Research**: {count of web_searches} web searches, {count of research_queries} deep research queries, design council {"before the design" | "review after the design (council)" | "review after the design (second opinion)" | "none, your choice"} (annotate a review that failed or that fell back, such as `failed - continued on my own design`, and never describe an unsuccessful review as completed; annotate sequential drafting as `drafted sequentially - parallel unavailable`)
>
> **Requirements**: {"Ratified" | "Unratified — page not submitted"}
> **Design**: {"Proposed" | "Not reached"}
> **Ticket(s)**: {"Created: KEY-1, KEY-2" | "Declined — doc and drafts are the artifacts" | "Not offered — work not ready"}
> **Tracking**: {"Registered" | "Warning: not tracked — {reason}" | "n/a — no tickets created"}
> **Materials**: {"No materials" | "Attached where eligible" | "Warning: {n} ticket(s) had attach failures — {keys}" | "Skipped — procedure not installed" | "n/a — no tickets created"}
> **Writer standard warnings**: {one item per entry with a warning, labelled with the entry (parent, child N, or sibling N): either that draft's `Ticket standard:` line and `Standard conflicts:` line exactly as the writer returned them, or, for a malformed block, the shared notice "Warning: the ticket-standard block for <entry> was malformed and ignored." with no fabricated conflicts line | "none"}
> **Manifest**: {"Written with real keys" | "Warning: epic {EPIC-KEY} manifest not written — {reason}" | "Skipped — child creation was partial" | "n/a — not an epic"}
> **Plan DAG**: {"<full path to epic-plan.dag.json> — saved on the Bridge server as authored version <N>" | "<full path to epic-plan.dag.json> — Warning: plan NOT saved on the Bridge server; retry: <exact retry command>" | "n/a — not an epic"}
> **Path**: {"short" | "full" | "full (switched from short: <trigger>)" | "n/a — --auto"}
> **Gap check**: {"<No gaps found | No gaps found (N notes added to tickets) | Accepted with known gaps | Needs your decision | Skipped — your choice | Couldn't check> — <full path to epic-coherence.json>" | "n/a — not an epic"}

**Only under --auto:** the report is outcome-first prose, naming the recommended drafting-plan option taken before the terminal JSON block, using these labels as they apply (the open-decision phrase warnings from Stage 9 go under **Warnings**, one line per match and entry-qualified, and they never change the terminal JSON or halt): **Warnings**, **Readiness follow-ups**, **Implications**, and **Recovery**. Report Requirements as `Proposed, unratified (--auto)`. Address warnings and follow-ups to the invoking operator or `$bridge-idea-to-pr` consumer. In prose, before the terminal payload, put standards-unavailable warnings, comp degradation and the design material needing manual review, council-cost notices, artifact paths, readiness follow-ups, untracked keys, materials-pass attach failures or a skipped pass (naming the keys), and recovery instructions. Also in that prose, give each retained `Ticket standard:` and `Standard conflicts:` warning pair, labelled with its entry as in the attended report. End with exactly one final fenced `json` block and nothing after it:

- Siblings: `created_ticket_keys`.
- Epic: `epic_parent_key` and manifest-ordered `child_ticket_keys`, without the parent.
- Halt: `halted: true`, `halt_reason`, and only that reason's fields. The halt reason is one of `too_vague | duplicate | open_requirements | max_children | epic_coherence | create_failed | stage_failed`. Reason fields: `too_vague` carries `readiness` and `scope`; `duplicate` carries `matches`; `open_requirements` carries `open_items`; `max_children` carries `child_count` and `max_children`; `epic_coherence` carries `coherence_verdict` and `coherence_record`; `stage_failed` carries `failed_stage` and `reason`.
- `create_failed`: `halted: true`, `halt_reason`, `created_keys`, and `failed_entry`.

A halt payload never carries the success key fields. Duplicate matches never count as keys created in this run. Every auto stop, including Stage 0 and a missing shared procedure file, uses this contract.

On failure at any stage, stop immediately and report:
- Which stage failed (by number and name)
- The error details
- Any partial results that were produced before the failure, including every per-draft `Ticket standard:` and `Standard conflicts:` pair already retained
