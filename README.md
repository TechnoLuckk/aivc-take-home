# Intake Triage Agent

Automated intake triage for a professional services firm. Classifies inbound enquiries by **service line** and **complexity**, then routes them to the correct team lead using deterministic business rules — with human-review fallbacks when confidence is low.

## Features

- **LLM classification** via Groq (`llama-3.3-70b-versatile`) with structured JSON output
- **Deterministic routing** — team leads assigned by rules, not by the model
- **Keyword fallback** when the LLM fails or times out
- **Demo UI** with single enquiry submission, batch triage on 28 synthetic records, and a review queue filter
- **Architecture and production docs** in [`docs/`](docs/)

## Live demo

**Production:** [https://intake-triage-theta.vercel.app](https://intake-triage-theta.vercel.app)

Add `GROQ_API_KEY` in the [Vercel project settings](https://vercel.com/lakshit-duas-projects/intake-triage/settings/environment-variables) to enable LLM classification in production. Without it, the app uses keyword fallback routing.

## Quick start

### Prerequisites

- Node.js 20+
- A free [Groq API key](https://console.groq.com/)

### Setup

```bash
cd intake-triage
npm install
cp .env.example .env.local
# Edit .env.local and set GROQ_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Without an API key

The app still runs. Single and batch triage will use the keyword fallback classifier and route uncertain cases to the human review queue.

## API

**POST `/api/triage`**

Single enquiry:

```json
{
  "description": "Need help selecting an ERP vendor",
  "industry": "Manufacturing",
  "companySize": "500-1000",
  "urgency": "high"
}
```

Batch:

```json
{
  "enquiries": [
    { "description": "...", "industry": "...", "companySize": "...", "urgency": "medium" }
  ]
}
```

Response includes `classification`, `routing`, `source` (`llm` | `fallback` | `manual_review`), and `status`.

## Project structure

```
app/
  api/triage/route.ts    # Triage endpoint
  components/TriageApp.tsx
  page.tsx
lib/
  groq.ts                # LLM classification
  routing.ts             # Team lead assignment rules
  fallback.ts            # Keyword classifier
  triage.ts              # Orchestration + fallbacks
  types.ts
data/
  synthetic-enquiries.json
docs/
  architecture.md
  production-notes.md
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add environment variable: `GROQ_API_KEY`.
4. Deploy.

Or via CLI:

```bash
npm i -g vercel
vercel
# Follow prompts, then add GROQ_API_KEY in the Vercel dashboard
```

## Design decisions

- **LLM for semantics, code for routing** — auditable and override-friendly
- **Human review queue** for confidence < 0.7, complex engagements, and high-urgency moderate cases
- **No database in prototype** — stateless API; production would persist to CRM + audit log

See [`docs/architecture.md`](docs/architecture.md) for the end-to-end production design and [`docs/production-notes.md`](docs/production-notes.md) for monitoring and fallback strategy.
