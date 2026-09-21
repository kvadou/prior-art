# Local-first and decision-first comparative pilot

Status: development pilot executed; see [actual protocol and results](../evals/pilot-2026-09-20/README.md).
The original candidate tasks below describe the intended approach; the result record
identifies the three tasks actually run. No superiority or human-grade claim.

## Changes under test

- Search in this order where applicable: previous decisions and research, current
  code/tests, installed tools/integrations, package capabilities, public alternatives.
  Revalidate old evidence rather than blindly reusing it. Trivial edits may skip research.
- Lead reports with recommendation, strongest evidence, material limitation and next
  check, then the detail needed to assess those statements.
- Use repeated workarounds as a reason to investigate their cause and existing
  capabilities. Compare keeping the current approach against changing it, including
  human handoffs, maintenance, provider costs, migration and rollback effort.

## Controlled pilot

Use the [paired evaluation protocol](../evals/paired-evaluation.md). Compare no-skill, candidate0.5.0, search-first and prior-art-search with pinned
source revisions. Hold task/context, model/settings,
runtime, available tools, source snapshot and budgets equal. Only supplied skill instructions
change. Use fresh sessions and counterbalance run order. Retain complete output and
trace artifacts, including failures. Record costs as unknown when not measured.

Start with bounded public or synthetic cases:

1. A previous decision exists but its dependency version changed. Assess whether the
   run verifies current behavior before reusing it or searching for replacements.
2. A repeated manual workaround has both an installed capability and a public
   alternative. Assess whether the run identifies the local option and compares its
   actual operating cost with keeping the current approach.
3. A substantial choice has incomplete source access. Assess whether the run gives
   a concise useful recommendation while preserving the material limitation and
   smallest next check.

These cases informed the refinement, so label them development cases, not held-out
proof. Use a separately selected held-out task and repeated fresh runs before making
broader claims. A small pilot is diagnostic, not a statistically supported benchmark.
Have a human inspect citations, applicability, uncertainty, scope, and verification
consequences using the existing rubric. Record mismatched controls and missing pairs;
do not quietly discard them. Do not grade by keywords or reward a short report that
conceals essential uncertainty. No new accounts, purchases or external writes are
needed for this pilot.

## Private application review template

Keep completed reviews and private source artifacts in the application's authorized
private workspace. This public template contains no client names, internal paths,
credentials, account identifiers or private project facts. External searches must use
generic technical questions without copying private code or records.

- **Authorized outcome and boundaries:** the concrete decision, access allowed, and
  actions requiring separate authorization.
- **Current behavior:** relevant code/tests and previously recorded decisions; inspect
  dates, versions and constraints before relying on them.
- **Recurring workaround:** observed episodes, affected workflow, measurable human
  work and failure consequences; distinguish a symptom from its suspected cause.
- **Existing capability:** installed tools, configured integrations, package/API
  capabilities, actual account permissions and relevant operational limits.
- **Options:** keep current, fix within existing capability, or adopt/change; compare
  expected benefit, recurring human effort, maintenance, provider cost, migration and
  rollback. Mark unknowns explicitly.
- **Decision summary:** recommendation, strongest evidence, material limitation and
  next check. Separate observed behavior from inference and documented capability.
- **Private evidence:** exact local source references and authorized read-only proof
  results. No private details in a public research record or pilot manifest.
- **Acceptance and refresh:** smallest authorized verification, expected outcome,
  review trigger and decision owner when known. Research does not authorize deployment.

Any published summary must be independently checked for private data and must state
which findings were demonstrated, documented but untested, blocked or unknown.
