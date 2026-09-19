# Prior Art repository

This is a public, portable research skill for Claude Code and Codex. Keep private
project records, credentials and host-specific paths out of published files.

## Changes

Keep SKILL.md concise; detailed source/evidence methods belong in references.
Maintain README, plugin version and CLI contracts together. Preserve existing
search entrypoints and flags or document migrations. New tooling is TypeScript;
no dependency install is needed to run it with a compatible Node runtime.

## Verification

Run the offline Node test suite documented in README, shell syntax checks for the
launchers, and `claude plugin validate .` when available. Test provider failures
without network fixtures first; a live read-only smoke is supplementary evidence.
Check empty versus failed versus partial coverage, canonical host identities, and
license-neutral discovery. Never execute reference repository code while researching.

Independent review should cover search/retry bounds and claims about completeness.
Documentation review checks evidence terminology, budgets, source applicability,
link resolution and portability to runtimes without planning/delegation tools.
Commit on main with named files and preserve unrelated work. A research skill does
not itself grant authority to deploy or change the application being researched.
