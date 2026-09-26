# Outcome-review development pilot, September 26, 2026

## Recommendation

Retain the compact feedback loop, but make no performance-superiority claim. Six
actual Claude responses on three fictional fixed-evidence tasks produced similar
main decisions under 0.6.0 and 0.7.0. Both arms still had important reasoning gaps.
These are instruction-response checks, not live discovery, browser work, user studies,
a Claude-versus-Codex benchmark, or proof of generalization.

## Evidence and controls

- [Tasks and prewritten checks](tasks.json) were independently authored by a fresh
  agent that read the baseline/protocol, without candidate edits or the CRM transcript.
  The author received the three task categories and the evaluation purpose. This is
  a development test, not a blinded independent held-out benchmark.
- Frozen [baseline](baseline-instructions.md) and [candidate](candidate-instructions.md)
  bundle the entrypoint and relevant references. Candidate includes its new outcome
  reference. References were eagerly supplied, so progressive loading/routing was not
  measured. Baseline revision 0933f1449927fbbbfca7e9ddbc0049f03c640dcc; candidate identity
  is its bundle SHA in the [manifest](paired-manifest.json).
- Exact common system preamble: `You are evaluating a research instruction bundle. Use only the supplied fictional evidence. No tools exist. Return a useful concise answer, at most 550 words. Do not claim execution.` followed by two newlines and the bundle.
- Fresh Claude CLI process for each response, same task text, medium effort,
  default model selection. All six reported `claude-opus-5-5`. Claude Code 2.1.283,
  Node 25.9.0. Order: baseline/candidate, candidate/baseline, baseline/candidate.
- Flags used: `-p --output-format json --tools "" --strict-mcp-config --mcp-config '{"mcpServers":{}}' --disable-slash-commands --setting-sources "" --settings '{"disableAllHooks":true}' --no-session-persistence --effort medium --max-budget-usd 0.50 --system-prompt <preamble+bundle>`. Task supplied on stdin.
- Tools/skills/MCP/hooks were disabled. Sessions used a fixed temporary directory.
  Exclusion of all ambient CLAUDE.md/auto-memory content was **not verified**. Conditions
  are declared equal in the manifest; actual isolation is not established by it.
- Each process had a 90-second SIGTERM timer, not an enforced hard deadline. All exited
  successfully before it. The 550-word target was guidance, not a validated length cap.
- [Raw answers and measurements](runs.json) retain actual results, model IDs, token
  usage, input hashes, elapsed time and CLI cost estimates. Session/machine identifiers
  are omitted. `synthetic:false` in the manifest means real runs, not real task evidence.
- [Reporter output](report.json) correctly leaves all three pairs awaiting human
  review. No human grades were collected; qualitative observations below are agent
  inspection, not the protocol's human-scored evaluation or statistical analysis.

## Observed results

| Task | Both arms | Candidate-specific observation |
| --- | --- | --- |
| Subtitle review | Reject completion, preserve working drag/text behavior, propose restoring context and keyboard flow | Adds explicit reload/rediscovery test and retained lesson. Also overstates verified persistence as all unsaved work in its summary; fixture verifies text only. Baseline retains that distinction more clearly. |
| Reservation retries | Identify version/header mismatch, false-confidence stub and duplicate local rows; retain unavailable version constraint | Explicitly corrects the old design record, but still proposes POST after an empty lookup beyond 24h despite unknown lookup consistency. |
| Static heading | Produce the exact text-only patch, skip research and disclose no runtime test | Explicitly skips retrospective, but adds redundant full-file output. No outcome advantage established. |

Backend failure in **both** arms: a negative lookup after the provider replay window
is not proof that a prior request cannot later appear. Neither establishes a safe
retry after an uncertain outcome beyond 24h. Both suggest an initially empty request
table without proving how existing pending keys are bridged into it. This does not
remove historical reconciliation/cutover requirements. The baseline additionally
asserts the old design used the wrong contract version more strongly than an
unversioned citation supports. Do not use either answer as a production design.

The proposed backend checks also omit a demonstrated safe expired-key/negative-lookup
case. Passing a happy path with a found allocation cannot establish that behavior.
Independent second-agent review also found that the candidate's unique-row proposal
does not itself serialize outbound calls, while the baseline explicitly proposes a
state transition. Both UI answers unnecessarily defer keyboard scope already supported
by the brief. Baseline's trivial-copy answer guesses that longer text is unlikely to
matter without rendering evidence; candidate avoids that guess. Neither arm earns a
clean overall pass on reasoning precision.

These findings are retained as unresolved evaluation targets, not patched into domain
rules for every future research task. More trials and human review are needed before
judging net value. No post-hoc tuning of the frozen candidate followed these answers.

## Resource observations

| Arm | Responses | Sum wall seconds | CLI estimated USD |
| --- | --- | --- | --- |
| Baseline |3|53.366|0.186696|
| Candidate |3|52.879|0.199953|

These are observed list-price estimates, not invoices or subscription charges.
Single trials, provider caches, startup and varying answer lengths preclude cost or
speed rankings. Unknown ambient instructions further limit attribution.

## Future reruns

[run.ts](run.ts) was hardened **after** these archived runs: safe mode, fresh temporary
working directory, SIGKILL fallback and explicit sanitized failure classification.
Those controls were not used to produce runs.json. The helper refuses to overwrite
existing evidence and requires an explicit `--run` (up to six $0.50 sessions). Copy the
fixture directory to a new experiment location, remove only copied prior outputs,
freeze versions/model and review CLI support before an intentional new run. Do not
run this paid helper in offline CI. Record new runtime versions in its manifest.

No new sessions were silently substituted for failures or weak answers. The public
skill remains useful guidance; these observations do not demonstrate that it is best.
