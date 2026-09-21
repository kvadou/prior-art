# Worked example: permissions review in an existing app

**Synthetic teaching report.** All code-like snippets, records and observations are
fictional fixtures contained here. No repository, database or penetration test was
inspected or executed. Findings apply to the stated fixtures, not to any real product.

## Run and question

Fictional app: Northstar Studio, a running owner/client project workspace. Task: review
a proposed documents feature without breaking the existing client review flow.
Brownfield, Standard profile. Illustrative method: Prior Art 0.4.0; runtime/model not
applicable because this is an authored example. External queries: zero. Four embedded
fixture reads, no measured execution time. A real survey would reserve at most 15
queries and six deep reads, including applicable platform authorization documentation.

Constraints: clients belong to accounts; documents are owner-private; published reviews
are client-visible. Knowing an object ID must not grant access. Owner access is a
verified role lookup, not an email domain suffix. No new client collaboration model
is authorized by the research task.

## Coverage and fixture evidence

| Family | Status | Locator | What it establishes |
| --- | --- | --- | --- |
| Existing policy | Embedded fixture read | [P1](#p1-existing-read-policy) | Over-broad visibility under the fictional policy |
| Proposed document flow | Embedded fixture read | [P2](#p2-document-flow) | UI filtering does not constrain direct reads |
| Existing review flow | Embedded fixture read | [P3](#p3-client-review-flow) | A separate publication boundary already exists |
| Concurrent edit contract | Embedded fixture read | [P4](#p4-edit-contract) | An unrelated lost-update risk |
| Platform docs and independent systems | Not retrieved | None | SQL/platform-specific guarantees remain unverified |

All fixtures share one author and revision set P-v1. They are not independent evidence.

### P1: existing read policy

Fixture pseudocode:

```text
can_read_document(user, document):
  return is_owner(user) OR has_active_membership(user, document.account_id)
```

Fixture records: document D belongs to account A and is marked owner-private.
Client C has an active membership in A and is not an owner.

Applying the predicate on paper returns true for C reading D. This is a logical
walkthrough of the fixture, not an executed database result.

### P2: document flow

The document page hides private rows in its component. The API accepts a document ID
and relies on P1 for authorization. A direct API read does not execute that component's
filter. The intended rule is owner-only access to both body and revision history.

### P3: client review flow

Reviews live in a separate collection. A client can read a review only if membership
is active, account matches and the review is published. The fixture has existing
clients who depend on this flow. Private documents are not published reviews.

### P4: edit contract

An owner loads revision 4. Another owner saves revision 5. The first owner's proposed
save supplies only document ID and body, without the revision it read.

## Decisions and order

1. **FIX document authorization, SUPPORTED within fixture.** P1 grants a client a
   private read; P2 proves component filtering is outside the direct-read path.
   Require owner authorization at the data boundary, including revision reads.
2. **KEEP the review publication boundary, SUPPORTED within fixture.** P3 already
   matches its separate audience. Do not revoke client reviews to fix document access.
3. **FIX stale document writes, SUPPORTED within fixture.** P4 cannot distinguish a
   stale update. Require expected version and reject mismatches without discarding
   the caller's unsaved text. This is a concurrency recommendation, not an auth fix.
4. **ACCEPT no document sharing in this phase.** Adding client-editable documents is
   outside scope. Demand for coauthoring would reopen this decision.

Platform-specific row policies, service-role bypasses and transaction isolation are
**UNKNOWN** until actual code, grants and platform contracts are read. No claim of
comprehensive security review is made.

## Implementation seams and proposed verification

Change the document/revision read policy and owner write endpoint, preserving IDs and
content. Add an expected-version field to saves. Rollout should audit current grants
and dependent callers before applying the policy; rollback must not restore a known
private-data exposure merely to hide an integration failure.

Proposed tests, **not executed**:

| Actor/action | Expected result |
| --- | --- |
| Anonymous direct document read | Denied |
| Client C reads D by known ID | Denied, including title/body/revisions |
| Active owner reads D | Allowed |
| Client C reads published review in A | Allowed |
| Client C reads unpublished review or review in B | Denied |
| Former member reads published review | Denied |
| Two owners save from version 4 | One advances; the stale write fails without overwrite |

## Reusable lesson and refresh

Pattern: preserve separate private-work and published-review audiences. UI visibility
is not data authorization. Carry the actor/resource/action matrix into each actual
endpoint and database path. Refresh when membership, publication, sharing or privileged
service clients change. Replace fictional evidence with pinned policy and test results
before applying these recommendations to a real application.
