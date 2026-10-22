# Milo — Intelligent Task Extraction & Deterministic Date Resolution Architecture

## 1. Executive Summary
This document establishes the architecture, boundaries, validation guarantees, and test verification for Milo's natural language task extraction and deterministic date resolution pipeline.

The architecture enforces strict separation between:
1. **Model-backed semantic extraction**: Understanding natural language intent to extract a task title, categorize the task, and extract the raw, verbatim date/time expression.
2. **Deterministic rule-based resolution**: Resolving only the raw date expression into normalized calendar values using `chrono-node`, an explicit reference instant, and a validated IANA timezone.
3. **User-reviewed editable draft**: Presenting the resolved draft to the user for explicit review and confirmation before any persistent write.

```
                           [ User Input ]
                                 │
                                 ▼
                     [ TaskExtractionService ]
              ┌──────────────────┴──────────────────┐
              │ - Preserves task title intent       │
              │ - Categorizes (academic, work, etc) │
              │ - Extracts verbatim date substring  │
              └──────────────────┬──────────────────┘
                                 │ { title, taskType, dateExpression }
                                 ▼
                 [ Substring & Security Guard ]
              (Rejects invented dates & injections)
                                 │
                                 ▼
                 [ ReminderDateResolutionService ]
              ┌──────────────────┴──────────────────┐
              │ - Explicit reference instant (fixed)│
              │ - Validated IANA timezone           │
              │ - chrono-node calendar math         │
              │ - Strict DST gap/overlap guards     │
              │ - Past-time & ambiguity rejection   │
              └──────────────────┬──────────────────┘
                                 │ Normalized draft
                                 ▼
                       [ Client Review Card ]
              ┌──────────────────┴──────────────────┐
              │ - Title edits update locally        │
              │ - Date phrase/zone edits re-resolve │
              │ - Status badge (Scheduled/Draft)    │
              └──────────────────┬──────────────────┘
                                 │ Explicit User Confirmation
                                 ▼
                    [ Persistent Storage Gate ]
              (HMAC session cookie, Upstash Redis)
```

---

## 2. Model Provider Configuration & Abstraction
- **Actual Active Provider**: Google Gemini (`gemini-3.5-flash-lite`), keyed via `process.env.GEMINI_API_KEY` / `process.env.MILO_GEMINI_KEY`.
- **LLaMA Compatibility**: Ready for OpenAI/v1-compatible endpoints via `process.env.LLAMA_API_URL` and `process.env.LLAMA_MODEL`.
- **Deterministic Rule-Based Fallback**: When no model API keys are configured, network requests time out (6s deadline), or providers are unreachable, the system automatically falls back to regex-guided classification and `chrono-node` extraction. No user text is dropped.
- **Untrusted Input Protection**: Prompts enclose user text inside `<USER_TASK_TEXT>...</USER_TASK_TEXT>` tags with strict system instructions prohibiting prompt execution or overrides.
- **Invented Phrase Rejection**: Substring verification enforces `userText.toLowerCase().includes(dateExpression.toLowerCase())`. If an LLM hallucinates or invents a date not in the user's sentence, it is rejected with code `INVENTED_DATE_EXPRESSION` and flagged for user clarification.

---

## 3. Deterministic Date Resolution Rules
`ReminderDateResolutionService` serves as the sole calendar authority.

| Input Scenario | Resolved Status | dueAt Timestamp | Behavior & Rationale |
| :--- | :--- | :--- | :--- |
| `tomorrow at 7pm` | `scheduled` | `2026-10-23T13:30:00.000Z` (IST) | Computes relative date against fixed reference instant; calculates wall-time offset. |
| `2027-08-15 at 14:30` | `scheduled` | `2027-08-15T14:30:00.000Z` | Explicit calendar date and time. |
| `next Friday` | `date_only` | `null` | Preserves date (`2026-10-30`); refuses to guess clock time. |
| `Buy groceries` (no date) | `unscheduled` | `null` | Valid unscheduled draft; no date or time assumed. |
| `03/04/2027` | `needs_clarification` | `null` | Rejects ambiguous DD/MM vs MM/DD numeric dates (`AMBIGUOUS_NUMERIC_DATE`). |
| `at 7` (bare hour) | `needs_clarification` | `null` | Rejects ambiguous 12-hour clock time (`INCOMPLETE_TIME`); requests AM/PM or 24-hr format. |
| `2026-03-08 02:30` (`America/New_York`) | Error | `null` | Rejects nonexistent local time during DST spring-forward gap (`NONEXISTENT_LOCAL_TIME`). |
| `2026-11-01 01:30` (`America/New_York`) | Error | `null` | Rejects ambiguous local time during DST fall-back overlap (`AMBIGUOUS_LOCAL_TIME`). |
| `today at 8am` (when ref is 10am) | `needs_clarification` | `null` | Rejects past-dated scheduled times (`TIME_IN_PAST`). |
| `every 2 weeks tomorrow at 3pm` | `scheduled` | Normalized ISO | Preserves recurrence metadata `{ unit: 'week', interval: 2 }`. |
| `every 150 days` | Error | `null` | Rejects intervals $> 99$ (`INVALID_RECURRENCE`). |
| Invalid timezone `Mars/Zone` | Error | `null` | Rejects invalid timezone without silent substitution (`INVALID_TIME_ZONE`). |

---

## 4. API Endpoints
Mounted at `/api/reminders`:
- `POST action=parse`: Extracts task title, task type, verbatim date phrase, and deterministically resolves it against `referenceTime` (defaulting to request start) and validated `timeZone`.
- `POST action=resolve`: Re-resolves `dateExpression` against `timeZone` and `referenceTime` without invoking the LLM.
- `POST action=extract`: Invokes model extraction only.
- `POST action=save`: Persists confirmed draft to Upstash Redis. Requires `confirmed: true`, same-origin check, signed session cookie, and title bounds (1–180 characters). Supports saving scheduled and unscheduled tasks.
- `GET ?action=list`: Lists saved reminders for the authenticated session owner.
- `DELETE`: Deletes reminder by ID within owner namespace.

---

## 5. Security & Privacy Controls
1. **Server-Side Credentials**: Model keys and Upstash credentials reside strictly server-side in environment variables (`process.env`). Never exposed in client bundles. API key lookup is restricted to explicit documented variables (`GEMINI_API_KEY`, `MILO_GEMINI_KEY`), preventing heuristic scans of arbitrary environment variables.
2. **Session HMAC Signatures**: Client ownership is tracked via `milo_reminder_session` cookie signed with HMAC-SHA256 using `MILO_SESSION_SECRET` (enforcing $\ge 32$ chars and decoded bytes).
3. **Same-Origin Protection**: Write operations (`action=save`, `DELETE`) require verified `Origin` matching the `Host` header.
4. **Rate Limiting**:
   - Preview rate: 120 requests/min per verified client IP.
   - Write rate: 40 operations/min per session owner.
5. **No Secret Persistence**: Prompts and raw model outputs are not written to persistent storage.
6. **Authoritative Save Verification & Schedule Consistency**: The `action=save` server endpoint independently verifies that any submitted natural-language date expression resolves to a valid, complete scheduling state:
   - Rejects `needs_clarification`, bare hours (`INCOMPLETE_TIME`), and unresolved expressions with HTTP 422 even if resolver `ok` is true.
   - Validates that submitted `dateLocal`, `timeLocal`, `timeZone`, `schedulingStatus`, and `recurrence` strictly match the deterministic resolver's output. Any discrepancy is rejected with HTTP 422 `SCHEDULE_FIELD_MISMATCH` or `RECURRENCE_MISMATCH`.
   - Prevents clients from bypassing checks by submitting valid calendar fields alongside unresolved natural-language expressions.
   - Preserves manual calendar edits: clients explicitly submit `dateExpression: null`, which triggers independent server-side calendar date validation (bounds, leap years, non-existent dates), future time requirement for timed tasks (`TIME_IN_PAST`), and recurrence interval bounds.
   - Supports date-only (`schedulingStatus: 'date_only'`, `dueAt: null`) and unscheduled tasks without inventing clock times.
7. **Real Browser Asynchronous Race Guard**: Client preview and re-resolution operations utilize a monotonic `activeRequestId` counter. Real browser CDP testing with controlled network promises verifies that when Request A is initiated and followed by Request B, returning B first and then A later leaves B's title, date, time, and timezone intact in the DOM. Furthermore, if A fails after B succeeds, the stale failure never clears or invalidates B's valid draft.
8. **Stale Schedule Invalidation**: Modifying date expressions or timezones immediately clears DOM date/time fields and invalidates previous schedules, ensuring failed re-resolutions never permit accidental persistence of outdated schedules.
9. **Multiple-Date Rejection & Clarification UX**: When user input contains multiple scheduling expressions, extraction rejects with `MULTIPLE_DATE_EXPRESSIONS` to prevent silently picking only one date. The API returns HTTP 422 with structured clarification details (`title`, `taskType`, `candidateExpressions`), and the frontend preserves the user's title, displays candidate expressions, sets the status badge to `Needs clarification`, and clearly instructs the user to simplify the expression while keeping the save button disabled.

---

## 6. Test Suite & Verification Matrix

| Suite | Description | Executed Command | Tests Count | Exit Code | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Task Extraction** | Multi-date rejection, mock injection, noun-phrase filtering, prompt-injection defense | `node test/run_task_extraction_service_tests.js` | 14 | **0** | **PASS** |
| **Date Resolution** | 14 calendar & timezone scenarios (DST gaps/overlaps, reference instant, timezones) | `node test/run_reminder_date_resolution_service_tests.js` | 14 | **0** | **PASS** |
| **Integration** | Pipeline, save gate consistency, manual null overrides, async race protection, date-only | `node test/run_task_extraction_integration_tests.js` | 13 | **0** | **PASS** |
| **Reminder Parser** | Legacy parser backward compatibility & edge cases | `node test/run_reminder_parser_tests.js` | 14 | **0** | **PASS** |
| **Reminder API** | Session security, CSRF same-origin, save-gate consistency, CRUD isolation | `node test/run_reminder_api_tests.js` | 6 suites | **0** | **PASS** |
| **Reminder UI Contract** | Elements, router, status pills, resolver, date-phrase inputs | `node test/run_reminder_ui_contract_tests.js` | 20+ assertions | **0** | **PASS** |
| **Browser Reminders E2E**| Real Headless Chrome CDP: controlled-promise async race guard, multi-date clarification, draft editing, manual recovery | `node test/run_browser_reminders_and_views_e2e.js` | 12 phases | **0** | **PASS** |
| **Reminders Target** | Unified reminder regression target | `npm run test:reminders` | 7 suites | **0** | **PASS** |
| **Full Regression** | 25 repository test suites | `npm test` | 25 suites | **0** | **PASS** |
| **Next.js Production Build** | Page compilation & API route bundling | `npx next build` | 2 static, 17 dynamic routes | **0** | **PASS** |
