# Shipped products: evidence without source

The strongest incumbent is often closed: a SaaS web app, a desktop client or a
mobile app with no public repository. Its help pages and screenshots show the
surface. Its shipped artifacts and its own network traffic can show more: the
resources it exposes, how it names them, which calls a workflow makes, and how its
desktop client is split into processes. Use this family when a decision depends on
how a closed product behaves and public source or contracts do not answer it.

## Authorization comes first

Inspect only products you own, are licensed to use, or are explicitly authorized to
examine, using your own account and synthetic records. Read the product's terms
before inspecting it. Many SaaS terms prohibit reverse engineering, scraping or use
by competitors, and a trial account does not waive them. When terms forbid it or are
unclear, stay with public documentation, help centers and observed UI, and record
the family as not-applicable with that reason. Never bypass licensing, paywalls,
authentication or rate limits, and never replay captured requests against the
service.

Captures contain session tokens, cookies and personal data. Keep raw captures local
and untracked, outside public repositories and shared records. Cite them by local
path, date and digest; publish only derived, sanitized observations.

## What each source can establish

| Source | Establishes | Does not establish |
| --- | --- | --- |
| Saved network capture (HAR) of your own session | Observed request lines, path templates, payload field names, ordering within one workflow | Server-side storage, transactions, handlers or behavior on unobserved paths |
| Extracted desktop or Electron bundle | Module structure, IPC boundaries, bundled libraries and versions, feature flags present in the build | That a code path runs, or which flags are enabled for an account |
| Live browser or desktop observation | What happened for this account, state, version and date | Behavior for other roles, plans, regions or versions |
| Public help, changelogs and API docs | The vendor's stated contract and intent | That the shipped product matches it |

Label artifact-derived rows `observed-artifact` and screen-derived rows `observed-ui`
in the evidence register. Both are weaker than source or an official contract for
internal claims, and stronger than marketing copy for what the product actually
does. A static finding is a candidate; it never proves runtime behavior. Missing
coverage is unknown, not absence: an endpoint absent from one capture may exist.

## Collect it

Without extra tooling, a browser's developer tools can export a HAR for one workflow:
open the network panel, preserve the log, perform the task once with synthetic data,
then export. Name the workflow, account role, product version and date. Group
requests by method and path template rather than reading raw URLs one by one, and
strip authorization headers and cookies before anything is shared.

When the REA tool (github.com/morluto/rea) is installed and connected, it can do this
analysis locally with evidence records. Use the tool names your connected server
actually lists; at the time of writing they include:

- `inspect_web_network_capture`, then an `api-surface` view: groups a HAR by method,
  origin and path template, citing record ordinals. It does not replay requests.
- `analyze_javascript_application`: modules, imports, IPC and native add-on
  relationships in an extracted Electron app or ASAR, without running it.
- `list_browser_targets` and `list_electron_targets`: passive observation of a page
  or app you already have open.

REA is optional. Its own guidance is to skip it for ordinary source repositories, so
use normal repository tools there. Do not install it, register it with an agent or
download a product binary as part of a research request without the user's approval;
record the family as not-applicable or unknown and continue with the other families.

## Record it

Each capture or artifact gets an evidence register row: family `shipped product`,
authority, product and version, account role, workflow, capture date, local path or
digest, and what it establishes. A decision citing it states the limits above. When
a design copies an observed behavior, name it as an inferred requirement and give it
an obligation, so the rebuilt behavior is checked rather than assumed.
