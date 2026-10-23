/**
 * WalletTab — platform wallet for Solo users.
 * Balance + top-up (geo-based payment methods) + transaction history.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wallet as WalletIcon, Plus, History, Copy, CheckCircle2, Clock, XCircle, RefreshCw, ChevronLeft, Eye, EyeOff, HandHeart, ScanLine } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { safeExternalUrl } from '../lib/safeUrl';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { Card, Btn, Field, inputCls, Modal } from './ui';
import P2PScanSheet from '../chat/P2PScanSheet';
import { WalletVdaCard } from './WalletVdaCard';
import {
  getWallet, getTransactions, fileTopupClaim, myTopupClaims, ensureWallet, updateTopupClaim,
  currencyForRegion, fmtWallet, CURRENCY_SYMBOL, TOPUP_LIMITS, TOPUP_EXPIRY_HOURS,
  generateTopupReference, claimDisplayStatus, maskTrxId,
  type Wallet, type WalletTransaction, type TopupClaim, type WalletCurrency,
} from '../lib/wallet';
import { detectPayRegion, type PayRegion } from '../lib/geoDetect';
import { getPaymentMethods, methodsForRegionWithFallback, type PaymentMethodDoc } from '../lib/paymentMethods';
import { useLanguage } from '../context/LanguageContext';
import { mkt, type MktLang } from '../lib/marketplaceCopy';
import { openDanaSheet } from '../lib/danaSheet';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark, WhatsThis } from '../components/guide';

/** INTL: Payoneer primary, Wise fallback (BD founder Wise eligibility). Local-region methods always first. */
const orderMethods = (list: PaymentMethodDoc[], region: PayRegion): PaymentMethodDoc[] =>
  [...list].sort((a, b) => {
    const al = a.region === region ? 0 : 1;
    const bl = b.region === region ? 0 : 1;
    if (al !== bl) return al - bl;
    return a.id === 'intl_payoneer' ? -1 : b.id === 'intl_payoneer' ? 1 : 0;
  });

const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-700';

function TxnIcon({ type }: { type: string }) {
  if (type === 'topup') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (type === 'spend') return <WalletIcon className="w-4 h-4 text-amber-600" />;
  if (type === 'receive') return <CheckCircle2 className="w-4 h-4 text-sky-600" />;
  if (type === 'commission') return <WalletIcon className="w-4 h-4 text-purple-600" />;
  return <History className="w-4 h-4 text-stone-400" />;
}

const TXN_LABEL_KEY: Record<string, string> = {
  topup: 'solo.wallet.txnTopup', spend: 'solo.wallet.txnSpend', receive: 'solo.wallet.txnReceive',
  commission: 'solo.wallet.txnCommission', refund: 'solo.wallet.txnRefund',
  adjustment: 'solo.wallet.txnAdjustment', topup_request: 'solo.wallet.txnTopupRequest',
};

/** Reused by provider shells (Purohit/Jyotish) as the `seva-pro:open-topup`
 *  listener target — the wallet top-up claim flow is uid-scoped, not
 *  session-scoped, so it works unchanged outside the Solo tab. */
export const TopupFlow: React.FC<{ currency: WalletCurrency; onDone: () => void; onBack: () => void }> = ({ currency, onDone, onBack }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [region, setRegion] = useState<PayRegion>('BD');
  const [methods, setMethods] = useState<PaymentMethodDoc[]>([]);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [reference, setReference] = useState(() => generateTopupReference());
  const [working, setWorking] = useState(false);

  // FIX 3a: generation counter — a late auto-detect resolution must never
  // clobber a manual country choice. detectPayRegion() does a Firestore read
  // plus an IP lookup (up to ~6s), so it can resolve after the user taps a
  // tab; without this guard the tab snapped back to Intl with only
  // Payoneer/Wise showing.
  const regionGen = useRef(0);

  const limits = TOPUP_LIMITS[currency];
  const sym = CURRENCY_SYMBOL[currency];

  useEffect(() => {
    const gen = ++regionGen.current;
    detectPayRegion().then((r) => {
      if (regionGen.current !== gen) return; // user switched manually meanwhile
      setRegion(r);
      setMethods([]);
      getPaymentMethods().then((all) => {
        if (regionGen.current !== gen) return;
        const list = orderMethods(methodsForRegionWithFallback(all, r), r);
        setMethods(list);
        if (list[0]) setMethodId(list[0].id);
      });
    }).catch(() => {});
  }, []);

  const switchRegion = (r: PayRegion) => {
    regionGen.current += 1; // manual choice wins over any in-flight auto-detect
    const gen = regionGen.current;
    setRegion(r);
    getPaymentMethods().then((all) => {
      if (regionGen.current !== gen) return;
      const list = orderMethods(methodsForRegionWithFallback(all, r), r);
      setMethods(list);
      if (list[0]) setMethodId(list[0].id);
    });
  };

  const method = methods.find((m) => m.id === methodId);
  const amt = Math.round(Number(amount));

  const submit = async () => {
    if (!amt || amt <= 0) { showToast(t('solo.wallet.enterAmount'), 'error'); return; }
    if (amt < limits.min || amt > limits.max) {
      showToast(t('solo.wallet.amountBetween').replace('{min}', fmtWallet(limits.min, currency)).replace('{max}', fmtWallet(limits.max, currency)), 'error');
      return;
    }
    if (!methodId) { showToast(t('solo.wallet.chooseMethod'), 'error'); return; }
    if (!trxId.trim()) { showToast(t('solo.wallet.enterTrxId'), 'error'); return; }
    setWorking(true);
    try {
      const { reference: ref } = await fileTopupClaim({
        amount: amt, currency, paymentMethodId: methodId, trxId: trxId.trim(), reference,
      });
      showToast(t('solo.wallet.topupSubmitted').replace('{ref}', ref), 'success');
      onDone();
    } catch (e: any) { showToast(e.message || t('solo.wallet.submissionFailed'), 'error'); }
    setWorking(false);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast(`${label}: ${text}`, 'success');
  };

  const regenerateRef = () => {
    const ref = generateTopupReference();
    setReference(ref);
    showToast(`${t('solo.wallet.newReference')}: ${ref}`, 'success');
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={btnG}><ChevronLeft className="w-4 h-4 inline" /> {t('common.back')}</button>
      <Card>
        <p className="text-sm font-black text-stone-900 mb-1">{t('solo.wallet.topUpTitle').replace('{sym}', sym)}</p>
        <p className="text-[11px] text-stone-500 mb-3">
          {t('solo.wallet.minMax').replace('{min}', fmtWallet(limits.min, currency)).replace('{max}', fmtWallet(limits.max, currency))}
        </p>
        <div className="flex gap-1.5 mb-3">
          {(['BD', 'IN', 'INTL'] as const).map((r) => (
            <button key={r} type="button" onClick={() => switchRegion(r)}
              className={`px-3 py-2 rounded-lg text-[11px] font-black min-h-[44px] ${region === r ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'}`}>
              {r === 'BD' ? t('solo.wallet.regionBD') : r === 'IN' ? t('solo.wallet.regionIN') : t('solo.wallet.regionINTL')}
            </button>
          ))}
        </div>
        <Field label={t('solo.wallet.amountRange').replace('{min}', fmtWallet(limits.min, currency)).replace('{max}', fmtWallet(limits.max, currency))}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-stone-500">{sym}</span>
            <input
              type="number" min={limits.min} max={limits.max}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className={`${inputCls} pl-8`} placeholder={String(limits.min)}
            />
          </div>
        </Field>
        {amount && (amt < limits.min || amt > limits.max) && (
          <p className="text-[11px] text-red-600 font-bold -mt-2 mb-2">
            {t('solo.wallet.amountBetween').replace('{min}', fmtWallet(limits.min, currency)).replace('{max}', fmtWallet(limits.max, currency))}
          </p>
        )}
        <Field label={t('solo.wallet.paymentMethod')}>
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
      </Card>

      {method && amt >= limits.min && amt <= limits.max && (
        <Card className="bg-amber-50/60 border-amber-200">
          <p className="text-xs font-black text-amber-900 mb-2">{t('solo.wallet.howToPay').replace('{label}', method.label)}</p>

          <div className="flex items-center justify-between bg-white rounded-xl border border-amber-200 px-3 py-2 mb-2">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('solo.wallet.yourReference')}</p>
              <p className="font-mono font-black text-stone-900 tracking-wider">{reference}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => copy(reference, t('solo.wallet.copiedReference'))}
                className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('solo.wallet.copyReference')}>
                <Copy className="w-4 h-4 text-amber-700" />
              </button>
              <button type="button" onClick={regenerateRef}
                className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('solo.wallet.newReference')}>
                <RefreshCw className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          </div>

          <button type="button" onClick={() => copy(String(amt), t('solo.wallet.copiedAmount'))}
            className="w-full flex items-center justify-between bg-white rounded-xl border-2 border-amber-300 px-3 py-2.5 mb-2 min-h-[52px]">
            <div className="text-left">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('solo.wallet.sendExactly')}</p>
              <p className="font-black text-lg text-stone-900">{fmtWallet(amt, currency)}</p>
            </div>
            <Copy className="w-5 h-5 text-amber-600" />
          </button>
          <p className="text-[11px] font-bold text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mb-2">
            ⚠️ {t('solo.wallet.amountMustMatch').replace('{amount}', fmtWallet(amt, currency))}
          </p>

          {method.qrImageUrl && (
            <img src={method.qrImageUrl} alt={t('solo.wallet.paymentQr')} className="w-40 h-40 mx-auto rounded-xl border border-amber-200 mb-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          {method.number && (
            <button type="button" onClick={() => copy(method.number!, t('solo.wallet.copiedNumber'))} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-white rounded-xl border border-amber-200 min-h-[44px]">
              <span className="font-mono font-black text-stone-900">{method.number}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {method.upiId && (
            <button type="button" onClick={() => copy(method.upiId!, t('solo.wallet.copiedUpiId'))} className="flex items-center gap-2 mx-auto mb-2 px-3 py-2 bg-white rounded-xl border border-amber-200 min-h-[44px]">
              <span className="font-mono font-black text-stone-900">{method.upiId}</span><Copy className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {safeExternalUrl(method.link) && (
            <a href={safeExternalUrl(method.link)!} target="_blank" rel="noreferrer" className="block text-center text-xs font-black text-amber-700 underline mb-2 min-h-[44px] py-3">{t('solo.wallet.openMethod').replace('{label}', method.label)}</a>
          )}
          <ol className="text-[11px] text-amber-900 space-y-1 list-decimal list-inside">
            {method.instructionsEn.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <p className="text-[10px] text-stone-400 mt-2 text-center">
            {t('solo.wallet.includeReferenceNote').replace('{reference}', reference)}{' '}
            {t('solo.wallet.requestExpires').replace('{hours}', String(TOPUP_EXPIRY_HOURS))}
          </p>
        </Card>
      )}

      <Card>
        <Field label={t('solo.wallet.trxIdLabel')}>
          <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls}
            placeholder={t('solo.wallet.trxIdHint')} />
          <p className="text-[10px] text-stone-400 mt-1">
            {amt > 0
              ? t('solo.wallet.trxIdMustMatchAmount').replace('{amount}', fmtWallet(amt, currency))
              : t('solo.wallet.trxIdEnterAmountFirst')}
          </p>
        </Field>
        <Btn variant="primary" className="w-full min-h-[48px]" disabled={working} onClick={submit}>
          {working ? t('solo.wallet.submitting') : t('solo.wallet.submitTopUp').replace('{reference}', reference)}
        </Btn>
        <p className="text-[10px] text-stone-400 mt-2 text-center">{t('solo.wallet.creditedNote')}</p>
      </Card>
    </div>
  );
};

/** Self-serve edit & resubmit for a pending top-up claim. */
const EditClaimModal: React.FC<{ claim: TopupClaim; onClose: () => void; onSaved: () => void }> = ({ claim, onClose, onSaved }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [trxId, setTrxId] = useState(claim.trxId);
  const [amount, setAmount] = useState(String(claim.amount));
  const [screenshotUrl, setScreenshotUrl] = useState(claim.screenshotUrl || '');
  const [working, setWorking] = useState(false);
  const limits = TOPUP_LIMITS[claim.currency];
  const sym = CURRENCY_SYMBOL[claim.currency];

  const save = async () => {
    setWorking(true);
    try {
      await updateTopupClaim(claim.id!, {
        trxId: trxId.trim(),
        amount: Math.round(Number(amount)),
        screenshotUrl: screenshotUrl.trim(),
      });
      showToast(t('solo.wallet.topUpUpdated'), 'success');
      onSaved();
    } catch (e: any) { showToast(e.message || t('solo.wallet.updateFailed'), 'error'); }
    setWorking(false);
  };

  return (
    <Modal title={t('solo.wallet.topupHistory')} onClose={onClose}>
      <p className="text-sm font-black text-stone-900 mb-1">{t('solo.wallet.editTopUp')}</p>
      <p className="text-[11px] text-stone-500 mb-3 font-mono">{claim.reference || ''} · {fmtWallet(claim.amount, claim.currency)}</p>
      <div className="space-y-3">
        <Field label={t('solo.wallet.amountRange').replace('{min}', fmtWallet(limits.min, claim.currency)).replace('{max}', fmtWallet(limits.max, claim.currency))}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-stone-500">{sym}</span>
            <input type="number" min={limits.min} max={limits.max} value={amount}
              onChange={(e) => setAmount(e.target.value)} className={`${inputCls} pl-8`} />
          </div>
        </Field>
        <Field label={t('solo.wallet.trxIdLabelShort')}>
          <input value={trxId} onChange={(e) => setTrxId(e.target.value)} className={inputCls}
            placeholder={t('solo.wallet.correctTrxId')} />
        </Field>
        <Field label={t('solo.wallet.screenshotUrl')}>
          <input value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} className={inputCls}
            placeholder="https://…" />
        </Field>
        <div className="flex gap-2">
          <Btn variant="ghost" className="flex-1" onClick={onClose}>{t('common.cancel')}</Btn>
          <Btn variant="primary" className="flex-1" disabled={working} onClick={save}>
            {working ? t('solo.wallet.saving') : t('solo.wallet.resubmit')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export const WalletTab: React.FC = () => {
  const { showToast } = useToast();
  const { currentLang, t } = useLanguage();
  const { activeWorkspace, firebaseUser } = useAuthWorkspace();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [claims, setClaims] = useState<TopupClaim[]>([]);
  const [region, setRegion] = useState<PayRegion>('BD');
  const [topping, setTopping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingClaim, setEditingClaim] = useState<TopupClaim | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  // Quick Guide: the two-wallet explainer (Seva Wallet vs personal P2P
  // ledger) — invitational pill, never auto-playing on this money screen.
  const walletGuide = useGuide('wallet', uid);
  // Balance privacy — inline eye toggle (Revolut heuristic: never bury in
  // settings). Persisted per device so the choice survives reloads.
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return window.localStorage.getItem('sb_wallet_hidden') === '1'; } catch { return false; }
  });
  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    try { window.localStorage.setItem('sb_wallet_hidden', next ? '1' : '0'); } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureWallet().catch(() => {});
      const [w, t, c, r] = await Promise.all([getWallet(), getTransactions(), myTopupClaims(), detectPayRegion().catch(() => 'BD' as PayRegion)]);
      setWallet(w); setTxns(t); setClaims(c); setRegion(r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // PayRegion is string-typed (config-driven); currencyForRegion needs the
  // known literal union. Narrow honestly — unknown regions fall back to 'BD'.
  const regionForCurrency = region === 'IN' || region === 'INTL' ? region : 'BD';
  // Currency precedence (fixes the "$0"-in-INR-context first-paint bug):
  // an active wallet's stored currency always wins; a fresh/zero-activity
  // wallet inherits the WORKSPACE currency — never the geo fallback, which
  // resolves INTL→USD in environments without real geolocation.
  const workspaceCurrency: WalletCurrency | null = (() => {
    const c = String((activeWorkspace as { currency?: string } | null)?.currency || '').toUpperCase();
    return c === 'INR' || c === 'BDT' || c === 'USD' ? (c as WalletCurrency) : null;
  })();
  const hasActivity =
    !!wallet &&
    (wallet.balance + wallet.totalToppedUp + wallet.totalReceived > 0 || claims.length > 0);
  const currency: WalletCurrency =
    hasActivity && wallet ? wallet.currency : workspaceCurrency || currencyForRegion(regionForCurrency);

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (topping) {
    return <TopupFlow currency={currency} onBack={() => setTopping(false)} onDone={() => { setTopping(false); load(); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end -mb-1 pr-2 pt-1">
        <TourLink guide={GUIDES.wallet} onRestart={walletGuide.restart} />
      </div>
      <div data-guide-anchor="wallet-seva">
      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{mkt(L, 'sevaWallet')}</p>
            <div className="flex items-center gap-2 mt-1">
              {/* One Big Number — 30px semibold; skeleton while loading so a
                  wrong currency never flashes on first paint. */}
              {loading ? (
                <div className="h-9 w-36 rounded-lg bg-white/25 animate-pulse" aria-hidden />
              ) : (
                <p className="text-[30px] leading-9 font-semibold tabular-nums">
                  {hidden ? '••••••' : fmtWallet(wallet?.balance || 0, currency)}
                </p>
              )}
              <button
                type="button"
                onClick={toggleHidden}
                aria-label={hidden ? mkt(L, 'showBalance') : mkt(L, 'hideBalance')}
                title={hidden ? mkt(L, 'showBalance') : mkt(L, 'hideBalance')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-white/70 mt-1">
              {mkt(L, 'dakshinaBalance')}: {loading ? '…' : hidden ? '••••' : fmtWallet(wallet?.balance || 0, currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            aria-label={t('solo.wallet.refresh')}
            className="min-h-[48px] px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Quick actions — the four daily money moves, one row, ≥44px targets */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {(
            [
              { id: 'topup', icon: Plus, label: mkt(L, 'quickTopUp'), fn: () => setTopping(true) },
              // 🪔 Give opens the express dana sheet. P2P obligations never
              // appear in this tab (two-wallet boundary) — they live only in
              // their own "🤝 My obligations" card on Home.
              { id: 'give', icon: HandHeart, label: mkt(L, 'quickGive'), fn: () => openDanaSheet({}) },
              { id: 'scan', icon: ScanLine, label: mkt(L, 'quickScan'), fn: () => setScanOpen(true) },
              { id: 'history', icon: History, label: mkt(L, 'quickHistory'), fn: scrollToHistory },
            ] as const
          ).map(({ id, icon: Icon, label, fn }) => (
            <button
              key={id}
              type="button"
              onClick={fn}
              className="min-h-[64px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </Card>
      </div>

      {/* Payment identity (discoverability fix #14): the spoken ID belongs in
          the Wallet — claiming still happens in exactly one place (Profile). */}
      <WalletVdaCard />

      {claims.filter((c) => claimDisplayStatus(c) === 'pending' || claimDisplayStatus(c) === 'expired').length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> {t('solo.wallet.topUpRequests')}</p>
          {claims.filter((c) => claimDisplayStatus(c) === 'pending' || claimDisplayStatus(c) === 'expired').map((c) => {
            const ds = claimDisplayStatus(c);
            const expired = ds === 'expired';
            return (
              <div key={c.id} className="py-2.5 border-t border-amber-100 first:border-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-stone-800">{fmtWallet(c.amount, c.currency)}</p>
                    <p className="text-[10px] text-stone-500 font-mono">{c.reference || '—'} · TrxID {maskTrxId(c.trxId)}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${expired ? 'bg-stone-200 text-stone-600' : 'bg-amber-200 text-amber-800'}`}>
                    {expired ? t('solo.wallet.expired') : t('solo.wallet.pending')}
                  </span>
                </div>
                {!expired && (
                  <button type="button" onClick={() => setEditingClaim(c)}
                    className="mt-1.5 text-[11px] font-bold text-amber-700 underline underline-offset-2 min-h-[32px]">
                    {t('solo.wallet.editResubmit')}
                  </button>
                )}
                {expired && (
                  <p className="text-[10px] text-stone-400 mt-1">{t('solo.wallet.expiredNote').replace('{hours}', String(TOPUP_EXPIRY_HOURS))}</p>
                )}
              </div>
            );
          })}
        </Card>
      )}
      {claims.filter((c) => c.status === 'rejected').length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <p className="text-xs font-black text-red-900 mb-1 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> {t('solo.wallet.rejectedTopUps')}</p>
          {claims.filter((c) => c.status === 'rejected').slice(0, 3).map((c) => (
            <div key={c.id} className="py-1.5 border-t border-red-100 first:border-0">
              <p className="text-[11px] font-bold text-red-800">{fmtWallet(c.amount, c.currency)} <span className="font-mono font-normal text-red-600">{c.reference || ''}</span></p>
              <p className="text-[10px] text-red-600">{c.rejectionReason || t('solo.wallet.notVerified')}</p>
            </div>
          ))}
        </Card>
      )}

      <div ref={historyRef} className="scroll-mt-4">
      <Card>
        <p className="text-xs font-black text-stone-800 mb-2 uppercase tracking-widest">{t('solo.wallet.history')}</p>
        {txns.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3" aria-hidden>🪔</div>
            <p className="text-sm font-bold text-stone-700">{mkt(L, 'walletEmptyTitle')}</p>
            <p className="text-xs text-stone-500 mt-1">{mkt(L, 'walletEmptySub')}</p>
            <button
              type="button"
              onClick={() => setTopping(true)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-black shadow-sm"
            >
              <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {mkt(L, 'quickTopUp')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {txns.map((txn) => (
              <div key={txn.id} className="flex items-center gap-2.5 py-2.5">
                <TxnIcon type={txn.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-800 truncate">{TXN_LABEL_KEY[txn.type] ? t(TXN_LABEL_KEY[txn.type]) : txn.type}{txn.note ? ` · ${txn.note}` : ''}</p>
                  <p className="text-[10px] text-stone-400">{txn.topupClaimId ? t('solo.wallet.topupClaimLabel') : txn.orderId ? t('solo.wallet.orderLabel').replace('{id}', String(txn.orderId).slice(0, 8)) : ''}</p>
                </div>
                <p className={`text-xs font-black ${txn.type === 'spend' || txn.type === 'commission' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {txn.type === 'spend' || txn.type === 'commission' ? '−' : '+'}{fmtWallet(txn.amount, (txn.currency as WalletCurrency) || currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>

      {editingClaim && (
        <EditClaimModal
          claim={editingClaim}
          onClose={() => setEditingClaim(null)}
          onSaved={() => { setEditingClaim(null); load(); }}
        />
      )}

      {/* Scan — Sanatani Bandhan payment codes (SB-P2P). */}
      {scanOpen && (
        <P2PScanSheet
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          currentUser={{
            uid,
            displayName:
              (firebaseUser as { displayName?: string } | null)?.displayName ||
              undefined,
            photoUrl:
              (firebaseUser as { photoURL?: string } | null)?.photoURL ||
              undefined,
          }}
        />
      )}

      {/* Quick Guide: the two-wallet explainer — invitational only. */}
      {walletGuide.pillVisible && (
        <TourPill guide={GUIDES.wallet} uid={uid} onStart={walletGuide.start} onDismiss={walletGuide.dismissPill} />
      )}
      {walletGuide.tourActive && <CoachMark guide={GUIDES.wallet} onFinish={walletGuide.finish} />}
    </div>
  );
};
