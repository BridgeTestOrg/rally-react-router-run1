# Review Epic Coherence

This is the shared procedure for checking an epic's children **as a set**. It answers two
questions no per-ticket review asks: does every epic acceptance criterion have a child that
carries out its verification, and is everything one child produces wired to whatever consumes
it? Drafting surfaces and the on-demand `/review-epic-coherence` command run this same text.

The check fails **visibly**. A run that cannot finish is `not_checked`. It is never `pass`.

**Enforcement status.** The three drafting surfaces — `define-tickets`, `plan-epic`, and
`idea-to-ticket` — call this procedure in drafting mode before creation or approval, and
`render-ticket-manifest.md` refuses to render an epic without a clearing record. A
report-mode result from the on-demand command is a diagnostic, not a gate: it clears nothing.

## What the user sees

Everything this procedure says to a person in attended chat, progress messages, and screens
uses the plain words in this table, never the internal term. Callers that show a result to a
person use the same words.

| Internal concept | User-facing wording |
|---|---|
| coherence check | gap check |
| coverage | a requirement no ticket owns |
| handoff | a broken hand-off between tickets |
| fit | a plan that doesn't match the code |
| e2e_proof | no end-to-end test |
| `pass` | No gaps found |
| `accepted_with_gaps` | Accepted with known gaps |
| `blocked` | Needs your decision |
| `not_checked` | Couldn't check |
| foundation blocker | a gap in how the work is split |
| ticket-local carried finding | a note added to ticket N |
| `independent: false` | this check ran in my own session, not by a separate reviewer, so it's less independent |
| coverage map | Who covers each requirement |
| accept override | Create anyway, and record the gap on the epic |
| fix | Change how the tickets are split |
| assign | Give this requirement to ticket N |
| needs-owner item | Needs your answer: name a ticket, or remove it from scope |
| `covered_by_design_council` | Council: already covered by the design council |

- **Qualified pass.** In drafting mode, a passing record that carries ticket-local findings is
  shown as `No gaps found (N notes added to tickets)`.
- **Report mode.** A ticket-local finding is described prospectively, as `a note that would be
  added to ticket N`, and the report says the check changed no ticket.
- **Scope of the vocabulary.** It covers attended chat, progress messages, and screens only.
  `epic-coherence.md`, the JSON fields and verdict values in `epic-coherence.json`, the agent
  name, and the parent ticket's `## Epic coverage map` section keep their technical wording.
- Write new passages with words such as `ticket N` and angle-bracket paths. Do not add any
  new brace-wrapped identifier token.

## Inputs

State these four values before starting:

1. **Input document path** — the path to `epic-coherence-input.json`.
2. **Output directory** — a directory beneath the `docs_dir` that the `ping` tool returned.
3. **Mode** — `drafting` or `report`.
4. **Unattended** — true only when `auto_approve_external == "true"`. Otherwise the run is
   attended.

If any of the four is missing, stop and report which one. Do not guess a default.

An optional fifth input, **`council_preapproval`**, carries a `value` (`approved` or
`declined`) and its `source`. It records a council decision the caller already got from the
operator, so the procedure asks no council question of its own; see "Council call". Attended
`define-tickets` supplies it from its drafting plan. It is not one of the required
inputs, so its absence never stops the run. When it is absent, the attended asks in "Council
call" apply.

An optional sixth input, **`auto_amend`**, is `true` only when the caller asks for it. In an
attended drafting run it makes the caller amend the manifest between rounds with no question,
as an unattended run does. Any foundation gap still left after the bound goes to the caller's
create screen with an agent-drafted accept reason; it does not halt. See "Drafting mode".

## The input document

The document carries artifacts only. It never carries the drafting conversation.

```json
{
  "epic": {
    "key": "EPIC-1",
    "title": "Short epic title",
    "acceptance_criteria": [
      { "id": "AC-1", "text": "What must be true", "verification": "How it is proven" }
    ]
  },
  "design_text": "Goals and design text: the exploration's Goals & NFRs followed by its Proposed Design, the epic parent body, or equivalent.",
  "manifest": [
    {
      "id": "1",
      "title": "Child title",
      "scope": "What the child does",
      "size_band": "L",
      "depends_on": [],
      "recommended_after": [],
      "touched_files": ["path/relative/to/repo.py"],
      "read_files": ["path/the/child/only/reads.py"],
      "owns_verifications": [
        { "epic_ac": "AC-1", "obligation": "The concrete part of AC-1's verification this child carries out", "e2e": true }
      ],
      "handoff_roles": [
        { "thing": "H-1", "role": "write" }
      ]
    }
  ],
  "child_evidence": [
    {
      "id": "1",
      "acceptance_criteria": ["Each acceptance criterion of the child, verbatim"],
      "body": "The child ticket body, if available"
    }
  ],
  "non_child_owners": [
    {
      "id": "OR-1",
      "kind": "owner_run",
      "who": "Release owner",
      "step_ref": "Release checklist step 6",
      "step_text": "Release checklist step 6: the release owner runs the smoke test against production and posts the output as a comment on the epic.",
      "records_result_in": "a comment on the epic",
      "owns_verifications": [
        { "epic_ac": "AC-2", "obligation": "Run the production smoke test and post its output on the epic" }
      ]
    }
  ],
  "design_council": {
    "council_id": "<the completed design council id>",
    "design_revision": "<the design revision it reviewed>",
    "split_reviewed": true,
    "materiality": {
      "requirements": "unchanged",
      "interfaces_or_contracts": "unchanged",
      "ownership": "unchanged",
      "dependencies": "unchanged",
      "end_to_end_proof": "unchanged",
      "blast_radius": "unchanged"
    }
  }
}
```

Field rules:

- `epic` carries either `key` or `slug` (one is enough), plus `title` and
  `acceptance_criteria`. Each acceptance criterion has `id`, `text`, and `verification`. When
  an epic AC has no verification sentence, coverage is judged against its text, the basis is
  `text_only`, and the reviewer raises an advisory input finding naming the missing sentence.
- `design_text` is the goals and design text. When the caller has the epic's goals and
  non-functional requirements (NFRs), they open `design_text` verbatim, and the reviewer checks
  the split against each NFR as well as against the acceptance criteria. When there are none,
  that check is skipped and nothing is raised about their absence.
- `manifest` is the **complete, ordered** child list. Each entry carries `id` (a placeholder
  index or a real ticket key), `title`, `scope`, `size_band`, `depends_on`, and
  `recommended_after`. These are the same field names `decompose-epic.md` and
  `decompose-epic-candidate.md` already use.
- `touched_files` is optional. It lists the files the child **edits or creates**. When absent,
  the fit check uses the file paths the child's scope and body name. A `touched_files` path that
  does not exist yet can be a planned creation; that alone is not a problem.
- `read_files` is optional. It lists files the child **only reads**. It lives in the manifest,
  so it is hashed. Reads inform the fit check. Only edits (`touched_files`) count toward edit
  overlap between children and toward the high-risk path check in "Escalation rule". A path
  must not appear in both lists. A `read_files` path that does not exist is an `input` problem,
  because a child cannot read a file that is not there. When `read_files` is absent, behavior is
  unchanged.
- `owns_verifications` is optional. It is a list of entries with `epic_ac` (an epic AC id) and
  `obligation` (the concrete part of that AC's *verification* this child will carry out, in
  words a reviewer can hold against the verification sentence). It is a **claim** the reviewer
  checks. It is never proof by itself. When it is absent (older epics, the on-demand path), the
  reviewer derives candidate owners from each child's own acceptance criteria, and the record
  says `owns_verifications_source: derived`. When it is present, the record says `declared`.
- `child_evidence` is a **separate top-level array**, keyed by child `id`. Each entry may carry
  `acceptance_criteria` and `body`. It lives **outside** the hashed manifest, so evidence can be
  refreshed without changing manifest identity. Derived ownership counts only when a child's
  acceptance criteria contain a concrete commitment to the obligation. When the material needed
  to establish ownership is absent, that is an explicit `input` gap, not coverage.
- `non_child_owners` is an optional **top-level array** beside `child_evidence`. It names the
  owners of epic AC verifications that no child carries out, such as a step in an owner-run
  release checklist. Each entry has:
  - `id` — for example `OR-1`. It is unique across the array and never equal to any child `id`.
  - `kind` — a closed vocabulary with one value: `owner_run`.
  - `who` — a named person or role, for example "Release owner".
  - `step_ref` — the step it points at, for example "Release checklist step 6".
  - `step_text` — the step's text, copied **verbatim** from `design_text`.
  - `records_result_in` — where the result is recorded, for example "a comment on the epic".
  - `owns_verifications` — a list of `epic_ac` plus `obligation` entries, the same shape
    children use.

  `step_text` is copied into the entry on purpose. `design_text` is not hashed, so a step that
  lived only there could change without changing the review's identity. The copied, hashed
  `step_text` is the reviewed commitment. An owner-run owner owns **coverage only**: it never
  fills a hand-off grid cell. When the array is absent, no AC has a non-child owner.
- `handoff_roles` is optional on a manifest entry. It is a list of `{thing, role}` entries the
  drafting caller declares. `thing` is a stable id matching `^[A-Z]+-\d+$`, for example `H-1`,
  shared by every child that touches the same value. `role` is one of `write`, `read`, `caller`,
  `start`, `steady_state`, `wind_down`, or `consumer`. It sits inside `manifest`, so it is
  hashed: moving a role to another child changes `manifest_sha256` and invalidates a record
  bound to the old digest, with no change to the identity rules.
- `e2e` is optional on an `owns_verifications` entry. `e2e: true` marks the child that owns the
  end-to-end test of the epic's cross-child flow. It is hashed with the manifest. Only a child
  can own it; on a `non_child_owners` entry it never counts.
- A `design_text` line starting `no_cross_child_flow:` followed by a non-empty reason declares
  that no value passes between children. It must start the line. `design_text` is not hashed.
- `design_council` is an optional **top-level** object. A drafting caller writes it only when a
  design council already completed for this design. It carries `council_id` and
  `design_revision` (non-empty strings), `split_reviewed` (a boolean: the council reviewed this
  ticket split), and `materiality`, an object with exactly the keys `requirements`,
  `interfaces_or_contracts`, `ownership`, `dependencies`, `end_to_end_proof`, and
  `blast_radius`. Each value is `"unchanged"` or a short note saying what the split changed
  since that council. It sits **outside every digest**; "High-risk trigger" below reads it, and
  clearance checks it directly through `design_council_basis`.

All four are **declarations** and **claims**. The reviewer verifies them against
`child_evidence` and never treats one as proof. They are optional for every caller:
`/plan-epic`, `/idea-to-ticket`, and `/review-epic-coherence` need not supply them, and a
manifest without them is reviewed exactly as before.

**Local markdown drafts.** When an epic is drafted as local markdown files outside a drafting
surface, build this document with the packaged `epic-coherence-input build` subcommand of the
Bridge MCP package: `epic-coherence-input build --outline <outline-path> --out <output-path>`.
Do not assemble it by hand. The outline names the epic draft, each child's draft, its
dependencies, size band, `edits` (which become `touched_files`), `reads` (which become
`read_files`), and `owns_verifications`, plus any `non_child_owners`. Every epic AC bullet in the
epic draft must start with an explicit id such as `AC-3:`; the builder never numbers ACs by
position or matches them by keyword. `epic-coherence-input check <input-path>` validates an
existing document against the structural rules in "Validation" and prints the three digests. It
never judges coverage; that stays the reviewer's job. `epic-coherence-input check --structural
<input-path>` adds the declaration checks in "Validation"; only `/define-tickets` requires it. The three drafting surfaces keep their
structured normalization, and the on-demand `/review-epic-coherence` command keeps building its
input from ticket data.

## Identities

Three digests identify what was reviewed. All three use the same canonical JSON encoding.

- `manifest_sha256` is the SHA-256 hex digest of
  `json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")`,
  computed over the `manifest` array only. Compute it locally with this one line:

  ```bash
  python3 -c 'import hashlib,json,sys; manifest=json.load(open(sys.argv[1], encoding="utf-8"))["manifest"]; print(hashlib.sha256(json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest())' <input-path>
  ```

- `child_evidence_sha256` is the SHA-256 hex digest of the same encoding applied to the
  `child_evidence` array (an absent array hashes as an empty array).
- `non_child_owners_sha256` is the SHA-256 hex digest of the same encoding applied to the
  `non_child_owners` array. An absent array hashes as an empty array, as `child_evidence`
  does. Compute it locally with this one line:

  ```bash
  python3 -c 'import hashlib,json,sys; owners=json.load(open(sys.argv[1], encoding="utf-8")).get("non_child_owners", []); print(hashlib.sha256(json.dumps(owners, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest())' <input-path>
  ```

Record **all three** digests, at the top level and in every round. A caller that wants to
reuse a prior review must compare **all three** identities against the manifest, evidence,
and non-child owners it is about to use. A matching manifest with changed evidence or changed
owners is not the same review. The sibling integration's preflight must compare all three.

`design_text` deliberately stays **outside** identity. The copied and hashed `step_text` is
the reviewed commitment of an owner-run step. There is no fourth digest, and no render-time
check that `design_text` still contains the step.

## Validation

Before any reviewer run, validate the input document. Every problem becomes a visible `input`
finding. Nothing is silently dropped.

- Child ids are unique. Epic AC ids are unique. Every `owns_verifications.epic_ac` names a real
  epic AC, and every `child_evidence.id` names a real manifest child.
- The document shapes and the key or slug syntax are valid.
- Every `non_child_owners` entry is well formed. Its `id` is unique across the array and never
  collides with a child id. Its `kind` is `owner_run`. Its `who`, `step_ref`, `step_text`, and
  `records_result_in` are non-empty. Every one of its `owns_verifications.epic_ac` values names
  a real epic AC. A malformed entry, a colliding id, an invalid AC reference, and a missing
  required field are each a visible `input` finding.
- Every named file path is repository-relative. Reject absolute paths and any path that
  traverses upward. A path listed in both `touched_files` and `read_files` of the same child is
  an `input` finding.
- The output directory is beneath the `docs_dir` that `ping` resolved. Refuse to write anywhere
  else.
- A missing, invalid, or unreadable named file is an `input` finding. So is inaccessible child
  material and a missing set of epic acceptance criteria. A nonexistent `touched_files` path can
  be a planned creation and is not, by itself, a finding. A nonexistent `read_files` path is an
  `input` finding.
- A missing verification sentence alone is **advisory**. Any problem that prevents a meaningful
  review (no epic acceptance criteria, an empty manifest, an unreadable input document) makes
  the verdict `not_checked`. It never produces a complete-looking coverage map.

**Plain and structural checking.** The rules above are the plain check every caller runs,
mechanically through `epic-coherence-input check <input-path>` where the caller uses the
packaged subcommand. `/define-tickets` also runs `epic-coherence-input check --structural
<input-path>`, which checks the declarations: every epic AC is claimed by a child or a
non-child owner (`unclaimed_epic_ac`), every declared `thing` that spans two children has
write, read, and caller owners (`handoff_missing_role`), every read or consumed `thing` has a
write and a caller owner whatever its span (`handoff_missing_write_or_caller`), every role is
well formed (`malformed_handoff_role`), a cross-child flow has a child `e2e` owner
(`missing_e2e_owner`), two or more children either share a `thing` or give a
`no_cross_child_flow:` reason (`no_cross_child_declaration`, `no_cross_child_flow_contradicted`),
`depends_on` names known children and forms no cycle (`depends_on_unknown_child`,
`depends_on_self`, `depends_on_cycle`), `recommended_after` names known children
(`recommended_after_unknown_child`, `recommended_after_self`), and any `design_council` is well
formed (`malformed_design_council`). On success it prints `design_council_covers_high_risk`.
A clean structural result proves the declarations are complete and consistent; it never proves
they are true, so the reviewer still runs. Other callers never run structural mode: callers that
declare no hand-off roles would fail every manifest of two or more children on
`no_cross_child_declaration`.

Describe variable paths in words or angle brackets, such as `<output-directory>`. Do not write
any literal brace-wrapped identifier other than `docs_dir`, including in examples.

## Reviewer run

Invoke the `epic-coherence-reviewer` agent in a **fresh context**. Pass it only the input
document path. Run it **once per round over the whole frozen manifest** — never per child and
never over a subset. The reviewer must not receive the drafting conversation.

Resolve the agent the way `draft-ticket.md` resolves `jira-ticket-writer`: through the Task tool
or a host equivalent you have confirmed can resolve it. Cursor has no agent mirror for this
agent, so on Cursor resolution normally fails.

**Fresh-context fallback.** If no fresh context can be obtained, read the agent file
`agents/src/epic-coherence-reviewer.md` (or its installed mirror) and execute its methodology
inline. Set `independent: false` in the record and say so in the report. An inline run is never
a silent independent pass.

- In an **attended** run, tell the person in plain words: "this check ran in my own session, not
  by a separate reviewer, so it's less independent." Offer a fresh-context rerun when one
  becomes available.
- In an **unattended drafting** run, an inline `pass` is not the independent gate. Halt.

## Escalation rule

Escalate to a council **only** when at least one of these is true:

1. Any blocking finding has `confidence: uncertain`.
2. The caller **disputes** a blocking finding instead of amending it. The caller is the drafting
   agent in drafting mode and the operator in report mode.
3. The epic is **high risk**.

High risk means one of the following. Count **children**, never edited files: a single child
that edits ten files under one prefix is still one child.

- The epic has **six or more children**.
- **One** child's `touched_files` falls under one of these paths. A single editing child is
  enough:
  - `db/migrations/` and `db/alembic/` (the design says `db/migrations/`; this repository's
    migrations live in `db/alembic/`, so match both)
  - `api/library/billing/`
  - `api/routes/setup/auth.py`
  - `api/library/auth/`
- **Two or more distinct** children each edit under the same kind of path from the list below.
  One editing child alone does **not** make the epic high risk. This list is every remaining
  prefix in `_CONTAINMENT_HAZARD_PATHS` in `api/library/github/workflow_planning_prediction.py`
  (the list also carries `db/alembic/`, which is already a single-trigger path above):
  `mcp_server/src/executor/`, `mcp_server/src/agent-launchers/`,
  `mcp_server/src/claude-settings.ts`, `.github/workflows/`,
  `tests/integration/conductor_harness/`, and `api/library/db/`

| Edits under the path | Risk tier |
| --- | --- |
| One child edits `api/library/db/` | low |
| Two children each edit `api/library/db/` | high |
| One child edits an executor prefix such as `mcp_server/src/executor/` | low |
| Two children each edit executor-prefix paths | high |
| One child edits `db/alembic/`, `api/library/billing/`, or auth paths | high |
| Six or more children, whatever they edit | high |

Only edits count. A path a child lists in `read_files` never makes the epic high risk, even
under one of these prefixes, so a child that only reads `api/library/db/` does not trigger
this rule. Reads do not count toward the two-child threshold either.

A low-risk epic with one child editing `api/library/db/` or an executor prefix still receives
the low-risk reviewer rounds in "Drafting mode". If a round raises a blocking finding with
`confidence: uncertain`, the epic is promoted to high risk and the council flow starts. Any
blocking findings that remain go to the operator at the create gate. This adds no other
mitigation.

When `touched_files` is absent for a child, apply the same path check to the concrete paths its
scope and body name. When a child's file ownership is unknown, record **uncertainty**. Do not
declare the epic low risk.

**Classify the risk before round 1.** Decide the initial risk tier from the input alone,
before the first reviewer run, using the child count and the edit paths. The tier is `high`
when this rule matches, and also when unknown file ownership leaves the question open. It is
`low` otherwise. Record it as `risk_tier` with its `risk_reasons`, for example "Children 1 and 3
both edit `api/library/db/`". Trigger 3 therefore fires **before round 1**. Triggers 1 and 2 still fire
after any later round.

An uncompleted required escalation leaves the result unresolved. It is never a quiet pass.

## Council call

Before **every** billable council request, state:

- the cost: **26–65 credits and about 15 minutes** (26 credits for standard models, 65 credits
  for frontier models; state the applicable tier if providers are pinned). The source is
  `api/library/billing/pricing.py`;
- the escalation reason (which of the three triggers fired);
- that council output cannot itself clear a blocker.

An **attended** run asks the operator to approve before proceeding, using the decision card
below. An **unattended** run states the cost in its output and proceeds. This holds for every
request, including a `mode: general` retry.

**The decision card.** Every attended council offer is one card, shown in this order:

1. A plain-language question ending in `?`, such as "Would you like several other AI models to
   review how the work is split before I create the tickets?"
2. One sentence saying what a council is: "a panel of several AI models that each review the
   plan separately." It carries the cost (`26–65 credits`) and `about 15 minutes`, and says
   the gap check runs either way.
3. A recommendation, with a reason of one or two sentences grounded in what is uncertain.
4. Bulleted concrete questions the council would check, each followed by the AI's current
   answer, or an explicit statement that it is not sure.
5. Exactly these three options, with `(as recommended)` on the recommended one only:

   ```text
   1. Yes, run the council
   2. No, continue without it
   3. Yes, but change what it checks, or ask me something first
   ```

**Reading the reply.** Judge the reply by intent, not by exact words. A clear number or a clear
verbal choice selects that option. An unclear reply authorizes nothing: say what you could not
tell and show the card again.

- **Option 3 with a new focus.** Echo the revised checklist back in one or two lines, run the
  council with it, and do not ask again.
- **Option 3 with a question.** Answer the question first, then show the three options again in
  a compact form.
- **A reply that picks an option and also asks to change the split.** The change comes first:
  amend the manifest, re-freeze it, and start no council from that reply.
- Added focus never removes a mandatory check, never waives the gap check, and never changes
  how a record clears.

**When the council starts.**

- **High-risk trigger: already covered by a design council.** Before any card or request for
  the high-risk trigger, read the input's `design_council`. Evaluate the skip predicate exactly
  as `epic-coherence-input check --structural` reports it in `design_council_covers_high_risk`:
  it is true only when `design_council` is present and well formed (non-empty `council_id` and
  `design_revision`, a boolean `split_reviewed`, and a `materiality` object with exactly the keys
  `requirements`, `interfaces_or_contracts`, `ownership`, `dependencies`, `end_to_end_proof`,
  and `blast_radius`, each a non-empty string) **and** either `split_reviewed` is `true` or every
  `materiality` value is exactly `"unchanged"`. When it is true, request **no** council for the
  high-risk trigger, show no card, and record `council_id: null`, `council_outcome:
  "covered_by_design_council"`, and `design_council_basis: { "council_id": <the design council
  id>, "design_revision": <its design_revision> }`. Say in the report why the council was not
  started: the design council already reviewed this design, and the split did not materially
  change it. This skips only the initial high-risk council. It removes neither the reviewer
  rounds, the high-risk round limit, nor the uncertain and disputed triggers below, which keep
  their cards, costs, preapproval, and limits unchanged. When the predicate is false, or
  `design_council` is absent or malformed, the high-risk trigger behaves exactly as below.
- **High-risk trigger.** After the epic is classified high risk before round 1, an attended run
  shows the decision card **before** round 1 starts. It explains the high-risk reason in plain
  words from `risk_reasons`, for example "two tickets both change the database layer", without
  changing any threshold or classification. The mandatory checks on the card are concurrent
  writers, migration and rollback order, and rollout that runs ahead of the code, each with the
  AI's current answer or stated uncertainty. On option 1, or option 3 with a focus, request the
  council and start the round-1 reviewer run **in parallel**. Do not wait for a later round.
  - **Decline.** On option 2, request no council. Record `council_id: null` and
    `council_outcome: "declined_by_operator"`, omit `council_preapproval`, and continue the
    reviewer run. The decline is final and is shown as `Council: skipped, your choice`.
  - **Caller preapproval.** If the caller supplied `council_preapproval`, its `value` and
    `source` are recorded. `approved` starts the initial council alongside round 1 after
    stating the cost, with no further ask. `declined` skips it and records the same
    `declined_by_operator` outcome.
  - If the technical request needs the `mode: general` retry, state the cost again, with the
    disclosure and approval that retry already requires.
- **Uncertain or disputed trigger.** Request the council after the round that raised the
  finding. An attended run shows the same decision card with its own cost statement, a
  recommendation, and questions about that finding, each with the AI's current answer. The task
  text stays limited to the input document's artifacts and the relevant findings.
  - **Decline.** On option 2, request no council and append no `councils` entry. The triggering
    finding keeps its identity, severity, evidence, and blocking status. Keep the finding id in
    the run state as declined, so no later round offers a council for the same finding again.
    No new record field is added for this.
  - A genuinely new qualifying finding may still get an offer, within the limit below.
  - **Caller preapproval.** When the caller supplied `council_preapproval`, show no card for
    this trigger either. `approved` states the cost and requests the council with no ask,
    within the limit below. `declined` requests none, exactly as a decline on the card does.
- **How many.** One council per drafting run for the initial high-risk trigger. A later
  qualifying trigger (an uncertain or disputed blocking finding) may start **at most one more**
  council, with its own cost statement and approval.

Call `request_council` with:

- `mode`: `technical`
- `wait_for_result`: `false`
- no `repo_name`
- task text containing **only** the input document's artifacts and the contested findings.
  The early high-risk council has no reviewer findings yet, so its task text holds **only** the
  input document's artifacts. Never invent findings for it. Ask it to look for cross-child and
  release-level risks, such as concurrent writers, migration and rollback order, and rollout
  that runs ahead of the code.

Then poll `get_council` for a bounded period. Call it with `wait_for_result: true`: it returns
when the council finishes, so you see the result within about 30 seconds. If it times out, call
it again; that is safe and never starts a second council. Never sleep a fixed time between
checks. If technical mode cannot run because the repository is not indexed, repeat the request with `mode: general`, and state the cost again
before that request too.

**The amendment freeze.** The round-1 amendment freezes at the moment the caller begins writing
the amended input document after collecting the round-1 findings. Poll `get_council` while the
round-1 reviewer runs. Council conclusions received before the freeze join that **same**
amendment pass. Conclusions received after it join the next pass. A frozen round is never
changed after the fact.

Council conclusions join the finding list as **separate** findings with `source: council`. The
original reviewer finding is kept unchanged. It is never edited, downgraded, or removed because
a council failed, timed out, is still running, left the dispute unresolved, or concluded.
Record the `council_id` and the council outcome. Record still-running and failed outcomes as
unresolved.

**An unfinished required council.** A required council that is `still_running`, `failed`, or
`timed_out` when the last round or confirmation pass ends is unresolved. The verdict is never
`pass`. An **attended** operator, after being shown the council's id, cost, and elapsed time,
may accept it with a typed override of kind `accept` that names its `council_id`. An
**unattended** run records `blocked` and halts before any ticket is created.

A council outcome of `declined_by_operator` is resolved and needs no `accept` override, whether it was declined at the pre-round-1 ask or through legacy `council_preapproval: declined`. A legacy `accept` override targeting `council: "declined_by_operator"` remains valid but is ignored for clearance.

A council outcome of `covered_by_design_council` is also resolved and needs no `accept` override: no council request was made, because recorded design-council evidence already covered the high-risk trigger. It stays resolved only while its basis still matches the input:

Refuse clearance for a `covered_by_design_council` record unless its `design_council_basis.council_id` and `design_council_basis.design_revision` match the corresponding members of the current input’s `design_council`, and that `design_council` is still well formed and satisfies the skip predicate: `split_reviewed` is `true` or every `materiality` value is `"unchanged"`.

**Declining an escalation council.** Declining a council offered for an uncertain or disputed
finding resolves the council decision only. The finding itself stays blocking until it is
amended or accepted by its own `finding_id`.

## Drafting mode

Drafting mode is for a drafting surface that can still change the manifest.

- **Attended progress.** After every completed reviewer round, an attended run says one short
  line with the number of gaps in how the work is split that still need a decision. Use the
  real ordinary-round ceiling for this epic (the low-risk or the high-risk limit below), for
  example: `Gap check, round 1 of up to 3: 2 gaps need a decision.` A confirmation pass is
  named as a confirmation pass. It is never counted as an extra ordinary round. Unattended runs
  print no such line.
- **Amend and recheck.** The reviewer only describes amendments. The **caller** amends the
  manifest (adds or rescopes children), re-freezes it, and writes a **new** input document. The
  procedure then reruns the reviewer in a fresh context. Record each round with its own
  `manifest_sha256`, `child_evidence_sha256`, and `non_child_owners_sha256`, blocking and
  advisory counts, whether a council ran, and whether it was a confirmation pass.
- **Foundation readiness and carry.** A round with zero foundation blockers is ready and exits the ordinary loop immediately. Carry unresolved ticket-local blockers without amending or rechecking merely because they remain. `pass` requires zero unresolved foundation blockers and may retain carried ticket-local findings; `accepted_with_gaps` is reserved for accepted remaining foundation blockers.
- **Risk-scaled round limit.** The number of ordinary reviewer runs, `round_limit`, depends on
  the risk tier from "Escalation rule":
  - **Low risk** (the epic is not high risk and no blocking finding is `uncertain`):
    `round_limit` is **2**. These are maximum ordinary rounds; exit earlier when a round has zero foundation blockers.
    That is at most **2 reviewer runs**.
  - **High risk**: `round_limit` is **3**. Allow at most **2 re-checks**, which is
    **3 reviewer runs in total**, with the same zero-foundation early exit.
  - **Promotion.** A low-risk epic whose round produces a blocking finding with
    `confidence: uncertain` becomes high risk from that point. It gets the high-risk limit, and
    trigger 1 fires. Promotion raises the ceiling to three total ordinary rounds, including rounds already completed.

  If a round with foundation blockers has a foundation count greater than or equal to the preceding round's count, stop automatic looping with `non_convergence`; route attended findings to the create gate or halt unattended as `blocked`.

  Record the final `risk_tier`, `risk_reasons`, and `round_limit`. A confirmation pass is not an
  ordinary run and does not count toward `round_limit`.
- **Confirmation pass.** Run a confirmation only after a caller amendment targeting foundation findings and when the ordinary-round rule calls for it. Derive `confirmation_passes_used` from `rounds[].confirmation`; the budget is two attended passes or one unattended pass, and refuse another at the budget.

  When the caller changes the input after the last allowed ordinary
  round, run **one confirmation pass**. It is a fresh-context reviewer run over the **whole**
  amended manifest, never a subset. Its requested focus is narrower: the amended children, the
  hand-offs they touch, and whether the findings the amendment targeted are closed. It must
  still report **any** blocking finding it observes anywhere in the manifest; the narrower
  focus never suppresses one. When it cannot establish where an amendment's impact ends, it
  raises that as a blocking finding with `confidence: uncertain` instead of calling the
  amendment confirmed. Record it in `rounds[]` with `"confirmation": true`.
  - A confirmation pass **never** starts another automatic amendment loop. A new blocking
    finding goes to attended fix-or-accept, or to the unattended halt.
  - **A new foundation finding in a later round stays blocking**, wherever it lands in the
    manifest, including on a child that did not change since the earlier round. Every round and
    confirmation pass is a whole-manifest review; only a caller's draft reuse may be selective.
    A proposed acceptance from an earlier round may be carried to a re-raised finding only when
    the gap, the evidence, the kind, and the affected entries are substantively unchanged; the
    carried proposal then rebinds to the new round and identities. Changed or uncertain
    equivalence needs a fresh settlement.
  - In an **attended** run, after the first confirmation pass, the operator may direct **at
    most one** fix of a confirmation blocker. Then run **one** further whole-manifest
    confirmation pass, so the last round bears the final digests. That is the whole budget
    across re-runs in the same attended `define-tickets` run.
  - Once that budget is spent, a remaining blocker is accepted with a non-empty reason or stays
    `blocked`. Do not add an "unconfirmed fixed" state, and do not start another automatic
    amendment loop. A typed acceptance stays available instead of the fix at any point.
- **Final identity.** The top-level `manifest_sha256`, `child_evidence_sha256`, and
  `non_child_owners_sha256` equal the digests of the **last** entry in `rounds[]`. A record
  whose top-level digests no round saw does not clear. The sole exception is a confirmation
  pass that cannot run: an **attended** operator may record `amended_after_final_round: true`
  with an override of kind `bypass` carrying a typed reason. The verdict is then
  `not_checked`, never `pass` or `accepted_with_gaps`, and the top-level digests still describe
  the amended input. An **unattended** run halts instead.
- **Acceptance by effect.** A foundation blocking finding of kind `coverage` (a requirement no
  ticket owns) or `e2e_proof` (no end-to-end test) can **never** be cleared by an `accept`
  override. It has exactly two resolutions: **assign** it, by amending the manifest so a
  ticket, existing or new, owns the requirement or the end-to-end test; or an **explicit
  requirement change the owner makes**, removing the requirement from scope. Every other
  foundation finding (`handoff`, `fit`, `input`) may still be accepted with a non-empty reason.
- **Removing a requirement is the owner's decision.** Removing a ratified requirement from scope
  is a requirement change, never an amendment. Only the owner's answer at the caller's existing
  approval surface (the `/define-tickets` upload gate, or the caller's own approval or create
  screen) can make it. The agent never removes a requirement to clear a gap. The change updates
  the ratified set and invalidates the affected coverage, the review evidence bound to the old
  input, and the affected drafts; the caller rebuilds the input and reviews it again before a
  fresh approval.
- **Automatic amendment.** When the caller passed `auto_amend: true`, an attended run amends
  and rechecks within the same round and confirmation bounds with no question, as an unattended
  run does. The caller assigns a remaining `coverage` or `e2e_proof` finding to a ticket. When
  no ticket can own it, the create screen shows it as needing the owner's answer (name a
  ticket, or remove it from scope), never with an accept reason, and nothing clears until the
  owner answers. After the bound, each other remaining foundation blocking finding goes to the
  caller's create screen with an agent-drafted reason. The operator's approval there records it
  as an `accept` override. It is never a halt.
- **Attended resolution.** After the bound, each remaining **foundation** blocking finding must be
  fixed within the same one-fix, one-further-confirmation-pass budget, or resolved by the effect
  rule above: a `coverage` or `e2e_proof` finding is assigned to a ticket or removed from scope
  by the owner's explicit requirement change; any other foundation finding may be accepted with
  a non-empty reason.
  Ticket-local blockers are carried to their child ticket; they do not require a foundation amendment
  or acceptance to clear the epic record.
  The reason may be typed by the operator or drafted by the agent and shown at the create gate
  where that gate applies. An accepted finding is an override with `kind: accept`, plus
  `finding_id`, `reason`, `accepted_by`, and `round`. Declining a foundation finding keeps the verdict `blocked`.
  When **every** remaining foundation blocking finding is accepted, and none of them is of kind
  `coverage` or `e2e_proof`, the verdict is `accepted_with_gaps`.
- **Unattended halt.** If any foundation blocking finding remains after the bound, the verdict is
  `blocked`. Return an explicit halt signal: **do not call `create_ticket`**. The caller must
  stop.

## When the review cannot run

If the reviewer cannot run (a tool error, a timeout, or a host that lacks the capability while
inline execution also fails), or the material prevents a meaningful review, the verdict is
`not_checked`. It is never `pass`.

- **Attended:** tell the person "Couldn't check", then offer a retry, or a bypass with a typed
  reason. A bypass is recorded as an override with `kind: bypass`. The verdict stays
  `not_checked`. A caller may instead retry within its existing round bounds and defer this
  question to its own approval surface: `/define-tickets` keeps drafting and shows "Couldn't
  check" at the upload gate as an item needing the owner's answer. The deferral never weakens
  the rule: creation still needs the owner's typed bypass reason, and nothing clears without
  it. Other callers keep asking where they ask today.
- **Unattended:** halt.

## Report mode

Report mode is diagnostic. It runs the reviewer **once**. There is no amendment loop and no halt
signal. Escalation still applies, with the cost stated and confirmation asked. It splits blocking counts and the verdict by scope: ticket-local blockers are labelled “would be carried into child N”, are not carried, and edit no ticket. The verdict is `pass`, `blocked`, or `not_checked` from foundation blockers only.

A `blocked` or `not_checked` report is **diagnostic and not a clearance**.

When showing a report-mode result to a person, use the words in "What the user sees". Describe
each ticket-local finding as `a note that would be added to ticket N`, keep the result
diagnostic rather than clearing, and say plainly that the check changed no ticket.

## The record: epic-coherence.json

Write `epic-coherence.json` into the output directory:

```json
{
  "schema_version": 3,
  "checked_at": "2026-01-01T00:00:00Z",
  "mode": "drafting",
  "unattended": false,
  "manifest_sha256": "<64 hex characters, or null>",
  "child_evidence_sha256": "<64 hex characters, or null>",
  "non_child_owners_sha256": "<64 hex characters, or null>",
  "owns_verifications_source": "declared",
  "verdict": "pass",
  "independent": true,
  "risk_tier": "low",
  "risk_reasons": ["Three children; no child edits a high-risk path"],
  "round_limit": 2,
  "confirmation_passes_used": 0,
  "confirmation_budget": 2,
  "stop_reason": "ready",
  "carried_ticket_local": [],
  "amended_after_final_round": false,
  "rounds": [
    {
      "manifest_sha256": "<64 hex characters>",
      "child_evidence_sha256": "<64 hex characters>",
      "non_child_owners_sha256": "<64 hex characters>",
      "blocking_count": 0,
      "foundation_blocking_count": 0,
      "ticket_local_blocking_count": 0,
      "findings_snapshot": [],
      "advisory_count": 0,
      "council_ran": false,
      "confirmation": false
    }
  ],
  "owner_run_acs": ["AC-2"],
  "coverage_map": [
    {
      "epic_ac": "AC-1",
      "judgment_basis": "verification",
      "status": "covered",
      "owners": [
        {
          "owner_kind": "child",
          "child": "1",
          "obligation": "Concrete obligation",
          "child_ac": "The child AC id or a quoted child AC",
          "source": "declared"
        }
      ]
    },
    {
      "epic_ac": "AC-2",
      "judgment_basis": "verification",
      "status": "covered",
      "owners": [
        {
          "owner_kind": "owner_run",
          "child": null,
          "owner": "OR-1",
          "who": "Release owner",
          "step_ref": "Release checklist step 6",
          "records_result_in": "a comment on the epic",
          "obligation": "Run the production smoke test and post its output on the epic",
          "source": "declared"
        }
      ]
    }
  ],
  "handoff_grid": [
    {
      "thing": "The stored field, endpoint, flag, event, job payload, or scope",
      "consumer": "The consuming piece",
      "write_path": "child id or null",
      "read_path": "child id or null",
      "caller": "child id or null",
      "start": "child id or null",
      "steady_state": "child id or null",
      "wind_down": "child id or null"
    }
  ],
  "findings": [
    {
      "id": "F-1",
      "kind": "coverage",
      "severity": "blocking",
      "confidence": "certain",
      "concerns": "AC-1",
      "evidence": "What was observed, with file and line where code was read",
      "smallest_amendment": "The smallest change that would close it",
      "source": "reviewer", "scope": "foundation"
    }
  ],
  "overrides": [
    { "kind": "accept", "finding_id": "F-1", "reason": "Typed reason", "accepted_by": "Operator", "round": 3 }
  ],
  "council_preapproval": { "value": "approved", "source": "legacy caller input" },
  "council_id": null,
  "council_outcome": "not_run",
  "councils": []
}
```

When the high-risk council was skipped on design-council evidence, the record instead carries
`"council_outcome": "covered_by_design_council"`, `"council_id": null`, and
`"design_council_basis": { "council_id": "<design council id>", "design_revision": "<its revision>" }`.

Rules:

- `schema_version` is `3`. Readers also accept versions `1` and `2`; interpret every legacy blocking finding as `foundation`.
- **The effect rule applies to every schema version.** In versions `1`, `2`, and `3`, an
  `accept` override never clears a foundation blocking finding of kind `coverage` or
  `e2e_proof`. A historical record that accepted one stays readable, and its override stays
  visible as history, but it does not clear: the finding still needs an owner or the owner's
  requirement change. An `accept` of any other foundation finding clears as before.
- In version 3, validate every blocking finding's closed `scope` and every `ticket_local` child against the final manifest before counting, clearing, or carrying. Invalid or orphaned ownership fails closed; reclassify an ambiguously owned former carry as foundation explicitly.
- `blocking_count` is the sum of `foundation_blocking_count` and `ticket_local_blocking_count`; count every blocking finding regardless of confidence.
- `pass` requires zero unresolved foundation blockers.
- `carried_ticket_local` holds one unresolved entry per stable identity with its finding id, child id, evidence, and smallest amendment. Preserve the latest snapshot and close an identity only when a later review explicitly establishes correction or supersession.
- `stop_reason` is one of `ready`, `round_limit`, `non_convergence`, or `confirmation_budget_spent`.
- `verdict` is one of `pass`, `accepted_with_gaps`, `blocked`, `not_checked`.
- A `pass` with `independent: false` is allowed but flagged prominently in both files.
- An `accept` override accepts a known gap. A `bypass` override skips a review that could not
  run. Keep the two distinct.
- `kind` on a finding is one of `coverage`, `handoff`, `fit`, `e2e_proof`, `input`.
  `severity` is `blocking` or `advisory`. `confidence` is `certain` or `uncertain`. `source`
  is `reviewer` or `council`.
- Digests may be `null` **only** when unreadable input makes computing them impossible. Then
  add an explicit `input` finding and set the verdict to `not_checked`.
- The top-level digests equal the last round's digests. The only record allowed to differ is
  an attended one with `amended_after_final_round: true`, a `bypass` override with a typed
  reason, and verdict `not_checked` (see "Drafting mode"). The skip record below is the one
  record with no rounds at all.
- **Skip record.** When an attended caller's operator chose not to run the check, the caller
  writes the record itself and no reviewer runs. It carries `skipped_by_operator: true`,
  `rounds: []`, verdict `not_checked`, the three digests of the current input, an empty
  coverage map, and one `bypass` override with a non-empty reason. It clears only for that
  attended caller, never for an unattended run. `skipped_by_operator` is absent on every other
  record.
- `rounds[].confirmation` is `true` only for a confirmation pass. `risk_tier` is `low` or
  `high`, `risk_reasons` lists why, and `round_limit` is the ordinary-run limit that applied
  (`2` or `3`; report mode runs once).
- Each coverage owner carries `owner_kind`, which is `child` or `owner_run`. A child owner
  carries `child`, `obligation`, `child_ac`, and `source`. An owner-run owner carries
  `child: null`, `owner` (its `non_child_owners` id), `who`, `step_ref`, `records_result_in`,
  `obligation`, and `source: declared`.
- `owner_run_acs` lists the id of every epic AC with at least one owner-run owner. It is empty
  when there are none. Owner-run coverage is always visible, never silently passed.
- `council_id` is `null` when no council ran. `council_outcome` is one of `not_run`,
  `concluded`, `failed`, `timed_out`, `still_running`, `declined_by_operator`, or
  `covered_by_design_council`. These two fields describe the first
  council. When a second council runs, `councils` lists **every** council in order, each with
  `council_id`, `trigger` (`uncertain`, `disputed`, or `high_risk`), and `outcome`. An override
  that accepts an unfinished council carries `council_id` in place of `finding_id`.
  An initial council declined at the pre-round-1 ask, or through legacy `council_preapproval`,
  is stored in `council_outcome` as `declined_by_operator` with `council_id: null`, and is
  retained there when a later council also needs an entry in `councils`. It needs no override.
  Older records may carry an override with `council: "declined_by_operator"` in place of
  `finding_id` or `council_id`; it stays valid and is ignored for clearance.
- `covered_by_design_council` means no initial council was requested because the input's
  `design_council` satisfied the skip predicate in "Council call". It is resolved without an
  `accept` override. The record then carries `design_council_basis` with exactly the
  `council_id` and `design_revision` it relied on, and `council_id` stays `null` because no
  council ran. `design_council_basis` is absent on every other record. A later uncertain or
  disputed council still gets its own `councils` entry.
- `council_preapproval` is present only when a caller supplied it. It persists its
  `value` and `source`, and the record omits the field otherwise, including after an attended
  decline at the pre-round-1 ask.
- Unknown fields, such as a historical `council_note`, are outside this schema. Readers ignore
  them. They never authorize clearance.
- A `not_checked` record must **never** carry a coverage map that looks complete. Leave the map
  empty, or mark every entry as not assessed.
- Keep this schema in this file. Do not copy it into the ticket-authoring posture block.

## The record: epic-coherence.md

Write `epic-coherence.md` into the same directory as a short human summary. Use **no tables**.
In this order:

1. The **verdict**, as the very first line of the file (after the title heading). Nothing else comes
   before it.
2. **Independent: yes** or **Independent: no**, prominently, on the line directly after the
   verdict, then the **next action**.
3. The round count, the risk tier, and the round limit. Say which round, if any, was a
   confirmation pass.
4. Directly after the round count, one line: "Owner-run coverage: N of M epic ACs depend on
   steps a person runs outside the Epic Implementer."
5. One **bullet per epic AC**: its id, the judgment basis (`verification` or `text only`), the
   status, the owning child or the absence of one, the obligation, and the cited child AC
   evidence. Mark derived ownership as derived. For an owner-run owner, say "owner-run" in
   words, with the person or role, the step reference, and where the result is recorded, for
   example: AC-4: covered, owner-run (Release owner, checklist step 5; result recorded in an
   epic comment).
6. **Blocking findings**, each labelled `blocking` with its `certain` or `uncertain` label.
   Write each hand-off gap as a sentence naming the shared thing, the affected consumer, the
   missing lifecycle end, and the smallest amendment.
7. **Advisory and input findings.**
8. **Council state.**
9. **Overrides**, each with its typed reason.

State every meaning in words, never by color alone.

In both files:

- Label a report-mode `blocked` or `not_checked` result as **diagnostic and not a clearance**.
- In report mode, state that the result gates no drafting surface: each drafting surface runs
  its own drafting-mode check before creation.
- Put `independent: false` at the top, directly after the verdict line, and offer an attended
  fresh-context rerun.

## Writing the records safely

- Render both files to temporary files first. Replace the real files from the temporary files
  where the host supports it. Both files must carry the same run identity (`checked_at` and
  all three final digests), and both describe the same final round.
- Report a write failure explicitly. A write failure is an **incomplete review**.
- When a newer attempt fails or is incomplete, **invalidate or remove** any older successful
  artifact in the output directory. Never leave an older `pass` beside a newer failed outcome.
  An incomplete newer attempt must not leave an older clearing record in place.

## Return

Report to the caller:

- the verdict and whether the run was independent;
- the next action;
- the paths of `epic-coherence.json` and `epic-coherence.md`;
- for drafting mode, the halt signal (`do not call create_ticket`) when one applies, and the
  amendments the caller must make before the next round.

Do not describe a `blocked` or `not_checked` report-mode result as a clearance.
