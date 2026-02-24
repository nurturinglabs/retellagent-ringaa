# Ringaa

AI voice agent for school admissions, powered by [Retell AI](https://www.retellai.com/).

Parents call a phone number and speak with an AI assistant that answers questions about fees, seat availability, campus facilities, transport, and more. Every call is automatically captured as a lead and surfaced in an admissions CRM dashboard.

Built for **Brookfield International School** (demo), but the architecture generalizes to any school.

---

## How It Works

```
Parent dials phone number
        │
        ▼
  Retell AI Agent
  (handles conversation)
        │
        ├──► /api/check-seats      → seat availability lookup
        ├──► /api/book-visit        → campus visit scheduling + email confirmation
        └──► /api/start-application → application submission
        │
        ▼
  Call ends → Retell webhook
        │
        ▼
  /api/webhooks/retell
  (creates lead, stores transcript)
        │
        ▼
  Admin Dashboard
  (leads, analytics, follow-ups)
```

1. Parent calls the Ringaa phone number
2. Retell AI agent conducts the conversation using configured tools
3. Tools hit the app's API routes to check seats, book visits, or start applications
4. When the call ends, Retell sends a webhook with the transcript and analysis
5. The webhook handler creates a lead record automatically
6. Admissions staff see everything in the dashboard — leads, funnel, analytics

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| Voice AI | Retell AI (phone-based agent) |
| Charts | Recharts |
| Email | Resend |
| Date parsing | chrono-node |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Retell AI](https://www.retellai.com/) account with:
  - An API key
  - A configured agent (with school knowledge and tool definitions)
  - A US phone number purchased and assigned to the agent
- A [Resend](https://resend.com/) API key (optional, for confirmation emails)

### 1. Clone and install

```bash
git clone <repo-url>
cd retell/ringaa
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

| Variable | Description | Required |
|----------|-------------|----------|
| `RETELL_API_KEY` | Retell API key (from dashboard.retellai.com) | Yes |
| `RETELL_AGENT_ID` | ID of your configured Retell agent | Yes |
| `RETELL_PHONE_NUMBER_ID` | Phone number assigned to the agent | Yes |
| `RESEND_API_KEY` | Resend API key for sending emails | No |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app | No |
| `NEXT_PUBLIC_RINGAA_PHONE` | Display-formatted phone number for the UI | No |

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Connect the webhook

Retell needs a publicly reachable URL to send call events. For local development, use a tunnel:

```bash
npx ngrok http 3000
```

Then in the [Retell dashboard](https://dashboard.retellai.com/):
- Set webhook URL to `https://<your-ngrok-url>/api/webhooks/retell`
- Set agent tool URLs to:
  - `https://<your-ngrok-url>/api/check-seats`
  - `https://<your-ngrok-url>/api/book-visit`
  - `https://<your-ngrok-url>/api/start-application`

---

## Project Structure

```
ringaa/
├── app/
│   ├── page.tsx                        # Landing page — phone number CTA
│   ├── layout.tsx                      # Root layout
│   ├── globals.css                     # Tailwind + theme variables
│   ├── (admin)/
│   │   ├── layout.tsx                  # Sidebar layout for admin pages
│   │   ├── dashboard/page.tsx          # Admissions overview + funnel
│   │   ├── leads/page.tsx              # Lead CRM table
│   │   ├── analytics/page.tsx          # Charts + conversion metrics
│   │   ├── follow-ups/page.tsx         # Email campaign manager
│   │   └── knowledge-base/page.tsx     # School info viewer
│   └── api/
│       ├── check-seats/route.ts        # Seat availability by grade
│       ├── book-visit/route.ts         # Campus visit scheduling
│       ├── start-application/route.ts  # Application submission
│       ├── leads/route.ts              # Lead listing + filtering
│       ├── leads/[id]/follow-up/route.ts # Follow-up email sending
│       ├── seats/route.ts              # All seat data
│       └── webhooks/retell/route.ts    # Retell webhook handler
├── components/
│   ├── call-widget.tsx                 # Phone number display + call button
│   ├── admin-sidebar.tsx               # Navigation sidebar
│   ├── analytics-dashboard.tsx         # Charts + metrics component
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── retell.ts                       # Retell SDK wrapper + types
│   ├── store.ts                        # In-memory data store
│   ├── types.ts                        # TypeScript interfaces
│   └── utils.ts                        # Utility functions
├── data/
│   ├── school.json                     # School profile
│   ├── seats.json                      # Grade-level seat availability
│   ├── knowledge-base.json             # Fees, facilities, transport, FAQ
│   └── leads.json                      # Sample lead data
└── public/                             # Static assets
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — school info, phone number CTA, "Call Now" button |
| `/dashboard` | Stats cards, recent leads, seat capacity, admissions funnel |
| `/leads` | Sortable/filterable lead table, detail panel, follow-up dialog |
| `/analytics` | Lead volume charts, interest breakdown, conversion insights, seat occupancy |
| `/follow-ups` | Email templates, send history, campaign stats |
| `/knowledge-base` | School profile, fees, seats, facilities, transport, admission process, FAQ |

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/check-seats` | POST | Check availability for a specific grade. Body: `{ "grade": "LKG" }` |
| `/api/book-visit` | POST | Book a campus visit. Parses natural language dates. |
| `/api/start-application` | POST | Submit an admission application. |
| `/api/leads` | GET | List leads. Query params: `?status=new&interest=hot` |
| `/api/seats` | GET | Get seat availability for all grades. |
| `/api/leads/[id]/follow-up` | POST | Send a templated follow-up email. Body: `{ "template": "visit_confirmation", "channel": "email" }` |
| `/api/webhooks/retell` | POST | Receives Retell call events. Verifies signature, creates leads. |

---

## Deployment

### Vercel

```bash
npm run build    # verify build passes
vercel deploy    # or connect GitHub repo in Vercel dashboard
```

Set all environment variables in Vercel → Project → Settings → Environment Variables.

### Post-deployment

1. Update Retell webhook URL to `https://<your-domain>/api/webhooks/retell`
2. Update agent tool URLs to point to your production domain
3. Call the phone number to verify end-to-end flow
4. Check `/dashboard` for the new lead

---

## Data Storage

The app currently uses an **in-memory store** that resets on every deploy or server restart. This is intentional for demo purposes.

For production, replace `lib/store.ts` with a database-backed implementation (Supabase, PostgreSQL, etc.) — the API routes and types are already structured for this.

---

## School Data (Demo)

The demo is configured for **Brookfield International School**, Bangalore:
- 15 grades (Nursery through Grade 12)
- 570 total seats across all grades
- CBSE + Cambridge International curriculum
- Fee range: ₹1.2L – ₹2.2L per year
- 8 transport routes covering major Bangalore areas

All school data lives in `data/` as JSON files and can be swapped for any school.

---

## License

Private. Built by Umesh.
