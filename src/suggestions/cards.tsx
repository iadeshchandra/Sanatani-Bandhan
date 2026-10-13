/**
 * Seva Suggestions — suggestion & upsell cards.
 * ============================================================================
 * Dismissible, never modals. One-tap enable. Locale-driven (English default).
 */
import React from 'react';
import { X, Download, Sparkles, ArrowRight } from 'lucide-react';
import { MODULE_CATALOG } from '../components/common/Sidebar';
import { useLanguage } from '../context/LanguageContext';
import { getModuleCopy } from './moduleCopy';
import { localizeText, type LocalizedText } from './recommend';
import type { PendingSuggestion } from './store';

function useTr() {
  const { currentLang } = useLanguage();
  const lang = (currentLang || 'en').toLowerCase();
  return (t: LocalizedText): string => localizeText(t, lang);
}

function moduleMeta(moduleId: string) {
  const found = MODULE_CATALOG.find((m) => m.id === moduleId);
  return {
    name: found?.name || moduleId,
    Icon: found?.icon || Sparkles,
  };
}

/** Localised one-line outcome copy for a module. */
export function ModuleTagline({ moduleId, className = '' }: { moduleId: string; className?: string }) {
  const { currentLang } = useLanguage();
  return <span className={className}>{getModuleCopy(moduleId, currentLang)}</span>;
}

interface SuggestionCardProps {
  suggestion: PendingSuggestion;
  onEnable: (moduleId: string) => void;
  onDismiss: (key: string) => void;
}

/** Contextual suggestion card — fired by triggers, rendered in-desk. Never a modal. */
export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onEnable, onDismiss }) => {
  const tr = useTr();
  const { name, Icon } = moduleMeta(suggestion.moduleId);
  const { currentLang } = useLanguage();

  return (
    <div
      role="note"
      aria-label={`Suggestion: ${name}`}
      className="relative overflow-hidden rounded-2xl border border-saffron-500/30 bg-gradient-to-r from-saffron-500/10 via-temple-900 to-temple-900 p-4 sm:p-5 shadow-lg"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-saffron-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-saffron-400 mb-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            {tr({ en: 'Suggested for you', hi: 'आपके लिए सुझाव', bn: 'আপনার জন্য পরামর্শ' })}
          </p>
          <h4 className="font-bold text-temple-100 text-sm leading-snug">{name}</h4>
          <p className="text-xs text-temple-400 leading-relaxed mt-1">{tr(suggestion.reason)}</p>
          <p className="text-[11px] text-temple-500 leading-relaxed mt-1.5 italic">
            {getModuleCopy(suggestion.moduleId, currentLang)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => onEnable(suggestion.moduleId)}
              className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {tr({ en: 'Enable', hi: 'चालू करें', bn: 'চালু করুন' })}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(suggestion.key)}
              className="px-3 py-2 rounded-xl text-[11px] font-semibold text-temple-500 hover:text-temple-300 hover:bg-temple-800/60 transition-all min-h-[36px]"
            >
              {tr({ en: 'Not now', hi: 'अभी नहीं', bn: 'এখন নয়' })}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(suggestion.key)}
          aria-label={tr({ en: 'Dismiss suggestion', hi: 'सुझाव हटाएं', bn: 'পরামর্শ বাতিল করুন' })}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-temple-500 hover:text-temple-200 hover:bg-temple-800/70 transition-all"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

interface ModuleUpsellCardProps {
  moduleId: string;
  onEnable: (moduleId: string) => void;
  /** Compact variant for toolbars; full variant for empty states. */
  compact?: boolean;
}

/**
 * In-context empty state: where an uninstalled module would plug in, render
 * this instead of dead UI or a redirect to the store. One-tap enable.
 */
export const ModuleUpsellCard: React.FC<ModuleUpsellCardProps> = ({ moduleId, onEnable, compact = false }) => {
  const tr = useTr();
  const { name, Icon } = moduleMeta(moduleId);
  const { currentLang } = useLanguage();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onEnable(moduleId)}
        className="px-3.5 py-2.5 rounded-xl bg-saffron-500/10 hover:bg-saffron-500/20 border border-dashed border-saffron-500/40 text-saffron-300 hover:text-saffron-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        title={getModuleCopy(moduleId, currentLang)}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span>
          {tr({ en: `Enable ${name}`, hi: `${name} चालू करें`, bn: `${name} চালু করুন` })}
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
        {tr({ en: 'Available module', hi: 'उपलब्ध मॉड्यूल', bn: 'উপলব্ধ মডিউল' })}
      </p>
      <h3 className="text-lg font-black text-temple-100">{name}</h3>
      <p className="text-sm text-temple-400 leading-relaxed mt-2 max-w-md mx-auto">
        {getModuleCopy(moduleId, currentLang)}
      </p>
      <button
        type="button"
        onClick={() => onEnable(moduleId)}
        className="mt-5 px-6 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow min-h-[44px]"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        {tr({ en: `Enable ${name}`, hi: `${name} चालू करें`, bn: `${name} চালু করুন` })}
      </button>
    </div>
  );
};
