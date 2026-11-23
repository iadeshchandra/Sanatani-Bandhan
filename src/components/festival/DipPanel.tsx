/**
 * DipPanel — NEXT-LEVEL B1b: the e-dip, run from the War Room.
 * =====================================================================
 * For a pass tier whose demand far outruns its places, the rush
 * is replaced by a registered draw (the TTD pattern). This panel
 * is the committee's side of it, in three movements:
 *
 *  1. FREEZE — after the entry window closes, the pool (every
 *     'entered' entry, sorted by doc id) is fingerprinted with
 *     SHA-256 and the fingerprint + count + a PUBLIC SEED are
 *     stamped onto the published festival doc BEFORE any winner
 *     exists. The seed is drawn openly by the committee (the
 *     panel instructs exactly that) — the stamp is the
 *     commitment: after it, the pool cannot quietly change.
 *  2. RUN — the draw itself: lib/eventDip.runDipDraw — a
 *     Fisher–Yates shuffle driven by mulberry32, seeded from
 *     SHA-256(pool fingerprint + seed). The first N of the order
 *     are selected, N = the tier's remaining places counted in
 *     PARTIES (one entry is one household party — the copy says
 *     so); the rest are waitlisted IN that order, every party's
 *     position published on its entry.
 *  3. PROMOTE — a selected party that does not claim by the
 *     claim-by moment may be lapsed, and the lowest-position
 *     waitlisted party is promoted in the same tap. Promotion
 *     re-stamps a fresh claim-by moment for the tier.
 *
 * HONESTY LAW (hard): the draw runs on THIS device. The panel
 * says what makes it checkable — pool published before the
 * draw, seed public, method named, positions published — and
 * never claims "provably fair" or server verification.
 *
 * Write paths (verified against firestore.rules before
 * building): the freeze/draw stamps ride the festival_events
 * staff update clause (R_BOARD, no key-set pin — the
 * liveBoard/fairnessSummary posture); the entry standings ride
 * the event_dip_entries staff update clause (dipStaffUpdateOk:
 * entered→selected|waitlisted, waitlisted→selected,
 * selected→lapsed, keys pinned). Reads of the pool are the
 * staff read on the same collection.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Btn, Card, inputCls } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import type { FestivalEventDoc, TicketTier, WarFestival, WarRoomPlan } from '../../lib/festival';
import { tierQuota } from '../../lib/festivalFairness';
import {
  applyDipDraw,
  dipWindowState,
  isDipTier,
  lapseAndPromote,
  loadDipEntries,
  nextWaitlisted,
  poolFingerprint,
  runDipDraw,
  sortDipPoolIds,
  stampDipFreeze,
  type DipEntry,
} from '../../lib/eventDip';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  event: FestivalEventDoc | null;
}

const fmtWhen = (ms: number): string =>
  new Date(ms).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

const toLocalInput = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DAY_MS = 86400000;

export const DipPanel: React.FC<Props> = ({ plan, event }) => {
  const { t } = useLanguage();
  const tr = (k: string) => t(`surfaces.events.${k}`);

  const dipTiers = useMemo(
    () => (event?.ticketTiers ?? []).filter((tier) => isDipTier(event as FestivalEventDoc, tier.id)),
    [event]
  );

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800">{tr('dipPanelTitle')}</h3>
      <p className="text-[11px] text-stone-500 mt-0.5 mb-3">{tr('dipPanelIntro')}</p>
      {!event?.published ? (
        <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          {tr('dipNotPublished')}
        </p>
      ) : dipTiers.length === 0 ? (
        <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          {tr('dipNoDipTiers')}
        </p>
      ) : (
        <div className="space-y-4">
          {dipTiers.map((tier) => (
            <DipTierCard key={tier.id} plan={plan} event={event} tier={tier} tr={tr} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-stone-400 mt-3">{tr('dipCheckableNote')}</p>
    </Card>
  );
};

/* ── One tier's dip: pool, freeze, draw, promotions ────────────── */

const DipTierCard: React.FC<{
  plan: WarRoomPlan;
  event: FestivalEventDoc;
  tier: TicketTier;
  tr: (k: string) => string;
}> = ({ plan, event, tier, tr }) => {
  const [entries, setEntries] = useState<DipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [seed, setSeed] = useState('');
  const quota = tierQuota(tier, event.tierSold, event.tierCaps);
  const [places, setPlaces] = useState<number>(quota.remaining ?? 0);
  const [claimByLocal, setClaimByLocal] = useState<string>(toLocalInput(Date.now() + 7 * DAY_MS));
  const [promoteClaimByLocal, setPromoteClaimByLocal] = useState<string>(toLocalInput(Date.now() + 3 * DAY_MS));
  const [poolChanged, setPoolChanged] = useState(false);

  const draw = event.dipDraws?.[tier.id];
  const winState = dipWindowState(event, tier.id, Date.now());
  const opens = event.dipOpensAtMs?.[tier.id] || 0;
  const closes = event.dipClosesAtMs?.[tier.id] || 0;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await loadDipEntries(db, plan.id, tier.id));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [plan.id, tier.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Default places = the tier's remaining places (the quota the
  // devotees themselves saw), counted in parties for the draw.
  useEffect(() => {
    if (!draw) setPlaces(quota.remaining ?? entries.filter((e) => e.status === 'entered').length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quota.remaining, draw]);

  const entered = entries.filter((e) => e.status === 'entered');
  const sortedPoolIds = useMemo(() => sortDipPoolIds(entered.map((e) => e.id)), [entered]);
  const liveFingerprint = useMemo(() => poolFingerprint(sortedPoolIds), [sortedPoolIds]);

  const doFreeze = async () => {
    if (!seed.trim() || entered.length === 0) return;
    setBusy(true);
    setFailed(false);
    try {
      await stampDipFreeze(db, plan.id, tier.id, {
        seed: seed.trim(),
        poolHash: liveFingerprint,
        poolCount: entered.length,
        frozenAtMs: Date.now(),
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const doRun = async () => {
    if (!draw || draw.drawnAtMs) return;
    // The pool must be the pool that was frozen — if an entry
    // arrived or left since (it should not be possible: the
    // window is closed and staff cannot delete), refuse and say
    // so rather than draw a different pool than the published one.
    if (liveFingerprint !== draw.poolHash || entered.length !== draw.poolCount) {
      setPoolChanged(true);
      return;
    }
    const claimByMs = Date.parse(claimByLocal);
    if (!Number.isFinite(claimByMs)) {
      setFailed(true);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const result = runDipDraw(sortedPoolIds, draw.poolHash, draw.seed, places);
      await applyDipDraw(db, {
        eventId: plan.id,
        tierId: tier.id,
        record: { ...draw, drawnAtMs: Date.now(), winnersCount: result.winners.length, claimByMs },
        result,
        nowMs: Date.now(),
      });
      await reload();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const doPromote = async (lapse: DipEntry) => {
    const next = nextWaitlisted(entries);
    const newClaimByMs = Date.parse(promoteClaimByLocal);
    if (!next || !Number.isFinite(newClaimByMs)) return;
    setBusy(true);
    setFailed(false);
    try {
      await lapseAndPromote(db, {
        lapse,
        promote: next,
        eventId: plan.id,
        tierId: tier.id,
        newClaimByMs,
        nowMs: Date.now(),
      });
      await reload();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (s: DipEntry['status']): string =>
    s === 'entered' ? tr('dipStatusEntered')
      : s === 'selected' ? tr('dipStatusSelected')
        : s === 'waitlisted' ? tr('dipStatusWaitlisted')
          : s === 'claimed' ? tr('dipStatusClaimed')
            : tr('dipStatusLapsed');

  const claimPassed = !!draw?.drawnAtMs && !!draw.claimByMs && Date.now() > draw.claimByMs;
  const nextInLine = nextWaitlisted(entries);

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-black text-stone-800">{tier.name.en}</span>
        <span className="text-[11px] font-bold text-stone-500">
          {winState === 'upcoming' && tr('dipWindowUpcoming').replace('{date}', fmtWhen(opens))}
          {winState === 'open' && tr('dipWindowOpen').replace('{date}', fmtWhen(closes))}
          {winState === 'closed' && tr('dipWindowClosed').replace('{date}', fmtWhen(closes))}
        </span>
      </div>
      <p className="text-xs text-stone-600 mt-1">
        {tr('dipEntriesCount').replace('{count}', String(entries.length))}
        {quota.capacity !== null && (
          <> · {tr('quotaLeft').replace('{remaining}', String(quota.remaining)).replace('{capacity}', String(quota.capacity))}</>
        )}
      </p>

      {/* FREEZE — only once entries have closed, before any
          draw. Shown again if the pool provably changed after a
          freeze (the run below refuses then): re-freezing
          re-publishes the commitment for the pool as it stands. */}
      {(!draw || (poolChanged && !draw.drawnAtMs)) && winState === 'closed' && (
        <div className="mt-3 rounded-xl bg-white border border-stone-200 px-3 py-2.5">
          <div className="text-xs font-black text-stone-700">{tr('dipFreezeTitle')}</div>
          <p className="text-[11px] text-stone-500 mt-1">{tr('dipFreezeNote')}</p>
          {entered.length === 0 ? (
            <p className="text-xs font-bold text-stone-500 mt-2">{tr('dipNoEntries')}</p>
          ) : (
            <>
              <label className="block text-[11px] font-bold text-stone-600 mt-2 mb-1">{tr('dipSeedLabel')}</label>
              <input className={inputCls} value={seed} placeholder={tr('dipSeedPlaceholder')}
                onChange={(e) => setSeed(e.target.value)} />
              <p className="text-[11px] text-stone-400 mt-1">{tr('dipSeedHint')}</p>
              <Btn className="mt-2 min-h-[44px]" disabled={busy || !seed.trim()} onClick={doFreeze}>
                {tr('dipFreezeBtn')}
              </Btn>
            </>
          )}
        </div>
      )}

      {/* The published freeze commitment. */}
      {draw && (
        <p className="text-[11px] font-bold text-stone-600 mt-2">
          {tr('dipFrozenNote')
            .replace('{count}', String(draw.poolCount))
            .replace('{hash}', draw.poolHash.slice(0, 12) + '…')}
          {' · '}
          {tr('dipSeedLabel')}: {draw.seed}
        </p>
      )}

      {/* RUN — the frozen pool, the published method. */}
      {draw && !draw.drawnAtMs && (
        <div className="mt-3 rounded-xl bg-white border border-stone-200 px-3 py-2.5">
          <div className="text-xs font-black text-stone-700">{tr('dipRunTitle')}</div>
          <p className="text-[11px] text-stone-500 mt-1">{tr('dipRunNote')}</p>
          {poolChanged && (
            <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">
              {tr('dipPoolChanged')}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2 mt-2">
            <label className="text-[11px] font-bold text-stone-600">
              {tr('dipPlacesLabel')}
              <input type="number" min={0} max={draw.poolCount} className={`${inputCls} !w-24 mt-1`}
                value={places}
                onChange={(e) => setPlaces(Math.max(0, Math.min(draw.poolCount, parseInt(e.target.value || '0', 10) || 0)))} />
            </label>
            <label className="text-[11px] font-bold text-stone-600">
              {tr('dipClaimByLabel')}
              <input type="datetime-local" className={`${inputCls} !w-60 mt-1`}
                value={claimByLocal} onChange={(e) => setClaimByLocal(e.target.value)} />
            </label>
            <Btn className="min-h-[44px]" disabled={busy} onClick={doRun}>{tr('dipRunBtn')}</Btn>
          </div>
        </div>
      )}

      {/* Drawn — the published facts + promotions. */}
      {draw?.drawnAtMs && (
        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-3">
          {tr('dipDrawnNote')
            .replace('{date}', fmtWhen(draw.drawnAtMs))
            .replace('{winners}', String(draw.winnersCount ?? 0))
            .replace('{pool}', String(draw.poolCount))
            .replace('{claimBy}', draw.claimByMs ? fmtWhen(draw.claimByMs) : '—')}
        </p>
      )}

      {failed && (
        <p className="text-xs font-bold text-red-700 mt-2">{tr('dipActionFailed')}</p>
      )}

      {/* The register — staff see their own records in full;
          the PUBLIC page only ever carries the aggregates. */}
      {!loading && entries.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-stone-400">
                <th className="py-1 pr-2 font-bold">{tr('dipColPosition')}</th>
                <th className="py-1 pr-2 font-bold">{tr('dipColName')}</th>
                <th className="py-1 pr-2 font-bold">{tr('dipColHeads')}</th>
                <th className="py-1 pr-2 font-bold">{tr('dipColStatus')}</th>
                <th className="py-1 font-bold" />
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => (a.dipPosition ?? Number.MAX_SAFE_INTEGER) - (b.dipPosition ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id))
                .map((e) => (
                  <tr key={e.id} className="border-t border-orange-100">
                    <td className="py-1.5 pr-2 tnum font-bold text-stone-600">{e.dipPosition ?? '—'}</td>
                    <td className="py-1.5 pr-2 font-semibold text-stone-700">{e.buyerName}</td>
                    <td className="py-1.5 pr-2 tnum text-stone-600">{e.heads}</td>
                    <td className="py-1.5 pr-2 font-bold text-stone-600">{statusLabel(e.status)}</td>
                    <td className="py-1.5 text-right">
                      {e.status === 'selected' && claimPassed && nextInLine && (
                        <button className="text-[11px] font-black text-orange-800 underline min-h-[44px] px-1"
                          disabled={busy} onClick={() => doPromote(e)}>
                          {tr('dipLapseBtn')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promotion claim-by — set before lapsing anyone. */}
      {draw?.drawnAtMs && claimPassed && nextInLine && entries.some((e) => e.status === 'selected') && (
        <div className="mt-2 rounded-xl bg-white border border-stone-200 px-3 py-2.5">
          <div className="text-xs font-black text-stone-700">{tr('dipPromoteTitle')}</div>
          <p className="text-[11px] text-stone-500 mt-1">{tr('dipPromoteNote')}</p>
          <label className="block text-[11px] font-bold text-stone-600 mt-2">
            {tr('dipNewClaimByLabel')}
            <input type="datetime-local" className={`${inputCls} !w-60 mt-1`}
              value={promoteClaimByLocal} onChange={(e) => setPromoteClaimByLocal(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  );
};
