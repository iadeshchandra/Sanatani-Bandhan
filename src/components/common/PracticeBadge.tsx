import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * PracticeBadge — Blueprint D: the "clearly marked as practice"
 * half of practice mode (lib/practiceMode). Rendered next to any
 * record minted while the workspace's practice mode was on
 * (`isPractice`), mirroring SampleBadge's visual language — amber,
 * small, unmissable — so a pretend record can never sit in a list
 * indistinguishable from a real one.
 */
export const PracticeBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { safeTranslate } = useLanguage();
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-violet-100 text-violet-800 border border-violet-300 align-middle ${className}`}
      title={safeTranslate(
        'practice_badge_tip',
        'Practice record — made while practice mode was on. It is not in any total and can be cleared anytime in Settings',
        'অনুশীলন রেকর্ড — অনুশীলন মোড চালু থাকাকালীন তৈরি। এটি কোনো মোট অঙ্কে নেই এবং সেটিংস থেকে যেকোনো সময় মোছা যাবে',
        'अभ्यास रिकॉर्ड — अभ्यास मोड चालू रहने पर बनाया गया। यह किसी योग में नहीं है और सेटिंग्स से कभी भी साफ़ किया जा सकता है',
      )}
    >
      {safeTranslate('practice_badge', 'Practice', 'অনুশীলন', 'अभ्यास')}
    </span>
  );
};

export default PracticeBadge;
