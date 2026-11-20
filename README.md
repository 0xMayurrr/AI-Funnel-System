# Buildicy Platform

Buildicy's modular platform for turning more existing enquiries into qualified booked conversations. The AI Funnel System is the first module; Lead Concierge and Complete AI Growth Engine remain planned modules on the shared platform registry.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Open the Vite address printed by the command (normally `http://localhost:5173`). The API runs at `http://localhost:8787`; Vite proxies `/api` requests to it. The seeded Growth consultation funnel accepts submissions at `/public/growth-consultation`.

Without Supabase values, the app starts in temporary demo mode. Data is kept in API process memory and is lost when it restarts. Do not use demo mode for real prospect information.

For persistent local development:

1. Create a Supabase project and apply every migration in `supabase/migrations` in filename order.
2. Copy `.env.example` to `.env` and set the project URL and publishable/anon key. Set the service-role key only for the server-side public intake RPC, scheduled dispatcher, and Back Office invitations; it is never sent to the browser.
3. In Supabase Auth settings, configure the local app URL and email confirmation behavior.
4. In Supabase SQL Editor, after creating the user who will operate Buildicy Back Office, grant the initial platform administrator role (replace the email):

   ```sql
   insert into public.platform_admins(profile_id)
   select id from auth.users where lower(email)=lower('admin@example.com');
   ```

5. Configure Supabase Auth site/redirect URLs and invitation email delivery. Run `npm run dev`; client accounts can sign up and create a workspace, while the platform administrator can create and invite client workspaces through Back Office.

The API uses the caller's Supabase JWT for PostgREST reads and permission-checked RLS writes. Public submissions use a narrowly scoped database function that validates publication, consent, fields, idempotency and a per-funnel/IP rate window, then writes the lead, submission, activity and active follow-up schedules in one transaction. Funnel creation/publishing, workspace creation, lead status changes, and booking requests use permission-checking database functions.

AI qualification is provider-independent at the domain boundary and currently includes an OpenAI-compatible adapter. Set `AI_API_URL` and `AI_API_KEY` as server environment secrets, then configure a model and approved business context in Workspace settings. AI results are schema-validated and saved for review; low-confidence results are explicitly marked for human review and do not change lead status automatically.

Follow-up sequences are durable database records dispatched on a one-minute Cloudflare Cron Trigger (or local API timer). The initial email adapter supports Resend. Set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` server-side before activating a sequence. Each action checks the current consent/opt-out state immediately before delivery, uses a stable idempotency key, records outcomes and retries transient failures up to `MAX_ACTION_ATTEMPTS`. Provider API details are in the [Resend email API guide](https://resend.com/supabase). The provider is optional and may incur usage charges.

Set `MAX_SEQUENCE_STEPS` server-side to tune the sequence authoring limit for your deployment (defaults to 20). The database has a separate high technical payload guard.

For Cloudflare, set the Supabase URL, anon key, service-role key, AI/email provider keys and sender address as Worker secrets, set `DEMO_MODE=false` and the actual `APP_ORIGIN`, deploy the API with `wrangler deploy`, then deploy the Vite `dist` directory to Pages. Production fails closed if Supabase is not configured. Review plan quotas, database backups and recovery before launch.

## Build

```sh
npm run build
```

## Architecture and status

- [Architecture proposal and decisions](docs/architecture/proposal.md)
- [Implementation status and deployment gates](docs/architecture/implementation-status.md)
- [System architecture diagram](docs/architecture/system-architecture.mmd)
- [Database ERD](docs/architecture/database-erd.mmd)
- [Initial Supabase migration](supabase/migrations/202611200001_platform_funnel_foundation.sql)

Private AI, email, calendar and Supabase service credentials must be stored only as server-side secrets. No real AI provider or email integration is enabled. Booking confirmation is not inferred from link clicks.
