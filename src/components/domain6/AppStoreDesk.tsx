/**
 * Plan & Add-ons (formerly the App Store desk) — module-system
 * redesign, 2026-10-23.
 * ============================================================================
 * The store is GONE as a module shop: nothing is installed any more
 * (workspaceRegistry.isModuleAllowed no longer gates on
 * enabledModules), so there is nothing to browse, install or
 * uninstall here. What remains is what a plan surface honestly is:
 *
 *   · your current plan, named exactly as the plan system names it;
 *   · your usage against that plan's caps — real counts from the
 *     caller's own data paths (devotee total via the probed server
 *     count when available, this month's treasury entries from the
 *     loaded ledger, member seats), labelled when a figure comes
 *     from a partial window;
 *   · the plan comparison (Seva / Standard / Premium) with regional
 *     prices from config/planPricing — plans differ ONLY in usage
 *     caps; every desk is included in every plan;
 *   · the one true add-on: Purohit / Jyotishi Pro for individual
 *     professionals.
 *
 * Upgrades open the existing plan-upgrade flow (openPlanUpgrade) —
 * the same surface the Sidebar's plan locks use. Discovery lives in
 * the All-Desks Directory now (components/dashboard/DeskDirectory).
 *
 * i18n: chrome via t('suites.seva.appstore.*') — the header keys keep
 * their names; their values now say "Plan & Add-ons".
 */
import React, { useMemo } from 'react';
import { Layers as Blocks, CheckCircle2, Sparkles, ArrowUpRight, Crown } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  PLAN_PRICING,
  type SubscriptionTier,
  type TierPricingConfig,
} from '../../config/planPricing';
import { normalizePlanId } from '../../lib/planLimits';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';

const TIER_ORDER: SubscriptionTier[] = ['SEVA', 'STANDARD', 'PREMIUM'];
const TIER_LEVEL: Record<string, number> = { seva: 0, standard: 1, premium: 2 };

/** Regional price for the workspace's currency (INR fallback). */
function regionalPrice(cfg: TierPricingConfig, currency?: string) {
  const cur = (currency || 'INR').toUpperCase();
  if (cur === 'BDT') return { ...cfg.regionalPrices.bdt, symbol: '৳' };
  if (cur === 'USD') return { ...cfg.regionalPrices.usd, symbol: '$' };
  return { ...cfg.regionalPrices.inr, symbol: '₹' };
}

function UsageMeter({
  label,
  value,
  cap,
  capText,
  partial,
  partialText,
}: {
  label: string;
  value: number;
  cap: number; // -1 = unlimited
  capText: string;
  partial?: boolean;
  partialText: string;
}) {
  const pct = cap > 0 ? Math.min(100, Math.round((value / cap) * 100)) : 0;
  const hot = cap > 0 && pct >= 80;
  return (
    <div className="rounded-2xl border border-temple-800 bg-temple-900 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-temple-400">
          {label}
        </p>
        {partial && (
          <span className="text-[9px] font-bold text-temple-500 bg-temple-800 px-1.5 py-0.5 rounded">
            {partialText}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-black text-white">
        {value.toLocaleString('en-IN')}
        <span className="ml-2 text-xs font-bold text-temple-400">{capText}</span>
      </p>
      {cap > 0 && (
        <div className="mt-3 h-2 rounded-full bg-temple-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${hot ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export const AppStoreDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { orgMembers } = useMembership();
  const { t } = useLanguage();
  const { devotees, treasury, collectionWindows } = useData();

  const canonical = normalizePlanId(activeWorkspace?.planId);
  const isDemo = canonical === 'demo';
  // Demo workspaces run on the premium caps (the demo quota governs).
  const currentTier: SubscriptionTier = isDemo
    ? 'PREMIUM'
    : ((canonical.toUpperCase() as SubscriptionTier) || 'SEVA');
  const currentCfg = PLAN_PRICING[currentTier];
  const currency = (activeWorkspace as any)?.currency as string | undefined;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const txnsThisMonth = useMemo(
    () => treasury.filter((tx) => (tx.date || '').slice(0, 7) === monthPrefix).length,
    [treasury, monthPrefix]
  );
  const devoteeTotal = collectionWindows?.devotees?.total ?? devotees.length;
  const devoteePartial =
    collectionWindows?.devotees?.total == null && !!(collectionWindows as any)?.devotees?.windowed;
  const treasuryWindowed = !!(collectionWindows as any)?.treasury?.windowed;

  if (!activeWorkspace) return null;

  const capText = (cap: number) =>
    cap < 0
      ? t('suites.seva.appstore.plan.unlimited')
      : `${t('suites.seva.appstore.plan.ofCap').replace('{cap}', cap.toLocaleString('en-IN'))}`;

  return (
    <div className="flex flex-col h-full bg-temple-950 text-temple-200">
      {/* Header */}
      <div className="shrink-0 border-b border-temple-800 bg-temple-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles size={12} /> {t('suites.seva.appstore.header.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Blocks className="w-8 h-8 text-indigo-500" />
            {t('suites.seva.appstore.header.title')}
          </h1>
          <p className="text-sm text-temple-400 mt-2 font-medium max-w-2xl leading-relaxed">
            {t('suites.seva.appstore.header.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-10">
        {isDemo && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-200">
            {t('suites.seva.appstore.plan.demoNote')}
          </div>
        )}

        {/* Current plan + usage */}
        <section aria-label={t('suites.seva.appstore.plan.currentPlan')}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-black text-white">
              {t('suites.seva.appstore.plan.currentPlan')}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black">
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              {currentCfg.name}
            </span>
            <div className="h-px bg-temple-800 flex-1"></div>
          </div>

          <h3 className="text-xs font-black uppercase tracking-widest text-temple-400 mb-3">
            {t('suites.seva.appstore.plan.usageTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageMeter
              label={t('suites.seva.appstore.plan.devotees')}
              value={devoteeTotal}
              cap={currentCfg.limits.devotees}
              capText={capText(currentCfg.limits.devotees)}
              partial={devoteePartial}
              partialText={t('suites.seva.appstore.plan.loadedWindow')}
            />
            <UsageMeter
              label={t('suites.seva.appstore.plan.txnsMonth')}
              value={txnsThisMonth}
              cap={currentCfg.limits.transactions}
              capText={capText(currentCfg.limits.transactions)}
              partial={treasuryWindowed}
              partialText={t('suites.seva.appstore.plan.loadedWindow')}
            />
            <UsageMeter
              label={t('suites.seva.appstore.plan.seats')}
              value={orgMembers.length}
              cap={currentCfg.limits.adminSeats}
              capText={capText(currentCfg.limits.adminSeats)}
              partialText={t('suites.seva.appstore.plan.loadedWindow')}
            />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-temple-500 max-w-2xl">
            {t('suites.seva.appstore.plan.includedNote')}
          </p>
        </section>

        {/* Plan comparison */}
        <section aria-label={t('suites.seva.appstore.plan.compareTitle')}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-black text-white">
              {t('suites.seva.appstore.plan.compareTitle')}
            </h2>
            <div className="h-px bg-temple-800 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIER_ORDER.map((tier) => {
              const cfg = PLAN_PRICING[tier];
              const price = regionalPrice(cfg, currency);
              const isCurrent = !isDemo && tier === currentTier;
              const isUpgrade =
                isDemo || TIER_LEVEL[tier.toLowerCase()] > TIER_LEVEL[canonical];
              return (
                <div
                  key={tier}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    isCurrent
                      ? 'border-indigo-500/50 bg-indigo-500/5'
                      : 'border-temple-800 bg-temple-900'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[9px] font-black uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      {t('suites.seva.appstore.plan.currentBadge')}
                    </span>
                  )}
                  <h3 className="font-black text-white text-lg">{cfg.name}</h3>
                  <p className="text-xs text-temple-400 mt-1 leading-relaxed">{cfg.tagline}</p>
                  <p className="mt-4 text-3xl font-black text-white">
                    {price.symbol}
                    {price.monthly.toLocaleString('en-IN')}
                    <span className="text-xs font-bold text-temple-400">
                      {' '}
                      / {t('suites.seva.appstore.plan.perMonth')}
                    </span>
                  </p>
                  <p className="text-[11px] text-temple-500 mt-1">
                    {price.symbol}
                    {price.annual.toLocaleString('en-IN')} / {t('suites.seva.appstore.plan.perYear')}
                  </p>
                  <ul className="mt-5 space-y-2 flex-1">
                    {cfg.highlightedPerks.slice(0, 4).map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-xs text-temple-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  {isUpgrade && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => openPlanUpgrade(tier)}
                      className="mt-6 w-full min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowUpRight size={16} aria-hidden="true" />
                      {t('suites.seva.appstore.plan.upgrade')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* The one true add-on: Purohit / Jyotishi Pro */}
          <div className="mt-5 rounded-2xl border border-saffron-500/30 bg-gradient-to-r from-saffron-500/10 via-temple-900 to-temple-900 p-6 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <h3 className="font-black text-white">{PLAN_PRICING.PUROHIT_PRO.name}</h3>
              <p className="text-xs text-temple-400 mt-1 leading-relaxed max-w-xl">
                {PLAN_PRICING.PUROHIT_PRO.tagline}
              </p>
              <p className="mt-3 text-2xl font-black text-white">
                {regionalPrice(PLAN_PRICING.PUROHIT_PRO, currency).symbol}
                {regionalPrice(PLAN_PRICING.PUROHIT_PRO, currency).monthly.toLocaleString('en-IN')}
                <span className="text-xs font-bold text-temple-400">
                  {' '}
                  / {t('suites.seva.appstore.plan.perMonth')}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPlanUpgrade('PUROHIT_PRO')}
              className="min-h-[44px] px-6 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow cursor-pointer shrink-0"
            >
              <ArrowUpRight size={16} aria-hidden="true" />
              {t('suites.seva.appstore.plan.upgrade')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppStoreDesk;
