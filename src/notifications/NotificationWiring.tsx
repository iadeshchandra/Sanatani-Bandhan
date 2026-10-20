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
import { startDueJobsNotify } from '../lib/dueJobsService';
import { PlanUpgradeHost } from '../billing/PlanUpgradeFlow';

export const NotificationWiring: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
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

  // Due-jobs runner → NotificationCenter (self-listen, QUEUED #15).
  // Spark has no server cron and the Functions scheduler is undeployed,
  // so due work is dispatched from the client on boot/foreground
  // (3h-throttled, ledger-idempotent): samskara family reminders from
  // device-local data + any server reminder-queue items for this user.
  useEffect(() => {
    if (!uid) return undefined;
    return startDueJobsNotify(uid);
  }, [uid]);

  return <PlanUpgradeHost />;
};
