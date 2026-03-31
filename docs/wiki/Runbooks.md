# Operational Runbooks

## 1. Widget replies are static or failing

Checklist:
- Validate `/api/widget/reply` is reachable.
- Verify `workspace_settings` has at least one enabled provider with API key.
- Confirm script contains `data-key` and, if bound, `data-agent-id` and `data-agent-token`.
- Inspect `activity_logs` for `widget-reply` errors.

## 2. Agent preview does not use model

Checklist:
- Validate `/api/agents/preview` returns `provider` and `model`.
- Confirm orchestration settings are configured in dashboard.
- Check authentication/session validity for dashboard user.

## 3. Conversations not visible in dashboard

Checklist:
- Confirm writes to `conversations` collection from widget flow.
- Validate filters in `/dashboard/conversations` (channel/model/status).
- Ensure `workspaceId` alignment for seeded and runtime data.

## 4. Production release sanity

- `tsc --noEmit` passes.
- `npm run build` passes in CI.
- Changelog entries updated.
- Rollback plan documented in PR.

