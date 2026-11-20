Run the deterministic regression-reviewer (lightweight mode) against a proposed code change and report its blast radius — which real call-sites, tests, mocks, or config the change does and doesn't account for.

$ARGUMENTS

---

<!-- Platform coverage: this command reaches Cursor + Claude Code (the commands
     bundle is scaffolded to .claude/commands/ and .cursor/commands/ by --init).
     The companion `regression-reviewer` agent (agents/src/regression-reviewer.md)
     reaches Claude Code + GitHub Copilot. Union: Cursor, Copilot, and Claude
     Code all get this review, either via the command or the agent. -->

# Instructions

This is the standalone diff/PR (or ticket-description) review entry point for the regression-reviewer (BAPI-460). It mirrors the `regression-reviewer` agent's orchestration exactly — same subcommand, same parsing, same report — so the same logical review behaves identically whether invoked as a Cursor command or a Claude Code agent.

## Step 1 — Determine the Input Shape

Parse `$ARGUMENTS`:

- If it looks like a git diff range, a ref, a PR number, or is empty (defaulting to the working tree vs. `HEAD`), treat this as a **diff/PR invocation**. Resolve a `--diff <range>` value when one is given (e.g. `main...HEAD`, a commit SHA range); omit `--diff` to use the default working-tree-vs-HEAD diff.
- If it names specific function/class/symbol names (e.g. `--symbols resolve_db_params,SomeClass`, or prose describing a not-yet-diffed planned change), treat this as a **ticket-description invocation**. Extract the symbol names and pass them via `--symbols a,b,c`.

If neither a diff nor any extractable symbol names are available, stop and ask the user to provide one.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Resolve the packaged-CLI launcher **once**, before the first shell-out below, and reuse that one resolved value for every packaged-CLI invocation in this command. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Apply this command's mandatory single-quote escaping rule (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating `<launcher>` into a Bash command string. Never expand it unquoted.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

Worked examples and printed remediation hints below show the **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

## Step 2 — Run the Deterministic Core

Execute exactly:

```bash
<launcher> regression-check --mode lightweight --json [--diff <range> | --symbols a,b,c]
```

Do NOT hand-roll your own `ast-grep`/`ripgrep` invocations or re-discover call-sites yourself — the subcommand owns that structural analysis.

## Step 3 — Parse the Findings (Fail-Open)

Parse the JSON: `summary.symbols_analyzed`, `summary.truncated`, `summary.tools_used`, `summary.degraded_flags`, and the `findings` array (`symbol`, `file`, `definition_location`, `call_sites` (`count`, `by_file`), `broad_mentions`).

If `summary.degraded_flags` is non-empty (e.g. `ast-grep` or `ripgrep` was unavailable), do NOT treat the run as a failure. Proceed with whatever data IS present and call out each degraded section explicitly — never silently drop a gap. If `summary.truncated` is `true`, state that the symbol set was capped.

**Ripgrep degradation formatting**: if any entry in `summary.degraded_flags` mentions ripgrep, render it with an action-first visual hierarchy of three scannable segments rather than as a plain sentence:
1. **Status/Problem** — a warning header with a semantic warning indicator (e.g. ⚠️).
2. **Root Cause** — a brief note that `rg` must be a real binary on `PATH`; a shell function/alias is invisible to the spawned subcommand.
3. **Remediation** — a standalone, copy-pasteable install command (e.g. `brew install ripgrep`) on its own line.

Apply monospace typography (backticks) to every reference to a system command, CLI tool (`rg`), environment term (`PATH`), or installation package, in this warning and throughout the report.

## Step 4 — Synthesize Risk

For each symbol, compare `call_sites.count` against `broad_mentions.length`:
- **Accounted for**: every real call-site and broad mention is either already touched by the change or clearly unaffected (e.g. a doc/comment mention).
- **Not accounted for**: a real call-site, or an uninspected broad mention, sits in a file the proposed change does not touch. Name the specific file.

Rank "not accounted for" items by how directly they call the changed symbol (a real call-site outranks a textual mention).

## Step 5 — Propose De-Risking (Diagnostic Synthesis, Not a Patch)

For each "not accounted for" item, name ONE of:
- **Update the affected caller**: point to the exact `file:line` and describe what needs to change there.
- **Add a compatibility/guard seam**: when updating every caller isn't right (e.g. a public API, a config key read elsewhere), describe the seam needed — not its full implementation.

Do NOT implement the fix. State what needs to happen and where.

## Final Output

Print this report to chat (no file write required):

```markdown
# Regression Review: [Symbol(s) / Change Description]

**Mode**: lightweight
**Input**: [--diff <range> | --symbols a,b,c]
**Tools used**: [summary.tools_used, joined]
**Degraded**: [list summary.degraded_flags, or "none"]
**Symbols analyzed**: [summary.symbols_analyzed.length][ — TRUNCATED, capped at N if summary.truncated]

## Summary

[2-3 sentences: overall risk level, how many symbols are fully accounted for vs. not, and any degraded-tool caveats.]

## Systems Accounted For / Not Accounted For

Render as a `.data-table`-style markdown table (bold header row; left-aligned `Symbol` / `File` columns; tight ✅/⚠️ status indicators):

| Symbol | File | Real Call-Sites | Broad Mentions | Status |
|---|---|---|---|---|
| `helper` | `src/foo.py` | 3 | 4 | ⚠️ Not accounted for |
| `caller` | `src/foo.py` | 1 | 1 | ✅ Accounted for |

If `definition_location` is `null` for a symbol, degrade gracefully — do not leave the `File` column blank. Render a muted `—` placeholder there instead.

## De-Risking Guidance

### 1. [Symbol / File]
- **Issue**: [what's not accounted for, with file:line]
- **Recommendation**: Update the affected caller at `file:line` | Add a compatibility/guard seam — [describe]

[Continue for each not-accounted-for item]

---

*Generated by regression-check (lightweight mode). Structural findings via ast-grep + ripgrep; Pinecone semantic search not available.*
```
