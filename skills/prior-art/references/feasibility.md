# Practical feasibility before commitment

Use this for integrations, adoption choices and workflows with external dependencies.
Keep it proportional: a small UI change does not need an account audit.

A documented feature does not prove that the intended person can complete the intended
workflow using the actual account, deployment and permissions available to this project.
Before recommending a substantial implementation, capture:

| Check | Evidence to seek |
| --- | --- |
| Eligibility | Supported account type, plan, region, environment and feature access |
| Interface | Actual API/SDK/version, authentication method and runtime compatibility |
| Permissions | Who owns the resource, who can authorize access, required scopes |
| Human effort | Initial setup and recurring sign-ins, approvals or manual handoffs |
| Cost | Current price source/date, expected usage, limits and unknown charges |
| Lifecycle | Retry, recovery, revocation, export and replacement constraints |
| Smallest proof | One representative end-to-end path with expected and observed result |

Use available read-only evidence first. Do not create accounts, accept terms, send
messages, buy services or modify production just to finish research. A proof may run
only within the user's authorized scope and with appropriate isolated test data.
If execution is unavailable, state the proposed proof and its owner instead of
reporting success. Never copy credentials into reports.

Record a verdict: **demonstrated**, **documented but untested**, **blocked**, or
**unknown**. Include the evidence date, assumptions and what would change the choice.
A blocked candidate may still be useful prior art; it should not be described as an
available implementation. Prefer a reversible seam while a critical dependency is
unproven. Account friction can outweigh a theoretically elegant architecture.

Example (fictional): a service documents sharing, but the current plan's API cannot
create shares. A manual browser workflow has three recurring handoffs. Record that
limitation and compare an approved API-capable option or a deliberate manual process.
Do not promise fully automated sharing based solely on the product's feature page.
