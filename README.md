# Ringaa - School Admissions Voice Agent (Retell AI Version)

Ringaa is an AI-powered voice agent for school admissions. Parents call a phone number and speak with an AI assistant that can answer questions about fees, seat availability, campus facilities, and more. It automatically captures leads and populates a CRM dashboard.

## How It Works

1. Parents call **+1 (262) 384-6288**
2. Retell AI handles the conversation using a configured agent
3. The agent can check seat availability, book campus visits, and start applications
4. All calls are logged and leads are captured automatically
5. Admissions staff view everything in the dashboard

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Voice AI:** Retell AI (phone-based voice agent)
- **UI Components:** shadcn/ui (Radix UI + Tailwind)
- **Charts:** Recharts
- **Email:** Resend
- **Analytics:** Vercel Analytics + Speed Insights
- **Date Parsing:** chrono-node

## Setup

### 1. Prerequisites

- Node.js 20+
- Retell AI account with:
  - API key
  - Agent ID (configured with school knowledge)
  - US phone number purchased

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `RETELL_API_KEY` - Your Retell API key
- `RETELL_AGENT_ID` - Your Retell agent ID
- `RETELL_PHONE_NUMBER_ID` - Phone number assigned to the agent
- `RESEND_API_KEY` - For sending confirmation emails

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 4. Configure Retell Webhook

After deploying, set the webhook URL in your Retell dashboard:

```
https://your-domain.vercel.app/api/webhooks/retell
```

This will receive call events (started, ended, analyzed) and create leads automatically.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with phone number CTA |
| `/dashboard` | Admissions overview, stats, funnel |
| `/leads` | Lead CRM with search, sort, follow-up |
| `/analytics` | Charts, conversion metrics, seat occupancy |
| `/follow-ups` | Email template manager and history |
| `/knowledge-base` | School info used by the AI agent |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/check-seats` | POST | Check seat availability by grade |
| `/api/book-visit` | POST | Schedule a campus visit |
| `/api/start-application` | POST | Submit an application |
| `/api/leads` | GET | Fetch leads (filter by status/interest) |
| `/api/seats` | GET | Get all seat availability data |
| `/api/leads/[id]/follow-up` | POST | Send follow-up email |
| `/api/webhooks/retell` | POST | Retell webhook handler |

## Deployment (Vercel)

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy
5. Set webhook URL in Retell dashboard

## Key Differences from ElevenLabs Version

| Feature | ElevenLabs | Retell |
|---------|------------|--------|
| Voice delivery | Browser WebRTC | Phone call |
| User action | Click to talk | Dial phone number |
| SDK | @elevenlabs/react | retell-sdk |
| Call tracking | Client-side | Server-side webhooks |
| Availability | Requires browser | Works from any phone |
