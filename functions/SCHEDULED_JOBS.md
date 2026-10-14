# Scheduled Jobs — Design

How Sanatani Bandhan delivers time-based reminders (samskara ages, shraddha
tithis, festival notifications) within the zero-cost constraint.

## The constraint

Cloud Scheduler (the Google-native cron for Cloud Functions) requires the
**Blaze plan**. On the Spark (free) plan there is no server-side cron. This
document describes the architecture that works today on $0 and upgrades
cleanly when Blaze is enabled.

## Architecture: compute on trigger, deliver on read

The system is split into two halves:

1. **Compute (server):** `POST /api/scheduled/*` endpoints (see
   `functions/src/routes/scheduledRoutes.ts`) scan Firestore and enqueue due
   reminders into the `reminderQueue` collection. They are owner-only and
   idempotent (a `dryRun: true` body previews without writing).

2. **Deliver (client):** the app reads `reminderQueue` for the signed-in
   user's `ownerUid`, surfaces reminders in the UI, and marks them
   `sent`/`dismissed`. No server push is required for v1.

This means reminders work even if the trigger runs irregularly — the queue
is the source of truth, and the client drains it whenever it syncs.

## Trigger options (free tier → Blaze)

| Option | Cost | How | Notes |
|---|---|---|---|
| **Manual admin trigger** | $0 | Owner hits `POST /api/scheduled/samskara-reminders` from the admin console | Works today. Run weekly; the job is idempotent so repeats are safe. |
| **Client-side scheduler** | $0 | App calls the endpoint on launch (owner session only), throttled to once per 24h via localStorage timestamp | Works today. Best effort — only fires when the owner opens the app. Documented as the v1 default. |
| **Cloud Scheduler** | Blaze | Cron → OIDC-authenticated POST to the endpoint | The production target. Schedule: samskara scan weekly (Sunday 06:00 IST), shraddha scan daily during Pitru Paksha, festival notifications per the panchang feed. |
| **FCM push** | $0\* | Admin SDK `send()` from a trigger endpoint | \*FCM send via Admin SDK works on Spark; only the *scheduler* needs Blaze. When Cloud Scheduler exists, a trigger endpoint can both enqueue AND push via FCM. |

## Current jobs

### Samskara age reminders — `POST /api/scheduled/samskara-reminders`
- **Source:** `samskaraFamilies/{familyId}/members` (client-written, `dateOfBirth` + `completedSamskaras`).
- **Milestones:** Annaprashana (~6mo), Chudakarana (1y), Vidyarambha (3y),
  Upanayana (8y), Vivaha (21y). Windows are generous (±6–24 months) because
  families plan around muhurat, not birthdays.
- **Tone:** gentle planning nudges, never alarms. Copy is devotional, not gamified.

### Shraddha reminders — `POST /api/scheduled/shraddha-reminders`
- **Source:** `pitraRecords` (client-written, `shraddhaMonth` / `shraddhaPaksha` / `shraddhaTithi`).
- **Cadence:** one reminder per ancestor per year (idempotency key: pitraId + year).
- **Calendar note:** tithi computation belongs to the panchang service. The
  endpoint accepts `month`/`paksha`/`tithi` overrides so the owner can test;
  production callers pass the current tithi from the client's panchang module.

### Festival notifications — *designed, not yet built*
- **Source:** the Vedic-calendar module's festival feed (client-side dates,
  marked approximate for 2026–27).
- **Design:** a third trigger endpoint following the same pattern —
  `POST /api/scheduled/festival-notifications` with `{ daysAhead: 7 }` —
  enqueuing reminders for major festivals. Build when the festival feed has
  a server-readable source of truth.

## Firestore rules note

`reminderQueue` needs rules: users read only their own `ownerUid` docs;
writes via Admin SDK only (client never writes directly — it only marks
`sent`/`dismissed` on its own docs). Add when the client integration lands:

```
match /reminderQueue/{id} {
  allow read: if isLoggedIn() && resource.data.ownerUid == request.auth.uid;
  allow update: if isLoggedIn() && resource.data.ownerUid == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
  allow create, delete: if false; // server only
}
```

## Upgrade path to Blaze

1. Enable Blaze (still $0 at this usage — free tier covers it).
2. Create Cloud Scheduler jobs with OIDC tokens for the owner service account.
3. Add FCM `send()` to the trigger endpoints for push delivery.
4. Set up the audit-log retention purge (see `lib/audit.ts`).
