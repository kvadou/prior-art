# Close the research loop

Use after a substantial authorized build, a failed workflow proof, or a later revisit
that changes a research decision. Append a compact delta to the existing project
research/design record. Do not create a second backlog or require a new review meeting.
Research-only work can leave proposed checks pending. Never claim a result not observed.

## Compare expectation with reality

| Decision / hypothesis | Original evidence | Implementation seam | Actual check and result | Disposition / next check |
| --- | --- | --- | --- | --- |
| Keep record context during handoff | Pinned source or labeled static reference | Route/component/contract | Observed sequence with environment and date, or not tested | Retain, adapt, reject, or unresolved |

Record only consequential decisions and surprises. Include failed checks and patterns
rejected during implementation, not just successes. Separate an upstream observation
from our design hypothesis and our implementation defect. A local bug does not prove
the referenced product or pattern is flawed. Preserve the old decision and link its
correction rather than silently replacing history.

## Verify a complete job

For relevant workflows trace **entry -> action -> persistence -> rediscovery -> handoff**.
Examples: create an item, reload, find it in its normal list/filter, reopen it, and
follow its context link; share an item, inspect it as the intended role, revoke access,
and check the boundary again. Include an absent relationship or unusual state when
it could invalidate the design. Backend equivalents include retry, durable state,
retrieval and downstream consumption. Use authorized synthetic fixtures for mutations.
Do not invent a handoff or role test for a workflow that has neither.

Name what establishes each claim: code inspection, database/API test, browser
interaction, rendered screenshot, or user observation. A clean render cannot prove
persistence or usability; an agent walkthrough cannot establish measured user benefit.
Distinguish local, staging and production. State any untested environment or role.

## Retain the smallest reusable lesson

Promote a lesson only with a concrete observation and its applicability boundary.
Record problem, evidence locator, correction, regression/acceptance check and refresh
trigger. One incident can justify a local regression test; it does not establish a
universal best practice. Consider whether an existing pattern record should be updated
instead of adding another. Keep hypotheses and unresolved decisions explicitly marked.

Private project details and raw artifacts stay in the project-approved local location.
Public examples use fictional identities and describe which facts were transformed.
A sanitized narrative is illustrative, not independently reproducible public evidence.
Do not publish a project name, private source path, account URL or data without scope.

## Improve the skill only where a gap is demonstrated

Identify the missed decision or failure, then propose the smallest wording, reference
or tool change. Do not add a rule for every implementation bug. Keep task budgets and
trivial-work skip behavior intact. Evaluate candidate changes on fresh tasks separately
from the case that inspired them, using the repository's paired-evaluation protocol.
Keep exact prompts, instruction snapshots, outputs, controls and missing measurements.
Agent review is not human grading. Report failures and no-difference results; never
claim superiority from a worked example or packaging tests.
