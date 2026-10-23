/**
 * Seva Suggestions — suggestion & upsell cards.
 * ============================================================================
 * Dismissible, never modals. One-tap OPEN — since the 2026-10-23
 * module-system redesign nothing is "installed": acting on a card
 * records the adoption and opens the desk. Locale-driven via the
 * suites.seva dictionary (t('suites.seva.cards.*')); module names and
 * one-line copy resolve through getModuleName()/getModuleCopy().
 */
import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { MODULE_CATALOG } from '../components/common/Sidebar';
import { useLanguage } from '../context/LanguageContext';
import { getModuleCopy, getModuleName } from './moduleCopy';
import { localizeText } from './recommend';
import type { PendingSuggestion } from './store';

function moduleIcon(moduleId: string) {
  return MODULE_CATALOG.find((m) => m.id === moduleId)?.icon || Sparkles;
}

/** Localised one-line outcome copy for a module. */
export function ModuleTagline({ moduleId, className = '' }: { moduleId: string; className?: string }) {
  const { currentLang } = useLanguage();
  return <span className={className}>{getModuleCopy(moduleId, currentLang)}</span>;
}

interface SuggestionCardProps {
  suggestion: PendingSuggestion;
  onOpen: (moduleId: string) => void;
  onDismiss: (key: string) => void;
}

/**
 * Contextual suggestion card — fired by triggers, rendered in-desk.
 * Never a modal.
 *
 * Surface language (UX-proof residual fix, 2026-10-23): every host
 * renders this card on a LIGHT surface — the All-Desks Directory's
 * Suggested section, the Treasury desk, the Utsav desk — but the card
 * still wore the retired App Store's dark temple-900 gradient, so in
 * the directory it sat as a dark slab among the light recommendation
 * cards. It now speaks the directory's light language (white card,
 * slate text, orange action — the recommendation cards' exact
 * vocabulary), with 44px dismiss targets per the house law.
 */
export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onOpen, onDismiss }) => {
  const { t, currentLang } = useLanguage();
  const name = getModuleName(suggestion.moduleId, currentLang);
  const Icon = moduleIcon(suggestion.moduleId);

  return (
    <div
      role="note"
      aria-label={t('suites.seva.cards.suggestionLabel').replace('{name}', name)}
      className="relative overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50 to-white p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-orange-100/70 border border-orange-200 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-orange-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            {t('suites.seva.cards.suggestedForYou')}
          </p>
          <h4 className="font-bold text-slate-900 text-sm leading-snug">{name}</h4>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">{localizeText(suggestion.reason, currentLang)}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5 italic">
            {getModuleCopy(suggestion.moduleId, currentLang)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => onOpen(suggestion.moduleId)}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm min-h-[44px]"
            >
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              {t('suites.seva.cards.open')}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(suggestion.key)}
              className="px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all min-h-[44px]"
            >
              {t('suites.seva.cards.notNow')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(suggestion.key)}
          aria-label={t('suites.seva.cards.dismissSuggestion')}
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

interface ModuleUpsellCardProps {
  moduleId: string;
  onOpen: (moduleId: string) => void;
  /** Compact variant for toolbars; full variant for empty states. */
  compact?: boolean;
}

/**
 * In-context cross-link: where a related desk plugs in, render this
 * instead of dead UI. One-tap open — the desk is always present.
 */
export const ModuleUpsellCard: React.FC<ModuleUpsellCardProps> = ({ moduleId, onOpen, compact = false }) => {
  const { t, currentLang } = useLanguage();
  const name = getModuleName(moduleId, currentLang);
  const Icon = moduleIcon(moduleId);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onOpen(moduleId)}
        className="px-3.5 py-2.5 rounded-xl bg-saffron-500/10 hover:bg-saffron-500/20 border border-dashed border-saffron-500/40 text-saffron-700 hover:text-saffron-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
        title={getModuleCopy(moduleId, currentLang)}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span>
          {t('suites.seva.cards.openModule').replace('{name}', name)}
        </span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-saffron-500/30 bg-temple-900/60 p-6 sm:p-8 text-center max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-saffron-500/12 border border-saffron-500/25 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-saffron-400" aria-hidden="true" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-saffron-400 mb-2">
        {t('suites.seva.cards.availableModule')}
      </p>
      <h3 className="text-lg font-black text-temple-100">{name}</h3>
      <p className="text-sm text-temple-400 leading-relaxed mt-2 max-w-md mx-auto">
        {getModuleCopy(moduleId, currentLang)}
      </p>
      <button
        type="button"
        onClick={() => onOpen(moduleId)}
        className="mt-5 px-6 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow min-h-[44px]"
      >
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
        {t('suites.seva.cards.openModule').replace('{name}', name)}
      </button>
    </div>
  );
};
