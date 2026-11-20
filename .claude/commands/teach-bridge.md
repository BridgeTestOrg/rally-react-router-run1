Update a Bridge API configuration field via a natural-language teaching.

$ARGUMENTS

---

# Instructions

This command takes a natural-language teaching (e.g., "use data-testid selectors in Playwright tests") and updates the appropriate Bridge API configuration field. The teaching is auto-classified to the correct field, merged with existing content as actionable AI instructions, and uploaded after user confirmation.

`$ARGUMENTS` is required — it is the teaching text. If `$ARGUMENTS` is empty, show:

```
Usage: /teach-bridge <teaching>

Examples:
  /teach-bridge use data-testid selectors in Playwright tests
  /teach-bridge always validate input DTOs with Pydantic before passing to service layer
  /teach-bridge prefer composition over inheritance for service classes
```

If any stage fails, stop immediately and report which stage failed and why.

## Stage 0 — Preflight

1. **Validate arguments**: If `$ARGUMENTS` is empty or contains only whitespace, display the usage instructions above and stop.

2. **Admin check**: Call the `ping` MCP tool (no parameters) and read `role` from its first (JSON)
   content item. Inspect it:
   - If `role` is `"admin"` OR `role` is `null` (not determined — e.g. a legacy shared key): proceed normally.
   - Otherwise (an explicit non-admin role such as `"member"`): stop immediately and display:
     ```
     Admin access required. Your API key has role "<role>".
     Only admin keys and legacy shared keys can update configuration fields.
     Contact your project administrator to request admin access.
     ```

If this stage fails, stop immediately and report the error. Do not proceed to Stage 1.

## Stage 1 — Classify

1. **List available fields**: Call the `config_field` MCP tool with `operation` set to `"list"` (no other parameters). This returns all available configuration field names with descriptions.

2. **Evaluate the teaching**: Compare the user's teaching (`$ARGUMENTS`) against each field's description to determine which field it applies to.

3. **Handle classification outcomes**:
   - **Clear single match**: If one field is clearly the best target, proceed to Stage 2 with that field.
   - **Multiple plausible matches**: If 2-3 fields are equally plausible, present them to the user with their descriptions and ask which one to update. Wait for user input before proceeding.
   - **No confident match**: If you cannot confidently map the teaching to any field, ask the user to elaborate or specify which field they intend. Wait for user input before proceeding.

## Stage 2 — Merge

1. **Read current value**: Call the `config_field` MCP tool with `operation` set to `"get"` and `field_name` set to the selected field from Stage 1. Capture the current value, description, and examples from the response.

2. **Draft the update**:
   - **If the field is currently null or empty**: Compose initial content from the teaching. Rephrase the user's input as imperative, agent-facing instructions (e.g., convert "I want you to use data-testid" to "Always use `data-testid` attributes for Playwright element locators"). Do not use the user's exact conversational text.
   - **If the field has existing content**: Merge the teaching into the existing value at the most appropriate location. Rephrase as imperative, agent-facing instructions. Preserve the existing structure and formatting.

3. **Handle contradictions**: If the teaching contradicts existing instructions in the field, present both the existing instruction and the new teaching side-by-side and ask the user which should take precedence. Wait for user input before proceeding.

## Stage 3 — Confirm and Upload

1. **Show the proposed update**: Display to the user:
   - **Field**: The name of the field being updated
   - **Change summary**: A brief description of what was added or changed
   - **Full proposed value**: The complete new value for the field (not just the diff)

2. **Wait for confirmation**: Ask the user to confirm, request edits, or abort.

3. **On confirmation**: Call the `config_field` MCP tool with:
   - `operation`: `"update"`
   - `field_name`: the selected field name
   - `value`: the full merged value (pass inline, do not use `file_path`)

   Display a success message confirming the update.

4. **On rejection**: Ask the user what they'd like to change. If they provide edits, revise the proposed value and show it again. If they abort, stop without making any changes.
