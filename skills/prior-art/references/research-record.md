# Research record and reusable pattern

Use a concise project-local document, not a mandatory new database. Omit irrelevant
sections; preserve evidence limitations. Link raw search reports/coverage rather
than pasting them in full. Never publish private project context with public research.

## Decision first

- **Recommendation:** choose, keep, defer or investigate within the authorized scope.
- **Evidence:** strongest applicable observation with source/revision/locator.
- **Limitation:** material unknown or constraint that could change the recommendation.
- **Next check:** smallest verification or review trigger; none if already resolved.

## Run header

- Question/outcome, greenfield or brownfield, scope and profile.
- Known constraints; material assumptions and unanswered business questions.
- Queries/time/tool budget, actual use if measured; source retrieval date.
- Local-first review: prior decisions/research, current code/tests, installed tools
  and integrations, package capabilities, then public alternatives. Record relevant
  checks or skips without inventorying unrelated systems.
- Prior research reused, revisions/constraints revalidated, and why it still applies.
- Repeated workaround, if any: observed recurrence, cause still uncertain, and the
  decision it motivates. Recurrence is not itself evidence that replacement is best.

## Coverage ledger

| Family/query | Status | Source/revision | What it establishes | Limits/next step |
| --- | --- | --- | --- | --- |
| Official API | read | URL, version, date | Public payment states | Internal locking unknown |
| Implementation | read | repo, SHA, path:line | Atomic state transition | Scale differs from ours |
| Incident history | failed | query/provider/date | Nothing yet | Timeout, not absence |

Statuses: read, searched-no-relevant-result, failed, not-applicable. Script query
coverage complete/partial/failed/skipped describes provider retrieval, not whether
the research question is answered. Record both when needed.

## Decision record

- **Question / reversal cost / impact:** what can go wrong, what becomes expensive.
- **Evidence status:** supported, contested, unknown, not found in surveyed sources.
- **Observed:** source-pinned fact with precise locator; independent lineage/group.
- **Inferred:** explanation if not directly documented; competing interpretations.
- **Fits us because:** user/data/scale/security/operational constraints.
- **Recommendation:** adopt dependency / adapt pattern / implement / keep / defer.
- **Alternatives, including keep current:** concrete tradeoffs, not popularity.
- **Operating cost:** recurring human work, maintenance, provider/dependency cost,
  migration and rollback effort. Separate measured amounts from estimates/unknowns.
- **Feasibility (when relevant):** demonstrated / documented but untested / blocked /
  unknown; account/runtime constraints, human handoffs, costs, smallest proof and result.
- **Implementation seam:** file, function, contract, migration or interface flow.
- **Verification:** invariant/test, acceptance check or experiment and expected result.
- **Unresolved:** what evidence would change the recommendation; owner if known.

Example: A provider documents idempotent retry keys but its internal lock is unknown.
Our recommendation may still be a unique operation ID plus transactional balance
check, based on our concurrency requirements and another implementation. Keep the
provider observation separate from that design inference. Test simultaneous retries
and over-allocation; do not cite the API docs as proof of its internal SQL.

## Pattern worth reusing

Title/problem; applicable constraints; evidence/revisions; chosen tradeoff; known
failure mode; regression check; limitations; retrieval date and refresh triggers.
Refresh when the upstream version/contract changes, an advisory contradicts it,
our constraints change, or the next task depends on unverified old behavior. There
is no universal expiration period. Retain superseded records as history and link
the newer decision instead of silently rewriting provenance.
