# Contributor release plan

Ship 0.4.0 without changing the search CLI contracts.

1. Add a lightweight feasibility checkpoint to the existing workflow, with optional
   detail in a reference. Distinguish documented availability from a tested workflow.
2. Add paired evaluation records and a dependency-free validator/reporter. Compare
   matched conditions and human-reviewed outcomes; synthetic fixtures are not evidence
   that the skill improves model performance. Missing costs remain unknown.
3. Provide three synthetic worked examples and reproducible contribution templates.
4. Run offline tests in CI, check shell syntax, update version and release notes.
5. Independently review tooling and claims, run tests locally, then push main.

Evaluation contract: `node skills/prior-art/bin/eval-report.ts <manifest.json>`
validates recorded observations and reports paired outcomes. It never executes an
agent, grades prose by keywords, or claims a statistical result from sample data.

Validation: existing search tests, evaluation tests, all shell launchers via bash -n,
optional local Claude plugin validation, git diff --check, and independent review.
No live provider calls or credentials are required for CI. Social posts are drafts.
