# `/define-tickets` writer-output procedure

`/define-tickets` reads this procedure in Stage 9, in attended and `--auto` runs alike,
once, before it launches the first `jira-ticket-writer` invocation. It holds the details
of what every writer receives and how each writer's output is handled before the upload
gate. The command keeps inline the split, the writer fan-out, the research packet, the
draft check, the open-question rules, the phrase backstop, the upload gate, creation,
and every halt. Each section below is followed at its pointer in Stage 9.

## Invocation inputs

For the epic parent, pass the prospective verdict and proposals together: the verdict `accepted_with_gaps` when proposed acceptances exist, the exact proposed overrides with their reasons, the existing recorded overrides, and the record's coverage map.

Pass into every invocation, verbatim: the ratified acceptance criteria that entry satisfies, the proposed design for its slice, the entry's own manifest fields, and the doc's ratified `## Goals & NFRs` section — the business goal, desired end-state, system behavior, and every NFR with its requirement and implication. Pass the whole section to every entry, not a subset you picked: the writer decides which NFRs bear on its entry, and an NFR whose implication applies to every ticket (for example "each ticket carries a producer-and-exit table") is lost if it reaches only the parent. Do not restate or reinterpret the criteria or the NFRs — they were ratified in that wording, and they go to the writer unchanged. For an epic, also pass:
- to each **child** invocation, that child's `owns_verifications` entries, word for word. The draft's acceptance criteria must keep each obligation verbatim, so the created child still carries the evidence that was reviewed. Check each child draft for this before the upload gate;
- to the **parent** invocation, the record's coverage map — taken from the record, including each owner-run owner with its person or role and step reference — its exact verdict, and every override with its recorded reason, for the parent's `## Epic coverage map` section. Owner-run obligations go to the parent's map only, never to a child invocation.

## Draft paths, standard warnings, and the terminal report

**Give every writer invocation an explicit draft path, and record it for that entry.** Without one the writer falls back to its own default location and the command never learns the path, which the materials pass below needs. Use one draft directory per run: attended, `{docs_dir}/explorations/{slug}-drafts/`; under `--auto`, `{docs_dir}/explorations/{slug}-{run_id}/drafts/` (the artifact directory Stage 0 step 5 creates). Use fixed file names so a file maps to its entry: `parent.md`, `child-{N}.md` (`{N}` is the 1-based manifest position), and `sibling-{N}.md`. A draft file that is missing after a writer run is a writer failure; under `--auto` that is the `stage_failed` halt above.

**Keep each writer's standard warning.** A writer adds one only when its lookup failed or a configured instruction conflicted: a fenced code block with info string `ticket-standard`, holding `Ticket standard: …` and `Standard conflicts: …`, just before the terminal `open-questions` block. No block is normal: no note, no revision. Find it by its info string, never by line position. Classify each block under the canonical contract in `docs/bridge-ticket-standard.md`. A block is malformed when the reply has more than one `ticket-standard` block, when its content is not exactly the two lines of one permitted form, or when it comes after the terminal `open-questions` block. For each entry, retain either the exact valid pair next to the draft path you assigned to the same entry, or a malformed marker when the block is malformed, as a separate record for the parent, each child, or each sibling. A malformed block is a warning only: quote none of its content, request no revision because of it, and fail neither the draft nor the run. Never keep one run-wide source, never merge the conflict lists of different entries, and never write a pair the writer did not return. When an existing workflow redrafts an entry, replace that entry's retained pair or marker with the new draft's state, if any, so a stale pair or marker cannot survive a revision. Neither line belongs in the draft, the exploration document, or the uploaded description. This command does not read `ticket_correctness_standards` and does not forward a resolved ticket standard: each writer resolves it for itself, and the project-standards gathering and the regression gate stay owned here as before.

**Require the terminal writer report on every invocation.** Every writer invocation, whether the initial call, a retry, or a revision, must end its reply with the writer's `open-questions` report, after the draft path. The contract is:

> Exactly one fenced code block with info string `open-questions` must end the writer's reply, with no trailing prose. Its content is either the literal `none` alone or one entry per unsettled choice in the form `- question: … / why it blocks: … / options: …`, with all three fields non-empty. Empty, duplicate, mixed, incomplete, or non-terminal blocks are malformed. Missing or malformed blocks require writer revision and never mean "settled." The block is reply-only and never belongs in the ticket body.

The report is reply-only. Never copy it into a draft or a Jira body.

## Parent manifest section

**Normalize the epic parent's manifest section (epic only, automatic, no stop).** Ask the epic-parent writer for exactly this section, a peer-level `##` heading:

```markdown
## Ordered child manifest

- pending: child keys are written here after the children are created.
```

Then, before the upload gate, normalize the local parent draft (`parent.md`) yourself so it holds exactly one canonical `## Ordered child manifest` section with that fixed pending line. A manifest-section span runs from its heading through the line before the next `#` or `##` heading, or through the end of the body. Replace the first such span, remove every other manifest span (duplicates), and preserve every byte outside those spans. Place the normalized section immediately before `## Materials & Access`; when that heading is absent, append the section at the end of the body with a preceding blank line. The manifest stays a peer-level `##` section, so `## Materials & Access` remains the final major section when present. Normalization is idempotent: running it on an already-normalized draft changes nothing. It adds no approval, stop, owner question, or change to the frozen child split. The normalized local Markdown is the **parent Markdown source**: it is the initial parent body, and any later parent materials update advances the source to the last Markdown actually submitted for the parent. Fetched Jira text is never that source.

## Two-sibling overlap check

**Two-sibling overlap check (attended only).** When the shape is exactly two ordinary siblings, and after both drafts exist and pass the checks above, the main agent reads both finished drafts and assesses their scope boundaries, shared files, and criterion coverage. A shared file is a finding to assess; it is not automatic proof of overlap and not a reason to create an epic. Render exactly one outline line: `Overlap check: none`, or `Overlap check: {overlapping files, scope, or uncovered criteria}`. Recompute the line after any affected draft changes. This check adds no reviewer invocation, persisted record, extra prompt, or stop, and it never applies under `--auto` or to a lone ticket.

## Carried-finding repair

Copy each carried finding passed to a writer from `carried_ticket_local` in `epic-coherence.json`. Never retype it. When every `check-drafts` failure for a draft is `draft_missing_carried_finding`, repair that draft without a writer: rewrite the finding's bullet under `## Carried from epic coherence review` from the record's exact strings, then run the check again. Any other failure is a writer defect.

## Return

Go back to the Stage 9 pointer that sent you here and continue from that point. A
failure keeps the command's own writer-failure path, its `stage_failed` halt under
`--auto`, and its terminal contract; this procedure adds no halt reason, no stop, and
no terminal field.
