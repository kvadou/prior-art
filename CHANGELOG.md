# Changelog

## 0.3.0, 2026-09-19

- Broader public research across implementations, official APIs/SDKs, standards,
  libraries, issue/PR histories, postmortems, UX/accessibility and AI evidence.
- Portable intake and Quick/Standard/Deep budgets. Reuse known constraints, allow
  bounded gap searches and sequential reading when delegation is unavailable.
- Separate research relevance from adoption suitability; remove false consensus,
  absence and blanket license/stack assumptions. Target decision history and tests.
- Add coverage/decision/pattern records and findings-to-verification traceability.
- Replace repository/pattern search internals with dependency-free TypeScript and
  compatibility shell entrypoints. Requires Node22.18+ native TypeScript support.
- Bounded pagination/timeouts/retries and explicit complete/partial/failed/skipped
  coverage. Distinguish successful empty results from provider failure.
- Host-aware identity, zero-star-safe license-neutral research ranking, corrected
  weak-copyleft classification, offline regression fixtures and semantic eval cases.
- Updated installation/update guide. Shared Claude/Codex symlinks use one source.

Compatibility: existing short flags remain. New -p/-t/-r flags control retrieval
bounds. Partial coverage now returns exit2; callers must inspect coverage JSON before
using results. Default star floor is now0. Output includes a coverage sidecar and uses
unique UTC timestamps. Old static survey reports remain historical evidence.

## 0.2.0

Added pattern search, source-family references, and multi-host repository discovery.
