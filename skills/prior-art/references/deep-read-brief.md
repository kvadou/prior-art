# Deep-read brief (subagent prompt template)

One subagent per finalist. Run them in parallel, max 5. Copy this brief verbatim
into each agent's prompt, filling the bracketed slots.

---

You are reading ONE open-source repository to extract design decisions, not to
summarize it. Another agent is reading a different repo for the same purpose; your
output will be merged into a convergence matrix.

**Repo:** [full_name]: [url]
**Clone to:** `/tmp/prior-art/[name]` with `git clone --depth 1 [url] /tmp/prior-art/[name]`
**Our category:** [category]
**Decisions we care about:** [list the 4-8 T1/T2 decisions from intake]

## Method: follow this order, do not deviate

1. **Find the schema first.** `schema.prisma`, `db/schema.rb`, `migrations/`,
   `models/`, `*.sql`, `entities/`. If there is an `ERD` or `docs/architecture`, read
   it second, never first.
2. **Read the schema, not the README.** The README is marketing. The schema is what
   they actually believe.
3. **Read the 3 oldest and 3 newest migrations.** The diff between them is where the
   lessons are. A migration that splits one table into two is a scar, describe it,
   because that split is exactly what a from-scratch build would get wrong.
4. **Grep for the decisions listed above** and cite `path:line` for each.
5. Only then, skim the service/business layer for the 2-3 non-obvious rules.

## Output: exactly this structure, under 500 words, no preamble

**IDENTITY:** repo, stars, license, last commit, primary language, and in one line
what it actually is.

**CORE ENTITIES:** the 5-12 entities that matter, with relationships. Paste real
schema excerpts, trimmed. Cite `path:line`.

**DECISIONS:** for EACH decision in "decisions we care about", state how this repo
resolved it, in this exact form:
`<decision> → <their answer> [path:line], <one line on why, if visible>`
If you could not determine it, write `UNDETERMINED`, never guess.

**SCARS:** anything the migration history shows they changed their mind about.
This is the highest-value section. `path:line`.

**NON-OBVIOUS:** up to 3 things a competent from-scratch build would get wrong that
this repo gets right.

**SMELLS:** up to 3 things that are legacy, framework-specific, or would not survive
in [our stack]. Be specific; "it's PHP" is not a smell.

**VERDICT:** one of ADOPT / FORK / STEAL-PATTERNS / IGNORE, plus one sentence.

## Hard rules

- Every factual claim about the code carries a `path:line` citation. No citation,
  no claim.
- Never describe code you did not open.
- `UNDETERMINED` is a valid and respected answer. A confident wrong answer poisons
  the convergence matrix, which is the entire deliverable.
- Do not propose what we should build. You are reading one repo; you cannot see the
  comparison. Synthesis is the orchestrator's job.
- Do not clone anything outside `/tmp/prior-art/`. Do not modify our repo.
