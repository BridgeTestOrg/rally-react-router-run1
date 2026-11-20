# Run your first epic with the Epic Implementer

The Epic Implementer takes a planned epic, hands each child ticket to an agent on your computer, waits for CI and review, and merges each child pull request into an `epic/<EPIC>` branch. A person merges the final pull request into your default branch.

You do four things, in this order: install, set up, define the epic, launch it. The same steps work with Bridge's own ticket storage and with Jira.

In every command below, `npx -y @bridge_gpt/mcp-server` is the launcher. Keep the `-y`; without it, `npx` stops to ask before it installs the package.

## Prerequisites

Setup checks every item below for you, fixes what it can, and prints the one step it cannot fix. Read this list only when setup reports an item. Each bullet gives the item's name, its id, what it means, and the fix.

- **Unattended posture (Setup page)** (`server.unattended-posture`) — Bridge allows unattended runs for this repository. Fix: Turn on **Allow unattended Epic Implementer runs** on the repository Setup page, or launch with `--attended`.
- **Resolved merge mode** (`server.resolved-merge-mode`) — Bridge knows how child pull requests will be merged (your computer, a machine token, or GitHub Actions). Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Provider repository** (`server.provider-repository`) — Bridge knows the GitHub `owner/name` of this repository. Fix: Run `npx -y @bridge_gpt/mcp-server connect-github`, then run setup again.
- **Supervisor setup** (`server.supervisor-setup`) — The repository has a stored supervisor record. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Supervisor configuration** (`server.supervisor-config`) — The supervisor record is complete: the test gate and the safe defaults are stored. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Supervisor required CI checks** (`server.supervisor-required-checks`) — The CI checks a child pull request must pass before it merges are stored. Fix: Run setup and confirm the gate it proposes, or name a check with `--required-check <name>`.
- **Review policy** (`server.review-policy`) — The review policy for child pull requests is known. AI review is an opt-in choice by the repository admin. Fix: Nothing is needed unless you want AI review. Choose a policy at launch with `--review-policy`.
- **GitHub App credentials** (`server.github-credentials`) — Bridge's GitHub App is connected and can read this repository. Fix: Run `npx -y @bridge_gpt/mcp-server connect-github`, then run setup again.
- **Provider default branch readable** (`server.provider-default-branch-readable`) — Bridge can read this repository's default branch from GitHub. Fix: Reconnect the GitHub App with `npx -y @bridge_gpt/mcp-server connect-github`, then run setup again.
- **GitHub App actions permission** (`server.github-actions-permission`) — The GitHub App may start workflow runs. Only needed when merges go through GitHub Actions. Fix: Accept the updated permission on the GitHub App's installation page, then run setup again.
- **Merge workflow eligibility** (`server.merge-execution-workflow`) — The merge workflow file is on the default branch and current. Only needed when merges go through GitHub Actions. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer --merge-workflow --codeowner <@org/team|@user>`, merge the pull request it opens, then run setup again.
- **Merge branch policy** (`server.merge-execution-branch-policy`) — The default branch rules let the merge workflow do its job. Only needed when merges go through GitHub Actions. Fix: Adjust the branch rule or ruleset as setup describes, then run setup again.
- **Executor server observation** (`server.executor-readiness`) — Bridge has seen a heartbeat from an executor for this repository. Before your first run this can be missing: `drive-epic` starts the executor for each run. Fix: Launch the epic with `npx -y @bridge_gpt/mcp-server drive-epic <EPIC>`.
- **Review workflow protocol** (`server.review-workflow`) — The review workflow on the default branch matches the review policy. Only needed with AI review. Fix: Run setup; it names the workflow change to make.
- **Conductor CI migration guard** (`server.conductor-ci-workflow`) — The CI workflow file `epic-implementer-ci.yml` is on the default branch and runs the migration guard where needed. Fix: Run setup, merge the setup pull request it opens, then run setup again.
- **Escalation channel (webhook or email)** (`server.unattended-notify-default`) — Bridge has somewhere to send an escalation: a verified notify webhook, or your account email. Fix: Declare a notify webhook, or verify your account email.
- **Escalation webhook reachable** (`server.escalation-webhook-reachable`) — A declared notify webhook answers Bridge's test request. Only checked for unattended runs that declare a webhook. Fix: Start or fix the notify sink so it answers with a 2xx status, or launch with `--attended`.
- **Repository workflow readiness** (`server.repository-workflow-readiness`) — The CI and review workflows are confirmed on the default branch. Fix: Run setup, merge the setup pull request, then run setup again.
- **Workflows at indexed commit** (`server.indexed-workflows`) — The repository index includes the workflow files on the default branch. Fix: Merge the setup pull request, then run setup again. It starts the re-index and reports this item as pending until the index reaches that commit.
- **Integration branch configured** (`server.integration-branch-unset`) — The repository has an integration branch set. This is a note only and never blocks a launch. Fix: Nothing is needed. Set the repository's base branch to clear the note.
- **CI status readable by the run** (`server.ci-poll-readable`) — The run can poll CI: the CI check configuration is stored, so the MCP server shows the `poll_ci_checks` and `wait_for_ci_checks` tools, and Bridge can read CI for the default-branch head. A warning only; it never blocks a launch. Fix: Run the `resolve_ci_checks` MCP tool for this repository.
- **Watched checks run on epic branches** (`server.epic-branch-check-triggers`) — Every required or watched check (for example `claude-review`) runs for pull requests into `epic/**` branches. It names each check whose workflow does not, and each check it could not map to one workflow. A warning only. Fix: Add `epic/**` to the `pull_request` branches of each named check's workflow and merge that change.
- **Worker environment declarations** (`server.worker-environment`) — Workers will start with the database and environment variables they need: a worker database is declared when CI provides one, and a profile with local test commands declares its worker variables (without them, workers start with none of the default variables). Names and counts only, never values. A warning only. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer` and declare the worker database and worker variables for the test gate.
- **Service availability** (`server.service-availability`) — Bridge could read this repository's readiness from the server. Fix: Retry in a few minutes. If it keeps failing, email info@bridgegpt.ai.
- **Claude login** (`install.claude-login`) — Claude Code is signed in on this computer. Fix: Run `claude` and sign in, then run setup again.
- **Repository identity** (`install.identity`) — Bridge knows which repository this folder is. Fix: Run setup from the repository root, or pass `--repo <name>`.
- **Bridge API credential** (`install.credential`) — A Bridge API key is stored for this repository. Fix: Run `npx -y @bridge_gpt/mcp-server install`.
- **Server connectivity** (`install.connectivity`) — This computer can reach the Bridge server. Fix: Check your network and any `BAPI_BASE_URL` setting, then run setup again.
- **Bootstrap config fields** (`install.bootstrap`) — The repository's Bridge configuration fields are filled in. Fix: Run `npx -y @bridge_gpt/mcp-server install`.
- **Integration credentials** (`install.integrations`) — The integration credentials this repository uses, such as Jira or GitHub, are stored. Fix: Run `npx -y @bridge_gpt/mcp-server install`.
- **GitHub connection** (`install.github`) — Bridge's GitHub App is connected to this repository. Fix: Run `npx -y @bridge_gpt/mcp-server connect-github`.
- **Repository indexing** (`install.indexing`) — The repository has been indexed by Bridge. Fix: Run `/parse-repository`, or let setup queue the index.
- **Run tools visible in MCP sessions** (`install.run-tools-visible`) — The MCP session this computer starts loads the Epic Implementer run tools (the `full` or `epic_implementer` group). Checked on this computer only; the server reports it as unknown. A warning only; it never blocks a launch. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`, accept the tool-visibility fix, then restart your MCP client.
- **Conductor event ledger** (`conductor.ledger`) — The local Epic Implementer event ledger can be read. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer doctor` and follow what it prints.
- **Conductor git hooks** (`conductor.git-hooks`) — Optional: the git hooks that feed the local event ledger are installed. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer install-git-hooks`.
- **Epic Implementer MCP profile** (`conductor.mcp-profile`) — The `epic_implementer` tool profile is on in your MCP host. Fix: Let setup add it (it asks first), then restart your MCP client.
- **GitHub CLI availability** (`conductor.gh-cli`) — The GitHub CLI (`gh`) is installed and signed in. Fix: Install `gh` and run `gh auth login`.
- **Configured merge credential** (`conductor.merge-credential`) — A GitHub token for merging child pull requests is available on this computer. Fix: Let setup store one (it asks first), or set `GITHUB_MERGE_TOKEN`.
- **Native ledger binding** (`conductor.native-ledger`) — The ledger's native component loads on this computer. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer doctor` and follow what it prints.
- **Worker MCP registration form** (`conductor.mcp-registration-form`) — Workers register the Bridge tools in the form the executor expects. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer doctor` and follow what it prints.
- **Expected Node engine** (`conductor.node-engine`) — The Node.js version meets the package's engine range. Fix: Install a supported Node.js (18 or newer; 20 or newer for the git hooks).
- **Deny-layer enforcement** (`conductor.deny-enforcement`) — Claude Code enforces the permission denials that keep workers inside the repository. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer doctor` to see why the check could not confirm it.
- **Claude login** (`conductor.claude-login`) — Claude Code is signed in for the workers. Fix: Run `claude` and sign in, then run setup again.
- **Merge credential capability** (`conductor.merge-credential-capability`) — The merge token can push to the repository and read pull requests. Fix: Replace the token (setup offers to), then run setup again.
- **Worktree preparation** (`conductor.worktree-preparation`) — The executor's clone can keep its working files out of git (`.git/info/exclude` exists or can be written). Fix: Make `.git/info/exclude` writable in this clone.
- **Supervisor gate profile** (`conductor.install-section-supervisor-gate-profile`) — The repository's test gate profile is stored and valid. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Supervisor required CI checks** (`conductor.install-section-supervisor-required-checks`) — The required CI checks in the gate match checks the provider reports. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Supervisor review-policy alignment** (`conductor.install-section-supervisor-review-alignment`) — The review policy and the review workflow agree. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **GitHub App actions permission** (`conductor.install-section-github-actions-permission`) — The GitHub App may start workflow runs. Only needed when merges go through GitHub Actions. Fix: Accept the updated permission on the GitHub App's installation page.
- **Merge execution eligibility** (`conductor.install-section-merge-execution-eligibility`) — This repository can use GitHub Actions merges. Only needed for that merge mode. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer --merge-workflow --codeowner <@org/team|@user>` and merge its pull request.
- **Epic Implementer MCP profile token** (`conductor.install-section-epic-implementer-profile-token`) — The Bridge entries in your project's supported MCP configuration files (`.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`) load the `epic_implementer` group, so your editor can see the Epic Implementer tools. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; setup adds the group to your existing Bridge entry after you approve it (it keeps your other groups and creates no file), then restart your MCP client.
- **Conductor hook targets** (`conductor.install-section-conductor-hook-targets`) — The git hook targets are in place for this clone. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer install-git-hooks`.
- **GitHub Actions merge: local observation prerequisites** (`conductor.install-section-gh-actions-merge-auth`) — This computer can observe GitHub Actions merges. Only needed for that merge mode. Fix: Sign in with `gh auth login` and rerun setup.
- **GitHub Actions merge: capability observability** (`conductor.install-section-gh-actions-merge-observable`) — Bridge can observe the outcome of GitHub Actions merges. Only needed for that merge mode. Fix: Rerun setup and follow the step it prints.
- **Epic Implementer ledger loadability** (`conductor.install-section-epic-implementer-ledger-loadability`) — The local ledger can be loaded by the tools that read it. Fix: Run `npx -y @bridge_gpt/mcp-server epic-implementer doctor` and follow what it prints.
- **Launch evidence** (`server.admission-evidence`) — Bridge has the evidence it needs to admit a launch. Fix: Run setup, then launch again.
- **Launch evidence: unattended consent** (`server.admission-unattended-consent`) — Launch check: unattended runs are allowed. Fix: Turn on **Allow unattended Epic Implementer runs** on the Setup page, or launch with `--attended`.
- **Launch evidence: notification destination** (`server.admission-notify-webhook`) — Launch check: an escalation destination is verified. Fix: Declare a notify webhook, or verify your account email.
- **Launch evidence: repository workflows** (`server.admission-repository-readiness`) — Launch check: the CI and review workflows are confirmed. Fix: Run setup, merge the setup pull request, then run setup again.
- **Launch evidence: required CI checks** (`server.admission-required-checks`) — Launch check: the required CI checks are stored. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Launch evidence: indexed repository** (`server.admission-index-provenance`) — Launch check: the index reaches the commit that holds the workflows. Fix: Merge the setup pull request, then run setup again.
- **Repository test gate** (`server.gate-profile`) — The repository's test gate is stored. Fix: Run `npx -y @bridge_gpt/mcp-server install epic-implementer`; it fixes what it can and prints the one step it cannot.
- **Repository test gate warnings** (`server.gate-profile-warnings`) — The stored test gate has no unresolved warnings. Fix: Read the warnings setup prints and confirm or edit the gate.
- **Effective review mode** (`server.effective-review-mode`) — Bridge shows which review mode child pull requests will use. Fix: Choose a review policy at launch with `--review-policy` if you want a different one.
- **Epic branch CI** (`server.epic-branch-ci-decision`) — Someone has decided whether CI runs on pull requests into the epic branch. Fix: Run setup and answer the epic-branch CI question, or pass `--epic-branch-ci-decision include|decline`.
- **Epic branch CI coverage** (`server.epic-branch-ci-coverage-warning`) — Your CI covers pull requests into the epic branch. Fix: Add `epic/**` to the branches your CI workflow runs on.
- **Additional readiness diagnostics** (`server.diagnostics`) — Extra readiness diagnostics from the server are clear. Fix: Read the diagnostic text; each names its own fix.
- **Command versions** (`conductor.command-drift`) — The installed Epic Implementer commands match this package's version. Fix: Run `npx -y @bridge_gpt/mcp-server install` to refresh them.
- **Escalation delivery** (`escalation-reachability`) — An escalation can actually be delivered. Fix: Verify your account email or fix the webhook, then run setup again.

## 1. Install

Run this once per project. Skip it when Bridge is already installed.

```bash
npx -y @bridge_gpt/mcp-server install
```

It writes this guide to `docs/install/epic-implementer-install.md` in your project. Run it again any time to refresh that file.

## 2. Set up

Run this once per repository, from the repository root, in your own terminal:

```bash
npx -y @bridge_gpt/mcp-server install epic-implementer
```

`install-bridge conductor` is the same command with another spelling. Setup checks everything first (read-only), fixes only what is missing, checks again, and ends with one verdict: "Ready for your first epic" or "Not ready: N steps left", with the fix for each step. It asks before anything that writes, and without a terminal every question is a "no".

When setup reports that its setup pull request is waiting, it prints `merge the setup PR` with the pull request's address. Merge that pull request, then run setup again. Setup starts the re-index, and reports the item as pending ("indexing is running; re-run setup when it finishes", or "indexing was queued; re-run setup when it finishes") until the index reaches the merged commit. Run setup again until it says "Ready for your first epic".

### View or change the test command

Setup prints the stored test command on every run:

```text
Test command: `npm test` (stored). Change it with --test-command "...".
```

To save or replace it, pass the command yourself:

```bash
npx -y @bridge_gpt/mcp-server install epic-implementer --test-command "npm run lint && npm run build"
```

The flag is your consent for that one write, so setup asks no command question. It checks the command first (one line, no `${{`, at most 500 characters), saves it once, and reads it back. It reports success only when the stored value matches. Passing the same command again says "Test command unchanged" and writes nothing. With `--dry-run`, nothing is saved.

Two things stay separate from the flag. Setup still asks you to confirm the Bridge URL, so the command needs a terminal. And opening the setup pull request asks for its own consent: after you replace the command, setup offers the update pull request in the same run, and a command you declined to ship stays saved.

Do not put a credential in the test command. Setup prints it, and the workflow file contains it.

### What CI installs automatically

The setup pull request adds `.github/workflows/epic-implementer-ci.yml`. Before it runs your test command, the workflow installs your dependencies from the files in your repository root. Bridge reads those files on your computer when it generates the workflow, and it never runs a package manager to decide.

| Language | Dependency file, first match wins | What CI runs |
| --- | --- | --- |
| JavaScript | `pnpm-lock.yaml`, `yarn.lock`, `npm-shrinkwrap.json`, `package-lock.json`, `bun.lock`, `bun.lockb` | `pnpm install`, `yarn install` (Yarn classic or Berry), `npm ci`, or `bun install`, each in its frozen form so the lockfile is used exactly as committed |
| Python | `uv.lock`, `poetry.lock`, `requirements.txt` | `uv sync` (frozen), `poetry install`, or `pip install` from `requirements.txt` |
| Go | `go.mod` | Go is set up from `go.mod`. |

- **Mixed repositories** get every language they have, in the order JavaScript, Python, Go.
- **Versions.** Node comes from `.nvmrc`, then `.node-version`, otherwise Node 24. Python comes from `.python-version`, otherwise Python 3.12. pnpm uses the version in `package.json` `packageManager` when it is valid, otherwise pnpm 10. Yarn is classic or Berry according to `.yarnrc.yml`, `packageManager`, and the lockfile; Berry runs through Corepack, which uses the Yarn version your `package.json` declares, otherwise Yarn 4. Poetry is installed at a fixed version, and Bun at the latest 1.x release. Every action is pinned to a fixed major version.
- **uv and Poetry** projects must declare development dependencies such as `pytest` in the project. Their environments are put on `PATH`, so your stored command runs unchanged inside the project environment.
- **If Bridge cannot read a file it needs**, or `package.json` contradicts the lockfile (for example a `packageManager` for a different tool), setup reports the dependency setup as unknown and blocks the workflow. It does not guess.
- **Upgrades are reviewed.** An older Bridge-written workflow is replaced through a pull request you merge, never silently. If a setup pull request from an earlier release is still open, merge or close it first; setup names it and leaves it alone.

### When your command must be self-contained

Some repositories get no automatic installation, and setup says so in plain words:

- **Python with no `uv.lock`, `poetry.lock`, or `requirements.txt`** (for example only `pyproject.toml` or `Pipfile`) gets no Python installation. Add a supported file, or make the command install what it needs.
- **Rust** uses the toolchain the CI runner already has. If that is not enough, install what you need inside the command.
- **No lockfile, or a Make-only project**, shows as `none`: Bridge installs no dependencies, so the command must install them itself.

A command that installs its own dependencies is always allowed. Nothing in the workflow adds to your command, wraps it, or sets a prefix in front of it.

### Recover from a stale CLI

An old copy of the command line tool can print old wording or miss a flag such as `--test-command`. Bridge checks the npm registry for a newer release about once a day and says so at the start of a session. That notice only reports that a newer version exists; it cannot tell you which copy `npx` actually ran. Likely causes are a cached `npx` download or a project-local install that `npx` picked first. Neither is proven for any one machine.

1. See which version ran: `npx -y @bridge_gpt/mcp-server doctor`. Its `Bridge MCP version:` line gives the installed version and the latest one, and says when an upgrade is available.
2. Fetch the newest release by running through `@latest`: `npx -y @bridge_gpt/mcp-server@latest doctor`. The `Bridge MCP version:` line should now show the latest version.
3. Refresh the installed command files: `npx -y @bridge_gpt/mcp-server@latest install`.
4. Run setup again: `npx -y @bridge_gpt/mcp-server@latest install epic-implementer`.
5. If the output is still wrong, email info@bridgegpt.ai with the `Bridge MCP version:` line from step 1 and the setup output, with any secret removed.

## 3. Define the epic

In Claude Code, run:

```text
/define-tickets
```

It writes real child ticket keys, `epic-plan.dag.json`, and `epic-plan.meta.json`, then hands off to `/drive-epic-run`. The meta file is how the launch finds the plan from the epic key.

## 4. Launch

In Claude Code, run:

```text
/drive-epic-run <EPIC> [<plan path>]
```

It previews the launch, asks you once, creates the run through `drive-epic`, and drives the run to the end. From a shell, run the same launch yourself:

```bash
npx -y @bridge_gpt/mcp-server drive-epic <EPIC>
```

Add `--dry-run` for a read-only preview, or `--attended` to opt out of unattended merging. `drive-epic --help` lists the common options, and `drive-epic --help-advanced` lists the rest.

## Advanced: the planner

`/plan-epic` is the advanced planner. It writes placeholder `TBD-N` keys instead of real ones. You create the child tickets yourself, run `emit-epic-implementer-bundle finalize` to replace the placeholders and write the plan files, then run `/drive-epic-run`. Planning never creates or approves a run.

## If something goes wrong

Every refusal names the missing item and its fix, and creates nothing. Run setup again after you fix an item. To stop a run that is already active, run `npx -y @bridge_gpt/mcp-server epic-implementer abandon-run --epic-run-id <id>`, replacing `<id>` with the run ID that `drive-epic` printed when it started the run. Abandoning a run is final. For a read-only report of every item, run `npx -y @bridge_gpt/mcp-server epic-implementer readiness --json`. If you are stuck, email info@bridgegpt.ai.
# Uninstall / clean up

Inspect before removing local resources:

```bash
npx -y @bridge_gpt/mcp-server executor uninstall-service
npx -y @bridge_gpt/mcp-server executor uninstall-service --executor-id builder-01 --dry-run
epic-implementer uninstall-git-hooks --dry-run
npx -y @bridge_gpt/mcp-server worktrees
npx -y @bridge_gpt/mcp-server worktrees --prune --dry-run
```

Remove `--dry-run` to approve the displayed plan at an interactive `(y/N)` prompt. Declined and noninteractive requests remove nothing. Executor service removal affects this user's home-scoped service; install-state locator cleanup affects only the current repository. Stopping may interrupt jobs and does not certify termination of all child processes: finish or stop work through the supported executor or plane workflow first. Darwin stdout/stderr logs are retained at `~/Library/Logs/com.bridge-gpt.executor.<id>.{out,err}.log`; Linux logs remain in the user journald journal. If a later phase fails, the command reports completed and retained stages; retry the same command after correcting the reported condition, then confirm with `doctor`.

Hook removal targets only Bridge's managed text in the common hooks directory shared by linked worktrees. Mixed user hook bytes and modes are preserved; unsafe or ambiguous content is retained for owner repair.

Worktree observations use local refs as of the last fetch. `worktrees --fetch` explicitly performs one `git fetch --prune origin`; it cannot be combined with `--dry-run`. `--base <branch>` selects the comparison base. Pruning retains protected, dirty, active, locked, or uncertain worktrees. Unknown and partial sizes are labelled explicitly; incomplete inspection offers no candidates. A remote-gone branch needs prior origin-upstream and surviving-tip evidence. Partial cleanup reports retained resources; reconcile them with the repository owner or support. Avoid forced removal or deletion.

For the other local permissions surfaces use `npx -y @bridge_gpt/mcp-server install --remove-bridge-permissions` and `npx -y @bridge_gpt/mcp-server install epic-implementer --remove-merge-token`.

## “Already checked out at” troubleshooting

Start with `npx -y @bridge_gpt/mcp-server worktrees`. Git holds a branch in the checkout named in the error and refuses a second checkout until that holding worktree is removed. Use `worktrees --prune` only for proven eligible resources; preserve retained work and reconcile it with the repository owner.

For unexpected commits, use `npx -y @bridge_gpt/mcp-server doctor --stale-branch PROJ-123 --stale-branch-base main`. Opt into prevention with `start-tickets --guard-stale-branch`. Those diagnose or prevent stale reuse; neither releases a branch held by another worktree.
