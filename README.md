# Buildicy AI Funnel Systems

> **Enterprise AI Funnel & Lead Concierge Platform (Done-For-You Agency Model)**
> 
> Buildicy empowers agencies to deliver high-converting, AI-qualified lead funnels and WhatsApp automation to non-technical business clients (e.g., Real Estate Brokers, B2B SaaS, Professional Services, Clinics).

---

## 📑 Table of Contents
1. [Core Philosophy: Done-For-You (DFY) Model](#-core-philosophy-done-for-you-dfy-model)
2. [Platform Architecture & Portals](#-platform-architecture--portals)
3. [Credentials & Quick Access](#-credentials--quick-access)
4. [What Was Built & Implemented](#-what-was-built--implemented)
5. [End-to-End Real Client Workflow](#-end-to-end-real-client-workflow-how-it-works-with-real-clients)
6. [Database & Supabase Persistence](#-database--supabase-persistence)
7. [Local Setup & Running](#-local-setup--running)
8. [Automated Verification & Tests](#-automated-verification--tests)

---

## 💡 Core Philosophy: Done-For-You (DFY) Model

Most business owners (real estate brokers, dentists, consultants) **have zero technical knowledge**. They cannot build funnels, configure webhooks, write prompt templates, or wire n8n/Zapier automations. 

**Buildicy solves this through strict role separation:**
- **Agency Back Office (`/admin`)**: The agency does **100% of the technical heavy lifting** (creating workspaces, configuring AI criteria, publishing custom landing funnels, monitoring platform uptime, and resolving client tickets).
- **Client Portal (`/`)**: A clean, distraction-free **spectator dashboard** where clients view incoming qualified leads, review WhatsApp AI conversations, view their visual automation pipeline, and submit change requests with 1 click. Clients **never** risk breaking funnels or backend settings.

---

## 🏛 Platform Architecture & Portals

```
                         ┌───────────────────────────────────┐
                         │      Dedicated Login Gateway      │
                         │             /login                │
                         └─────────────────┬─────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
┌───────────────────────────────────┐             ┌───────────────────────────────────┐
│        Agency Back Office         │             │           Client Portal           │
│              /admin               │             │                 /                 │
├───────────────────────────────────┤             ├───────────────────────────────────┤
│ • Multi-Tenant Client Workspaces  │             │ • Spectator KPI Cards & Trends    │
│ • DFY Funnel Builder & Publisher  │             │ • Real Estate Leads CRM           │
│ • Client Change Request Queue     │             │ • Live WhatsApp AI Chat Simulator │
│ • Business Knowledge Base & AI    │             │ • Visual n8n Automation Engine    │
│ • Service Packages (Starter/Grow) │             │ • 1-Click "Request Change" Modal  │
└───────────────────────────────────┘             └───────────────────────────────────┘
                  │                                                 │
                  └────────────────────────┬────────────────────────┘
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            Hono Cloudflare Worker API                               │
│                         /api/v1 (Routes, Auth, Intake)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ • Supabase Postgres Database (RLS, Profiles, Workspaces, Leads, Funnels, Tickets)   │
│ • Live OpenAI GPT-4o Qualification Engine (AI_API_KEY)                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Credentials & Quick Access

The application features dedicated logins and isolated accounts:

| Portal | Dedicated URL | Login Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Agency Back Office** | [`/admin`](http://localhost:5173/admin) | `admin@buildicy.com` | `Password123!` | **Agency SuperAdmin**: Full platform control, client workspaces, DFY funnel publisher, ticket queue. |
| **Client Portal** | [`/`](http://localhost:5173/) | `client@prestigerealty.com` | `Password123!` | **Prestige Luxury Realty (Broker)**: Spectator KPI cards, lead list, WhatsApp AI chat, change request modal. |
| **Login Gateway** | [`/login`](http://localhost:5173/login) | *(Both accounts)* | `Password123!` | Unified gateway with 1-click credential cards or email/password form. |
| **Public Funnel Demo**| [`/public/luxury-villa-inquiry`](http://localhost:5173/public/luxury-villa-inquiry) | *Public* | *None* | High-converting public prospect capture page. |

---

## 🚀 What Was Built & Implemented

### 1. Dedicated Login Page & Full Portal Separation
- Created `src/ui/login/LoginPage.tsx` with dedicated cards for **Agency Back Office** and **Prestige Luxury Realty Client Portal**.
- Removed confusing demo banners from headers. Each portal features an authoritative top bar displaying current user credentials, tenant role, and an instant **Sign Out** button that clears session tokens and redirects to `/login`.
- Unauthenticated visitors are automatically routed to `/login`.

### 2. High-End UI/UX Matching Reference Designs
- **Modern KPI Cards**: Designed with inline mini vertical bar charts displaying real estate pipeline activity.
- **Lead Alert Strip**: Highlights top active leads with avatars and 1-click WhatsApp outreach.
- **Revenue Trend Bar Chart**: Visualizes monthly earnings and pipeline growth.
- **Top Acquisition Sources Donut**: Breakdown of leads by channel (Organic Search, Meta/Instagram Ads, WhatsApp, Direct).
- **Visual n8n-Style Workflow Engine**: Interactive node canvas displaying:
  1. Trigger (`Form Submission` / `Meta Ad Click`)
  2. Action (`WhatsApp Instant Hello`)
  3. AI Brain (`OpenAI GPT-4o Qualification`)
  4. Condition Router (`Budget >= $1M?`)
  5. Calendar Link (`Cal.com / Calendly Dispatch`)

### 3. Done-For-You Real Estate Demo Suite
- Pre-seeded luxury brokerage: **Prestige Luxury Realty** (South Florida).
- Pre-built live funnels:
  - `luxury-villa-inquiry`: Exclusive Waterfront & Off-Market Luxury Properties.
  - `downtown-penthouse-tour`: High-Rise Penthouses & Pre-Construction Access.
- Pre-loaded qualified high-ticket leads:
  - **Marcus Vance** (Vance Luxury Estates) – $3.5M cash approved, 30-day close.
  - **Sophia Martinez** (Skyline Holdings) – $4.2M capital for 1031 tax exchange.
  - **David Sterling** (Sterling Capital) – $2M mortgage pre-approval in hand.

### 4. Live AI Qualification & WhatsApp Simulation
- Connects directly to OpenAI GPT-4o via `worker/src/app.ts` (`AI_API_KEY`).
- Validates prospect answers against approved business knowledge guidelines (e.g., minimum budget thresholds, closing timeline, accredited buyer proof of funds).
- Live WhatsApp simulator allowing clients to test conversational AI replies in real time.

### 5. Client Change Request Queue (Agency Ticketing)
- Clients submit landing page tweaks, questionnaire revisions, or WhatsApp channel requests directly from their dashboard.
- Tickets immediately appear in the Agency Back Office queue with priority tags (`High`, `Urgent`), allowing the agency to review, edit the live funnel, and mark the ticket `Completed`.

---

## 💼 End-to-End Real Client Workflow (How It Works With Real Clients)

Here is exactly how an agency deploys Buildicy for a paying client:

### Step 1: Create Client Workspace in Back Office
1. Agency SuperAdmin logs into [`/admin`](http://localhost:5173/admin).
2. Click **+ New Client Workspace**.
3. Enter client business name (e.g., *Prestige Luxury Realty*) and URL slug (`prestige-realty`).
4. Select Service Package: **Growth Package** (includes AI Funnel System + Lead Concierge + WhatsApp Engine).
5. The client tenant is now isolated and provisioned.

### Step 2: Ingest Business Knowledge & AI Qualification Rules
1. In Back Office, open the **Knowledge & AI Rules** tab.
2. Ingest the client's guidelines and service criteria:
   - *"Minimum purchasing budget for private showings is $1,000,000."*
   - *"Pre-approval or proof of funds required for off-market listings."*
   - *"Turnaround time is 30 to 60 days. Rental inquiries under $5,000/mo are disqualified."*
3. Connect the client's booking link (e.g., `https://calendly.com/prestige-realty/private-vip-tour`).
4. The AI Brain is now trained on this client's rules.

### Step 3: Build & Publish the Funnel (DFY by Agency)
1. In Back Office under the client's workspace, click **Setup Funnel (DFY)**.
2. Enter Headline: *"Exclusive Waterfront & Off-Market Luxury Properties"*.
3. Add form questions tailored to qualifying high-net-worth buyers:
   - Full Legal Name
   - Direct Email & Mobile / WhatsApp Number
   - Purchasing / Investment Budget ($1M–$3M, $3M–$5M, $5M+)
   - Property Criteria (Bedrooms, location, timeline)
   - Mandatory consent checkbox for WhatsApp communication.
4. Click **Publish Live**. The funnel is instantly accessible at `buildicy.com/public/[slug]`.

### Step 4: Connecting Traffic (Meta Ads, Instagram, Website)
- **Meta / Instagram Ads**: The agency places the public funnel link in client ads or configures the Meta Lead Gen webhook.
- **Client Website**: The funnel link is placed on their primary navigation or as a floating CTA.
- **WhatsApp Direct**: Prospects can also scan a QR code on property signboards to trigger the WhatsApp qualification sequence.

### Step 5: Client Experience (The Spectator Dashboard)
1. The client logs into their portal at [`/`](http://localhost:5173/) using `client@prestigerealty.com`.
2. They see real-time KPIs: Active Leads, Conversion Rate, and Top Acquisition Sources.
3. When a prospect submits the form, the AI qualification engine analyzes their answers:
   - **Marcus Vance ($3.5M cash)** ➔ Classified as **Qualified**.
   - An instant WhatsApp message is dispatched offering private tour slots.
4. If the client wants changes (e.g., *"Change our hero headline to highlight off-market villas"*), they click **Request Change**.
5. The ticket appears in Back Office; the agency updates the funnel; the client is notified when done. **Zero technical burden on the client.**

---

## 🗄 Database & Supabase Persistence

Buildicy uses Supabase Postgres with multi-tenant Row Level Security (RLS).

### 1-Click Supabase Bootstrap
To seed all tables, roles, real estate funnels, and accounts into your Supabase project:
1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/rzihskquvwuyylusslws/sql).
2. Open [`supabase_bootstrap.sql`](supabase_bootstrap.sql) from the repository root.
3. Paste the contents into the SQL Editor and click **Run**.

**What `supabase_bootstrap.sql` creates:**
- **Tables**: `profiles`, `workspaces`, `service_packages`, `roles`, `permissions`, `role_permissions`, `platform_admins`, `workspace_memberships`, `workspace_modules`, `funnels`, `forms`, `form_fields`, `leads`, `knowledge_sources`, `knowledge_documents`, `conversations`, `conversation_messages`, `client_change_requests`, `followup_sequences`, `activity_logs`.
- **Pre-seeded Accounts**:
  - `admin@buildicy.com` (encrypted password: `Password123!`, role: `platform_admin`)
  - `client@prestigerealty.com` (encrypted password: `Password123!`, role: `workspace_owner`)
- **Pre-seeded Data**: Full South Florida real estate workspace, funnels, qualified leads, and change requests.

---

## 💻 Local Setup & Running

### Requirements
- Node.js 20 or newer
- npm

### 1. Install Dependencies
```sh
npm install
```

### 2. Environment Configuration
The `.env` file is already pre-configured with Supabase and OpenAI credentials:
```env
SUPABASE_URL=https://rzihskquvwuyylusslws.supabase.co
SUPABASE_ANON_KEY=sb_publishable_ADqff1lDodYAv3ht57n_LQ_jXYzAgC-
APP_ORIGIN=http://localhost:5173
DEMO_MODE=true

AI_PROVIDER_CODE=openai-compatible
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=sk-proj-...
```

### 3. Start Development Server
```sh
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend API Worker: `http://localhost:8787` (proxied via Vite at `/api/v1`)

---

## 🧪 Automated Verification & Tests

To run typechecking, production build, and all unit/integration tests:

```sh
# Typecheck
npm run typecheck

# Production Vite Build
npm run build

# Integration Test Suite
npm test
```

### Test Coverage (13/13 Passing):
- `funnel creation, publish and public lead intake work end to end`
- `public submissions reject invalid consent and malformed required fields`
- `demo funnel can be edited into a draft and deactivated`
- `funnel page views and visitor conversion rates are tracked and calculated`
- `knowledge base supports creation, file ingestion, editing and deletion`
- `lead qualification conversation flow persists messages and AI drafts`
- `back office operations overview and service package assignment work`
- `client change requests and agency DFY queue work end to end`
- `public form input requires valid contact details and affirmative consent`
- `funnel configuration supplies a validated starter form`
- `AI output rejects invalid scores and uncertain classifications remain explicit`
- `workflow state transitions allow retry and reject terminal-state resurrection`
- `module registry enables only registered and available modules`

---

*Buildicy AI Funnel Systems · Enterprise Done-For-You Client Acquisition Architecture*
