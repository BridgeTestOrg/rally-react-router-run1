$ARGUMENTS

---

# Instructions

Synchronize recently-updated Jira tickets with the local `tickets` database table and backfill missing workflow state timestamps. Perform all work directly in the main thread.

## Stage 0 — Parse Arguments and Calculate Date

1. Read the value of `$ARGUMENTS`. If it is empty, whitespace-only, or not a valid integer, default `months_back` to `3`. If it contains multiple tokens, extract only the first token and attempt to parse it as an integer. If parsing fails, default to `3`.

2. Calculate `updated_since` by subtracting `months_back` months from today's date. Format the result as `YYYY-MM-DD`. Example: if today is 2026-03-07 and `months_back` is 3, then `updated_since` is 2025-12-07.

3. Display the parsed values: "Scanning tickets updated since {updated_since} (months_back = {months_back})"

4. Initialize the following tracking variables:
   - `tickets_scanned` = 0 (total tickets fetched from Jira)
   - `newly_tracked` = 0 (tickets inserted into database for the first time)
   - `state_updated_list` = [] (list of objects with ticket key and fields updated)
   - `warnings` = [] (list of warning strings for any per-ticket failures)

## Stage 1 — Fetch All Tickets from Jira

1. Initialize an empty list `all_tickets` and set `offset` to `0`.

2. Enter a pagination loop:
   - Call the `get_tickets` MCP tool with: `updated_since` set to the calculated date, `limit` set to `100`, and `offset` set to the current offset value.
   - Parse the JSON response. The response contains a `tickets` array of ticket objects. Each ticket object has a `ticket_number` field (the Jira key, e.g., `BAPI-42`), along with `summary`, `status`, `issue_type`, `assignee`, and `updated_at`.
   - Append all tickets from the response's `tickets` array to `all_tickets`.
   - If the number of tickets returned in this page equals `100`, increment `offset` by `100` and repeat the loop.
   - If fewer than `100` tickets are returned, exit the loop.

3. Set `tickets_scanned` to the length of `all_tickets`.

4. Display: "Fetched {tickets_scanned} tickets from Jira. Processing..."

5. If the `get_tickets` call fails at any point during pagination, **stop** and report the error. Do not proceed to Stage 2.

## Stage 2 — Track Each Ticket

1. Iterate over each ticket in `all_tickets`. For each ticket:
   - Call the `track_ticket` MCP tool with `ticket_number` set to the ticket's `ticket_number` field. If the ticket object includes a `summary` field, pass it as the `description` parameter.
   - Inspect the response message. If the response indicates the ticket was newly created/inserted (look for words like "created" or "inserted" in the message, as opposed to "already exists" or "updated"), increment `newly_tracked` by 1.
   - If the `track_ticket` call fails for this ticket, add a warning to the `warnings` list (e.g., "Warning: Failed to track ticket {ticket_number}: {error}") and **continue** to the next ticket. Do not abort the scan.

2. Display a brief progress indicator every 25 tickets, e.g., "Tracked {N} of {tickets_scanned} tickets..."

## Stage 3 — Detect and Backfill Workflow State

Display: "Checking workflow state for {tickets_scanned} tickets..."

Iterate over each ticket in `all_tickets`. For each ticket (referenced by its `ticket_number` field), perform the following sub-steps. Wrap the entire per-ticket block in error handling: if the `get_ticket_state` call or the subsequent `update_ticket_state` call fails for a ticket, add a warning to `warnings` and continue to the next ticket.

**Sub-step 4a — Retrieve current state**: Call the `get_ticket_state` MCP tool with `ticket_number` set to the ticket's key. The response contains:

- Five timestamp fields (each is a timestamp string or null): `clarify_called`, `clarify_answered`, `critique_called`, `critique_answered`, `plan_generated`
- Three boolean artifact flags: `has_clarifying_questions`, `has_critique`, `has_plan`

If the call returns a 404 or any error, add a warning to `warnings` and continue to the next ticket.

**Sub-step 4b — Build fields_to_update list**: Initialize an empty `fields_to_update` list, then apply the following rules:

- If `has_clarifying_questions` is `true` AND `clarify_called` is null -> add `"clarify_called"` to `fields_to_update`
- If `has_clarifying_questions` is `true` AND `clarify_answered` is null -> add `"clarify_answered"` to `fields_to_update`
- If `has_critique` is `true` AND `critique_called` is null -> add `"critique_called"` to `fields_to_update`
- If `has_critique` is `true` AND `critique_answered` is null -> add `"critique_answered"` to `fields_to_update`
- If `has_plan` is `true` AND `plan_generated` is null -> add `"plan_generated"` to `fields_to_update`

**Sub-step 4c — Call update_ticket_state if needed**: If `fields_to_update` is non-empty, call the `update_ticket_state` MCP tool with `ticket_number` set to the ticket's key and `fields` set to the `fields_to_update` array. If this succeeds, add an entry to `state_updated_list` recording the ticket key and the list of fields that were set. If `update_ticket_state` fails, add a warning to `warnings` and continue.

Display a progress indicator every 25 tickets that includes the current ticket key, e.g., "Checked state for {TICKET-KEY} ({N} of {tickets_scanned} tickets)"

## Stage 4 — Report Summary

1. Calculate `state_updated_count` as the length of `state_updated_list`.

2. Display the summary:

   ```
   **Scan complete**

   * Tickets scanned: {tickets_scanned}
   * Newly tracked: {newly_tracked}
   * State updated: {state_updated_count}
   ```

3. If `state_updated_list` is non-empty, display a section titled "Updated tickets:" with one bullet per ticket showing the ticket key and the comma-separated list of fields that were set. Example:

   ```
   Updated tickets:
   * BAPI-101: clarify_called, clarify_answered
   * BAPI-105: critique_called, critique_answered, plan_generated
   ```

4. If the `warnings` list is non-empty, display a section titled "Warnings:" listing each warning string as a bullet. Example:

   ```
   Warnings:
   * Warning: Failed to track ticket BAPI-99: Connection timeout
   * Warning: State query failed for BAPI-112: SQL error
   ```

5. If there are no warnings, do not display the "Warnings:" section.
