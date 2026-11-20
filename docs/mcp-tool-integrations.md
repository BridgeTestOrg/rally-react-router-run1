# MCP tool integrations — the human "why" behind the capability report

This catalog is **explanatory prose only**. It exists so the `/install-bridge`
capability report can cite a human-readable "why" for each gate. It is **not** a
source of truth for gating: the server computes every `locked_tools` /
`unlocked_tools` membership decision itself and the agent must never recompute a
tool's dependencies from this document.

**Authoritative source of gating.** The enforced rules — which tools are blocked,
which are degraded, and what each requires — live in
`api/library/vcs/vcs_route_operations.py`:

- `VCS_ROUTE_REQUIREMENTS` — routes that **BLOCK** (are unavailable) without a
  VCS connection.
- `VCS_ROUTE_WARNINGS` — routes that **DEGRADE** (stay usable, but without
  codebase context) without a VCS connection.
- `NEVER_GATED_ROUTE_KEYS` — routes that are never gated on any integration.
- `INDEX_REQUIRED_ROUTE_KEYS`, `INDEX_REQUIRED_COUNCIL_MODES`,
  `CREATE_DOC_CODEBASE_CONTEXT_DOC_TYPES`, `CREATE_DOC_WARN_DOC_TYPES` — the
  conditional "requires a successful code index" dimension.
- The resolver helpers `get_required_vcs_operation()`, `get_warn_vcs_operation()`,
  and `requires_successful_index()` are the authoritative functions that decide a
  case. The capability report is derived from these; this catalog explains them.

## Reading the capability report

Each tool entry the server returns has the exact shape
`{tool, effect, missing, semantics}`:

- **`effect`**
  - **`BLOCK`** — the tool is **unavailable** until every listed dependency is
    met. It will refuse to run without them.
  - **`DEGRADE`** — the tool is **usable right now**, but **without codebase
    context** (it cannot ground its output in your repository). Connecting the
    listed dependency upgrades it from "works blind" to "works with full context".
    A `DEGRADE` tool is never "failed".
- **`missing`** — the server-computed dependency identifiers still needed:
  integration ids such as `github_app` / `vcs_access_token`, and the synthetic
  `code_index` (a successful repository index).
- **`semantics`**
  - **`all_of`** — every id in `missing` is required.
  - **`any_of`** — the VCS-provider candidates in `missing` are alternatives:
    **either** `github_app` **or** `vcs_access_token` satisfies the VCS
    requirement (this is the "provider unknown" case). When `code_index` also
    appears, it remains separately required — `semantics` describes only the VCS
    provider candidates, and a code index is always mandatory in addition.

The three readiness dimensions `configured` / `learned` / `indexed` are reported
independently. `indexed` may be `true`, `false`, or `null` — a `null` means the
index status could not be confirmed and must **not** be read as "indexed".

## The integrations

| Integration id | What it is | What it unlocks |
| --- | --- | --- |
| `jira` | Jira API access | Ticket reads/writes, estimation and review automations, status transitions. |
| `github_app` | GitHub App installation | Pull requests, code review, and private-repo parsing on GitHub projects. |
| `vcs_access_token` | VCS access token | Pull requests, code review, and private-repo parsing on Bitbucket projects. |
| `vcs_webhook` | VCS webhook secret | Merge webhooks and CI follow-up triggers. |
| `code_index` | A successful repository index | Codebase-grounded planning, architecture, reimplementation, and technical/discovery AI councils. Produced by `/parse-repository`. |

A project's `github_app` **or** `vcs_access_token` provides the VCS connection;
which one applies depends on the project's version-control system. When the
project's provider is unknown, either credential satisfies the requirement — the
report expresses that as `semantics: any_of`.

## The gates, by capability

### Pull requests and CI (BLOCK on VCS)

Tools like `create_pull_request`, `resolve_ci_checks`, `poll_ci_checks`, and
`fresh_base` are **unavailable** (`BLOCK`) until a VCS connection is
configured. They act directly on the version-control host, so without a
connection there is nothing for them to talk to.

### Repository indexing and maps (BLOCK on VCS)

`parse_repository` and `regenerate_directory_map` need a VCS connection to read
the repository. They **BLOCK** until VCS is connected.

### Codebase-grounded generation (BLOCK on VCS **and** a code index)

Planning and architecture tools — `generate_plan_direct`,
`generate_architecture_direct`, `request_reimplement_context`,
`code_writer_generate_plan`, `code_writer_generate_architecture`, and
`create_doc` for **TDD** / **architecture** documents — ground their output in
your indexed codebase. They **BLOCK** until BOTH a VCS connection AND a
successful code index exist (`all_of`, with `code_index` in `missing`).

### AI Council (BLOCK on a code index, mode-dependent)

`request_council` in **technical** or **discovery** mode searches your indexed
codebase, so it **BLOCK**s on `code_index`. **Design**-mode AI council requests never
query the index and are never gated.

### Document generation that DEGRADEs (usable without codebase context)

Tools like `generate_prd_direct`, `generate_fsd_direct`,
`code_writer_generate_fsd`, `generate_clarifying_questions_direct`,
`generate_ticket_critique_direct`, `generate_ticket_review_direct`, and
`create_doc` for **PRD** / **FSD** documents **DEGRADE** rather than block: they
run today from the ticket alone, and connecting VCS simply lets them ground their
output in your codebase. They always appear under "Tools you can use now", with a
reduced-context caveat when the VCS connection is missing.

### Never gated

Setup and bootstrap tools (`ping`, `config_field`, `get_install_manifest`,
`apply_install_manifest`, `persist_routing_credential`, and the
bootstrap-invite exchange) are always available — they
are how you configure everything else.
