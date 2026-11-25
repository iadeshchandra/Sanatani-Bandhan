/**
 * MySealedBids.tsx — AUCTION WAVE A2: the bidder's own door.
 * =====================================================================
 * A registered bidder on a sealed lot places their ONE bid from
 * here, in Personal mode. The shape of the thing is dictated by
 * the seal itself: the lot doc is staff-read only (it carries
 * every bidder's phone and ID reference), so this card cannot
 * browse lots — the bidder quotes the lot reference printed on
 * the public notice and their registration receipt, and the
 * card speaks only to their own bid doc (`bids/{their uid}`),
 * the one document the rules let them read before the opening.
 *
 * What "sealed" means, in the words the card itself uses: no
 * one can read the bid — not other bidders, not the committee —
 * until the auction moment on the notice has passed. The card
 * never claims more than the rules enforce.
 */
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Gavel, Lock, Radio } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { resolveActorName } from '../../bahikhata/bahikhataStore';
import { friendlyError } from '../../lib/friendlyError';
import {
  loadMyBid, placeBid, replaceBid, withdrawBid, type SealedBid,
} from '../../lib/auctionBids';
import {
  ARENA_DOC_ID, placeLiveBid, sortLiveLog,
  type LiveArena, type LiveBid,
} from '../../lib/auctionLive';
import { liveErrorKey } from '../domain2/NilamLiveArena';

const inputCls =
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-temple-950/80 border border-temple-800 text-temple-100 placeholder-temple-500 text-sm focus:border-saffron-500 focus:outline-none transition-colors';
const btnPrimary =
  'min-h-[44px] px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer disabled:opacity-50';
const btnGhost =
  'min-h-[44px] px-3 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50';

export const MySealedBidsSection: React.FC = () => {
  const { t } = useLanguage();
  const inr = useInr();
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = firebaseUser?.uid || '';

  const [lotRef, setLotRef] = useState('');
  const [loadedLot, setLoadedLot] = useState<string | null>(null);
  const [myBid, setMyBid] = useState<SealedBid | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (!uid) return null;

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showToast(okMsg, 'success');
    } catch (err) {
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const findBid = () =>
    run(async () => {
      const id = lotRef.trim();
      if (!id) throw new Error('lot-ref');
      const bid = await loadMyBid(id, uid);
      setLoadedLot(id);
      setMyBid(bid);
      setAmount(bid ? String(bid.amount) : '');
    });

  const submit = () =>
    run(async () => {
      if (!loadedLot) throw new Error('lot-ref');
      const value = Number(amount) || 0;
      if (myBid) {
        await replaceBid(loadedLot, uid, value, Date.now());
        setMyBid({ ...myBid, amount: value, updatedAt: Date.now() });
      } else {
        const bid = await placeBid(loadedLot, uid, value, Date.now());
        setMyBid(bid);
      }
    }, t('surfaces.nilam.myBidsSaved'));

  const withdraw = () =>
    run(async () => {
      if (!loadedLot) throw new Error('lot-ref');
      await withdrawBid(loadedLot, uid);
      setMyBid(null);
      setAmount('');
    }, t('surfaces.nilam.myBidsWithdrawn'));

  const bidderName = resolveActorName([firebaseUser?.displayName], firebaseUser?.email || '');

  return (
    <div className="px-4 pb-3 space-y-3">
      <div className="rounded-2xl bg-temple-900/70 border border-temple-800 p-4 space-y-3">
        <h3 className="font-extrabold text-temple-100 flex items-center gap-2">
          <Gavel size={16} className="text-saffron-500" /> {t('surfaces.nilam.myBidsTitle')}
        </h3>
        <p className="text-xs text-temple-400">{t('surfaces.nilam.myBidsIntro')}</p>
        <div className="flex flex-wrap gap-2">
          <input className={inputCls + ' flex-1 min-w-[180px]'} placeholder={t('surfaces.nilam.myBidsLotRef')}
            value={lotRef} onChange={(e) => setLotRef(e.target.value)} />
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void findBid()}>
            {t('surfaces.nilam.myBidsLoad')}
          </button>
        </div>
        {loadedLot && (
          <>
            {myBid ? (
              <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                <Lock size={14} /> {t('surfaces.nilam.myBidsCurrent')}: {inr(myBid.amount)}
              </p>
            ) : (
              <p className="text-sm text-temple-300">{t('surfaces.nilam.myBidsNone')}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <input type="number" min="0" className={inputCls + ' flex-1 min-w-[160px]'} placeholder={t('surfaces.nilam.myBidsAmount')}
                value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void submit()}>
                {myBid ? t('surfaces.nilam.myBidsReplace') : t('surfaces.nilam.myBidsPlace')}
              </button>
              {myBid && (
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void withdraw()}>
                  {t('surfaces.nilam.myBidsWithdraw')}
                </button>
              )}
            </div>
            <p className="text-[11px] text-temple-500 flex items-start gap-1">
              <Lock size={12} className="mt-0.5 shrink-0" /> {t('surfaces.nilam.myBidsSealedNote')}
            </p>
          </>
        )}
      </div>
      <MyLiveAuctionsCard uid={uid} bidderName={bidderName} />
    </div>
  );
};

/**
 * MyLiveAuctionsCard — AUCTION WAVE A3: the bidder's live door.
 * ==============================================================
 * The opposite of the seal: a live arena is PUBLIC. The lot doc
 * itself stays staff-read (it carries every bidder's phone and
 * ID reference), so the card still cannot browse lots — the
 * bidder quotes the lot reference and their registration
 * reference from the receipt, and the card speaks to the arena
 * mirror + the public bid log, the two things the rules open to
 * any signed-in watcher once a live lot is running.
 *
 * The card states the standing plainly — winning, or a higher
 * bid stands above yours — and never pressures: no countdown
 * theatre, no "hurry" copy. The close clock and the extension
 * rule are printed up front, before any bid is placed.
 */
const MyLiveAuctionsCard: React.FC<{ uid: string; bidderName: string }> = ({ uid, bidderName }) => {
  const { t } = useLanguage();
  const inr = useInr();
  const { showToast } = useToast();

  const [lotRef, setLotRef] = useState('');
  const [regRef, setRegRef] = useState('');
  const [loadedLot, setLoadedLot] = useState<string | null>(null);
  const [loadedReg, setLoadedReg] = useState('');
  const [arena, setArena] = useState<LiveArena | null>(null);
  const [log, setLog] = useState<LiveBid[]>([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!loadedLot) { setArena(null); setLog([]); return undefined; }
    const unsub = onSnapshot(
      collection(db, 'auction_lots', loadedLot, 'liveBids'),
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
        setLog(sortLiveLog(bids));
      },
      () => undefined
    );
    return () => unsub();
  }, [loadedLot]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // The suggested next bid follows the arena: the reserve before
  // any bid, the standing highest + the increment after.
  useEffect(() => {
    if (arena) {
      setAmount(String(arena.highestBid > 0 ? arena.highestBid + arena.bidIncrement : arena.reservePrice));
    }
  }, [arena?.highestBid, arena?.bidCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showToast(okMsg, 'success');
    } catch (err) {
      const k = liveErrorKey(err);
      showToast(k ? t(k) : friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = () =>
    run(async () => {
      const id = lotRef.trim();
      const reg = regRef.trim();
      if (!id || !reg) throw new Error('lot-ref');
      setLoadedLot(id);
      setLoadedReg(reg);
    });

  const place = () =>
    run(async () => {
      if (!loadedLot) throw new Error('lot-ref');
      await placeLiveBid({
        lotId: loadedLot,
        bidderUid: uid,
        bidderName,
        registrationId: loadedReg,
        amount: Number(amount) || 0,
        entryMode: 'self',
        actorUid: uid,
      });
    }, t('surfaces.nilam.saved'));

  const openNow = !!arena && arena.closeAt > now;
  const myBids = log.filter((b) => b.bidderUid === uid);
  const winning = !!arena && arena.bidCount > 0 && arena.highestBidderUid === uid;
  const outbid = !!arena && arena.bidCount > 0 && myBids.length > 0 && !winning;

  return (
    <div className="rounded-2xl bg-temple-900/70 border border-temple-800 p-4 space-y-3">
      <h3 className="font-extrabold text-temple-100 flex items-center gap-2">
        <Radio size={16} className="text-saffron-500" /> {t('surfaces.nilam.myLiveTitle')}
      </h3>
      <p className="text-xs text-temple-400">{t('surfaces.nilam.myLiveIntro')}</p>
      <p className="text-[11px] text-temple-500">{t('surfaces.nilam.myLiveRules')}</p>
      <div className="flex flex-wrap gap-2">
        <input className={inputCls + ' flex-1 min-w-[180px]'} placeholder={t('surfaces.nilam.myBidsLotRef')}
          value={lotRef} onChange={(e) => setLotRef(e.target.value)} />
        <span className="flex-1 min-w-[180px] space-y-1">
          <input className={inputCls} placeholder={t('surfaces.nilam.myLiveRegRef')}
            value={regRef} onChange={(e) => setRegRef(e.target.value)} />
          <span className="block text-[11px] text-temple-500">{t('surfaces.nilam.myLiveRegRefHint')}</span>
        </span>
        <button type="button" className={btnGhost} disabled={busy} onClick={() => void open()}>
          {t('surfaces.nilam.myLiveLoad')}
        </button>
      </div>
      {loadedLot && (
        <>
          {!arena ? (
            <p className="text-sm text-temple-300">{t('surfaces.nilam.liveArenaMissing')}</p>
          ) : (
            <>
              <p className="text-sm text-temple-200">
                {t('surfaces.nilam.myLiveHighest')}: <strong className="text-temple-100">{arena.bidCount > 0 ? inr(arena.highestBid) : '—'}</strong>
                {' · '}{t('surfaces.nilam.liveClosesAt')}: {new Date(arena.closeAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {arena.extensions > 0 ? ` · ${t('surfaces.nilam.liveExtensions')}: ${arena.extensions}` : ''}
              </p>
              {winning && <p className="text-sm text-emerald-300">{t('surfaces.nilam.myLiveWinning')}</p>}
              {outbid && <p className="text-sm text-amber-300">{t('surfaces.nilam.myLiveOutbid')}</p>}
              {!openNow && <p className="text-sm text-temple-300">{t('surfaces.nilam.myLiveClosed')}</p>}
              {openNow && (
                <div className="flex flex-wrap gap-2">
                  <input type="number" min="0" className={inputCls + ' flex-1 min-w-[160px]'} placeholder={t('surfaces.nilam.myLiveAmount')}
                    value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button type="button" className={btnPrimary} disabled={busy} onClick={() => void place()}>
                    {t('surfaces.nilam.myLivePlace')}
                  </button>
                </div>
              )}
              {myBids.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300">{t('surfaces.nilam.myLiveYourBids')}</h5>
                  {myBids.map((b) => (
                    <p key={b.id} className="text-sm text-temple-200">
                      {inr(b.amount)}
                      {b.entryMode === 'hall' ? ` · ${t('surfaces.nilam.liveHallBadge')}` : ''}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MySealedBidsSection;
