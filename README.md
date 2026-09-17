# prior-art

**Evidence before architecture.**

Independent teams who shipped the same category you are building, and survived
contact with users, have already paid for lessons you would otherwise buy twice.
`/prior-art` turns their scars into evidence, and evidence into a foundation.

It is a skill for Claude Code (and Codex). It does not write your app. It stops you
from writing the wrong first 500 lines.

## The thesis

1. When several mature projects **independently converge** on a design, that is
   stronger evidence than any single expert opinion, including yours.
2. Where they **disagree**, there is no right answer, only a tradeoff you should
   choose consciously instead of by accident.
3. Rank everything by **cost to reverse**. Prior art is worth a lot for the
   decisions that are expensive to undo (tenancy boundary, identity model, money,
   versioning) and nearly worthless for the rest (indexes, validation, UI).

**Steal the shell, hand-build the core.** Most systems are a well-understood shell
around a small sharp core that is genuinely yours. The shell is where prior art pays.

## Two modes

| Mode | When | You get |
|---|---|---|
| **Greenfield** | Nothing built yet, or a new subsystem | A foundation doc: starting schema with a citation per non-obvious decision, contested choices laid out as tradeoffs, and what you are deliberately not taking |
| **Brownfield** | An app you already run | A divergence report: where your schema differs from what mature projects converged on, each divergence tagged FIX / KEEP / ACCEPT with a migration cost, plus what your app does *better* than the references |

Brownfield is the one experienced builders reach for. You do not need a tutorial;
you need the three things that will be expensive later, while they are still cheap.

## Install

Claude Code:

```
/plugin marketplace add kvadou/prior-art
/plugin install prior-art@prior-art
```

Codex: clone and symlink `skills/prior-art` into `~/.agents/skills/`.

Requirements: `gh` (authenticated), `jq`, `git`, `curl`. macOS and Linux. Pattern
search via Sourcegraph needs no account.

## Run

```
/prior-art
```

It enters plan mode **before doing anything else** and asks 3 to 6 questions. Not
twenty. The questions come from the list of decisions that are expensive to reverse
(see `references/irreversible-decisions.md`), filtered to your category, and in
brownfield mode they are about what the fingerprint of your schema already exposed:

> "Your schema has money on `Decimal` in 23 files and integer cents in 10. Is that a
> migration in progress or an accident?"

Then, with your answers and a budget in hand:

1. **Search** (shell scripts, near-zero tokens), three kinds:
   - **Pattern search**: who models it *this way*? Regex over code content across
     GitHub, GitLab and more via Sourcegraph, with a library of queries per decision
     (`membership-table-prisma`, `soft-delete-partial-unique`, `money-int-currency`,
     `effective-dating`, ...). "68 Prisma repos have a `Membership` table; here are
     the top ten by stars with `path:line`" is convergence evidence in one command.
   - **Votes that are not repos**: standards (SCIM, OneRoster, FHIR, iCalendar,
     ISO 20022), commercial API schemas via APIs.guru, widely used libraries by
     download count, and reference monoliths with long public migration histories.
     `references/sources.md` lists them by category and says what each is a vote on.
   - **Repo search**: GitHub, GitLab and Codeberg topic and phrase queries, scored on
     relevance, maintenance, and license class. Plus the step most tools skip: the
     incumbents in any category (Canvas, Moodle, Odoo) never surface via topic
     search, so you name them and they are looked up directly.
2. **Triage** to 3 to 5 finalists, chosen for diversity of origin. Four forks of the
   same design are one vote.
3. **Deep read** in parallel, one subagent per finalist, with a brief that forbids
   summarizing the README. They read the schema and the migration history, and every
   claim carries a `path:line` or says `UNDETERMINED`.
4. **Synthesize** a convergence matrix: every decision is CONVERGED, CONTESTED, or
   ABSENT. Then the deliverable for your mode.

Budget by default: 6 queries, 5 finalists, 5 subagents, one round. It stops and
says so when the survey is thin, when every good candidate has the wrong license,
or when the category turns out to be wrong. A thin survey honestly reported is a
real result.

## What a run looks like

A multi-market tutor-training platform: 112 models, 130 migrations, roughly 280k
lines, eight months old, two contributors. The kind of app that works, ships daily,
and has never been compared to anything.

Finalists: two large AGPL learning platforms (schema reference only, since the
product might be white-labeled), one MIT scheduling platform, one BSD membership
library, one Apache content-versioning platform. Five origins, no shared lineage.

The matrix came back with one 4-of-4 convergence: **membership is its own table,
many per person, role on the membership**, not a `role` enum on the user. The
scheduling platform had gone through the app's exact current shape and migrated off
it two years earlier; the migration file was the citation.

What the report actually delivered, though, was an **ordering constraint** no
single reader could see: the tenant-key backfill was deterministic only while each
user belonged to one org, so it had to land *before* the membership table that
would make users multi-org. One week now, a much worse week later. That sentence
was the value of the run.

It also listed six things the app did better than all five references, with
citations, because a review that only finds faults is not credible to the person
who built the thing.

## What is in the box

```
skills/prior-art/
  SKILL.md                              the workflow, modes, budget, honesty rules
  bin/pattern-search.sh                 code-content search for a schema pattern (Sourcegraph, GitHub)
  bin/prior-art-search.sh               repo survey across GitHub, GitLab, Codeberg: score, dedupe, license class
  bin/schema-coverage.sh                share of models carrying a column family, across many repos, no clone
  bin/extract-model.sh                  brownfield fingerprint of any repo, ~5s, read-only
  references/patterns.tsv               the pattern library, one query per decision per engine
  references/sources.md                 standards, API schemas, registries, reference monoliths, by category
  references/irreversible-decisions.md  what is expensive to reverse, by tier, and why
  references/deep-read-brief.md         the subagent prompt, verbatim
  references/synthesis.md               convergence matrix, evidence weighting, output formats, honesty gate
```

`extract-model.sh` works on Prisma, Drizzle, Rails, Django, SQLAlchemy, and raw SQL
migrations. It reports entity counts and the presence of the expensive-to-retrofit
patterns (tenant key, soft delete, audit, versioning, money representation,
idempotency). It says what exists, never whether it is right; the comparison does that.

## Honesty rules the skill holds itself to

- Citations or it did not happen: `repo:path:line`.
- READMEs are marketing. Stars are popularity. Last-commit date, migration history,
  and issue-response time are the signals.
- `UNDETERMINED` beats a confident guess. One fabricated row discredits the matrix.
- Never claim your code does something without opening the file. The fingerprint's
  counts point at files; they are not findings.
- Ask about your business and about contested decisions. Never ask you to confirm
  what the prior art already answers.

## Contributing

The most valuable contribution is a new row in `references/irreversible-decisions.md`
with a real scar behind it: a migration in a public repo where a mature project
reversed a decision, and what it cost them. Second: a pattern in
`references/patterns.tsv` whose query cleanly isolates one decision. Third: a
category block in `sources.md` naming the standard and the incumbents.

MIT.
