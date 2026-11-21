/**
 * EventGateMode — festival gate check-in inside the QR Gate Scanner
 * desk (EVENTS E3).
 * =====================================================================
 * The committee picks the festival + the day, then scans SB-EVENT
 * passes (lib/eventPass). Every verdict is decided by the pure
 * evaluateGateScan: signature + expiry from the family verifier,
 * event/day match, the confirmed-booking cross-check, and the
 * day-scoped one-scan-once rule (this device's replay registry +
 * the record's own checkedInAt). A successful scan writes through
 * the SAME toggleCheckin path the Festival War Room uses — one
 * checkedIn state, so gate counts and War Room counts cannot drift.
 *
 * Everything runs offline: verification is on-device, the registry
 * is localStorage, and the check-in write rides Firestore's own
 * offline queue through the war-room store.
 *
 * The name-search list below the scanner is the no-camera fallback:
 * tap-to-admit performs the identical registry + checkedIn write,
 * so a pass scanned later reads ALREADY USED.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Search, UserCheck, Ticket,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  pickWarFestivals, festivalDayList, todayISO,
  type WarFestival, type RsvpEntry,
} from '../../lib/festival';
import { useFestivalCloud } from '../festival/festivalWarStore';
import {
  readEventPassToken, evaluateGateScan, gateCounts, rsvpAttendsDay, admittedOnDay,
  type GateDecision,
} from '../../lib/eventPass';
import {
  loadGateRegistry, saveGateRegistry, registerScan, registryFirstScanAt,
  type GateRegistryData,
} from '../../lib/eventGateRegistry';
import { appLocale } from '../../lib/format';

/* Small local feedback helpers (the common scanner keeps its own). */
const playTone = (ok: boolean) => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = ok ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(ok ? 880 : 170, now);
    if (ok) osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (ok ? 0.28 : 0.35));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch { /* audio is a cue, never a dependency */ }
};
const vibrate = (ok: boolean) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ok ? [60, 40, 80] : [150, 80, 150]);
    }
  } catch { /* best effort */ }
};

interface ScanResult {
  decision: GateDecision;
  record: RsvpEntry | null;
  at: number;
}

export const EventGateMode: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const workspaceId = activeWorkspace?.id || '';

  const festivals: WarFestival[] = useMemo(() => pickWarFestivals(), []);
  const [festivalKey, setFestivalKey] = useState<string>('');
  const wf = festivals.find((f) => f.key === festivalKey) || festivals[0] || null;

  const days = useMemo(
    () => (wf ? festivalDayList(wf.dateISO, wf.endDateISO) : []),
    [wf]
  );
  const [gateDay, setGateDay] = useState<string>('');
  useEffect(() => {
    if (days.length === 0) { setGateDay(''); return; }
    setGateDay((prev) =>
      days.includes(prev) ? prev : days.includes(todayISO()) ? todayISO() : days[0]
    );
  }, [days]);

  const cloud = useFestivalCloud(workspaceId, wf?.key || '', { subscribeRsvps: true });
  const eventId = wf ? `${workspaceId}__${wf.key}` : '';

  const [registry, setRegistry] = useState<GateRegistryData>(() => loadGateRegistry());
  const [result, setResult] = useState<ScanResult | null>(null);
  const [query, setQuery] = useState('');
  const [cameraError, setCameraError] = useState(false);

  /* The identical admit path for scans and name-search taps:
     register the record in this device's replay registry, then the
     war-room checkedIn write (Firestore queues it when offline). */
  const admit = useCallback(
    async (record: RsvpEntry) => {
      if (!eventId || !gateDay) return;
      const now = Date.now();
      setRegistry((prev) => {
        const r = registerScan(prev, eventId, gateDay, record.id, now);
        saveGateRegistry(r.data);
        return r.data;
      });
      try {
        await cloud.toggleCheckin(record.id, true);
      } catch {
        /* offline — Firestore queues the write; the registry and the
           optimistic record state carry this gate until it lands */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, gateDay]
  );

  /* Latest gate context for the camera callback (refs, not deps). */
  const gateRef = useRef({ eventId, gateDay, days, rsvps: cloud.rsvps, registry, admit });
  gateRef.current = { eventId, gateDay, days, rsvps: cloud.rsvps, registry, admit };

  const containerId = useRef(`event-gate-${Math.random().toString(36).substring(2, 9)}`).current;
  const qrRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    busyRef.current = false;
    try { qrRef.current?.resume(); } catch { /* noop */ }
  }, []);

  const handleDecoded = useCallback((decodedText: string) => {
    if (busyRef.current) return;
    const g = gateRef.current;
    if (!g.eventId || !g.gateDay) return;
    busyRef.current = true;
    try { qrRef.current?.pause(); } catch { /* noop */ }

    const read = readEventPassToken(decodedText);
    const record = read.ok ? g.rsvps.find((r) => r.id === read.payload.rsvpId) || null : null;
    const decision = evaluateGateScan({
      read,
      selectedEventId: g.eventId,
      gateDay: g.gateDay,
      festivalDays: g.days,
      record,
      registryFirstScanAt: read.ok
        ? registryFirstScanAt(g.registry, g.eventId, g.gateDay, read.payload.rsvpId)
        : null,
    });

    const ok = decision.outcome === 'ADMITTED';
    playTone(ok);
    vibrate(ok);
    setResult({ decision, record, at: Date.now() });
    if (ok && record) void g.admit(record);

    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(clearResult, ok ? 3200 : 4200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearResult]);

  useEffect(() => {
    if (!wf) return;
    let cancelled = false;
    (async () => {
      try {
        const qr = new Html5Qrcode(containerId);
        qrRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          handleDecoded,
          () => undefined
        );
        if (cancelled) {
          try { if (qr.isScanning) await qr.stop(); qr.clear(); } catch { /* noop */ }
        }
      } catch {
        if (!cancelled) setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      try {
        if (qrRef.current?.isScanning) void qrRef.current.stop().catch(() => undefined);
        qrRef.current?.clear();
      } catch { /* noop */ }
      qrRef.current = null;
    };
  }, [containerId, handleDecoded, wf]);

  const counts = useMemo(
    () =>
      gateCounts(cloud.rsvps, days, gateDay, (id) =>
        registryFirstScanAt(registry, eventId, gateDay, id)
      ),
    [cloud.rsvps, days, gateDay, registry, eventId]
  );

  const dayList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cloud.rsvps
      .filter((r) => (r.status || 'confirmed') === 'confirmed' && rsvpAttendsDay(r, gateDay, days))
      .filter((r) => !q || (r.name || '').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [cloud.rsvps, gateDay, days, query]);

  if (!wf) {
    return (
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-8 text-center text-temple-400 text-sm">
        {t('surfaces.events.gateNoFestivals')}
      </div>
    );
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });
  const fmtDay = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(appLocale(), {
      weekday: 'short', day: 'numeric', month: 'short',
    });

  const invalidBody = (reason: GateDecision['reason']): string => {
    switch (reason) {
      case 'expired': return t('surfaces.events.gateExpiredBody');
      case 'signature':
      case 'tampered': return t('surfaces.events.gateTamperedBody');
      case 'no-record':
      case 'record-mismatch': return t('surfaces.events.gateNoRecordBody');
      case 'not-confirmed': return t('surfaces.events.gateNotConfirmedBody');
      case 'not-event-pass': return t('surfaces.events.gateNotEventPassBody');
      default: return t('surfaces.events.gateInvalidBody');
    }
  };

  return (
    <div className="space-y-5">
      {/* Festival + day pickers */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-4 space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-temple-400 mb-2">
            {t('surfaces.events.gatePickFestival')}
          </p>
          <div className="flex flex-wrap gap-2">
            {festivals.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFestivalKey(f.key)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold min-h-[44px] border transition ${
                  f.key === wf.key
                    ? 'bg-amber-500 text-temple-950 border-amber-400'
                    : 'bg-temple-950/70 text-temple-200 border-temple-700 hover:border-amber-500/50'
                }`}
              >
                {f.name.en} · {fmtDay(f.dateISO)}
              </button>
            ))}
          </div>
        </div>
        {days.length > 1 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-temple-400 mb-2">
              {t('surfaces.events.gatePickDay')}
            </p>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setGateDay(d)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold min-h-[44px] border transition ${
                    d === gateDay
                      ? 'bg-amber-500 text-temple-950 border-amber-400'
                      : 'bg-temple-950/70 text-temple-200 border-temple-700 hover:border-amber-500/50'
                  }`}
                >
                  {fmtDay(d)}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Live counts — the same records the War Room reads */}
        <div className="flex items-center gap-3 pt-1">
          <div className="bg-temple-950/80 px-4 py-2.5 rounded-2xl border border-temple-800">
            <p className="text-[10px] uppercase font-bold text-temple-400">
              {t('surfaces.events.gateArrivedLabel')}
            </p>
            <p className="text-lg font-black text-emerald-400">
              {counts.admittedHeads}
              <span className="text-temple-400 text-sm font-bold"> / {counts.expectedHeads}</span>
            </p>
          </div>
          <p className="text-[11px] text-temple-400 leading-snug">
            {t('surfaces.events.gatePartiesLine')
              .replace('{a}', String(counts.admittedParties))
              .replace('{e}', String(counts.expectedParties))}
          </p>
        </div>
        {!cloud.event && !cloud.loading && (
          <p className="text-[11px] text-amber-300/90">{t('surfaces.events.gateNotPublished')}</p>
        )}
      </div>

      {/* Scanner */}
      <div className="relative w-full max-w-lg mx-auto bg-temple-950 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full object-cover" />
          {!result && !cameraError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-temple-950/85 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap">
              {t('surfaces.events.gateScanHint')}
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 bg-temple-950 p-6 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-xs text-temple-300 max-w-xs">{t('surfaces.events.gateCameraError')}</p>
            </div>
          )}

          {/* Verdict overlays — unmistakable at a crowded gate */}
          {result && result.decision.outcome === 'ADMITTED' && (
            <div className="absolute inset-0 z-30 bg-emerald-950/95 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-black uppercase tracking-widest mb-1.5">
                {t('surfaces.events.gateAdmitted')}
              </span>
              <h3 className="text-3xl font-black text-white tracking-tight">
                {result.record?.name || result.decision.payload?.name}
              </h3>
              <p className="text-sm text-emerald-300 mt-1">
                {t('surfaces.events.gateWelcome')} · {t('surfaces.events.passParty').replace('{count}', String(result.record?.headcount || result.decision.payload?.headcount || 1))}
              </p>
              <button
                type="button"
                onClick={clearResult}
                className="mt-5 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-temple-950 font-black text-sm min-h-[44px]"
              >
                {t('surfaces.events.gateNext')}
              </button>
            </div>
          )}

          {result && result.decision.outcome === 'ALREADY_USED' && (
            <div className="absolute inset-0 z-30 bg-amber-950/95 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3">
                <Clock className="w-12 h-12 text-amber-400" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-black uppercase tracking-widest mb-1.5">
                {t('surfaces.events.gateAlreadyUsed')}
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {result.record?.name || result.decision.payload?.name}
              </h3>
              {result.decision.firstAdmittedAt && (
                <p className="text-sm text-amber-300 mt-1">
                  {t('surfaces.events.gateFirstScanAt').replace('{time}', fmtTime(result.decision.firstAdmittedAt))}
                </p>
              )}
              <button
                type="button"
                onClick={clearResult}
                className="mt-5 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 font-black text-sm min-h-[44px]"
              >
                {t('surfaces.events.gateNext')}
              </button>
            </div>
          )}

          {result && (result.decision.outcome === 'WRONG_EVENT' || result.decision.outcome === 'WRONG_DAY') && (
            <div className="absolute inset-0 z-30 bg-orange-950/95 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-12 h-12 text-orange-400" />
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-500/30 border border-orange-400/50 text-orange-200 text-xs font-black uppercase tracking-widest mb-1.5">
                {result.decision.outcome === 'WRONG_EVENT'
                  ? t('surfaces.events.gateWrongEvent')
                  : t('surfaces.events.gateWrongDay')}
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {result.decision.payload?.name}
              </h3>
              <p className="text-sm text-orange-300 mt-1 max-w-xs">
                {result.decision.outcome === 'WRONG_EVENT'
                  ? t('surfaces.events.gateWrongEventBody')
                  : t('surfaces.events.gateWrongDayBody').replace(
                      '{date}',
                      result.decision.payload ? fmtDay(result.decision.payload.date) : ''
                    )}
              </p>
              <button
                type="button"
                onClick={clearResult}
                className="mt-5 w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-temple-950 font-black text-sm min-h-[44px]"
              >
                {t('surfaces.events.gateNext')}
              </button>
            </div>
          )}

          {result && result.decision.outcome === 'INVALID' && (
            <div className="absolute inset-0 z-30 bg-rose-950/95 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mb-3">
                <XCircle className="w-12 h-12 text-rose-400" />
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-black uppercase tracking-widest mb-1.5">
                {t('surfaces.events.gateInvalid')}
              </span>
              <p className="text-sm text-rose-300 mt-1 max-w-xs">{invalidBody(result.decision.reason)}</p>
              <button
                type="button"
                onClick={clearResult}
                className="mt-5 w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm min-h-[44px]"
              >
                {t('surfaces.events.gateNext')}
              </button>
            </div>
          )}
        </div>
        <div className="p-3 bg-temple-900 border-t border-temple-800 text-[11px] text-temple-400 flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('surfaces.events.gateCaveat')}</span>
        </div>
      </div>

      {/* Name-search fallback — the identical admit path, no camera */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-temple-100">{t('surfaces.events.gateSearchTitle')}</h3>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-temple-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('surfaces.events.gateSearchPlaceholder')}
            className="w-full rounded-xl border border-temple-700 bg-temple-950/70 pl-9 pr-3 py-2.5 text-sm text-temple-100 placeholder:text-temple-500 focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>
        {dayList.length === 0 ? (
          <p className="text-xs text-temple-500 text-center py-4">{t('surfaces.events.gateNoRsvps')}</p>
        ) : (
          <ul className="divide-y divide-temple-800 max-h-[380px] overflow-y-auto pr-1">
            {dayList.map((r) => {
              const used = admittedOnDay(r, gateDay, registryFirstScanAt(registry, eventId, gateDay, r.id)).used;
              return (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-temple-100">{r.name}</span>
                    <span className="text-xs text-temple-400">
                      {' '}· {t('surfaces.events.passParty').replace('{count}', String(r.headcount || 1))}
                    </span>
                  </div>
                  {used ? (
                    <span className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] inline-flex items-center bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">
                      ✓ {t('surfaces.events.gateArrivedButton')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await admit(r);
                        showToast(`${t('surfaces.events.gateAdmitted')}: ${r.name}`, 'success');
                      }}
                      className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold min-h-[44px] bg-amber-500 hover:bg-amber-400 text-temple-950 transition"
                    >
                      {t('surfaces.events.gateAdmitButton')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
