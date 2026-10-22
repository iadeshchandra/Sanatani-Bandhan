import React from 'react';
import { Sprout } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { isPracticeModeOn } from '../../lib/practiceMode';

/**
 * PracticeBanner — Blueprint D: the persistent practice-mode banner.
 * While practice mode is on for this workspace, this band sits under
 * the org header on EVERY desk: the mode can never be forgotten
 * mid-session, and stopping it is one tap from anywhere. Renders
 * nothing when the mode is off.
 */
export const PracticeBanner: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  if (!isPracticeModeOn(activeWorkspace)) return null;
  return (
    <div className="shrink-0 bg-violet-600 text-white px-4 py-2.5" role="status">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <Sprout className="w-5 h-5 shrink-0" aria-hidden />
        <p className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
          {safeTranslate(
            'practice_banner',
            'Practising — nothing here is real. Entries are marked PRACTICE and never counted in any total.',
            'অনুশীলন চলছে — এখানে কিছুই আসল নয়। এন্ট্রিগুলো অনুশীলন চিহ্নিত এবং কোনো মোট অঙ্কে কখনো গণনা হয় না।',
            'अभ्यास चल रहा है — यहाँ कुछ भी वास्तविक नहीं है। प्रविष्टियाँ अभ्यास चिह्नित हैं और किसी योग में कभी नहीं गिनी जातीं।',
          )}
        </p>
        <button
          type="button"
          onClick={() => updateWorkspaceDetails({ practiceMode: false })}
          className="shrink-0 min-h-[44px] px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-black transition-colors"
        >
          {safeTranslate('practice_banner_stop', 'Stop practising', 'অনুশীলন শেষ করুন', 'अभ्यास समाप्त करें')}
        </button>
      </div>
    </div>
  );
};

export default PracticeBanner;
