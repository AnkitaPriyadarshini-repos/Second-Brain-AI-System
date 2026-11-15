# Milo AI — Data Storage, Persistence & Recovery Architecture

**Document Reference:** `reports/milo-data-storage-and-recovery.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audit Baseline Commit:** `10adc59`  
**Date:** 2026-10-28T01:21:00+05:30  
**Target Audience:** SRE Lead, Backend Engineers, Frontend Engineers, Pilot Support

---

## 1. Storage Architecture Overview

Milo AI uses a **Client-First / Local-First Personal Knowledge Management (PKM)** architecture in its deployed web application:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser Vault                     │
│  localStorage: ['second_brain_notes_v2', 'settings', ...]   │
│  IndexedDB (vector embeddings & document chunks)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
            [On Prompt Submit: Retrieve top 3-5 notes]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Serverless API                     │
│  POST /api/ai/gateway (Stateless Execution)                 │
│  - Verifies HMAC Session Token                              │
│  - Synthesizes Answer with Grounded Context                 │
│  - Zero Server-Side Note Persistence                        │
└─────────────────────────────────────────────────────────────┘
                               │
            [Optional Future Scale: Target C & D]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Managed PostgreSQL Cluster                  │
│  notes table: PRIMARY KEY (user_id, id)                     │
│  Multi-Instance Cross-Device Sync                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Note Lifecycle & Data Flows

### 2.1 Note Creation (`addNote`)
1. User enters note title and content in Capture Hub (typing, audio transcript, web clip).
2. `js/store.js` calls `nlp.extractEntities()`, `nlp.classifyTopics()`, and `nlp.generateSummary()`.
3. Note object is created with unique ID (`note-<timestamp>-<rand>`), tags, entities, and `pinned: false`.
4. Note is unshifted to `Store.notes` and serialized to `localStorage['second_brain_notes_v2']`.
5. Event `brain-sync-state` is emitted with `state: 'synced'`.

### 2.2 Note Retrieval & Search (`getNotes`, `searchNotes`)
1. Search queries are processed locally by `js/rag-engine.js` using tokenized BM25 keyword matching and dense vector cosine similarity over local notes.
2. Latency is sub-5ms because all operations execute in memory on the client device.

### 2.3 Note Mutation & Deletion (`togglePin`, `deleteNote`)
1. Mutations update the in-memory array `Store.notes`.
2. `Store.saveNotes()` writes the updated array back to `localStorage['second_brain_notes_v2']`.
3. UI views re-render via `refreshAllViews()`.

### 2.4 Vault Export (`Store.exportVaultJSON`)
1. User clicks **Export Vault JSON** in Settings -> "Export & Backup Data Vault".
2. Serializes entire vault into standard JSON payload:
   ```json
   {
     "version": "1.0.0",
     "exportedAt": "2026-10-28T01:20:00.000Z",
     "notesCount": 42,
     "notes": [ ... ],
     "settings": { ... },
     "goals": [ ... ]
   }
   ```
3. Triggers browser download of `second_brain_vault_<timestamp>.json`.

### 2.5 Vault Restore (`Store.restoreVaultBackup`)
1. User selects a `.json` backup file via **Import Vault JSON**.
2. `FileReader` loads the file content and passes it to `Store.restoreVaultBackup()`.
3. Validates that the payload contains a valid `notes` array.
4. Overwrites `Store.notes`, merges `Store.settings`, and restores `Store.goals`.
5. Calls `Store.saveNotes()` and `refreshAllViews()` with toast notice: `Restored vault backup (X notes) successfully.`
6. Also supports raw notes arrays (`[...]`) for backward compatibility with legacy exports.

---

## 3. Explicit Evaluation of Section 3B Questions

### 1. Which notes are stored locally and which are stored remotely?
- **In Vercel Production/Preview:** **100% of user notes are stored locally** in the browser's `localStorage` (`second_brain_notes_v2`).
- No user notes are stored remotely on the server.
- The serverless AI Gateway is completely stateless: it receives matching notes in the request payload and discards them immediately after generating the answer.

### 2. Whether local and remote stores can diverge:
- Because the deployed web application does not run a background remote sync service, there is **zero dual-write divergence**.
- The client browser is the single source of truth.
- However, notes created on Device A (e.g. iPhone) will not appear on Device B (e.g. MacBook) unless transferred via JSON export/import.

### 3. What happens when browser storage is cleared or quota is exceeded:
- **Clearing Browser Cache / Cookies:** Wipes `localStorage['second_brain_notes_v2']`. The vault resets to an empty state (0 notes).
- **Storage Quota:** Browser `localStorage` typically has a 5MB to 10MB limit (sufficient for ~2,500–5,000 text notes).
- **QuotaExceeded Handling:** If `localStorage.setItem` throws `QuotaExceededError`, `Store._setItem` safely catches the error without crashing the application (verified in `run_client_storage_and_recovery_tests.js`). The user can export their vault to free space or archive old notes.

### 4. Whether data survives reloads and application updates:
- **Yes.** Notes persist across browser reloads, tab closures, service-worker PWA updates, and device reboots.

### 5. Whether users can export and recover their notes:
- **Yes, with 100% fidelity.** Users can download a full backup via "Export Vault JSON" and restore it via "Import Vault JSON" at any time.

### 6. Whether notes are transmitted to the AI gateway and what context is sent:
- When a user sends a prompt, client-side vector search selects only the top 3–5 most relevant notes (`{ id, title, content }`).
- Only these relevant notes are sent in the `contextNotes` array to `POST /api/ai/gateway`.
- Unrelated notes and the remainder of the vault are **never** transmitted over the network.

### 7. Whether separate accounts or browser profiles can access each other's data:
- Browser profiles are strictly isolated by the web browser's same-origin security boundary.
- User A on Profile 1 cannot read or modify User B's `localStorage` on Profile 2 or Incognito mode.
- If two users share the same browser profile and device, they share the same `localStorage`.

### 8. Whether a user is clearly informed of any limitations on backup, synchronization, or cross-device access:
- **Yes.** The Settings panel in `index.html` prominently displays:
  > 🔒 **Local-First Privacy:** Your notes are stored securely on this device (in browser local storage) and are never uploaded to a centralized database. If you clear browser cache or switch devices, export a backup here to preserve and transfer your notes.

---

## 4. Verification Evidence & Automated Tests

All storage, backup, and recovery workflows were validated using `test/run_client_storage_and_recovery_tests.js`:

```
====================================================
📦 CLIENT-FIRST STORAGE & DATA RECOVERY TEST SUITE
====================================================

Test 1: Clean First-Time Vault Initialization
  ✅ [PASS] Clean initial vault verified (0 notes)

Test 2: Note Lifecycle Operations
  ✅ [PASS] Note creation, pinning, and storage serialization verified

Test 3: Full Vault JSON Export & Recovery
  ✅ [PASS] Vault JSON export and restore works with 100% fidelity

Test 4: Backward-Compatible Raw Array Import
  ✅ [PASS] Raw notes array fallback import verified

Test 5: Corrupted JSON Import Rejection
  ✅ [PASS] Malformed payloads safely rejected without vault corruption

Test 6: Storage QuotaExceeded Handling
  ✅ [PASS] QuotaExceededError caught gracefully without application crash

====================================================
🎉 ALL 6 CLIENT STORAGE & RECOVERY TESTS PASSED!
====================================================
```
