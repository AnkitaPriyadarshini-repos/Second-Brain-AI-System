# Milo natural-language reminders & task extraction

## Pipeline Architecture: Separation of Extraction & Resolution
Milo separates natural language task scheduling into three distinct, decoupled stages:

1. **AI Task Extraction (`services/TaskExtractionService.js`)**:
   - Model-backed extraction identifies task title, classification category (`academic`, `work`, `personal`, `health`, `finance`, `general`), and verbatim date/time expression.
   - **Crucial Rule**: The AI model NEVER calculates or invents timestamps, calendar math, or ISO dates.
   - **Substring Enforcement**: The extracted `dateExpression` must exist as an exact verbatim substring within the user's input. If the model produces an invented phrase, it is strictly rejected and flagged for user clarification.
   - **Active Provider**: Google Gemini (via `GEMINI_API_KEY` / `MILO_GEMINI_KEY`). Architecture includes native support for LLaMA endpoints via `LLAMA_API_URL`, and falls back to a deterministic rule-based extractor when no model credentials exist.

2. **Deterministic Date Resolution (`services/ReminderDateResolutionService.js`)**:
   - Pure rule-based calendar mathematics using `chrono-node`.
   - Resolves ONLY the extracted date/time expression against a single, explicit reference instant and a validated IANA timezone.
   - Enforces calendar constraints: rejects ambiguous numeric dates (`03/04/2027`), bare hour expressions without AM/PM, invalid calendar days (e.g. Feb 31), nonexistent DST gap times, and ambiguous DST overlap times.
   - Resolves unscheduled tasks (`dateExpression: null`) into valid unscheduled drafts without inventing a schedule.
   - Resolves date-only tasks (`dateExpression: "next Friday"`) into date drafts without guessing clock times.

3. **User-Reviewed Draft & Explicit Confirmation**:
   - Presents an editable draft showing title, classification, status badge (`Scheduled`, `Date only`, `Unscheduled`, `Needs clarification`), extracted phrase, local date/time, and timezone.
   - Editing the title updates the draft review instantaneously without re-running NLP or date parsing.
   - Editing the date phrase or changing the timezone triggers pure deterministic re-resolution against the preserved reference instant.
   - **Confirmation Gate**: Zero persistent writes occur before explicit user review and confirmation (`confirmed: true`).

## Required configuration for durable saves
The preview and resolution pipeline works without Redis. Saving/listing/deleting reminders is deliberately disabled until both server-side variables are configured in Vercel:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Use an HTTPS Upstash Redis REST endpoint. Keep the token server-side; never expose it in frontend code or commit credentials. This change does not create a database, modify Vercel environment variables, or deploy to production.

The owner namespace comes from a cryptographically signed, HttpOnly, SameSite=Lax cookie signed with `MILO_SESSION_SECRET` (minimum 32 characters and decoded bytes). The client cannot choose an owner ID. Anonymous reminders are scoped to that browser session, not a verified account; cross-device account sync is not implemented. The cookie expires after 30 days.

## API Contracts
- `POST /api/reminders` with `action=parse`: Runs Task Extraction $\rightarrow$ Deterministic Resolution $\rightarrow$ returns structured draft.
- `POST /api/reminders` with `action=resolve`: Re-resolves `dateExpression` against `timeZone` and `referenceTime` without re-running the LLM.
- `POST /api/reminders` with `action=extract`: Model task extraction only.
- `POST /api/reminders` with `action=save`: Requires `confirmed=true`, `title`, local date/time, time zone, and optional recurrence. Supports saving both scheduled and unscheduled drafts.
- `GET /api/reminders?action=list`: Lists records in the current session owner namespace.
- `DELETE /api/reminders`: Deletes item within that owner namespace.

A successful save is a saved reminder record, not a scheduled notification alert. Notification delivery is not implemented.

## Checks
- `npm run test:reminders`: Executes all 7 parser, API, UI contract, extraction, resolution, integration, and CDP browser tests.
- `npm run test:extraction`: Unit tests for all 9 task extraction requirements.
- `npm run test:resolution`: Unit tests for all 14 date resolution requirements.
- `npm test`: Full 25-suite repository regression gate.
