import React from 'react';
import { Sprout, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { isPracticeModeOn } from '../../lib/practiceMode';

/**
 * PracticeModeCard — Blueprint D, deliverable 1 (Settings → General,
 * beside the SampleDataCard). The practice mode control room:
 *
 *  - the toggle: writes `practiceMode` on the workspace through
 *    updateWorkspaceDetails — the ONE audited settings choke point,
 *    so turning practice on/off itself joins the audit stream;
 *  - the honest explainer: what practice rows are (badged, hidden
 *    when off, NEVER in any total — not even while practising);
 *  - the count of practice rows still held + the one-tap clear that
 *    removes exactly them (DataContext.clearPracticeData, the
 *    isPractice sibling of the sample purge).
 *
 * Turning the mode OFF writes nothing and deletes nothing — the
 * real books were never touched, so there is no residue to unwind.
 */
export const PracticeModeCard: React.FC = () => {
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const data = useData();
  const { showToast } = useToast();
  const { safeTranslate } = useLanguage();

  // Counted by DataContext from the UNFILTERED sets: with the mode
  // off, the working lists hide practice rows — this card must not.
  const counts = data.practiceCounts;

  if (!activeWorkspace) return null;
  const on = isPracticeModeOn(activeWorkspace);

  const toggle = () => {
    updateWorkspaceDetails({ practiceMode: !on });
    showToast(
      !on
        ? safeTranslate(
            'practice_on_toast',
            'Practice mode is ON — everything you add now is practice only, clearly marked, and never counted.',
            'অনুশীলন মোড চালু — এখন যা যোগ করবেন সবই শুধু অনুশীলন, স্পষ্টভাবে চিহ্নিত, কখনো গণনা হয় না।',
            'अभ्यास मोड चालू है — अब जो भी जोड़ेंगे वह केवल अभ्यास होगा, स्पष्ट चिह्नित, कभी गिना नहीं जाएगा।',
          )
        : safeTranslate(
            'practice_off_toast',
            'Practice mode is OFF — you are back in the real books.',
            'অনুশীলন মোড বন্ধ — আপনি আসল খাতায় ফিরে এসেছেন।',
            'अभ्यास मोड बंद है — आप वास्तविक बही में लौट आए हैं।',
          ),
      'success',
    );
  };

  const handleClear = () => {
    const ok = window.confirm(
      safeTranslate(
        'practice_clear_confirm',
        `Remove all ${counts.total} practice records from this workspace? Your real records are never touched.`,
        `এই ওয়ার্কস্পেস থেকে সব ${counts.total}টি অনুশীলন রেকর্ড মুছে ফেলবেন? আপনার আসল রেকর্ড কখনোই ছোঁয়া হবে না।`,
        `इस कार्यक्षेत्र से सभी ${counts.total} अभ्यास रिकॉर्ड हटाएँ? आपके वास्तविक रिकॉर्ड कभी नहीं छुए जाएँगे।`,
      ),
    );
    if (!ok) return;
    const removed = data.clearPracticeData(activeWorkspace.id);
    showToast(
      safeTranslate(
        'practice_cleared',
        `${removed.total} practice records removed. Your real records were not touched.`,
        `${removed.total}টি অনুশীলন রেকর্ড মোছা হয়েছে। আপনার আসল রেকর্ড ছোঁয়া হয়নি।`,
        `${removed.total} अभ्यास रिकॉर्ड हटाए गए। आपके वास्तविक रिकॉर्ड नहीं छुए गए।`,
      ),
      'success',
    );
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-violet-200 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-400"></div>
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3 uppercase tracking-widest">
        <Sprout size={18} className="text-violet-500" />
        {safeTranslate('practice_card_title', 'Practice Mode', 'অনুশীলন মোড', 'अभ्यास मोड')}
        <span
          className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full normal-case tracking-normal border ${
            on ? 'bg-violet-100 text-violet-800 border-violet-300' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          {on
            ? safeTranslate('practice_state_on', 'On', 'চালু', 'चालू')
            : safeTranslate('practice_state_off', 'Off', 'বন্ধ', 'बंद')}
        </span>
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-4">
        {safeTranslate(
          'practice_card_body',
          'Practising — nothing here is real. Turn practice mode on to learn the desks or let a new sevadar try, right inside your own organisation. Everything added while it is on is marked PRACTICE, stays out of every total, report and published account, and can be cleared in one tap. Turn it off and you are back in the real books — nothing to undo, because nothing real was ever touched.',
          'অনুশীলন — এখানে কিছুই আসল নয়। ডেস্ক শিখতে বা নতুন সেবাদারকে চেষ্টা করতে, নিজের সংগঠনের ভিতরেই অনুশীলন মোড চালু করুন। এটি চালু থাকাকালীন যা যোগ হবে সব অনুশীলন চিহ্নিত থাকবে, প্রতিটি মোট অঙ্ক, প্রতিবেদন ও প্রকাশিত হিসাবের বাইরে থাকবে, এবং এক ট্যাপে মোছা যাবে। বন্ধ করলেই আসল খাতায় ফিরে যাবেন — কিছু ফেরানোর নেই, কারণ আসল কিছু কখনো ছোঁয়া হয়নি।',
          'अभ्यास — यहाँ कुछ भी वास्तविक नहीं है। डेस्क सीखने या नए सेवादार को अभ्यास कराने के लिए, अपने ही संगठन के अंदर अभ्यास मोड चालू करें। इसके चालू रहने पर जो भी जुड़ेगा वह अभ्यास चिह्नित रहेगा, हर योग, रिपोर्ट व प्रकाशित हिसाब से बाहर रहेगा, और एक टैप में साफ़ होगा। बंद करते ही आप वास्तविक बही में लौट आएँगे — कुछ पलटना नहीं है, क्योंकि वास्तविक कुछ कभी छुआ ही नहीं गया।',
        )}
      </p>
      <button
        type="button"
        onClick={toggle}
        className={`w-full sm:w-auto font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow transition-all min-h-[44px] ${
          on
            ? 'bg-gray-700 hover:bg-gray-800 text-white'
            : 'bg-violet-500 hover:bg-violet-600 text-white'
        }`}
      >
        <Sprout size={16} />
        {on
          ? safeTranslate('practice_stop_btn', 'Stop practising — back to real books', 'অনুশীলন শেষ — আসল খাতায় ফিরুন', 'अभ्यास समाप्त — वास्तविक बही पर लौटें')
          : safeTranslate('practice_start_btn', 'Start practice mode', 'অনুশীলন মোড শুরু করুন', 'अभ्यास मोड शुरू करें')}
      </button>
      {counts.total > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-800 mb-3">
            {safeTranslate(
              'practice_held',
              `${counts.total} practice records are held in this workspace.`,
              `এই ওয়ার্কস্পেসে ${counts.total}টি অনুশীলন রেকর্ড রাখা আছে।`,
              `इस कार्यक्षेत्र में ${counts.total} अभ्यास रिकॉर्ड रखे हैं।`,
            )}
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto bg-white hover:bg-violet-50 text-violet-700 border border-violet-300 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-all min-h-[44px]"
          >
            <Trash2 size={16} />
            {safeTranslate('practice_clear_btn', 'Clear practice data', 'অনুশীলন ডেটা মুছুন', 'अभ्यास डेटा साफ़ करें')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeModeCard;
