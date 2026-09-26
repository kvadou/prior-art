# Product-experience research

Read for substantial interface, navigation or workflow design. Scale the work to
its decisions. Backend-only and trivial visual changes do not need a visual survey.
Use the same research budget as technical discovery; budget screenshot inspection
and walkthroughs explicitly instead of adding an unbounded second research phase.

## Observe a job through the interface

Start with the user's real jobs, existing product and known constraints. Choose a
small set of consequential flows, such as finding a record, understanding its state,
recording an interaction, choosing a next action and handing work to someone else.
Map which screens and state transitions each job requires. Inventory existing
capabilities before redesigning so a cleaner screen does not silently remove them.

Prefer actual product interaction when access is available, then official demos,
walkthroughs and current documentation screenshots. Design systems explain component
intent. Galleries and community concepts can inspire composition but cannot establish
shipped behavior. Include a relevant alternative or counterexample when it could
change the choice; do not collect screenshots merely to satisfy a source quota.

Inspect the sequence, not only its landing screen: entry, navigation, contextual
information, edit/action, feedback, return path. Where relevant inspect realistic
information density, long content, empty/loading/error/conflict states, keyboard
operation and narrow viewports. Do not invent inaccessible states or claim to have
executed a flow from a static image.

## Evidence and account boundaries

Label each observation as **interacted**, **observed demo**, **static reference**, or
**inferred**. Record the source/date, available version or plan, viewport if known,
and what was and was not exercised. Screenshot evidence establishes visible layout;
it does not prove persistence, permissions, scalability or a successful transaction.
A publicly documented feature may be absent from the account/plan being inspected.

Use available authorized browser/design tools, with a textual fallback when absent.
If login is needed, let the user sign in and continue independent work while waiting.
Do not create accounts, buy plans or mutate live records just to complete a survey.
Inspect forms without submitting where possible. Record an unavailable flow as a gap;
use official references within the budget without presenting them as firsthand use.

Keep private screenshots, account URLs and record content in an explicitly local,
untracked evidence location. Confirm repository visibility and ignore behavior before
saving. Do not put private account artifacts in the public skill repository, uploads,
external image-generation requests or published reference boards. Prefer synthetic
records for shared mockups; abstract interaction lessons without copying client data.
If raw capture is inappropriate, retain a written observation with its access limits.

## From references to decisions

Use the [reference board](reference-board.md) to annotate the useful pattern, its
mechanism, fit, costs and rejected aspects. Adapt hierarchy and behavior to the user's
brand and workload; do not reproduce a competitor's branding or decorative choices
without a reason. Screens that look polished can still be poor task designs.

Use the [design handoff](design-handoff.md) to connect these observations to capability
coverage, proposed screens and acceptance checks. Preserve evidence uncertainty.
A functional sketch should be labeled as such, not presented as the finished visual
result or proof of improved usability.
