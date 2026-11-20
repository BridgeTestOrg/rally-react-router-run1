# Upgrade Bridge

$ARGUMENTS

Use this command to upgrade (or update) the Bridge API MCP — the
`@bridge_gpt/mcp-server` package, also called the bridge-api MCP — to the latest
published version. This is the action behind the ping tool's advice to "tell
your local agent 'upgrade bridge'".

---

# Instructions

Run the existing packaged upgrade flow. Do not edit files, install anything by
hand, or invent a new subcommand — just drive the upgrade CLI and report what it
did.

## Step 1 — Run the upgrade command

From the **project root**, run exactly:

```
npx -y @bridge_gpt/mcp-server@latest --upgrade
```

This upgrades/updates the installed `@bridge_gpt/mcp-server` (the bridge-api MCP)
and re-scaffolds the slash commands.

### `BAPI_MCP_CLI` does not apply here — deliberately

Every other packaged-CLI command honors the `BAPI_MCP_CLI` local-launcher override, which replaces the `npx -y @bridge_gpt/mcp-server` prefix with a local build for pre-publish verification. **This command is the one exception, and ignores it entirely.**

The reason is that upgrading is inherently about the *published* package. A local launcher points at a build that is already on disk, so running the upgrade through it would "upgrade" the operator using the very build they are trying to replace — silently doing nothing while reporting success. That is the exact failure the `@latest` pin below exists to prevent, so honoring the override here would reintroduce it by another route.

Run the command above verbatim even when `BAPI_MCP_CLI` is set, and do not mention the override as an option for this command.

The `@latest` pin matters. It applies to the short-lived *upgrader* process only:
without it, npx may reuse a cached older copy of the package and "upgrade" you
using the very build you are trying to replace. The exact version pin the
upgrader then writes into each host config is a separate, deliberate thing — host
configs stay pinned to an exact `MAJOR.MINOR.PATCH` release so a project's MCP
server is reproducible.

## Step 2 — Report the result

The CLI reports **per config file**, because a project can have several
(`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`) and they can disagree.
Relay those lines as printed. Do not collapse them into a single global
`oldVersion -> newVersion` transition and do not infer one yourself.

Those three are the project's JSON configurations. Codex is different: it keeps
its Bridge registration in one **global** file, `~/.codex/config.toml` (or
`$CODEX_HOME/config.toml` when an absolute `CODEX_HOME` is set). Its line carries
the label `(global — applies to every project on this machine)` after the path,
because repinning it affects every project on the machine, not just this one.
Relay it exactly as printed, and never print or guess an absolute home path. The
CLI only reports Codex when it already has a Bridge registration there; it never
creates one.

The forms the CLI emits are:

- `<path>: 0.2.16 -> 0.2.36` — that config's launcher pin moved.
- `<path>: already 0.2.36` — that config was already at the target.
- `<path>: normalized <spec> -> @bridge_gpt/mcp-server@0.2.36` — an unpinned or
  `@latest` launcher was given an exact pin.
- `<path>: added @bridge_gpt/mcp-server@0.2.36` — a `bridge-api` entry was added
  to an existing config.
- `<path>: created with @bridge_gpt/mcp-server@0.2.36` — the config file was
  created.
- `<path>: skipped — worktree mcp-invoke shim preserved` — a worktree
  registration that intentionally has no published-package pin.

The same four forms apply to the global Codex file, with its global label before
the colon, for example
`~/.codex/config.toml (global — applies to every project on this machine): 0.2.60 -> 0.2.68`.
Normalization covers every unpinned spelling: a bare package name,
`@latest`, and an empty trailing `@`.

Then report the CLI's closing status verbatim:

- If the CLI prints `Already up-to-date.`, report `Already up-to-date.` exactly.
  Only the CLI decides this; it means every applicable launcher pin was already
  at the target. Never infer it from a version transition that reads the same on
  both sides.
- Otherwise report the CLI's completion line together with the per-config lines
  above.

After a completed upgrade the CLI prints one `Reload <host>: <instruction>.` line
for each host whose configuration actually changed, in a fixed order. Reproduce
each reload line exactly as printed. Do not invent a Claude-only instruction or
rewrite a host's wording — different hosts reload differently, and the CLI prints
nothing for a host that did not change.

## Step 3 — Handle failures

If the command fails (non-zero exit or an error in its output), **stop** and
report the CLI error verbatim. Do not retry blindly and do not attempt manual
edits to config files to work around it. A non-zero exit means the upgrade did
not converge — for example a config could not be read, a launcher carries a
version range the upgrader must not rewrite, a competing local install could not
be removed, or a written pin failed post-write verification. Those are reported
for a human to resolve, not for you to repair.

Two failure shapes differ in what they leave behind. If the CLI **refuses before
it starts** (it prints `Nothing was changed.`), it wrote nothing at all. If it
fails **after** it began reconciling — for example the global Codex file changed
underneath it or could not be written — the project JSON configurations may
already be upgraded and the run reports `did NOT converge`. Report that partial
state as printed. Do not retry automatically, and do not repair the listed
configs yourself.

## Final Report

Report whether the bridge-api MCP was upgraded (relaying the CLI's per-config
lines and its completion status), was already current (`Already up-to-date.`),
or failed (with the CLI error).
