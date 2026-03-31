# Changelog - ORQO Dashboard

All notable changes to this dashboard are documented in this file.

## [1.6.8] - 2026-03-31

### Added

- Conversation lifecycle closure controls in widget config:
- `closeOnInactivity`, `inactivityCloseMinutes`, and `askForHelpfulnessOnClose`.
- New widget endpoint `POST /api/widget/feedback` to persist helpfulness feedback and close conversation.
- New widget endpoint `POST /api/widget/close` to persist explicit inactivity/manual closure from embedded runtime.
- New AI-assisted management report endpoint `POST /api/reports/generate` with:
- Dynamic period analysis.
- JSON report payload.
- XLSX export (`xlsx`).
- PDF export (`pdf-lib`) with optional company logo.

### Changed

- `public/widget.js` now closes stale conversations by inactivity, requests end-of-chat feedback, and syncs closure state to backend.
- `POST /api/widget/reply` now rotates conversation reference after inactivity timeout and persists closure metadata.
- `GET /api/analytics` now includes satisfaction/feedback KPIs, inactivity closures, and live channel distribution from conversations.
- Reports dashboard (`/dashboard/reports`) was redesigned with:
- Interactive channel charts (bar + pie focus).
- Expanded KPI cards for satisfaction and inactivity closure.
- New AI report generator with configurable date range and XLSX/PDF export actions.
- Logs dashboard retention default was reduced to 30 days with quicker prune presets (7/15/30/60/90).

## [1.6.7] - 2026-03-31

### Added

- Persistent interaction metering service (`lib/usage-meter.ts`) with monthly accumulator, daily summaries, and per-event trace (`usage_events`).
- New endpoint `GET /api/account/interactions` to inspect interaction usage by period (totals, channels, providers, top conversations, recent events).
- Dashboard home now includes interaction detail panel (channels/providers/recent events) for period traceability.

### Changed

- `POST /api/widget/reply` now records one interaction event per successful AI reply, decoupled from conversation deletion.
- Account usage (`GET /api/account`) now reads the active monthly accumulator instead of mutable conversation counts.
- Plan usage in `dashboard/page.tsx` now uses persisted monthly usage, so deleting conversations does not reduce consumed interactions.

## [1.6.6] - 2026-03-31

### Added

- `DELETE /api/logs?days=N` to prune old logs by retention window (audit + runtime).
- Logs dashboard now includes a retention action (`Borrar > Nd`) for cleaning old records manually.

### Changed

- Widget interaction counter now uses a persistent per-period accumulator (`interactionUsage`) instead of counting current conversations.
- Deleting conversations in widget no longer reduces consumed interactions within the active period.
- Interaction usage auto-resets only when a new monthly period starts.

## [1.6.5] - 2026-03-31

### Added

- Drag and drop support in web widget chat (`screen-chat`) for files, images, and audio attachments.
- Visual drop overlay hint inside chat while dragging files.

### Changed

- Attachment picker now auto-detects dropped file type (`image`, `audio`, `file`) and enforces a max of 8 pending attachments per message.

## [1.6.4] - 2026-03-31

### Added

- New `DELETE /api/conversations/[id]` endpoint for per-conversation deletion from dashboard.
- Conversation deletion now writes audit trail entries (`CONVERSATION_DELETED`) to `audit_logs`.

### Changed

- Dashboard `Conversaciones` table now shows an explicit `Borrar` action per row.
- Widget conversation delete control is now visually stronger (trash icon + high-contrast style) for better discoverability.

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
