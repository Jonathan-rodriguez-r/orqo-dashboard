# Architecture

## System Layers

1. Presentation Layer
- `app/dashboard/*` for operator interfaces.

2. API Layer
- `app/api/*` route handlers.
- Stateless controllers and explicit request/response contracts.

3. Domain/Service Layer
- `lib/ai-orchestrator.ts` for orchestration logic.
- Shared cross-cutting logic in `lib/*`.

4. Persistence Layer
- MongoDB collections for agents, settings, conversations, and logs.

## CQRS in Conversational Flow

- Query intent: information retrieval and contextual response.
- Command intent: transactional actions through integrated systems.
- Human handoff: escalation path with full context.

## AI Orchestration

- Providers: OpenAI, Anthropic, Gemini, Grok.
- Strategy: single, failover, round-robin.
- Selection is workspace-driven from `workspace_settings`.

## Security

- JWT sessions with workspace and role claims.
- RBAC route protection.
- Public widget API key validation.
- Optional per-agent token for web embedding.

