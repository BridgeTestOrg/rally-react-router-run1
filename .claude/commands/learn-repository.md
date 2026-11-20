Learn and document all configuration fields for the repository by running parallel research agents.

$ARGUMENTS

---

# Instructions

This command is recipe-driven. Do not call MCP tools directly -- the recipe determines which tools to call and with what parameters. There are exactly two narrow exceptions, both invoked directly by this command and never through the recipe: the `ping` admin preflight at entry (immediately below) and the closing `get_install_manifest` capability report (step 6).

## Admin preflight (UX guard — run this first)

Before the onboarding guidance below and before fetching the recipe, call the `ping` MCP tool
once (the first of the two narrow exceptions above) and read `role` from its first (JSON) content item:

- If `role` is `"admin"`, or `role` is `null` (not determined — e.g. a legacy shared key): continue to
  the guidance and recipe below.
- Otherwise (any non-admin `user_access` result — e.g. a "member" key): stop immediately, run nothing
  else (no recipe fetch, no research, no configuration write), and display exactly one concise message:
  ```
  Admin role required to learn this repository. Learning writes shared Bridge project configuration,
  which only an admin may change. Ask a project admin to run /learn-repository, or use an admin API key.
  ```
- If the `ping` call fails or returns a malformed / unrecognized response, treat it as a
  preflight failure: stop with the same admin-required message rather than proceeding into
  configuration writes.

This preflight is a UX guard ONLY — it fails fast with one clear message instead of the cascade of
per-field denials a non-admin would otherwise hit. It is NOT the security control: the authoritative
enforcement is the existing server-side admin gate on the `config_field` update and
`apply_install_manifest` routes, which already reject non-admin keys regardless of this client-side
check.

1. This command takes no arguments.

2. **Before executing any recipe step**, tell the user what they are about to sit through and why it
   is worth it:

   ```
   Learning this repository. This usually takes 15–30 minutes — the research agents read the actual
   codebase, and all the unlearned fields are researched in parallel, so the wait is roughly the
   slowest single field rather than the sum of all of them.
   Fields that are already populated are skipped entirely.

   The run may begin with a short optional interview about your team's ticket preferences. Any proposed
   preferences are shown once for approval before research starts.

   What this buys you: these fields are what ground Bridge's agents in THIS codebase. Planning,
   reviewing, and code generation all read them, so they follow your repository's actual
   architecture, testing, documentation, and correctness conventions instead of generic defaults.

   It runs unattended — there are no approval prompts during the run. You may be asked one batched
   question at the very end.
   ```

   Keep the 15–30 minute range exactly as written; do not invent a different number of minutes.

3. Call the `get_pipeline_recipe` MCP tool with:
   - `pipeline`: `"learn-repository"`

   If the tool returns an error, stop and report the failure.

4. Read and strictly obey the `agent_instructions` field in the response. Execute each step in order, announcing each as **Step N of M: <description>**.

   Retain, for the closing summary: the ticket standard interview task's structured result (its
   `outcome`, `gap_reason`, `draft_path`, and `character_count`) — if that result is failed, missing,
   or unreadable, treat it as `gap — interview_failed` and keep going with the research — the
   consolidated research task's structured result (its per-field
   `status`, `character_count`, `condensed`, and `condensation_reason`), each upload step's result,
   and the final confirmation task's structured result. You will need all four — do not discard them
   as you go.

5. After all steps complete, display a summary built from the results you retained:

   ```
   ## Learn Complete

   **Status**: Success / Completed with gaps / Failed at step N

   **Learned and applied**: <fields drafted this run and written to config>
   **Already populated (skipped)**: <fields skipped because they already had a value>
   **Condensed to fit the field limit**: <field — reason it was condensed, per field>
   **Gaps**: <fields whose research or upload failed, each named with its reason>
   **Ticket standard**: <learned from interview / defaults (skipped) / already populated (skipped) / gap — unavailable / gap — update_failed / gap — interview_failed>
   **Confirmation**: <approved / applied / declined / pending human input / not applicable, per field>

   Review or edit any of these on the **Project Configuration** page, under **Code Writer Settings**
   for the learned instructions and **MCP Validation Manuals** for the manual selection. Bridge's
   agents read whatever is stored there, so correcting a wrong conclusion there changes their
   behavior.
   ```

   Rules for the summary:

   - A run where some fields failed but others applied is **`Completed with gaps`**, not `Failed`.
     Name every gap explicitly — an unnamed gap is worse than a failed run, because the user believes
     the field was learned.
   - Report confirmation candidates that could not be presented in a headless session with the exact
     phrase `pending human input`.
   - Every field that was condensed must appear with the reason it was condensed.
   - Map the ticket standard result to its line this way: `learned_from_interview` is `learned from
     interview`; `defaults` is `defaults (skipped)`; `skipped_existing` is `already populated
     (skipped)`; `gap` is `gap — unavailable`, `gap — update_failed`, or `gap — interview_failed`,
     according to its `gap_reason`.
   - For `gap — update_failed`, include the retained draft path and warn that re-running
     `/learn-repository` deletes the unsaved draft during setup, so it should be copied first.
   - Any ticket standard gap makes an otherwise completed run `Completed with gaps`.
   - Keep the ticket standard separate from the ten learned-field buckets. It is not a researched or
     uploaded field, so never count it in them.

6. **After** the `## Learn Complete` summary above is fully displayed, close with the same concise
   capability report `/install-bridge` renders (BAPI-658, AC-9). This is the recipe's ONE exception to
   "do not call MCP tools directly": call the `get_install_manifest` MCP tool EXACTLY ONCE here,
   directly, with no arguments beyond what it requires — never through the recipe, never a second time,
   and never to apply or change any configuration.

   The report is structurally and visually SUBORDINATE to `## Learn Complete` above it — it is a
   closing addendum, not a replacement for or a distraction from the learn summary's own status,
   fields, gaps, and confirmation outcome.

   If the `get_install_manifest` call errors, or its response has no `concise_tool_capabilities` field,
   or that field is present but malformed (not the server's two-section `{id, name, tools}` availability
   shape), print exactly this line and stop — do not attempt the report in any other form:

   ```
   capability report unavailable — run /install-bridge to see it
   ```

   Never substitute documentation, the complete `tool_capabilities` catalog, a remembered tool list, or
   an inferred capability category for a missing or malformed concise field — a hallucinated report
   during this trust-critical first run is worse than no report at all.

   Otherwise, render exactly one section, with this exact heading, from `concise_tool_capabilities`
   only:

   **What Bridge can help with**

   - Render the server's two availability sections in the order it gave them — "Available now" first,
     then "Needs setup" — using each section's `name` as its sub-heading. Do not reorder, merge, drop a
     section the server included even when its `tools` array is empty, or add a third one.
   - Within a section, render each item's `display_name`, then its `description`, then its `how_to_use`
     when that value is a non-empty string, in server order. Items in "Needs setup" additionally carry
     the server's `availability_text`, rendered verbatim as the setup guidance; items in "Available now"
     carry no availability caveat at all and must not be given one.
   - Render a `kind: "workflow"` item exactly like a `kind: "tool"` item. `kind` is contract metadata,
     not a visual distinction — no label, icon, separate list, or client branching on its value.
   - Keep an empty section visible with one short neutral line rather than dropping it, and close the
     report by pointing at the Bridge MCP server README for the complete tool documentation. Name the
     README in prose only — this command never hardcodes a URL.
   - Do not locally filter, count, regroup, sort, infer availability, pair a retrieval tool with a
     primary, fabricate an item, write configuration, or fall back to the complete `tool_capabilities`
     or `workflows` collections for this section under any circumstance.
