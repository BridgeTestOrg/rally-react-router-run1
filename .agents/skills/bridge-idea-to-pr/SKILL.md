---
name: bridge-idea-to-pr
description: Run Bridge's idea-to-pr workflow when explicitly invoked as $bridge-idea-to-pr.
---

# Bridge workflow: idea-to-pr

Turn an idea into tickets with `$bridge-define-tickets --auto`, then hand the created keys to `$bridge-review-and-start --auto`.

This skill is explicitly invoked as `$bridge-idea-to-pr <input>`.
Treat the text after `$bridge-idea-to-pr` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

This command is a thin client-side wrapper around two commands that already exist:
`$bridge-define-tickets --auto` and `$bridge-review-and-start`. It runs them in that order, in this
session, and does nothing else. The flow is: validate input → invoke `define-tickets` →
inspect its final payload → hand off once or stop → report.

Stage 1 is one slash-command invocation and Stage 2 is another. There is no server-side run
to start, poll, resume, or schedule: this command holds no state of its own between the two
stages beyond the final payload Stage 1 returned.

## Stage 0 — Parse arguments

1. Tokenize `$ARGUMENTS` on whitespace. Recognize these position-independent flags; every
   other token is part of the idea:
   - `--allow-duplicate`
   - `--max-children=N` where `N` is a positive integer
   - `--auto`

   Flags are optional. Treat absence of a flag as the default; never pass empty-string or
   null as a placeholder. `$bridge-idea-to-pr --auto` is still accepted, but it is redundant:
   Stage 1 always invokes `define-tickets --auto`, with or without it.

2. Reject **unknown flags** — any token beginning with `--` that is not one of the three
   above — before invoking `define-tickets`. Stop and report the offending flag.

3. Reject a **non-positive or non-integer `--max-children`** value before invoking
   `define-tickets`. Stop and report the offending value.

4. Everything that is not a recognized flag is the free-form `idea` text. Join those tokens
   back together preserving order. Trim surrounding whitespace.

5. If the resulting `idea` is empty, stop immediately and display:
   ```
   Usage: $bridge-idea-to-pr <idea> [--allow-duplicate] [--max-children=N] [--auto]
   ```

## Stage 1 — Invoke `define-tickets --auto`

6. Invoke, **exactly once, in this same session**:
   ```
   $bridge-define-tickets --auto [--allow-duplicate] [--max-children=N] <idea>
   ```
   Forward the parsed idea text unchanged, and forward `--allow-duplicate` and
   `--max-children=N` unchanged when they were supplied. Omit a flag that was not supplied.
   In Claude and Cursor use the slash-command form above.

   When this workflow runs in Codex, invoke this instead:

   $bridge-define-tickets --auto [--allow-duplicate] [--max-children=N] <idea>

   `define-tickets` owns every stage of ticket creation. Do not restate, re-run, or
   shortcut any of them.

## Stage 2 — Inspect the final payload and hand off

7. Read **only the last fenced `json` block emitted by that invocation**. Ignore
   instructional examples, earlier output, and conversational JSON. Parse it as JSON and
   classify it against the four shapes `define-tickets --auto` documents. Never recover
   ticket keys from earlier output, from Jira queries, or from any other tool.

8. **Every `halted: true` payload is terminal**, regardless of any keys it carries. The
   terminal `halt_reason` values are `too_vague`, `duplicate`, `open_requirements`,
   `max_children`, `epic_coherence`, `create_failed`, and `stage_failed`. Report the reason
   with enough of its own fields to stay actionable, and state explicitly that no
   review/start handoff was made. Never fall through a halt to key collection or to the
   handoff below. A `create_failed` payload carries `created_keys` and `failed_entry`;
   report both, and never hand the partial `created_keys` to `$bridge-review-and-start`.

9. A **missing, unparseable, or shape-mismatched** final payload is terminal too. Stop,
   state that no review/start handoff was made, and never fall through to the handoff.

10. For a valid success payload, select the keys to hand off:
    - Siblings: the ordered `created_ticket_keys` list.
    - Epic: the ordered `child_ticket_keys` list. `epic_parent_key` is never handed off.

    Treat a missing key list, a list that is not an ordered list of key strings, or
    contradictory success fields (for example both key lists, or a success payload that also
    carries `halted`) as terminal, exactly as in step 9.

11. If the selected list holds zero keys, stop: this is an empty key list. Do not invoke
    `$bridge-review-and-start` with it, and state that no review/start handoff was made.

12. Otherwise invoke, **exactly once, in this same session**:
    ```
    $bridge-review-and-start --auto <KEY> [KEY ...]
    ```
    When this workflow runs in Codex, invoke `$bridge-review-and-start --auto --agent codex --host codex <KEY> [KEY ...]` instead. In Claude and Cursor retain the slash-command form above. Use the keys in payload order. `$bridge-review-and-start` accepts a variadic
    key list and threads `--auto` into both the review and the implementation phase of every
    session it spawns. The handoff always carries `--auto` — this command is hands-off by
    default. Do not loop per key and do not start a second review phase.

## Stage 3 — Final report

13. Keep the report compact:
    ```markdown
    ## Idea to PR Complete

    Idea: <first 80 chars of idea>...
    define-tickets --auto: <completed | halted | payload unusable>
    halt_reason: <reason, or "none">
    Keys handed off: <KEY, KEY, ... in payload order, or "none">
    Handoff: <"$bridge-review-and-start --auto <keys>" issued | not issued — <reason>>
    ```

14. On a halt, `Keys handed off` is `none` and `Handoff` states `not issued` with the
    `halt_reason`. On `create_failed`, also list `created_keys` and `failed_entry`, and tell
    the operator to reconcile those keys in Jira rather than replay ticket creation.

15. For a missing, unparseable, or shape-mismatched payload, state that ticket creation
    status is unknown. Direct the operator to Jira and the run's artifact directory to
    reconcile what was created before any rerun.
