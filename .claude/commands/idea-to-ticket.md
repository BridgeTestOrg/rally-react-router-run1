Deprecated alias: convert a short human idea into tickets by forwarding it to `/define-tickets`.

$ARGUMENTS

---

# Instructions

This command is a temporary alias. It runs no recipe and makes no MCP calls of its own.

If `$ARGUMENTS` is empty or whitespace-only, stop immediately and display:
```
Usage: /idea-to-ticket <idea> [--allow-duplicate] [--max-children=N] [--auto]
```

Otherwise, print this one-line notice first:

> `/idea-to-ticket` is deprecated and will be removed after one release; use `/define-tickets` instead. Omitting `--auto` runs the attended `define-tickets` flow, and `--allow-duplicate` and `--max-children=N` take effect only with `--auto`.

Then invoke, in this same session:
```
/define-tickets [--auto] [--allow-duplicate] [--max-children=N] <idea>
```

Forward every supplied token and the idea text unchanged, in the order given. The three flags map 1:1 to the same flags on `/define-tickets`. Do not re-validate them here: `/define-tickets` Stage 0 handles any invalid token or invalid child limit.

When this workflow runs in Codex, invoke this instead:

$bridge-define-tickets [--auto] [--allow-duplicate] [--max-children=N] <idea>

In Claude and Cursor retain the slash-command form above.
