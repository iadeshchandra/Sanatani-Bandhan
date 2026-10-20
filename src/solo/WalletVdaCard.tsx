/**
 * solo/WalletVdaCard.tsx — payment identity in the Wallet (fix #14).
 * ================================================================
 * The claimed VDA (`name@scope`, the "spoken ID") used to live only on
 * the Profile tab — but it IS a payment identity: people pay you by
 * saying it. So the Wallet shows it too:
 *  - claimed  → the alias, tap-to-copy (same clipboard helper as Profile);
 *  - unclaimed → a warm claim nudge that deep-links to the Profile VDA
 *    section (#vda-alias), where the claim itself stays single-sourced.
 * Display + door only: claiming/releasing still happens in exactly one
 * place (VdaAliasSection), so the registry rules never fork.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { useSolo } from './SoloContext';
import { useToast } from '../context/ToastContext';
import { Card, T, useLocaleText } from './ui';
import { copyTextToClipboard } from '../lib/orgPublic';
import { walletVdaState } from './walletVda';

export const WalletVdaCard: React.FC = () => {
  const { profile } = useSolo();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const view = walletVdaState(profile?.vdaAlias);

  const copy = async () => {
    if (view.state !== 'claimed') return;
    const ok = await copyTextToClipboard(view.alias);
    if (ok) {
      setCopied(true);
      showToast(tr('Copied! 🙏', 'কপি হয়েছে! 🙏', 'कॉपी हो गया! 🙏'), 'success');
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  /* Same deep-link the Home nudge uses: route to Profile, then the hash
   * makes ProfileTab scroll the VDA section into view. */
  const goClaim = () => {
    navigate('/app/home/profile');
    window.location.hash = 'vda-alias';
  };

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl shrink-0" aria-hidden>
          🗣️
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
            <T en="Your spoken ID" bn="আপনার কথ্য আইডি" hi="आपकी कथ्य आईडी" />
          </p>
          {view.state === 'claimed' ? (
            <>
              <p className="font-mono font-bold text-stone-900 truncate">{view.alias}</p>
              <p className="text-[11px] text-stone-500">
                <T
                  en="People can pay you by saying this — no numbers to share."
                  bn="মানুষ এটি বলেই আপনাকে টাকা পাঠাতে পারে — নম্বর ভাগ করতে হয় না।"
                  hi="लोग यही बोलकर आपको भुगतान कर सकते हैं — नंबर साझा नहीं करना पड़ता।"
                />
              </p>
            </>
          ) : (
            <p className="text-sm text-stone-600">
              <T
                en="Claim a name@scope — say it instead of numbers when someone pays you."
                bn="একটি name@scope নিন — কেউ টাকা পাঠালে নম্বরের বদলে এটাই বলুন।"
                hi="एक name@scope लें — कोई भुगतान करे तो नंबर की जगह यही बोलें।"
              />
            </p>
          )}
        </div>
        {view.state === 'claimed' ? (
          <button
            type="button"
            onClick={copy}
            aria-label={tr('Copy spoken ID', 'কথ্য আইডি কপি করুন', 'कथ्य आईडी कॉपी करें')}
            className="shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={goClaim}
            className="shrink-0 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black transition-colors"
          >
            <T en="Claim →" bn="নিন →" hi="लें →" />
          </button>
        )}
      </div>
    </Card>
  );
};

export default WalletVdaCard;
