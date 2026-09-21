# Paired human evaluation

This protocol compares a baseline skill revision with a candidate. The reporter
validates bookkeeping and computes differences between supplied human scores. It
does not run agents, check artifacts or citations, grade text, or establish that a
candidate is better. Offline tooling tests and behavioral evaluations are separate.

## Run a comparison

1. Choose a small task set from [research scenarios](research-scenarios.md), plus
   realistic tasks held out from editing and tuning the candidate. Keep the held-out
   set unchanged until the candidate is ready. Disclose which tasks influenced its
   design. Publish failures as well as successes.
2. Fix the exact user task, project context, model version and settings, runtime,
   available tools and their versions, source fixture/snapshot, and budgets for both
   arms. Vary only the skill revision. Run in fresh sessions without shared history.
   Counterbalance baseline/candidate execution order to reduce ordering effects.
   If live source or provider conditions differ, record the difference and classify
   the pair as unmatched rather than attributing it to the skill.
3. Repeat each task with independent fresh sessions. Use distinct pair IDs such as
   `approval-flow-repetition-1`. Pair repetition 1 with repetition 1, not whichever
   baseline produces the most favorable comparison. Record missing or failed runs
   explicitly. A missing run is `null`; an observed failure is an existing run with
   its output and a human assessment of the actual failure.
4. Retain the complete output and evidence trace for each run. Use immutable
   artifact references or content hashes, with a manifest entry for every intended
   pair. Record known cost and elapsed time; use `null` for unmeasured quantities.
   Never substitute zero for an absent measurement. Define whether costs include
   tool/provider charges and what elapsed time includes, consistently across arms.
5. Have a human review both outputs against the rubric below, preferably blind to
   which skill revision produced them. Use a consistent reviewer, or calibrated
   reviewers; resolve disagreements in written notes and retain original reviews
   outside the manifest. Cite specific output passages and independently checked
   source locations. Do not grade by keywords, citation count, or narrative polish.
6. Validate and report the manifest. Investigate condition mismatches, missing pairs,
   and unreviewed pairs before interpreting complete pairs. Preserve the original
   manifest alongside its report. The output includes the reviews so readers can
   inspect their evidence, not just the arithmetic.

For a with-skill versus without-skill comparison, use `baseline_revision: "no-skill"`
and an immutable candidate commit. Record that the baseline session did not load the
skill, including automatic discovery. Hold all other instructions and context fixed.
Do not label a session without the invocation as a control if the skill was still
automatically loaded. This protocol also supports old-versus-new skill revisions.

## Manifest and commands

Requires a Node runtime with native TypeScript support, Node 22.18+ or 24+.
No package installation or network access is needed.

```sh
node --test skills/prior-art/bin/eval-report.test.ts
node skills/prior-art/bin/eval-report.ts docs/evals/synthetic-manifest.json
node skills/prior-art/bin/eval-report.ts --help
```

[The sample manifest](synthetic-manifest.json) is entirely synthetic. Its revisions,
outputs, hash, judgments and scores are invented fixtures for demonstrating the
reporter. **It is not an agent benchmark or evidence of improvement.** Copy its shape
for a real evaluation, replace every placeholder, and set `synthetic` to `false` only
when it describes actual runs. The flag is a declaration, not verified provenance.

The schema requires:

- `schema_version: 1`, `synthetic`, distinct `baseline_revision` and
  `candidate_revision`, and 1 to 100 `pairs` with unique IDs.
- A task description per pair and `baseline`/`candidate` run objects, or explicit
  `null` for each missing side. Revision strings must match the top-level revisions.
- Each run's `output` artifact reference and `conditions`: `task_sha256` (lowercase
  SHA-256 of the exact task and supplied context), `model` (version and generation
  settings), `runtime`, `tools` (unique versioned identifiers), `source_snapshot`
  (immutable fixture ID or pinned source bundle), and `budget` (same resource limits
  and accounting definition). Source *availability* is fixed; which sources a run
  chooses to inspect is part of its behavior.
- `cost_usd` and `elapsed_seconds`, each a nonnegative number or explicit `null`.
- `human_review: null` when ungraded. Otherwise: `reviewer`, `evidence`, `notes`,
  and all seven integer dimension scores. Evidence and notes must be nonempty.

Condition strings compare exactly; tool lists compare as sets. Differing conditions
suppress score and measurement deltas. The tool does not verify that hashes match
artifacts or that the declared conditions were followed. A complete equal-condition
pair without two human reviews is `awaiting_human_review`. Absent sides are
`missing_pair`, not a zero score. Unknown cost/time produces a `null` delta.

Files over 2 MB, unknown fields, missing required values, duplicate IDs, invalid
scores, and negative or nonfinite metrics fail validation with exit status 1.
Valid incomplete manifests exit 0 and report incompleteness explicitly. Artifact
paths and URLs are never opened or executed by the reporter.

## Human rubric

Use 0 = unsupported or materially fails the criterion, 1 = mixed/partial evidence,
and 2 = meets the criterion with specific evidence. If the reviewer cannot assess
all dimensions, leave the whole review `null` pending investigation rather than
inventing values. Each score needs a rationale and traceable evidence in the review.

| Dimension key | What the reviewer checks |
| --- | --- |
| `applicable_evidence` | Sources address the actual product, workload, version and constraints; adoption consequences fit those constraints. |
| `citation_verification` | Reviewer opens the cited primary evidence and confirms the relevant claim, revision and source location. |
| `uncertainty` | Observation, inference and unknowns are distinguished; empty search is not treated as proof of absence. |
| `source_independence` | Forks, shared ancestry and derivative accounts are recognized; apparent agreement is not inflated. |
| `budget_compliance` | Recorded tool calls, time and other declared limits are respected; exceptions are disclosed. |
| `scope_preservation` | The task's boundaries, authorization and supplied context are preserved; no unauthorized execution or changes occur. |
| `verification_consequences` | Findings produce concrete, relevant verification or acceptance checks, with unresolved risks identified. |

Report per-dimension results, failures, unmatched/missing rates, and known versus
unknown costs. The reporter intentionally supplies no weighted overall score or
winner. A higher score on a few tuned examples is not general improvement. Small
samples, correlated tasks, stochastic runs, subjective judgments, unequal reviewer
strictness, and changing sources limit interpretation. Repetitions of one task do
not equal independent task coverage. Any broader claim needs adequate held-out task
coverage and a separately justified statistical analysis.
