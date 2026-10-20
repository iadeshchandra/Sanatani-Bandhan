import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Megaphone, MapPin, X, HandHeart } from 'lucide-react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
// Crisis Command Phase 1 — surgical additions (ack counts + "I'm coming").
import { ackSOS, subscribeToResponses } from '../../crisis/sosService';
import { crisisCopy, useCrisisT } from '../../crisis/crisisStrings';
import { SOSResponderSheet } from '../../crisis/SOSResponderSheet';
// Phase 3 notification wiring: NotificationCenter emits replace the local
// NotificationContext pings (the context stays as the UI bell layer).
import {
  notifySOSAlert,
  notifySOSAcknowledged,
  notifySOSResolved,
} from '../../notifications/notifyHelpers';

const CRISIS_SIT_LABEL: Record<string, keyof typeof crisisCopy> = {
  medical: 'sitMedical',
  fire: 'sitFire',
  robbery: 'sitRobbery',
  crowd: 'sitCrowd',
  disaster: 'sitDisaster',
  other: 'sitOther',
};

const CRISIS_SEV_STYLE: Record<string, string> = {
  critical: 'bg-red-950/70 border-red-400/40',
  high: 'bg-amber-950/70 border-amber-400/40',
  medium: 'bg-stone-800/70 border-stone-400/40',
};

export const GlobalSOSListener: React.FC = () => {
  const { currentUser, isAuthenticated, firebaseUser, activeWorkspace } = useAuthWorkspace();
  const myUid = currentUser?.id ?? null;
  const t = useCrisisT();
  // t is re-created each render — mirror it in a ref so the crisis listener
  // effect below doesn't resubscribe on every render.
  const tRef = useRef(t);
  tRef.current = t;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedSOS = useRef<Set<string>>(new Set());
  const processedCrisis = useRef<Set<string>>(new Set());
  // Stand-down tracking: alert ids seen active + their meta, so a removal
  // becomes an "All is well" emit.
  const prevYatraIds = useRef<Set<string>>(new Set());
  const yatraMeta = useRef(new Map<string, { notified: boolean; senderUid: string; senderName: string; situation: string }>());
  const prevCrisisIds = useRef<Set<string>>(new Set());
  const crisisMeta = useRef(new Map<string, { notified: boolean; senderUid: string; senderName: string; situation: string }>());
  // Sender-side ACK watch: eventId -> per-event responses unsubscribe.
  const ackUnsubs = useRef(new Map<string, () => void>());
  const ackedResponders = useRef(new Map<string, Set<string>>());
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  // Crisis Command Phase 1: live crisis_events alerts (ack counts update via snapshot).
  const [crisisAlerts, setCrisisAlerts] = useState<any[]>([]);
  const [ackedCrisisIds, setAckedCrisisIds] = useState<Set<string>>(new Set());
  // Responder map sheet: eventId of the alert whose map is open.
  const [mapEventId, setMapEventId] = useState<string | null>(null);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Intense alert sound
      audioRef.current.loop = false;
    }
    return audioRef.current;
  };

  useEffect(() => {
    // Only listen if user is authenticated and active workspace is set to avoid permission errors
    if (!isAuthenticated || !firebaseUser || !activeWorkspace?.id) return;

    // Reset processed SOS on workspace switch
    processedSOS.current.clear();
    prevYatraIds.current.clear();
    yatraMeta.current.clear();
    setActiveAlerts([]);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'yatra_broadcasts'),
      where('communityId', '==', activeWorkspace.id),
      where('type', '==', 'RICH_SOS')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentActive: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.sosStatus !== 'RESOLVED' && data.status !== 'RESOLVED') {
          currentActive.push({ id: doc.id, ...data });
        }
      });
      setActiveAlerts(currentActive);

      // Stand-down detection: alerts that left the active set were resolved
      // or cancelled → "All is well" (IMPORTANT) to the viewer.
      const prevIds = prevYatraIds.current;
      const nowIds = new Set(currentActive.map((a) => a.id));
      for (const id of prevIds) {
        if (!nowIds.has(id)) {
          const was = yatraMeta.current.get(id);
          if (myUid && was?.notified) {
            void notifySOSResolved(myUid, {
              senderUid: was.senderUid ?? '',
              senderName: was.senderName ?? 'A devotee',
              eventId: id,
              situation: was.situation ?? '',
            });
          }
          yatraMeta.current.delete(id);
        }
      }
      prevYatraIds.current = nowIds;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const sos = { id: change.doc.id, ...change.doc.data() } as any;

          // Don't notify if the SOS is already resolved or if we've already processed it locally
          if (sos.sosStatus === 'RESOLVED' || processedSOS.current.has(sos.id)) {
            return;
          }

          // Don't notify the sender themselves
          if (sos.senderId === currentUser?.id) {
            processedSOS.current.add(sos.id);
            return;
          }

          // Mark as processed
          processedSOS.current.add(sos.id);

          // 1. Play intense audio alarm
          if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Intense alert sound
            audioRef.current.loop = false;
          }
          audioRef.current.play().catch(() => { /* autoplay blocked — the banner still shows */ });

          // 2. NotificationCenter emit (CRITICAL — breaks through quiet hours)
          if (myUid) {
            yatraMeta.current.set(sos.id, {
              notified: true,
              senderUid: sos.senderId ?? '',
              senderName: sos.senderName ?? 'A devotee',
              situation: sos.situation ?? '',
            });
            void notifySOSAlert(myUid, {
              senderUid: sos.senderId ?? '',
              senderName: sos.senderName || 'A devotee',
              eventId: sos.id,
              situation: sos.situation?.replace('_', ' ') || 'SOS',
              details: sos.details || sos.text,
            });
          }

          // 3. Trigger OS Native Push Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`🚨 GLOBAL SOS: ${sos.senderName}`, {
              body: sos.text || sos.details,
              icon: '/favicon.ico',
              requireInteraction: true, // Persist on screen until user clicks
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
              // 'crisis-command' renders the CrisisDashboard — the real
              // Command Center. ('socialWall' was a dead-end onto Org
              // Settings; fixed 2026-10-20.)
              window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'crisis-command' }));
            };
          }
        }
      });
    }, (err) => console.warn("Firebase SOS sync:", err.message));

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [myUid, currentUser?.id, isAuthenticated, firebaseUser, activeWorkspace?.id]);

  // ── Crisis Command Phase 1: live crisis_events listener ─────────────
  // Adds ACK-count live updates + "I'm coming" quick-action. The existing
  // yatra_broadcasts audio/push behavior above is untouched.
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser) return;
    processedCrisis.current.clear();
    setCrisisAlerts([]);
    prevCrisisIds.current.clear();
    crisisMeta.current.clear();

    const q = query(
      collection(db, 'crisis_events'),
      where('status', '==', 'active'),
      limit(25)
    );

    // Watch the responses of MY active SOS events: each new "I'm coming"
    // becomes a CRITICAL "{name} heard your call" emit to me (the sender).
    const watchMyAcks = (eventId: string) => {
      if (ackUnsubs.current.has(eventId) || !myUid) return;
      if (!ackedResponders.current.has(eventId)) ackedResponders.current.set(eventId, new Set());
      const seen = ackedResponders.current.get(eventId)!;
      const unsub = subscribeToResponses(eventId, (responses) => {
        for (const r of responses) {
          if (seen.has(r.uid)) continue;
          seen.add(r.uid);
          if (r.uid === myUid) continue; // never notify about myself
          if (r.status === 'coming' || r.status === 'arrived') {
            void notifySOSAcknowledged(myUid, {
              senderUid: myUid,
              senderName: '',
              eventId,
              situation: '',
              responderName: r.name || 'A devotee',
              responderUid: r.uid,
            });
          }
        }
      });
      ackUnsubs.current.set(eventId, unsub);
    };
    const unwatchAcks = (eventId: string) => {
      const u = ackUnsubs.current.get(eventId);
      if (u) {
        try { u(); } catch { /* best-effort */ }
        ackUnsubs.current.delete(eventId);
      }
      ackedResponders.current.delete(eventId);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const live: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data.senderUid === currentUser?.id) {
          // My own SOS: watch for responders, don't show as an alert.
          watchMyAcks(d.id);
          return;
        }
        live.push({ id: d.id, ...data });
      });
      setCrisisAlerts(live);

      // Stand-down detection: my watched events + shown alerts that left
      // the active set → "All is well" (IMPORTANT) to me.
      const nowIds = new Set<string>();
      snapshot.forEach((d) => nowIds.add(d.id));
      for (const id of prevCrisisIds.current) {
        if (!nowIds.has(id)) {
          const was = crisisMeta.current.get(id);
          if (myUid && was?.notified) {
            void notifySOSResolved(myUid, {
              senderUid: was.senderUid ?? '',
              senderName: was.senderName ?? 'A devotee',
              eventId: id,
              situation: was.situation ?? '',
            });
          }
          crisisMeta.current.delete(id);
          unwatchAcks(id);
        }
      }
      prevCrisisIds.current = nowIds;

      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const sos = { id: change.doc.id, ...change.doc.data() } as any;
        if (processedCrisis.current.has(sos.id)) return;
        if (sos.senderUid === currentUser?.id) {
          processedCrisis.current.add(sos.id);
          return;
        }
        processedCrisis.current.add(sos.id);

        const sitKey = CRISIS_SIT_LABEL[sos.situation as string] ?? 'sitOther';
        const sitLabel = tRef.current(crisisCopy[sitKey]);

        // 1. Audio (same channel as existing SOS alerts)
        ensureAudio().play().catch(() => { /* autoplay blocked — the banner still shows */ });

        // 2. NotificationCenter emit (CRITICAL — breaks through quiet hours)
        if (myUid) {
          crisisMeta.current.set(sos.id, {
            notified: true,
            senderUid: sos.senderUid ?? '',
            senderName: sos.senderName ?? 'A devotee',
            situation: sos.situation ?? '',
          });
          void notifySOSAlert(myUid, {
            senderUid: sos.senderUid ?? '',
            senderName: sos.senderName || 'A devotee',
            eventId: sos.id,
            situation: String(sitLabel),
            details: sos.details,
          });
        }

        // 3. OS native push
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(`🙏 SOS: ${sos.senderName || 'A devotee'} needs help`, {
            body: `${sitLabel}${sos.details ? ` — ${sos.details}` : ''}`,
            icon: '/favicon.ico',
            requireInteraction: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      });
    }, (err) => console.warn('Firebase crisis_events sync:', err.message));

    return () => {
      unsubscribe();
      for (const u of ackUnsubs.current.values()) {
        try { u(); } catch { /* best-effort */ }
      }
      ackUnsubs.current.clear();
      ackedResponders.current.clear();
    };
  }, [myUid, currentUser?.id, isAuthenticated, firebaseUser]);

  const handleImComing = async (alert: any) => {
    const uid = currentUser?.id;
    if (!uid || ackedCrisisIds.has(alert.id)) return;
    try {
      await ackSOS(alert.id, {
        uid,
        name: currentUser?.name || currentUser?.fullName || 'A devotee',
        photo: null,
        distanceM: null,
      });
      setAckedCrisisIds((prev) => new Set(prev).add(alert.id));
      try {
        if ('vibrate' in navigator) navigator.vibrate(40);
      } catch {
        /* haptics unavailable */
      }
    } catch (e) {
      console.warn('ackSOS failed:', e);
    }
  };

  if (activeAlerts.length === 0 && crisisAlerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none flex flex-col items-center pt-4 px-4 space-y-2">
      {activeAlerts.map(alert => (
        <div key={alert.id} className="pointer-events-auto w-full max-w-4xl bg-rose-600 border-2 border-rose-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row shadow-rose-900/50">
          <div className="bg-rose-950/40 p-4 sm:w-48 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-rose-500/30 shrink-0">
            <div className="relative">
              <ShieldAlert className="w-10 h-10 text-rose-300 animate-pulse" />
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-rose-900 animate-ping" />
            </div>
            <p className="font-black text-rose-50 text-sm mt-2 tracking-widest text-center">CODE RED</p>
            <p className="text-[10px] text-rose-300 font-bold uppercase mt-0.5">Emergency SOS</p>
          </div>
          
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {alert.situation?.replace('_', ' ') || alert.text || 'Immediate Assistance Required'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-200 bg-rose-950/30 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5" />
                      {alert.location || 'Unknown Location'}
                    </span>
                    <span className="text-xs text-rose-200/80 font-medium">
                      Reported by: <span className="text-white font-bold">{alert.senderName || 'Anonymous'}</span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-rose-100 mt-3 border-l-2 border-rose-400/50 pl-3">
                {alert.details || 'A devotee has triggered the SOS alarm. Please mobilize immediate assistance to the reported coordinates.'}
              </p>
            </div>
            
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'crisis-command' }))}
                className="px-4 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 transition-colors shadow-lg"
              >
                View in Command Center
              </button>
              
              <button 
                onClick={() => {
                  const msg = `🚨 EMERGENCY ALERT: ${alert.situation?.replace('_', ' ') || 'SOS'} reported by ${alert.senderName || 'a devotee'}. Location: ${alert.location || 'Unknown'}. Please mobilize immediately.`;
                  window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'whatsapp-broadcast' }));
                  // You'd typically pass this to the broadcast module via state/context
                  alert('Navigate to WhatsApp Broadcaster to send: ' + msg);
                }}
                className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-400/30 text-rose-50 font-bold text-xs hover:bg-rose-950/60 transition-colors flex items-center gap-2"
              >
                <Megaphone className="w-3.5 h-3.5" />
                Evacuation Broadcast
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => {
               // To clear it locally for this session if needed, though usually you'd resolve it in DB.
               setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
            }}
            className="absolute top-2 right-2 p-2 text-rose-300 hover:text-white hover:bg-rose-950/50 rounded-xl transition-colors sm:static sm:m-4 sm:self-start"
            title="Dismiss Local Alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}

      {/* Crisis Command Phase 1 alerts — warm styling, live ACK counts, "I'm coming". */}
      {crisisAlerts.map(alert => {
        const sitKey = CRISIS_SIT_LABEL[alert.situation as string] ?? 'sitOther';
        const acked = ackedCrisisIds.has(alert.id);
        const ackCount = typeof alert.ackCount === 'number' ? alert.ackCount : 0;
        const responderCount = typeof alert.responderCount === 'number' ? alert.responderCount : 0;
        return (
          <div key={`crisis-${alert.id}`} className="pointer-events-auto w-full max-w-4xl bg-gradient-to-br from-amber-900 to-stone-900 border-2 border-amber-400/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row shadow-amber-950/50">
            <div className="p-4 sm:w-48 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-amber-400/20 shrink-0 bg-black/20">
              <div className="relative">
                <HandHeart className="w-10 h-10 text-amber-200 animate-pulse" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-amber-900 animate-ping" />
              </div>
              <p className="font-black text-amber-50 text-sm mt-2 tracking-widest text-center">SOS</p>
              <p className="text-[10px] text-amber-300 font-bold uppercase mt-0.5">{t(crisisCopy[sitKey])}</p>
              <span className={`mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${CRISIS_SEV_STYLE[alert.severity as string] ?? CRISIS_SEV_STYLE.medium} text-amber-100`}>
                {alert.severity || 'medium'}
              </span>
            </div>

            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-amber-50 leading-tight">
                  {alert.senderName || 'A devotee'} needs help
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-black/30 px-2.5 py-1 rounded-lg">
                    <MapPin className="w-3.5 h-3.5" />
                    {alert.location?.address || (alert.location?.lat != null ? `${Number(alert.location.lat).toFixed(4)}, ${Number(alert.location.lng).toFixed(4)}` : 'Location unavailable')}
                  </span>
                  {alert.bloodGroup && (
                    <span className="text-xs font-bold text-red-200 bg-red-950/60 px-2.5 py-1 rounded-lg">
                      🩸 {alert.bloodGroup}
                    </span>
                  )}
                </div>
                {alert.details && (
                  <p className="text-sm text-amber-100/90 mt-3 border-l-2 border-amber-400/50 pl-3">
                    {alert.details}
                  </p>
                )}
                <p className="text-xs text-amber-200/80 font-semibold mt-2" aria-live="polite">
                  {responderCount} {t(crisisCopy.respondersLine)} · {ackCount} acknowledged
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {acked ? (
                  <span className="px-4 py-2.5 rounded-xl bg-emerald-800/70 border border-emerald-400/30 text-emerald-50 font-bold text-sm">
                    {t(crisisCopy.ackedMessage)}
                  </span>
                ) : (
                  <button
                    onClick={() => void handleImComing(alert)}
                    className="min-h-[48px] px-6 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 font-extrabold text-sm hover:brightness-110 transition-all shadow-lg"
                  >
                    {t(crisisCopy.ackButton)}
                  </button>
                )}
                <button
                  onClick={() => setMapEventId(alert.id)}
                  className="min-h-[48px] px-6 rounded-2xl bg-white/10 border border-amber-300/40 text-amber-50 font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" aria-hidden />
                  {t(crisisCopy.mapViewMap)}
                </button>
              </div>
            </div>

            <button
              onClick={() => setCrisisAlerts(prev => prev.filter(a => a.id !== alert.id))}
              className="absolute top-2 right-2 p-2 text-amber-300 hover:text-white hover:bg-black/40 rounded-xl transition-colors sm:static sm:m-4 sm:self-start"
              title="Dismiss Local Alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        );
      })}

      {/* Responder map sheet */}
      {mapEventId ? (
        (() => {
          const ev = crisisAlerts.find((a) => a.id === mapEventId);
          if (!ev) return null;
          return (
            <div className="pointer-events-auto">
              <SOSResponderSheet
                event={ev}
                onClose={() => setMapEventId(null)}
                onAcknowledge={() => void handleImComing(ev)}
                acknowledged={ackedCrisisIds.has(ev.id)}
              />
            </div>
          );
        })()
      ) : null}
    </div>
  );

};
