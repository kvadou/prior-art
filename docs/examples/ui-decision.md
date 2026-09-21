# Worked example: navigation for a small operations app

**Synthetic teaching report.** Every product, observation and fixture below is invented
and defined in this file. No browser session, user study, web survey or agent evaluation
was run. “SUPPORTED” means supported by these fixture assumptions only. This is not a
recommendation based on validated real-world outcomes.

## Run and question

Fictional app: Willow Desk, an existing desktop-first operations app with nine owner
routes. Task: reduce repeated navigation while retaining a workable narrow-screen flow.
Brownfield, Quick profile. Illustrative method: Prior Art 0.4.0; model/runtime not
applicable (authored example, not a recorded model run). External queries: zero; three
embedded fixture reads. No elapsed execution measurement. A real run would budget six
queries and three deep reads before recommending a change.

Constraints: two owner roles, no new permissions, preserve deep links and the existing
visual language. Route membership is stable; labels may change. No usage analytics or
usability measurements are available.

## Coverage and fixtures

| Family | Coverage | Locator | Limits |
| --- | --- | --- | --- |
| Existing app | Embedded fixture read | [W1](#w1-existing-app) | Invented route inventory |
| Competing layouts | Embedded fixture read | [W2](#w2-layout-alternatives) | Same author, not independent evidence |
| Failure scenario | Embedded fixture read | [W3](#w3-reachability-scenario) | Expected behavior, not an executed test |
| Accessibility standards, implementations, user research | Not retrieved | None | Must be consulted for a production design |

### W1: existing app

Fixture revision W1-v1. Routes: Home, Board, Projects, Leads, Clients, Invoices,
Expenses, Notifications, Settings. A header contains all nine route links plus an
account menu. The task contract requires Board and Projects to remain reachable from
any owner page. A project detail URL must remain unchanged after the redesign.

### W2: layout alternatives

Fixture revision W2-v1 defines three candidate designs:

- A: all route links remain in the top header; narrow screens wrap them into rows.
- B: header holds account controls; desktop sidebar holds grouped routes; a menu
  button opens the same route list on narrow screens.
- C: sidebar appears only on the home page; detail pages contain a Back link.

These are authored alternatives, not three independently successful products.

### W3: reachability scenario

Fixture revision W3-v1 specifies a 1280×500 viewport and a 320×640 viewport. A desktop
sidebar taller than the viewport with no scrolling makes its last links unreachable.
The acceptance contract requires every route to remain reachable with keyboard alone,
and a mobile drawer to return focus to its trigger when closed.

## Decisions

| Decision | Evidence status | Observation | Inference / recommendation |
| --- | --- | --- | --- |
| KEEP existing route URLs | SUPPORTED within fixture | W1 requires deep links | Move navigation presentation without changing routing |
| ADAPT layout B | SUPPORTED within fixture, usability UNKNOWN | W2 separates route links and account controls | It fits nine routes and preserves access from details; validate discoverability |
| Reject C | SUPPORTED within fixture | W2 removes routes from detail pages | It violates W1's direct reachability requirement |
| Require short-height handling | SUPPORTED within fixture | W3 defines an unreachable-link failure | Scroll the route region or switch to a drawer; do not infer width alone is enough |

Layout A remains plausible for fewer routes. The fixture does not establish that a
sidebar is faster or preferable to users. A user study favoring the existing header,
or a reduction to three routes, could reverse the recommendation.

## Implementation seams and proposed checks

A shared navigation registry supplies both desktop and mobile views. Route selection
uses path segments, not substring matches. The shell owns focus restoration and menu
state; page components retain their existing authorization.

Proposed checks, **not executed**:

1. Open each existing detail deep link; it still reaches the same record.
2. At both W3 viewports, keyboard traversal can reach every destination.
3. Open/close the drawer with keyboard; focus returns to the trigger.
4. `/projects-old` does not activate `/projects`; a real project child does.
5. An unauthorized user still cannot read a detail page by entering its URL.

## Reusable lesson and refresh

Pattern: one route inventory, multiple responsive presentations. Applicable when
route reachability must be consistent across layouts. Known risk: hiding overflowing
navigation. Refresh if route count, user roles, viewport requirements or real usability
evidence changes. Keep this synthetic report separate from future observed results.
