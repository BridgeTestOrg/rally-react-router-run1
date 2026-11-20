# `/define-tickets` decision-page procedure

An attended `/define-tickets` run reads this procedure in Stage 5, immediately before it
calls `generate_decision_page`. It holds the shape of the `content` object and one
example call. The rules for the page stay in the command: the routing fields, the rule
that `system_goals` is always passed, the mandatory `SCOPE-1` card, and the rule that
cards ask about requirements, never about implementation. An `--auto` run never reads
this procedure, because it skips Stage 5.

## Content shape

```typescript
interface ExploreTicketContent {
  system_goals?: {
    business_goal: string;
    desired_end_state: string;
    system_behavior: string;
    acceptance_criteria?: Array<{
      id: string;                    // e.g. "AC-1"; must be unique
      criterion: string;             // what the system must do
      verification: string;          // how we would confirm it holds
      status: "confirmed" | "assumed" | "open";
    }>;
    nfrs?: Array<{
      category: string;
      requirement: string;
      implication: string;
      status: "confirmed" | "assumed" | "open";
    }>;
  };
  actionable_items?: Array<{
    id: string;                      // "SCOPE-1" for ticket count; "R-1", etc. for requirement questions
    question: string;
    why_it_matters: string;
    recommendation_explanation: string;
    options: string[];               // 2-4 candidate answers (no "None of these" or "Ask about this")
    option_consequences: string[];   // same length as options
    recommendation_index: number;   // 0-based within options
    codebase_evidence?: string;      // optional: assessment + file:line citations
    original_question?: string;      // optional: only when item maps to a verbatim question
  }>;
  // clear_improvements: not used by this command — it captures requirements, not findings
  // implementation_order: for epic surfaces only — do NOT include for single task explorations
  // depends_on: hard prerequisites (titles/keys that must land first)
  // recommended_after: soft sequencing preferences, not hard blockers
}
```

## Example call

```json
{
  "ticket_key": "revoke-api-keys",
  "artifact_type": "pre_ticket_planning",
  "output_subdir": "explorations",
  "output_filename": "revoke-api-keys-requirements.html",
  "labels": { "title": "Requirements & Ticket Scope", "section_heading": "Requirements & Scope Questions" },
  "content": {
    "system_goals": {
      "business_goal": "Operators can cut off a leaked key immediately.",
      "desired_end_state": "Revocation is self-serve and takes effect at once.",
      "system_behavior": "Rejects revoked credentials without a restart.",
      "acceptance_criteria": [
        { "id": "AC-1", "criterion": "An operator who revokes a key sees the next request with it rejected.", "verification": "The following call to the protected route returns 401.", "status": "confirmed" },
        { "id": "AC-2", "criterion": "Revocation is recorded with actor and timestamp.", "verification": "An audit row names the operator and the revoked key id.", "status": "open" }
      ],
      "nfrs": [
        { "category": "security/privacy", "requirement": "The raw key is never logged on the revoke path.", "implication": "Log the key id, never the secret.", "status": "open" }
      ]
    },
    "actionable_items": [
      {
        "id": "SCOPE-1",
        "question": "Scope: How many implementation tickets should encompass these requirements?",
        "why_it_matters": "Sets the agreed ticket count while preserving every requirement. An epic parent is additional for three or more implementation tickets.",
        "recommendation_explanation": "One ticket keeps this cohesive revocation change and its verification together within the existing sizing guidance.",
        "options": ["1 implementation ticket: revocation behavior and verification", "Discuss a different ticket count"],
        "option_consequences": ["Cover every requirement in one implementation ticket, with no epic parent.", "Agree a concrete count and coverage boundaries in chat before design work begins."],
        "recommendation_index": 0
      },
      {
        "id": "R-1",
        "question": "Must revocation take effect immediately, or is eventual acceptable?",
        "why_it_matters": "Sets the hard bound AC-1 has to meet.",
        "recommendation_explanation": "A leaked key is an active incident; eventual leaves a usable window.",
        "options": ["Immediately (under 5s)", "Eventually (under 60s is acceptable)"],
        "option_consequences": ["AC-1 gains a 5s bound.", "AC-1 gains a 60s bound."],
        "recommendation_index": 0
      }
    ]
  }
}
```

## Return

Go back to Stage 5 item 3 of `/define-tickets`, make the `generate_decision_page` call,
and handle its response `status` as item 4 describes.
