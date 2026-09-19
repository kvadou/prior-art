# The irreversible decisions

Rank architectural findings by **cost to reverse** while tracking safety, security
and user impact separately. Reversal costs below are illustrative, not fixed:
a public API, index migration or validation rule can become expensive at scale.
Use this checklist to generate questions, not to predeclare the answers.

## Reversal cost tiers

| Tier | Cost to reverse once live | Examples |
|---|---|---|
| **T1: Rewrite** | Months. Touches every table and every query. | tenancy boundary, identity model, money representation, time/versioning model |
| **T2: Migration** | Weeks. Backfill + dual-write + cutover. | soft vs hard delete, status as enum vs state table, audit strategy, ID type |
| **T3: Refactor** | Days. Contained in one layer. | auth library, job queue, API shape, caching |
| **T4: Edit** | Hours. | indexes, validation, error messages, most UI |

Research depth should follow decision uncertainty, impact and reversal cost. T1/T2
usually warrant deeper evidence; a bounded T3/T4 lookup can still prevent a costly
security, accessibility, compatibility or operational mistake. Do not restrict
research to GitHub or exclude relevant UX, AI or standards evidence.

---

## T1 decision candidates: investigate when applicable

### 1. Tenancy boundary
**Question:** what is the unit of isolation, and can one record ever belong to two of them?

Common options include single-tenant, row-level isolation, schema-per-tenant,
database-per-tenant and hybrids. Determine which boundaries actually apply.

- **The expensive mistake:** assuming future isolation requirements without deciding
  what is shared. Single tenancy can be the correct explicit scope; adding isolation
  later may require queries, indexes, caches and fixtures to change.
- **Check prior art for:** direct versus inherited tenant ownership, cross-tenant
  foreign-key constraints, scoped queries and RLS. Trace enforcement and bypass paths;
  a tenant column alone proves neither isolation nor its necessity on every table.
- **The subtle one:** cross-tenant objects. A shared curriculum, a franchise-wide
  template, a global user who belongs to 3 orgs. Ask early: what is shared, and who
  owns the shared thing?

### 2. Identity model
**Question:** is a person the same thing as a login?

Test whether humans without logins, multiple credentials, multiple roles or external
identities exist in scope. For example, a student may have no login and a parent may
manage three students. Do not require extra identity entities without a real use case.

- **The expensive mistake:** `User` as the only person-like table, with role as a
  column. Works until someone needs two roles, or a person needs to exist before
  they can log in.
- **Candidate pattern:** separate `Person`/`Contact`, `User`/`Account` and
  `Membership`/`Role` where their lifecycles differ. Verify each source and our needs;
  maturity does not imply a universal three-table design.
- **Check prior art for:** invitation flow, merge-duplicate-person flow, and what
  happens when someone is deactivated. Those three reveal the real model.

### 3. Money representation
**Question:** integer minor units, or decimal?

- Inspect exact decimal or integer-minor-unit representations, arithmetic, rounding
  and serialization end to end. A Float/Double search hit is a lead, not a verified
  defect; determine whether it participates in authoritative monetary calculations.
- Choose scale, bounds and intermediate precision for the actual currencies and
  operations. Neither cents nor a fixed DECIMAL(19,4) scale is universally adequate.
- **Also T1 and usually missed:** currency is part of the amount, not a setting.
  If there is any chance of a second currency (Singapore, Hong Kong, Dubai), the
  column is `(amount, currency)` from day one.
- **Check prior art for:** how they handle proration, refunds, and rounding. Those
  three are where the representation actually bites.

### 4. Time and versioning
**Question:** do you need to know what was true on a past date?

Historical reconstruction requirements can make this expensive to change later.

- If a price, a curriculum, a territory, a rate, or an agreement can change and you
  need to reproduce an old invoice, report or state, identify what must be preserved
  and whether effective dates, snapshots, versions or event history satisfy that need.
- **The expensive mistake:** updating the row in place. The old value is gone and
  every historical report silently changes.
- **Candidate patterns:** immutable document snapshots, effective-dated versions,
  audit trails, or events with projections. These solve different reconstruction
  questions and carry different consistency and operational costs.
- Do not prescribe append-only storage as a free default. Test retention, correction,
  privacy deletion, historical joins and concurrency requirements first.

### 5. Timezone and date semantics
**Question:** is this an instant, or a calendar date?

- Represent instants unambiguously, for example with timestamptz in PostgreSQL;
  preserve timezone information separately where local-time rules require it.
- Calendar dates (due dates or payroll periods) differ from instants. Choose a
  date representation and verify serialization across timezones; scheduling may
  require local time plus an IANA zone and explicit DST ambiguity handling.
- Multi-region operation can increase reversal cost; assess the actual dependency graph.

---

## T2 decisions: get these from prior art when cheap

### 6. Delete semantics
Compare hard deletion, soft deletion, voiding and archival against retention,
privacy, correction and restoration requirements. No universal default applies.
For soft deletion, inspect uniqueness, related records and query visibility; for
hard deletion, inspect audit and retention obligations.

### 7. Status modeling
A `status` enum column is fine until you need to know *when* it changed, *who*
changed it, and what is legal next. Inspect transition enforcement and history,
which need not require a transitions table. Ask whether elapsed-state reporting,
concurrent transitions or backward corrections are required.

### 8. Audit trail
For sensitive or consequential changes, investigate actor identity, before/after
state, tamper resistance, retention, authorized correction and privacy obligations.
Verify atomic coupling of authoritative changes and required audit evidence; a
transactional log or outbox may apply. Two attribution columns are not a full history.

### 9. ID strategy
Compare database locality, distributed generation, timestamp/volume leakage, public
lookup requirements and migration costs. Sequential IDs, random IDs, sortable IDs
and separate public IDs have different tradeoffs. IDs never replace authorization;
sortable IDs can disclose time. Verify implementation-specific performance claims.

### 10. Idempotency
For retriable external writes, inspect the operation identity, durable deduplication,
key scope/lifetime, changed-payload behavior and crash/concurrency boundaries.
Provider keys, unique constraints, outboxes or claims may be appropriate; no one
mechanism alone guarantees end-to-end exactly-once effects.

---

## Category-specific hypotheses to investigate

Use these as candidate decision rows, not established convergences or mandatory
schemas. Verify applicable claims against implementations, contracts and other
relevant evidence; do not infer database tables from API resources.

**LMS / education**
- `Course` (the catalog thing) vs `Offering`/`Section` (the scheduled instance) vs
  `Enrollment` (a person in an instance). Check whether their lifecycles differ.
- Curriculum is versioned; a learner is pinned to the version they started.
- Progress is per-`(enrollment, content_item)`, not per-`(user, course)`.
- Grades and completion are separate concepts with separate rules.

**CRM / sales**
- `Contact` (person) vs `Account` (org) vs `Deal`/`Opportunity`, with activity
  polymorphic across all three.
- Configurable pipeline stages may need data-driven definitions; fixed workflows may not.

**ATS / hiring**
- `Candidate` vs `Application`: one candidate, many applications, and the stage
  lives on the application.
- Requisition is distinct from job posting.

**Billing / subscriptions**
- Historical invoice lines must remain reproducible after price changes; inspect snapshots or version references.
- Subscription, service period and invoice may have distinct lifecycles; table count is implementation-specific.

**Scheduling / operations**
- Recurrence rule vs generated occurrence vs exception/override. Investigate cancellation,
  moved occurrences and DST rules rather than assuming the happy path covers them.

**Multi-location / franchise**
- Territory, location, and legal entity are three different things.
- Royalty/fee calculations require preserved rates and rules to reproduce prior
  statements; investigate effective dates, versions or immutable calculation snapshots.

---

## How to use this file

1. During intake, retrieve known scope and constraints. Ask only material unanswered
   questions; never repeat questions already resolved in the session.
2. During deep reads, instruct subagents to answer how each finalist resolved the
   relevant decisions, with pinned citations and explicit evidence limits.
3. During primary-agent synthesis, use relevant decisions as matrix rows. Evidence
   is supported, contested, unknown or not-found-in-surveyed-sources; counts are not proof.
4. In brownfield mode, every divergence gets a tier label, and the report is
   ordered by tier. A T1 divergence is the headline; a T4 divergence is a footnote.
