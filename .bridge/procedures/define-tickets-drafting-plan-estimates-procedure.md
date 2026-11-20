# `/define-tickets` drafting-plan estimates procedure

An attended `/define-tickets` run reads this procedure in Stage 6 item 5, immediately
before it composes the message that shows the recommended drafting plan. It holds the
static time and credit guidance for that message. An `--auto` run never reads it.

## Static guidance for the estimates

Use this table and no other source for time and credits. It is **rough, static guidance - not measured duration or usage**. Label writer, reviewer, and every other unspecified credit cost as unknown, and never present an all-inclusive credit total. Separate the expected review credits from possible additional council charges and from the existing technical-to-general retry.

| Step | Rough time | Rough credits |
| --- | --- | --- |
| Council before the design, or after the design with `request_council` | about 15 minutes | 26 credits for standard models to 65 for frontier models |
| `second_opinion` | a few minutes per question | 5 credits per question, at most two questions |
| Gap check (epic only) | a few minutes per reviewer round: up to two ordinary rounds for a low-risk epic or three for a high-risk one, plus any confirmation passes | unknown |
| Gap-check councils (epic only) | an initial high-risk council and at most one additional qualifying council, each about 15 minutes | 26-65 credits each |
| Parallel writer pass | about as long as the slowest single draft | unknown |
| Upload | about one minute per ticket | unknown |

The credit range is the design council's own price for standard and frontier models, from `request_council` pricing in `api/library/billing/pricing.py`; the `second_opinion` fee is 5 credits.

## Return

Go back to Stage 6 item 5 of `/define-tickets` and compose the plan message with these
figures. They are rough guidance. Never present them as measured, and never invent a
figure this table does not give.
