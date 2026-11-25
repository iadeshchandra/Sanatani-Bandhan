/**
 * NilamLiveArena — AUCTION WAVE A3: the desk's live-arena view.
 * =====================================================================
 * Rendered inside NilamDesk for a live lot. The arena is OPEN by
 * design: the bid log is public the moment each bid lands (that
 * openness is what makes an ascending auction fair), so this
 * view simply shows what everyone watching sees — the standing
 * highest bid on the lot's own stamps, the close clock with its
 * counted extensions, and the full log in the order bids landed.
 *
 * The desk's two acts here:
 *  - Hall entry: a bid called aloud in the hall is typed in for
 *    a registered, EMD-recorded bidder and is LABELLED as a hall
 *    entry with the conductor's name on it — never disguised as
 *    an app bid (lib/auctionLive.placeLiveBid, entryMode 'hall').
 *  - Seeding: if the lot opened without its arena mirror (the
 *    seed half of the open failed), the desk seeds it here; bids
 *    cannot land until the mirror exists, and the view says so.
 *
 * When the window closes, the leader pre-fills the ordinary A1
 * outcome form (the same act as A2's "Use as the winning
 * outcome") — acceptance still rides maker–checker, and money
 * still moves only through the treasury settlement.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Gavel, Radio } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { friendlyError } from '../../lib/friendlyError';
import { isLiveLot, liveCloseMs, type AuctionLot } from '../../lib/auctionLots';
import {
  ARENA_DOC_ID,
  emdRecordedOk,
  liveLeaderBid,
  liveWindowState,
  minNextBid,
  placeLiveBid,
  seedLiveArena,
  sortLiveLog,
  type LiveArena,
  type LiveBid,
} from '../../lib/auctionLive';

const inputCls =
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-temple-950/80 border border-temple-800 text-temple-100 placeholder-temple-500 text-sm focus:border-saffron-500 focus:outline-none transition-colors';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-temple-400 mb-1';
const btnPrimary =
  'min-h-[44px] px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer disabled:opacity-50';
const btnGhost =
  'min-h-[44px] px-3 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50';
const cardCls = 'rounded-2xl bg-temple-900/70 border border-temple-800 p-4 sm:p-5 space-y-4';

const fmtWhen = (ms?: number): string =>
  typeof ms === 'number' && ms > 0
    ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
const fmtClock = (b: LiveBid): string => {
  const ms = b.createdAt?.toMillis?.() ?? 0;
  return ms > 0
    ? new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : '…';
};
const fmtLeft = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/** The plain-words line for a refused bid (shared wording with
 *  the bidder's own card — the same refusal, the same sentence). */
export const liveErrorKey = (err: unknown): string => {
  const code = err instanceof Error ? err.message : '';
  switch (code) {
    case 'emd': return 'surfaces.nilam.liveErrEmd';
    case 'barred': return 'surfaces.nilam.liveErrBarred';
    case 'not-registered': return 'surfaces.nilam.liveErrRegistered';
    case 'outbid': case 'amount': return 'surfaces.nilam.liveErrOutbid';
    case 'arena': return 'surfaces.nilam.liveArenaMissing';
    case 'window': case 'not-live': return 'surfaces.nilam.liveErrClosed';
    default: return '';
  }
};

interface Props {
  lot: AuctionLot;
  actor: { uid: string; name: string };
  /** The conductor holds the lot's desk permission (the rules
   *  check it again on every hall entry). */
  conductorOk: boolean;
  /** Pre-fill the A1 outcome form with the arena's leader. */
  onUseWinner: (registrationId: string, amount: number) => void;
}

export const NilamLiveArena: React.FC<Props> = ({ lot, actor, conductorOk, onUseWinner }) => {
  const { t } = useLanguage();
  const inr = useInr();
  const { showToast } = useToast();

  const [arena, setArena] = useState<LiveArena | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [log, setLog] = useState<LiveBid[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [hallRegId, setHallRegId] = useState('');
  const [hallAmount, setHallAmount] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'auction_lots', lot.id, 'liveBids'),
      (snap) => {
        let sawArena = false;
        const bids: LiveBid[] = [];
        snap.docs.forEach((d) => {
          if (d.id === ARENA_DOC_ID) {
            sawArena = true;
            setArena(d.data() as LiveArena);
          } else {
            const data = d.data() as Record<string, unknown>;
            bids.push({
              id: d.id,
              bidderUid: String(data.bidderUid ?? ''),
              bidderName: String(data.bidderName ?? ''),
              registrationId: String(data.registrationId ?? ''),
              amount: Number(data.amount ?? 0),
              createdAt: (data.createdAt as LiveBid['createdAt']) ?? null,
              entryMode: data.entryMode === 'hall' ? 'hall' : 'self',
              ...(typeof data.enteredByUid === 'string' && data.enteredByUid
                ? { enteredByUid: data.enteredByUid }
                : {}),
            });
          }
        });
        if (!sawArena) setArena(null);
        setLoaded(true);
        setLog(sortLiveLog(bids));
      },
      () => undefined
    );
    return () => unsub();
  }, [lot.id]);

  // The close clock ticks while the lot stands open.
  useEffect(() => {
    if (lot.status !== 'open') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lot.status]);

  const windowState = liveWindowState(lot, now);
  const closeMs = liveCloseMs(lot);
  const leader = useMemo(() => liveLeaderBid(lot, log), [lot, log]);
  const emdOkRegs = useMemo(
    () => lot.registrations.filter((r) => r.bidderUid && emdRecordedOk(r, lot.notice?.emdAmount ?? 0)),
    [lot]
  );

  // Each landed bid raises the hall-entry suggestion to the new
  // minimum — the conductor can always type over it.
  useEffect(() => {
    setHallAmount(String(minNextBid(lot)));
  }, [lot.bidCount, lot.highestBid]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      showToast(t('surfaces.nilam.saved'), 'success');
    } catch (err) {
      const k = liveErrorKey(err);
      showToast(k ? t(k) : friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusy('');
    }
  };

  const placeHallBid = () =>
    run('hall-bid', async () => {
      const reg = emdOkRegs.find((r) => r.id === hallRegId) ?? emdOkRegs[0];
      if (!reg?.bidderUid) throw new Error('emd');
      await placeLiveBid({
        lotId: lot.id,
        bidderUid: reg.bidderUid,
        bidderName: reg.name,
        registrationId: reg.id,
        amount: Number(hallAmount) || 0,
        entryMode: 'hall',
        actorUid: actor.uid,
        conductorOk,
      });
    });

  if (!isLiveLot(lot)) return null;

  return (
    <div className={cardCls}>
      <h4 className="font-extrabold text-temple-100 flex items-center gap-2">
        <Radio size={16} className="text-saffron-500" /> {t('surfaces.nilam.liveTitle')}
      </h4>
      <p className="text-xs text-temple-400">
        {t('surfaces.nilam.lotRefLabel')}: <strong className="text-temple-200">{lot.id}</strong>
      </p>

      {/* The standing stamps — the lot's own record, not a guess. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <span className={labelCls}>{t('surfaces.nilam.liveHighest')}</span>
          <p className="text-lg font-black text-temple-100">
            {(lot.bidCount ?? 0) > 0 ? inr(lot.highestBid ?? 0) : '—'}
          </p>
          {(lot.bidCount ?? 0) > 0 && lot.highestBidderName && (
            <p className="text-[11px] text-temple-400">{lot.highestBidderName}</p>
          )}
        </div>
        <div>
          <span className={labelCls}>{t('surfaces.nilam.liveBidCount')}</span>
          <p className="text-lg font-black text-temple-100">{lot.bidCount ?? 0}</p>
        </div>
        <div>
          <span className={labelCls}>{t('surfaces.nilam.liveClosesAt')}</span>
          <p className="text-sm font-bold text-temple-100">{fmtWhen(closeMs)}</p>
          {(lot.extensions ?? 0) > 0 && (
            <p className="text-[11px] text-temple-400">{t('surfaces.nilam.liveExtensions')}: {lot.extensions}</p>
          )}
        </div>
        <div>
          <span className={labelCls}>{t('surfaces.nilam.liveTimeLeft')}</span>
          <p className="text-lg font-black text-temple-100">
            {lot.status === 'open' && closeMs > 0 ? fmtLeft(closeMs - now) : '—'}
          </p>
        </div>
      </div>

      {windowState === 'open' && <p className="text-sm text-emerald-300">{t('surfaces.nilam.liveOpen')}</p>}
      {windowState === 'closed' && <p className="text-sm text-amber-300">{t('surfaces.nilam.liveClosed')}</p>}
      {(lot.bidCount ?? 0) === 0 && windowState !== 'closed' && (
        <p className="text-sm text-temple-300">{t('surfaces.nilam.liveNoBids')}</p>
      )}

      {/* The seed act, when the open's seed half did not land. */}
      {lot.status === 'open' && loaded && !arena && (
        <>
          <p className="text-sm text-temple-300">{t('surfaces.nilam.liveArenaMissing')}</p>
          <button type="button" className={btnGhost} disabled={busy !== ''} onClick={() => void run('seed', async () => { await seedLiveArena(lot); })}>
            {t('surfaces.nilam.liveSeedArena')}
          </button>
        </>
      )}

      {/* The outcome hand-off: the leader fills the A1 form. */}
      {lot.status === 'open' && windowState === 'closed' && leader && (
        leader.amount >= lot.reservePrice ? (
          <button
            type="button" className={btnPrimary} disabled={busy !== ''}
            onClick={() => onUseWinner(leader.registrationId, leader.amount)}
          >
            <Gavel size={16} /> {t('surfaces.nilam.liveUseWinner')} · {leader.bidderName} · {inr(leader.amount)}
          </button>
        ) : (
          <p className="text-sm text-red-300">{t('surfaces.nilam.liveBelowReserve')}</p>
        )
      )}

      {/* Hall entry — labelled, on the conductor's name. */}
      {windowState === 'open' && (
        <div className="space-y-2 pt-2 border-t border-temple-800">
          <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300">{t('surfaces.nilam.liveHallEntryTitle')}</h5>
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>{t('surfaces.nilam.liveHallBidder')}</label>
              <select className={inputCls} value={hallRegId || emdOkRegs[0]?.id || ''}
                onChange={(e) => setHallRegId(e.target.value)}>
                {emdOkRegs.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('surfaces.nilam.liveHallAmount')}</label>
              <input type="number" min="0" className={inputCls} value={hallAmount}
                onChange={(e) => setHallAmount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="button" className={btnPrimary + ' w-full'} disabled={busy !== '' || emdOkRegs.length === 0} onClick={() => void placeHallBid()}>
                {t('surfaces.nilam.liveHallPlace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The log — every bid, in the order it landed. */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300">{t('surfaces.nilam.liveLogTitle')}</h5>
        {log.length === 0 ? (
          <p className="text-sm text-temple-400">{t('surfaces.nilam.liveNoBids')}</p>
        ) : (
          log.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-temple-950/60 border border-temple-800 px-3 py-2">
              <span className="text-sm font-bold text-temple-100">{b.bidderName}</span>
              <span className="text-sm text-temple-200">{inr(b.amount)}</span>
              {b.entryMode === 'hall' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-temple-800 text-amber-300">{t('surfaces.nilam.liveHallBadge')}</span>
              )}
              <span className="text-[11px] text-temple-500 ml-auto">{fmtClock(b)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NilamLiveArena;
