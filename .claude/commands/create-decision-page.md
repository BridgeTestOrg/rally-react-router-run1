Turn open decisions from this conversation into an interactive HTML decision page, then fold the answers back in.

$ARGUMENTS

---

# Instructions

`$ARGUMENTS` is a free-form description of what needs deciding — a topic ("how we handle rate limiting"), a list of specific questions, or empty. It is **not** a Jira ticket key.

This command exists so a decision page can be reached in ordinary conversation, without running a larger automation. A decision page frames each open choice as a card — the question, why it matters, 2-4 concrete options with the consequence of each, and a recommendation — and renders it as a local HTML page the user submits from their browser. The submitted JSON comes back to you and the decisions become settled.

Use it whenever a conversation has accumulated more open choices than are comfortable to settle in prose. Do not use it to ask one simple question — ask that directly.

Run every stage in the main conversation so the user sees the framing as it happens. If a stage fails, say which one and why.

## Stage 1 — Frame the decisions

1. **Gather the candidates.** Take the decisions named in `$ARGUMENTS` plus any open choice raised earlier in this conversation and not yet settled. If `$ARGUMENTS` is empty, use the conversation alone. If you find nothing genuinely open, say so and stop — do not manufacture cards to fill a page.

2. **Write one card per decision.** Each card needs:
   - `id`: a short stable id, e.g. `D-1`, `D-2`. Ids must be unique — a duplicate is rejected, because the id is the key the user's answer is reported under.
   - `question`: the decision itself, phrased as a question.
   - `options`: 2-4 concrete option labels. Do **not** include "None of these" or "Ask about this" — the renderer appends both automatically, and passing "None of these" yourself is rejected.
   - `option_consequences`: one consequence per option, **parallel to and the same length as** `options`. Say what actually follows from choosing it, not a restatement of the label.
   - `why_it_matters`: the concrete impact of getting this wrong.
   - `recommendation_explanation`: why the recommended option is best.
   - `recommendation_index`: the 0-based index of the recommended option, within range of `options`.
   - `codebase_evidence` (optional): your assessment plus `file:line` citations, shown collapsed behind a disclosure.

   Give a real recommendation on every card. If one option is obviously right, still supply the strongest alternative as a second option so the user can see what they are ruling out.

3. **Show the list and let the user correct it.** Present the questions and options in chat before rendering anything. The user may add a decision you missed, drop one that is already settled, or reject your framing of a question. Apply their corrections, then proceed. This check is cheap; a page built on the wrong questions is not.

## Stage 2 — Render the page

1. **Pick a slug.** Derive a kebab-case slug from the topic — a few meaningful words, lowercase, non-alphanumerics stripped, at most 60 characters. It **must** match `/^[A-Za-z][A-Za-z0-9_-]*$/`; if it would start with a digit or hyphen, prefix it with `decisions-`. This slug is the `ticket_key`, which accepts any such slug and does not have to be a Jira key.

2. **Call `generate_decision_page`** with the routing fields at the root and everything else nested under `content`. **The nesting is required** — `actionable_items`, `system_goals`, `clear_improvements`, and `implementation_order` passed at the root are silently dropped by the tool's lean input schema, and a call with no `content` at all is rejected.
   - `ticket_key`: the slug.
   - `artifact_type`: `review_decisions` (the default).
   - `output_subdir`: `decisions`.
   - `output_filename`: `{slug}-decisions.html`.
   - `labels`: optional presentation overrides — `title`, `intro`, `section_heading`. Set a `title` that names the topic, and an `intro` that says what agreeing to these choices commits the user to.
   - `content`: an object holding `actionable_items`.

   ```typescript
   interface DecisionPageContent {
     actionable_items: Array<{
       id: string;                    // e.g. "D-1"; must be unique
       question: string;
       why_it_matters: string;
       recommendation_explanation: string;
       options: string[];             // 2-4 labels (no "None of these" / "Ask about this")
       option_consequences: string[]; // same length as options
       recommendation_index: number;  // 0-based within options
       codebase_evidence?: string;    // optional: assessment + file:line citations
     }>;
   }
   ```

   Example call:
   ```json
   {
     "ticket_key": "rate-limiting",
     "artifact_type": "review_decisions",
     "output_subdir": "decisions",
     "output_filename": "rate-limiting-decisions.html",
     "labels": { "title": "Rate Limiting Decisions", "section_heading": "Open Decisions" },
     "content": {
       "actionable_items": [
         {
           "id": "D-1",
           "question": "Where should the limit be enforced?",
           "why_it_matters": "Determines whether a burst is rejected before or after it reaches the database.",
           "recommendation_explanation": "Middleware keeps the limit in one place and protects every route without per-handler work.",
           "options": ["In middleware", "Per handler"],
           "option_consequences": ["One place to change; blunt for routes that need different budgets.", "Precise per route; every new route must remember to opt in."],
           "recommendation_index": 0,
           "codebase_evidence": "api/routes/__init__.py:41 already composes shared dependencies for every router."
         }
       ]
     }
   }
   ```

3. **When the decisions come with framing worth showing**, use `artifact_type: "pre_ticket_planning"` instead and add a `system_goals` object inside `content` (`business_goal`, `desired_end_state`, `system_behavior`, and optionally `acceptance_criteria` and `nfrs`). Those render read-only above the cards, each with its own agree / ask / disagree control. Use this when the user needs to see the goal the decisions serve in order to answer them; the plain `review_decisions` page is the right default otherwise.

4. **Handle the response `status`:**
   - `decision_page_generated`: surface the returned `file_path` and go to Stage 3.
   - `no_decisions_needed`: no page was written because there was nothing to render. Tell the user, and do not proceed to Stage 3.
   - `VALIDATION_ERROR`: the message names the field and restates the expected shape. Fix the payload and retry once. If it fails again, report the message verbatim rather than guessing further.

If the tool fails outright, **output a highly visible warning** (e.g. **⚠ WARNING: The decision page could not be generated** in bold) and fall back to settling the decisions in chat, one at a time. Do not continue silently — the failure must be visible in your output.

## Stage 3 — Capture the answers (stop and wait)

1. **Direct the user to the page.** Give them the `file_path` and tell them to open it in their browser. Explain that they can accept a recommendation, pick another option, reject them all, or flag a card for discussion, and that they can ask you questions in chat before submitting.

2. **Treat each message as a commit or a discussion turn.**
   - **Commit:** trim the message and try to parse the whole trimmed message as JSON. Treat it as a commit only when the result is an object with all three top-level fields: `ticket_key` (string), `decisions` (object), and `general_comment` (string). The first valid commit-shaped paste commits — do not over-validate the individual cards.
   - **Discussion:** anything else. Answer it, then keep waiting. If a JSON-shaped paste is missing one of the three fields, say which one rather than treating it as a freeform question.
   - **In-flight overrides:** if the user changes an answer in chat ("go with per-handler for D-1"), record it as an override. On commit, the submitted JSON is the baseline and your recorded overrides win; acknowledge each overridden card in one line.

3. **Resolve every "ask" (hard rule).** After accepting a commit, find every item in `decisions` where `choice === "ask"`. For each, present the evidence and keep discussing until the user gives an explicit answer. Do not proceed while any `ask` is unresolved, and do not honor "just skip those" — an unanswered card is an unmade decision.

4. **Handle "None of these".** A `choice` of `"none"` means every option you offered was wrong. Ask what the user would do instead and record their answer as the decision. Do not re-render the page for this.

**You MUST stop and wait for the user here.** Do not assume answers, do not proceed on the recommendations, and do not move to Stage 4 until the user commits or explicitly declines. If they decline, say the decisions are unsettled and stop.

## Stage 4 — Fold the answers back

1. **Review the wider implications, then gate on a decision.** Build the review from the complete settled set: the submitted `decisions`, any in-flight overrides recorded during the conversation (these take precedence over the submission), every `"none"` answer together with the reason given for it, `general_comment`, and — where this surface tracks acceptance-criterion or NFR stances — those stances too. Do not start the review until every `ask` has an explicit recorded resolution and every in-flight override has been applied.

   Consider three fixed categories, regardless of whether a decision was framed as technical, user-facing, or business-oriented:
   - **Program / application** — architecture, code paths, operability, maintenance burden, and requirements imposed on other parts of the software.
   - **User** — end users, new users performing setup, operators, and developers, including prerequisites, setup friction, and additional steps.
   - **Business** — cost, adoption, support load, compliance, and reversibility.

   Emit only the categories with material second-order implications. For each included category, write at most four one-line bullets of about 25 words, each naming who or what is affected and how — never a restatement of the selected decision. Close with a line naming every considered category that was omitted, e.g. `Considered, nothing material: business.` — omit this closing line only when all three categories have material implications.

   If the review cannot be produced, report that in one line and continue without stalling the workflow or presenting the gate below.

   This review stays in chat: there is no document for this command to update.

   Then present the gate, verbatim: `Implications reviewed. Proceed, or name a decision to revisit.` Accept only a normalized `proceed`, `yes`, `y`, or `go` as a continuation token. Any other response names a decision to reopen: re-settle it in chat, record the new override, rerun the entire implications review against the changed settled set, and present the gate again.

   Literal `auto_approve = true` emits the review but skips this gate entirely; a missing or non-true `auto_approve` value follows the human-in-the-loop path above.

2. **Restate every decision as settled**, in a short list: the question, the chosen answer, and — where the choice went against your recommendation or came from an override — one line on what changes as a result.

3. **Carry `general_comment` as overarching guidance.** It applies across all the decisions, not to any one card. Say plainly how it changes the picture.

4. **Name what these decisions now constrain.** One or two sentences on what is now fixed for the rest of the conversation. From here on, treat the settled answers as the contract — if later work would contradict one, say so and ask rather than quietly re-deciding.

There is no document to rewrite. The conversation is where the decisions live, unless the user asks you to record them somewhere.
