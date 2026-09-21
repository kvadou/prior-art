# Development pilot: fixed evidence, four instruction conditions

Date:2026-09-20. Actual model runs on synthetic tasks, not invented outputs. This is
an exploratory instruction comparison, not a live research benchmark or effectiveness
claim. All twelve completed; human review and statistical analysis were not performed.

## Decision first

Recommendation: retain the concise local-first workflow but make no superiority claim.
All four conditions reused the existing helper, deferred unavailable API sharing and
returned the exact typo correction. A capable no-skill baseline reached these same
basic decisions. The most useful result was a weakness in our own output: unsupported
assumptions about a blog's account tier and an invented longer availability window.
The final skill adds an explicit guard against those inferences; that follow-up change
is not represented by these original twelve runs.

## Protocol and evidence

- Model: CLI-reported claude-opus-5[1m], canonical claude-opus-5; medium effort.
- Fresh Claude CLI process per task/condition, custom common system instruction,
  settings sources empty, hooks disabled, no session persistence, tools empty,
  skills disabled, no MCP servers. Task evidence identical per condition.
- Only the top-level SKILL.md instruction text was injected. References, helper tools,
  web search, live repository discovery and automatic skill routing were unavailable.
- Three handpicked development tasks aligned with these changes; one run per cell,
  no held-out task and no repetition. Rotate condition order across tasks.
- User tasks already request the desired evidence/limitations and constrain the answer.
  This is not an unbiased estimate of added skill value on ambiguous real tasks.
- Maximum $0.50 per session and90second process timeout. Costs below are the CLI's
  observed list-price estimates, not an invoice or measured subscription charge.
- Raw answers and hashes: [runs.json](runs.json). Exact supplied tasks:
  [tasks.json](tasks.json). Our actual input before feedback:
  [candidate-instructions.md](candidate-instructions.md).
- External sources read as text, never executed:
  [search-first](https://github.com/shimo4228/search-first/blob/cf3974d1c5c870cdcc29102e7954463745aba7b0/skills/search-first/SKILL.md)
  and [prior-art-search](https://github.com/yjhqwer/yjh-discipline/blob/cc90407a72c60cb44a4ac2ea6d930c43197bacf7/skills/prior-art-search/SKILL.md).

## Observed resource use

| Condition | Completed sessions | CLI cost estimate | Sum wall time |
| --- | --- | --- | --- |
| none | 3 | $0.0442 | 21.32s |
| prior-art | 3 | $0.0882 | 23.60s |
| search-first | 3 | $0.0694 | 21.12s |
| prior-art-search | 3 | $0.0737 | 23.95s |

Longer instruction inputs cost more in this sample. Shared provider caches, session
startup, output length and stochastic timing limit comparisons. Do not rank products
by these twelve observations or treat them as total operating cost.

## Qualitative observations, agent-reviewed, not human grades

- Existing helper: all conditions selected it and recognized Node26 incompatibility
  and incomplete registry coverage. No incremental outcome advantage demonstrated.
- Manual sharing: all deferred the unavailable API path and suggested local tracking.
  Our answer called a paid-tier assumption “almost certainly” true despite no such
  evidence, and extended no approval “today” into “this week.” Other arms also guessed
  the blog's tier; search-first said keeping the process costs nothing despite
  recurring human work. These are specific output weaknesses, not overall rankings.
- Typo: all four answered only “Save changes.” With tools disabled, this demonstrates
  response restraint, not proof that installed skills route correctly in a normal app.
- Suggested local instrumentation is proposed future work, not evidence of completed
  implementation or authorization to record actual client data.

Next: independent human review, repeated held-out tasks, live tool-enabled research,
and controlled automatic-routing tests in both host applications. Preserve failed
and unmatched runs. No weighted score or winner is inferred here.

## Separate installed-skill routing smoke

Two additional fresh Claude Code2.1.278 sessions allowed only Read and Skill tools,
loaded this repository as a plugin, disabled hooks/MCP, and used the same model and
effort. The common system prompt explicitly encouraged relevant skill use for
substantial research and skipping trivial edits. This is a positive/negative smoke
with routing guidance, not an unprompted adoption-rate test.

- [Substantial task](activation-substantial.json): invoked prior-art:prior-art, then
  four Read calls; final answer disclosed missing external and local evidence.
- [Typo](activation-trivial.json): no tool calls, exact corrected label.

One observation per case, Claude CLI only. Codex installation shares the source,
but Codex automatic routing was not exercised. No deployment or app mutation.

## Follow-up after observed inference errors

One additional same-task run used [tightened instructions](followup-instructions.md);
its [actual response](followup-manual-share.json) kept the time boundary at today and
labeled the proposed experiment unauthorized to execute. It still misclassified an
unverified blog as NOT FOUND IN SURVEY, and overstated the untested tracker's immediate
benefit. This is not a completed behavioral fix or an independent held-out result.
Do not conceal those remaining errors or include this selected rerun in original-arm
aggregates. More instruction text alone has not solved inference discipline.

A simple whitespace word count also found6of8 nontrivial original responses exceeded
the requested250words (252-264); both our nontrivial responses did. This descriptive
formatting check is not an answer-quality grade. The concise format needs real-world
validation rather than a claim that the word limit was enforced.

The three-pair [no-skill versus candidate manifest](paired-manifest.json) validates
with zero mismatches and all three awaiting human review. Its synthetic=false flag
means these are actual model runs; the task evidence is still fictional. No human
scores have been fabricated.
