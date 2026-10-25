/**
 * crisis/SOSTimeline.tsx — step 3 of the SOS flow (active SOS view).
 * ================================================================
 * Live timeline: Sent → Acknowledged (n) → Responders coming → Resolved,
 * each step timestamped. Shows "N people responding, nearest Xm away".
 * Big "I'm Safe" button (cancels + broadcasts stand-down) and a resolve
 * path with an optional outcome note for the sangha's learning.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { appLocale } from '../lib/format';
import {
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  HandHeart,
  X,
} from 'lucide-react';
import {
  flushVoiceOutbox,
  resolveSOS,
  subscribeToEvent,
  subscribeToNotifiedCount,
  subscribeToResponses,
} from './sosService';
import { cancelSOSWithNotify } from './crisisNotify';
import type { CrisisEvent, CrisisResponse } from './types';
import { crisisCopy, useCrisisT } from './crisisStrings';

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function fmtDistance(m: number | null | undefined): string | null {
  if (m == null || !Number.isFinite(m)) return null;
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export const SOSTimeline: React.FC<{
  eventId: string;
  onClose: () => void;
}> = ({ eventId, onClose }) => {
  const t = useCrisisT();
  const [event, setEvent] = useState<CrisisEvent | null>(null);
  const [responses, setResponses] = useState<CrisisResponse[]>([]);
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [confirmSafe, setConfirmSafe] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubEvent = subscribeToEvent(eventId, setEvent);
    const unsubResp = subscribeToResponses(eventId, setResponses);
    const unsubNotified = subscribeToNotifiedCount(eventId, setNotifiedCount);
    // Retry any voice note staged while offline.
    void flushVoiceOutbox(eventId);
    const onOnline = () => void flushVoiceOutbox(eventId);
    window.addEventListener('online', onOnline);
    return () => {
      unsubEvent();
      unsubResp();
      unsubNotified();
      window.removeEventListener('online', onOnline);
    };
  }, [eventId]);

  const nearest = useMemo(() => {
    const withDist = responses.filter((r) => r.distanceM != null);
    if (withDist.length === 0) return null;
    return withDist.reduce((a, b) => ((a.distanceM ?? Infinity) < (b.distanceM ?? Infinity) ? a : b));
  }, [responses]);

  const coming = responses.filter((r) => r.status === 'coming').length;
  const arrived = responses.filter((r) => r.status === 'arrived').length;
  const total = responses.length;

  const steps = useMemo(() => {
    if (!event) return [];
    const acked = total > 0 || event.ackCount > 0;
    const responding = coming > 0 || arrived > 0 || event.responderCount > 0;
    const resolved = event.status === 'resolved' || event.status === 'cancelled';
    return [
      { key: 'sent', label: t(crisisCopy.stepSent), done: true, time: event.createdAt },
      { key: 'ack', label: `${t(crisisCopy.stepAck)} (${Math.max(total, event.ackCount)})`, done: acked, time: acked ? responses[0]?.createdAt ?? null : null },
      { key: 'responding', label: t(crisisCopy.stepResponding), done: responding, time: responding ? responses.find((r) => r.status === 'coming')?.createdAt ?? null : null },
      { key: 'resolved', label: t(crisisCopy.stepResolved), done: resolved, time: event.resolvedAt ?? null },
    ];
  }, [event, responses, total, coming, arrived, t]);

  const doSafe = async (wasFalseAlarm: boolean) => {
    setBusy(true);
    try {
      await cancelSOSWithNotify(eventId, wasFalseAlarm);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const doResolve = async () => {
    setBusy(true);
    try {
      await resolveSOS(eventId, outcome || null);
      setConfirmResolve(false);
    } finally {
      setBusy(false);
    }
  };

  const finished = event && (event.status === 'resolved' || event.status === 'cancelled');

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(crisisCopy.activeTitle)}
    >
      <div className="w-full sm:max-w-md bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        {!confirmSafe && !confirmResolve ? (
          <>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-xl">
                <HandHeart className="w-8 h-8 text-amber-50" aria-hidden />
              </div>
              <h2 className="text-2xl font-extrabold text-stone-900 mt-3">{t(crisisCopy.activeTitle)}</h2>
              <p className="text-sm text-stone-600 mt-1">{t(crisisCopy.activeSubtitle)}</p>
            </div>

            {/* Live timeline */}
            <ol className="mt-6 space-y-0">
              {steps.map((s, i) => (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {s.done ? (
                      <CheckCircle2 className="w-6 h-6 text-amber-700" aria-hidden />
                    ) : (
                      <Circle className="w-6 h-6 text-stone-300" aria-hidden />
                    )}
                    {i < steps.length - 1 && <span className="w-0.5 flex-1 bg-stone-200 min-h-[20px]" aria-hidden />}
                  </div>
                  <div className="pb-5">
                    <p className={`text-sm font-bold ${s.done ? 'text-stone-900' : 'text-stone-400'}`}>{s.label}</p>
                    <p className="text-xs text-stone-500">{fmtTime(s.time)}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Responder summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <MapPin className="w-6 h-6 text-amber-800 shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-stone-800">
                {total} {t(crisisCopy.respondersLine)}
                {nearest?.distanceM != null && (
                  <span className="text-stone-500 font-medium">
                    {' '}{t(crisisCopy.nearestAway)}: {fmtDistance(nearest.distanceM)}
                  </span>
                )}
              </p>
            </div>

            {/* Location visibility — who can see me right now */}
            {!finished && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3" aria-live="polite">
                <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-amber-950">
                    {t(crisisCopy.mapVisibleTo)} {Math.max(notifiedCount, total)}{' '}
                    {t(crisisCopy.mapResponders)}
                  </p>
                  <p className="text-[12px] text-amber-800 mt-0.5">{t(crisisCopy.mapStopSharing)}</p>
                </div>
              </div>
            )}

            {/* Responder avatars */}
            {responses.length > 0 && (
              <div className="mt-3 flex -space-x-2 overflow-hidden px-1" aria-hidden>
                {responses.slice(0, 8).map((r) => (
                  <span
                    key={r.uid}
                    title={`${r.name} — ${r.status}`}
                    className="w-9 h-9 rounded-full bg-amber-200 border-2 border-amber-50 flex items-center justify-center text-xs font-extrabold text-amber-900 overflow-hidden"
                  >
                    {r.photo ? (
                      <img src={r.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      r.name.charAt(0).toUpperCase()
                    )}
                  </span>
                ))}
                {responses.length > 8 && (
                  <span className="w-9 h-9 rounded-full bg-stone-300 border-2 border-amber-50 flex items-center justify-center text-[11px] font-extrabold text-stone-700">
                    +{responses.length - 8}
                  </span>
                )}
              </div>
            )}

            {!finished ? (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSafe(true)}
                  className="w-full min-h-[60px] rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-extrabold text-lg shadow-xl hover:brightness-110"
                >
                  {t(crisisCopy.imSafe)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResolve(true)}
                  className="w-full min-h-[48px] rounded-2xl bg-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-300"
                >
                  {t(crisisCopy.resolve)}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full min-h-[52px] rounded-2xl bg-stone-800 text-stone-50 font-bold hover:bg-stone-700"
              >
                {t(crisisCopy.close)}
              </button>
            )}
          </>
        ) : confirmSafe ? (
          <>
            <h2 className="text-xl font-extrabold text-stone-900 text-center">{t(crisisCopy.imSafe)}</h2>
            <p className="text-sm text-stone-600 text-center mt-2">{t(crisisCopy.imSafeConfirm)}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void doSafe(false)}
                className="w-full min-h-[56px] rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-extrabold shadow-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-5 h-5 animate-spin" aria-hidden />}
                {t(crisisCopy.yesImSafe)}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doSafe(true)}
                className="w-full min-h-[48px] rounded-2xl bg-amber-100 text-amber-900 font-bold text-sm hover:bg-amber-200 disabled:opacity-60"
                title="Counts as a false alarm for abuse tracking"
              >
                {t(crisisCopy.yesImSafeMistake)}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmSafe(false)}
                className="w-full min-h-[48px] rounded-2xl bg-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-300 disabled:opacity-60"
              >
                {t(crisisCopy.keepActive)}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-extrabold text-stone-900">{t(crisisCopy.resolve)}</h2>
              <button
                type="button"
                onClick={() => setConfirmResolve(false)}
                aria-label={t(crisisCopy.cancel)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-200/70 text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label htmlFor="crisis-outcome" className="block text-xs font-semibold text-stone-600 mt-4">
              {t(crisisCopy.outcomePrompt)}
            </label>
            <textarea
              id="crisis-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void doResolve()}
              className="mt-4 w-full min-h-[56px] rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 font-extrabold shadow-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-5 h-5 animate-spin" aria-hidden />}
              {t(crisisCopy.resolve)}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
