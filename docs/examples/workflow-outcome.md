# Workflow outcome: a created item must be findable

This is a sanitized teaching narrative derived from a real implementation session.
Identities, product labels and source locations are omitted. It influenced the 0.7.0
change, so it is a development example, not a held-out evaluation. The private session
record is not published; readers cannot independently reproduce its reported results.
No competitor's implementation or user productivity was measured.

## Decision and surprise

The design connected a discussion reply to a new assigned work item, with a backlink
to its source. The local creation flow persisted the item and opened its detail panel.
A later browser check found that closing the panel made company-level items disappear
from the normal board: the list query and view assumed every item belonged to a project.

The pattern was useful; its integration into existing retrieval logic was incomplete.
A successful submit and working direct URL did not establish a usable workflow.

| Expectation | Observation reported by the session | Correction | Bounded lesson |
| --- | --- | --- | --- |
| New work remains discoverable | Company-only item persisted but was omitted from the board | Include unprojected work within the selected company's scope | Check optional relationships through normal retrieval, not only creation |
| Filters preserve context | A broad company list could widen a scoped query during the fix | Explicit company uses only that company; explicit project remains strict | Test both inclusion and exclusion when broadening a retrieval path |
| Existing association remains truthful | Detail selector could visually default to a project for an unprojected item | Represent no project explicitly | Never invent a relationship merely to make the UI render |

## Reported verification and limits

The session reported local browser rediscovery and source navigation, query/helper
regression tests and independent review of scope boundaries. A production count found
no existing affected items. That count does not validate future behavior. User testing,
task-time improvement and independent public reproduction were not performed.

## Reusable check

Create synthetic work without its optional parent. Close the detail, reload the normal
list, find the work, reopen it, and follow its source link. Repeat with a different
company and explicit project filter to ensure isolation. An actual project should link
its own implementation and test evidence; this teaching narrative supplies neither.

Do not turn every bug into a global rule. The research-process gap here was stopping
at successful creation instead of checking the complete job. The local query fix stays
local; the portable lesson is action, persistence, rediscovery and handoff verification.
