# Deeper sources: packages, answers, docs, adoption signal (0.9.0)

## Goal

Discovery today is star-ranked repository samples (GitHub, GitLab, Codeberg) plus
code search (Sourcegraph, GitHub). Stars measure popularity, not use. Add three
scripted, free, read-only providers and one enrichment so a survey can show what
people actually depend on, what breaks in practice, and where current docs live.
No hosted index: query-time providers only, same coverage contract as today.

## Live probes (2026-10-28, anonymous)

| Endpoint | Result | Decision |
|---|---|---|
| `packages.ecosyste.ms/api/v1/keywords/<kw>?per_page=&page=` | 200, `Link rel=next`, `packages[]` with `dependent_repos_count`, `dependent_packages_count`, `downloads`, `ecosystem`, `repository_url`; 5000 req/h anonymous | **Add** `packages` mode |
| `packages.ecosyste.ms/api/v1/packages/search?q=` and `/packages?q=` | 404 | Keyword lookup only; document it |
| `api.deps.dev/v3/projects/github.com%2F<o>%2F<r>` | 200, `scorecard.overallScore`, stars, open issues | **Add** `-E N` enrichment to `repos` |
| `api.deps.dev/v3alpha/.../versions/<v>:dependents` | 200, `dependentCount` | Needs package+version; ecosyste.ms covers dependents per package. Skip |
| `api.stackexchange.com/2.3/search/advanced?q=&site=&sort=votes` | 200, `items[]`, `has_more`, `quota_max: 300` without key | **Add** `answers` mode, optional `STACK_EXCHANGE_KEY` (public app key, 10K/day) |
| `context7.com/api/v1/search?query=` | 200, `results[]` with `id`, `trustScore`, `totalSnippets`, `lastUpdateDate` | **Add** `docs` mode (library discovery) |
| `context7.com/api/v1/<id>?type=txt&topic=&tokens=` | 200, text snippets with source links | Document for the model to fetch; not scripted |
| `docs.stripe.com/llms.txt`, `react.dev/llms.txt` | 200 | Document as a docs source; not scripted |
| `grep.app/api/search` | 429 Vercel bot checkpoint | **Drop** |

GH Archive / BigQuery activity signal ("who is actually building this") is phase 2:
needs GCP credentials and cost bounds.

## Changes

### `bin/search-core.ts`: three providers + enrichment

Same shape as `searchPages`: bounded pages, retries via `request()`, schema checks
that fail closed, `Coverage` never reports complete on budget/backoff/error.

```ts
export async function packages(keyword:string,bounds:Bounds,fetcher:Transport=transport):Promise<{rows:Row[];coverage:Coverage}>{
 // ecosyste.ms keyword index across registries; dependents are the adoption signal.
 for(let page=1;page<=bounds.pages;page++){
  const url=`https://packages.ecosyste.ms/api/v1/keywords/${encodeURIComponent(keyword)}?${new URLSearchParams({per_page:'100',page:String(page)})}`;
  // body.packages must be an array of {name:string, ecosystem:string}
  // done when Link has no rel=next
 }
}
export async function answers(query:string,site:string,bounds:Bounds,fetcher=transport,key=process.env.STACK_EXCHANGE_KEY){
 // search/advanced sort=votes pagesize=100; done when has_more===false;
 // `backoff` or error_id => partial/failed; quota_remaining reported in coverage error when exhausted.
}
export async function docs(query:string,bounds:Bounds,fetcher=transport){
 // single page: context7.com/api/v1/search; results[].id must be string
}
export async function enrich(rows:Row[],n:number,bounds:Bounds,fetcher=transport){
 // top n GitHub rows -> deps.dev project; 404 = not indexed (unknown, not an error)
}
```

### `bin/search-cli.ts`: modes `packages`, `answers`, `docs`; `repos -E N`

| Mode | Flags | Report columns |
|---|---|---|
| `packages KEYWORD...` | `-n -o -p -r -t` | package, ecosystem, dependent repos, dependent packages, downloads, latest release, license, repo |
| `answers QUERY...` | `-n -o -p -r -t -S sites` | title, site, score, answers, accepted, last activity, tags, license |
| `docs QUERY...` | `-n -o -r -t` | Context7 id, title, trust, snippets, updated, fetch URL |
| `repos ... -E N` | new flag | adds Scorecard column for the top N GitHub rows |

Launchers `bin/package-search.sh`, `bin/answer-search.sh`, `bin/doc-search.sh` mirror
`prior-art-search.sh`. Existing entrypoints and flags unchanged.

### References and release

- `references/sources.md`: coverage-map rows for package registries (dependents),
  community Q&A (failure modes only; follow to primary source; CC BY-SA attribution;
  staleness), and current docs (Context7, `llms.txt`, SDK fixtures, changelogs).
- `SKILL.md`: one short line per new launcher in the tool block.
- README CLI section, CHANGELOG `0.9.0`, plugin/marketplace versions.

## Verification

1. Offline: `node --test skills/prior-art/bin/*.test.ts` with stub transports for
   each provider: complete, paginated, budget-partial, malformed-failed, HTTP error,
   SE backoff, deps.dev 404 unknown vs 500 partial.
2. `bash -n` on launchers; `claude plugin validate .` if available.
3. Live read-only smoke of each mode (`rrule`, `recurrence`) saved to `$TMPDIR`.
4. Independent review of retry/completeness claims (repo rule).
