# The `.bridge/` directory

This directory holds Bridge's files for this project. Bridge owns this README
and refreshes it every time you run install or upgrade, so do not edit it.

## What is in here

| Path | What it is | Commit it? |
|---|---|---|
| `config` | Records the project identity. It has no secrets. | Yes |
| `pipelines/` | Your own pipeline JSON files. | Yes |
| `instructions/` | Your own instruction files used by pipelines. Bridge creates the directory empty and never writes files into it. | Yes |
| `procedures/` | Bridge-owned procedures that commands read directly. | Yes |
| `README.md` | This file. | Yes |
| `install-state.json` | Machine-local install state. Git-ignored. | No |
| `bridge-permissions.json` | Machine-local permission state. Git-ignored. | No |

## Customizing pipelines

A pipeline step can load an instruction file. If you put a file with the same
name in `instructions/`, your file replaces the bundled instruction for the
pipelines that load that instruction.

This does not change the procedures in `procedures/`. Commands read those files
directly, not through a pipeline, so an instruction override never reaches them.

## Procedures

`procedures/` holds command procedures that Bridge owns. Bridge refreshes them on
install and upgrade. Do not edit them. There is no supported way to customize
these procedures today.

Older Bridge versions put these files under `docs/install/`. If you still have
copies there, they are old fallback copies. Bridge now reads `procedures/`
first. You can delete the old copies once the new `procedures/` files are
committed.

## Moving the pipelines directory

`BAPI_PIPELINES_DIR` moves the pipelines directory and its sibling instructions
directory. It does not move `procedures/`, which always stays at
`.bridge/procedures/`.

## Committing and repair

Commit this README and the files in `procedures/` so every teammate and every
worktree has them. If a package-managed file goes missing, `repair-assets`
restores it without overwriting files that already exist.
