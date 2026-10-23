import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  PRIVACY_NOTICE_SECTIONS,
  markPrivacySeen,
  privacyChangesSince,
  privacyPromptDue,
  privacySeenVersion,
  type TriText,
} from '../../lib/privacyNotice';
import {
  FIRST_RUN_DIALOGS_CHANGED,
  FIRST_RUN_PRIORITY,
  activeFirstRunDialog,
  releaseFirstRunDialog,
  requestFirstRunDialog,
} from '../../lib/firstRunDialogs';

const pick = (t: TriText, lang: string) => (lang === 'bn' ? t.bn : lang === 'hi' ? t.hi : t.en);

/**
 * PrivacyNotice — Blueprint D, deliverable 7: the short, warm,
 * genuinely-readable privacy notice (lib/privacyNotice), rendered
 * in the user's own language. Shown from Profile/Settings anytime
 * (always reachable), and as the one-time PrivacyNoticeGate when
 * the notice version is unseen.
 */
export const PrivacyNoticeBody: React.FC = () => {
  const { language } = useLanguage();
  return (
    <div className="space-y-5">
      {PRIVACY_NOTICE_SECTIONS.map((s) => (
        <section key={s.id}>
          <h4 className="text-sm font-black text-gray-900 mb-1">{pick(s.title, language)}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{pick(s.body, language)}</p>
        </section>
      ))}
    </div>
  );
};

export const PrivacyNoticeCard: React.FC = () => {
  const { safeTranslate } = useLanguage();
  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4 uppercase tracking-widest">
        <ShieldCheck size={18} className="text-emerald-600" />
        {safeTranslate('privacy_card_title', 'Your Privacy, in Plain Words', 'আপনার গোপনীয়তা, সহজ ভাষায়', 'आपकी गोपनीयता, सरल शब्दों में')}
      </h3>
      <PrivacyNoticeBody />
    </div>
  );
};

/**
 * PrivacyNoticeGate — the one-time consent check. When the signed-in
 * user has not seen the current notice version, this calm modal
 * shows the notice once — with the "what changed" lines when their
 * seen version is older — and marks it seen on acknowledgement.
 * "Not now" closes it WITHOUT marking (it will return on a later
 * visit, and the notice stays reachable from Profile/Settings):
 * no pre-ticked boxes, no reject-punishment, no theatre.
 */
export const PrivacyNoticeGate: React.FC = () => {
  const { user } = useAuthWorkspace();
  const { language, safeTranslate } = useLanguage();
  const [open, setOpen] = useState(false);
  const [turn, setTurn] = useState<string | null>(null);
  const [seenAtOpen, setSeenAtOpen] = useState(0);

  // UIUX Batch 4 (D-16): first-run dialogs never stack. The gate holds
  // a turn in the shared first-run queue (privacy first) and renders
  // only on its turn; every close path releases the turn so the next
  // waiting surface (language welcome, guided tour) can appear.
  useEffect(() => {
    if (!user?.uid) return;
    if (privacyPromptDue(user.uid)) {
      setSeenAtOpen(privacySeenVersion(user.uid));
      setOpen(true);
      setTurn(requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy));
    } else {
      setOpen(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => setTurn(activeFirstRunDialog());
    window.addEventListener(FIRST_RUN_DIALOGS_CHANGED, onChange);
    return () => window.removeEventListener(FIRST_RUN_DIALOGS_CHANGED, onChange);
  }, [open ]);

  if (!open || !user?.uid || turn !== 'privacy-notice') return null;
  const changes = privacyChangesSince(seenAtOpen);
  const isFirst = seenAtOpen === 0;

  const close = () => {
    releaseFirstRunDialog('privacy-notice');
    setOpen(false);
  };

  const acknowledge = () => {
    markPrivacySeen(user.uid);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={safeTranslate('privacy_gate_title', 'Your privacy, in plain words', 'আপনার গোপনীয়তা, সহজ ভাষায়', 'आपकी गोपनीयता, सरल शब्दों में')}
    >
      <div className="bg-white w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 relative">
        <button
          type="button"
          onClick={close}
          aria-label={safeTranslate('privacy_not_now', 'Not now', 'এখন নয়', 'अभी नहीं')}
          className="absolute top-4 right-4 w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-2 mb-2 pr-10">
          <ShieldCheck className="text-emerald-600 shrink-0" />
          {isFirst
            ? safeTranslate('privacy_gate_title', 'Your privacy, in plain words', 'আপনার গোপনীয়তা, সহজ ভাষায়', 'आपकी गोपनीयता, सरल शब्दों में')
            : safeTranslate('privacy_gate_changed_title', 'Our privacy notice changed', 'আমাদের গোপনীয়তা নোটিশ বদলেছে', 'हमारी गोपनीयता सूचना बदली है')}
        </h3>
        {changes.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-5 space-y-1.5">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
              {safeTranslate('privacy_what_changed', 'What changed', 'যা বদলেছে', 'क्या बदला')}
            </p>
            {changes.map((c, i) => (
              <p key={i} className="text-xs text-emerald-900 leading-relaxed">
                {pick(c, language)}
              </p>
            ))}
          </div>
        )}
        <PrivacyNoticeBody />
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={acknowledge}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest min-h-[44px] transition-colors"
          >
            {safeTranslate('privacy_understand', 'I understand', 'আমি বুঝেছি', 'मैं समझ गया')}
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest min-h-[44px] transition-colors"
          >
            {safeTranslate('privacy_not_now', 'Not now', 'এখন নয়', 'अभी नहीं')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNoticeCard;
