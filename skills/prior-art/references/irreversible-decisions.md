# The irreversible decisions

Rank every finding by **cost to reverse**, not by severity. A missing index is a
five-minute fix. A wrong tenancy boundary is a rewrite. Experienced builders do not
need to be told about indexes; they need the expensive things surfaced while they
are still cheap.

## Reversal cost tiers

| Tier | Cost to reverse once live | Examples |
|---|---|---|
| **T1: Rewrite** | Months. Touches every table and every query. | tenancy boundary, identity model, money representation, time/versioning model |
| **T2: Migration** | Weeks. Backfill + dual-write + cutover. | soft vs hard delete, status as enum vs state table, audit strategy, ID type |
| **T3: Refactor** | Days. Contained in one layer. | auth library, job queue, API shape, caching |
| **T4: Edit** | Hours. | indexes, validation, error messages, most UI |

Prior art is worth the most at T1 and T2. Below that, just build it, surveying
GitHub to pick a job queue is procrastination.

---

## T1 decisions: get these from prior art, always

### 1. Tenancy boundary
**Question:** what is the unit of isolation, and can one record ever belong to two of them?

The answer is one of: single-tenant, row-level (`tenant_id` on every table),
schema-per-tenant, or database-per-tenant. Each is a different application.

- **The expensive mistake:** starting single-tenant "for now." Every query, every
  index, every cache key, and every test fixture has to be revisited later.
- **The tell in prior art:** look for whether `tenant_id` is on *every* table or only
  the top-level ones. Projects that learned the hard way put it on every table
  including join tables, and enforce it in a base query layer or RLS policy.
- **The subtle one:** cross-tenant objects. A shared curriculum, a franchise-wide
  template, a global user who belongs to 3 orgs. Ask early: what is shared, and who
  owns the shared thing?

### 2. Identity model
**Question:** is a person the same thing as a login?

Almost always no, and almost every from-scratch build conflates them.
A student has no login. A parent has one login and three students. A coach is a
user in one org and a contact in another. An employee becomes a customer.

- **The expensive mistake:** `User` as the only person-like table, with role as a
  column. Works until someone needs two roles, or a person needs to exist before
  they can log in.
- **The convergent pattern:** separate `Person`/`Contact` (the human) from
  `User`/`Account` (the credential) from `Membership`/`Role` (the relationship to an
  org). Mature systems have all three.
- **Check prior art for:** invitation flow, merge-duplicate-person flow, and what
  happens when someone is deactivated. Those three reveal the real model.

### 3. Money representation
**Question:** integer minor units, or decimal?

- **Never floats.** If the fingerprint shows `Float`/`Double` on a price column, that
  is a finding regardless of what else is true.
- Integer cents is the common convergence; `DECIMAL(19,4)` is the other defensible
  answer and is better if you do tax/proration math or multi-currency.
- **Also T1 and usually missed:** currency is part of the amount, not a setting.
  If there is any chance of a second currency (Singapore, Hong Kong, Dubai), the
  column is `(amount, currency)` from day one.
- **Check prior art for:** how they handle proration, refunds, and rounding. Those
  three are where the representation actually bites.

### 4. Time and versioning
**Question:** do you need to know what was true on a past date?

This is the single most-underestimated T1 decision.

- If a price, a curriculum, a territory, a rate, or an agreement can change and you
  will ever need to reproduce an old invoice, report, or state, you need
  **effective dating** (`valid_from`/`valid_until`) or versioned rows, not mutation.
- **The expensive mistake:** updating the row in place. The old value is gone and
  every historical report silently changes.
- **The convergent pattern:** immutable versions + a pointer to current, or
  append-only events with a projection. Mature LMS/billing/HR systems all have one.
- **Cheap escape hatch:** if you are truly unsure, make the table append-only now.
  It costs one column today and saves a rewrite later.

### 5. Timezone and date semantics
**Question:** is this an instant, or a calendar date?

- Instants (`created_at`) are UTC timestamptz, always.
- Calendar dates (a class date, a due date, a payroll period) are **not** instants and
  must not be stored as timestamps, that is the off-by-one-day bug, permanently.
- Multi-region (US + Singapore + Dubai) makes this T1 instead of T2.

---

## T2 decisions: get these from prior art when cheap

### 6. Delete semantics
Hard delete, soft delete, or archive-to-cold-table. Soft delete is the default
answer but it is not free: every query needs the filter, and uniqueness constraints
break (two "deleted" rows with the same email). Check how prior art handles the
unique-constraint problem, that is the tell for whether they actually run it.

### 7. Status modeling
A `status` enum column is fine until you need to know *when* it changed, *who*
changed it, and what is legal next. Mature systems have a transitions table or an
explicit state machine. Ask: will anyone ever ask "how long was it in review?"

### 8. Audit trail
`created_by`/`updated_by` is the minimum. Anything touching money, compliance,
child safety, or employment needs a real append-only audit log, and it needs to be
written in the same transaction as the change.

### 9. ID strategy
Sequential integers leak volume and enumerate. UUIDv4 fragments indexes. The current
convergence is UUIDv7 / ULID (sortable, non-enumerable) or a prefixed external ID
(`cus_...`) over an internal integer. Cheap to choose now, annoying later.

### 10. Idempotency
Any external write (payment, email, provisioning, webhook consumption) needs an
idempotency key and a claimed-row pattern. Retrofitting this after the first
double-charge is painful and public.

---

## Category-specific convergences to look for

Use these as the starting rows of the convergence matrix. Do not assume they are
true, verify each against the actual finalist schemas.

**LMS / education**
- `Course` (the catalog thing) vs `Offering`/`Section` (the scheduled instance) vs
  `Enrollment` (a person in an instance). Collapsing these is the #1 LMS mistake.
- Curriculum is versioned; a learner is pinned to the version they started.
- Progress is per-`(enrollment, content_item)`, not per-`(user, course)`.
- Grades and completion are separate concepts with separate rules.

**CRM / sales**
- `Contact` (person) vs `Account` (org) vs `Deal`/`Opportunity`, with activity
  polymorphic across all three.
- Pipeline stages are data, not an enum.

**ATS / hiring**
- `Candidate` vs `Application`: one candidate, many applications, and the stage
  lives on the application.
- Requisition is distinct from job posting.

**Billing / subscriptions**
- Invoice lines are immutable snapshots, never joins to live prices.
- Subscription vs subscription-period vs invoice are three tables.

**Scheduling / operations**
- Recurrence rule vs generated occurrence vs exception/override. Everyone
  under-models the exception, and exceptions are most of real life.

**Multi-location / franchise**
- Territory, location, and legal entity are three different things.
- Royalty/fee calculation must be effective-dated (see T1 #4) or you cannot
  reproduce last year's statements.

---

## How to use this file

1. During intake, ask only the T1 questions that apply. Five good questions beat
   twenty generic ones.
2. During deep reads, instruct subagents to answer how each finalist resolved the
   relevant T1/T2 decisions, with file citations.
3. During synthesis, the convergence matrix rows ARE these decisions.
4. In brownfield mode, every divergence gets a tier label, and the report is
   ordered by tier. A T1 divergence is the headline; a T4 divergence is a footnote.
