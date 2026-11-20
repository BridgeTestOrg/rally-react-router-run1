# `/define-tickets` blast-radius procedure

This procedure finds the files a proposed epic split would affect, before the split
freezes. It carries callers, mirrors, generated outputs, and pinned references into
the manifest, so that no affected file is left without an owner. The command reads it
on demand, at the end of Stage 8, and follows it once per prepass or refresh. Sections
that mention "the command" mean `/define-tickets`. Nothing here changes the
command-owned split rules, the `--max-children` cap, the writer fan-out, the upload
gate, creation, or the Final Report.

Use host-neutral capabilities only: "run a shell command", "read a file", "write a
file". Do not depend on one client's tool names.

## Applicability

Run this procedure whenever the command's existing epic trigger fires for the run,
that is, whenever the run will freeze an epic split. That includes an E1 contractual
epic with fewer than three children. Do not add a separate three-slice threshold, and
do not change the normal split threshold or its contractual exceptions.

Siblings (one or two ordinary tickets) treat this procedure as **advisory**. A sibling
run may use it to find affected files, but it requires no artifact and no check, and
no sibling step fails because the artifact is missing.

## When it runs

The ordinary execution point is the end of Stage 8, after the slices and their file
lists are recorded and before the epic split freezes. It runs the same way in
attended and `--auto` runs. Discoveries amend the provisional slice file lists before
the freeze. The completed artifact is written beside the manifest and the input, and
it exists before the first `epic-coherence-input check --structural` invocation.

A run that becomes an epic later, in Stage 9, runs the prepass then (late
escalation). It reuses discoveries that still apply and writes the artifact before its
first epic structural check.

Re-freeze loops refresh the artifact. The epic hand-off procedure defines each loop.

## Resolve the launcher

Resolve the trusted launcher prefix the same way the epic hand-off procedure does,
once per run. A prefix may have several words, for example
`node /absolute/path/to/mcp_server/build/index.js`. Keep it as written: never quote the
whole prefix as one executable. Independently escape and single-quote every dynamic
argument.

## Discovery

### 1. Build the symbol inventory

List every name the design changes or introduces. The inventory must not be empty. It
includes functions, classes, constants, subcommands, flags, field names, contract
phrases, reworded strings, and new file or function names. Record each as a string.

Split the inventory into two groups:

- **Supported design symbols**: identifier-like names that the regression check can
  search for.
- **Literals**: strings with spaces or regular-expression metacharacters, such as a
  reworded sentence. These never go through `regression-check --symbols`.

### 2. Run regression discovery for supported symbols

`MAX_SYMBOLS_PER_RUN` is 40. If the eligible inventory holds more than 40 symbols,
split it into complete batches of at most 40 and run every batch. Run each batch:

```bash
<launcher> regression-check --mode lightweight --symbols '<a,b,c>' --json
```

Read the actual JSON. Extract every file named as a call site and every file named as a
broad mention, using the output structure as `formatRegressionCheckJson()` produces
it. Record the `truncated` flag and the `degraded` flags each run reports.

### 3. Search for literals with fixed strings

For a literal with spaces or regex metacharacters, run a fixed-string search instead
of passing it to `regression-check --symbols`:

```bash
git grep -l -F -w -e '<literal>' --
```

Escape the literal correctly for the shell. Drop `-w` for a multi-word string, because
word-boundary matching does not apply to it. Keep default ignore behavior (see
Repair).

### 4. Apply the trap rules

Some files are affected through a source, not through a symbol. Add these files from
the checklist even when they are untracked or do not exist yet. Name the concrete
generated path:

- An `mcp_server/instructions/*.md` change affects `mcp_server/src/pipelines.generated.ts`.
  When the source is registered in `DOC_ASSETS` (in `mcp_server/scripts/bundle-docs.js`),
  it also affects `mcp_server/src/docs.generated.ts`.
- A `commands/src/*.md` change affects `.claude/commands/`, `.cursor/commands/`,
  `mcp_server/.claude/commands/`, and `mcp_server/src/commands.generated.ts`.
- An `agents/src/*.md` change affects `.claude/agents/`, `mcp_server/.claude/agents/`,
  and the matching `.github/agents/*.agent.md` files.
- A change to a writer-contract passage affects
  `tests/pytest/agents/test_jira_ticket_writer_standard.py` and its
  `CONTRACT_AMENDMENTS` mapping. That file is the pinned consumer of changed passages.
- A change to a string that another file pins literally affects that pinning file.
- A change to the count of MCP tools, profiles, or package bins affects the files that
  pin those counts.
- A change to text embedded in a golden or fixture file affects that file.

### 5. Normalize and merge

File identity is a normalized repository-relative POSIX path: use `/` separators and
strip a leading `./` (ripgrep prints one). When the same file is found more than once,
keep one row and merge the findings by set union of `discovery_reasons`.

`revision` is the full `HEAD` SHA captured when discovery runs. Searches inspect the
working tree as it stands at that moment, including uncommitted edits.

## Repair

Discovery can be degraded or truncated. Repair it. Never lose coverage silently.

- For every batch whose result is degraded or truncated, record at least one targeted
  search for **each** affected symbol. This includes symbols omitted by truncation.
- A recorded search is its actual `query`, the coverage problem that required it as
  `reason`, and its complete normalized `files` list. An empty list is a valid
  zero-result search.
- Limit repair searches to tracked-file `git grep` or ordinary `rg`. Never pass
  `--no-ignore` or `-u`: default ignore rules stay in force.
- Across all calls, `truncated` is the logical OR of every run's value, and
  `degraded_flags` is the set union of every run's flags. Never clear either after a
  repair.
- When any contributing run was degraded or truncated, write `coverage` as
  `degraded_repaired`. Otherwise write `complete`.

A zero-result search is a success. An execution failure is not. Degradation by itself
never halts the run. If a repair search cannot be run, or the artifact cannot be
written, use the command's existing `stage_failed` handling and name the stage that is
doing the work (Stage 8 for the ordinary prepass, Stage 9 for a late escalation or a
re-freeze refresh). This procedure adds no halt reason.

## Dispositions

Every discovered file gets exactly one disposition:

- `child`: the manifest ID of the accountable owner. The concrete normalized path must
  appear in that child's `touched_files` or `read_files`. Ownership is accountable, not
  exclusive: a shared file may be owned through two children, and sharing adds no
  `depends_on` edge.
- `unaffected_reason`: a reason specific to this file that says why the change does not
  affect it. A bare classification is not a reason. These blanket values, compared
  after trimming and ignoring case, are rejected: `generated`, `test-only`,
  `tests only`, `n/a`, `unaffected`.

When a file needs an owner, amend the provisional slice file lists first. A file with
no owner and no specific reason blocks the check.

## Artifact

Write the artifact to `{docs_dir}/epic-plans/{slug}/blast-radius.json`, beside
`epic-manifest.json` and `epic-coherence-input.json`. It carries every discovered file,
even when the summary shown to the owner abbreviates the long tail. Version 1:

```text
schema_version: 1
revision: non-empty string        # full HEAD SHA at discovery time
symbols: non-empty array of strings
regression_check:
  truncated: boolean
  degraded_flags: array of strings
targeted_searches:
  array of {query, reason, files}
coverage: complete | degraded_repaired
files:
  array of {path, discovery_reasons, child}
  or       {path, discovery_reasons, unaffected_reason}
```

`discovery_reasons` is a non-empty array of non-empty strings. Unknown extra fields are
ignored and never authorize anything. `epic-coherence-input check` and
`check --structural` read this file when it exists and report named errors for a
malformed envelope, an invalid path, a duplicate path, a missing or doubled
disposition, an unknown or non-owning child, a blanket reason, and a `complete`
coverage that contradicts a truncated or degraded run. Siblings need no artifact.

## Refresh

Refresh the artifact inside every re-freeze loop, before the structural check:

- When an amendment only moves already-discovered files between children, update the
  dispositions and rewrite the artifact.
- When an amendment introduces new symbols, literals, contracts, or trap triggers, run
  incremental discovery for just those, then merge the results with the existing rows.
  Keep earlier rows and their discovery reasons unless a recorded correction explains
  why one is removed.

Rebuild each affected child's research packet from the refreshed rows before its
writer runs.

## Owner-facing report

Show the owner a short summary: the file count, the coverage value, and, when
degraded, the degraded flags in plain words. A degraded run is reported as degraded and
still proceeds. The summary may abbreviate the long tail of files. The artifact never
does.

## Return

This procedure returns nothing on its own. After the artifact is written, go back to
the `/define-tickets` pointer that sent you here and continue from that point. Report
the artifact path, its file count, its coverage value, and any degraded flags in the
command's own terms. A halt keeps the command's halt reason and terminal contract; this
procedure adds no halt reason and no terminal field.
