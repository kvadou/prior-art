---
name: prior-art
description: Survey how mature open-source projects solved a problem, then use that evidence to design a strong foundation (greenfield) or find expensive divergences in an existing app (brownfield). Enters plan mode and asks the decisions-that-are-expensive-to-reverse questions before any code. Use when the user says "/prior-art", "has anyone built this", "is there an open source version", "what should we start from", "review our architecture against the state of the art", or is about to start, or significantly extend, a system in a well-trodden category (LMS, CRM, ATS, billing, scheduling, helpdesk, admin, multi-tenant SaaS). Also use proactively when someone proposes building such a category from scratch.
---

# Prior Art

Independent teams who shipped the same category and survived contact with users
have already paid for lessons you would otherwise buy twice. This skill converts
their scars into evidence, and evidence into a foundation.

**The thesis, in three lines:**
1. When several mature projects independently converge on a design, that is stronger
   evidence than any single expert opinion, including yours.
2. Where they disagree, there is no right answer: only a tradeoff you must choose
   consciously instead of by accident.
3. Rank everything by cost to reverse. Prior art is worth a lot for the decisions
   that are expensive to undo and nearly worthless for the rest.

**Steal the shell, hand-build the core.** Most systems are a well-understood shell
(auth, tenancy, roles, scheduling, billing, audit) wrapped around a small sharp core
that is genuinely yours. The shell is where prior art pays.

## Two modes

| Mode | Trigger | Deliverable |
|---|---|---|
| **Greenfield** | Nothing built yet, or a new subsystem | Foundation doc: starting schema with a citation per decision |
| **Brownfield** | Established app to improve | Divergence report: where you differ from consensus, ranked by cost to reverse |

Detect the mode, then **say which one you picked and why, in one line**, before
proceeding. If the working directory is a repo with a schema and real commit
history and the request concerns that system, it is brownfield. If the user is
describing something that does not exist yet, it is greenfield. Ambiguous, ask.

Brownfield is the higher-value mode and the one to prefer when both could apply.
An experienced builder with a working app does not need a tutorial; they need the
three things that will be expensive later.

---

## Phase 0: Plan mode intake (ALWAYS FIRST)

**Call `EnterPlanMode` before any search, clone, or file write.** No exceptions.
The failure mode this prevents is the real one: an agent that starts cloning
repositories forty seconds in and produces a confident survey of the wrong category.

Read `references/irreversible-decisions.md` now. It is the source of the questions.

Then, in plan mode:

1. **Orient cheaply.** Brownfield: run `bin/extract-model.sh` (5s, read-only) and
   read the fingerprint. Greenfield: read nothing, ask.
2. **Ask 3-6 questions with `AskUserQuestion`.** Not twenty. The questions are drawn
   from the T1 list and **only the ones that actually apply to this category**. Give
   real options with tradeoffs, not open prompts, an experienced user should be able
   to answer by picking, and should learn something from the options themselves.

   The four that almost always earn their slot:
   - **License posture**: internal-only / might-be-sold / will-be-white-labeled.
     This single answer decides whether AGPL candidates are gold or poison, so ask it
     before the search, never after.
   - **Tenancy boundary**: what is the unit of isolation, and what is shared across it.
   - **Identity model**: is a person the same thing as a login here.
   - **The sharp core**: what 10-20% is genuinely yours and must not be adopted.

   **Lead every question with the product's own concrete cases, not the pattern's
   name.** "Person vs login vs membership" got a blank look; "a franchise owner who
   also tutors, an HQ coach who needs to see Orlando's tutors, a tutor who moves
   markets" got an immediate answer. The pattern name goes in the option text, the
   cases go in the question.

   Add from the T1 list only where the category demands it: money representation if
   money is involved, effective dating if anything is reproducible-as-of-a-date,
   timezone semantics if multi-region.

   In brownfield mode, ask about the *divergences the fingerprint already exposed*,
   not about generalities. "Your schema shows money on Float in 23 files and integer
   cents in 10, is that a migration in progress or an accident?" is worth ten
   generic questions.
3. **Write the plan**: mode, category, the answers, the search queries you will run,
   the finalists you expect to read, and the budget. Then `ExitPlanMode`.

**Do not** ask the user to confirm things prior art will answer. If four mature
LMSes all split enrollment from registration, that is not a question for the user.
Ask about contested things and about their business; find out the rest yourself.

---

## Phase 1: Search (cheap; a script, not a model)

The scripts live in `bin/` next to this file.

```
bin/prior-art-search.sh -n 20 -s 200 -k "kw1|kw2|kw3" \
  "topic:<slug>" "topic:<slug2>" "short phrase" "another phrase"
```

- `-k` relevance stems, pipe-separated; a repo needs **2+ distinct stems** in its
  name/description/topics to count as relevant. Always pass it.
- `-s` minimum stars: 200-500 for mature categories, 50 for niche ones.
- GitHub AND-s every word in a query, so **long phrases destroy recall**. Use several
  short queries plus 2-4 `topic:` slugs, which are the highest-recall form. Avoid
  audience topics (`topic:education`, `topic:business`), they return tutorials, not systems.
- Output: markdown + JSON in `./docs/prior-art/` inside the current repo (override with `-o` or `PRIOR_ART_OUT`).

**Name the incumbents before you search.** The biggest projects in a category
(Canvas, Open edX, Moodle in LMS; Odoo, ERPNext in ERP) almost never surface via
topic search, because they predate topics and are found by name. Write down the
3-5 incumbents you already know, look each up directly (`gh api repos/<owner>/<name>`),
and treat them as finalist candidates alongside the script's output.

Two more sources the script cannot reach, worth one manual pass each:
- the category's `awesome-<category>` list;
- the commercial incumbents' public docs. **A proprietary product's published data
  model is prior art too**, their API reference and CSV export schema tell you what
  they model, and they are usually the most battle-tested vote available.

## Phase 2: Triage to 3-5 finalists (you, on the report)

Kill on sight: unmaintained or archived; copyleft when the posture is commercial;
toy repos (high stars, one contributor, no issues, no tests, a tutorial, not a
system). Keep at most one "wrong stack, right schema" reference; a mature PHP system
is often the best available domain model.

**Diversity beats ranking.** Four forks of the same design are one vote. Deliberately
pick finalists with different origins, one dominant incumbent, one modern
rewrite, one adjacent-category system, one commercial doc set.

## Phase 3: Deep read (delegate; parallel; capped)

One subagent per finalist, **max 5, in a single parallel batch**, using
`references/deep-read-brief.md` verbatim as the prompt. Sonnet tier is right for this.

The brief enforces the two rules that make the output trustworthy: **read the schema
and migration history, never the README**, and **every claim carries a `path:line`
citation or says `UNDETERMINED`**.

Clone only to `/tmp/prior-art/`. Never into the user's project. Use `--depth 1` by
default, but **the one repo whose migration history matters most gets
`--depth 500` or a full clone**: scars live in migrations, and a shallow clone of
a 15-year project shows you 95 of several thousand. The reader should say
explicitly when history was unavailable rather than infer scars from comments.

## Phase 4: Synthesis (you; never delegate)

Follow `references/synthesis.md`. It defines the convergence matrix, how to weight
evidence, both output formats, and an honesty gate to run before delivering.

Look for **ordering constraints between fixes** before ranking them. In the first
run, the tenant-key backfill was deterministic only while one user had one org, so
it had to land before the membership split that would make users multi-org. A
report that lists both as T1 without the ordering is technically right and
practically wrong.

The core move: classify every decision as **CONVERGED** (3+ independent projects
agree, adopt unless you write down why not), **CONTESTED** (they disagree, a real
choice, present the tradeoff), or **ABSENT** (nobody models it, either you are wrong
that you need it, or it is your edge).

---

## Budget and stop conditions

State the budget in the plan and hold to it. Defaults, per run:

- Phase 1: ≤ 6 queries.
- Phase 2: ≤ 5 finalists.
- Phase 3: ≤ 5 subagents, one batch, no second round without asking.
- Phase 4: no delegation.

**Stop and report instead of pushing on when:**
- fewer than 3 relevant maintained repos exist → the answer is BUILD; say so in a
  paragraph and stop. A thin survey honestly reported is a real result.
- every good candidate is copyleft and the posture is commercial → the answer is
  STEAL-PATTERNS; do not propose a fork.
- the category turns out to be wrong → return to Phase 0, do not search harder.
- two subagents contradict each other on a T1 decision → open the file and settle it
  yourself before it enters the matrix.

Deep reads are the only expensive phase. Search is a shell script; triage and
synthesis are reasoning over small text. **Spend the tokens on reading schemas.**

## Honesty rules

- Citations or it did not happen: `repo:path:line`.
- READMEs are marketing. Stars are popularity. **Last-commit date, migration history,
  and issue-response time are the real signals.**
- Never claim our own code does something without opening the file. The fingerprint's
  grep counts point you at files; they are not findings.
- `UNDETERMINED` beats a confident guess, always. One fabricated row discredits the
  entire matrix.
- If the survey finds nothing worth taking, say BUILD and move on. The purpose is to
  stop wondering, not to force a dependency.
