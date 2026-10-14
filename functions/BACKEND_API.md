# Sanatani Bandhan — Backend API Reference

**Base URL (production):** `https://asia-south1-shda-6245c.cloudfunctions.net/api`
**Runtime:** Firebase Cloud Functions 1st-gen, Node 20, region `asia-south1` (Mumbai)
**Plan:** Spark (free tier) — outbound networking limited to Google services only

All authenticated endpoints expect: `Authorization: Bearer <Firebase ID token>`

---

## Auth tiers

| Tier | Gate | Who |
|------|------|-----|
| Public | none | Anyone |
| Authenticated | `requireAuth` | Any valid Firebase user |
| Role | `requireRole(...)` | Users with the named role (SuperAdmin bypasses) |
| Owner | `requireOwner` | Platform owner only — UID `sxIGHmvpYUTqPnpI1bLFT1O1cA62` or verified `iadeshchandra@gmail.com` |

---

## Health

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | Public | Service status, version, Firestore/Auth dependency checks, uptime |
| GET | `/api/health/ready` | Public | Readiness probe — 200 only when Firestore reachable |

---

## Auth (`/api/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/verify-pin` | Public (rate-limited 5/15min per IP+workspace) | Server-side admin PIN verification; mints claims-bearing custom token |
| POST | `/api/auth/qr-pair` | Staff of workspace (10/min) | Mint one-time QR pairing token (5-min TTL, single-use) |
| POST | `/api/auth/qr-claim` | Public (rate-limited 5/min per IP) | Claim pairing token → Firebase custom token for the member |

---

## Admin (`/api/admin`)

### Tenant management (SuperAdmin role)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/admin/tenants` | SuperAdmin | Provision tenant partition (+ client workspace mirror). Audited |
| GET | `/api/admin/tenants` | SuperAdmin | List tenants (PIN hashes stripped) |
| POST | `/api/admin/tenants/:tenantId/pin` | SuperAdmin | Rotate admin PIN (peppered hash only). Audited |
| POST | `/api/admin/users/:uid/claims` | SuperAdmin | Mint custom claims + mirror to `users/{uid}`. Audited |
| POST | `/api/admin/treasury/export` | Accountant+ | CSV export of tenant treasury ledger |

### Platform owner oversight (owner only)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/overview` | Owner | Platform pulse: workspace/user/tenant counts, recent workspaces |
| GET | `/api/admin/users/lookup?email=` | Owner | Support: find user by email (Admin SDK) |
| POST | `/api/admin/users/:uid/disable` | Owner | Disable abusive account. Audited (critical). Owner account protected |
| POST | `/api/admin/users/:uid/enable` | Owner | Re-enable account. Audited |
| GET | `/api/admin/workspaces?limit=&cursor=` | Owner | Paginated workspace list (PIN hashes stripped) |
| POST | `/api/admin/workspaces/:id/plan` | Owner | Set plan (`DEMO`/`LITE`/`STANDARD`/`ENTERPRISE`). Audited (critical) |
| GET | `/api/admin/audit-logs` | Owner | Query audit trail (`?action=&actorUid=&workspaceId=&severity=&limit=&cursor=`) |
| POST | `/api/admin/bootstrap-owner` | Owner | One-time: register owner in `platform_admins` + stamp SuperAdmin claims |

### Platform analytics (owner only)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/analytics/timeseries?days=14` | Owner | Daily user-signup + workspace-creation counts, last N days (max 90). Bounded range queries, server-side bucketing |
| GET | `/api/admin/analytics/plans` | Owner | Workspace count per plan tier (`DEMO`/`LITE`/`STANDARD`/`ENTERPRISE`/`OTHER`) via parallel `count()` aggregations |

---

## Data export (`/api/export`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/export/workspaces/:workspaceId` | Owner (any) or Trustee (own) | Full workspace JSON export — backup & portability. 5/min, 2000 docs/collection cap. Audited |
| GET | `/api/export/collections` | Authenticated | List exportable collections |

Secrets (`adminPinHash`, `pin`, `pinHash`) are stripped from every export.

---

## Webhooks (`/api/webhooks`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/webhooks/payments` | HMAC signature (`x-webhook-signature`, `WEBHOOK_SECRET`) | Payment gateway IPN. Unsigned/forged callbacks rejected |

---

## Notifications (`/api/notifications`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/notifications/email` | Authenticated | Send email via server SMTP identity |
| POST | `/api/notifications/telegram` | Authenticated | Send Telegram message |

> Spark-plan note: outbound SMTP may be restricted to Google services. Email
> delivery should be verified after deploy; FCM (free, unlimited) is the
> recommended primary channel.

---

## AI (`/api/gemini`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/gemini/query` | Public (20/min per IP) | Vedic helpdesk widget (server `GEMINI_API_KEY`) |
| POST | `/api/gemini/validate-key` | Public (20/min per IP) | Validate a user-supplied Gemini key (never stored) |
| POST | `/api/gemini/dharmic-assistant` | Authenticated | Full assistant with custom instructions |

---

## Verification (`/api/verification`)

Server-side verification pipeline for Purohit/Jyotishi tiers. The client can
only create profiles at `REGISTERED` (Firestore rules); tier upgrades happen
exclusively through these endpoints. Applications live in the
`verificationApplications` collection.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/verification/apply` | Authenticated | Submit tier-upgrade application for own profile (one pending per profile) |
| GET | `/api/verification/pending` | Owner | List pending applications (`?kind=`, `?limit=`) |
| POST | `/api/verification/:id/approve` | Owner | Approve → sets canonical profile tier (never self-approval, never skips) |
| POST | `/api/verification/:id/reject` | Owner | Reject with required reason |
| GET | `/api/verification/applications/:id` | Owner | Full application detail for review UI |

Tiers: `REGISTERED` → `CREDENTIAL_VERIFIED` → `ORG_ENDORSED` → `PLATFORM_VERIFIED`.

---

## Moderation (`/api/moderation`)

Sangam trust & safety. Reports are private (owner-visible only). Content hides
are recorded as directives in `moderationHides`; the client checks them before
rendering.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/moderation/report` | Authenticated | Report a post/comment (reason enum, dedup per user+target) |
| GET | `/api/moderation/reports` | Owner | List reports (`?status=open\|actioned\|dismissed`, `?limit=`) |
| POST | `/api/moderation/reports/:id/action` | Owner | `dismiss` / `hide_content` / `warn_user` / `suspend_user` |
| POST | `/api/moderation/content/:id/hide` | Owner | Immediate hide without a report |
| POST | `/api/moderation/users/:uid/unsuspend` | Owner | Reverse a suspension (appeal upheld) |

---

## Scheduled jobs (`/api/scheduled`)

Trigger endpoints for time-based reminders. Owner-only, idempotent, support
`{ dryRun: true }` previews. See `functions/SCHEDULED_JOBS.md` for the full
design (free-tier triggers vs Cloud Scheduler on Blaze).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/scheduled/samskara-reminders` | Owner | Enqueue samskara age-milestone reminders into `reminderQueue` |
| POST | `/api/scheduled/shraddha-reminders` | Owner | Enqueue annual shraddha reminders (tithi overrides for testing) |
| GET | `/api/scheduled/queue` | Owner | Inspect the reminder queue (`?status=`, `?limit=`) |

---

## Manual billing (`/api/billing`)

Zero-gateway plan payments for Bangladesh/India: the owner configures where
money goes (bKash / Nagad / UPI / PhonePe / bank), users pay in their own
mobile-banking app, then submit the transaction ID. The owner verifies the
payment in their own bKash/Nagad/UPI account and approves — approval is the
only thing that activates a plan. Submitting a claim grants nothing.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/billing/methods` | Public | Active payment methods + owner instructions (where to send money) |
| POST | `/api/billing/methods` | Owner | Configure a payment method (id, name, account, locale instructions) |
| POST | `/api/billing/payment-claims` | Authenticated | Submit a claim: workspaceId, plan, billingPeriod, method, transactionId, amount, proofUrl (5/hour; one pending per workspace; txid anti-replay) |
| GET | `/api/billing/payment-claims` | Owner | Review queue (`?status=pending|approved|rejected`) |
| POST | `/api/billing/payment-claims/:id/approve` | Owner | Verify + activate: transactional plan write with server-computed dates, mirrors `planId` to workspace. Audited (critical) |
| POST | `/api/billing/payment-claims/:id/reject` | Owner | Reject with reason. Audited |
| GET | `/api/billing/subscription/:workspaceId` | Member/Owner | Current plan, dates, days remaining, active/expired/none |

Plans: `STANDARD` / `ENTERPRISE`; periods `monthly` (+1 month) / `yearly`
(+1 year). Stored in `subscriptions/{workspaceId}` with `planStartAt` /
`planEndAt` (server clock authoritative). Expired workspaces fall back to
`LITE` in status responses.

---

## Messaging (`/api/messaging`)

Owner-to-user messaging over two free channels: FCM push (unlimited, free
via Admin SDK) + in-app inbox (Firestore, the source of truth — users
without a push token still see everything).

Client token registration (wire into the app once):
`setDoc(doc(db, 'users', uid, 'fcmTokens', token), { token, platform: 'web', createdAt: serverTimestamp() })`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/messaging/send` | Owner | Compose + deliver: title, body, type, audience `{ kind: single|workspace|role|all }`. Fans out to per-user inbox docs + FCM. Broadcasts capped at 3/day (Firestore-backed). Audited |
| POST | `/api/messaging/schedule` | Owner | Queue a message for a future ISO time (festival greetings, reminders) |
| POST | `/api/messaging/dispatch-due` | Owner | Deliver due scheduled messages (manual or Cloud Scheduler trigger). Idempotent |
| GET | `/api/messaging/inbox` | Authenticated | Caller's own messages, unread-first, paginated |
| POST | `/api/messaging/inbox/:id/read` | Authenticated | Mark own message as read (ownership re-checked) |
| GET | `/api/messaging/templates` | Owner | Greeting/reminder templates with locale variants |
| POST | `/api/messaging/templates` | Owner | Create template (`title`/`body` in `en` + `bn`/`hi`) |

Audience kinds: `single` (one UID) · `workspace` (all members of a
workspace) · `role` (all holders of a role, platform-wide) · `all` (every
user — use carefully).

---

## Audit trail

Sensitive operations write to the `audit_logs` Firestore collection (append-only;
rules deny update/delete). Logged actions:

`tenant.provision` · `claims.grant` · `workspace.pin_rotate` ·
`workspace.plan_change` · `user.disable` · `user.enable` ·
`data.export` · `owner.bootstrap` ·
`verification.apply` · `verification.approve` · `verification.reject` ·
`moderation.hide_content` · `moderation.warn_user` · `moderation.suspend_user` ·
`moderation.unsuspend_user` · `moderation.dismiss` ·
`scheduled.samskara_reminders` · `scheduled.shraddha_reminders` ·
`billing.method.upsert` · `billing.claim.submit` · `billing.claim.approve` ·
`billing.claim.reject` · `messaging.send` · `messaging.schedule` ·
`messaging.dispatch_due` · `messaging.template.create`

Each entry: `action`, `actorUid`, `actorEmail`, `workspaceId`, `targetType`,
`targetId`, `details`, `ip`, `severity`, `createdAt` (server timestamp).

---

## Environment variables

| Var | Required | Purpose |
|-----|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Local dev only | Service-account JSON for Admin SDK (functions use identity by default) |
| `PIN_PEPPER` | For PIN features | Pepper for admin-PIN SHA-256 hashing |
| `DEMO_ADMIN_PIN` | For demo PIN | Demo workspace PIN (server-only) |
| `WEBHOOK_SECRET` | For webhooks | HMAC secret for payment-gateway signature verification |
| `GEMINI_API_KEY` | For AI | Server-side Gemini key (never exposed to client) |
| `SMTP_USER` / `SMTP_PASS` | For email | Gmail SMTP identity for notifications |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins (default: open) |

---

## Rate limiting

Shared sliding-window limiter (`middleware/rateLimit.ts`): per-IP and per-user
presets. In-memory per function instance — abuse mitigation, not a global quota.
Tighten via `CORS_ORIGINS` + Firebase App Check for stronger guarantees.

## Zero-cost operating notes

- 125K invocations/month, 40K GB-seconds — the API surface above is far inside
  these at pilot scale.
- Firestore: 50K reads / 20K writes per day. Exports are capped; overview uses
  `count()` aggregations.
- If quotas are ever hit, the Spark plan hard-stops that service until the next
  cycle — the `/api/health` endpoint makes this visible to monitors.
