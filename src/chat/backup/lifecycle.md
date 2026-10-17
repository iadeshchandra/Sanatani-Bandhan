# Chat Backup — Phase 3: 90-Day Lifecycle (DESIGN ONLY)

**Status:** designed, not built. Build only after Phase 1+2 prove stable in production.

## Goal

Firestore is the **postman** (delivery, real-time sync, presence). The user's
Google Drive + device archive is the **filing cabinet** (history). The 90-day
lifecycle draws the line between them so hot Firestore queries stay small,
fast, and cheap — while no word is ever truly lost.

## The rule

- **0–90 days:** messages live in Firestore (`chats/{chatId}/messages`), synced
  in real time, searchable in-app, fully live.
- **90+ days:** messages are **excluded from hot queries** (client-side
  `where('createdAt', '>', now - 90d)` on the messages subcollection).
  They remain readable in two places:
  1. The device-local archive (`sb-chat-backup-archive` IndexedDB) — instant.
  2. The sealed Drive backups — restorable on demand.

## What changes when built

1. **Query change (client):** `useChat` / thread message queries gain a
   `createdAt > cutoff` bound. One-line change per query site; no rules change
   needed (rules are participant-based, time-agnostic).
2. **"Older words" affordance:** when a thread has archived history, the top of
   the thread shows a calm divider — *"Older words rest in your archive 📜"*
   — tapping opens the ArchiveViewer scoped to that thread.
3. **No deletion:** we NEVER delete old messages from Firestore in Phase 3.
   Exclusion is query-side only. True deletion (GDPR-style "forget me") is a
   separate, explicit user action with its own consent screen.
4. **Backup cadence guard:** the lifecycle only activates for users with
   `sealReady === true` AND a backup newer than 100 days. If their Drive
   backup is stale, hot queries keep serving 180 days — the app degrades
   gracefully rather than hiding words the user can't recover.

## Cost math (why 90 days)

- A million text messages ≈ 1–2 GB. Firestore storage is $0.18/GiB/mo —
  pennies. The real cost is **read volume**: every thread open re-reads
  history. Bounding hot queries to 90 days cuts repeat reads for long-lived
  family threads (the threads that matter most) without touching UX.
- The honest pitch to the user is not money — it's **speed**: threads open
  instantly because the phone isn't re-reading three years of blessings.

## Open questions for the build phase

- Should org threads (announcements, audit-relevant) be exempt? Leaning yes —
  org threads keep 365 days hot; the org, not the devotee, owns that memory.
- Composite index: `messages` needs `createdAt` ordering already present;
  verify no new index is required before shipping.
- Archive search: the ArchiveViewer gains search when the lifecycle ships
  (searching 90d+ history is the #1 reason users will open it).

## Non-goals

- Server-side TTL policies (needs Blaze-tier TTL + Functions — out of scope
  for the $0 envelope; query-side exclusion achieves the UX win alone).
- Cross-device archive sync (the Drive backup IS the sync; the archive is
  per-device by design).
