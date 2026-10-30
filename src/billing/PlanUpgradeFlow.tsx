/**
 * billing/PlanUpgradeFlow.tsx — self-serve plan upgrades.
 * ========================================================================
 * The missing link between "I want to pay" and revenue. Three steps:
 *   1. Choose plan (Standard / Premium / Purohit-Pro, monthly/annual, geo pricing)
 *   2. Pay (geo-aware instructions from the owner-configured paymentMethods)
 *   3. Confirm (TrxID + amount → paymentClaims → owner approves → plan activates)
 *
 * Rendered as a modal (createPortal). Open via <PlanUpgradeFlowTrigger /> or
 * the exported `openPlanUpgrade()` event.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ChevronLeft, ChevronRight, BadgeCheck, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { friendlyErrorText } from '../lib/friendlyError';
import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';
import { getTerms, getTermsSync, planIdForTier } from '../lib/termsConfig';
import { detectPayRegion } from '../lib/geoDetect';
import {
  UPGRADEABLE_TIERS, planPrice, formatPrice, validateClaim, hasDuplicatePendingClaim,
  buildClaimDoc, methodsForRegion, methodInstructions,
  type BillingPeriod, type ClaimDraft, type PaymentMethodInfo,
} from './planUpgrade';
import { pu } from './i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a tier (e.g. from an upsell CTA). */
  initialTier?: SubscriptionTier;
}

const TIER_ORDER: SubscriptionTier[] = ['STANDARD', 'PREMIUM', 'PUROHIT_PRO'];

export const PlanUpgradeFlow: React.FC<Props> = ({ isOpen, onClose, initialTier }) => {
  const { firebaseUser, activeWorkspace, activeWorkspaceId } = useAuthWorkspace();
  const { currentLang } = useLanguage();
  const lang = currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';

  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState<BillingPeriod>('annual');
  const [tier, setTier] = useState<SubscriptionTier>(initialTier || 'STANDARD');
  const [region, setRegion] = useState<string>('INTL');
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [draft, setDraft] = useState<ClaimDraft>({
    plan: initialTier || 'STANDARD', period: 'annual', method: '',
    transactionId: '', amount: 0, currency: 'USD', senderInfo: '', notes: '',
  });
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  // QUEUED #31: bumped when the Firestore terms land, so every price in
  // this flow re-reads the owner's current terms (config-first checkout).
  const [termsTick, setTermsTick] = useState(0);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0); setDone(false); setTriedSubmit(false);
      setSubmitError(null); setDuplicateWarning(false);
      const t = initialTier || 'STANDARD';
      setTier(t);
      setDraft((d) => ({ ...d, plan: t, period, transactionId: '', amount: 0, method: '', senderInfo: '', notes: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Geo region + payment methods
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingMethods(true);
      try {
        const phone = (firebaseUser as unknown as { phoneNumber?: string } | null)?.phoneNumber || null;
        const r = await detectPayRegion(phone);
        setRegion(r);
        const snap = await getDocs(collection(db, 'paymentMethods'));
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PaymentMethodInfo[];
        setMethods(methodsForRegion(all, r));
      } catch {
        setMethods([]);
      } finally {
        setLoadingMethods(false);
      }
    })();
  }, [isOpen, firebaseUser]);

  // Warm the terms cache whenever the flow opens (config-first pricing).
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    getTerms().then(() => { if (alive) setTermsTick((n) => n + 1); }).catch(() => { /* defaults already shown */ });
    return () => { alive = false; };
  }, [isOpen]);

  const price = useMemo(() => planPrice(tier, period, region), [tier, period, region, termsTick]);
  const validation = useMemo(() => validateClaim({ ...draft, plan: tier, period, currency: price.currency }, region), [draft, tier, period, price.currency, region]);
  const selectedMethod = useMemo(() => methods.find((m) => m.id === draft.method) || null, [methods, draft.method]);

  if (!isOpen) return null;

  const set = <K extends keyof ClaimDraft>(k: K, v: ClaimDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function handleSubmit() {
    setTriedSubmit(true);
    setSubmitError(null);
    if (!validation.ok) return;
    const uid = (firebaseUser as unknown as { uid?: string } | null)?.uid;
    if (!uid) { setSubmitError(pu('needLogin', lang)); return; }

    setSubmitting(true);
    try {
      // Duplicate guard: don't let users stack pending claims for the same plan.
      const q = query(
        collection(db, 'paymentClaims'),
        where('applicantUid', '==', uid),
        where('status', '==', 'pending'),
      );
      const snap = await getDocs(q);
      const existing = snap.docs.map((d) => d.data() as { plan: string; period: string; status: string });
      if (hasDuplicatePendingClaim(existing, tier, period)) {
        setDuplicateWarning(true);
        setSubmitting(false);
        return;
      }
      const wsName = (activeWorkspace as { name?: string } | null)?.name || 'Workspace';
      await addDoc(collection(db, 'paymentClaims'), {
        ...buildClaimDoc({ ...draft, plan: tier, period, currency: price.currency }, {
          applicantUid: uid,
          workspaceId: activeWorkspaceId || 'personal',
          workspaceName: wsName,
        }),
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      setSubmitError(friendlyErrorText(e, currentLang, 'save'));
    } finally {
      setSubmitting(false);
    }
  }

  function copyNumber(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const steps = [pu('stepPlan', lang), pu('stepPay', lang), pu('stepConfirm', lang)];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={pu('title', lang)}>
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 px-6 py-5 text-white shrink-0">
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold pr-10">{pu('title', lang)}</h2>
          <p className="text-white/85 text-sm mt-0.5">{pu('subtitle', lang)}</p>
          {/* Stepper */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-white text-orange-700' : 'bg-white/20 text-white/70'}`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i <= step ? 'text-white' : 'text-white/60'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-white' : 'bg-white/20'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{pu('successTitle', lang)}</h3>
              <p className="text-slate-600 text-sm mt-2 max-w-sm mx-auto">{pu('successBody', lang)}</p>
              <button onClick={onClose} className="mt-6 px-8 py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold">
                {pu('done', lang)}
              </button>
            </div>
          ) : step === 0 ? (
            <StepPlan tier={tier} setTier={(t) => { setTier(t); set('plan', t); }} period={period} setPeriod={(p) => { setPeriod(p); set('period', p); }} region={region} lang={lang} />
          ) : step === 1 ? (
            <StepPay methods={methods} loading={loadingMethods} selected={selectedMethod} onSelect={(id) => set('method', id)} price={price} lang={lang} copied={copied} onCopy={copyNumber} />
          ) : (
            <StepConfirm draft={draft} set={set} price={price} tier={tier} period={period} region={region} lang={lang}
              tried={triedSubmit} validation={validation} duplicateWarning={duplicateWarning}
              submitting={submitting} submitError={submitError} onSubmit={handleSubmit} />
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3 bg-slate-50">
            <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
              className="flex items-center gap-1.5 px-5 py-3 min-h-[44px] rounded-2xl text-slate-600 font-medium hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />{step === 0 ? pu('done', lang) : pu('back', lang)}
            </button>
            {step < 2 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedMethod}
                className="flex items-center gap-1.5 px-6 py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold disabled:opacity-40">
                {pu('continue', lang)}<ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

/* ---------------- Step 1: plan picker ---------------- */
function StepPlan({ tier, setTier, period, setPeriod, region, lang }: {
  tier: SubscriptionTier; setTier: (t: SubscriptionTier) => void;
  period: BillingPeriod; setPeriod: (p: BillingPeriod) => void;
  region: string; lang: string;
}) {
  return (
    <div>
      <div className="flex bg-slate-100 rounded-2xl p-1 mb-5 max-w-xs mx-auto">
        {(['monthly', 'annual'] as BillingPeriod[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${period === p ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
            {pu(p, lang)}{p === 'annual' && <span className="block text-[11px] font-normal text-emerald-600">{pu('annualSave', lang)}</span>}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {TIER_ORDER.map((t) => {
          const cfg = PLAN_PRICING[t];
          // Name + price are owner terms (#31); tagline/perks stay code copy.
          const planName = getTermsSync().plans[planIdForTier(t)].name || cfg.name;
          const pr = planPrice(t, period, region);
          const active = tier === t;
          return (
            <button key={t} onClick={() => setTier(t)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${active ? 'border-orange-500 bg-orange-50/60 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{planName}</span>
                    {cfg.badge && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{cfg.badge}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cfg.tagline}</p>
                  <ul className="mt-2 space-y-1">
                    {cfg.highlightedPerks.slice(0, 3).map((perk) => (
                      <li key={perk} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{perk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-slate-900">{formatPrice(pr.amount, pr.symbol)}</div>
                  <div className="text-[11px] text-slate-500">{period === 'monthly' ? pu('perMonth', lang) : pu('perYear', lang)}</div>
                  {period === 'annual' && <div className="text-[11px] text-slate-400">{pu('billedAnnually', lang)}</div>}
                </div>
              </div>
              <div className={`mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold ${active ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {active && <Check className="w-4 h-4" />}{active ? pu('currentPlan', lang) : pu('choosePlan', lang)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Step 2: payment instructions ---------------- */
function StepPay({ methods, loading, selected, onSelect, price, lang, copied, onCopy }: {
  methods: PaymentMethodInfo[]; loading: boolean; selected: PaymentMethodInfo | null;
  onSelect: (id: string) => void; price: { amount: number; currency: string; symbol: string };
  lang: string; copied: boolean; onCopy: (t: string) => void;
}) {
  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>;
  }
  if (methods.length === 0) {
    return <p className="text-center text-slate-500 py-8">{pu('noMethods', lang)}</p>;
  }
  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center">
        <div className="text-sm text-slate-600">{pu('howToPay', lang)}</div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{formatPrice(price.amount, price.symbol)} <span className="text-sm font-normal text-slate-500">{price.currency}</span></div>
      </div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{pu('chooseMethod', lang)}</label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {methods.map((m) => (
          <button key={m.id} onClick={() => onSelect(m.id)}
            className={`py-3 px-3 min-h-[44px] rounded-2xl border-2 text-sm font-medium transition-all ${selected?.id === m.id ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">{pu('payInstructions', lang)}</div>
          {selected.qrImageUrl && (
            <img src={selected.qrImageUrl} alt="QR" className="w-40 h-40 mx-auto rounded-xl border border-slate-200 mb-3 object-contain bg-white" />
          )}
          {selected.number && (
            <button onClick={() => onCopy(selected.number!)}
              className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 font-mono font-bold text-slate-900 mb-3">
              {selected.number} {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          )}
          <ol className="space-y-1.5">
            {methodInstructions(selected, lang).map((line, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 3: confirm ---------------- */
function StepConfirm({ draft, set, price, tier, period, region, lang, tried, validation, duplicateWarning, submitting, submitError, onSubmit }: {
  draft: ClaimDraft; set: <K extends keyof ClaimDraft>(k: K, v: ClaimDraft[K]) => void;
  price: { amount: number; currency: string; symbol: string };
  tier: SubscriptionTier; period: BillingPeriod; region: string; lang: string;
  tried: boolean; validation: ReturnType<typeof validateClaim>;
  duplicateWarning: boolean; submitting: boolean; submitError: string | null;
  onSubmit: () => void;
}) {
  const field = "w-full px-4 py-3 min-h-[44px] rounded-2xl border-2 border-slate-200 focus:border-orange-500 outline-none text-slate-900";
  const err = "text-xs text-rose-600 mt-1";
  const cfg = PLAN_PRICING[tier];
  const planName = getTermsSync().plans[planIdForTier(tier)].name || cfg.name;
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-900">{planName}</div>
          <div className="text-xs text-slate-500">{period === 'monthly' ? pu('monthly', lang) : pu('annual', lang)} · {region.toUpperCase()}</div>
        </div>
        <div className="text-xl font-bold text-slate-900">{formatPrice(price.amount, price.symbol)}</div>
      </div>

      {duplicateWarning && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">{pu('duplicateClaim', lang)}</div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{pu('enterTrxId', lang)} *</label>
        <input value={draft.transactionId} onChange={(e) => set('transactionId', e.target.value)}
          placeholder={pu('trxIdPlaceholder', lang)} className={field} autoComplete="off" />
        {tried && validation.errors.transactionId && <p className={err}>{validation.errors.transactionId}</p>}
        <p className="text-[11px] text-slate-400 mt-1">{pu('trxIdHint', lang)}</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{pu('amountPaid', lang)} ({price.currency}) *</label>
        <input value={draft.amount || ''} onChange={(e) => set('amount', Number(e.target.value) || 0)}
          placeholder={String(price.amount)} inputMode="decimal" className={field} />
        {tried && validation.errors.amount && <p className={err}>{validation.errors.amount}</p>}
        {validation.amountMismatch && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2">
            {pu('amountMismatch', lang, { expected: formatPrice(validation.expectedAmount, price.symbol) })}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{pu('senderInfo', lang)}</label>
        <input value={draft.senderInfo} onChange={(e) => set('senderInfo', e.target.value)}
          placeholder={pu('senderPlaceholder', lang)} className={field} autoComplete="off" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{pu('notes', lang)}</label>
        <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={field} />
      </div>

      {submitError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl p-3">{submitError}</p>}

      <button onClick={onSubmit} disabled={submitting}
        className="w-full py-3.5 min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        {submitting ? pu('submitting', lang) : pu('submitClaim', lang)}
      </button>
    </div>
  );
}

/* ---------------- Trigger helper: open from anywhere ---------------- */
export const PLAN_UPGRADE_EVENT = 'sanatani:open-plan-upgrade';

export function openPlanUpgrade(tier?: SubscriptionTier) {
  window.dispatchEvent(new CustomEvent(PLAN_UPGRADE_EVENT, { detail: { tier } }));
}

/** Mount once (e.g. in App shell) to make openPlanUpgrade() work globally. */
export const PlanUpgradeHost: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier | undefined>(undefined);
  useEffect(() => {
    const h = (e: Event) => {
      setTier((e as CustomEvent).detail?.tier);
      setOpen(true);
    };
    window.addEventListener(PLAN_UPGRADE_EVENT, h);
    return () => window.removeEventListener(PLAN_UPGRADE_EVENT, h);
  }, []);
  return <PlanUpgradeFlow isOpen={open} onClose={() => setOpen(false)} initialTier={tier} />;
};
