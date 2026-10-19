# Sanatani Bandhan — Architecture

> The all-in-one Sanatani life companion. Offline-first, $0 infrastructure, premium feel + Sanatani vibe on every screen.
>
> **STANDING:** Strict $0 / no-card. Firebase Spark only — no Blaze. Never self-host video. Firebase is the single production surface (`shda-6245c` → `sanatanibandhan.web.app`). Trunk-based on `main`.
>
> Last rewritten: 2026-10-19. The old ERP-domain doc (domain1..7) lives in the appendix.

---

## 1. Product Philosophy (laws)

- **Solo-first:** "Solo is home, organisations are destinations, Suchana is the guide."
- **Quality over speed, no compromises, no shortcuts.** Dignity is the product — a small temple feeling like Tirupati.
- **Sanatani vibe everywhere** — warmth and dignity in every word. Dakshina, not escrow. Suchana, not notifications. Ashirvad, not likes. Kritagyata, not ratings.
- **Institution-neutral copy** — works for Mandir, Goshala, Ashram, Gurukul, Sangha equally.
- **Guide system on everything** — 2–3 step coach marks, warm plain words, never blocking, 10-language i18n.
- **STANDING — Video:** We NEVER host video or live streams. All video/live shown in-app via YouTube (`youtube-nocookie` embeds, YouTube Shorts). No native upload, no WebRTC. $0 always. Premium feel is non-negotiable: tap-to-play, inline players, warm framing. If a user selects a video file, a warm guidance sheet (`src/video/`) walks them to YouTube → paste link — never a cold error.
- **STANDING — Offline-first preserved.** IndexedDB caches, sync queues, lazy expiry. App works on 2GB RAM / Android 8+ / 360px wide.
- **STANDING — Privacy:** nothing automatic, nothing permanent, nothing public (map/visit data). Consent cards before any one-time use. Coordinates discarded, never stored.

---

## 2. Solo Shell (`src/solo/`, `src/App.tsx`)

The personal home. Mobile bottom nav / desktop sidebar: **Home · Orgs · Suchana · Profile**.

- `SoloWorkspaceShell.tsx` — routes solo sessions by RBAC priority.
- `HomeTab.tsx` — the solo dashboard with sub-tabs (sadhana, panchang, panjika, jyotish, marketplace, wallet, samskara, profile).
- `SuchanaPage.tsx` / `AjkerSuchana.tsx` — the guide layer (notifications rendered as *suchana*, warm blessings not badges).
- `ExpressDanaSheet.tsx` — dana flow (presets, Shradhā slider, 80G receipts).
- `LanguageRegionSettings.tsx`, `NativeWelcomeSheet` — language + region ("kovil vs mandir, Deepavali vs Diwali, user choice always winning").
- Solo identity: `SAN-XXXXXX` universal ID (`src/solo/soloSession.ts`).

**STANDING:** Boot-path audit before deploy on architectural changes. App.tsx hosts all global components INSIDE `<BrowserRouter>` (history: `useNavigate()` crash).

---

## 3. AI Assistant (`src/ai/`)

**Architecture law:** accuracy from architecture. **Deterministic pipeline: intent → executor → template renderer.** The LLM (later) is ONLY a renderer over DATA blocks — the AI never invents facts.

- `intents.ts` — 16+ intents (greeting, tithi_today, festival_next, dharma_question, navigate, nearby_temples, tirtha_summary, booking_help, dana_help, sos_help, voice_upgrade, language_help, sadhana_summary, howto, fallback_unknown).
- `tasks/` — pure executors per intent.
- `rbac.ts` — 8 roles; intents are role-scoped. Owner-only intents hard-gated (`canUseCopilot`).
- `assistantBridge.ts` — devotee UI entry point. **STANDING FIX (2026-10-19):** was a `@vite-ignore` dynamic import that could never resolve at runtime (Vite bundles everything) — the sheet silently fell back to standby forever. Now a static import of `./assistant` with standby as fail-safe only.
- `crisisKeywords.ts` — 46 crisis keywords → SOS, bypassing everything.
- `corpus/` — restricted dharma corpus (tithi, festivals, practice, samskaras, concepts, etiquette) in EN/HI/BN; dharma answers come ONLY from here, escalating to "ask Purohitji" below confidence — never guesses.
- `navigation.ts` + `corpus/navigation.ts` — navigation brain: "where is X?" → deep-link answers with "Take me there" actions.
- `dharma.ts` — deterministic keyword matcher with confidence scoring.
- **Location assistance** — consent-first one-time `getCurrentPosition`; coordinates discarded, never stored/logged (tested invariant). Community `campusMaps` primary, curated tirtha corpus fallback.
- **On-device voice** (`voice/webllm.ts`) — Qwen2.5-3B via `@mlc-ai/web-llm`; deterministic answer computed FIRST, LLM enhancement optional (fail-open); crisis bypasses LLM. Size shown before tap, WiFi-gated, pausable, one-tap removal.
- **GodMode Copilot** (`godmode/copilot.ts`, `copilotTasks.ts`, `CopilotPanel.tsx`) — 5 admin intents: morning briefing, platform stats, moderation help, anomaly alerts, announcement drafting. **Advises, never acts** — zero consequential actions; every move needs the admin's tap; audit-logged. Owner-only (3 RBAC layers).
- `godmode/triage.ts` — approve ≥80 / review 50–79 / reject <50 scoring for moderation queues.

---

## 4. Social Layer — Sangam (`src/sangam/`)

Facebook-complete, Sanatani-vibed. Store: `sangamStore.tsx` (`SangamProvider`).

| Surface | Module | Notes |
|---|---|---|
| Feed | `FeedTab.tsx` | Ranked (see §11). Service cards ≤15% density. ✨ For You / 🕐 Recent toggle. |
| Watch | `watch/` | Unified video: 🔴 Live Now (from `orgLiveStatus`) + 🎬 Shared Videos + 🪔 Seva Demos. YouTube only, tap-to-play. |
| Shorts | `shorts/` | Reels-style vertical feed (`ShortsViewer`, `ShortsTab`). Starts muted, double-tap → 🪔 glow. `/shorts/:shortId` deep link. |
| Stories | `stories/` | 24h disappearing ("🪔 Today's moments"). Photos via File Vault, text on warm backgrounds. View counts for authors, identities private. |
| Groups | (chat/groups) | Private group chats: family/satsang/temple/yatra. Money stays 1:1. |
| Circles/Events | `CirclesTab`, `EventsTab` | Satsang circles, Events with RSVP. |
| Live-aarti cards | `LiveAartiCard.tsx`, `liveAarti.ts` | Pinned when temple live; auto-unpins. Trustee "📌 Pin live aarti". |
| Festival moments | `FestivalMomentsRail.tsx`, `festivalMoments.ts` | Time-bound rails (±3 days), no like counts. |
| Kritagyata | `GratitudeWall.tsx`, `kritagyata.ts` | "🙏 N families shared gratitude" — never ★ numbers. Prompted after booking completion. |
| Consultation answers | `consultationAnswer.ts` | Anonymized jyotishi wisdom posts; consent-gated; identity-leak validator. |
| Share-referral | `ShareButton.tsx`, `referrals.ts` | `?ref=SAN-XXXXXX` links; warm "you guided a family" ack; no monetary referral. |
| Devotee profiles | `src/social/` (`DevoteeProfile.tsx`, `DevoteeRoute.tsx`) | Public identity surface at `/u/:uid` — avatar, SAN id, bio, stats, public posts, follow + message. **Privacy law:** `users/{uid}` is self-read-only, so profiles read ONLY `devoteeProfiles/{uid}` (public, user-controlled) + denormalized public post data. `AuthorLine` tappable everywhere (feed, comments, watch, shorts, stories). New collections: `devoteeProfiles`, `follows/{uid}/following` (asymmetric). |
| Block & mute (Step 5) | `src/social/` (`safety.ts`, `safetyService.ts`, `SafetySheet.tsx`, `SafetyList.tsx`) | User safety: **block** hides posts/comments + stops DMs both ways; **mute** hides posts, DMs still work. Entry: post ⋯ menu (Report + Mute + Block), DevoteeProfile ⋯ button. ChatThread shows a quiet banner + disables input when either party blocked; DevoteeProfile guards `getOrCreateDirectChat`. **Privacy law:** lists readable ONLY by the owner (or superadmin) — blocked users are NEVER notified. `SafetyList` in Settings to review/undo. New collections: `blocks/{uid}/blocked`, `mutes/{uid}/muted` (own-uid read/write, no self-target). |

**Moderation:** report buttons everywhere; `sangamReports`; author/admin delete; no edits on videos.

**Comment sync (Step 4, 2026-10-19):** multi-device via live `onSnapshot` subscription per open thread (`subscribeComments` in `sangamStore.tsx`, merged by `mergeComments` in `comments.ts` — cloud wins on id, unsynced locals kept). **Root-cause fix:** `addComment` previously pushed the raw object (`id` + `localOnly` + `updatedAt`), which the `sangamComments` create whitelist rejected — comments never reached the cloud. Writes now use `toCloudComment()` (8 whitelisted fields only). `commentCount` on the post bumps via `FieldValue.increment(1)`; rules permit any signed-in user exactly ±1 on `commentCount` alone (never below 0).
- **CRITICAL FIX (2026-10-19):** `createPost` had the same bug class — it pushed the raw post object (`id`, `localOnly`, `ashirvadBy`, `volunteers`, `updatedAt`), all rejected by the `sangamPosts` create whitelist. **Posts were never reaching the cloud either.** Now sanitized via `toCloudPost()` in `src/sangam/comments.ts` (exact whitelist mirror).

---

## 5. Video & Live Architecture (`src/darshan/`, `src/video/`) — STANDING LAW

**We never host video or live streams. YouTube is the free backbone. $0 always.**

- **Live Darshan** (`src/darshan/`) — org channel linking (`ChannelLinkCard`), 🔴 live badges (`LiveBadge`), full-screen viewer (`DarshanViewer`, youtube-nocookie), aarti schedules, gentle Suchana on go-live (respects quiet hours). Purohit "Go Live" in bookings (`GoLiveButton`) with dual consent gates + shraddha/funeral privacy warning. Live detection via managed YouTube API key; Firestore-cached poller with leader election (1 API call per interval no matter the viewers).
- **Darshan Yatra** (`src/darshan/yatra/`) — multi-temple live mode: swipe between ALL live temples ("12 Jyotirlingas live now"). Curated circuits (12 Jyotirlingas in canonical order, Char Dham, 8 Shakti Peethas, EN/HI/BN fuzzy matching). Festival auto-curation (±3 days: "🪔 Diwali Darshan Yatra — 8 temples live"). Entry via `YatraButton` (renders when ≥2 live) in Watch's Live Now section. Zero new collections, zero rules changes.
- **Universal Search** (`src/search/`) — header search button (next to Suchana; 4-tab shell stays sacred). Live debounced results grouped by category: 🛕 temples, 👥 people, 📝 posts, 🎬 videos, ⚡ shorts, 🪔 services. $0 client-side filtering over bounded windows; recent searches in IndexedDB (local only); "🪔 Loved this week" trending. People search privacy-safe (public posts only, no privilege escalation). Zero new collections, zero rules changes.
- **Darshan Yatra** (`src/darshan/yatra/`) — multi-temple live mode: swipe between all live temples ("12 Jyotirlingas live now"). Curated collections (Jyotirlingas, Char Dham, Shakti Peethas), festival auto-curation. *The "only we can do this" feature.*
- **Upload guidance** (`src/video/`) — intercepts video-file selection anywhere; warm sheet: "Your video belongs here — let's get it in." 3-step YouTube guide, channel memory, context-aware routing. Tests assert zero blaming language.

---

## 6. Ranking Engines (`src/ranking/`) — deterministic, client-side, $0

No ML, no backend, no black boxes. Weights tunable in **GodMode → Ranking** tab (stored in `platformConfig/ranking`).

- **Feed** (`feed.ts`) — closeness 30% · meaningfulness 25% · recency 25% (48h decay) · content affinity 10% · diversity penalty (no author floods) · calm guardrails (reported −80%, ignored −30%). User signals in IndexedDB, never leave the device.
- **Marketplace** (`marketplace.ts`) — relevance 30% · trust tier 25% (TRUSTED 1.0 / VERIFIED 0.7 / REGISTERED 0.4) · performance 20% (completion, on-time, gratitude) · responsiveness 10% · recency 5% · **newcomer boost 10%** (anti-winner-take-all) · dispute/cancellation penalties. `explainScore()` returns human-readable reasons.
- **Shorts** (`shorts/shortsRanking.ts`) — recency 35% + closeness 25% + Ashirvad velocity 25% + engagement 15%.

---

## 7. Map System (`src/campus/`, `src/maps/`, `src/tirtha/`)

Privacy laws: **nothing automatic, nothing permanent, nothing public.**

- **CampusBuilder** (`campus/CampusBuilder.tsx`) — geo-pin or layout-image modes; per-org-type templates; 19 POI categories; 10-language zone labels; printable anti-phishing zone QRs (`zoneQr.ts`, `SB-ZONE` format).
- **"Map Your Temple" wizard** (`campus/MapYourTemple.tsx`, `wizardLogic.ts`) — guided 5-step onboarding (shrine → entrances → comforts → everything else → review & publish). Completeness checklist, overlap warnings, draft auto-save, devotee preview. **Trustee/admin only; rules are org-scoped** (a trustee of Org A cannot edit Org B's map — audited).
- **Tiles** (`maps/tileProviders.ts`) — Esri World Topo (light) + Esri Dark Gray (dark) primary, OSM fallback. CARTO via managed key.
- **Tirtha Diary** (`src/tirtha/`) — private visit journal: manual opt-in check-in (never auto-detected), month-grouped timeline, yatra grouping, one-tap forget, local-first with tombstoned sync.
- **AI location assistance** — consent card → one-time fix → results → coordinates discarded (tested no-storage invariant).

---

## 8. Seva Bazar — Marketplace (`src/marketplace/`, `src/sangam/sevaBazar*`)

Feed discovers, chat checks out. **No store tab.** Trust is person-shaped.

- **Service cards** (`sangam/ServiceCardPost.tsx`, `serviceCard.ts`) — devotional copy, 4:5 photo, trust row, "🛡 Dakshina Suraksha · pay after seva", ONE CTA "🙏 Ask Panditji". Demo intro videos (YouTube) with play overlays → flow into Watch.
- **Booking** (`sangam/SevaBookingSheet.tsx`, `sevaBooking.ts`) — mode chips, 3 muhurat slots (real tithi via `drikTithiAt`), sankalpa name, Shradhā slider, **token advance 20% (min 51, rounded to 10)**. Writes existing `marketplaceOrders` (Rail-2, commission snapshotted).
- **Trust tiers** — REGISTERED → VERIFIED → TRUSTED; warm trust score display; referral credit from platform margin.
- **Commission** — Rail-1 8% / Rail-2 12% (GodMode-editable); commission pre-funding, shortfall → guided top-up, dispute freeze via `commission_held`.
- **Chat + money** (`src/chat/`) — QR `SB-P2P:1:…`; **two-wallet architecture: Platform vs Personal, NEVER mixed**; coordination layer, never custody (Bangladesh Bank e-money regs); bKash/Nagad/UPI. Group chats private; money stays 1:1.
- **Gig detail + blessings** (Step 7, 2026-10-19) — tapping a GigCard opens `GigDetail.tsx` (full 2000-char description, provider info, blessings list) before booking. After completion, `RatingPrompt.tsx` invites blessings (1–5 + optional message, Kritagyata-framed: "How was your experience? 🙏"). `submitGigRating()` in `lib/marketplace.ts`: gated to COMPLETED orders, one per order (doc ID = orderId), atomic avgRating/ratingCount update via transaction. Pure logic in `lib/gigRatings.ts` (15/15 jest). New collection: `gigRatings/{orderId}` (public read; client-create on own completed order; immutable). Rules: narrow `marketplaceGigs` update branch for ratingCount +1 / avgRating 1–5 only.

---

## 9. Organisations — the ERP core (`src/admin/`, `src/components/`, suites)

Multi-tenant workspaces (`workspaces/{workspaceId}`, `workspaceMembers/{memberId}`). RBAC: SuperAdmin / Trustee / Accountant / Priest / Purohit / Jyotishi / Sevadar / Devotee.

- **Suites** — Pathshala One (Gurukul), Goshala One, Matha One (Sangha+Ashram), Samskara One (16 samskaras), Jyotish One (`src/jyotish/`), Annakshetra, Sabha, Nyas, Yoga, Utsav (festival war-room).
- **Treasury** (`treasury*`, `cashcustody/`) — double-entry ledger, 80G receipts, SHA-256 block-chained audits, hundi chain-of-custody.
- **GodMode** (`src/components/common/GodModeConsole2.tsx`, route `/mysecretlogin`) — owner-only console: Insights, Marketplace, Finance, Professionals, App Growth, Translations, API Keys (managed keys incl. `cartoApiKey`), Ranking, Copilot, Database Explorer, Support Inbox.
- **Spark-native soft-ban** (Step 8, 2026-10-19) — real user suspension with zero backend. `users/{uid}` carries `{ suspended, suspendReason, suspendedAt, suspendedBy }` (owner-write-only via rules; users can never self-write these fields). Owner suspends from GodMode Users tab (reason REQUIRED, shown to the user) or Moderation tab (user-target reports); unsuspend from either. The boot check in `AuthWorkspaceContext` signs suspended users out immediately and `PortalLogin` renders `SuspendedNotice` — dignified language ("Your account has been paused"), the reason, and appeal paths (email + WhatsApp). Every suspend/unsuspend is audit-logged (`user.suspend` / `user.unsuspend`, critical/warn). Pure logic in `src/lib/softBan.ts` (13 tests); mechanism in `firestoreAdmin.suspendUser/unsuspendUser`; the old `REQUIRES_BACKEND` stubs and the lying "Reversible via Unsuspend" copy are gone.
- **Crisis/SOS** (`src/crisis/`) — 3-tap SOS (long-press → 6 tiles → GPS broadcast at SOS moment ONLY); family circle + nearest Sanatanis (2km) + orgs; ACK flow; crowd auto-escalation; Crisis Command Dashboard (offline SVG map). Soft anti-abuse, never hard ban.
- **Seva Professional** — unified `/seva/pro/:uid` profiles; Pratham Seva tiers; remedy→ritual pipeline (jyotish prescribes → purohit booking, `referredBy` pinned).
- **Self-serve billing** (`src/billing/PlanUpgradeFlow.tsx`) — 3-step upgrade flow (choose plan → geo-aware pay instructions → TrxID confirm → `paymentClaims`). Reads owner-configured `paymentMethods` (public read); writes user-owned pending claims (rules: `applicantUid == auth.uid`). `PlanUpgradeHost` mounted in `NotificationWiring` (app root); `openPlanUpgrade()` event wires all 5 upsell CTAs (Sidebar, DevoteeGrid, PoojaBookingDesk, PanchayatPollingDesk, LimitReachedModal). Geo pricing via `detectPayRegion()` (BD/IN/INTL). Duplicate-pending-claim guard; amount mismatch is a warning, not a blocker. EN/HI/BN.

---

## 10. Notifications — Suchana (`src/notifications/`)

Event bus (`NotificationCenter.ts`): 4 priority tiers (**CRITICAL breaks quiet hours**); quiet hours 05:00–07:00 default; per-user `notifications/{uid}/items/{id}`; offline IndexedDB outbox. FCM server consumer needs Blaze (documented, not built). Warm copy in `warmCopy.ts` — blessings, not badges.

**Social notifications (Step 6, 2026-10-19):** self-listen watcher `useSocialNotify` (mounted in `NotificationWiring`) observes shared data and emits to self — Ashirvads on my posts (batched 90s via `SocialBatcher`: "🪔 Meera and 3 others sent Ashirvad"), comments on my posts (individual), new followers (generic, count-based), RSVPs to my events (batched). **All GENTLE: never pings, never breaks quiet hours.** New `social` NotifyKind. Rules: never self-notify, never notify blocked/muted actors, initial snapshots are baselines. Zero new collections, zero rules changes.

---

## 11. i18n — 10 Languages + Regional Native (`src/i18n/`)

`en/hi/bn/sa/ta/te/mr/gu/kn/ml`. Sacred terms never translated. Lakh/crore formatting. Gregorian + Vikram Samvat.

- **Regional terms** (`regionalTerms.ts`) — language + region resolution (kovil vs mandir, Deepavali vs Diwali); `PAN_SANATANI_TERMS` never vary; user choice always wins; `nativeDetect.ts` geo-suggests once, never silently switches.
- **Translation quality** — every string carries `verified`|`draft`; drafts display normally with one-tap correction; owner fixes go live without redeploy (`translationOverrides/{lang}`, fail-open).

---

## 12. Offline-First & $0 Data (`src/lib/fileVault.ts`)

- **File Vault** — WebP compress → SHA-256 dedupe → ≤700KB single Firestore doc, larger chunked (Cloud Storage needs Blaze — unavailable). Three tiers: public / crisis (tenant) / private (IndexedDB only).
- **Persistence** — Firestore `enableIndexedDbPersistence()`; local-first writes with tombstoned sync queues (tirtha, chat outbox).
- **Chat backup** — PBKDF2-SHA256 (210k) → AES-GCM-256 to user's own Google Drive `drive.appdata`; 64-char recovery key shown once.

---

## 13. Firestore — Key Collections & Access Patterns

Deny-by-default `firestore.rules` (repo file IS live — console pastes get overwritten). **STANDING: owner is told BEFORE any new collection is added.**

| Collection | Pattern |
|---|---|
| `users/{uid}`, `sanataniProfiles/{uid}` | self-read/write; owner reads all |
| `workspaces/{workspaceId}`, `workspaceMembers/{memberId}` | tenant-scoped; `hasRole(orgId, …)` requires `isTenantMember(orgId)` |
| `orgPages/{orgId}` (+ `sevaCards/`) | public read; trustee whitelist writes (`pinnedAarti` included) |
| `campusMaps/{orgId}`, `zoneReports` | trustee/admin write (org-scoped); public read of published |
| `tirthaVisits/{uid}/visits`, `tirthaYatras/{uid}/yatras` | owner-only, no sharing |
| `chats/{chatId}`, `chatGroups/{groupId}` (+`messages/`, `members/`) | member-only; admin-gated writes |
| `sangamPosts/{postId}` (+`ashirvad/`, `volunteers/`) | public read; schema-whitelisted create; report/delete flows |
| `sangamVideos/{videoId}` | public read; author/admin delete; counter-only updates |
| `sangamStories/{storyId}` | authenticated read; author-only; lazy expiry (`expiresAt > now`) |
| `sangamShorts/{shortId}` (+`comments/`) | authenticated read; author-only create; counter-only updates |
| `devoteeProfiles/{uid}` | public read; own-uid write only; never exposes `users/{uid}` |
| `follows/{followerUid}/following/{targetUid}` | follower-read; follower-write; no self-follow |
| `blocks/{blockerUid}/blocked/{targetUid}` | owner-read only (blocked never notified); blocker-write; no self-block |
| `mutes/{muterUid}/muted/{targetUid}` | owner-read only; muter-write; no self-mute |
| `orgLiveStatus/{orgId}` | public read; trustee/admin write |
| `marketplaceOrders/{orderId}`, `marketplaceProviders/{uid}`, `marketplaceGigs/{gigId}` | parties + owner; commission fields immutable in rules |
| `gigRatings/{orderId}` | public read; client-create on own completed order only (rules verify via get()); immutable — no update/delete |
| `wallets/{uid}`, `walletTransactions/{txnId}` | self + owner; rules-pinned debits |
| `crisis_events/{eventId}` | alerted responders only; sender + coordinators |
| `audit_logs/{logId}` | append-only |
| `translationOverrides/{lang}`, `platformConfig/{configId}` | owner write; public read (fail-open) |
| `vdaAliases/{aliasId}`, `referralAttributions/{orderId}` | transactional claim; attribution |
| `paymentMethods/{methodId}` | public read; owner write (owner-configured instructions) |
| `paymentClaims/{claimId}` | self-create (`applicantUid == auth.uid`, status must be `pending`); owner read/update |

**Rules syntax laws:** functions have NO imperative `if` (ternary/or-chains only); `match` blocks close with `}`, never `};`; `allow` ends with `;`.

---

## 14. Build, CI & Deploy

- **Vite + React 18 + TS.** `tsc` 0 is the gate; jest suites per module (100s of tests, all green).
- **CI** (`main.yml`): Install → Build → **Deploy Firestore Rules** → Deploy to Firebase Hosting. Failures surface one layer at a time.
- **PWA** — precache manifest; `version.json` exposes live build SHA (verify deploys via `curl …/version.json?t=<ts>`).
- **Bundle discipline** — lazy-load heavy chunks (web-llm, pdfmake, ShortsViewer, WatchTab, StoryViewer); Workbox 5MB precache cap respected.
- **STANDING:** `push-files` paths-file must be NUL-delimited; batches <120KB (131,072-byte transport cap); `package-lock.json` can NEVER go through the connector; lang dicts pushed with `ensure_ascii=False`; never push local `package.json` whole (remote base + surgical edits).
- **Muse cannot read Actions status** — owner reports green/red + pastes failing logs. Stale PWA/SW cache is the FIRST suspect on "still broken" reports (`local-stale-cache-first-triage` skill).
- `.github/workflows/` is user-owned (GitHub blocks automation writes) — paste-ready files only.

---

## Appendix A. Historical ERP domains (superseded as primary structure)

The app began as a Dharmic ERP with 7 domains (`domain1`..`domain7`: People&KYC, Treasury, Dharmic Ops, Community Services, Gau Seva, Security, Outreach&AI). Suite code still lives under `src/` top-level dirs (`annakshetra`, `goshala`, `matha`, `pathshala`, `satsang`, `sabha`, `nyas`, `utsav`, `yoga`, `cashcustody`, `apikeys`, `security`). New development follows the Solo-first / module structure above.

## Appendix B. Pricing (FINAL 2026-10-14 — never rename tiers)

Seva ₹0 · Standard ₹499/৳700/$6/mo · Premium ₹1,999/৳2,800/$24/mo · Purohit/Jyotishi Pro ₹199/৳280/$2.50/mo · marketplace commission 12% (Rail-1 8% / Rail-2 12%) · annual = 2 months free. Geo payments: BD Bangla QR / IN UPI / INTL Payoneer + Wise.

## Appendix C. Contact (single source of truth: `src/contact.ts`)

WhatsApp wa.me/8801608533529 · Sanatanibandhan@gmail.com
