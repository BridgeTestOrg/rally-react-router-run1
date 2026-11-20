# Bridge ticket-authoring posture

Bridge has several surfaces that can create a ticket, and `/define-tickets` is the
single entry point for creating them. Without a shared posture
each one behaves differently, and the most-used surface carries none of the
maintainer's preferences at all. This document is the deep reference behind the
short posture block that every one of those surfaces carries verbatim.

The block itself is short on purpose — it competes for attention inside prompts
that are already long. Everything that explains *why* lives here.

## The canonical block

This file **is** the canonical source. The marker-delimited block below is
duplicated byte-identically onto every carrier — every surface that decides
ticket shape holds these exact bytes, so no surface can quietly drift into its
own house style.

Carriers (all four hold the block verbatim):

- `agents/src/jira-ticket-writer.md` — the writer itself, plus a compressed
  posture line in its `description:` frontmatter, which is the only coverage a
  bare-chat session gets with no file read and no `tools/list` cost.
- `commands/src/define-tickets.md` — Stage 9, the most-used authoring surface.
- `mcp_server/instructions/decompose-epic-candidate.md` — the `idea-to-ticket`
  decomposition step.
- `mcp_server/instructions/decompose-epic.md` — the `plan-epic` decomposition
  step.

Edit the block here, copy it verbatim to each carrier, and let
`tests/pytest/mcp_server/test_ticket_authoring_posture_assets.py` prove it
landed. That test permits **no** per-surface variation.

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

## Open-decision phrases

A ticket body states settled facts. An unsettled choice that is needed to define
or authorize the work belongs in the writer's reply, in the terminal
`open-questions` block, and never in the ticket body. A validated `open-questions`
block is the authority. The phrase list below is only a backstop: it flags body
text that still reads like a request to settle a decision.

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
- Report one warning per matching line, not one per phrase. Quote from the start
  of the sentence that holds the line's first match through the end of the line.
- A phrase match is an advisory signal for a person to review. It never halts
  drafting, never hides an upload gate, and never refuses a launch.
- Keep the full list out of routine reports. Report only the matching lines.

Carriers (`commands/src/define-tickets.md`, `commands/src/draft-ticket.md`,
`.claude/commands/write-ticket.md`, `mcp_server/instructions/draft-and-critique.md`,
and `mcp_server/instructions/render-ticket-manifest.md`) quote the marked list and
these semantics exactly. `tests/pytest/static/test_open_decision_phrases_parity.py`
proves they match.

The rest of this document is the rationale the block is deliberately too short to
carry.

## Decision: Jira ticket authoring ships through the Jira Ticket Writer (BAPI-900)

Bridge ships two very different kinds of ticket-authoring surface, and customers
need to know which one they actually have.

**Shipped customer surface.** A customer project gets the `jira-ticket-writer`
agent — the same writer this posture requires every ticket body to go through —
plus the agent-directed capability to revise an existing ticket's description.
Ask your agent to draft a ticket with the Jira Ticket Writer, and ask your agent
to update an existing ticket's description when it needs revising. Both reach a
customer project because they are packaged: the writer through `AGENTS`
(`mcp_server/src/agents.generated.ts`) and the description-update path through
the registered `update_ticket_description` / `request_ticket_update` MCP tools.

**Repository-local workflows.** `.claude/commands/write-ticket.md` and
`.claude/commands/update-ticket.md` are bridge-api's own repository-maintenance
commands. They are **not** scaffolded into a customer project by `--init`, have
no `commands/src/` source, and have no generated Cursor or `mcp_server/`
mirror — deliberately, not by omission. A customer asking their agent to run
the write-ticket or update-ticket slash command will not find either one,
because neither ships.

**Why (Option B, not a promotion to shipped status).** The Jira Ticket Writer is
already the packaged drafting surface this posture mandates, so shipping
`write-ticket.md` as a second drafting entry point would duplicate it. More
importantly, `write-ticket.md` is today an autonomous, single-ticket, no-halt
pipeline ("No human confirmation gates — run end-to-end") with no decomposition
step and no approval gate — it cannot honor the "group at three" epic rule or
the epic approval gate this posture requires, because it was never built to
propose an epic at all. Promoting it to a shipped surface without that redesign
would ship a customer-facing command that silently violates this file's own
posture. Until that redesign happens, `write-ticket.md` and `update-ticket.md`
stay repository-local, and every packaged surface directs customers to the Jira
Ticket Writer and to agent-directed description updates instead.


## The four rules

### 1. Draft through `jira-ticket-writer`

Every ticket body is drafted by the `jira-ticket-writer` agent before
`create_ticket` is called — an epic parent, an epic child, and an ordinary
sibling alike. Nothing composes a ticket description inline.

The writer is not a formatter. It runs a codebase-research pass first, so its
tickets cite the files, functions, and extension points a change actually
touches. A description written inline skips that pass, and the difference shows
up two steps later: plan generation and implementation both ground themselves in
the ticket body, so a body with no code references produces a plan with no code
references.

"The ticket is already well specified" is not a reason to skip the writer. A
well-specified *request* is the writer's input, not a substitute for its output.

### 2. Size toward L

Size each ticket by file-touch breadth and depth plus rough lines of code
changed:

| Band | Files | LOC |
| --- | --- | --- |
| `S` | 1–2 | `<~80` |
| `M` | ~3–8 | ~80–400 |
| `L` | ~8–15 | ~400–900 |
| `XL` | >15 | `>~900` |

Priority: **L (target) → XL (when the work does not fit in L) → M (third choice)
→ S (only when unavoidable)**.

The target is L because the Bridge implementation tooling works best on
independently implementable vertical slices. What matters as much as the target
is the **direction you move when a slice misses it**: upward, not downward.

A slice that will not fit in L becomes **one XL ticket**, not two L ones. Split
only when the slice is genuinely two independent pieces of work — never merely to
land inside a band. Fragmenting a coherent slice to fit is the failure this
ladder exists to prevent: every extra ticket is another worktree, another PR,
another rebase, and another chance for two workers to touch the same file, and
Bridge's grooming process is overkill on small tickets. Fewer, larger slices
spend less of the run's budget on coordination.

This applies equally to a standalone ticket and to an epic child. There is no
size ceiling on a child that a lone ticket does not also have.

`M` is where you land when the work genuinely is three to eight files — not
somewhere to retreat to in order to avoid an XL. `S` is likewise not forbidden:
it is simply what you reach when the work genuinely is one or two files. A
single-file trivial fix is `S` arrived at through the normal path. It is not an
exception to anything, and it does not license skipping the writer.

**Beyond roughly 40 files or ~3000 LOC, split anyway.** XL is the preferred
overflow, not an unbounded one. Past that point review turnaround and rebase cost
dominate the run's budget, and a review that wedges holds the gate to its full
retry ceiling before anyone notices. That is a real bound, not a preference — and
it is high enough that reaching it means the work really is two things.

### 3. Group at three

Three or more implementable tickets is an epic. The surface proposes an epic
parent plus an **ordered child manifest**, and resolves its own approval gate
before anything is created.

One or two tickets are ordinary siblings: no epic parent, no manifest. The
threshold is exactly three — not "several", not "a lot".

The manifest carries, per child: the boundary of its scope, its size band,
`depends_on` (hard prerequisites that must land first), `recommended_after` (soft
sequencing preferences that are not blockers), and a one-line order rationale.
Hard prerequisites and soft sequencing stay strictly separate, because the
recommended implementation order is derived from them and conflating the two
produces a serialized order where a parallel one was available.

**The epic body carries the manifest in one fixed shape.** The epic parent holds a
single `## Ordered child manifest` section. Each child is one compact line, with
comma-separated hard prerequisites and an explicit `depends_on: none` for a child
with none:

```markdown
## Ordered child manifest

- BAPI-101 depends_on: none
- BAPI-102 depends_on: BAPI-101
- BAPI-103 depends_on: BAPI-101, BAPI-102
```

Until every child exists, the section holds one fixed pending line,
`- pending: child keys are written here after the children are created.`
`/define-tickets` replaces it only after every child exists, using real child keys
and never a placeholder. Updates are built from the Markdown the command retained
locally; text fetched from Jira is read-only. If the write is unavailable, the
command warns in its Final Report and the handoff continues. The pending line is
intentionally unreadable as a manifest, so the plan falls back to ascending
ticket-key order.

Approval follows each surface's **existing** attended/unattended rule. Nothing
here introduces a new gate policy: `/define-tickets` requires an explicit
affirmative because creation is irreversible, and the recipe path gates on the
pipeline's own auto-approval variable. What is *not* conditional is the grouping
itself — an unattended run still produces the epic; only the gate's behavior
varies.

Decomposition happens **once**. The pass that decides the split freezes the
manifest; body rendering then fans out one writer invocation per entry against
that frozen manifest. A rendering invocation may not re-split, merge, reorder,
renumber, or rescope. Two independent decisions about the same split disagree,
and the disagreement surfaces as children that overlap or contradict their
parent.

### 4. Hand off to exactly one conductor

An epic handoff names exactly one conductor entry point: `drive-epic`.

Bridge currently has two conductors — the v2 server-side engine and the LLM
conductor pilot — and a standing rule that they must never operate on the same
epic, because two transition authorities on one epic wedge it permanently. Asking
a model to pick correctly every time is not a control. `drive-epic` makes the
choice structural instead: it reads conductor readiness and routes to the one
path the project can actually run, so no prompt names either underlying conductor
and no prompt can present both.

Two conductors is a transitional state. When one is eliminated, `drive-epic` is
the only thing that changes — no prompt, bundled doc, command mirror, or posture
test moves.

## Epic coherence check before creation

Before an epic's tickets are created or its plan approved, its children are
checked **as a set** against the epic's own acceptance criteria. The check asks
whether every epic criterion has a child that carries out its verification, and
whether each cross-child hand-off is owned at both ends. It runs through one
shared procedure, [`review-epic-coherence.md`](../mcp_server/instructions/review-epic-coherence.md),
which writes `epic-coherence.json` (the record) and `epic-coherence.md` (a short
summary) beside the frozen manifest.

**Where it runs.** Four call sites run the check:

- `/define-tickets` Stage 9 (attended) — after the epic split is frozen, before
  drafting and the upload gate.
- `/define-tickets --auto` Stage 9 (unattended) — after the split is frozen and
  capped by `--max-children`, before any writer runs. It has no upload gate: an
  independently cleared record is what allows creation.
- `idea-to-ticket` (the still-bundled legacy recipe) — in the Epic path of
  `upload-and-track.md`, after `decomposition-plan.json` and before rendering and
  the external approval gate. `/idea-to-pr` no longer runs it: it reaches the
  coherence check through `/define-tickets` Stage 9 under `--auto`.
- `plan-epic` — in `decompose-epic.md`, after the plan artifacts are written and
  before the decomposition is presented for approval.

Every decomposition pass fills in each child's `owns_verifications`: which epic
criterion it proves, and the concrete part of that criterion's verification it
carries out. When a criterion is proven by an owner-run step a person runs
outside the conductor — a release-checklist step, say — the pass declares a
`non_child_owners` entry naming who runs it, the step, its verbatim text, and
where the result is recorded, instead of forcing a child to own it. Owner-run
owners count toward coverage only; hand-offs stay child-owned.

When one child adds a value or placeholder test that another child reads or changes, state the shape the consumer needs. An epic-wide "existing assertions stay unchanged" criterion never covers a placeholder assertion added by an earlier child; the child retiring the placeholder owns its wind-down.

**The render preflight.** `render-ticket-manifest.md` refuses to render an epic
unless the record exists beside the manifest, all three of its digests
(`manifest_sha256`, `child_evidence_sha256`, and `non_child_owners_sha256`) match
what is being rendered, those digests equal the last reviewer round's, and
its verdict is `pass`, `accepted_with_gaps`, or `not_checked` with a recorded
bypass. A missing record, a mismatch, `blocked`, or an un-bypassed `not_checked`
stops the flow before any writer runs or any ticket is created. `/define-tickets`
states the same rule in its own creation step.

**Attended runs: fix or accept, at one gate.** The gate comes after the drafts
exist. Each remaining blocking finding is either fixed — the manifest is amended, re-frozen, and checked again — or
accepted with a non-empty reason, which is recorded and turns the verdict into
`accepted_with_gaps`. The fix budget is bounded: after the first confirmation
pass, the operator may direct one fix and one further whole-manifest
confirmation pass, counted across re-runs in the same attended `/define-tickets`
run. After that, a blocker is accepted or stays `blocked`.

`/define-tickets` runs its optional checks in a fixed order: design and split,
including any after-design review; the gap check, when the drafting plan calls
for it and the work is an epic; one writer draft per ticket, all started at once
where the host can run them in parallel; then one upload gate. The gap check
never runs after drafting. Before the writers start, an attended run checks the
record more narrowly than full clearance: the only items it may leave uncleared
are foundation gaps listed under `Known gaps that will be recorded on the epic`.
Each is a pending acceptance, held in working state with its finding, its
agent-drafted reason, and its round. Nothing is saved as an operator acceptance
before approval, and the full clearance rule still applies before the first
ticket is created.

The upload gate shows, in plain words, the gap-check result, who covers each
requirement, the plan outline, the chosen drafting-plan policies, any review
failure, the known gaps with their pending acceptances, and the path of every
completed draft. The closing question is
`Upload these N drafts to Jira? (yes / change something)`, or its singular form.

Upload is authorized by clear intent, not by an exact word. A clear "yes" or
"go ahead" authorizes uploading the displayed drafts and records exactly the
displayed pending acceptances. It never changes the split and never spends the
fix budget. Every unresolved gap keeps creation blocked. Empty, negative,
ambiguous, and mixed replies upload nothing; if the operator declines, the
exploration document and the drafts directory are the artifacts. Changing an
item, a target, a recommendation, or a reason means the affected drafts are
redone and the gate is shown again. A changed requirement or goal goes back
through requirements and the drafting plan instead.

**Implications, then the drafting plan.** After requirements are ratified,
`/define-tickets` Stage 6 shows the implications review and the recommended
drafting plan together in one output-only message, on the full and short paths
alike, and then continues without waiting (BAPI-1768). If the review is
unavailable, the message says so at the top. The plan recommends a council
before the design, a review after the design (a council, or a second opinion for one or two separate
questions), or no council, and it records the gap-check policy for a possible
epic. A paid review in the plan runs because the message states it with its
credits first. Choosing a council option also covers the later review of how an epic's
tickets are split, so that decision is not asked again. Unattended runs take the recommended option
and keep the epic gap check required. The attended flow has two ordinary stops
on both paths: the requirements page and the upload gate. A per-repository
setting, `define_tickets_plan_stop`, will restore one combined implications-and-plan
stop when set to `ask`; until that setting is read, every run is automatic.
Every decision the agent makes after ratification is recorded in the exploration
document's `## Decisions made for you` section and shown at the upload gate,
where the owner can reverse it before anything is created. See
[the short-path decision record](BAPI-1660-define-tickets-short-path.md) and
[the BAPI-1768 record](BAPI-1768-define-tickets-leaner-command.md).
The initial high-risk coherence council is offered
by the shared procedure itself, in an attended run, after the epic is classified
high risk and before round 1, with its cost and a recommendation. Declining it
is final: the record stores `council_outcome: "declined_by_operator"`, shows
`Council: skipped, your choice`, and needs no `accept` override. A legacy
override that targets `council: "declined_by_operator"` stays valid and is
ignored for clearance. Declining a council offered for an uncertain or disputed
finding is also final for that council decision, but the finding stays blocking
until it is amended or accepted. An unfinished required council still needs an
attended acceptance that names its `council_id`.

**What counts as high risk.** Six or more children, or one child editing
`db/alembic/`, `db/migrations/`, `api/library/billing/`,
`api/routes/setup/auth.py`, or `api/library/auth/`. A child editing
`api/library/db/` or another executor-containment path is high risk only when at
least two distinct children edit such paths; the procedure's case table is the
single statement of this rule. Reads never count. A lone such child still gets
the low-risk reviewer rounds, is promoted to high risk if a blocking finding is
uncertain, and reaches the upload gate with any remaining blockers.

When the reviewer cannot run, the verdict is `not_checked`. The operator can
retry, or bypass with a typed reason. A bypass is recorded, and the verdict stays
`not_checked`; it is never shown as a pass.

**Unattended runs: the risk-scaled round limit, then halt.** An unattended
`idea-to-ticket` run or `/define-tickets --auto` run amends and re-checks within maximum ordinary rounds: two for a low-risk epic and three for a high-risk
one, ending early when a round has zero foundation blockers. If a foundation blocking finding remains, it halts with `blocked` before any ticket is
created. A fix made after the last round gets one confirmation pass. An unavailable reviewer, or a check
that could not run independently, halts with `not_checked`.

Unattended runs have no bypass; an operator who needs one reruns attended.
`/define-tickets --auto` follows the same rule.

**Siblings skip it.** A one- or two-ticket outcome runs no check, writes no
record, and costs nothing extra. The residual risk — a pair that really needed a
set-level check — is contained by the existing manifest-identity and
writer-draft gates. If the work is really epic-shaped, regroup it as an epic
before creation. `plan-epic` is the one exception: the epic already exists, so it
checks even a one- or two-sub-task decomposition.

**What lands in the tickets.** Each epic child carries its obligations verbatim
as acceptance criteria. The epic parent carries a `## Epic coverage map`
section: the verdict, one bullet per epic criterion naming its owning child and
obligation, and any accepted findings or bypasses with their reasons.

## The closed exception list

Exactly three exceptions permit departing from the rules above. Invoking one
requires **no announcement** — the departure is silent by design, because a
mandatory announcement would be one more instruction to drift from, and the cost
of silence was weighed and accepted.

| Id | Exception | Objective trigger | Bypasses |
| --- | --- | --- | --- |
| **E1** | External-tracker mirroring | A recorded upstream identifier exists and its granularity is contractual | Sizing and the epic threshold |
| **E2** | Discovery-only spike | No committed production-code deliverable | Sizing only — **not** drafting through the writer |
| **E3** | Authorized incident containment | Tied to an active incident record, not to schedule pressure | Sizing and the epic threshold |

Each trigger is objective: an identifier that exists, a deliverable that is
absent, an incident record that is open. None of them is a judgement about how
the work feels.

### The list is closed

Anything outside the three rows above is an **escalation to the operator**, not a
judgement call. The following are explicitly refused as grounds for departure:

- a single-file trivial fix — that is `S` reached through the normal path;
- generic time pressure;
- "the request is already well specified";
- "it would be faster without the writer";
- developer discretion;
- "it's just a minor refactor";
- running unattended;
- context limits;
- "this is hard to decompose" — XL is the normal overflow, so that is the
  ordinary path and not a departure.

**Writer unavailability escalates.** It never silently authorizes inline
drafting. A surface that cannot reach `jira-ticket-writer` stops and says so.

## The spike ticket format (BAPI-986)

A spike ticket defines a finding to be produced, not code to be written, so it
gets its own body shape. This is a second **format**, not a fourth exception:
the writer still drafts it, the sizing ladder still applies, and E2 still governs
whether the posture's sizing rule is bypassed at all.

### Who chooses, and on what

The run manifest's `scope` chooses, and it is resolved once, upstream, in
`mcp_server/instructions/preflight-and-readiness.md`. The writer receives that
value and never decides it. Only `scope: spike` selects the spike format.

The trigger is E2's exact objective condition — **no committed production-code
deliverable**. A deliverable that is absent, not a judgement about how the work
feels. Every other case produces the ordinary code-ticket format:

- `scope: task` and `scope: epic_candidate`;
- a missing scope value;
- a malformed or unrecognized scope value;
- a standalone writer invocation with no resolved spike scope;
- any ambiguity.

Code is the default **in code, not in prose**: it is what every unresolved path
already produces, so no one has to remember a rule to get it.

### The five body sections

A spike draft's substantive body is exactly these five, in order:

1. `## Question` — the single question the investigation must answer.
2. `## Scope` — the systems, code paths, data, and behavior in bounds.
3. `## Out-of-scope` — what it will not examine, stated explicitly.
4. `## What the findings must answer (the deliverable)` — names an inspectable
   findings artifact at a specific repository path, and states what that artifact
   must contain: the decisions it settles, the evidence it cites, the
   recommendations it makes, and the unresolved risks it records. This is the
   spike's analogue of Acceptance Criteria — a reviewer holds the finished
   artifact against it to tell whether the spike is done.
5. `## Which related tickets consume the finding` — names real consumer tickets
   by key, or the literal `none yet`. Never an invented key.

Those five are the spike-specific **body** sections. They are not the whole
draft. The following remain mandatory structural metadata, identical to a code
draft, and are not additional spike sections:

- the `# [Title]` heading;
- the execution-class marker line (below);
- a `## Regression Completeness Notes` block when the gated regression pass
  applies;
- the trailing `## Materials & Access` section, always last.

The code-ticket structure — Summary, Requirements, Acceptance Criteria,
Materials & Access — is unchanged, and a code draft carries no execution-class
marker.

### The execution-class marker

A spike draft carries exactly one canonical marker line, alone on its own line,
immediately after the title and before `## Question`:

```markdown
# [Concise Title Describing the Investigation]
<!-- bridge:execution-class=investigation -->

## Question
```

It appears **exactly once**, never in a code-format ticket, and never
illustratively inside a generated ticket body — not in prose, not in a fence,
not in backticks. Duplicates do not reinforce it: a second occurrence makes the
description ambiguous and the parser discards the whole thing, leaving no signal.

**It renders as visible text.** Bridge converts the description from Markdown to
Atlassian Document Format, and ADF has no comment node, so the marker becomes one
visible line in the Jira description rather than a hidden comment. The exact
token survives conversion and stays parseable from the stored description, which
is what it is for. The placement immediately after the title is therefore an
editorial choice as much as a parsing one.

**It is a weak hint.** One non-authoritative input alongside the existing weak
Jira issue-type signal. It never overrides the five-way ticket-type
classification and never bypasses a human gate. A classifier verdict that
contradicts it wins, and the disagreement is reported rather than reconciled.

The marker's shape lives in exactly one runtime place —
`parse_execution_class_marker` in
`src/python/llms/agents/planner_agent/ticket_evaluator/execution_class_marker_utils.py`,
which imports the `code`/`investigation` vocabulary from BAPI-980's constants in
`api/models/epic_run.py` rather than redeclaring it. The literal in this document
and in `agents/src/jira-ticket-writer.md` is pinned against that runtime constant
by test, because Markdown cannot import a Python value.

### The marker survives to the ticket record

The single-ticket path creates the Jira issue from `slim_description`; the full
draft is only an attachment. A marker preserved solely in the attachment would
leave the ticket record with no signal at all. Two rules close that:

- `mcp_server/instructions/draft-and-critique.md` carries the title and marker
  into `slim_description` in their original order, exactly once, and exempts that
  one literal from the forbidden-raw-HTML hygiene rule that would otherwise strip
  it. A `task` draft has no exemption, and slimming must not synthesize a marker.
- `mcp_server/instructions/upload-and-track.md` passes `slim_description`
  unchanged as `create_ticket`'s `description`, without stripping, reconstructing,
  relocating, duplicating, or validating the marker.

`create_ticket` gains no execution-class parameter and the MCP tool schema is
unchanged: the marker rides in `description` and nowhere else.

### Post-creation marker loss is out of scope

A later description rewrite can drop the marker. `ticket_store_lib.update_ticket`
forwards a full replacement description and the Jira backend re-renders all of it
through `render_adf`, so anything a rewrite omits is simply gone — there is no
merge. Preserving the marker across rewrites would mean auditing every
description-rewriting surface, which is excluded here.

This is a named, owned gap rather than an unstated one: preservation belongs to
the downstream slice that enables investigation routing. No local design record
names that slice yet, so its ownership is recorded here as an unresolved
downstream discovery rather than assigned to an invented slice name.

## The plan-route marker

A code-format ticket whose requested changes are entirely test code or test
tooling may declare its plan route with one marker line:

```markdown
<!-- bridge:plan-route=test -->
```

The runtime owner of the literal is `plan_route_marker_utils.py` in
`src/python/llms/agents/planner_agent/ticket_evaluator/`
(`PLAN_ROUTE_MARKER_TEMPLATE`); the writer copies it, never redefines it.

### Writer rules

- **Scope.** Stamp it only when all requested work is test code or test tooling:
  tests, flaky-test fixes, fixtures, fakes, harnesses, test configuration,
  runners, development/test dependencies, test-running CI workflows, and
  documentation about those tests.
- **Placement.** Exactly once, alone, immediately after the title line.
  Otherwise stamp nothing and let the classifier decide.
- **Test only.** The writer never authors an `implementation` or `bug`
  declaration, and never puts a plan-route declaration on a spike draft.
- **Never illustratively.** The marker does not appear anywhere else in a
  generated ticket body.

### Parser validity is broader than writer placement

The parser accepts one canonical literal alone on an unfenced, unindented line
anywhere in the body. A malformed, inline, indented, fenced, or duplicated
occurrence is no declaration.

### Consequences

Jira renders the marker as one visible line. Unlike the weak-hint
execution-class marker, a valid plan-route declaration **binds** plan routing.
Misused on production-code work, planning fails visibly, and ticket review
recommends a split or removal of the declaration (the critic's
`Split recommended (unrelated test changes):` finding). The marker and the
spike-only execution-class marker are the two limited exceptions to the
no-raw-HTML and `{placeholder}` output rules.

## Residual risks and their operational contracts

Four limitations ship with the spike format. Each is stated as detection,
containment, and escalation, because a residual-risk note without those three
reads as coverage while providing none.

### Incorrect E1/E2/E3 invocation

- **Detection**: manual ticket review only. There is no log, counter, or report
  (see the accepted trade-off below).
- **Containment**: the objective selection rule — any ambiguity produces a code
  ticket — plus the marker's non-authority over classification and every human
  gate.
- **Escalation**: suspected misuse goes to the authoring-workflow owner.

### Class observability does not cover departure invocation

The marker makes a spike's intended execution **class** observable. It does not
make E1/E2/E3 posture-departure **invocation** observable; that remains silent by
accepted design, and the accepted trade-off below is unchanged by this slice.

- **Detection**: none for invocation, by design. Ticket review is the only signal.
- **Containment**: the closed exception list itself — anything outside those
  three rows is an escalation, not a judgement call.
- **Escalation**: the authoring-workflow owner, as above.

### Premature routing on the marker

Marker-bearing tickets exist before any consumer does. Nothing routes on the
marker yet, and the guard for that is **structural, not a feature flag** — no
such flag exists, and naming an imaginary control would be exactly the failure
the accepted trade-off below warns about.

- **Detection**: the absence of any marker reader outside the parse/normalize
  helper and the disagreement observer. A static test pins that set, so the first
  premature consumer fails at review time.
- **Containment**: BAPI-980 seeds every run node `execution_class = 'code'` and
  exposes no caller-controlled `investigation` override anywhere — not on the DAL
  seed signature, not on a Pydantic request model, not on an MCP input. No code
  path writes `investigation`.
- **Escalation**: any proposal to consume the field in runtime conductor behavior
  goes to the Conductor owner before implementation, per BAPI-980's decision D10;
  any discovered marker-based routing is a release-blocking regression on that
  same path. Enabling investigation routing belongs to the downstream epic
  rollout owner, once the complete path and its human gate exist.

### Marker/classifier disagreement

- **Detection**: the reserved structured-log event
  `ticket_classification_event=execution_class_marker_disagreement`, emitted at
  warning level when an investigation marker meets a code-facing classifier
  verdict. Every `evaluate_ticket_type` entry point compares, so the signal
  covers the ordinary Bridge classification path and not only the estimator
  backfill; a cached verdict is not a classification and is not compared.
  Persistent or high-volume disagreement is surfaced by querying that reserved
  key through the existing logging/Sentry workflow.
- **Containment**: the comparison is non-authoritative. The classifier verdict is
  persisted and returned exactly as produced, whether or not an event fires.
- **Escalation**: the event is **diagnostic-only** and the Bridge platform team
  owns it operationally. No alert rule, threshold, or paging behavior ships with
  it; that is net-new work belonging to the slice that enables routing. The field
  and redaction contract lives in
  `docs/claude/jira-optional-ticket-storage.md`, not here.

## Isolation binding for shared-state test support

A ticket that builds or changes test support which resets shared state — a
harness, a fixture, a reset helper, anything that truncates, drops, or
reinitializes state another process or another run can also read or write —
must state its isolation binding as a requirement: which database, directory,
or other shared resource the reset targets, and how the ticket's own
deliverable proves that target's identity before it destroys anything.

This doctrine exists because BAPI-1006 shipped a conductor integration-test
harness with nothing in its ticket stating what the harness's destructive
reset was bound to, and a v2 worker dispatched to build it truncated the
operator's operational `bridgeapi` database (Architecture Miss 28). The
containment-hazard classifier this repository runs at planning time
(`api/library/github/workflow_planning_prediction.py`) can flag such a ticket
from its text, but the flag is advisory — it surfaces the hazard before
dispatch, it does not prevent a destructive worker on its own. Stating the
isolation binding in the ticket itself is the durable requirement; treat this
as an authoring-posture rule, not as runtime enforcement.

## Accepted trade-off: silent departure is unobservable

Observability was deliberately dropped when this posture was ratified. A model
may invoke E1, E2, or E3 without recording that it did, so posture drift is only
detectable through ticket quality — not through a log, a counter, or a report.

This is known and accepted. The alternative was another mandatory instruction on
every surface, and an instruction that is skipped silently is worse than one that
does not exist: it reads as coverage while providing none.

## Why duplication, not a shared include

Commands, agents, instructions, and docs have four separate build paths in this
repository and no shared compiler. Introducing a generated include step to share
one block would mean a fifth build path, a placeholder that can go unresolved,
and a failure mode where a carrier ships with the placeholder text still in it.

Marker-delimited duplication plus one byte-equality test is the right mechanism
at this scale. The test reads the canonical sources directly — never the
generated command mirrors, whose byte-identity the command tests already cover —
and permits **no** per-surface variation. Any drift, down to a single byte, fails.

## A fresh install inherits this

No configuration step, no server call. The posture reaches a new project through
the packaged bundles that `--init` scaffolds:

- `COMMANDS` (`mcp_server/src/commands.generated.ts`) — carries
  `commands/src/define-tickets.md`;
- `AGENTS` (`mcp_server/src/agents.generated.ts`) — carries
  `agents/src/jira-ticket-writer.md`, including the compressed posture line in
  its `description:` frontmatter;
- `INSTRUCTIONS` (`mcp_server/src/pipelines.generated.ts`) — carries the
  canonical source and both decomposition instructions;
- `DOCS` (`mcp_server/src/docs.generated.ts`) — carries this document.

The compressed frontmatter line matters more than its size suggests: agent
descriptions land in every session's system prompt with no file read and no
`tools/list` cost, so it is the entire bare-chat coverage story.

## Worked examples

**One ticket.** "Add a `--json` flag to `doctor`." Two files and a test, ~90 LOC.
That is `M`. One ticket, drafted by the writer, no epic, no manifest, no
conductor handoff.

**Two tickets.** "Add rate limiting to the LLM client, and surface the limit in
the config UI." Backend and frontend are independently implementable and land
separately: two ordinary siblings. Still no epic — the threshold is three.

**Four tickets → an epic.** "Make local ticket mode a first-class system."
Decomposition freezes a parent plus four children, each `L`, with `depends_on`
naming the one child that must land first. The full manifest goes to the approval
gate; on approval, four writer invocations render four bodies against their
frozen entries; creation follows `upload-epic-hierarchy.md`; the handoff names
`drive-epic` and nothing else.

**A child that outgrows `L`.** A proposed child comes out at 19 files. It ships
as one `XL` child. Do not split it into two `L` children to make it fit — the
slice is one coherent piece of work, and halving it buys a second worktree, a
second PR, and a rebase between them in exchange for nothing. Split only if the
19 files really are two independent deliverables.

**Past the ceiling.** A proposed ticket comes out at 60 files and ~5000 LOC.
That is over the bound, so it splits — but into the largest coherent pieces
available, not into a swarm. Two `XL` tickets is the right answer here; six `M`
ones is not.
