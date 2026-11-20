# `/define-tickets` post-create procedure

`/define-tickets` reads this procedure in Stage 9, in attended and `--auto` runs alike,
once, before its first `create_ticket` call. It holds the per-ticket materials
pre-check and inputs and the advisory real-key manifest write that follow creation.
The command keeps inline the creation authorization, the creation order, tracking, the
materials procedure lookup, the partial-failure stop, and every halt. Each section
below is followed at its pointer in Stage 9.

## Materials pre-check and inputs

**Materials pre-check, before resolving or reading the procedure.** Read the draft at the path recorded for this entry. If it is readable, classify it as having no materials when its `## Materials & Access` section is absent, or when that section holds no real eligible item under `Planning Assets`, `Downloadable Assets`, or `Planning & Downloadable Assets`. Headings alone, `none`, placeholders, the writer's line `No external materials are referenced`, and record-only references are not eligible items. For a confirmed-empty key, skip the procedure read, the materials `config_field` lookup, and every attachment operation, and record the per-key outcome as `no materials`. If the draft cannot be read, warn and fall through to the materials procedure below; never classify an unread draft as empty. For a ticket that does have materials, continue as written below.

For a ticket that does have eligible materials (or whose draft could not be read), run the procedure. Pass three inputs: `ticket_number` (the created key), `draft_file_path` (that entry's draft path from above), and `auto_approve_external`. Pass the literal `"true"` in every run, attended or `--auto`: external and auth-gated links stay record-only and nothing prompts, so the materials pass never adds a question. Mind the polarity: in that procedure `"true"` means unattended, the more restrictive mode. It is not permission to attach external links.

## No idempotency labels

Idempotency labels are deliberately not used. They ride on `create_ticket`'s `labels` argument and are read back through `get_tickets(labels=...)`, and **both are Jira-only**: against the local ticket backend each returns a terminal `409 UNSUPPORTED_IN_LOCAL_MODE`, and the create rejects without making a ticket. A resume protocol built on them would work on one backend and silently fail on the other.

## Real-key manifest

**Write the real-key manifest (epic only, advisory, after every child exists).** After the complete child-creation loop and every materials pass, and before the plan DAG step, replace the parent's pending manifest with the frozen run order, using real keys. This is a command-owned operation; the epic hand-off procedure does not do it.

- **Entry template.** One line per child, in frozen manifest order:

  ```text
  - {CHILD-KEY} depends_on: {KEY, KEY}
  ```

  The dependency value is `none` when the child has no hard prerequisites (`depends_on: none`). List hard `depends_on` prerequisites only, comma-separated. Never list `recommended_after`.
- **Keys.** Resolve every child and every hard prerequisite through the confirmed `create_ticket` result mapping. Never infer a key from a child number or title. If any child or dependency has no confirmed real key, skip only this write. Never submit `TBD-N`, `CHILD-N`, or any other placeholder key.
- **Read-only check.** Read the epic's current description with the existing ticket read and require exactly one parser-counted manifest heading: a Markdown `##` or a Jira `h2.` heading beginning "Ordered child manifest". The fetched text is read-only evidence. It is never used as update content and never patched.
- **Body.** Build the outgoing body only from the parent Markdown source: replace its manifest span (heading through the next `#`/`##` heading or end of body) with the new section, and preserve all remaining local Markdown byte for byte. Submit it with `update_ticket_description` using that Markdown, and keep it as the new parent Markdown source. An identical repeat operation resends the same body. Never fall back to an older draft when a newer parent Markdown submission exists but its local source is unreadable.
- **Failure is a warning.** An unreadable local source, a failed description read, a heading count other than one, a failed update, or a held update is a warning that names the epic key in the Final Report prose. Submit nothing when a precondition is unavailable. Do not retry, ask for approval, ask the owner, halt, park, or classify it as `create_failed`. Continue to the plan DAG step.
- **Partial creation.** If child creation stopped partway, skip this operation entirely and leave the pending manifest untouched.
- **Report.** Add the outcome (`written`, `skipped`, or `warning: <reason>`) to the Final Report line below. It adds no terminal JSON field.

## Why track

Bridge's workflow state lives in its own database, not in the ticket backend, and an untracked ticket is invisible to it — `update_ticket_state` and `get_ticket_state` both return 404 until something registers the key. Tracking works against either ticket backend and is a safe no-op when the key is already tracked.

## Return

Go back to the Stage 9 pointer that sent you here and continue from that point. Both
operations are warn, not halt: a failure is reported in the Final Report and never
changes a halt reason or adds a terminal field.
