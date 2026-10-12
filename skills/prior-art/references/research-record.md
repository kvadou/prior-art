# Research record and reusable pattern

Use a concise project-local document, not a mandatory new database. Omit irrelevant
sections; preserve evidence limitations. Link raw search reports/coverage rather
than pasting them in full. Never publish private project context with public research.

## Decision first

- **Recommendation:** choose, keep, defer or investigate within the authorized scope.
- **Evidence:** strongest applicable observation, cited by evidence ID (`E2`) with source/revision/locator.
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

## Questions

Turn the request into the questions a decision depends on, before searching. Mark each
one at the end; a broad survey is not complete while a required question is open.

| ID | Question | Needs | Status | Answer |
| --- | --- | --- | --- | --- |
| Q1 | How do retries avoid a double charge? | Contract + implementation | answered | D1 |
| Q2 | Does the provider lock internally? | Internal source | unresolved | Not public; see E3 |

Statuses: answered, partial, unresolved. An answered or partial question cites the
decision (`D1`) or evidence (`E2`) that answers it.

## Evidence register

One row per material source or search, with a stable ID that decisions cite. This is
also the coverage ledger: failed and empty searches stay in it.

| ID | Family | Authority | Source / revision / locator | Status | Establishes |
| --- | --- | --- | --- | --- | --- |
| E1 | Official API | contract | URL, version, date | read | Public payment states; internal locking unknown |
| E2 | Implementation | source | repo, SHA, path:line | read | Atomic state transition; scale differs from ours |
| E3 | Incident history | history | query/provider/date | failed | Nothing yet; timeout, not absence |

Statuses: read, searched-no-relevant-result, failed, not-applicable. Authority says
what kind of claim the source can carry: source, contract, standard, history,
documentation, observed-artifact, observed-ui, secondary. See
[shipped products](shipped-products.md) for the observed kinds. Script coverage
complete/partial/failed/skipped describes provider retrieval, not whether the research
question is answered. Record both when needed.

## Decisions

| ID | Decision | Status | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| D1 | Payment retry / T1 | supported | E1, E2 | Stable operation key per charge attempt |

A supported or contested decision must cite at least one evidence row with status
read. A not-found-in-surveyed-sources decision cites the searched rows. Failed or
skipped retrieval never supports a claim. Expand consequential decisions below.

## Obligations

Each important adopted pattern becomes an obligation that stays open until a check of
comparable authority has run. A concurrency claim drawn from runtime behavior is not
closed by a unit test of a helper.

| ID | Decision | Invariant | Required authority | Check | Verified authority | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O1 | D1 | Two simultaneous retries produce one charge | integration | `test/payments.test.ts#concurrent retries` | - | - | open |

Authority, weakest to strongest: inspection, unit, integration, end-to-end, production.
Statuses: open, closed, failed, waived. Closed needs a named check, a result and a
verified authority at or above the required one; failed and waived need a result or
reason. Research-only work leaves obligations open; that is honest, not a defect.

Validate the record before reporting it:

```sh
node "$SKILL/bin/record-lint.ts" docs/prior-art/<record>.md
node "$SKILL/bin/record-lint.ts" --require-closed docs/prior-art/<record>.md  # after a build
```

Exit `0` complete, `2` valid but incomplete, `1` invalid. Without `--require-closed`,
incomplete means a partial or unresolved question or an unknown decision; with it, open
or failed obligations, or no obligation rows, also count. A closed obligation's check
must name a test, script or retained evidence file that exists under `--root`
(default: current directory). `path:12`, `path#test name` and `path::test_name` forms
work; a test name must appear in the file. Paths may not escape the root. The linter reads files only; it does
not run checks or prove that they pass.

## Decision record

- **ID / question / reversal cost / impact:** what can go wrong, what becomes expensive.
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
- **Verification:** obligation IDs, with invariant/test, acceptance check or experiment and expected result.
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

## Product-experience extension (when applicable)

Link the annotated reference board and design handoff. Include task sequences,
interacted/demo/static/inferred evidence labels, private artifact storage location
without publishing private contents, capability map, proposed deferrals and acceptance
checks. Record implemented phase versus remaining original goal, actual task results,
and agent inspection versus user testing. See [product-experience](product-experience.md).

## Outcome delta (after meaningful implementation or rerun)

Use [outcome review](outcome-review.md): original hypothesis/evidence, implementation
seam, observed complete-job check, retained/adapted/rejected/unresolved disposition,
correction and bounded reusable lesson. Preserve provenance and untested roles or
environments. Omit for trivial work; pending checks remain pending.
