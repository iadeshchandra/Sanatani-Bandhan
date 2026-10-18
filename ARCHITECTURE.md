# Sanatani Bandhan — Architecture

> **Read this first.** This document lets any AI contributor understand the whole app cold: product, stack, principles, routes, modules, data, money, design system, and how code ships. Claims verified against the repo at `~/workspace/sanatani-bandhan/Sanatani-bandhan-final-main/` on 2026-10-18. Anything marked *(unverified)* was not confirmed in code.

---

## 1. Product overview

**Sanatani Bandhan** is an **offline-first ERP + B2C super-app for Sanatana Dharma institutions** — "Salesforce for Dharmic Institutions." One platform federates five org types — **Mandir** (temple), **Goshala** (cow shelter), **Ashram/Dharamshala**, **Gurukul** (school), **Sangha** (community) — bridged by a **Universal Sanatani ID** (`SAN-XXXXXX`) every devotee carries across institutions.

**Vision:** the all-in-one Sanatani life companion ("all in one sanatani life bandhan") — dominate the market, not participate in it. Every feature is judged by world-class premium feel + Sanatani warmth.

**Who uses it:**
- **Devotees (solo):** personal spiritual home — sadhana, panjika, giving, ID card, chat, SOS. Solo is the primary surface.
- **Institutions:** trustees, accountants, priests, sevadars run their org (treasury, devotees, events, inventory, crisis command) from per-org-type dashboards.
- **Professionals:** purohits and jyotishis take bookings via the Seva Pro marketplace.

**Business model:** freemium SaaS + Pro subscriptions + marketplace commission (see §8).

---

## 2. Tech stack & hard constraints

| Layer | Choice |
|---|---|
| Client | React 19 + TypeScript + Vite, Tailwind v4, react-router-dom v7, PWA (`vite-pwa`) |
| Maps | Leaflet + OSM/Esri tiles (keyless); optional managed CARTO key |
| Backend | **Firebase Spark only: Auth + Firestore.** Project `shda-6245c`, hosting `sanatanibandhan.web.app` |
| Repo | `iadeshchandra/Sanatani-Bandhan` (trunk-based, `main`); repo root IS the app project |
| Admin | GodMode console at `/mysecretlogin` (owner-only) |
| CI | Every push to `main` builds the Vite app and deploys **Hosting + `firestore.rules`** — the repo's `firestore.rules` is the live ruleset, not the console |

**The $0 / no-card rule (standing, non-negotiable):** no Blaze plan, ever, until revenue justifies it. Consequences:
- **No Cloud Storage** → files go through **File Vault** (Firestore-doc storage, §6).
- **No Cloud Functions outbound** → no server email/SMS, no FCM dispatch (FCM *token registration* exists; *dispatch* needs Blaze).
- **No true cron** → scheduled work is manual "run due jobs."
- Firebase is the **only** production/demo surface. Never propose GitHub Pages or another host.

**Transport cap:** the GitHub connector rejects args > 131,072 bytes — keep pushes batched under ~120 KB; `package-lock.json` cannot be pushed via connector at all (omit it).

---

## 3. Architecture principles

**Solo-first.** "Solo is home, organisations are destinations, Suchana is the guide." The authenticated solo surface is a 4-tab shell — **Home / Orgs / Suchana / Profile** (`src/solo/SoloWorkspaceShell.tsx`: `/app/home`, `/app/orgs`, `/app/suchana`, `/app/profile`). Org dashboards are destinations you visit; demo/preview scaffolding must never leak into devotee UX.

**Offline-first.** IndexedDB (`idb`) + sync outbox queues; the app works with zero connectivity and syncs later. No feature may assume a live connection. Background location is impossible in a PWA — foreground-only until a native APK exists.

**Firestore rules are the hard security boundary.** `firestore.rules` (2,308 lines, deny-by-default) is the only real security. Client-side gates are UX, not protection — every sensitive write must be rules-pinned (field allowlists, state machines, role checks).

**Two-wallet architecture (inviolable).** *Platform Wallet* (top-ups, marketplace, commission) vs *Personal Wallet* (private P2P IOU ledger). Never mixed. The app is a **coordination layer, never custody** — real money moves via bKash/Nagad/UPI outside the app (Bangladesh Bank e-money compliance).

**Sanatani vibe.** Warmth and dignity in every string: *dakshina* not escrow, *Suchana* not notifications, *Ashirvad* 🙏 not likes, verification is "your sacred credentials, honored" not "KYC compliance."

**i18n: 10 languages** — `en hi bn sa ta te mr gu kn ml` (`src/i18n/lang/`). Sacred terms are never translated. New modules ship EN/HI/BN minimum; old desks are English-only (documented, not regressed).

**Guide system (standing directive).** Every feature ships a quick, professional, modern guide — coach-mark spotlights + hint bubbles + "What's this?" term explainers (`src/components/guide/`), 2–3 steps max, dismissible, never blocking, progress remembered per user.

---

## 4. Route map

**Public:**
| Route | Renders |
|---|---|
| `/` | Landing page (hero, pricing, CTAs — every CTA traced to a real destination) |
| `/login`, `/signup` | `PortalLogin` (email/password + Google) |
| `/contact` | Contact/inquiry form → DB, spam-guarded |
| `/get-app` | Smart install link (device detect, `sanatanibandhan://home` deep link, PWA-first on iOS) |
| `/orgs` | Public org directory; `/org/:orgId` public org page |
| `/org/:orgId/campus`, `/org/:orgId/campus/manage` | Temple campus map visitor view / trustee builder |
| `/seva/pro/:uid` | Unified professional profile (purohit + jyotish + reviews + booking) |
| `/seva/journeys` | Seva catalog (12 life events, bundle booking) |
| `/festival/:orgId/:eventId` | Festival event page |

**Authenticated (`/app/*`, session-kind shells):** `AppContentRouter` renders one of four mutually-exclusive shells — `PurohitWorkspaceShell`, `SoloWorkspaceShell`, `JyotishWorkspaceShell`, or org-space (`OrgSpaceShell`). Solo sub-routes: `/app/home[/:subTab]`, `/app/orgs`, `/app/orgs/join`, `/app/org/:orgId`, `/app/suchana`, `/app/profile`. (`/app` → `/app/home`.)

**Owner-only:** `/mysecretlogin` → GodMode console (`GodModeConsole2`); `/system-override` + `/admin/*` → SuperAdmin dashboard (guarded). Never link these in devotee UX.

---

## 5. Module catalog

| Module | One line | Key files | State |
|---|---|---|---|
| Solo Home + Sanatani ID | Devotee's personal space; auto-minted `SAN-XXXXXX` on signup; VDA-style speakable alias (`name@scope`) on top | `src/solo/` (`SoloHome.tsx`, `HomeTab.tsx`, `SoloSignupForm.tsx`, `ProfileTab.tsx`, `VdaAliasSection.tsx`), `src/lib/vda.ts` | ✅ Complete |
| Sangam (social) | Devotional social layer: feed, circles, seva board, events, org pages; Ashirvad 🙏, chronological, no ads | `src/sangam/` | ✅ Complete (org pages still seed-based — living auto-provisioned pages designed, not built) |
| Chat + P2P money | 1:1/org threads, blessing cards, money-request IOU tracker (Rail-1/Rail-2, TrxID confirm) | `src/chat/` (`chatService.ts`, `p2pService.ts`, `p2pLedger.ts`) | ✅ Complete |
| Seva Pro marketplace | Purohit/jyotish bookings, tiers (REGISTERED→VERIFIED→TRUSTED), atomic commission pre-funding, referral pipeline | `src/lib/sevaPro/`, `/seva/pro/:uid` | ✅ Complete |
| Crisis / SOS | 3-tap SOS, GPS broadcast at SOS moment only, crowd auto-escalation, Crisis Command dashboard | `src/crisis/` (`PanicButton.tsx`, `SOSFlow.tsx`, `sosService.ts`) | ✅ Tier 1 complete (T2 SMS / T3 mesh designed, not approved) |
| Maps | Temple campus maps (builder + visitor) + SOS responder map (active-only, single pin) | `src/maps/`, `src/campus/` | ✅ Phase 1 complete (Phase 2: visit journal → yatra, not started) |
| Panjika | Vedic calendar, 9 traditions, festival awareness | `src/solo/PanjikaTab.tsx`, `src/lib/panjika*` | ✅ Complete |
| Sadhana | Japa counter, streaks, vrata schedules | `src/solo/SadhanaTab.tsx` | ✅ Complete |
| Samskara One | 16-samskara family lifecycle suite | `src/samskara/` | ✅ Complete |
| Pathshala One | Gurukul/school suite (Gurukul-only guard) | `src/pathshala/` | ✅ Complete |
| Goshala One | Cow-shelter ops (Goshala-only guard) | `src/goshala/` | ✅ Complete |
| Matha One | Sangha/Ashram suite, parampara lineage | `src/matha/` | ✅ Complete |
| Jyotish One | Consultations, remedies → purohit referral pipeline | `src/jyotish/` | ✅ Complete |
| Treasury | Org finance: one-big-number hero, hundi/donation ledgers, 80G receipts | (org desks) | ✅ Complete |
| Wallet | Platform wallet: top-up (geo), history, scan; express dana sheet (UPI-first, shradhā slider, "Give again"), punya ledger, tithi nudges, shareable receipts | `src/solo/WalletTab.tsx`, `src/solo/ExpressDanaSheet.tsx`, `src/solo/ShareReceipt.tsx`, `src/notifications/tithiNudges.ts`, `src/lib/wallet.ts` | ✅ Complete |
| Notifications | `NotificationCenter` event bus (see §9) | `src/notifications/` | ✅ Complete (FCM dispatch needs Blaze) |
| Guides | Coach marks + WhatsThis framework, 10-lang | `src/components/guide/` | ✅ Complete |
| QR / App Growth | Branded QR studio, `/get-app`, temple posters, GodMode analytics | `src/appgrowth/` | ✅ Complete |
| API Key Manager | GodMode-managed keys (YouTube, CARTO…), client-safe/server-only badges, audit log | `src/apikeys/` | ✅ Complete |
| File Vault | Zero-cost Storage replacement (see §6) | `src/lib/fileVault.ts`, `src/lib/fileVaultIdb.ts` | ✅ Complete |
| Chat backup | Encrypted backups to user's own Google Drive (PBKDF2→AES-GCM, `drive.appdata`) | `src/chat/backup/` | ✅ Complete |

**Suites carry org-type guards** (e.g. Vivah-in-Gurukul bug class): every org suite checks org-type at the routing layer.

---

## 6. Data layer

**Firestore collections (major):** `users`, `sanataniProfiles`, `workspaces`, `tenants/{id}/…` (treasury, devotees, private, publicProfile), `wallets`, `walletTransactions`, `topupClaims`, `p2pRequests`, `marketplaceGigs/Orders/Providers/Transactions`, `platformRevenue`, `commissionFreezeRequests`, `payouts`, `purohitApplications`, `jyotishConsultations`, `sangamPosts/Comments/Circles/Events`, `chats/{id}/messages/{id}`, `crisis_events/{id}/{responses,notified}/…`, `crisisCoordinators`, `notifications/{uid}/items/{id}`, `fileVault/{id}[/chunks/{n}]`, `platformConfig/{apiKeys,public,…}`, `campusMaps`, `zoneReports`, `appGrowth*`, `audit_logs`, `verificationApplications`.

**Rules model (deny-by-default):** owner-only (`platformConfig/apiKeys`, GodMode), self-only (`users/{uid}`, `wallets/{uid}`, `notifications/{uid}`), parties-only (`p2pRequests`, `chats`), tenant-scoped (`tenants/{id}` via membership), coordinator carve-outs (`crisis_events` — sender + `isCrisisCoord` + notified responders), field-pinned state machines (`marketplaceOrders` status transitions, commission immutability). Rules updates ship as the **complete file**, never snippets.

**Offline stores (IndexedDB):** sync outbox queues, chat archive (`archiveStore`), private File Vault bytes (never uploaded), notification outbox.

**File Vault (no Cloud Storage):** WebP compress (1280px, q0.72, EXIF stripped) → SHA-256 dedupe → ≤700KB single `fileVault/{fileId}` doc (base64), larger → chunked subcollection (≤500KB/chunk). Visibility tiers: `public`, `crisis` (tenant members), `private` (device-only, bytes never uploaded). Owner-scoped IDs (`fv_p_{uid}_{hash}`), tenant-scoped crisis IDs. Blaze-day migration path documented in code.

---

## 7. Auth & RBAC

**Sign-up:** email/password or Google → Firebase Auth → **auto-minted Universal Sanatani ID** (`SAN-XXXXXX`, `src/solo/SoloSignupForm.tsx`) → Solo dashboard. "Grow with Sanatani Bandhan" (JoinUpgrade) offers org/purohit/jyotish upgrades contextually. Sign-in lands by RBAC priority (SuperAdmin → Trustee → Purohit → Jyotishi → Solo).

**Role hierarchy:** `SuperAdmin → Trustee → Priest → Accountant → Sevadar → Devotee` (+ `CSO`). Roles are per-workspace (`workspaceMembers`), sessions are mutually exclusive (solo / purohit / jyotish / org). Logout wipes the role cache.

**GodMode** (`/mysecretlogin`): owner-only via rules (`iadeshchandra@gmail.com` + owner UID). Tabs: Insights, Marketplace, Finance, Professionals, App Growth, API Keys, Content, Settings, Support. Server-only ops (Auth disable, FCM dispatch) return `REQUIRES_BACKEND` with UI badges — never silently fail.

---

## 8. Money flows

**Two wallets, never mixed.** Platform Wallet = top-ups, marketplace escrow, commission. Personal Wallet = private P2P IOU ledger. The app coordinates; money moves on external rails.

**Top-up (geo-detected):** BD → Bangla QR · IN → UPI · INTL → Payoneer primary + Wise fallback. Manual country choice always wins over geo-detect. Claim → owner approval → wallet credit.

**Booking paths (3):** wallet escrow · pay now · pay-after-task. Post-task commission gate; Rail-1 = provider's own QR/UPI (**8%** commission), Rail-2 = platform-collected (**12%**). Marketplace commission 12% (GodMode-editable). Commission pre-funding is one atomic `writeBatch` (5 legs, audit-verified); shortfall → guided top-up; disputes freeze via `commission_held`.

**P2P:** QR format `SB-P2P:1:<requestId>:<amount>:<currency>:<receiverId>`. IOU lifecycle (request → TrxID declare → two-sided confirm → atomic settlement crediting receiver). Unique payable amounts (৳1,007 trick) + bKash SMS audits + strike system (warning → 7-day suspension → owner review) fight payment bypass.

**FINAL pricing (locked 2026-10-14, `src/config/planPricing.ts`):**

| Tier | INR/mo | BDT/mo | USD/mo | Annual |
|---|---|---|---|---|
| Seva | ₹0 | ৳0 | $0 | — |
| Standard | ₹499 | ৳700 | $6 | 2 months free |
| Premium | ₹1,999 | ৳2,800 | $24 | 2 months free |
| Purohit/Jyotishi Pro | ₹199 | ৳280 | $2.50 | 2 months free |

Freemium = all features on every plan; only usage caps differ (Seva: 100 devotees / 2 seats / 1 branch). India: 18% GST on commission.

---

## 9. Notifications

`src/notifications/NotificationCenter.ts` — a unified event bus, not scattered `send()` calls. **4 priority tiers:** `critical` (breaks quiet hours + DND — SOS only), `important` (prompt), `gentle` (batched into digests, feeds the Suchana stream), `silent` (in-app center only). **Quiet hours default 05:00–07:00** (Brahma muhurta), per-user, per-category controls, festival awareness via Panjika, smart grouping, cross-device read sync, offline IndexedDB outbox, nudge engine (suggestions only — never coercive). Self-listen architecture: rules are self-write-only (privacy by construction).

---

## 10. Design system (for UI/UX contributors)

**Sanatani vibe is law:** amber/stone/indigo palette, devotional warmth in every string, sacred terms never translated, institution-neutral copy (no temple-only language in shared UI).

**Placement patterns:** one-big-number heroes (treasury, wallet — never 3 competing numbers); progressive disclosure (2xl breakpoints); chromeless devotee preview (no ERP chrome in devotee view); bottom sheets for booking flows (stay in context); guided empty states everywhere (no dead ends — every empty state explains the next step).

**Constraints:** ≥44px touch targets; mobile-first at 390px; SOS FAB must never cover interactive controls (collapsible 48px mini + body safe-padding); body scroll content reserves clearance.

**Guide framework:** `src/components/guide/` — `CoachMark` (spotlight), `TourPill` ("Take a tour"), `WhatsThis` (term explainer: gotra, tithi, dakshina…), `useGuide` + `guideProgress` (per-user memory). New features register guides in `src/lib/moduleGuides.ts` + `src/crisis/crisisGuides.ts`.

**i18n pipeline:** `src/i18n/schema.ts` (TranslationSchema — extend for new sections) → `src/i18n/lang/{en,hi,bn,…}/`. Push lang dicts with `ensure_ascii=False` (escaping bloats JSON past the 131KB cap).

---

## 11. Product-design context

**The true incumbent is WhatsApp + paper registers** — free, zero training, everyone has it. But: photos of ledgers aren't books, money talk is unauditable, 256-member limits, institutional memory walks out with admins. We replace *that*, not the software vendors.

**5 exploitable market gaps:** (1) offline-first all-in-one — nobody owns it; (2) goshala ops software — uncontested vertical; (3) hundi→bank cash chain-of-custody (the Ram Mandir scandal proved the need); (4) vernacular-first + 80G/UPI compliance in one box; (5) WhatsApp-shaped community that auto-converts to audited books.

**Competitors — one line each (full teardowns in `~/workspace/research_notes/competitor-teardowns/`):**
- **SwaDharma** ("Dharma Stack"): unified "DharmaID" (`name@temple` VDA-style), SaaS + transaction cut — *pre-launch vapor; learn the speakable-ID format, beat with "we exist and never take a cut of devotion."*
- **QueueBuster Temple POS**: counter POS, big-temple logos — *learn counter workflows, beat with offline-first + all-org-types.*
- **Razorpay donations**: best Indian giving UX (UPI Intent zero-typing, tangible item cards, auto-80G) — *learn express checkout + tangible cards, beat with no 2%+GST skim + offline hundi custody.*
- **Tithe.ly**: polished 4-rail giving (QuickGive one-tap, text-to-give) — *learn speed mechanics, beat with devotional meaning (Panjika-timed, sadhana journal, blessing with receipt).*
- **Pushpay/Planning Center**: Western church tools, USD-priced, not in India — *learn UX polish only.*

**The "one better" principle:** never parity. For every borrowed mechanic, name the single way ours beats it for our users — warmer, fewer taps, offline-first, honest pricing.

---

## 12. Build & deploy workflow

1. **Build locally** in `~/workspace/sanatani-bandhan/Sanatani-bandhan-final-main/` (NOT a git checkout — `git` fails here; use `/opt/hatch/bin/github`).
2. **Verify:** `tsc --noEmit` = 0; `vite build` clean; boot-path audit before architectural deploys (all `JSON.parse` in try/catch, guarded localStorage, AppInitializer gating).
3. **Stage** changes. **Push only on owner approval** — approval prompts are a runtime safeguard, cannot be worked around. Push via `push-files` in batches <120KB.
4. **Merge discipline (shared files):** fetch the remote base *twice* (stale-blob lesson), diff, merge your changes onto the remote base with scripted replace + assert-count anchors, SHA-verify after push. New files are safe to push whole.
5. **CI** builds + deploys Hosting + `firestore.rules` on every push. Pace pushes — stacked deploys race and an older build can win. Never announce "live" before grepping the served bundle for your markers.
6. **Bug triage:** stale-cache-first — suspect PWA/service-worker/CDN staleness or deploy ordering *before* diagnosing code (but verify: the SOS fan-out bug proved some "stale" reports are real).

**Sandbox quirks:** esbuild-loaded Node processes can get EPERM on file writes (check with `node -e "require('esbuild');require('fs').writeFileSync('/tmp/t','x')"`); prefer `node node_modules/<pkg>/bin/<bin>.js` over npx; 0-byte poisoned inodes must be deleted and recreated.

---

## 13. Key invariants (must never break)

- **Pricing table values** (§8) — locked 2026-10-14; any change is an owner decision, never an agent refactor.
- **Two-wallet separation** — Platform vs Personal never mixed, in code or copy.
- **Deny-by-default Firestore rules** — no client-writable aggregates, no widening without owner sign-off.
- **SAN-XXXXXX format** — canonical devotee key; aliases (e.g. VDA-style) sit on top, never replace.
- **No Blaze / $0 rule** — never re-raise; Storage/Functions/FCM-dispatch stay unavailable by design.
- **Firebase as the only production surface** — no GitHub Pages, no side hosts.
- **Status words match reality** — never label dispatched/queued work done; never invent test, CI, or deploy results.
- **The §1 relationship note lives in the parent context** (standing repair) — this file is technical; keep it that way.

---

## Appendix A — Work log (updated 2026-10-18)

**"Give better" program — SHIPPED ✅** (7 commits on `main`, 2026-10-18, all SHA-verified): the 7 items from the competitor teardowns are live — express dana sheet (`src/solo/ExpressDanaSheet.tsx`: UPI-first, presets, 15-sec bar) → "🙏 Give again" one-tap + shradhā slider → VDA-style ID alias (`src/lib/vda.ts`, `src/solo/VdaAliasSection.tsx`: `name@scope` on top of SAN-XXXXXX, first-write-wins claim) → tangible seva cards (`src/components/org/SevaCards.tsx`, trustee CRUD, goal bars) → devotional layer (`src/notifications/tithiNudges.ts`: Ekadashi/Purnima/Amavasya nudges; punya ledger in SadhanaTab; blessing on 80G receipts) → multi-channel receipts (`src/solo/ShareReceipt.tsx`: WhatsApp/SMS/email/in-app). New rules: `vdaAliases/{aliasId}`, `orgPages/{orgId}/sevaCards/{cardId}`. Offline hundi chain-of-custody deliberately NOT built here — owned by the `mandir-cash-chain-of-custody` goal.

**Red-gap fix program — IN PROGRESS (2026-10-18):** from the all-files gap review — familyLinks/qrCodes/dispute-status rules additions, campus-map entry points (banner + trustee builder link on org pages), Purohit "In-App Chat" dead-button wiring, Purohit checkout SaaS→dharma copy rewrite. Staged for push on completion.

**Browser-audit fix batch — STAGED, awaiting push approval:** collapsible SOS FAB + body safe-padding, top-up geo-race fix, signed-in demo CTA deep-links, wallet currency via geo-detect, Panjika single dayAnchor, "Send"→"Obligations" relabel, duplicate LanguageProvider removal, demo-toast scoping, campus routes. (Samskara raw-keys report was a stale deploy, not a code bug.)

**Known deferred items:** living auto-provisioned Sangam org pages (designed, not built); Map Phase 2 (visit journal → Tirtha Diary → yatra); Crisis T2 SMS / T3 mesh (designed, not approved); Sidebar crisis-command nav entry (local-only).

## Appendix B — Key file pointers

- Routes/shells: `src/App.tsx`, `src/solo/SoloWorkspaceShell.tsx`, `src/context/AuthWorkspaceContext.tsx`
- Rules: `firestore.rules` (single source of truth — deploys live)
- Pricing: `src/config/planPricing.ts`, caps: `src/lib/planLimits.ts`
- Money: `src/lib/wallet.ts`, `src/lib/p2pLedger.ts`, `src/lib/sevaPro/`, `src/lib/rail2.ts`, `src/lib/providerPayments.ts`
- Notifications: `src/notifications/NotificationCenter.ts`
- Guides: `src/components/guide/`, `src/lib/moduleGuides.ts`
- File Vault: `src/lib/fileVault.ts`
- i18n: `src/i18n/schema.ts`, `src/i18n/lang/`
- GodMode: `src/components/common/GodModeConsole2.tsx`
- Contact truth: `src/contact.ts` (WhatsApp, support email)
