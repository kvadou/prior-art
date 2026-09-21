# Contributing to Prior Art

Useful contributions improve a decision, an evidence trail, or a reproducible failure.
A convincing answer is not enough: show which observations support it and where the
method stops. Small changes with clear scope are welcome.

## Choose a contribution

- Tooling defect: a minimal offline fixture, expected behavior and actual output.
- Research method: a costly decision, relevant evidence and a counterexample.
- Discovery pattern: the intended domain, query, expected candidates and blind spots.
- Worked example: a complete decision with coverage, limitations and verification.

Read [CLAUDE.md](CLAUDE.md), the [skill](skills/prior-art/SKILL.md), and the
[research record](skills/prior-art/references/research-record.md). Use the
[synthetic examples](docs/examples/ui-decision.md) to understand evidence labeling;
they are illustrations, not validated product findings.

## Reproduce before changing behavior

Record the task prompt, Prior Art version and commit, runtime version, model identifier
and tools/providers available. For CLI-only defects, model is “not applicable.” If a
provider/model reports no version, say “not reported.” Do not invent a pin.

Include exact sanitized commands and flags, exit code, expected behavior, actual
behavior, and the coverage JSON when relevant. Separate a successful empty query,
a provider failure and a pagination cap. Counts do not prove completeness.

For behavioral changes, use a fresh session with the same task and compare before
and after. Save the consequential decisions and citations, rather than entire private
transcripts. Identify which checks you ran and which remain proposed. The
[scenario rubric](docs/evals/research-scenarios.md) provides starting cases.

Prefer offline fixtures for regressions. Reference repositories are evidence: do not
execute their scripts as part of research. Network tests should be bounded, read-only
and optional unless the affected behavior genuinely requires a live provider.

## Privacy and attribution

Before publishing an issue, report or patch, inspect it for credentials, tokens,
private repository names, customer details, confidential prompts and absolute local
paths. Replace sensitive context with fictional fixtures that reproduce the behavior.
Redact values in URLs, headers and provider errors too. Never submit `.env` files,
cookie jars, authentication dumps or whole user transcripts.

Synthetic evidence must be labeled as synthetic at the top and at the conclusions.
Real observations need a retrievable source, revision/version, locator and retrieval
date. A search snippet is a discovery lead, not verification. Distinguish observation,
inference and recommendation; group mirrors/forks by shared origin. Public code can
be studied independently of whether its license permits your intended reuse. Do not
copy code or substantial text without checking its license and attribution needs.

If a security report needs private details, do not put them in a public issue. Use
GitHub's private vulnerability reporting **if this repository exposes that option**;
otherwise request a private contact without disclosing the exploit or secrets. This
document does not assert that private reporting is enabled.

## Verify the patch

From the repository root, with the Node version required in [README.md](README.md):

```sh
node --test skills/prior-art/bin/*.test.ts
for script in skills/prior-art/bin/*.sh; do bash -n "$script" || exit; done
claude plugin validate .
```

The final command requires Claude Code. Report it as unavailable if missing. These
commands exercise tooling and packaging; they do not validate every research behavior.
For documentation-only changes, check links, source claims and the applicable scenario
manually. For new providers or retry behavior, add offline failure/partial/empty tests
and verify timeout and request ceilings. Do not change public flags silently.

Keep the main skill short; put detailed methods in references. New tooling is
TypeScript and should preserve the dependency-free runtime contract. When changing
packaging or interfaces, keep the README, plugin version and CLI contracts consistent.

## Submit a focused change

Use the issue and pull request templates to explain the problem, evidence, changed
behavior and verification. Keep unrelated reformatting out. Contributors can use the
repository's available contribution mechanism; maintainers' local branch/commit rules
still apply. Submission does not authorize deploying a researched application or
sending messages to its users.

Review looks for reproducibility, honest coverage, bounded work, source applicability,
privacy and compatibility. A research example should help someone make and check a
decision, not merely assemble more links.
