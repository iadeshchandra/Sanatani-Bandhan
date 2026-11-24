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
import React, { useState } from 'react';
import { Gavel, Lock } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { friendlyError } from '../../lib/friendlyError';
import {
  loadMyBid, placeBid, replaceBid, withdrawBid, type SealedBid,
} from '../../lib/auctionBids';

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

  return (
    <div className="px-4 pb-3">
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
    </div>
  );
};

export default MySealedBidsSection;
