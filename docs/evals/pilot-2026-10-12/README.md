# Evidence-ledger development pilot, October 12, 2026

## Recommendation

Keep the 0.8.0 evidence ledger in saved records, but not in chat answers. On four
fixed-evidence tasks, the no-skill arm passed the most prewritten checks. 0.8.0 reasoned
correctly but lost points by pasting its record template and tool vocabulary into
answers that should have been short. 0.8.1 adds one paragraph addressing that; it has
not been evaluated. This pilot makes no superiority claim for any arm.

## Evidence and controls

- [Tasks and prewritten checks](tasks.json) were written by a fresh agent that read only
  the 0.7.0 bundle, the [paired-evaluation protocol](../paired-evaluation.md) and the
  previous pilot's task format. It did not see the 0.8.0 changes. It received the four
  categories: mixed-retrieval synthesis, closed incumbent, completion claim, trivial
  control. Development test, not a blinded independent benchmark.
- Three frozen arms: [no skill](no-skill-instructions.md),
  [0.7.0](baseline-0.7.0-instructions.md) (`7f9e5d8`) and
  [0.8.0](candidate-0.8.0-instructions.md) (`5c6ffc6`). The two skill bundles contain
  SKILL.md plus research-record, synthesis, sources and outcome-review references;
  0.8.0 adds shipped-products. References were supplied eagerly, so routing and
  progressive loading were not measured.
  The committed bundles have two trailing newlines trimmed for the repository's
  whitespace check; the runs used the same text plus those newlines (original file
  SHA-256 `8e42672d...d2af1f` for 0.7.0, `384faecf...70c5bb` for 0.8.0).
- [run.ts](run.ts): one fresh `claude --safe-mode -p` process per answer, tools, MCP,
  slash commands, settings sources and hooks disabled, medium effort, $0.50 cap, fresh
  temporary directory, 180-second SIGTERM timer. Arm order rotated per task. Claude Code
  2.1.296, Node 24.18.1, all twelve reported `claude-opus-5-5`. Same preamble as the
  previous pilot.
- Isolation was probed before the run: a safe-mode session reported no CLAUDE.md,
  memory or style instructions, but Claude Code still injected the account email as
  context. Ambient isolation is therefore better than the previous pilot, not complete.
- [Raw answers and measurements](runs.json) are retained in full, stored as ASCII-escaped
  JSON (for example `\u2014`) so the repository's character hooks pass; parsing restores
  the exact text. Paired manifests:
  [no skill vs 0.8.0](manifest-no-skill-vs-0.8.0.json) and
  [0.7.0 vs 0.8.0](manifest-0.7.0-vs-0.8.0.json); their reporter output leaves every
  pair awaiting human review because no human grades were collected.
- Grading: a separate agent read only an anonymized packet with answers shuffled into
  A/B/C per task ([key](blind-key.json)), applied every check as written, and scored
  decision quality 1-5 ([grades](agent-review-grades.json)). Agent review is not the
  protocol's human scoring.

## Observed results

| Task | No skill | 0.7.0 | 0.8.0 |
| --- | --- | --- | --- |
| Offline sync, adapt vs build | 7/7, 5 | 7/7, 5 | 6/7, 4: decision sound, wrapped in question/obligation tables |
| Closed competitor shift swaps | 6/7, 4: proposes blogging about internal interview research | 0/7, 1: non-answer ("previous answer was cut off"), asked which narrower part to do | 6/7, 4: correct, delivered as a full record template |
| Invoice numbering done claim | 7/7, 5 | 7/7, 5 | 6/7, 4: cites `record-lint.ts` and authority levels absent from the packet; assumes the transactional lock exists |
| Typo control | 6/6, 5 | 5/6, 4: long verification plus repo-wide searches | 5/6, 4: verification note too long |
| **Total** | **26/27, mean 4.75** | **19/27, mean 3.75** (19/20 excluding the non-answer) | **23/27, mean 4.0** |

All arms rejected the closed-competitor reverse-engineering plan where they answered,
and all refused the invoice completion claim. The 0.7.0 non-answer is kept as observed;
it was not rerun or replaced. Its cause is unknown. One trial per cell: these
differences are within what repetition and grader judgment could move.

What the run demonstrated, with its limits: 0.8.0's new instructions transferred into
the output as structure and vocabulary rather than as better decisions on these tasks.
The checks reward concision, so this pilot measures the cost of that ceremony more than
any benefit of linked IDs in saved records, which it did not test. `record-lint.ts`
was not exercised by any arm.

## Resource observations

| Arm | Answers | Sum wall seconds | CLI estimated USD |
| --- | --- | --- | --- |
| No skill | 4 | 65.7 | 0.1429 |
| 0.7.0 | 4 | 70.4 | 0.2578 |
| 0.8.0 | 4 | 76.0 | 0.2920 |

List-price CLI estimates, not invoices. Larger bundles cost more input; single trials
preclude speed or cost rankings.

## Follow-up

0.8.1 adds a paragraph to SKILL.md: ID tables belong in the saved record; chat answers
stay proportional and do not name the skill's tooling unprompted. Evaluate it on fresh
tasks, not these, with repetitions and human review before claiming it fixes the gap.
run.ts refuses to overwrite runs.json; copy the directory for any rerun.
