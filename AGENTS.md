<!-- BEGIN BRIDGE MCP GUIDANCE -->
### Get Project Standards (`get_project_standards`)

**When to use it:** (Implementation | Refinement) Before writing or reviewing code, so the agent applies this project's recorded coding standards instead of generic defaults.

**How to use it:** Call the `get_project_standards` MCP tool directly — it takes no required input and returns the project's recorded standards text.

### Second Opinion (`second_opinion`)

**When to use it:** (Architecture | Refinement | Implementation) Any time you want a quick sanity check on a plan, draft, or decision from a fresh perspective.

**How to use it:** Ask your agent — "Get a second opinion from Gemini on whether the BAPI-123 plan's migration step is safe to run against production."

### AI Council (`request_council`)

**When to use it:** (Architecture | Refinement) Early, when you want a spread of approaches — technical for how to build it, design for how it should look, discovery for what still needs figuring out before a real ticket exists, general for a quick brief-driven pass before the repository is indexed.

**How to use it:** `/ai-council <question>`

### Review Ticket (`request_ticket_review`)

**When to use it:** (Refinement) Right after a ticket is drafted, before anyone starts building — to surface gaps and tighten it.

**How to use it:** `/review-tickets BAPI-123` (command only — "review" as free text is easily mistaken for a freehand agent review). A single key reviews inline in the current session — no terminal tab, no worktree. For several tickets at once, `/review-tickets BAPI-123 BAPI-456` opens one terminal tab per ticket and reviews them in parallel with no worktrees; every review flag applies, and `--review KEY=auto,rounds=N` sets per-ticket overrides.
<!-- END BRIDGE MCP GUIDANCE -->
