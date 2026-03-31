# ORQO Dashboard

Corporate-grade control plane for ORQO conversational orchestration.

This repository powers `https://dashboard.orqo.io` and manages:
- Agent lifecycle and channel binding
- AI orchestration providers/models
- Operational conversations, analytics, and auditability
- Widget configuration and public runtime delivery

## Product Scope

ORQO Dashboard is the administrative surface for a conversational middleware platform that applies CQRS in customer channels:
- Query flow: retrieve business information (stock, status, availability)
- Command flow: execute business transactions (orders, bookings, updates)

## Architecture

### Architectural Style

- Clean architecture boundaries between UI, API, domain/service, and persistence concerns
- CQRS-oriented operational model for conversational events
- Stateless APIs with explicit persistence points
- Workspace-oriented settings and role-driven access control

### Core Modules

- `app/dashboard/*`: Operator UI (agents, settings, widget, logs, conversations)
- `app/api/*`: Server routes for auth, config, orchestration, and persistence
- `lib/*`: Shared infrastructure and services (auth, mongo, orchestration)
- `public/widget.js`: Public embeddable widget runtime

### Orchestration Layer

Primary orchestration service:
- `lib/ai-orchestrator.ts`

Responsibilities:
- Resolve active provider/model configuration
- Apply orchestration strategy (single/failover/round-robin)
- Compose agent runtime prompt context
- Call provider APIs (OpenAI, Anthropic, Gemini, Grok)
- Execute resilient fallback chain (free models + safe reply)
- Return normalized reply metadata (`provider`, `model`, `reply`)

### Alerts and Observability

- `lib/alerts.ts`: alert domain service with throttling and role-targeting
- `app/api/settings/alerts`: workspace alert settings (events, recipients, dedup window)
- `app/api/notifications`: role-filtered in-app notifications
- `app/dashboard/settings/alerts`: operational alert control center for owners/ops

## Security and Governance

- JWT session model with workspace and role context
- RBAC-protected dashboard and APIs
- API-key validation for public widget traffic
- Optional agent token binding for web widget embedding
- Operational logs for traceability (`activity_logs`)

## Runtime Flows

### 1. Agent Preview (real AI)

`/dashboard/agents` -> `/api/agents/preview` -> `ai-orchestrator`

Used to validate agent behavior before channel publication.

### 2. Public Widget Conversation

`public/widget.js` -> `/api/widget/reply` -> `ai-orchestrator`

Also persists conversation operational state for dashboard visibility.

### 3. Channel Binding

When `Web Widget` is enabled on an agent:
- Agent receives/retains `webWidgetToken`
- Embed script can include:
  - `data-key`
  - `data-agent-id`
  - `data-agent-token`

## Engineering Principles

This codebase follows:
- SOLID principles for service boundaries and extension safety
- Clean code conventions (small functions, explicit naming, low coupling)
- Defensive error handling with safe fallbacks
- Backward compatibility for production runtime paths

## Local Development

### Requirements

- Node.js 20+
- MongoDB Atlas URI
- Resend API key

### Environment Variables

```env
MONGODB_URI=mongodb+srv://...
RESEND_API_KEY=re_...
SESSION_SECRET=long-random-secret
APP_URL=https://dashboard.orqo.io
EMAIL_FROM=ORQO <noreply@orqo.io>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENROUTER_API_KEY=... # optional free fallback for chat continuity
```

### Run

```bash
npm install
npm run dev
```

## Release and Deployment

- Primary branch in remote: `main`
- Production deployment: Vercel (auto deploy from primary branch)
- Domain: `dashboard.orqo.io`

## Wiki and Projects

Internal wiki index:
- [Wiki Home](./docs/wiki/Home.md)
- [Architecture](./docs/wiki/Architecture.md)
- [Operational Runbooks](./docs/wiki/Runbooks.md)
- [Release Process](./docs/wiki/Release-Process.md)
- [Roadmap](./docs/wiki/Roadmap.md)

Projects board seed:
- [Backlog](./docs/projects/Backlog.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
