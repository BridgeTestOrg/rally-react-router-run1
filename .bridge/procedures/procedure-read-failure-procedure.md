# Procedure read failure

A command reads this procedure only when another procedure it needs cannot be read:
the file is missing from every location the command names, or it exists but cannot be
read. It tells you how to report the failure and how the owner can repair the
installation. It never gives permission to continue past the failure.

## What stays the same

- **The lookup order.** The command's own lookup still decides where to read. Fall back
  to a later location only when the earlier file does not exist. A file that exists but
  cannot be read is a failure, never a reason to read the source-checkout copy instead.
- **The stage's own behavior.** Keep the refusal, halt, warning, or skip that the
  command writes at the failing read. A stage that stops still stops, a stage that
  halts an `--auto` run still halts with its own halt reason, and a stage that warns
  and skips still warns and skips. This procedure adds no halt reason and no stop.

## Report it

Name the exact procedure that failed, using its `.bridge/procedures/…-procedure.md`
path, and the affected stage and ticket keys. Say whether the file was missing or
could not be read.

## Repair

- **Linux.** From the established project root, give the owner the version-pinned
  `repair-assets` terminal command that the command's "Procedure read failure"
  paragraph names, with the root quoted for the shell and the host set to the one in
  use (`claude`, `cursor`, `codex`, or `copilot`).
- **macOS and Windows.** In-place repair is unsupported. Re-run start-tickets for
  worktrees, or the existing Bridge `--init`/install workflow for project scaffolds.
- **Fill-only.** Repair fills missing packaged files only. It never overwrites a file
  that exists, so it never repairs or replaces a customer's own instruction override.
  Resolve permission problems, a path that is not a file, or an unsafe link separately.
- **After a repair.** Refresh or reconnect, then reread that same procedure. Resume only
  if the original stage allows it.

## Return

Go back to the command at the read that failed and apply that stage's own outcome:
its refusal, its halt, or its warning and skip. Nothing in this procedure lets the run
continue where the stage would stop.
