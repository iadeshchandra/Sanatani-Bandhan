# NotificationCenter — Phase 3 Module Integration CHANGELOG

> 2026-10-17 — Phase 3: wire notification producers into the NotificationCenter.
> STAGE LOCALLY ONLY — not pushed.

## What Phase 3 added

**New files**
- `src/notifications/emit.ts` — the thin, stable emit adapter. **Frozen signature:**
  `emitNotify(recipientUid: string | null | undefined, event: NotifyEvent): Promise<EmitResult>`.
  Self (null uid) delegates to the `NotificationCenter` singleton; an explicit
  uid runs the same pipeline (prefs → priority engine → best-effort grouping →
  delivery → offline outbox + reconnect replay). Every event is validated:
  missing `dedupeKey`, non-trilingual title/body, or missing priority/kind →
  dropped with a logged reason, never thrown. Delivery failures on the in-app
  rail drop loudly instead of poisoning the outbox.
- `src/notifications/notifyHelpers.ts` — per-module event builders (chat, P2P,
  SOS, wallet, org). All copy comes from `warmCopy.ts` via `renderCopy`; every
  builder sets `dedupeKey` + trilingual title/body + the mandated priority.
  All `notify*` are fire-and-forget safe (never throw).
- `src/notifications/insightNotify.ts` — Suchana bridge: `notifyInsights()` maps
  App-Intelligence `Insight[]` → emits (`urgent`/`attention` → IMPORTANT, rest →
  GENTLE) and `notifyDigest()` emits the GENTLE morning-digest card. Once-per-day
  per insight via a localStorage ledger (date-scoped dedupeKeys).
- `src/notifications/NotificationWiring.tsx` — app-shell component (mounted in
  `App.tsx` next to `GlobalSOSListener`): configures the singleton for the
  signed-in user and starts the chat/P2P/wallet self-listen watchers.
- `src/notifications/__tests__/emit.spec.ts` — adapter + helper contract tests.
- `src/crisis/crisisNotify.ts` — thin wrappers around `sosService`
  (`triggerSOSWithNotify`, `cancelSOSWithNotify`). `sosService.ts` itself is
  untouched (parallel program owns it).

**Modified shared files**
- `src/notifications/warmCopy.ts` — 3 new copy keys (the single source of truth):
  `sos.responderAlert` (CRITICAL alert to nearby devotees),
  `money_request.paid` (payer marked paid → IMPORTANT to payee),
  `wallet.payoutReceived` (escrow payout → GENTLE).
- `src/chat/chatService.ts` — added `subscribeNewMessages(chatId, onAdded)`:
  skips the first snapshot, reports later arrivals (the notifier primitive).
- `src/chat/useChat.ts` — added `markChatOpen`/`isChatOpen` registry +
  `useChatNotify(uid)`: self-listen hook; new message → IMPORTANT, blessing
  card → GENTLE; silent for the thread on screen.
- `src/chat/ChatThread.tsx` — registers open thread via `markChatOpen`.
- `src/chat/p2pService.ts` — added `startP2PNotify(uid)`: watches my requests,
  emits on transitions (received/accepted/declined/countered → IMPORTANT to the
  right party; marked-paid → IMPORTANT to payee; settled → GENTLE to payer).
- `src/crisis/SOSConfirm.tsx` — uses `triggerSOSWithNotify` (CRITICAL sender
  reassurance "Help is on the way").
- `src/crisis/SOSTimeline.tsx` — uses `cancelSOSWithNotify` (IMPORTANT "All is
  well" to sender).
- `src/components/common/GlobalSOSListener.tsx` — `useNotifications()
  .addNotification()` replaced with NotificationCenter emits (context kept as
  UI layer, untouched). Both listeners (legacy yatra RICH_SOS + crisis_events)
  now emit CRITICAL responder alerts to the viewer; new: ACK watch on my own
  SOS events → CRITICAL "{name} heard your call" to me; stand-down detection
  (alert leaves the active set) → IMPORTANT "All is well" to me. Audio + OS
  push behavior unchanged.
- `src/lib/wallet.ts` — added `subscribeMyClaims`, `subscribeMyWallet`,
  `subscribeMyWalletTransactions`, `startWalletNotify(uid)`: claim approved/
  rejected → IMPORTANT; new escrow payout → GENTLE; provider orders stuck in
  `awaiting_commission` → IMPORTANT commission-due (once per order per day);
  balance dropping below `LOW_BALANCE_THRESHOLD` (200) → IMPORTANT low-balance
  (once per day).
- `src/solo/AjkerSuchana.tsx` — new optional `uid` prop; effect emits
  needs-care insights (IMPORTANT) + morning digest card (GENTLE) via
  `insightNotify` (once-per-day guarded).
- `src/solo/SoloHome.tsx` — passes `uid` to `AjkerSuchana`.
- `src/App.tsx` — mounts `<NotificationWiring />`.
- `firestore.rules` — merged `src/notifications/notifications.rules.snippet`
  verbatim (self-write-only model preserved). **Without this merge no client
  notification write can succeed** — the snippet was never merged before.

## Design note: why self-listen

The shipped rules are SELF-WRITE-ONLY by design (no client may write another
user's `notifications/{uid}/items`). So every cross-user flow (chat message,
P2P transition, SOS alert/ACK, top-up approval) is wired as: the recipient's
own device observes the shared source doc and emits to itself. `emitNotify`
keeps the explicit-uid path for the future trusted-server fan-out, but client
callers must not rely on it today — the adapter drops such writes loudly
rather than silently.

## Not wired (deliberate)

- Trustee broadcast: no producer exists yet (OrgPage shows the honest
  "populated by trustees later" empty state). `notifyOrgAnnouncement()` is
  provided and documented for that module to call per member uid.
- `NotificationContext` (`useNotifications`) is kept as the UI bell layer;
  only the SOS listener's producer calls were rewired per the task.

## Verification

- `npx tsc --noEmit`: error set identical to the pre-Phase-3 baseline
  (13 pre-existing errors in untouched files; 0 new).
- New `emit.spec.ts` follows the existing jest mock pattern.
- Full jest suite: run `npm test` (firebase emulators) before pushing.
