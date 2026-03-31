# Changelog - ORQO Dashboard

All notable changes to this dashboard are documented in this file.

## [1.6.3] - 2026-03-31

### Added

- Widget chat now supports pending attachments for images, files, and voice notes (`MediaRecorder`) with inline attachment chips.
- Messages list now includes per-conversation delete (`x`) to remove chats one by one from widget runtime history.

### Changed

- `POST /api/widget/reply` now accepts and sanitizes `attachments`, and injects attachment context into inference payloads.
- Widget conversation persistence now stores attachment metadata on user turns in `conversations`.

## [1.6.2] - 2026-03-31

### Added

- `Settings > Widget` now uses the full widget configuration module (embedded), including:
- `themeMode` selector (`auto`, `dark`, `light`).
- Dynamic help article management with editable content for widget help/inicio.

### Changed

- Public widget config API now normalizes and serves help content for widget consumption:
- Articles are exposed in `Ayuda` category for consistent widget help rendering.
- Home article IDs are normalized against available articles.
- `public/widget.js` now sends `agentId/agentToken` to public config endpoint for agent-level visual overrides.
- `public/widget.js` now applies widget light/dark theme mode without forcing host site theme.

## [1.6.1] - 2026-03-31

### Fixed

- `proxy.ts`: marked `/api/widget/*` as public to avoid auth redirect to `/login`.
- Restored `POST /api/widget/reply` availability for `orqo.io` widget traffic.

## [1.6.0] - 2026-03-31

### Added

- Alerting module for AI incidents:
- New workspace alert settings API `GET/PUT /api/settings/alerts`.
- New alert service `lib/alerts.ts` with throttling and role-based recipients.
- New settings tab `Alertas` with event toggles, deduplication window, and recipient-role selection.
- New fallback controls in orchestration settings:
- Free model fallback (OpenRouter) with configurable model list.
- Safe fallback reply message to avoid hard chat failures.

### Changed

- `lib/ai-orchestrator.ts` now supports:
- Automatic no-provider detection and alert emission.
- Multi-provider failure detection with critical alerts.
- Optional free-model fallback before returning a controlled safe reply.
- `POST /api/agents/preview` and `POST /api/widget/reply` now log degradation details when fallback is used.
- Notifications query now supports role-targeted alerts via `recipientRoles`.
- Diagnostics in Help Center now run server-side with persistent logs and alerts.
- Notification dropdown now supports per-alert deletion via quick `x` action.

## [1.5.0] - 2026-03-31

### Added

- Real AI orchestration service in `lib/ai-orchestrator.ts` with provider abstraction.
- New endpoint `POST /api/agents/preview` for real agent preview before channel binding.
- New endpoint `POST /api/widget/reply` for production widget responses through orchestration.
- Agent web widget token lifecycle (`webWidgetToken`) for stronger embedding linkage.
- Embed-script modal in Agents UI with `data-key`, `data-agent-id`, `data-agent-token` snippet.
- Optional script-level agent binding in `public/widget.js` (`data-agent-id`, `data-agent-token`).
- In-repo technical wiki bootstrap under `docs/wiki` and markdown project board under `docs/projects`.

### Changed

- Widget runtime now calls real backend orchestration instead of static responses.
- Agent preview drawer now executes live model calls (provider/model metadata included).
- Widget replies now persist operational conversation state for dashboard `conversations` visibility.

### Compatibility

- Existing `data-key` based embedding remains supported.
- Existing dashboard flows remain backward-compatible.
