import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  countSampleRecords,
  countSuiteSampleEraRows,
  sweepSuiteSampleEraRows,
} from '../../lib/sampleData';

/**
 * SampleDataCard — QUEUED #59 (A4-4): the "delete them anytime" half
 * of the SetupWizard's sample-data promise, living where a trustee
 * would look for it (Settings → General). Shows exactly how many
 * sample records this workspace still holds — the tagged first-run
 * sets from DataContext plus the suite sample-era rows that can be
 * identified with certainty (lib/sampleData) — and removes exactly
 * those, never a real record. Renders nothing when there is nothing
 * to clean.
 *
 * Honest-copy law: pathshala attendance rows minted by the old sample
 * seed reference REAL student ids and cannot be told apart from real
 * attendance, so they are never counted and never swept — the card
 * says so in plain words instead of pretending a full cleanup.
 */
export const SampleDataCard: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const data = useData();
  const { showToast } = useToast();
  const { safeTranslate } = useLanguage();
  const [suiteCounts, setSuiteCounts] = useState(() =>
    countSuiteSampleEraRows(activeWorkspace?.id || ''),
  );
  useEffect(() => {
    setSuiteCounts(countSuiteSampleEraRows(activeWorkspace?.id || ''));
  }, [activeWorkspace?.id]);

  const counts = useMemo(
    () =>
      countSampleRecords({
        devotees: data.devotees,
        treasury: data.treasury,
        gurukulStudents: data.gurukulStudents,
        cows: data.cows,
        guests: data.guests,
        campaigns: data.campaigns,
      }),
    [data.devotees, data.treasury, data.gurukulStudents, data.cows, data.guests, data.campaigns],
  );

  if (!activeWorkspace) return null;
  const total = counts.total + suiteCounts.total;
  if (total === 0) return null;

  const parts: string[] = [];
  if (counts.devotees) parts.push(`${counts.devotees} ${safeTranslate('sample_part_members', 'members', 'সদস্য', 'सदस्य')}`);
  if (counts.treasury) parts.push(`${counts.treasury} ${safeTranslate('sample_part_treasury', 'treasury vouchers', 'কোষাগার ভাউচার', 'कोष वाउचर')}`);
  if (counts.gurukulStudents) parts.push(`${counts.gurukulStudents} ${safeTranslate('sample_part_students', 'students', 'শিক্ষার্থী', 'छात्र')}`);
  if (counts.cows) parts.push(`${counts.cows} ${safeTranslate('sample_part_cows', 'cattle records', 'গো-রেকর্ড', 'गौ रिकॉर्ड')}`);
  if (counts.guests) parts.push(`${counts.guests} ${safeTranslate('sample_part_guests', 'guest entries', 'অতিথি এন্ট্রি', 'अतिथि प्रविष्टियाँ')}`);
  if (counts.campaigns) parts.push(`${counts.campaigns} ${safeTranslate('sample_part_campaigns', 'campaigns', 'প্রচারাভিযান', 'अभियान')}`);
  if (suiteCounts.goshalaMilk) parts.push(`${suiteCounts.goshalaMilk} ${safeTranslate('sample_part_milk', 'milk rows', 'দুধের সারি', 'दूध पंक्तियाँ')}`);
  if (suiteCounts.goshalaFodderUse) parts.push(`${suiteCounts.goshalaFodderUse} ${safeTranslate('sample_part_fodder', 'fodder-use rows', 'খড় ব্যবহারের সারি', 'चारा उपयोग पंक्तियाँ')}`);
  if (suiteCounts.pathshalaMarks) parts.push(`${suiteCounts.pathshalaMarks} ${safeTranslate('sample_part_marks', 'marks rows', 'নম্বরের সারি', 'अंक पंक्तियाँ')}`);

  const handleClear = () => {
    const ok = window.confirm(
      safeTranslate(
        'sample_clear_confirm',
        `Remove all ${total} sample records from this workspace? Records you created yourself are never touched.`,
        `এই ওয়ার্কস্পেস থেকে সব ${total}টি নমুনা রেকর্ড মুছে ফেলবেন? আপনার নিজের তৈরি রেকর্ড কখনোই ছোঁয়া হবে না।`,
        `इस कार्यक्षेत्र से सभी ${total} नमूना रिकॉर्ड हटाएँ? आपके स्वयं बनाए रिकॉर्ड कभी नहीं छुए जाएँगे।`,
      ),
    );
    if (!ok) return;
    const removed = data.clearSampleData(activeWorkspace.id);
    const swept = sweepSuiteSampleEraRows(activeWorkspace.id);
    setSuiteCounts(countSuiteSampleEraRows(activeWorkspace.id));
    const n = removed.total + swept.total;
    showToast(
      safeTranslate(
        'sample_cleared',
        `${n} sample records removed. Your real records were not touched.`,
        `${n}টি নমুনা রেকর্ড মোছা হয়েছে। আপনার আসল রেকর্ড ছোঁয়া হয়নি।`,
        `${n} नमूना रिकॉर्ड हटाए गए। आपके वास्तविक रिकॉर्ड नहीं छुए गए।`,
      ),
      'success',
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-amber-200 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3 uppercase tracking-widest">
        <FlaskConical size={18} className="text-amber-500" />
        {safeTranslate('sample_card_title', 'Sample Data', 'নমুনা ডেটা', 'नमूना डेटा')}
        <span className="ml-auto text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full normal-case tracking-normal">
          {total}
        </span>
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-2">
        {safeTranslate(
          'sample_card_body',
          'This workspace still holds sample records from the first-run tour. They are marked SAMPLE everywhere they appear:',
          'এই ওয়ার্কস্পেসে প্রথম ট্যুরের নমুনা রেকর্ড এখনও আছে। যেখানেই তারা দেখা যায়, SAMPLE চিহ্নিত থাকে:',
          'इस कार्यक्षेत्र में पहले टूर के नमूना रिकॉर्ड अभी भी हैं। जहाँ भी वे दिखते हैं, SAMPLE चिह्नित रहते हैं:',
        )}
      </p>
      <p className="text-xs font-bold text-gray-800 mb-3">{parts.join(' · ')}</p>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
        {safeTranslate(
          'sample_card_honest',
          'One honest limit: attendance rows loaded by the old sample seed name real students and cannot be told apart from real attendance, so they are always left untouched.',
          'একটি সৎ সীমাবদ্ধতা: পুরনো নমুনা সিডে লোড হওয়া উপস্থিতির সারিগুলো আসল শিক্ষার্থীদের নামে, আসল উপস্থিতি থেকে আলাদা করা যায় না — তাই সেগুলো সবসময় অস্পৃষ্ট থাকে।',
          'एक ईमानदार सीमा: पुराने नमूना सीड से लोड हुई उपस्थिति पंक्तियाँ वास्तविक छात्रों के नाम पर हैं और वास्तविक उपस्थिति से अलग नहीं की जा सकतीं — इसलिए वे हमेशा अछूती रहती हैं।',
        )}
      </p>
      <button
        type="button"
        onClick={handleClear}
        className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow transition-all min-h-[44px]"
      >
        <Trash2 size={16} />
        {safeTranslate('sample_clear_btn', 'Remove all sample records', 'সব নমুনা রেকর্ড মুছুন', 'सभी नमूना रिकॉर्ड हटाएँ')}
      </button>
    </div>
  );
};

export default SampleDataCard;
