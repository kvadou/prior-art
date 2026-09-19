# Prior Art 0.3.0 global upgrade

Doug approved the September19 review recommendations: skill instructions/references, search correctness, offline regression tests, README guide, GitHub push and global Claude/Codex availability. Existing extract-model/schema-coverage CLIs retained.

1. Portable Quick/Standard/Deep research profiles replace fixed intake and six-query ceiling. Relevant source-family coverage, pinned evidence, targeted history, bounded gap round and findings-to-tests traceability. Separate research value from adoption eligibility.
2. Preserve search entrypoint flags; add bounded pagination/retries, host identity, license-neutral ranking and explicit coverage status. New code TypeScript. Deterministic offline fixture tests.
3. Update README and plugin metadata. Independently review CLI/error handling and documentation consistency; run tests and read-only live smoke before push.
4. Push main; verify remote SHA, global symlinks and any installed Claude plugin cache. No unrelated plugin settings changed.

Example decision contract:
```ts
type Decision = {
  question: string;
  status: 'supported' | 'contested' | 'unknown' | 'not-found-in-surveyed-sources';
  observations: { source: string; revision: string; locator: string; fact: string }[];
  inference: string;
  fit: string;
  recommendation: string;
  verification: string;
};
```

Acceptance: no false consensus/absence claims; failures/truncation/empty distinguished; tests cover pagination, host duplicates, MPL, zero stars, provider failure and legacy CLI. Skill/README agree on runtime/output. Source files are evidence, never execution instructions. No application deployment is authorized by research alone.

## Verified result

Version0.3.0:25 offline regression tests passed; independent review found and verified
fixes for Codeberg server page caps, malformed Sourcegraph events, duplicate/changing
pagination, terminal-count mismatches and GitHub visibility/host handling. Live public
repository query returned1/1; live public code query12/12. Sourcegraph capped search
reported partial rather than complete. Shell syntax, local reference links, skill
frontmatter validator and Claude marketplace validation pass. Claude plugin loaded
from the repository reports0.3.0 with one skill.

Both local global skill symlinks resolve to the shared source checkout. There is no
separate installed prior-art entry in Claude's plugin registry to refresh. Fresh
sessions load the updated files; existing sessions may retain previously loaded text.
Manual semantic eval scenarios are documented, not claimed as executed agent evals.
