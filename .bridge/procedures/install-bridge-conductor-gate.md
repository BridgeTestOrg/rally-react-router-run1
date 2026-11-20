# Repository gate: what the agent may and may not do

This note is for a coding agent helping a human run `install epic-implementer`
(legacy `install conductor` and `install-bridge conductor` inputs remain accepted silently). It covers the **repository gate**: what must
pass before the Epic Implementer merges a child pull request.

Bridge copies this file into every installed project at
`.bridge/procedures/install-bridge-conductor-gate.md`.

## The one rule

**You may explain gate candidates. You never confirm, clear, or write a gate.**

The gate decides what an unattended run may merge on its own. Only the
repository owner decides it. Concretely, you must not:

- run `install epic-implementer` with `--confirm-gate`, `--clear-gate`,
  `--provider-check`, `--required-check`, `--local-command`, `--gate-none`,
  `--migration-guard`, or `--customized-command` on the human's behalf;
- answer the installer's gate prompts ("Gate members", "Store this repository
  gate?", "Clear the confirmed repository gate?");
- call the gate-profile API (`PUT .../supervisor-setup/gate-profile/`) yourself.

These commands ask questions on a terminal. A shell you run has no terminal, so
the installer treats every question as "no" and stores nothing. Ask the human to
run them in their own terminal, then read what they paste back.

## What a gate can be

| Kind | What gates each child merge |
|---|---|
| `provider` | Named checks a CI provider reports (GitHub Actions, or any external CI that reports a check run or commit status). |
| `local` | Commands the executor runs itself on the merge head. |
| `mixed` | Both: every provider check AND every local command. |
| `none` | Nothing. An unattended run is still admitted, but every child merge waits for approval. |

## How the installer proposes a gate

With no gate flags and no confirmed gate stored, the installer prints a
**Proposed repository gate** section. It comes from a deterministic scan of the
working tree plus the provider's real check history. It never guesses:

- A provider check is proposed only when that exact name has actually reported
  on a recent default-branch commit or merged pull request.
- A matrix job's reported name includes its matrix values, so it is listed as
  "name may vary" and never proposed. The human can type the exact reported
  name at the prompt.
- CircleCI, Jenkins, and Buildkite configuration and Git hooks are evidence
  only. Hooks are never run as gate commands.
- Local candidates come from `package.json` scripts, `Makefile` targets, and the
  Python test configuration. They run as plain argument lists, never through a
  shell.
- "Provider history unavailable" means unknown, not absent. Say so plainly.
- An empty repository gets an explicit `none` proposal.

Discovery saves nothing. A gate is stored only after the human confirms it.

## How to help

1. Read the proposal with the human. Explain each candidate's evidence and what
   the gate kind means for unattended merges.
2. If they want a check that has not reported yet, tell them admission refuses
   it until it really reports, so they should run CI once.
3. If the stored gate is shown beside a proposal that removes members, point out
   the removals. Fewer members means unattended runs merge with fewer checks.
   Gate flags the human typed are their consent, so setup applies a removal
   without asking a removal question. After applying, setup reports the removed
   members and restoration guidance, including a restore command when one can be
   written safely. Read that back to the human.
4. For a `local` or `mixed` gate, the commands must pass once under the
   executor before an unattended run is admitted. The installer offers this
   ("Qualify gate now?"). Later, the human runs
   `npx -y @bridge_gpt/mcp-server install epic-implementer --qualify-gate`.
   A failed qualification does not fail the install. The gate simply stays
   unqualified, and readiness shows `local_command_unqualified` until a run
   passes.
5. If the installer prints "Bridge API update required", the Bridge API server
   is too old to store a gate. Nothing was written. Tell the human; do not look
   for a workaround.

## Combined setup policy (BAPI-1567)

The final selected checks must be identical in proposal, comparison, consent,
atomic application, coherent read-back, and reporting. Managed CI is included
before display unless explicit gate input supplies the complete selection.
Purpose, evidence, named options, concrete consequences, and deferral/recovery
must precede consequential owner consent. Install invocation authorizes only
routine effects after trust checks. A reported name proves reporting, not test
coverage or reliability; failed/unseen/unavailable evidence remains visible.

Converging setup uses `bridge.setup-policy.v1` preview/apply/read-back. Unsupported
servers defer coupled writes, with no sequential legacy fallback. A stale
preview requires fresh effects and a new answer; uncertain writes are read back
once and never blindly retried. Enter/EOF/no terminal defer. This supersedes
per-write-consent guidance for routine effects; owner authorization for gate
changes, qualification execution, credentials, services, and replacement remains.

## Repeat installation and identity preservation

Run `npx -y @bridge_gpt/mcp-server install` to refresh an existing installation.
The installer reads project and host identity before onboarding. A saved credential
can resume the installed project without another token prompt. Equal credentials
are a no-op. A different candidate is validated before an explained replacement
question; refusal, EOF, and noninteractive input preserve the installed identity.
Generic `--force` is not credential replacement or endpoint transfer permission.

Production is the default destination and is displayed without another URL
confirmation. Explicit development destinations require credentials authorized for
that endpoint. Credential-store read and parse failures require repair; they do
not select signup. To stop a declined environment candidate from recurring, unset
`BAPI_API_KEY` in future shells. Secret values never belong in diagnostic output.
Dry-run previews defer credential validation and authorization and do not read
credentials, write notes, or persist preferences.

Repeat installation preserves valid tool selections and optimization posture.
Independent completed maintenance is retained when an optional replacement or
launch is declined. Operational failures and blocked requested capabilities return
status 1; completed maintenance with a usable retained identity returns status 0.

Epic Implementer setup uses `npx -y @bridge_gpt/mcp-server install epic-implementer`.
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

## Return

Report back to the human in plain words: the gate the installer proposed or
stored, its kind, any removals it showed, and the qualification state it
reported. Never report a gate as confirmed or qualified unless the installer's
own output said so.
