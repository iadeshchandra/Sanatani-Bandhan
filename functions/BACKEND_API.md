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
| Owner | `requireOwner` | Platform owner only — UID `ZBGzBZXdGgSJVkB9ZUixGPY1T353` or verified `iadeshchandra@gmail.com` |

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

## Audit trail

Sensitive operations write to the `audit_logs` Firestore collection (append-only;
rules deny update/delete). Logged actions:

`tenant.provision` · `claims.grant` · `workspace.pin_rotate` ·
`workspace.plan_change` · `user.disable` · `user.enable` ·
`data.export` · `owner.bootstrap`

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
