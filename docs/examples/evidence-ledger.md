# Evidence ledger: class waitlist promotion

Synthetic teaching record. Every product, repository, path and observation below is
fictional and was authored to show the linked tables. Nothing was retrieved, captured
or run. `record-lint.ts` reports it valid but incomplete (exit 2): Q3 is partial and two
obligations are open, which is the honest state of this research-only record.

## Decision first

- **Recommendation:** promote from the waitlist inside the same transaction that frees
  the seat, with a per-seat uniqueness constraint (D1).
- **Evidence:** a pinned scheduling implementation does exactly this and its
  regression test covers a double promotion (E2).
- **Limitation:** whether the closed incumbent notifies before or after the hold
  expires is unknown; its capture shows only the request order (E4, Q3).
- **Next check:** O1, a concurrent-cancellation integration test.

## Questions

| ID | Question | Needs | Status | Answer |
| --- | --- | --- | --- | --- |
| Q1 | How do mature systems avoid promoting two people into one freed seat? | Implementation + history | answered | D1 |
| Q2 | Should a promoted family get a hold window before the seat is charged? | Contract + incumbent behavior | answered | D2 |
| Q3 | Does the incumbent notify before or after the hold expires? | Incumbent runtime behavior | partial | E4 shows request order only |

## Evidence register

| ID | Family | Authority | Source / revision / locator | Status | Establishes |
| --- | --- | --- | --- | --- | --- |
| E1 | Implementation | source | example/scheduler@1a2b3c4, `app/waitlist/promote.rb:40` | read | Promotion runs in the cancellation transaction |
| E2 | Change history | history | example/scheduler PR 812 and its regression test | read | A double promotion occurred under concurrent cancels and was fixed with a unique index |
| E3 | Official API | contract | ExamplePay API v3 holds reference, retrieved 2026-10-01 | read | Authorization holds expire after a provider-defined window |
| E4 | Shipped product | observed-artifact | Own-account HAR of fictional ClassDesk, 2026-10-02, local digest only | read | Waitlist accept issues `POST /holds` before `POST /notifications` |
| E5 | Incident history | history | Query "waitlist double booked postmortem", two providers | searched-no-relevant-result | No public incident found in the surveyed sources |
| E6 | Standard | standard | Calendar recurrence standard, not relevant to promotion | not-applicable | Recurrence does not affect this decision |

## Decisions

| ID | Decision | Status | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| D1 | Promotion atomicity / T1 | supported | E1, E2 | Promote in the freeing transaction; unique (seat, active) constraint |
| D2 | Hold window before charge / T3 | supported | E3, E4 | Create a hold on promotion, charge on acceptance |
| D3 | Public double-booking incidents | not-found-in-surveyed-sources | E5 | No incident-driven requirement beyond D1 |

## Obligations

| ID | Decision | Invariant | Required authority | Check | Verified authority | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O1 | D1 | Two simultaneous cancellations promote two different people, never one person twice | integration | `test/waitlist/promote.test.ts#concurrent cancellations` | - | - | open |
| O2 | D2 | An expired hold returns the seat to the next person | end-to-end | Browser flow with a synthetic family | - | - | open |
| O3 | D3 | No separate incident replay | inspection | - | - | No incident to replay; covered by O1 | waived |

Q3 stays partial: E4 shows request order, not notification timing. Resolving it would
need a second observed session with a delayed acceptance, which this research did not do.
