/**
 * notifications/NotificationWiring.tsx — Phase 3 app-shell wiring.
 * ====================================================================
 * Mount ONCE at the app root (next to <GlobalSOSListener />). For the
 * signed-in user it:
 *
 *   1. configures the NotificationCenter singleton (prefs hydration,
 *      offline-outbox drain on reconnect, quiet-hours holds);
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
import { startP2PNotify } from '../chat/p2pService';
import { startWalletNotify } from '../lib/wallet';

export const NotificationWiring: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const uid = firebaseUser?.uid ?? null;

  // Chat arrivals → NotificationCenter (self-listen).
  useChatNotify(uid);

  // Singleton configuration for the signed-in user.
  useEffect(() => {
    if (!uid) return undefined;
    void NotificationCenter.get()
      .configure({ uid })
      .catch(() => undefined);
    return undefined;
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

  return null;
};
