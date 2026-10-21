import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface SampleEraBarProps {
  /** How many identifiable sample-era rows remain. Bar hides at 0. */
  count: number;
  /** What the rows are, per language: e.g. ('milk rows', 'দুধের সারি', 'दूध पंक्तियाँ'). */
  nounEn: string;
  nounBn: string;
  nounHi: string;
  /** Remove exactly the identified rows (caller's provider remove loop). */
  onClear: () => void;
}

/**
 * SampleEraBar — QUEUED #59 (the #53 sample-era review): the in-desk
 * remedy for uid()-minted seed rows that seedPurge law 5 could not
 * identify by their own id but that ARE identifiable with certainty
 * by a dangling reference to a purged seed entity (lib/sampleData).
 * One honest sentence + one tap; real records are never in the set.
 */
export const SampleEraBar: React.FC<SampleEraBarProps> = ({ count, nounEn, nounBn, nounHi, onClear }) => {
  const { safeTranslate } = useLanguage();
  const { showToast } = useToast();
  if (count <= 0) return null;

  const noun = safeTranslate('sample_era_noun', nounEn, nounBn, nounHi);

  const handleClear = () => {
    const ok = window.confirm(
      safeTranslate(
        'sample_era_confirm',
        `Remove the ${count} sample-era ${noun}? Records you created yourself are never touched.`,
        `${count}টি নমুনা-যুগের ${noun} মুছে ফেলবেন? আপনার নিজের তৈরি রেকর্ড কখনোই ছোঁয়া হবে না।`,
        `${count} नमूना-युग की ${noun} हटाएँ? आपके स्वयं बनाए रिकॉर्ड कभी नहीं छुए जाएँगे।`,
      ),
    );
    if (!ok) return;
    onClear();
    showToast(
      safeTranslate(
        'sample_era_cleared',
        `${count} sample-era ${noun} removed.`,
        `${count}টি নমুনা-যুগের ${noun} মোছা হয়েছে।`,
        `${count} नमूना-युग की ${noun} हटाई गईं।`,
      ),
      'success',
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
      <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-xs font-semibold text-amber-900 flex-1 min-w-[200px]">
        {safeTranslate(
          'sample_era_text',
          `${count} ${noun} from the old sample data are still here — they are marked SAMPLE where they appear.`,
          `পুরনো নমুনা ডেটার ${count}টি ${noun} এখনও আছে — যেখানে দেখা যায়, SAMPLE চিহ্নিত থাকে।`,
          `पुराने नमूना डेटा की ${count} ${noun} अभी भी यहाँ हैं — जहाँ दिखती हैं, SAMPLE चिह्नित रहती हैं।`,
        )}
      </p>
      <button
        type="button"
        onClick={handleClear}
        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition-colors min-h-[44px]"
      >
        {safeTranslate('sample_era_remove', 'Remove', 'মুছুন', 'हटाएँ')}
      </button>
    </div>
  );
};

export default SampleEraBar;
