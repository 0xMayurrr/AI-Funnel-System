# Buildicy Platform Architecture Proposal

**Status:** Approved by user on 2026-11-20; initial implementation underway.  
**Product source:** supplied Buildicy platform brief.  
**Repository baseline:** project directory contained no existing files.

## 1. Executive proposal

Build one TypeScript modular monolith with a shared platform core and three registered modules. Ship the AI Funnel System first. Treat the Back Office and client workspace as permission-scoped surfaces over the same API and domain model, and serve public funnel pages through a narrowly scoped public API. Keep the Lead Concierge and Growth Engine as registered-but-not-built extension points.

Recommended initial deployment: React/Vite static frontend on Cloudflare Pages, versioned Hono API on Cloudflare Workers, and Supabase Auth/PostgreSQL with RLS. Keep provider secrets and privileged database access in server-side secrets. Use PostgreSQL for durable workflows and a scheduled Worker/queue adapter only when the initial workflow needs warrant it. Avoid introducing a separate queue vendor or microservices before measured need.

The first release should establish tenant identity, membership and roles, module entitlements, funnels/forms, leads and activity, qualification/scoring, workflow execution records, booking links, notifications, and operational analytics. Architecture deliberately reserves conversation/channel/knowledge seams for Concierge and pipeline/automation seams for Growth Engine without prematurely implementing their product behavior.

## 2. Product domains and boundaries

### Shared platform core

- **Identity and access:** Supabase Auth identity, Buildicy profile, tenant membership, roles, permission checks, and service-side authorization.
- **Workspace and entitlements:** client workspace lifecycle, service package, module registry and per-workspace enabled module configuration.
- **Lead record:** canonical prospect, source, consent/preferences, status, qualification result and score. Funnel submissions create or update leads through an explicit deduplication policy.
- **Activity and audit:** append-only business activity and security-relevant audit events with actor, workspace, target, and timestamp.
- **AI runtime:** provider-neutral request contract, provider adapters, prompt/config versions, validation, policy checks, redacted telemetry and usage events.
- **Workflow runtime:** durable definitions/versions, execution state, scheduled actions, idempotency, retry state, and operator-visible failures.
- **Integration and notification ports:** credentials stored server-side, provider adapters, delivery records, and normalized outcomes.
- **Analytics:** tenant-filtered aggregate queries over durable product events and records; no separate analytics warehouse initially.

### Module A — AI Funnel System (build now)

Owns funnel configuration, pages, forms/fields, public publication, submission intake, qualification rules, scoring criteria, follow-up sequence configuration, booking link configuration, and funnel/lead operational views. It calls the shared Lead, AI, Workflow, Notification, and Activity capabilities. AI recommendations are persisted as validated results; only deterministic application policy may change status, schedule an action, or send a message.

### Module B — AI Lead Concierge (later)

Owns conversations, channel-specific sessions, messages, approved knowledge sources/documents, handover requests, and conversation summaries. It reuses workspace entitlements, lead identity, AI runtime, qualification/scoring, booking, notifications, activity, usage, and workflow execution. Add channel adapters behind a normalized inbound/outbound message interface. Do not build the conversation product in this phase.

### Module C — Complete AI Growth Engine (later)

Owns pipeline definitions/stages, lead assignment/routing rules, automation authoring and orchestration, campaign/action policies, monitoring and business performance views. Reuses canonical leads, activities, workflow runtime, scheduled actions, notifications, integrations, audit, and analytics. New pipeline and automation domain tables should link back to workspace and lead IDs; no separate CRM lead store.

### Module registration

Use a typed registry keyed by stable codes (`ai_funnel`, `lead_concierge`, `growth_engine`), each declaring metadata, required permissions, navigation contributions, and route/API capability identifiers. Workspace entitlements are data, not code branches. Server middleware resolves membership, permissions, and enabled-module entitlement before module handlers run. Unknown or disabled module codes fail closed. Initial deployment registers only the Funnel module as available; future registry entries can ship independently.

## 3. System architecture

See [system-architecture.mmd](./system-architecture.mmd). The major runtime boundaries are:

1. **Back Office UI** for Buildicy staff; platform-level access is separately granted and audited.
2. **Client Portal UI** for workspace members; every request is workspace-scoped server-side.
3. **Public Funnel UI** for published pages; it receives only public funnel configuration and submits through rate-limited, validated endpoints.
4. **Versioned Hono API** hosting identity context, policy enforcement, module routing, domain services, provider ports, and webhook handlers.
5. **Supabase Auth/PostgreSQL** for identity and durable state, with RLS as defense in depth and server-side authorization as the application boundary.
6. **External adapters** for AI, email, booking, and future messaging. Each adapter normalizes outcomes and never owns domain policy.

### Suggested source layout

```text
apps/
  web/                 # shared React/Vite shell; role-scoped back office and portal
  public-funnel/       # public rendering/submission entry; can be same build initially
worker/
  src/routes/v1/       # REST route composition and versioning
  src/middleware/      # auth, workspace, permissions, module entitlement, rate limit
  src/jobs/            # scheduled task entry points
packages/
  contracts/           # shared Zod request/response schemas and generated types
  platform/            # workspace, membership, entitlements, audit, activity
  ai-core/             # provider interfaces, policy, validation, telemetry
  workflow-core/       # execution state machine, idempotency, retry scheduling
  integrations/        # ports and provider adapters
  database/            # migration/type generation helpers
  ui/                  # shared design system
modules/
  ai-funnel/           # domain services, schemas and UI routes for Funnel
  lead-concierge/      # future; absent until approved
  growth-engine/       # future; absent until approved
supabase/migrations/
docs/
```

This is a logical organization, not a mandate to create empty packages. Start as a single deployable API and web app, split build packages only when code ownership or deployment needs justify it.

## 4. Data model and ERD

See [database-erd.mmd](./database-erd.mmd). All tenant-owned rows carry `workspace_id`; composite foreign keys (for example `(workspace_id, funnel_id)`) prevent cross-tenant references even if an application bug supplies a foreign object ID. Globally shared identities and module catalog are not tenant-owned. Use UUID primary keys, UTC timestamps, explicit status enums/check constraints, and indexes aligned to tenant-scoped list queries.

### Initial entities

- `workspaces`, `profiles`, `workspace_memberships`, `roles`, `permissions`, `role_permissions`
- `module_catalog`, `workspace_modules`, `service_packages`
- `funnels`, `funnel_pages`, `forms`, `form_fields`, `funnel_publication_versions`
- `leads`, `form_submissions`, `lead_activities`, `qualification_rules`, `scoring_rules`
- `followup_sequences`, `followup_steps`, `workflow_executions`, `scheduled_actions`
- `booking_configs`, `booking_requests`, `appointments` (appointment confirmed only when verified from an integration)
- `integration_connections`, `ai_configurations`, `ai_prompt_versions`, `ai_usage_records`
- `notifications`, `activity_logs`, `idempotency_keys`

For future readiness, define separate future migrations for `conversations`, `messages`, `knowledge_sources`, `knowledge_documents`, and `human_handoffs` (Concierge); and `pipelines`, `pipeline_stages`, `lead_assignments`, `workflow_definitions`/versions, and integration sync state (Growth Engine). These are not required in initial migrations. Avoid storing provider secrets in these tables; persist secret references and encrypted metadata, with actual secret values in Workers secrets or a dedicated secret store.

### Lead identity and duplicate handling

Treat each valid form submission as an immutable submission record. A workspace-scoped dedupe key is calculated from normalized contact identifiers (email/phone) only when the relevant value and consent policy permit. Use a configurable matching policy; never merge records across workspaces. On match, attach a new submission to the existing lead and append an activity. On no match, create a lead. Preserve original source and submission data for reporting. Ambiguous matches should remain separate or be flagged for review rather than silently merging people.

### RLS and query safety

Enable RLS on every tenant-owned table. A stable database helper resolves the authenticated user's workspace membership using `auth.uid()` and grants access only to member workspace IDs; policy operations are role-aware where appropriate. Public submission uses a narrowly privileged server-side function/API path that validates a published funnel, applies rate limits and writes only allowed submission/lead/activity records. Do not expose anonymous table write policies. A server-side Worker uses user-scoped Supabase JWT access for normal user operations so RLS remains active. Any service-role operation is isolated to tightly reviewed tasks, never based solely on client-supplied workspace IDs, and performs an explicit authorization check. Add cross-workspace composite constraints and tenant-isolation integration tests before release.

## 5. API contract outline

REST base path: `/api/v1`. JSON, UTC ISO-8601 timestamps, cursor pagination, consistent problem response (`type`, `title`, `status`, `code`, `request_id`, field errors), Zod validation at boundaries. Authenticated routes derive actor and workspace from verified session and membership; do not accept a workspace ID as proof of access. Back Office operations require explicit platform permissions and audit records.

### Public

- `GET /public/funnels/{slug}` — published, allowlisted page/form configuration only.
- `POST /public/funnels/{slug}/submissions` — validate fields/consent, verify publication, rate limit and idempotency token, persist submission and lead, enqueue/record qualification work; return opaque receipt, never lead details.

### Workspace/client

- `GET /workspaces/current`, `GET /workspaces/current/modules`
- `GET|POST /funnels`, `GET|PATCH|DELETE /funnels/{id}`, `POST /funnels/{id}/publish`, `POST /funnels/{id}/deactivate`
- `GET|POST /funnels/{id}/forms`, `PATCH /forms/{id}`, `GET /funnels/{id}/submissions`
- `GET /leads?cursor=&limit=&status=&source=&q=`, `GET /leads/{id}`, `PATCH /leads/{id}`
- `GET /leads/{id}/activities`, `POST /leads/{id}/activities` (only supported activity types)
- `GET|PUT /qualification/config`, `GET|PUT /followup-sequences`, `GET|PUT /booking-config`
- `GET /analytics/overview?from=&to=`, `GET /analytics/sources?from=&to=`
- `GET /workflow-executions?state=`, `GET /workflow-executions/{id}`, `POST /workflow-executions/{id}/retry` (permission and retry-policy guarded)
- `GET /integrations`, `POST /integrations/{provider}/connect`, `DELETE /integrations/{id}`

### Buildicy back office

- `GET|POST /admin/workspaces`, `GET|PATCH /admin/workspaces/{id}`
- `GET|PUT /admin/workspaces/{id}/modules`
- `GET|POST /admin/workspaces/{id}/memberships`, `PATCH /admin/workspaces/{id}/memberships/{membershipId}`
- `GET /admin/workflow-executions`, `GET /admin/activity`, `GET /admin/usage`

Webhook endpoints are provider-specific under `/api/v1/webhooks/{provider}`; verify signatures against raw request bytes, enforce replay windows/idempotency, and resolve workspace only from a verified integration mapping. No generic unauthenticated administrative endpoint.

## 6. AI provider-independent design

Define a provider port around normalized `GenerateRequest` and `GenerateResult` contracts. Requests include model/provider selection from server-owned configuration, system/business context references, prompt version, typed output schema, optional tool declarations, provider capability requirements, timeout/retry budget, and privacy policy. Results contain validated structured data, finish reason, provider/model identifiers, usage metrics when available, and normalized errors. Adapters implement provider-specific request construction, capability reporting (structured output, tools, context limits), timeout and retry mapping.

The domain service first checks tenant entitlement and usage budget, loads approved context, chooses a configured provider/model only if capabilities meet requested requirements, invokes the adapter, validates output against Zod schema, then applies deterministic confidence/risk rules. Invalid output is discarded or retried within configured policy. Sensitive actions (send communication, change consent/status, book/confirm) require an allowlisted deterministic action and, when configured as sensitive/uncertain, human review. Model output never supplies authorization, tenant identity, provider credentials, or executable SQL/code.

Prompts and settings are versioned and tenant scoped. Logging is metadata-first; redact or omit raw contact data and prompt content by default. Record provider, model, prompt/config version, latency, status, token counts/cost when returned, and correlation ID in usage telemetry. Configurable limits live in workspace/provider policy, not business logic constants. Provider-specific context/tool limits are queried from adapter capabilities/configuration; a suitable alternative provider may be selected only through explicit fallback policy. If providers fail, persist a recoverable execution failure and do not perform the dependent business action.

Initial implementation can ship an interface and a disabled-by-default adapter configuration until credentials and data-use/privacy review are supplied. Use synthetic records in development. No provider is selected as a permanent product dependency.

## 7. Authentication, authorization and security controls

- Supabase Auth handles sign-in, password recovery and session lifecycle. Profile is separate from auth identity.
- Membership is the source of workspace access. Roles map to explicit permissions, not UI visibility alone. Suggested roles: Buildicy platform admin/support; workspace owner/admin; workspace operator; read-only analyst. Support access is least-privilege and audited.
- Every route authorizes the actor, workspace membership, permission, and module entitlement before domain work. Object-level lookups include workspace scope; composite FKs provide another layer.
- RLS is enabled and tested on all tenant-owned tables. Public funnel reads expose only published allowlisted fields. Public writes go through validated server endpoint; rate limiting, abuse controls and idempotency required.
- Validate and normalize all input; escape rendered user content; enforce upload/content policies if uploads are later added. Set security headers and CORS allowlists. Secrets exist only in Worker secrets/secret manager.
- Verify webhook signatures using raw body, timestamp/replay window and constant-time compare; persist idempotency keys for webhook and scheduled actions.
- Follow-ups check channel consent, opt-out, quiet hours and current lead state immediately before delivery. Persist opt-out state and stop pending sequence actions. Never interpret AI text as consent.
- Audit administrative changes, module entitlement changes, credential changes, human approval, deletion and access events. Keep business activity distinct from security audit.
- Define retention/deletion policies for leads, submissions, prompts and usage. A workspace deletion workflow must remove or anonymize tenant data, revoke integration credentials, and record completion without retaining unnecessary personal data.
- Operational recovery: database backups/PITR availability depends on selected Supabase plan; document restore drills and export policy before production. Alert on failed scheduled actions, webhook signature failures, provider errors and database saturation.

## 8. Funnel implementation roadmap

### Increment 1 — foundation

Create repo/workspace conventions, environment validation, shared typed contracts, Supabase migrations, Auth integration, workspace/membership/RBAC, module catalog/entitlements, RLS policies, audit/activity primitives, and minimal Back Office/client portal shells. Configure separate development and production projects; synthetic data only.

### Increment 2 — funnel authoring and publishing

Implement funnel CRUD, page content schema, forms/fields, preview, draft/published versioning, public slug resolution, publish/deactivate controls, and public submission endpoint. Add validation, rate limits, public data allowlist and idempotency. A client can create a funnel and share its URL.

### Increment 3 — leads and operations

Implement submission persistence, workspace dedupe policy, lead list/detail/search/filter/pagination, qualification answers, status transitions, activity history, source attribution, and tenant isolation checks. Add booking link configuration and distinguish booking request from confirmed appointment.

### Increment 4 — qualification and AI

Implement configurable qualification questions and deterministic scoring first. Add provider port, schema-validated classification/summary, uncertainty handling, usage logging and safe failure state. Add human review for uncertain or sensitive outcomes. Do not send production client data until provider terms and workspace consent settings are configured.

### Increment 5 — follow-up and notifications

Implement versioned sequence/steps, durable action state, scheduled dispatch, consent re-check, idempotency, retry/backoff policy, provider adapters and delivery outcomes. Add operator retry and failure visibility. External email/booking integration selection remains configurable.

### Increment 6 — dashboard and release readiness

Add tenant-scoped operational metrics: total/qualified/unqualified leads, pending/completed follow-ups, booking requests, confirmed bookings only where integration confirms, source performance. Add cursor pagination, API and UI error/loading/empty states, accessibility, rate-limit monitoring, tenant isolation/API/security integration coverage, deployment/env docs and backup/restore procedure.

No release should claim end-to-end AI or notification functionality until real configured adapters and their failure paths are exercised. No tests have been run because implementation has not begun.

## 9. Cost, scalability and integration risks

| Area | Initial choice | Risk / trigger to revisit |
|---|---|---|
| Cloudflare Pages/Workers | Low-cost static delivery and stateless API; good geographic reach | Runtime, CPU, request, cron and queue quotas vary by plan and change over time; validate current limits before launch. Move long-running work to a durable queue/worker pattern when retries or execution duration exceed request lifecycle. |
| Supabase | Managed Postgres/Auth and RLS accelerate a small team | Free tier is not an unlimited production guarantee; availability, backup/PITR, compute, storage and egress depend on plan. Upgrade before production workloads require SLA/recovery guarantees. Keep queries/indexes and migrations portable PostgreSQL. |
| AI providers | Adapter interface and explicit policy | Costs and capabilities differ by model and change; establish per-workspace budgets, redact data, monitor token usage and evaluate terms before enabling. Avoid fallback that changes data handling without consent. |
| Email/messaging | Adapter contracts, start with one selected provider | Deliverability, domain verification, opt-out/legal requirements and per-message cost. Do not promise WhatsApp until approved provider/API and templates are configured. |
| Calendar booking | External booking link initially | Link click/request is not confirmation. Native calendar integration adds OAuth scopes, token refresh, webhook and conflict handling. |
| Multi-tenant data | RLS plus server authorization and composite tenant FKs | Policy mistakes can expose records. Require automated cross-tenant tests, least-privilege DB clients, and review of every migration/policy. |
| Scheduled follow-up | Durable database state and scheduled dispatcher | Cron alone is not an exactly-once queue. Require idempotency, lease/claim strategy, retry state and dead-letter visibility; use managed queue when operational volume warrants. |
| Analytics | Indexed Postgres aggregates | Heavy reports may affect operational queries; use bounded date ranges, pagination/materialized aggregates when measured, then a warehouse only if needed. |
| Public forms | Worker validation and throttling | Abuse/spam and large bursts; add rate limits, bot controls, payload limits and alerting. Avoid storing unnecessary personal data. |

Paid infrastructure is not required to write or locally develop the first increment. Production suitability depends on verified current plan limits, uptime and recovery needs, expected traffic, data retention and provider contracts. The brief's preferred stack is adopted as a proposal, not a guarantee of permanent free hosting.

## 10. Future-module addition plans

### AI Lead Concierge

Add conversation/channel/participant/message/knowledge/handoff schema; channel adapters for approved web chat, email and messaging provider; tenant knowledge ingestion with access/retention controls; conversation-level context assembly; AI response policy and human handoff queues. Conversations link to canonical leads when confidently matched and reuse qualification, scoring, booking and notifications. New route family `/api/v1/conversations` and channel webhook handlers. No schema rewrite of leads or AI usage is required.

### Complete AI Growth Engine

Add pipeline and stage definitions, stage history, lead assignments, routing rules, workflow definitions/versions/triggers/actions, execution observability, integration sync state and reporting. Use shared workflow runtime and canonical lead/activity/consent records. All automation actions remain permission-checked, idempotent and consent-aware. Add route families `/pipelines`, `/assignments`, `/automation-definitions`; no separate CRM or workflow engine is required initially.

## 11. Decisions requiring review

The implementation can proceed on these defaults unless review changes them:

1. One React/Vite application with role-specific route trees and public funnel route; split deployments only for operational isolation later.
2. Supabase Auth/PostgreSQL; user JWT access for portal operations, RLS enabled everywhere tenant-owned, no anonymous database table writes.
3. Cloudflare Pages + Workers as initial hosting target, subject to current quota and deployment feasibility review.
4. External booking link only in initial booking support; appointment confirmation requires integration evidence.
5. AI adapter is provider-neutral; first concrete provider and email delivery provider chosen during foundation implementation after credentials, privacy terms and deployment target are known.
6. Contact-based dedupe is workspace scoped and configurable; ambiguous matches do not auto-merge.
7. Follow-up workflow defaults and consent/quiet-hour policy must be approved per workspace before delivery is enabled.

**Approval gate:** approved to begin on 2026-11-20. The first scaffold and migration are implemented; see [implementation status](./implementation-status.md) for completed and outstanding work before any production use.
