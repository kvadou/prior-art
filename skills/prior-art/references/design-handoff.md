# Research-to-design handoff

Use for an authorized substantial product build or redesign. Research-only requests
end with recommendations or proposed artifacts, not an unsolicited implementation.
A build authorized by the user can proceed without adding a new approval ceremony.
Honor any explicit design-review checkpoint in the user's instructions.

## Preserve the requested outcome

Before implementation, map the original request to concrete capabilities. Broad goals
such as "enterprise-grade" need relevant tasks, states, data semantics and quality
criteria, not an assumption of complete competitor parity. Mark which expectations
are explicit and which are inferred. Ask only when a material scope choice cannot be
resolved from the user's context or authorization.

| User outcome / job | Needed capability | Current evidence | Proposed phase / disposition | Acceptance check |
| --- | --- | --- | --- | --- |
| Know what happens next | Owner, next action and agreed date | Existing fields; fragmented entry points | Improve in current phase | Find and update next action from the profile |

Separate **implemented and verified**, **present but unverified**, **missing**, and
**unknown**. Name deferrals and their effect on the original goal before building.
A time/research budget does not authorize silently reducing the requested deliverable.
A phase can be complete while the original goal still has unfinished work; report both.

## Make the design concrete

Choose a small number of meaningfully different arrangements when unresolved tradeoffs
warrant comparison. An obvious, well-supported small change needs no forced variants.
Compare task completion, information hierarchy, density, navigation and edit feedback;
select a direction with reasons. Carry the user's brand and existing design system.

For consequential interaction changes, make an appropriate prototype before a broad
rebuild: a local interactive sketch, wireframe flow or existing-app slice. Use realistic
synthetic content and inspect long names, multiple related records, overdue work and
empty/error/conflict states where relevant. Explain what the prototype cannot prove.
Do not embed real private records in a shared or externally generated artifact.

Handoff contains: capability map, selected reference patterns and citations, screen/
flow artifact, states and interaction contracts, implementation seams, preservation
and migration requirements, and task-based acceptance checks. Reuse an existing
project design brief rather than creating duplicate sources of truth.

## Check the result against the goal

After an authorized build, rerun the same tasks on the implementation. Check that the
chosen pattern works with realistic content, that existing capabilities remain
reachable, and that persistence, permissions and failure behavior are independently
verified where relevant. Compare visual hierarchy against the references and brand;
a passing render test alone does not establish usability or visual quality.

Record observed results, unresolved failures, and changes from the proposed design.
Do not invent timings, human preference or improvement scores. Distinguish agent
inspection from user testing. Retain a concise reusable lesson and its limits.

When evaluating this skill, use held-out tasks and the existing paired-evaluation
protocol. A live project that shaped the update is a worked example, not independent
proof that the new skill outperforms the previous version.
