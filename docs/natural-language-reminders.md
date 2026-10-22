# Milo natural-language reminders

## Current scope
- Parses English date/time phrases with chrono-node.
- Shows an editable preview before save.
- Resolves date/time against an explicit IANA time zone.
- Rejects ambiguous numeric dates, incomplete clocks, invalid dates, and daylight-saving gaps/overlaps.
- Saves reminders to an owner-scoped Upstash Redis hash when secure persistence is configured.
- Does not send notifications.

## Required configuration for durable saves
The preview works without Redis. Saving/listing/deleting reminders is deliberately disabled until both server-side variables are configured in Vercel:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Use an HTTPS Upstash Redis REST endpoint. Keep the token server-side; never expose it in frontend code or commit credentials. This change does not create a database, modify Vercel environment variables, or deploy to production.

The owner namespace comes from a cryptographically signed, HttpOnly, SameSite=Lax cookie signed with MILO_SESSION_SECRET (or an approved existing session-secret alias). The client cannot choose an owner ID. Anonymous reminders are scoped to that browser session, not a verified account; cross-device account sync is not implemented. The cookie expires after 30 days.

## API
- POST /api/reminders with action=parse returns a draft only.
- POST /api/reminders with action=save requires confirmed=true, title, local date/time, time zone, and optional recurrence.
- GET /api/reminders?action=list lists records in the current session owner namespace.
- DELETE /api/reminders with an id deletes only within that owner namespace.

A successful save is a saved reminder, not a scheduled notification. No scheduler or delivery provider is implemented.

## Checks
Run node test/run_reminder_parser_tests.js, node test/run_reminder_api_tests.js, and npm test.
