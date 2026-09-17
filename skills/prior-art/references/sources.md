# Where prior art lives

GitHub repo search finds projects by name and topic. Most prior art is not a repo,
or is not findable by topic. This file lists the other places, what each one is a
vote *on*, and how much that vote weighs.

## Votes that are not repositories

A design decision does not need a GitHub URL to count. Three non-repo sources
carry weight in the convergence matrix, and the matrix should say which kind of
vote each column is.

| Source kind | Weight | Why |
|---|---|---|
| **Standard** (RFC, ISO, industry body) | Like a mature incumbent | Written by a committee of the companies that already paid for the lessons. When a standard and a repo disagree, the standard usually encodes the larger install base. |
| **Commercial API schema** (public OpenAPI / API reference) | Like a mature incumbent | Ten years of paying customers shaped that data model. You cannot read the code, but the resource shapes, required fields, and enum values are the model. |
| **Widely used library** (package registry, high downloads) | One vote, weighted by downloads | A library that encodes a domain model (`django-organizations`, `money-rails`, `paper_trail`) is a design many apps adopted. Downloads are a "used in production" signal stronger than stars. |
| **Reference monolith** (see below) | One vote per decision, any category | Long public migration histories; the scars are visible regardless of domain. |

## Standards, by category

Look these up by name; none of them surface via topic search.

| Category | Standard | What it is a vote on |
|---|---|---|
| Identity, tenancy, membership | **SCIM 2.0** (RFC 7643/7644) | User vs Group vs membership; `active` flag semantics; externalId; multi-valued attributes. The industry answer to "a person in many orgs." |
| Education | **1EdTech OneRoster** | org / user / class / course / enrollment / academicSession as separate resources; role on the enrollment; `status` + `dateLastModified` on every resource. Directly answers course-vs-offering-vs-enrollment. |
| Education (content) | **1EdTech LTI**, **SCORM / xAPI** | Launch context vs content; learner statements as immutable events (xAPI) rather than mutable progress rows. |
| Payments, money | **ISO 20022**, **ISO 4217** | Amount + currency as an inseparable pair; minor-unit exponent per currency (some currencies have 0 or 3 decimals, so "cents" is not universal). |
| HR, hiring | **HR Open Standards** (formerly HR-XML) | Person vs candidate vs application vs position; effective dating on employment records. |
| Health | **HL7 FHIR** | Patient vs Person vs RelatedPerson vs Practitioner; every resource versioned with `meta.versionId`; the canonical person/role/relationship split. |
| Calendar, scheduling | **iCalendar (RFC 5545)**, **RFC 7986** | RRULE recurrence + EXDATE exceptions + RECURRENCE-ID overrides; the reference for rule-vs-exception-vs-instance. |
| Products, commerce | **GS1**, **schema.org/Product**, **Open Commerce** | Product vs variant vs offer vs price; identifiers as first-class. |
| Addresses, parties | **ISO 19160**, **schema.org/Person, Organization, Role** | Party pattern; role as a relationship between a person and an org with dates. |
| Everything | **schema.org** | A neutral first pass at "what are the entities in this domain and what are their fields." |

## Commercial API schemas

Public API references are published data models. Read the resource list and the
required fields, not the marketing page.

- **APIs.guru** (`https://api.apis.guru/v2/list.json`): directory of thousands of
  public OpenAPI specs, downloadable as JSON. Grep the list for the incumbent, pull
  the spec, list `components.schemas`. Stripe, Twilio, Slack, HubSpot, Salesforce,
  Zoom, and many more are there.
- Incumbents with strong published models, by category: **Stripe** (money, idempotency,
  subscriptions vs invoices vs line items), **Canvas / Instructure** (accounts,
  enrollments, sections, terms), **Salesforce** (Account / Contact / Lead /
  Opportunity, the CRM shape everyone copies), **HubSpot** (associations as a
  first-class object), **Shopify** (product / variant / inventory), **Calendly**
  (event type vs scheduled event vs invitee), **Greenhouse / Lever** (candidate vs
  application vs job), **QuickBooks / Xero** (double-entry, effective dating).
- The incumbent your app already integrates with is prior art too. Its webhook
  payloads tell you what it considers an event.

## Package registries

Search for the domain concept, not the framework. Sort by downloads.

| Registry | Query form | Strong domain-model libraries to know |
|---|---|---|
| npm | `https://registry.npmjs.org/-/v1/search?text=<terms>&size=20` | `casl` (permissions), `dinero.js` (money), `rrule` (recurrence) |
| PyPI | `https://pypi.org/search/?q=<terms>` (HTML; or use `pip index`) | `django-organizations`, `django-tenants`, `django-simple-history`, `django-money`, `django-guardian` |
| RubyGems | `https://rubygems.org/api/v1/search.json?query=<terms>` | `acts_as_tenant`, `apartment`, `paper_trail`, `money-rails`, `discard`, `rolify`, `pundit`, `ice_cube` (recurrence) |
| crates.io | `https://crates.io/api/v1/crates?q=<terms>` | `rusty-money`, `rrule` |
| Packagist | `https://packagist.org/search.json?q=<terms>` | `stancl/tenancy`, `spatie/laravel-permission`, `brick/money`, `spatie/laravel-activitylog` |
| Maven Central | `https://search.maven.org/solrsearch/select?q=<terms>` | `javamoney`, `hibernate-envers` (audit/versioning) |

Rails gems are the richest single source: fifteen years of extracting domain
patterns into small, named libraries. Even for a TypeScript app, `discard` vs
`paranoia` (soft delete) and `paper_trail` vs `audited` (versioning) are the
clearest statements of the tradeoffs.

## Reference monoliths

Long-lived public applications with full migration histories. Not category
matches; pattern matches. Clone with real depth when you read them (scars live in
`db/migrate`).

| Project | License | Best read for |
|---|---|---|
| **GitLab** (`gitlab-org/gitlab`) | MIT (CE) | Namespaces vs groups vs projects (tenancy tree), `members` table with access levels, partitioning, the largest Rails migration history in public |
| **Discourse** | GPL-2 | Multisite tenancy, soft delete with `deleted_at` + `deleted_by`, post versioning via `post_revisions` |
| **Mastodon** | AGPL | Account vs User split (the person/login split done explicitly), federation identity |
| **Zulip** | Apache-2 | Realm as tenant on every table, `Recipient` indirection, soft-deactivation |
| **Chatwoot** | MIT | Account / AccountUser / User (membership with role), inbox as offering |
| **Cal.com (cal.diy)** | MIT | User / Profile / Membership, availability rules + overrides in one table |
| **Odoo** | LGPL | `res.partner` (the Party pattern: person and company in one table), multi-company, effective-dated pricing |
| **ERPNext / Frappe** | GPL/MIT | Document versioning, naming series, multi-company |
| **Metabase** | AGPL | Collections / permissions graph, a permission model that grew and shows it |
| **Sentry** | FSL/BSL | Organization / Team / Member, the SaaS tenancy shape most B2B apps copy |
| **Keycloak** | Apache-2 | Realms, users, federated identities, the reference for "one person, many logins" |

## Curated maps

For triage and for finding the incumbents topic search misses.

- **awesome-selfhosted** (`awesome-selfhosted/awesome-selfhosted`): every category,
  each entry tagged with language and license, dead projects pruned. The best
  single list of "mature systems by category."
- **OpenAlternative** (`openalternative.co`) and **opensourcealternative.to**: map a
  commercial incumbent to its open-source equivalents. Start from the incumbent
  you would otherwise buy.
- **awesome-<category>** lists: quality varies; check the last-commit date of the
  list itself before trusting it.

## Other code hosts

Small yield, cheap to include. `prior-art-search.sh --source github,gitlab,codeberg`.

- **GitLab** (`https://gitlab.com/api/v4/projects?search=...&order_by=star_count`):
  some EU, academic, and enterprise open source lives only here. Star counts are
  an order of magnitude lower than GitHub for equivalent projects; do not compare raw.
- **Codeberg** (`https://codeberg.org/api/v1/repos/search?q=...`): Forgejo API,
  growing, mostly small projects and mirrors.
- **Software Heritage** (`https://archive.softwareheritage.org/api/1/`): archives
  everything, including dead projects from Bitbucket, Google Code, and Gitorious.
  Useful when the question is "what did people try that did not survive."

## Scars in prose

Engineering blogs and postmortems where a team explains a migration. Highest
signal per word; hardest to search. Fixed query templates that work:

- `"<concept>" "we migrated" OR "we moved away from" OR "lessons learned" site:engineering.<incumbent>.com`
- `"<concept>" postmortem OR "what we got wrong" schema`
- `"soft delete" "unique constraint" partial index` (a specific known scar)

Known good sources: Shopify Engineering (money, sharding), GitLab Unfiltered and
handbook (every schema decision is public), Figma (Postgres sharding), Stripe
(idempotency keys, API versioning), Slack (shared channels, the multi-org identity
problem), Discord (message storage).

## What not to bother with

- Hugging Face, Kaggle: models and datasets, not schemas.
- Product Hunt, G2, Capterra: only useful to name incumbents, which you can do from memory.
- Stack Overflow: pattern-level answers without the migration history that makes them evidence.
