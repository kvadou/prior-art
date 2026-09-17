# Synthesis: turning reads into a decision

The deep reads produce facts. This step produces judgment. Do not delegate it.

## Step 1: The convergence matrix

One row per decision (from `irreversible-decisions.md`), one column per finalist.

| Decision | Tier | RepoA | RepoB | RepoC | RepoD | Signal |
|---|---|---|---|---|---|---|
| Course vs offering vs enrollment | T1 | split 3 | split 3 | split 3 | split 2 | **CONVERGED (3/4)** |
| Soft delete | T2 | soft+unique-partial | hard | soft | archive table | **CONTESTED** |

Classify every row:

- **CONVERGED**: 3+ independent projects resolved it the same way.
  This is the strongest evidence available, stronger than any single expert opinion,
  because each of those teams paid for the lesson in production. **Adopt unless you
  have a specific, written reason not to.** The reason goes in the doc.
- **CONTESTED**: mature projects genuinely disagree. There is no right answer;
  there is a tradeoff keyed to your constraints. **This is a real decision you must
  make consciously.** Present it as an option with the tradeoff, do not silently pick.
- **ABSENT**: nobody models it. Either you are wrong that you need it, or it is
  your genuine edge. Say which, and say why.

The CONTESTED rows are the questions worth putting to the user. The CONVERGED rows
are the ones worth not asking about.

## Step 2: Weight the evidence honestly

Not every repo's vote counts the same:

- A repo with 8 years of migrations and 200 contributors that changed its mind once
  is the strongest possible signal. A 2-year-old repo with 3 contributors that
  copied the first repo is not an independent vote. **Look for common ancestry
  before calling something converged**, four forks of the same design are one vote.
- A scar (a migration that split or reversed something) outweighs a greenfield
  choice, because it is evidence of a lesson rather than a preference.
- Commercial incumbents' public docs count as a vote when their data model is
  visible, even though you cannot read their code.

## Step 3: Mode-specific output

### Greenfield → foundation document

`docs/prior-art/YYYY-MM-DD-<topic>-foundation.md`:

1. **Verdict**: ADOPT / FORK / STEAL-PATTERNS / BUILD, and the license posture that
   drove it.
2. **The starting schema**: real DDL or `schema.prisma`, not prose. Every
   non-obvious decision carries a citation: `-- enrollment split: frappe/lms prisma/schema.prisma:212`.
3. **Contested decisions**: each with the options, the tradeoff, and your
   recommendation. These are for the user to rule on.
4. **What we are NOT taking, and why**: as important as what you took. Prevents
   re-litigating it in three months.
5. **The sharp core**: what stays hand-built, restated now that you have seen how
   others modeled the surrounding shell.
6. **License obligations**: if anything is copied verbatim, the attribution and the
   terms. If it is copyleft and the posture is commercial, say so loudly.

### Brownfield → divergence report

`docs/prior-art/YYYY-MM-DD-<topic>-review.md`:

1. **Headline**: the count of T1 and T2 divergences, in one sentence.
2. **Divergence table**, ordered by tier:

| # | Decision | Tier | Convergent pattern | What we do | Verdict | Migration cost |
|---|---|---|---|---|---|---|
| 1 | Money representation | T1 | integer minor units (4/4) | `Float` on 23 files | **FIX** | weeks: backfill + dual-read |

3. Each divergence gets one of three verdicts, and **the third one is mandatory to
   use where it applies**:
   - **FIX**: an accident that will cost more the longer it stands. Include the
     migration path, not just the complaint.
   - **KEEP**: a deliberate divergence that is your edge or fits your constraints.
     Write down *why*, so the next reviewer does not re-flag it.
   - **ACCEPT**: wrong in theory, not worth the migration. Say the cost that makes
     it not worth it.
4. **What we do better**: established apps usually beat the open-source reference
   somewhere. Say where. A review that only finds faults is not credible and will
   not be trusted by the person who built the thing.
5. **Top 3 actions**, in reversal-cost order, each with a rough effort estimate.

## Step 4: Honesty gate before delivering

Check each item. If any fails, fix it before showing the user:

- [ ] Every claim about an external repo has a `path:line` citation.
- [ ] Every claim about OUR repo was verified by opening the file: the fingerprint's
      grep counts are a hint, never evidence. A count of 23 for "money as float" means
      *go look at those files*, not "we store money as float."
- [ ] CONVERGED rows actually have 3+ *independent* sources.
- [ ] Contested decisions are presented as choices, not as a verdict.
- [ ] Nothing is recommended that the user's stated constraints rule out.
- [ ] In brownfield mode: at least one KEEP or "what we do better" entry, or an
      explicit statement that you looked for one and found none.
