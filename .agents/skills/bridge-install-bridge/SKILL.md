---
name: bridge-install-bridge
description: Run Bridge's install-bridge workflow when explicitly invoked as $bridge-install-bridge.
---

# Bridge workflow: install-bridge

Bootstrap Bridge API project configuration from the local codebase via the easy-install manifest.

This skill is explicitly invoked as `$bridge-install-bridge <input>`.
Treat the text after `$bridge-install-bridge` in the user's message as this workflow's input.
If no input follows the invocation, follow the canonical workflow's existing usage/error behavior.

---

# Instructions

**How to run this.** Run `$bridge-install-bridge` now, with no arguments — that is the entire invocation.
"Install-spawn context" (described below) is a mode identified by the spawning instruction's own
prose, not a command-line option — never turn it into `--context install-spawn` or any other
argument. The Bridge MCP tools this command names (`ping`, `get_install_manifest`,
`apply_install_manifest`) exist only inside the currently running agent session —
never invoke them through Bash or by constructing a direct HTTP request. This command owns and
automatically drives its own internal stages; do not reproduce or hand-execute those stages
yourself. Never place the API-key value in a Bash command, its arguments, printed output, a log
line, an error message, or a file you write; verify connectivity with the `ping` MCP tool only —
never through an environment export, `echo`, or another shell command.

This command takes no arguments; any `$ARGUMENTS` text is ignored.

Command contract version: **10**. The install manifest returns a `command_contract_version`; Stage 2
compares it to this number to detect a stale scaffolded copy of this command.

This command has three visibly labeled outcomes, chosen by the project's state (Stage 2 decides them
in a fixed order from the manifest), never by the caller's role:

- **JOIN MODE** (`configured == true`): the project is already set up, so this run proposes and
  applies ZERO configuration changes for ANY caller. A new teammate — including a non-admin "member"
  key — gets a graceful welcome and the concise capability report instead of an error.
- **GREENFIELD REPORT-ONLY** (the manifest's `greenfield_setup_path` field is set): this project
  already completed the greenfield setup path, so this run asks nothing and writes nothing — it
  reports and stops. See Stage 2.
- **CLASSIFY** (neither of the above): Stage 2b decides whether this is a greenfield or an
  established repository. Established runs the original, unchanged derive → approve → apply → report
  flow (Stages 3 → 4 → 5 → 6 → 7 → 8 → 9). Greenfield hands off to the packaged
  `greenfield-setup` recipe in this same session and then resumes reporting.

The stale-command rule and the server-authoritative `next_step` behavior are unchanged by all three:
a manifest version higher than this file's still warns, and Stage 8 still renders only what the
server put in `next_step.command`.

This command performs a one-time "easy install" of Bridge API project configuration. It reads the
server-owned install manifest once, derives values for the **unset** bootstrap fields from the local
codebase, asks for human approval of the project description, applies everything in a single atomic
call, and then presents a **concise capability report** derived from a fresh read-after-write manifest
read. The server owns all skip-if-set, conflict, and confirmation semantics — this command never makes
its own skip-if-set decisions — and the server owns the complete tool catalog and the bounded concise
projection over it, their grouping and ordering, and every gate and dependency relationship; this
command formats the server's contract and never recomputes it from prose. Indexing is never a decision
this command makes or asks about: it starts automatically, gated entirely by server-side readiness (see
Stage 8).

This command is portable across Claude Code, Cursor, and Copilot: it only drives the Bridge API MCP
tools (`ping`, `get_install_manifest`, `apply_install_manifest`).

**Plain-language narration (BAPI-1174).** Every major operation this command performs — reading the
manifest, deriving field values, applying the configuration, persisting the routing credential,
rendering the capability report — gets a short, plain-language explanation of WHAT is happening and WHY
it matters to the person running the command, in ordinary words rather than internal shorthand.
User-facing narration you author yourself must never name an internal stage number, this command's
contract version, a raw internal MCP tool identifier (`get_install_manifest`, `apply_install_manifest`,
…), or a manifest field key (`command_contract_version`, `next_step`, `configured`,
…) — say what is actually happening instead ("checking whether this project is already set up," not
"reading `configured` from the manifest"). This restriction is scoped to narration YOU compose: it does
not touch this file's own internal procedure, which keeps its stage headings, contract-version checks,
and tool/field names exactly as written — an agent following these instructions still reads them
verbatim to decide what to do next; it just never repeats that internal vocabulary back to the person
running the command. Two exceptions are not narration at all and stay exactly as specified wherever
this file calls for them: a user-invocable command name (`$bridge-install-bridge`, `$bridge-learn-repository`,
`connect-github`, `start-tickets`, …) that the person needs to actually run, and any value a stage
explicitly marks as server-authored and rendered verbatim (the concise capability report, `human_setup`
display text, a `next_step.command` string) — those are never reworded, curated, or filtered by you
either way.

Fatal connectivity, manifest, apply, and read-back failures stop the flow. Individual approved-file
upload failures are reported while other eligible uploads continue; apply remains partial-tolerant.
For any other fatal stage failure, stop immediately and explain in plain language what could not be completed and why
— describe the actual problem (a failed manifest read, a rejected field, a connectivity error) rather
than naming the internal stage label.

**Install-spawn context.** When the spawning instruction explicitly says this `$bridge-install-bridge` run is
in the "install-spawn context" (it was launched by the `install-bridge` CLI's fresh agent session),
Stage 8 and Stage 9 are SKIPPED and the single closing interaction is the concise capability
report plus whatever conditional next step the manifest provided — the spawn prompt owns that same
`next_step.command` rendering there, under the same non-empty rule. When you invoke
`$bridge-install-bridge` directly (manual invocation), Stages 8 and 9 run normally.

Stage 6 is likewise NOT skipped in the install-spawn context — it still persists the routing
credential — but its SUCCESS output is silent there, because the `install-bridge` CLI has already told
the user where the credential landed and a second sentence is a duplicate. Silence covers every place
that success would otherwise be restated, including the Return contract, and it covers success ONLY: a
Stage 6 failure is still reported loudly and in full. JOIN MODE and manual invocation are outside this
rule and report Stage 6 success exactly as they do today.

## Packaged CLI launcher (`BAPI_MCP_CLI`)

Resolve the packaged-CLI launcher **once**, before the first packaged-CLI command this stage set names, and reuse that one resolved value throughout. Call it `<launcher>`.

- Read the `BAPI_MCP_CLI` environment variable.
- **Unset, empty, or whitespace-only** — `<launcher>` is exactly `npx -y @bridge_gpt/mcp-server`. This is the default, and the resulting shell command is byte-identical to what it was before this override existed.
- **Otherwise** — `<launcher>` is that value, used verbatim as the command prefix. It names a local launcher, such as `node /absolute/path/to/mcp_server/build/index.js`. Use it for local pilots and pre-publish verification.

When the override is set:

- Apply this command's mandatory single-quote escaping rule (`'` → `'\''`, then wrap the whole value in single quotes) before interpolating `<launcher>` into a Bash command string. Never expand it unquoted.
- Keep every dynamic argument — ticket keys, branch names, base branches, file paths — independently quoted. Never concatenate an argument into the launcher value.
- Never put a credential, an API key, or an environment assignment carrying one into the launcher value, an example, or a dry-run preview.

The packaged-CLI commands this command *prints for the user to run* (`--init`, `credentials migrate-agent-config`, `doctor`) are written below in their **unset** resolution — the literal `npx -y @bridge_gpt/mcp-server` — because that is the default every operator gets. When `BAPI_MCP_CLI` is set in this environment, print those remediation commands with the resolved `<launcher>` in place of that prefix so the advice matches the operator's actual setup. A stale local build is exactly as misleading as a stale npm publish: rebuild with `cd mcp_server && npm run build` before relying on the override.

## Development credentials (credential-review procedure)

Approving development credentials records **references** — names and source locations, never values — in the owner's local record at `~/.config/bridge/worker-credentials/<repo>.json`. The approval controls what future Epic Implementer workers may receive. Nothing in this procedure copies, prints, or sends a value. Later stages call this procedure by name; it runs at most once per `$bridge-install-bridge` run, and it is subordinate to the core install result: a problem here never blocks the install.

**Scan.** Run `<launcher> credentials references scan --json` through the resolved `BAPI_MCP_CLI` launcher (see "Packaged CLI launcher"), from the project directory, with the same repository selection the other `credentials references` commands use. Quote `<launcher>` and every dynamic argument independently. Read stdout as exactly one JSON document. The scan does not open ignored or untracked credential files: it reports them by file name or relative location only. There is one exception: an ignored or untracked `dw.json` at the project root gets one bounded check, which reports only a host class (`sfcc_sandbox`, `not_sandbox`, or `unknown`) and the names of the selectors that are present — never the hostname, a value, or an error. Its status step may read sources the owner already approved.

**Build the proposal.** Present it as compact Markdown lists, not wide tables. For each proposed reference show: the reference name, the origin or source path, the key mapping (output variable name to the named key or selector), the selected consumers, the level as text (`sandbox`, `restricted`, or `production`), and a one-line reason.

- **MCP servers are origin-specific.** Show a row for each origin (project `.mcp.json`, project `.cursor/mcp.json`, Claude user config, Cursor user config, `.bridge/config`). Never merge same-named servers from different origins. Bind each approved `mcp_server` consumer to the selected definition: copy the `launch_fingerprint` the scan returned for every `.bridge/config` server, and use the supported fingerprint binding wherever two launches share a name.
- **Convention mappings are candidates.** A mapping that comes only from the scan's convention hints for a file the scan did not open (for example `dw.json`) is labeled **candidate mapping**, defaults to `restricted`, and stays unconfirmed until `references apply` returns its status. This wording stays in force for every hint whose `host_probe.host_class` is `not_sandbox` or `unknown`, and for every other convention hint.
- **A sandbox host is a proposed default, never approval.** Only when a `dw.json` hint reports `host_probe.host_class` of `sfcc_sandbox`, propose these two entries, in this order, at level `sandbox`. Nothing is approved or delivered until the owner approves the proposal.
  - `sfcc-dw-json`: source `{ kind: "file", path: <absolute-source> }` and one `{ kind: "worktree_file", dest: "dw.json" }` consumer (use the hint's `whole_file_dest`).
  - `sfcc-dw-json-env`: source `{ kind: "file_keys", path: <same-absolute-source>, format: "json", keys: <filtered-mapping> }` and an `{ kind: "env" }` consumer. The filtered mapping is the hint's mappings, which already hold only selectors that are present. Omit this entry only when that mapping is genuinely empty, and say that the whole-file entry can still be approved on its own.
- **Never write to a delivered `dw.json`.** Tools must not write to it, including through `b2c setup set`, because the link targets the owner's original file.
- **A sandbox pair replaces same-source restricted entries.** Show every existing restricted entry that uses the same source as an explicit change to the sandbox pair, never the pair added beside a restricted twin. Move every existing MCP-server consumer to `sfcc-dw-json-env` with its `launch_fingerprint` unchanged, and say plainly that those servers would then receive the wider mapping. Add further SFCC MCP consumers only through the scanned-server and origin rules above. Carry a mapping that is not a convention mapping only when its selector's presence is confirmed through permitted evidence; show unconfirmed mappings and variable-name collisions to the owner to resolve, and never drop them silently or widen the probe. Keep unrelated existing entries as they are; the digest-protected whole-record apply and the `one_level` rule stay authoritative.
- **`unknown` is neutral.** Say classification was unavailable, no content was exposed, and restricted handling is unchanged.
- **Dotenv sources are named keys only.** Propose `.env` files as named keys. Never propose delivering a whole dotenv file.
- **Whole-file sandbox delivery is an explicit owner choice.** Offer it only for an eligible non-dotenv file, never as a default, and show this warning every time: the delivered file is a symlink, so a tool that writes to it changes the owner's original.
- **Valid combinations only.** A `restricted` reference may have only `mcp_server` consumers, and a `production` reference has none. Do not invent an MCP consumer to make a restricted mapping look deliverable; list an unresolved consumer choice as a gap instead.

**Preserve the existing record.** The proposal is the WHOLE record, because `references apply` replaces the whole list. Carry every existing approved entry (the scan's `references.entries`) forward unchanged by default. Show additions, changes, existing entries whose source is missing or unreadable (kept, with their status), and any removal the owner explicitly asks for. Removal happens only through an approved proposal here; it takes effect at the next worker start, and a reference-backed entry leaves no copy to clean up.

**No findings, partial scans, and unusable records.**

- Say "no development credentials found" only for a completed scan (`complete == true`) with no findings and an absent or empty valid record.
- If the scan is incomplete, report one fixed advisory per `diagnostics` category and source (Git classification incomplete, source unreadable, parse failure, invalid configuration) and never describe it as "none found".
- If `references.status.state` is `record_unusable`, or `references.consistent` is false, the existing record is unsafe to replace: report its state, propose nothing that would replace it, and apply nothing.
- An empty scan, a declined proposal, a headless session, or an unanswered question applies nothing and erases nothing. A nonempty existing record stays visible with its statuses.

**Approve and apply.** Ask once, inside the approval this stage set already uses (Stage 4, or the single approval JOIN MODE and GREENFIELD REPORT-ONLY offer). The owner may challenge a level or change an entry in that same answer. Do not add a separate credential prompt and do not build a wizard or browser UI. On approval:

1. Create a fresh directory with the OS temporary-directory facility, and create the proposal file inside it exclusively with mode `0600`. Never place the proposal inside the checkout. Remove the file and directory in a finally-style cleanup, best effort, whether apply succeeded or not.
2. The file holds names and paths only: no value, token, or secret.
3. Run `<launcher> credentials references apply --file <proposal-path> --expect-digest <digest>` with the exact `references.digest` that was displayed during approval. Quote each dynamic argument independently. Keep values out of the file, the command line, environment assignments, and server requests.
4. If apply reports a stale digest, leave the current record intact, run the scan again, and show a refreshed review. Never overwrite automatically.
5. If apply refuses or fails, treat it as a warning, continue the surrounding install, and do not claim the proposal was recorded. Report the immediate names-only statuses apply printed, including `key_missing`.

**Report one credential-summary line** on every path, using only names: the references recorded, any advisory missing or unreadable names, `proposal pending` when approval is outstanding (headless, declined, or unanswered), `no development credentials found`, or the incomplete-source advisory. On Windows, state that the file channel is "not supported on Windows yet"; the variable and MCP channels remain available.

The credential record is local machine state, not project configuration. Reviewing or recording credentials never counts as a configuration change.

## Stage 1 — Admin preflight (defer the permission decision until the manifest is read)

1. Call the `ping` MCP tool (no parameters) and read `role` and `customer_type` from its first
   (JSON) content item. Retain both — later stages branch on them (Stage 2's mode decision uses
   `role`). Both are best-effort and
   nullable: a `null` `role` means "not determined", which covers a legacy shared key as well as an
   unconfigured install-join context, and it never fails the ping.
2. Classify the caller, but do NOT stop here — the member permission decision is DEFERRED until Stage 2
   has read the manifest and determined whether the project is already `configured`. A member must be
   allowed to continue at least far enough to read the manifest, because a member CAN join an
   already-configured project even though a member cannot configure a fresh one:
   - If `role` is `"admin"`, or `role` is `null` (not determined — e.g. a legacy shared key): the
     caller is configuration-capable (it may run the fresh-configuration flow when the project is
     unconfigured).
   - Otherwise (an explicit non-admin role such as `"member"`): the caller is join-only. It may proceed
     into JOIN MODE for a configured project, but must be refused if Stage 2 proves the project is not
     yet configured (it cannot configure a fresh repo).
3. Preserve this exact refusal text for later use — it is emitted in Stage 2 ONLY when a non-admin
   member reaches a `configured == false` project:
   ```
   Admin role required to apply install configuration. Ask a project admin to run $bridge-install-bridge,
   or use an admin API key.
   ```

## Stage 2 — Read the manifest (once, pre-apply)

1. Call the `get_install_manifest` MCP tool exactly once here.
2. For the established flow only, keep the returned `snapshot_token` verbatim — you must pass the SAME token to the apply call in
   Stage 5. For a greenfield handoff, this response is classification/routing evidence only; the recipe’s single initial manifest result supplies its own greenfield snapshot token. Do not call `get_install_manifest` again before applying; a fresh read would invalidate
   the token you are about to use. (Stage 7 performs a SEPARATE, later read-after-write manifest read
   for the current capability status — that is deliberate and does not reuse this token.)
3. The manifest contains ordered `groups` of bootstrap fields (each with `field_name`, `is_set`,
   `current_value`, `guidance`, `examples`, `validation_summary`, `requires_confirmation`), a list of
   `deferred_fields`, a `next_step`, `done_criteria`, a `command_contract_version`, and the
   `snapshot_token`. It also carries the additive capability fields (`integrations`, `configured`,
   `learned`, `indexed`, `tool_capabilities`, `workflows`, `concise_tool_capabilities`, `human_setup`,
   `locked_tools`, `unlocked_tools`) — but ignore those here; the accurate capability status is the
   post-apply read in Stage 7. `tool_capabilities` is the COMPLETE catalog-backed report field (one
   entry per registered MCP tool, grouped and ordered by the server); `workflows` is the separate
   curated collection of non-MCP workflows (slash commands and packaged CLI subcommands, which are not
   registered MCP tools and never appear in `tool_capabilities`); `concise_tool_capabilities` is the
   ADDITIVE projection over BOTH of those that Stage 7 actually renders — a server-ordered array of
   exactly two availability sections, each `{id, name, tools}` holding mixed capability items (see
   Stage 7); `human_setup` is a SEPARATE additive top-level list (contract v9) naming each remaining
   unconfigured integration and what finishing it unlocks — also rendered by Stage 7, and never a third
   section of `concise_tool_capabilities`; `locked_tools` / `unlocked_tools` are LEGACY compatibility
   data covering only the VCS/index policy cases and are NOT the tool inventory.
4. Compare the manifest's `command_contract_version` to this command's contract version (10, stated at
   the top of this file). If the manifest's version is HIGHER, this scaffolded command copy is stale:
   warn the user to refresh it by running `npx -y @bridge_gpt/mcp-server --init` in the project root,
   then proceed conservatively — wherever the manifest's `guidance`, `next_step`, or `done_criteria`
   differ from these instructions, follow the manifest.
5. **Decide the outcome from the manifest, in this exact order.** Evaluate these three branches in
   sequence and take the FIRST one that applies. The order is the contract: a configured project is
   never classified, and a completed greenfield project is never classified or re-onboarded.
   1. `configured == true` → **JOIN MODE** (below).
   2. the manifest's `greenfield_setup_path` field reports `is_set == true` → **GREENFIELD
      REPORT-ONLY** (below). Read that field from the ordinary `groups[].fields[]` list, the same way
      you read any other bootstrap field — there is no top-level copy of it. This is the completion
      marker for the greenfield path: the greenfield recipe writes it exactly once and the server
      treats it as skip-if-set, so a set value means "this project already finished greenfield
      onboarding".
   3. neither of the above → **Stage 2b — Classify**.

   The branches:
   - **`configured == true` → JOIN MODE, for EVERY caller** (admin, legacy, or member). The project is
     already set up, so this run makes ZERO configuration changes. Emit a concise welcome — for
     example: "This Bridge project is already configured. You're joining it as a new teammate; no
     configuration changes will be proposed or applied." Then SKIP Stages 3, 4, and 5 entirely (no
     field derivation, no project-description approval, no `apply_install_manifest` call, no
     `config_field` writes), run the **Development credentials** procedure and offer its single
     approval only when the scan's findings warrant a proposal (the credential record is local machine
     state, not project or server configuration, so the zero-configuration statement stays true), run
     Stage 6 (persist the routing credential), and render the JOIN MODE
     branch of Stage 7 (the concise capability report, drawn directly from THIS Stage-2 manifest — no
     read-after-write). Then EVALUATE Stage 8 conditionally — it renders only when THIS Stage-2
     manifest's `next_step.command` is a non-empty string, and is silent otherwise — and SKIP Stage 9.
     The server has already encoded recommendation eligibility (learned state AND whether this caller
     can run the command) in `next_step.command`, so do NOT reproduce a role gate or a learned-state
     gate here: a joining member simply receives an empty command and sees nothing.
   - **`greenfield_setup_path.is_set == true` → GREENFIELD REPORT-ONLY, for EVERY caller.** This
     project already completed the greenfield setup path, so this run performs NO classification, NO
     field derivation, NO interview, NO standards generation, NO `config_field` write, and NO
     `apply_install_manifest` call. Say so plainly — for example: "This project already completed
     greenfield setup. Nothing to configure; here is where it stands." Then SKIP Stages 2b, 3, 4, and
     5 entirely, offer the same optional **Development credentials** review (without re-running onboarding
     or touching project configuration), run Stage 6 (persist the routing credential), and render the
     GREENFIELD REPORT-ONLY branch of Stage 7. That report is sourced from THIS Stage-2 manifest and there is deliberately no
     read-after-write call: this branch performs no setup write, so a second read would return the
     same bytes at the cost of a round trip. Then EVALUATE Stage 8 conditionally against THIS same
     Stage-2 manifest's `next_step` — the server decides whether to name `connect-github` or nothing —
     and SKIP Stage 9. In the install-spawn context the ordinary Stage 8–9 skip set still applies
     unchanged.
     This branch is reached for a member key too: like JOIN MODE it writes nothing, so the "Admin role
     required" refusal does not apply to it.
   - **`configured == false` and `greenfield_setup_path` is NOT set → apply the deferred Stage 1 role
     decision:**
     - `source == "legacy"` or `role == "admin"`: continue to **Stage 2b — Classify**, which decides
       between the established flow (Stages 3 → 4 → 5 → 6 → 7 → 8 → 9, exactly as written and
       unchanged) and the greenfield handoff.
     - a non-admin `user_access` "member" key: stop immediately and display the exact refusal text
       preserved in Stage 1 ("Admin role required to apply install configuration…"). Do not classify,
       derive, apply, or persist anything.
   - **`configured` absent / indeterminate (neither `true` nor `false`) → do NOT treat it as `false`.**
     `configured` comes from a best-effort capability enrichment that can silently omit the key on a
     transient server-side probe failure, so a missing value is "unknown", not "unconfigured". Re-read
     the manifest ONCE (a fresh `get_install_manifest` call) to try to resolve it, and re-evaluate the
     ordered branches above against that refreshed response — it is the authoritative manifest from
     then on, including its `snapshot_token`, its `greenfield_setup_path` field, and its `next_step`.
     If `configured` is STILL absent:
     - `source == "legacy"` or `role == "admin"`: proceed, but NOT silently — first tell the user that
       configuration status could not be confirmed and that the run will continue anyway (the server
       owns skip-if-set, so an apply against an already-configured repo is a safe no-op). Then resume
       the ordered evaluation at branch 2: a set `greenfield_setup_path` still means GREENFIELD
       REPORT-ONLY, and only an unset one reaches Stage 2b.
     - a non-admin `user_access` "member" key: take the JOIN-MODE-safe path — render the welcome and the
       Stage 7 capability report (no config writes, no Stage 9/10 offers), evaluate Stage 8 under its
       normal non-empty-command rule, and note that configuration status could not be confirmed. Do NOT
       emit the hard "Admin role required" STOP: that refusal is reserved for a
       *definitive* `configured == false`, because treating an unknown state as unconfigured would
       re-introduce the very member hard-refusal this flow removes.

## Stage 2b — Classify the repository (greenfield or established)

**Run this stage ONLY when neither prior Stage 2 branch applied** — that is, the project is not
`configured`, its `greenfield_setup_path` is not set, and the Stage 1 permission rules allow this
caller to configure the project (`source == "legacy"` or `role == "admin"`). JOIN MODE and GREENFIELD
REPORT-ONLY never reach this stage, and a non-admin member was already refused above.

This stage decides ONE thing: is this a brand-new project that has no code to learn from yet
(**greenfield**), or a real codebase (**established**)? It writes nothing.

1. **Gather evidence from the local checkout**, excluding Bridge's own files from every count and from
   the "is the tree empty" judgement: `.mcp.json`, `.cursor/mcp.json`, `.claude/commands/`,
   `.cursor/commands/`, `.bridge/`, and the resolved `{docs_dir}` tree. Those exist because Bridge was
   installed, so counting them would make every Bridge-installed empty project look established.
   - **Scaffold evidence** (points toward greenfield): package manifests (`package.json`,
     `pyproject.toml`, `go.mod`, `Gemfile`, `*.csproj`), lockfiles, a README, generated or template
     configuration, an empty or near-empty `src/`, and a framework template's untouched entry point.
   - **Established evidence** (points toward established): substantive implementation files (real
     modules with real logic, not a generator's placeholder), meaningful tests, and a non-trivial local
     `git log`.
2. **Established evidence dominates.** Any credible established evidence decides the answer, no matter
   how much scaffold evidence sits beside it — a real codebase that also has a `package.json` and a
   README is established. Scaffold evidence only decides the outcome when there is no credible
   established evidence at all.
3. **Missing Git metadata is neutral.** No `.git` directory, no commits, or no remote is neither
   evidence nor a problem: a brand-new project legitimately has none of them, and so does a directory
   whose history lives elsewhere. Do not report it as an error or a warning, and do not let it push the
   decision on its own.
4. **Print exactly one primary statement**, in this exact form:
   ```
   Classification: Greenfield — reply "established" to correct, or continue.
   ```
   or, for the other result:
   ```
   Classification: Established — reply "greenfield" to correct, or continue.
   ```
   Beneath the Greenfield statement, explain: “A new/starter project has no substantive implementation
   to learn from yet. Setup offers catalog defaults or an interview for project-specific standards.”
   Never describe an established JavaScript/TypeScript repository as unsupported merely because
   catalog defaults are empty.
   Keep that line and its correction token the primary hierarchy. A compact scaffold-versus-established
   evidence summary may follow it — one or two short lines — but only when it genuinely explains the
   decision; never a file listing, a count table, or a diagnostic dump.
5. **Accept a one-token correction for exactly one response turn.** Accept ONLY the trimmed, lowercased
   opposite token (`established` when you said Greenfield, `greenfield` when you said Established) and
   switch to it. Anything else — an unrelated answer, a blank response, an unavailable response,
   silence — continues with the original classification. Do not re-ask, do not re-explain, and do not
   enter a correction loop.
6. **Never wait in a headless session.** When no interactive response can be obtained, do not pause for
   the correction turn at all, and classify conservatively: choose **greenfield** ONLY for an empty or
   clearly near-empty tree with no substantive implementation files, no meaningful tests, and no
   non-trivial history. Everything else is established. A wrong "established" costs a skippable
   derivation pass; a wrong "greenfield" would onboard a real codebase as if it had no code.
7. **Established → run the existing flow unchanged.** Continue to Stage 3 and proceed exactly as
   written (Stages 3 → 4 → 5 → 6 → 7 → 8 → 9). This stage changes nothing about derivation,
   approval, or apply behavior for an established repository.
8. **Greenfield → hand off to the packaged `greenfield-setup` recipe, in this same session.**
   1. Call the `get_pipeline_recipe` MCP tool with
      `{ "pipeline": "greenfield-setup", "variables": { "repo_name": "<this repository's configured
      name>" } }`. Pass `repo_name` explicitly — the server auto-supplies `docs_dir` but not
      `repo_name`. Do not pass `auto_approve`: greenfield onboarding asks the human real questions.
   2. Follow the returned `agent_instructions` and execute EVERY returned step, in order, to
      completion, here in this same agent session — exactly as `$bridge-learn-repository` runs its recipe.
      Do not spawn a second agent for it, do not summarize the recipe instead of running it, and do
      not return to Stage 6 partway through.
   3. The recipe owns the greenfield apply: its final task makes the one `apply_install_manifest` call
      (with the recipe’s single initial `get_install_manifest` snapshot token) and then performs its own read-after-write
      `get_install_manifest`. **Require that read-after-write manifest as the recipe's final result
      before resuming.** If the recipe cannot provide it, report that the greenfield setup did not
      complete and stop — do not fabricate a report from the stale Stage-2 manifest, and do not
      re-apply.
   4. After the recipe returns its authoritative completion result and before Stage 6, run the
      **Development credentials** procedure (its single approval, no separate wizard). A problem there
      never changes the recipe's result.
   5. Then resume at Stage 6 (persist the routing credential), render the greenfield-completion branch
      of Stage 7 from that read-after-write manifest, evaluate Stage 8 against that same manifest's
      `next_step`, and SKIP Stage 9.

## Stage 3 — Derive values for UNSET bootstrap fields only

**Skip this entire stage in JOIN MODE** (Stage 2 selected JOIN MODE because the manifest reported
`configured == true`). JOIN MODE derives nothing — it proposes and applies zero configuration for every
caller. Run this stage only on the `configured == false` fresh-configuration path.

1. Consider ONLY fields whose `is_set` is `false`. Never re-derive or overwrite a field that is
   already set — the server will also skip already-set fields, but you should not even propose them.
2. For each unset field, derive a value from the local codebase following that field's `guidance`
   (e.g. infer `working_in` from frameworks/manifests, `version_control_system` from the git remote,
   testing stacks from test config and dependencies, directory fields from the repo layout).
3. Omit any field you are uncertain about or that does not apply — leaving it unset is always
   acceptable. Do NOT guess.
4. Specifically, do NOT invent a `version` when the platform has no meaningful version concept; leave
   it unset.
5. Before deriving `version_control_system` or `base_branch`, confirm the git repository root is THIS
   project's root: `git rev-parse --show-toplevel` must resolve to the project directory itself. If
   the git root is an ancestor directory (the project is nested inside another repository), OMIT both
   fields and note why in the final report — deriving them would describe the parent repository, not
   this project.
6. If you find real evidence for TWO OR MORE plausible values for a field (e.g. configs for multiple
   test frameworks, multiple frameworks in a monorepo), treat the value as ambiguous and omit it
   rather than picking one.
7. Do NOT derive `selected_mcp_slugs` or `greenfield_setup_path`, even though both appear as unset
   bootstrap-eligible fields in the manifest. MCP validation manual selection is deferred to
   `$bridge-learn-repository`, which derives and confirms it with the codebase already researched. Install
   neither proposes nor applies this field. `greenfield_setup_path` is not derivable at all: it is the
   greenfield path's own completion marker and is written ONLY by the `greenfield-setup` recipe's final
   apply, which records whether the human took the interview or the defaults. Deriving it here would
   mark an established repository as greenfield-complete and permanently suppress its
   `$bridge-learn-repository` recommendation.

   Also do NOT derive `learned_mcp_guidance`. It appears in the manifest as an unset,
   confirmation-requiring field, but it is not a bootstrap field: its evidence comes only from the
   local MCP discovery that `$bridge-learn-repository` performs. A value guessed here and approved would
   become the field's only write, because the server is first-write-only and every later
   `$bridge-learn-repository` run would report it as already set. Install neither proposes, drafts, nor
   applies it.

## Stage 4 — Human approval for confirmation-requiring fields

**Skip this entire stage in JOIN MODE** — there is nothing to derive, so there is nothing to approve.
Run it only on the `configured == false` fresh-configuration path.

`project_description` is the ONLY confirmation-requiring field install proposes. It carries
`requires_confirmation: true` in the manifest, so it is never applied on derivation alone — it needs
explicit human approval. (`selected_mcp_slugs` also requires confirmation, but install does not
derive it at all; `$bridge-learn-repository` asks for it. See Stage 3 step 7.)

1. If `project_description` is unset and you can draft a concise description from the codebase,
   present the proposed `project_description` text to the human and ask for explicit approval before
   including it.
2. Include `project_description` in the apply payload ONLY as
   `{ "value": <approved value>, "confirmed": true }`, and only after the human approves it. If the
   human does not approve it, omit the field entirely.
3. If no human response can be obtained (e.g. a non-interactive / headless session), do NOT stall and
   do NOT abandon the install: proceed to Stage 5 with `project_description` omitted, and report it
   as "pending human input" in the final summary. The other derived fields must still be applied — an
   unapproved description never blocks them.
4. Run the **Development credentials** procedure and include its proposal in this same approval
   package, so the owner approves the description and the credential references together. Allow level
   challenges and entry changes in that one answer; do not ask a separate credential question. A
   headless, declined, or unanswered proposal writes nothing and is reported as `proposal pending`.
   Apply an approved proposal after Stage 5, and treat an apply failure as warning-only.

## Stage 5 — Apply (one call)

**Skip this entire stage in JOIN MODE** — JOIN MODE makes NO `apply_install_manifest` call and writes
zero fields for every caller. **Skip it in GREENFIELD REPORT-ONLY** for the same reason, and **skip it
after a greenfield handoff**: the `greenfield-setup` recipe owns the single final
`apply_install_manifest` call for that path, made with the recipe’s single initial manifest snapshot token. Running this stage
afterwards would be a second apply with a token the recipe already spent. Run it only on the
established fresh-configuration path Stage 2b routed to Stage 3.

1. Make exactly ONE call to the `apply_install_manifest` MCP tool, passing:
   - `snapshot_token`: the exact token from Stage 2.
   - `fields`: a map of the derived fields. Scalar fields may be passed directly
     (e.g. `"base_branch": "main"`); an approved `project_description` must use the
     `{ "value": ..., "confirmed": true }` object form from Stage 4. Never include
     `selected_mcp_slugs` in this payload — install does not derive or apply it (Stage 3 step 7).
     The same holds for `learned_mcp_guidance`: never include it either.
2. Do not implement any client-side skip-if-set, conflict, or confirmation logic — the server owns
   all of that and returns the outcome buckets.
3. The apply is partial-tolerant: fields that fail server-side validation are returned in the
   `rejected` bucket while the valid fields still commit. A rejected field is therefore reported,
   not fatal — do NOT retry the whole apply just because one field was rejected.

## Stage 6 — Persist the routing credential

**This stage runs on EVERY path** — JOIN MODE persists the routing credential too, so a joining
teammate's shell-spawned CLI features (`start-tickets`) can resolve the key, and so do GREENFIELD
REPORT-ONLY and a completed greenfield handoff, which reach this stage the same way. Its secret
handling, fail-open behavior, and install-spawn success-silence rule below are identical on all of
them — none of the greenfield paths changes any of it.

The Bash-spawned `start-tickets` CLI runs in a DIFFERENT runtime surface than this MCP server, so a
key that lives only in `.mcp.json` / `.cursor/mcp.json` is invisible to it and difficulty→model
routing silently degrades. This final stage persists the already-validated key into the user-scoped
credential store (`~/.config/bridge/credentials.json`) so shell-spawned CLI commands can resolve it.

1. Call the `persist_routing_credential` MCP tool with `repo_name` set to the repository name for
   this install (the configured `BAPI_REPO_NAME`). Pass `repo_name` ONLY — this tool resolves the
   API key inside the MCP server process. NEVER pass or display `BAPI_API_KEY` (nor `api_key`,
   `apiKey`, `secret`, or `token`); the key value must not appear in the tool call or in any output.
2. On success, tell the user the credential was stored, echoing the returned `target` and `path`,
   e.g. `Stored routing credential for bapi:<repo_name> at <path>`. EXCEPTION — in the install-spawn
   context (and outside JOIN MODE), persist silently: still call the tool, but print nothing on
   success and do not restate the `target` or `path` in any later summary or in the Return contract.
   The CLI already reported the credential destination, so this sentence would be a duplicate. This
   exception is success-only; step 3's failure reporting is unchanged in every context.
3. On failure, do NOT block the install — show the rest of the install summary anyway, then tell the
   user the routing credential could not be stored. They can rerun `$bridge-install-bridge` after setting
   `BAPI_API_KEY` in the environment, or run
   `npx -y @bridge_gpt/mcp-server credentials migrate-agent-config --write-credentials` to migrate an
   existing key. Until then, `start-tickets` model routing fails open (assumes a hard ticket and
   defaults to premium/Opus when available) — this is the MOST EXPENSIVE model tier, so unexplained
   cost is the symptom of leaving this unfixed. Recommend verifying credential resolution afterwards
   with `npx -y @bridge_gpt/mcp-server doctor`.

## Stage 7 — Summarize the outcome, then present the concise capability report

**JOIN MODE branch (`configured == true`).** Do NOT print an applied count and do NOT fabricate apply
buckets — no apply happened. Instead state plainly that the project was already configured and that
zero configuration changes were proposed or applied (the welcome from Stage 2). Then render the concise
capability report described in "### Read-after-write" below, with ONE difference: source it directly
from the `concise_tool_capabilities` field of the Stage-2 manifest you already read — do NOT perform a
read-after-write `get_install_manifest` call, because no write occurred and there is nothing to
refresh. Apply the same server-authority rendering rules (server section order, verbatim item copy,
malformed/missing fallback) verbatim. ALSO retain that Stage-2 manifest's `next_step` object: it is the
authoritative next-step source for this path, because the Stage-2 read is JOIN MODE's only manifest
read. After the report, continue to Stage 8, which renders that `next_step` conditionally. The rest of this stage (the applied-count line and six-bucket summary)
applies ONLY to the `configured == false` fresh-configuration path. On a separate line, state that the
development-credential record is local machine state, not project configuration, then add the
credential-summary line (see "Development credentials").

**Greenfield-completion branch (Stage 2b classified greenfield and the recipe ran).** Do NOT print an
applied count and do NOT reproduce the six apply buckets: this command made no apply call — the recipe
did. Lead with the confirmed setup path (interview or defaults), apply confirmation, and read-back
confirmation. Do not make an unconditional “setup completed” claim. If standards remain unresolved,
say “Configuration established with unresolved standards” alongside the confirmed configuration.
Use compact semantic Markdown groups for configuration established, standards saved, existing content
preserved, intentional omissions, missing catalog entries, and unresolved/failed fields. Render each
field as a wrapping list row: field name first, explicit textual status second, concise reason third.
Keep uploaded, skipped, failed, and not_attempted visibly distinct without relying on color. Show only
necessary safe technical identifiers or validated paths, never file contents, snapshot tokens, or
unrestricted errors. While awaiting authoritative results, say setup is still processing. Valid
defaults with zero uploads and an approved empty interview roster are deliberate empty outcomes,
not file failures. Report the deferred-VCS guide when written. Include the starter invitation:
“You can describe the first feature you want to build,” alongside any unresolved setup work. Then render the concise capability report described in "### Read-after-write" below,
sourced EXCLUSIVELY from the read-after-write manifest the recipe returned as its final result — never
from the stale Stage-2 manifest, and never from a fresh read of your own. Retain that same manifest's
`next_step` object: it is the authoritative next-step source for this path, and Stage 8 renders it.
Never mention or recommend `$bridge-learn-repository` on this path; the server has already decided what the
next step is, and on a greenfield project it is never that. Add the credential-summary line.

**GREENFIELD REPORT-ONLY branch (`greenfield_setup_path` was already set).** Behave exactly like JOIN
MODE's no-apply reporting: no applied count, no fabricated apply buckets, no report of onboarding work
that did not happen this run. State that this project already completed greenfield setup and that zero
configuration changes were proposed or applied. Then render the concise capability report sourced
EXCLUSIVELY from the Stage-2 manifest already read — no read-after-write call, because nothing was
written — and retain that manifest's `next_step` for Stage 8. State separately that the
development-credential record is local machine state, not project configuration, and add the
credential-summary line.

Both greenfield branches use the SAME rendering rules as every other branch: the server's section
order, verbatim item copy, the malformed/missing fallback line, the empty-section handling, the
narrow-terminal wrapping rules, and the closing documentation footer. There is one report format, and
these branches only change where the manifest came from.

**Fresh-configuration branch (established path, `configured == false`).**
First, begin with an explicit applied count: "Applied N of M derivable fields" (M = the unset
bootstrap fields you derived values for). An install that applied 0 fields must say so loudly — the
install is NOT complete until the apply call reports applied fields. This applied-count line and the
six-bucket summary below remain the PRIMARY install result — the capability report that follows is a
secondary close, not a replacement for it.

Then summarize the six buckets from the apply response for the user:
- `applied` — fields written this run.
- `skipped` — fields already set (left untouched).
- `conflict` — fields that changed since the manifest was read (re-run $bridge-install-bridge to retry).
- `needs_confirmation` — fields awaiting explicit confirmation (e.g. project_description).
- `rejected` — fields that failed validation or were not bootstrap-eligible (the other fields still
  applied; fix or drop the rejected values before any retry).
- `deferred` — fields intentionally not auto-written by install (owned by $bridge-learn-repository or set
  deliberately). `selected_mcp_slugs` belongs here: report it as deferred to `$bridge-learn-repository`,
  never as approved, declined, or pending an install-time decision.

Add the credential-summary line from "Development credentials" after the buckets. The credential record
is local machine state, not one of these project-configuration buckets.

### Read-after-write: fetch the concise capability report

After the bucket summary, call the `get_install_manifest` MCP tool ONCE MORE. This post-apply read
reflects the configuration you just wrote (the Stage-2 read was pre-apply and is stale for this
purpose). This read does not need the snapshot token. Use ONLY this post-write response for the
report below.

Retain this post-apply response's `next_step` object as well. On the fresh-configuration path it — not
the pre-apply Stage-2 read — is the authoritative source for Stage 8's conditional next step. Neither
branch derives a command from `configured`, `learned`, or any role prose: the command is whatever the
authoritative manifest returned.

The response carries `concise_tool_capabilities` — an ADDITIVE projection over the complete
`tool_capabilities` catalog and the curated `workflows` collection (the response still carries both
unchanged; this stage simply does not render them). It is a server-ordered array of EXACTLY TWO
availability sections, in this order:

1. `{"id": "available_now", "name": "Available now", "tools": [...]}` — what works right now.
2. `{"id": "needs_setup", "name": "Needs setup", "tools": [...]}` — what additional setup would unlock.
   This section may also carry ONE optional extra key, `heading` (a string); see below.

Each entry in a section's `tools` array is a capability item:
`{id, kind, display_name, description, how_to_use}`, where `kind` is `"tool"` or `"workflow"` and
`how_to_use` may be `null`. Items in the `needs_setup` section carry ONE additional field,
`availability_text` — the server's plain-language sentence naming what is missing.

The `needs_setup` section's optional `heading` is a shared sub-heading the server sends only when every
item is waiting on the same thing, so that line is said once instead of under every item. It is additive:
a section without it is complete and valid.

Server authority: the server computed this projection's section membership, availability decisions,
retrieval-pair collapsing, and ordering. Never recompute, re-filter, re-count, re-sort, regroup, infer
availability, pair a retrieval tool with a primary yourself, invent an item, or re-derive any of it from
`tool_capabilities`, `workflows`, `docs/mcp-tool-integrations.md`, or any other documentation — render
exactly what the server sent.

If the post-write response has no `concise_tool_capabilities` field at all, or it is present but
malformed (not the two-section `{id, name, tools}` shape described above; an optional `heading` key on a
section is part of that shape and is NOT malformed), print exactly:
`No capability status is available yet; configuration can still continue.` and skip the section below
entirely — never fall back to rendering the complete `tool_capabilities` catalog, the `workflows`
collection, or a remembered/hallucinated capability list.

Otherwise, render exactly one section, with this exact heading:

**What Bridge can help with**

- Render the two server sections in the order the server gave them — "Available now" first, then
  "Needs setup". Use the server's `name` as each sub-heading, with one exception: when the `needs_setup`
  section has a `heading` that is a non-empty string, print that `heading` verbatim as its sub-heading
  INSTEAD of `name`. Do not reorder, merge, filter, or drop a section, and do not add a third one.
- Use semantic Markdown (a short bold or `###` sub-heading per section, one compact list item per
  capability) with tight vertical spacing — no table, no fixed-width columns, no ASCII box. Long
  descriptions, commands, and URLs must be free to wrap, so the report stays readable in a narrow
  terminal.
- For each item in **Available now**, render its `display_name`, then its `description`, then its
  `how_to_use` when that value is a non-empty string (omit the invocation line entirely when it is
  `null` or empty). Render NO availability caveat, asterisk, footnote, or status note in this section —
  the server already decided these are available, including any tool that works with less codebase
  context before indexing.
- For each item in **Needs setup**, render the same three fields, then the server's `availability_text`
  verbatim as emphasized setup guidance on its own line. Do not reword it, prefix it with a warning, or
  substitute setup advice of your own. The exception: when the section has a non-empty string `heading`,
  the heading already says what is missing, so print NO item's `availability_text` in that section. When
  `heading` is absent, empty, or not a string, ignore it and render every item's `availability_text`
  exactly as described here.
- Render a `kind: "workflow"` item EXACTLY like a `kind: "tool"` item. `kind` is contract metadata for
  machine consumers, not a visual distinction: no icon, no label, no badge, no separate sub-list, no
  different indentation, and no client branching of any sort on its value.
- Keep an empty section VISIBLE rather than dropping it. When **Available now** is empty, render the
  heading with one short neutral line such as "Nothing is available yet." When **Needs setup** is empty,
  render the heading with one short line stating that every highlighted capability is ready — for
  example "Everything highlighted here is ready to use."
- Close the report with this quiet final line, after BOTH sections and regardless of whether either
  `tools` array was empty:
  See the [Bridge MCP server README](https://www.npmjs.com/package/@bridge_gpt/mcp-server) for the
  complete tool documentation.

### What finishing setup unlocks: rendering `human_setup` (contract v9)

The same manifest response this stage already read for `concise_tool_capabilities` also carries a
SEPARATE top-level field, `human_setup` — an ordered list naming each remaining unconfigured
integration and what finishing it unlocks, computed server-side from the same checklist data
`integrations` already carries. It is additive: a `human_setup`-unaware reader of this manifest sees no
change to `integrations`, `tool_capabilities`, `workflows`, or the two-section
`concise_tool_capabilities` shape above. It is never a third section of that report — keep the two
sections above exactly as they are and render this as its own, separate block.

Compatibility and validity, in this order:

- **`human_setup` is absent from the response entirely** (an older, still-compatible v8 manifest) →
  render nothing for this block. Do not fabricate a heading, a completion line, or fallback setup
  advice, and do not treat the absence as an error.
- **`human_setup` is present but malformed** (not a list, or an entry missing its `display_text`) →
  render nothing for this block, the same as if it were absent. The two-section capability report above
  is unaffected either way.
- **`human_setup` is a valid, empty list (`[]`)** → render nothing: no heading, no "everything is set
  up" line, no completion claim. An empty list means every integration is already configured, and the
  Available now / Needs setup sections above already say what that state unlocks.
- **`human_setup` is a valid, non-empty list** → render it under this exact heading:

  **What finishing setup unlocks**

  Render one compact Markdown list item per entry, in the server's given order, using
  `human_setup[].display_text` as that item's ENTIRE substantive content, byte-for-byte. Do not
  summarize, reword, sort, filter, merge, or otherwise compose your own setup advice from
  `configure_in`, `setup_instructions`, `required_for`, `integrations`, or any tool/workflow catalog —
  the same server-authority rule Stage 7 already applies to `concise_tool_capabilities` extends to this
  field. `configure_in` and `setup_instructions` travel on each entry for completeness but are not
  separately rendered here; `display_text` already carries the one line this block shows.

### Local ticket keys: rendering `ticket_prefix`

A repository that stores its tickets in Bridge (local mode) also carries a top-level `ticket_prefix` on
the same manifest response: the stored prefix its ticket keys start with. It is absent for a Jira-mode
repository and for any manifest that could not read it.

- **`ticket_prefix` is absent, not a string, or blank** → render nothing for this block. Do not
  fabricate a prefix, and keep the Jira-mode summary wording exactly as it is.
- **`ticket_prefix` is a non-empty string** → render this block as its own section, before the
  **What finishing setup unlocks** block, under a semantic heading:

  **Local ticket keys**

  The block is this heading and one paragraph, nothing else. Do not print the prefix on its own line,
  and do not print a `<ticket_prefix>-N` key-format line.

  The paragraph is the `human_setup` entry whose `id` is `jira`, when there is one: print its
  `display_text` byte-for-byte. It already shows example keys, says how to list tickets and, only while
  the project has no tickets, how to change the prefix. Do not reword it, and do not add your own
  listing or edit instruction.

  Render that `jira` entry only here: when this block renders it, leave it out of the **What finishing
  setup unlocks** list so its guidance appears once. When there is no such entry, print exactly this one
  line, substituting only the stored prefix for `{prefix}`:

  `Your ticket keys look like {prefix}-1, {prefix}-2, and so on. To see your tickets, ask your agent to list them.`

  This is guidance only. Do not build a ticket browser, call `get_tickets` yourself, or change the
  prefix from here.

### Closing pointer: inviting teammates

End the Stage 7 completion summary, on every branch, with exactly these two lines, in this order, with
no other teammate or invitation wording. The Epic Implementer pointer comes immediately before the
Security-page line, and the Security-page line stays the last line of Stage 7:

```
To set up the Epic Implementer for this repository, run `$bridge-install-epic-implementer`.
To invite teammates, open this project's Security page from the Setup page and create a key.
```

## Stage 8 — Render the server's next step (only when there is one)

**Skip this entire stage in the install-spawn context** (the spawning instruction identifies it); the
spawn prompt owns the same conditional closing recommendation there. On direct manual
`$bridge-install-bridge` invocation, run it normally.

**This stage runs in JOIN MODE too** — it is no longer skipped wholesale for joining teammates. What
gates it is the server's output, not the mode and not the caller's role.

This stage renders a decision the SERVER already made. The manifest's `next_step.command` encodes both
whether the repository still needs the deeper instruction-tier configuration AND whether this caller
can actually run the command; a caller who cannot gets an empty command. On a greenfield project the
server may name a `connect-github` command instead, or nothing at all. Never re-derive any of that
from `configured`, `learned`, `greenfield_setup_path`, `role`, or `source`, never assemble a
`connect-github` invocation locally, and never substitute a command you happen to know.

1. Read `next_step` from the AUTHORITATIVE manifest for this path (Stage 7 names it: the post-apply
   read-after-write response on the fresh-configuration path; the read-after-write manifest the
   `greenfield-setup` recipe returned after a greenfield handoff; and the Stage-2 response in JOIN MODE
   and in GREENFIELD REPORT-ONLY, neither of which performs a read-after-write).
   Then branch on `next_step.command` alone:
   - **`next_step.command` is a non-empty string** → render one short heading and the exact command
     the server returned, formatted as Markdown inline code — for example: ``Next step: `<command>` ``
     where `<command>` is that returned string, verbatim. Do not rename it, alias it, expand it into
     a different invocation, or replace it with a locally known command. Do not run it yourself:
     it remains the human's own explicit next invocation.
   - **`next_step.command == ""`** (or the key is missing/not a string) → be entirely SILENT. Emit no
     heading, no empty code span, no placeholder or fallback command, no separator or divider, no
     "nothing to do" notice, and no generic success or completion claim. The stage simply produces
     nothing and the run continues.
2. When you render a command and `next_step.command_context` is a non-empty string, print it
   verbatim on its own line directly under the command. It is the server's plain-language
   explanation of what the command gives the human and how long it takes. Do not reword, shorten, or
   extend it. When it is empty, missing, or not a string, render nothing in its place.
   For any other supporting context, use the manifest's own
   `next_step.post_install_indexing` and `next_step.post_install_scheduler` text as the authoritative
   source rather than inventing a rationale for whatever command the server named. Keep that context
   subordinate to the command itself — it is explanation, not a second call to action.
3. Do NOT ask about repository indexing in any form. There is no consent question, no
   `parse_repository` tool call, and no `$bridge-parse-repository` continuation here — indexing starts
   automatically once the repository reaches full parse readiness (VCS credentials, the Pinecone
   index, `working_in` / `project_description`, and SFCC prerequisites where applicable), via the
   same readiness-gated funnel the GitHub connection-confirm endpoints and the scheduled sweep already
   use. Do not claim indexing has already started — this command has no visibility into that funnel's
   outcome.

## Stage 9 — Offer CI follow-up configuration (only when CI is detected)

**Skip this entire stage in the install-spawn context** (the spawning instruction identifies it), so
the concise report and the conditional next step the spawn prompt owns remain the sole closing interaction. On direct
manual `$bridge-install-bridge` invocation, run it normally.

**Also skip this stage in JOIN MODE** (`configured == true`), in **GREENFIELD REPORT-ONLY**, and after
a **greenfield handoff**: none of those paths offers configuration follow-up; they stop after the Stage
7 capability report and the conditional Stage 8 next step.

This stage is separate from the single apply call: it writes at most ONE field via the
`config_field` MCP tool. `ci_followup_config` is REPLACE-NOT-AUGMENT — leaving it NULL already means
safe poll-only defaults, so "skip" is always a correct answer.

1. Gate: only offer this when Stage 3 found real CI evidence (e.g. `.github/workflows/*.yml`,
   `bitbucket-pipelines.yml`). With no CI detected, skip this stage and note "no CI detected — CI
   follow-up not offered" in the final report.
2. Ask ONE question, referencing the discovered CI by name, with exactly these preset profiles
   (default: skip):
   - **observe** — poll CI results only, never attempt fixes:
     `{"strategy": "poll_only", "max_iterations": 1, "max_minutes": 10, "instructions": ""}`
   - **self-heal** — bounded fix-and-iterate loop on the automation's own PRs:
     `{"strategy": "fix_and_iterate", "max_iterations": 3, "max_minutes": 45, "instructions": ""}`
   - **skip** (default) — leave `ci_followup_config` unset (NULL = baseline poll-only behavior).
3. Do NOT offer or compose a `custom` strategy during install — free-form CI follow-up instructions
   are a deliberate later act (setup UI or a direct `config_field` update).
4. When the human picks a profile, call the `config_field` MCP tool once (operation `"update"`,
   `field_name: "ci_followup_config"`, `value`: the profile's JSON object). If the server rejects the
   value, retry ONCE with a corrected payload; if it is rejected again, stop, show the proposed JSON
   to the human, and leave the field unset.
5. Never select a profile in a non-interactive session — skip and list it as a pending next step. An
   unattended install must never enable fix-and-iterate behavior.

## Return

The Return contract depends on which outcome Stage 2 selected.

Every return below ends with the one credential-summary line from "Development credentials": recorded
names, advisory missing or unreadable names, `proposal pending`, `no development credentials found`, or
the incomplete-source advisory, as the run actually produced.

**Fresh-configuration return (established path, `configured == false` admin/legacy).**
Report the admin check result, the "Applied N of M" count, the
applied/skipped/conflict/needs_confirmation/rejected field names, any fields omitted for
nested-repository or ambiguity reasons, the approval outcome for `project_description` — install's
only confirmation-requiring field — (approved / declined / pending human input), the fact that
`selected_mcp_slugs` is deferred to `$bridge-learn-repository` rather than decided here, whether a
stale-command warning was raised (manifest
`command_contract_version` higher than this command's), whether the routing credential was persisted
(the returned `target` and `path`, or the non-blocking failure remediation — but in the install-spawn
context report neither on success, per Stage 6's silence exception; a failure is still reported), the "What Bridge can help
with" concise capability report from the post-apply read-after-write manifest read, the CI follow-up
outcome (profile written / skipped / no CI detected / pending / skipped in install-spawn context), and
the Stage 8 outcome — the exact server-provided next-step command when the manifest returned a
non-empty one, otherwise remain entirely SILENT (never a substituted command of your own).

**JOIN MODE return (`configured == true` path).**
Report the caller's role, the "you're joining an already-configured project" welcome and the explicit
no-change status (zero configuration proposed or applied — do NOT report an applied count or apply
buckets), whether the routing credential was persisted (the returned `target` and `path`, or the
non-blocking failure remediation), the "What Bridge can help with" concise capability report drawn
from the Stage-2 manifest (no read-after-write), and the Stage 8 outcome — the exact server-provided
next-step command when that manifest returned a non-empty one, otherwise remain entirely SILENT.

**Greenfield-completion return (Stage 2b classified greenfield and the recipe ran).**
Report the classification that was printed and whether the human corrected it, the setup path the
recipe authoritatively confirmed (`interview` or `defaults`, or unresolved), apply confirmation and
read-back confirmation separately, standards saved, preserved content, intentional omissions, missing
catalog entries, and unresolved fields with explicit statuses, whether the deferred-VCS guide was written or the connect command was printed, whether the
routing credential was persisted (the returned `target` and `path`, or the non-blocking failure
remediation — with Stage 6's install-spawn silence exception unchanged), the "What Bridge can help
with" concise capability report drawn from the recipe's read-after-write manifest, and the Stage 8
outcome — the exact server-provided next-step command when that manifest returned a non-empty one,
otherwise remain entirely SILENT. Do NOT report the ordinary derivation buckets
(applied / skipped / conflict / needs_confirmation / rejected / deferred): no Stage 5 apply happened on
this path, so there are no buckets to report, and do NOT report an applied count. Never mention or
recommend `$bridge-learn-repository`.

**GREENFIELD REPORT-ONLY return (`greenfield_setup_path` already set).**
Report that this project already completed greenfield setup and that this run made ZERO setup changes,
asked ZERO onboarding questions, and applied nothing — no applied count, no apply buckets, no
derivation buckets. Report whether the routing credential was persisted (same rule as above), the
"What Bridge can help with" concise capability report drawn from the Stage-2 manifest (no
read-after-write), and the Stage 8 outcome under its usual non-empty-command rule. Never mention or
recommend `$bridge-learn-repository` on this path either.

## Backend-owned bootstrap identity (BAPI-1438)

Ordinary new creation uses a friendly display label. Labels may repeat and never
select credentials. For a scripted operator invite use `install --invite --display-name "My project"`
and supply the invitation through the existing private input mechanism. In an
interactive terminal the folder basename is a suggested label. Self-serve signup
still requires emailed-code verification in an interactive terminal.

Use `--repo <canonical-name>` or `BAPI_REPO_NAME` for existing-key registration
or explicit legacy creation. Existing keys cannot use `--display-name`; creation
cannot combine that flag with a canonical selector.

Rerun from the original folder with the same invitation or signup method after
an interrupted install. The original proof and label are reused; another entered
label does not rename the recovered project. Preserve recovery storage when an
outcome is unknown, a challenge cannot be recovered, or installation asks for support.
Never delete possibly redeemed proof to restart. Ordinary invite tokens and
verification codes are not stored.

Credential storage uses bounded exclusive locking without timeout-based stealing.
An abandoned lock needs installation support. POSIX systems sync the containing
directory; Windows uses file sync plus atomic replacement because portable Node
directory handles are unavailable. A failure after rename is an uncertain durability
outcome: the new bytes may already exist. Rerun reloads the actual store under lock;
there is no guarantee that old pending bytes survive every failure.


## Repeat installation and identity preservation

Run `npx -y @bridge_gpt/mcp-server install` to refresh an existing installation.
The installer reads project and host identity before onboarding. A saved credential
can resume the installed project without another token prompt. Equal credentials
are a no-op. A different candidate is validated before an explained replacement
question; refusal, EOF, and noninteractive input preserve the installed identity.
Generic `--force` is not credential replacement or endpoint transfer permission.

Production is the default destination and is displayed without another URL
confirmation. Explicit development destinations require credentials authorized for
that endpoint. Unreadable or malformed credential stores require repair; they do
not select signup. To stop a declined environment candidate from recurring, unset
`BAPI_API_KEY` in future shells. Secret values never belong in diagnostic output.
Dry-run previews defer credential validation and authorization and do not read
credentials, write notes, or persist preferences.

Repeat installation preserves valid tool selections and optimization posture.
Independent completed maintenance is retained when an optional replacement or
launch is declined. Operational failures and blocked requested capabilities return
status 1; completed maintenance with a usable retained identity returns status 0.

Epic Implementer setup is guided by `$bridge-install-epic-implementer`; the manual path is
`npx -y @bridge_gpt/mcp-server install epic-implementer`.
It requires a supported github.com repository, GitHub CLI sign-in, and Claude Code
sign-in before dependent mutations. Fix the prerequisite and rerun setup; general
Bridge maintenance remains available. Local token removal does not require a new
network sign-in.

Agent notes are planned by canonical physical target. Shared AGENTS.md/CLAUDE.md
files receive full guidance once. Valid marker lines and unowned bytes survive;
broken links, outside-root targets, malformed regions, and stale observations are
refused. Existing files are updated in place to preserve links. A separate Claude
pointer waits for canonical guidance. These checks cover ordinary concurrent
changes and do not claim a transactional or adversarial filesystem guarantee.
