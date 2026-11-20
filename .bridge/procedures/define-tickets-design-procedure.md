# `/define-tickets` design procedure

`/define-tickets` reads this procedure at the start of Stage 8, in attended and `--auto`
runs alike. It holds the detail for working out, recording, and presenting the design.
The command keeps inline the agreed ticket count, the path check after the split, the
after-design review, the document rewrite, the blast-radius prepass, every `--auto`
pointer, and every halt. Each section below is followed at its pointer in Stage 8.

## Stage 8 items 1–3 — Work out and commit to the design

1. **Work out the design against the ratified criteria.** Consider the approaches you know plus anything the council surfaced. For each candidate, establish which criteria it satisfies and at what cost. An approach that cannot meet a ratified criterion is not a candidate — discard it and say why.

2. **Resolve any tension explicitly.** Where meeting one criterion costs another, or costs an NFR, state which obligation your design privileges and what that costs the other. Do not let a tension pass silently.

3. **Commit to a single proposed design.** You are recommending, not offering a menu. Name the approach, describe how it works, list the files to create or modify, and map each ratified criterion to the part of the design that satisfies it. Where you seriously considered an alternative, record it and why you rejected it — as history, not as an open choice.

   **State how SFCC browser checks are verified.** For a Salesforce B2C Commerce repository, `## Criteria Coverage` states how each browser-checked criterion is verified. When an approved SFCC sandbox is configured, in any mode, changed cartridge files are uploaded first with `epic-implementer epic-server sfcc-upload`. The check then runs through the local dev server in `local` mode, or on the shared sandbox storefront in `sfcc_shared_active`. Storefront Next React-only changes need no upload and are checked through the local dev server in `local` mode. In `none` or `unknown` mode, the verification is a visible recorded hand-off. Never claim the sandbox storefront proves React-only changes. When a needed sandbox capability is unavailable, follow the ticket writer's rule for a requirement that defers what a criterion needs, and add no new prerequisite or stop. Never design a verification around a whole-cartridge upload, a Managed Runtime (MRT) push, a per-ticket code version, a code-version switch, or the repository deploy workflow.

## Stage 8 item 3 — Record the slices with a size band

**Record the implementation slices with a size band.** The design's sequence of work is also the proposed ticket split, so name each slice and size it with the ladder in the posture block below — `S` / `M` / `L` / `XL`, by file-touch breadth and rough LOC. Size the slices here, in the design, rather than at the handoff gate: the split is a design decision, and deciding it under the pressure of an approval prompt is how a coherent design turns into a swarm of tiny tickets. A slice that will not fit in `L` becomes one `XL` slice — do not split it to fit a band. Split only when it is genuinely two independent pieces of work, or when it runs past roughly 40 files / ~3000 LOC.

## Stage 8 item 6 — Present the design

6. **Present the design in chat and invite pushback.** Summarize the proposal in at most six bullets — the approach, the files it creates or modifies, the order of the work, and any ratified criterion the design only partially meets — and state clearly that it is a proposal. If the user objects, revise the design — but if their objection actually changes what the system must do rather than how it is built, say so: that is a criteria change, and it means reopening the criteria rather than quietly bending the design around it.

## Stage 8 item 4 — Second opinion calls

make one call per recorded question, at most two calls and 10 credits. Each call sends a self-contained `prompt` holding the finished design, its slices, the unchanged requirements, and that one question, with a `model` tier and a `provider` family different from the one you run on. The reply text is returned synchronously.

## Stage 9 item 1 — Readiness follow-ups

When something is still open at the Stage 9 readiness check, recommend the follow-up that would close it rather than creating a ticket on a soft foundation:

- A **wider council** (`request_council`) when the design would benefit from a broad review before implementation. If Stage 7 or Stage 8 already ran one, only suggest another when something material changed since.
- A **second opinion** (`second_opinion`) when a few specific contested points need an independent check.
- **Web or deep research** (`request_deep_research`) when the design still rests on technical unknowns that need grounding.

## Return

Go back to the `/define-tickets` Stage 8 pointer that sent you here and continue from
that point. This procedure adds no stop, no halt reason, and no terminal field.
