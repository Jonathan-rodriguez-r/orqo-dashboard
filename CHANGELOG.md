# Changelog - ORQO Dashboard

All notable changes to this dashboard are documented in this file.

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
