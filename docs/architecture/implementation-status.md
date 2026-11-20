# Implementation status

Updated 2026-11-20.

## Built in this repository

- Modular TypeScript monolith with React/Vite client, versioned Hono API, shared contracts, AI provider boundary and workflow state model.
- Supabase Auth sign-in, sign-up, refresh and sign-out; membership selection; workspace setup; role and module checks in API; tenant-scoped RLS and constrained database functions.
- Buildicy Back Office for client workspace creation, AI Funnel module assignment, service-package assignment (Starter, Growth, Custom), platform-wide operations metrics, failed workflow monitoring, and Supabase owner invitations. Platform admin bootstrap is documented in the root README.
- Durable funnel creation, editing/versioned page copy and field configuration, publish/deactivate, public lookup, page view tracking, visitor conversion rate analytics, and submission. Submission validates published status, module entitlement, consent, configured fields, idempotency and per-IP rate window before transactionally creating lead, submission, activity and follow-up jobs.
- Client portal dashboard, lead search/status management, lead detail with form answers/activity/latest qualification, funnel conversion performance, source-level lead counts, AI qualification review, booking request tracking, funnel authoring, booking URL setup and multi-step follow-up sequence authoring/activity views.
- Interactive lead qualification conversations with persistent message history across Lead, Assistant, and Team roles. AI drafts contextual qualification responses and questions with human review gates (Approve & Send / Reject) before dispatch.
- Business knowledge base with document ingestion (txt, md, csv, json), inline editing, approval toggle for AI context, and document removal.
- AI reply draft generation is available from lead detail when email consent exists. Drafts are logged, shown for human review and never auto-sent.
- AI qualification adapter with configurable model/prompt/business context, structured output validation, timeout/retry, confidence-based human review and persisted results.
- Consent-aware scheduled email dispatch with provider idempotency, durable execution state and transient retry; Resend adapter; Cloudflare scheduled entry point and local timer.
- Supabase migrations for tenant data, RLS, authorized operations, durable dispatcher, Back Office, knowledge base, conversations, and funnel page view tracking. Concierge and Growth Engine boundaries and extension plans are documented.
- Automated test suite covering contracts, workflow state machine, funnel intake, page view conversion analytics, knowledge CRUD, conversation message persistence & AI drafts, and back office operations. 12 automated tests pass locally.

## Not yet a fully production-operated service

- Migrations have not been applied to a user Supabase project, and no Supabase, AI, email, Cloudflare or domain credentials were supplied. Real persistent/Auth/RLS/provider flows therefore cannot be exercised in this workspace.
- The first platform administrator must be bootstrapped in Supabase SQL Editor. The Back Office currently covers workspace creation, one available module entitlement and owner invitations; package assignment, client-wide lead access, global monitoring, usage dashboards and retention/deletion controls remain to build.
- AI currently classifies/scores leads and drafts a response for review. It does not conduct a qualification conversation, use a document knowledge base, enforce configurable spend ceilings, or provide provider fallback/tool calling.
- Email follow-up is implemented for Resend; internal notifications are recorded locally. No native calendar sync, WhatsApp, SMS, inbound email, webhook signature flow, or automatic appointment confirmation is included. Booking requests are explicitly distinct from confirmed appointments.
- Lead list currently loads a bounded recent set; full pagination, funnel conversion analytics, package assignment, platform-wide lead access, operational error/usage dashboards and retention/deletion controls remain outstanding.
- Automated checks do not replace live database migration, RLS tenant-isolation, provider failure, browser end-to-end, recovery or deployment verification. Those need configured services and credentials.

## Production setup gates

1. Apply all `supabase/migrations` in filename order to a dedicated project and run the documented admin bootstrap.
2. Configure Auth redirect/site URLs and invitation email delivery, plus server-only Supabase URL/anon/service-role secrets.
3. Configure approved AI model/provider and a verified Resend sender; validate privacy/data-use terms before using real prospect data.
4. Deploy Worker Cron and the client site with the production origin, then exercise signup/invitation, cross-tenant authorization, public intake/rate limits, qualification review, consent revocation, retries and booking records against synthetic data.
5. Set backups, retention/deletion process, observability and incident/recovery ownership before onboarding real clients.

The future AI Lead Concierge and Complete AI Growth Engine are architecture-ready only; they are intentionally not implemented in this phase.
