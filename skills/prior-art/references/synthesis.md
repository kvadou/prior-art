# Synthesis: evidence into decisions

The primary agent owns synthesis and recommendations. Readers supply bounded,
cited evidence, not a collective vote that decides the design. Reuse established
user constraints and answers; ask only when an unresolved choice materially changes
the outcome and cannot be resolved within existing authorization.

## 1. Build the decision matrix

Use one row per relevant decision, not per fashionable feature. Include our
constraints, alternatives, source observations, contrary evidence and evidence gaps.

| Decision / reversal cost | Constraint fit | Evidence and ancestry | Status | Recommendation / invariant |
|---|---|---|---|---|
| Payment retry behavior / T1 | Concurrent retries, durable history | Pinned implementation + official provider contract; SDK shares vendor ancestry | supported within these limits | Stable operation key; duplicate retries produce one effect |

Use these statuses consistently:

- **supported**: inspected evidence supports a specified claim under stated
  conditions. State confidence and limits; even one authoritative source may suffice
  for its own contract. This is not proof that the choice fits our system.
- **contested**: credible evidence supports competing outcomes or reveals different
  constraints. Explain the mechanism and tradeoff, then recommend within our scope.
- **unknown**: evidence is insufficient, ambiguous, inaccessible or not investigated.
- **not-found-in-surveyed-sources**: a bounded search found no instance. State the
  searched sources/paths/terms and exclusions. This does not establish global absence,
  novelty, lack of need or a market opportunity.

Source counts are coverage metadata, never a correctness threshold or automatic
"adopt" rule. Check common ancestry: forks, copied schemas, vendor SDKs, derivative
papers and shared libraries may trace to one decision. Agreement across genuinely
independent implementations strengthens transfer confidence only when constraints
match. A relevant counterexample can outweigh several superficial matches.

## 2. Assess claims, not prestige

Distinguish **observation** (what the source says/does), **inference** (what we think
explains it), and **recommendation** (what fits us). Pin citations and version/date.
An API proves its public contract, not internal persistence. A migration proves a
change occurred, not why it occurred; use its PR, issue, regression test or author
explanation for causal claims. Historical lessons can be valuable but remain
conditional on workload, jurisdiction, architecture and operational capacity.

Assess authority for the specific claim, directness, version freshness, reproducible
behavior, independent ancestry, applicable failure modes and contrary evidence.
Stars, downloads, age, company size and paper citations are discovery signals only.
Record adoption constraints separately: license/attribution, security, maintenance,
compatibility, operational burden and migration cost. Research eligibility is broader
than eligibility to copy, deploy or depend on a source.

## 3. Produce the scoped deliverable

For greenfield work, deliver a foundation: verdict (ADOPT / FORK / ADAPT-PATTERNS /
BUILD), alternatives, proposed contracts/schema where relevant, explicit invariants,
rejected patterns and reasons, the product's distinct core, and reuse obligations.
Do not force schema output for a UX, algorithm, AI evaluation or operations question.

For brownfield work, show verified current behavior and decision-level differences.
Use **FIX** when benefits justify change, **KEEP** for a deliberate fit, **ACCEPT** for
a known limitation whose migration cost exceeds benefit, and **INVESTIGATE** when
uncertainty blocks judgment. Include migration/rollback implications and testable
acceptance criteria. Do not invent strengths to satisfy a quota; report those observed.

For either mode, prioritize the smallest complete next phase. Convert material
findings into implementation consequences and verification: invariants, regression
cases, failure/retry tests, performance budgets, accessibility checks or AI evaluation
criteria. Each should trace to a decision and source; no test-writing requirement for
facts irrelevant to the authorized build. A research recommendation is not proof
that an implementation already satisfies it.

## 4. Deliver and preserve

Verify citations against opened sources and our actual code. Explain conflicts,
unknowns, incomplete coverage, budget stops and shallow-history limits. Never turn a
fingerprint/search hit into a defect without reading its use.

Save a refreshable decision record in the project's established knowledge workflow:
source receipt, scope/constraints, decision, alternatives, evidence status, confidence,
verification implications, owner if known, and review trigger (version change,
constraint change, incident or explicit review date). Preserve prior rationale and
link superseding decisions. Do not silently overwrite history or claim ingestion,
tests, deployment or completion without evidence.
