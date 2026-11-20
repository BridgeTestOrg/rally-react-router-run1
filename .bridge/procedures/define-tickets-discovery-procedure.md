# `/define-tickets` discovery procedure

`/define-tickets` reads this procedure at the start of Stage 1, in attended and `--auto`
runs alike. It holds the detail for exploring the codebase, researching unknowns,
framing the acceptance criteria, the Stage 4 document skeleton, and the six
signals Stage 6 assesses to recommend the drafting plan. The command keeps inline the Stage 1 stop rule and
path choice, the canonical NFR categories, the `SCOPE-1` scope question, every
`--auto` pointer, and every halt. Each section below is followed at its pointer in
Stages 1 to 3. Step numbers inside a section match the command's item numbers.

## Stage 1 items 1–6 — Explore

1. **Analyze the prompt** to identify which areas of the codebase are relevant: route files, agent flows, database models, library utilities, LLM integration, MCP server, unit and E2E suites, etc.

2. **Search for files** matching patterns related to the task (e.g., `api/routes/**/*.py`, `src/python/llms/agents/**/*.py`, `db/models/*.py`).

3. **Search for content** — relevant function names, class names, patterns, and keywords across the codebase.

4. **Read the most relevant files** in detail — understand existing implementations, conventions, and patterns that relate to the task.

5. **Build a mental model** of:
   - What exists today that relates to the task
   - What patterns and conventions are used in similar features
   - What dependencies, data flows, and integration points are involved
   - What gaps or unknowns remain that need external research
   - Whether there is an established precedent for this kind of work, or none at all — Stage 7 depends on this judgement

Explore to understand the problem and its constraints. Resist designing a solution while you read — you do not yet know what the system is required to do, and Stage 8 is where the design gets written.

6. **Track all significant files** examined in `key_files_examined`.

## Stage 1 item 7 — Choose the path

7. **Choose the path (attended only).** Under `--auto`, skip this item: there is no path, so set `run_path` to `auto`. In an attended run, decide whether the run takes the short path or the full path, using the evidence from this stage and the Attended path contract above.
- **Short path** only when all three hold: the work is likely 1-2 implementation tickets; an established precedent exists in this codebase for this kind of work; and the work touches none of the forced-full areas.
- **Full path** whenever any of the three conditions is unmet or you are unsure. Uncertainty always resolves to full.
- **The five forced-full areas:** security/auth; data model or migrations; billing; public API or MCP tool contracts; irreversible operations.
- If the owner asked for the "full path" earlier in this conversation, honor that request in this initial selection.
- Announce the choice in one line with its reason, for example `Path: short — one ticket, follows the existing <precedent>, no forced-full area.` or `Path: full — touches billing.` Record it in working state as `run_path` (`short` or `full`) and keep `escalated` as `false`. The owner can say "full path" at any point; see Switch to the full path in Stage 6.

## Stage 2 — Research unknowns

Based on gaps identified in Stage 1, decide what research is needed. Apply these decision rules:

- **No research needed**: The codebase exploration answered all questions. Skip directly to Stage 3.
- **Web search**: For quick factual lookups — library API signatures, configuration syntax, small "how to" questions. Examples: "FastAPI dependency injection with custom headers", "Alembic batch migration syntax". Do web searches inline and capture relevant findings.
- **Deep research** (via `request_deep_research` MCP tool): For large, multi-faceted unknowns that require synthesizing information from multiple sources. Examples: "Best practices for implementing WebSocket connection pooling in Python asyncio", "Tradeoffs between different approaches to real-time notification delivery in FastAPI applications". Only use deep research when the question genuinely needs a multi-source investigation.

**If deep research is needed:**

1. Call `request_deep_research` with `wait_for_result` set to `true`, `save_locally` set to `true`, a descriptive `query`, and `context` describing the Bridge API tech stack and the specific task.
2. If deep research fails, note the failure and fall back to web searches for the same topic. Do NOT halt the pipeline.

Track all research performed in `research_queries` and `web_searches`.

## Stage 3 items 1–2 — Frame and criteria

1. **State the frame plainly (required).**
   - **Business goal** — the value this work delivers and why it matters.
   - **Desired end-state** — the concrete state the system should reach once this work is done.
   - **System behavior** — how the system must behave to complete its task (the quality attributes in prose, not a feature list).

2. **Derive the acceptance criteria — what the system must do (required).** Write 3-8 criteria. Each one gets:
   - An `id` (`AC-1`, `AC-2`, …).
   - A `criterion` — a single obligation stated concretely enough to be checked. Write it as observable behavior ("an operator who revokes a key sees the next request rejected"), not as a task ("add a revocation endpoint").
   - A `verification` — how we would confirm it holds. Name the observable signal: a response code on a specific route, a row state, a log line, a rendered element, a user-visible outcome. **A criterion nobody can check is not yet a criterion** — sharpen it or drop it.
   - A `status`, using the rubric in step 4.

   Cover the failure and edge behavior, not just the happy path. If the work changes something that already exists, at least one criterion should pin down what must **not** regress.

## Stage 3 items 4–6 — Classify, questions, and tensions

4. **Classify every acceptance criterion and every NFR** with this rubric: `confirmed` only if explicitly stated or observable in code; `assumed` only if a low-risk, reversible default; `open` if it touches architecture, the data model, security, user-visible behavior, migration, or irreversible creation and is not settled. When a criterion or an NFR is genuinely unclear, prefer marking it `open` and asking. Clear criteria make everything downstream more accurate, so surfacing an unclear one is a success, not a delay.

5. **Frame the open requirement questions.** Where a requirement is unsettled **and** has discrete candidate answers, express it as a question the user can answer by clicking (e.g. "Must revocation take effect immediately, or is eventual acceptable?"). These become cards in Stage 5. They are questions about *what the system must do* — never about how to build it. If a question has no discrete answers, leave it as prose in the doc instead.

6. **Sanity-check the frame against itself.** Do any two criteria conflict? Does a criterion conflict with an NFR (e.g. an auditability requirement against a latency budget)? Note every tension you find — Stage 7 treats these as a council trigger, and Stage 8 must resolve them explicitly rather than quietly favouring one side.

## Stage 7 item 1 — The six signals

Stage 6 item 5 assesses these signals to recommend the drafting plan; Stage 7 runs only the plan Stage 6 recorded.

1. **The six signals.** A signal fires when **any** of these hold:
   - More than one materially different approach could satisfy a criterion, and the codebase evidence you gathered cannot separate them.
   - A criterion has no obvious implementation path in the existing code.
   - Meeting one criterion appears to trade off against another criterion or against an NFR (any tension noted in Stage 3 step 6, or created by a correction in Stage 6).
   - The work touches an area with no established pattern — Stage 1 found no precedent to follow.
   - Ratification materially changed the problem — the user tightened a bound, rejected a criterion, or added an obligation you had not framed.
   - Stage 2 research surfaced competing approaches with no clear winner.

   No signal fires when every ratified criterion maps cleanly onto a well-trodden pattern already used in this codebase and you can point to the precedent.

## Stage 4 — Document skeleton

Write the exploration document with this structure. The command adds the attended `## Decisions made for you` section after it.

```markdown
# Exploration: {concise summary of the prompt}

**Date**: {current date}
**Prompt**: {original prompt text}
**Status**: Requirements drafted — awaiting ratification (under `--auto`: Requirements proposed, unratified)

## Context

{Brief description of the task and what areas of the codebase are relevant. Attended only: the chosen path (short or full) and the reason from Stage 1; add any later switch to the full path with its trigger. Under --auto, omit the path.}

## Acceptance Criteria

{The criteria from Stage 3 — what the system must do. One entry per criterion: its id, the criterion itself, how it is verified, and its status (confirmed / assumed / open).}

## Goals & NFRs

{The business goal, desired end-state, and required system behavior from Stage 3. Then the non-functional requirements — the standards the system must meet: each with its category, requirement, implication, and status (confirmed / assumed / open). Note any tension between criteria or between a criterion and an NFR.}

## Ticket Scope

{Attended only: the proposed implementation-ticket count, its rationale, each ticket's approximate responsibility, and the alternatives for SCOPE-1. Mark it proposed until explicitly agreed; disclose any additional epic parent. Under --auto, omit this section.}

## Open Questions

{Requirement questions that are still unsettled. Mark which ones are going onto the decision page as cards and which are open-ended prose.}

## Codebase Findings

{Key discoveries from Stage 1, organized under the four stop-rule categories: the affected behavior, the files to change, the relevant callers and tests, and the risks. Name each with concrete file_path:line_number citations, and note the precedent to follow. Also note what exists today and which patterns are used.}

## Research Findings

{Findings from web searches and deep research, if any. If no research was performed, state "No external research was needed."}

## Key Files

{Bulleted list of the most important files examined, with one-line descriptions of their relevance.}

```

## Return

Go back to the `/define-tickets` pointer that sent you here and continue from that
point. This procedure adds no stop, no halt reason, and no terminal field.
