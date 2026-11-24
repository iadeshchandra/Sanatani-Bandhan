/**
 * notifications/NotificationWiring.tsx — Phase 3 app-shell wiring.
 * ====================================================================
 * Mount ONCE at the app root (next to <GlobalSOSListener />). For the
 * signed-in user it:
 *
 *   1. configures the NotificationCenter singleton (prefs hydration,
 *      offline-outbox drain on reconnect, quiet-hours holds — expired
 *      holds are released on boot and whenever the app returns to the
 *      foreground, since a PWA has no reliable background timer);
 *   2. starts the self-listen watchers — chat, P2P, wallet — each of
 *      which observes shared source data and emits to THIS user
 *      (the only pattern the self-write-only rules allow);
 *   3. tears everything down on sign-out / uid change.
 *
 * Renders nothing. SOS alert/ACK/resolved emits live in
 * GlobalSOSListener (it already observes crisis_events); Suchana
 * insight emits live in AjkerSuchana (it already generates insights).
 */
import { useEffect } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { NotificationCenter } from './NotificationCenter';
import { useChatNotify } from '../chat/useChat';
import { useGroupNotify } from '../chat/groups/useGroups';
import { useSocialNotify } from './socialNotify';
import { startP2PNotify } from '../chat/p2pService';
import { startWalletNotify } from '../lib/wallet';
import { startTithiNudgeNotify } from './tithiNudges';
import { startAartiReminderNotify } from '../darshan/aartiReminders';
import { startOrgBroadcastNotify } from '../org/broadcastListener';
import { startReferralThanksNotify } from '../sangam/referralThanksService';
import { startDueJobsNotify } from '../lib/dueJobsService';
import { startEventReminders } from '../lib/eventReminderService';
import { db } from '../firebase';
import { startOrderNotify } from '../lib/orderNotifyService';
import { startJyotishNotify } from '../lib/jyotishNotifyService';
import { startSuggestionNotify } from '../lib/suggestionNotifyService';
import { startApprovalNotify } from '../lib/approvalNotifyService';
import { startPollLifecycleNotify } from '../lib/pollLifecycleNotifyService';
import { startStaffGovernanceNotify } from '../lib/staffGovernanceNotifyService';
import { startStaffMoneyNotify } from '../lib/staffMoneyNotifyService';
import { startTicketDipNotify } from '../lib/ticketDipNotifyService';
import { startFollowedFestivalNotify } from '../lib/followedFestivalNotifyService';
import { startPlatformNoticeNotify } from '../lib/platformNoticeService';
import { PlanUpgradeHost } from '../billing/PlanUpgradeFlow';

export const NotificationWiring: React.FC = () => {
  const { firebaseUser, activeWorkspace, currentRole } = useAuthWorkspace();
  const uid = firebaseUser?.uid ?? null;

  // Chat arrivals → NotificationCenter (self-listen).
  useChatNotify(uid);

  // Group chat arrivals → NotificationCenter (self-listen).
  useGroupNotify(uid);

  // Social events (Ashirvad, comments, follows, RSVPs) → NotificationCenter
  // (self-listen). All GENTLE — batched summaries, never pings.
  useSocialNotify(uid);

  // Singleton configuration for the signed-in user.
  useEffect(() => {
    if (!uid) return undefined;
    const center = NotificationCenter.get();
    let cancelled = false;
    void center
      .configure({ uid })
      .then(() => {
        // Boot: release any quiet-hours/DND holds that expired while the
        // app was closed. (configure() already does this too — harmless
        // to repeat; flushHeld is idempotent.)
        if (!cancelled) void center.flushHeld().catch(() => undefined);
      })
      .catch(() => undefined);
    // Foreground: a PWA has no reliable background timer, so held
    // notifications self-release when the devotee returns — the clock may
    // have crossed quiet-hours end while we were away. Throttled inside.
    const onForeground = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void center.maybeFlushHeld().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onForeground);
    window.addEventListener('focus', onForeground);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onForeground);
      window.removeEventListener('focus', onForeground);
    };
  }, [uid]);

  // P2P lifecycle transitions → NotificationCenter (self-listen).
  useEffect(() => {
    if (!uid) return undefined;
    const stop = startP2PNotify(uid);
    return () => {
      try {
        stop();
      } catch {
        /* best-effort */
      }
    };
  }, [uid]);

  // Wallet claims / payouts / dues / low balance → NotificationCenter.
  useEffect(() => {
    if (!uid) return undefined;
    const stop = startWalletNotify(uid);
    return () => {
      try {
        stop();
      } catch {
        /* best-effort */
      }
    };
  }, [uid]);

  // Tithi-timed devotional giving reminders → NotificationCenter (self-listen).
  // Gentle tier only, once per day max, quiet-hours held by the pipeline;
  // suggestions only — a devotee is never chased by their own dharma.
  useEffect(() => {
    if (!uid) return undefined;
    return startTithiNudgeNotify(uid);
  }, [uid]);

  // Aarti reminders → NotificationCenter (self-listen).
  // ONE gentle bell 15 min before a subscribed aarti; quiet-hours held by
  // the pipeline. Fires only while the app is open/foregrounded (PWA has
  // no reliable background timer) — the dedupe ledger keeps it to one
  // bell per aarti occurrence.
  useEffect(() => {
    if (!uid) return undefined;
    return startAartiReminderNotify(uid);
  }, [uid]);

  // Org broadcasts → NotificationCenter (self-listen, QUEUED #14).
  // Trustees publish ONE doc per announcement; each follower's device
  // observes its followed orgs and emits to its own inbox via
  // notifyOrgAnnouncement (announcements_enabled kill-switch + quiet
  // hours apply). Baseline law: first check notifies nothing.
  useEffect(() => {
    if (!uid) return undefined;
    return startOrgBroadcastNotify(uid);
  }, [uid]);

  // Sharer thanks → NotificationCenter (self-listen, QUEUED #25).
  // When a booking lands via a devotee's shared link (?ref=SAN-XXXXXX),
  // the booker's device leaves a referralClaims row; the sharer's own
  // device observes claims naming it and emits ONE gentle thanks per
  // booking to its own inbox. Baseline law: first check notifies nothing.
  useEffect(() => {
    if (!uid) return undefined;
    return startReferralThanksNotify(uid);
  }, [uid]);

  // Due-jobs runner → NotificationCenter (self-listen, QUEUED #15).
  // Spark has no server cron and the Functions scheduler is undeployed,
  // so due work is dispatched from the client on boot/foreground
  // (3h-throttled, ledger-idempotent): samskara family reminders from
  // device-local data + any server reminder-queue items for this user.
  useEffect(() => {
    if (!uid) return undefined;
    return startDueJobsNotify(uid);
  }, [uid]);

  // Marketplace order journey → NotificationCenter (self-listen,
  // QUEUED #29). My own device reads my orders as client AND provider
  // (participant reads the rules already allow — zero new collections)
  // and emits status-transition news to my own inbox: new requests and
  // acceptances, the payment-due moment, completions, cancellations,
  // disputes. Baseline law: first check notifies nothing; a per-order
  // status ledger keeps every bell to once. The provider's
  // awaiting-commission bell stays with the wallet watcher (dues).
  useEffect(() => {
    if (!uid) return undefined;
    return startOrderNotify(uid);
  }, [uid]);

  // Jyotish consultation journey → NotificationCenter (self-listen,
  // JY-FIX-B / JY-08). My device reads the consultations I am party to
  // (party reads the rules already allow) and emits the lifecycle news
  // to my own inbox: accepted / completed for the devotee, dakshina
  // released for the jyotishi, and new chat messages for either party.
  // Baseline-silent first run; per-consultation ledgers keep every
  // bell to once. (The dakshina ORDER journey stays with the order
  // watcher above — no double bells.)
  useEffect(() => {
    if (!uid) return undefined;
    return startJyotishNotify(uid);
  }, [uid]);

  // Your Voice loop-closure → NotificationCenter (self-listen,
  // Margdarshan J3). My device reads MY OWN suggestions (the rules'
  // author read path) and rings my own Suchana when the Triage Desk
  // moves one — a status change or an official reply — so a voice
  // raised in Margdarshan is never answered with silence.
  // Baseline-silent first run; a per-suggestion ledger keeps every
  // bell to once.
  useEffect(() => {
    if (!uid) return undefined;
    return startSuggestionNotify(uid);
  }, [uid]);

  // Maker–checker approvals → NotificationCenter (self-listen,
  // Blueprint B). Cross-user inbox writes are impossible under the
  // rules, so my device watches the approval requests I can see —
  // new PENDING items I may check, and decisions on my own filings —
  // and emits into my own Suchana inbox. Baseline-silent first run;
  // a per-request ledger keeps every bell to once.
  useEffect(() => {
    if (!uid) return undefined;
    return startApprovalNotify(uid);
  }, [uid]);

  // Poll lifecycle trio → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 1). My device watches the polls of my
  // workspaces (membership edges ∪ the active workspace, the P2a
  // shape) and emits opened / closing-soon / concluded news into my
  // own inbox. Opened + closing are suppressed on-device when my
  // OWN ballot already exists — nobody else's ballot is ever read.
  // Baseline-silent first run per workspace; a dedupe ledger keeps
  // every stage to one bell per poll.
  const activeWsId = activeWorkspace?.id ?? null;
  const activeWsName = activeWorkspace?.name ?? '';
  const activeWsRole = (currentRole as string | null) ?? null;
  useEffect(() => {
    if (!uid) return undefined;
    return startPollLifecycleNotify(uid, {
      activeWorkspace: activeWsId
        ? { id: activeWsId, name: activeWsName, role: activeWsRole ?? 'Devotee' }
        : null,
    });
  }, [uid, activeWsId, activeWsName, activeWsRole]);

  // My tickets + my e-dip results → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 1). Self-scoped sources (buyerUid / uid == me):
  // a purchased / cancelled / refunded pass and a selected /
  // waitlisted / lapsed / claimed dip result each ring once, at
  // action tier, deep-linked to the festival page. Baseline-silent
  // first run; per-record state ledgers keep every bell to once.
  useEffect(() => {
    if (!uid) return undefined;
    return startTicketDipNotify(uid);
  }, [uid]);

  // Staff money news → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 2). Role is the address: my own payouts, the
  // plan claims of workspaces where I hold a finance role, large
  // donations in workspaces I oversee, and the plan stages of
  // workspaces I trust — each read only where my own role already
  // grants the read. Baseline-silent first run per scope.
  useEffect(() => {
    if (!uid) return undefined;
    return startStaffMoneyNotify(uid);
  }, [uid]);

  // Governance + people news → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 2). Resolutions awaiting my vote (board
  // roles), auction lot outcomes (finance/trustee), member joins
  // and role changes (my own edge always; the roster only where I
  // am Trustee/SuperAdmin, as the read rules allow).
  // Baseline-silent first run per scope.
  useEffect(() => {
    if (!uid) return undefined;
    return startStaffGovernanceNotify(uid);
  }, [uid]);

  // Followed-org festival alerts → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 1). My device diffs the published festivals
  // of the orgs I follow (user_follows ∪ the org-side followers
  // store, as A1 reads them) against a seen ledger — a followed
  // temple publishing a festival reaches its followers, once.
  // Baseline-silent first run.
  useEffect(() => {
    if (!uid) return undefined;
    return startFollowedFestivalNotify(uid);
  }, [uid]);

  // Platform notices → NotificationCenter (self-listen,
  // NOTIFICATION WAVE 4). GodMode's one voice: my device polls the
  // platformNotices shelf (readable by any signed-in user) and rings
  // each live notice exactly once — maintenance, new versions,
  // policy — in my language's frame. Baseline-silent first run;
  // expiry honoured, so a stale maintenance notice never rings late.
  useEffect(() => {
    if (!uid) return undefined;
    return startPlatformNoticeNotify(uid);
  }, [uid]);

  // Event reminders → NotificationCenter (self-listen, EVENTS P1).
  // My device reads MY OWN festival RSVPs + Sangam 'going' records
  // and emits the three quiet stages (T-3 / T-1 / morning-of), one
  // change/cancel announcement per edit, and the waitlist-promotion
  // bell when my anchored claim lands. Hourly-throttled, ledgered;
  // a missed stage is skipped, never burst-sent.
  useEffect(() => {
    if (!uid) return undefined;
    return startEventReminders(db, uid);
  }, [uid]);

  return <PlanUpgradeHost />;
};
