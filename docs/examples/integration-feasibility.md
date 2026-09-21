# Worked example: can an approval app integrate with a delivery provider?

**Synthetic teaching report.** “Parcel Relay” is a fictional provider. Its contract and
failure cases are invented below. They describe no real API, service reliability or
vendor recommendation. No request was sent and no SDK was executed.

## Run and decision boundary

Task: determine whether a fictional approval app can request a notification after an
owner publishes a review, with recoverable failures and no automatic duplicate sends.
Greenfield integration, Standard profile, illustrative Prior Art 0.4.0 method.
Runtime/model: not applicable (authored example). Actual external queries: zero; three
embedded fixtures read; elapsed tool time not measured. A real survey budget would
allow 15 queries and six deep reads, emphasizing provider contracts and failure history.

Constraints: publication must succeed independently of delivery; acceptance is not
proof of recipient delivery; ambiguous requests must not be blindly retried. Expected
volume is small enough for a single worker. Internal provider storage is unknown.

## Coverage ledger

| Family | Status | Locator | Limits |
| --- | --- | --- | --- |
| API contract | Embedded fixture read | [I1](#i1-fictional-api-contract) | Fictional contract, not verified vendor behavior |
| Local workflow | Embedded fixture read | [I2](#i2-app-workflow) | Authored requirements |
| Failure scenarios | Embedded fixture read | [I3](#i3-failure-cases) | Proposed fault cases, not incident history |
| SDK/source history, real outage reports, pricing | Not retrieved | None | Operational feasibility and actual costs unknown |

These fixtures are one authored evidence family. Three fixtures do not establish
industry consensus or independent corroboration.

### I1: fictional API contract

Contract revision relay-contract-v1:

```text
POST /notifications
Authorization: Bearer <key>
Idempotency-Key: <operation-key>
Body: recipient, subject, text

202 { "acceptance_id": "..." } means accepted for processing, not delivered.
Replaying an identical key+payload for 12 hours returns the original acceptance.
After 12 hours the provider may treat the key as a new operation.
400 means rejected before enqueueing.
5xx or a lost response does not specify whether enqueueing occurred.
GET /notifications/by-key is not offered by this contract.
```

This contract says nothing about internal locking, durable storage, email delivery
semantics or rate limits. Inferring any of those would exceed the fixture.

### I2: app workflow

Fixture revision app-flow-v1: publishing freezes a review revision. An owner then
explicitly requests notification to an approved recipient. The app stores a delivery
row containing the frozen recipient, payload and operation key. A worker may crash
between the provider request and persisting its result.

### I3: failure cases

Fixture revision failures-v1:

- F1: a known 400 rejection arrives before acceptance.
- F2: a request reaches the provider, but the response connection disappears.
- F3: acceptance arrives; the worker crashes before saving it.
- F4: an operator reruns F2 after 13 hours.

No frequency or production impact is asserted for these authored cases.

## Feasibility result

**Conditionally feasible under the fictional contract.** Explicit requests and a small
outbox can separate publishing from delivery. Guaranteed automatic recovery from every
ambiguous outcome is **UNKNOWN / unsupported** by I1. A requirement for unattended,
exactly-once delivery after arbitrary outages would make this contract insufficient.

| Decision | Evidence status | Reason and consequence |
| --- | --- | --- |
| Separate publish and notify | SUPPORTED within fixture | I2 allows publishing to survive provider failure |
| Freeze payload and key per attempt | SUPPORTED within fixture | I1's replay guarantee requires identical key and payload |
| Record acceptance separately from delivery | SUPPORTED within fixture | I1 explicitly distinguishes them |
| Quarantine ambiguous sends | SUPPORTED within fixture | F2/F3 can have accepted messages without local confirmation |
| Reject blind delayed retry | SUPPORTED within fixture | F4 exceeds I1's 12-hour window and may enqueue twice |

Alternative: synchronous notification inside the publish request is simpler, but
couples publishing availability to the provider. Alternative: a different provider
with a verified reconciliation API might reduce manual review; no such provider has
been researched here. Building a transport service from scratch is not justified.

## Practical feasibility checklist

Verdict: **documented but untested within the fictional contract**. Actual provider
feasibility remains **unknown**. Evidence is the embedded I-v1 fixture set, authored
2026-09-20; this date is not a real provider retrieval or sandbox test date.

| Check | Fixture evidence and remaining limitation |
| --- | --- |
| Eligibility / plan | I1 names no account tier, region or environment entitlement. All are unknown; do not assume a free plan supports the API. |
| Interface | I1 defines a Bearer-authenticated HTTP endpoint, not an SDK or supported runtime matrix. Compatibility is untested. |
| Permissions | I2 requires an owner-authorized recipient. Provider token scopes and who may provision a token are unknown. |
| Human effort | An owner requests each send; F2/F3 require reconciliation. Initial provisioning and operator time have not been measured. |
| Cost | No price source or usage allowance exists in these fixtures. Total cost is unknown, not zero. |
| Lifecycle | I1 bounds replay to 12 hours; F2/F3 lack a lookup guarantee. Revocation, export and provider replacement remain unverified. |
| Smallest proof | Proposed: integration owner uses an authorized isolated account and synthetic recipient to publish, explicitly queue one notification, observe acceptance, then inject a lost response. Expected: publish survives and ambiguity stops retries. Observed: no execution. |

Eligibility, permissions and cost must be resolved before committing to adoption.
Keep delivery behind an adapter while those dependencies remain unproven. Running the
proof requires separate authorization for any account creation or external message.

## Implementation seams and proposed checks

Store `queued`, `sending`, `accepted`, `failed` and `unknown` states beside the immutable
request snapshot. Claim one row atomically. Store the acceptance ID after success.
Expired worker leases become unknown instead of automatically becoming queued. Owner
permission is checked when requesting delivery; privileged worker access is scoped.

Proposed checks, **not executed**:

1. Publishing succeeds with provider unavailable; no send occurs before owner request.
2. Two workers compete for one row; only one receives a claim.
3. Inject F1; record a definite failure eligible for deliberate correction/retry.
4. Inject F2 and F3; record or reconcile unknown, with no automatic second request.
5. Advance the fixture clock to F4; do not send again merely because a key exists.
6. Verify `202` UI says accepted, never delivered.

## Reusable pattern and refresh

Pattern: durable explicit delivery with conservative ambiguity handling. Applicable
when duplicate external writes cost more than delayed manual reconciliation. It does
not guarantee exactly-once delivery. Refresh if a real provider's retention window,
lookup API, error semantics, workload or recovery requirement changes. Real adoption
requires official versioned contracts, bounded sandbox verification and a documented
operator reconciliation path, none of which this fictional example supplies.
