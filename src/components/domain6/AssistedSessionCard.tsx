import React, { useEffect, useMemo, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  endAssistedSession,
  getAssistedSession,
  loadAssistedSession,
  startAssistedSession,
  subscribeAssistedSession,
  type AssistedSession,
} from '../../lib/assistedSession';
import { registerAssistedAuditStamping } from '../../lib/assistedAuditWiring';

/**
 * AssistedSessionCard — Blueprint D, deliverable 4 (Settings →
 * General). The formal start/stop for an assisted session: a
 * family member or sevadar who is about to help ON THIS account
 * declares it here — their name (and member identity, when they
 * pick themselves from the member list) — and while the session
 * runs, the audit stream stamps every commit `assistedBy` them.
 *
 * The card states the law in plain words before anyone starts:
 * the account stays the owner's, the helper gains no access of
 * their own, nothing moves between accounts, and the owner can
 * end the session anytime (here, or from the persistent banner).
 */
export const AssistedSessionCard: React.FC = () => {
  const { user, activeWorkspace } = useAuthWorkspace();
  const { orgMembers } = useMembership();
  const { showToast } = useToast();
  const { safeTranslate } = useLanguage();
  const [session, setSession] = useState<AssistedSession | null>(null);
  const [helperName, setHelperName] = useState('');
  const [helperUid, setHelperUid] = useState('');

  useEffect(() => {
    registerAssistedAuditStamping();
    if (user?.uid) setSession(loadAssistedSession(user.uid));
    return subscribeAssistedSession(setSession);
  }, [user?.uid]);

  const memberOptions = useMemo(
    () =>
      (orgMembers || []).filter(
        (m) => m.uid && user?.uid && m.uid !== user.uid
      ),
    [orgMembers, user?.uid]
  );

  if (!user?.uid || !activeWorkspace) return null;

  const start = () => {
    const picked = memberOptions.find((m) => m.uid === helperUid);
    const name = (picked?.displayName || helperName).trim();
    if (!name) {
      showToast(
        safeTranslate(
          'assisted_need_name',
          'Please tell us who is helping — a name is enough.',
          'কে সাহায্য করছেন জানান — একটি নামই যথেষ্ট।',
          'कृपया बताएँ कि कौन सहायता कर रहा है — एक नाम ही पर्याप्त है।',
        ),
        'error',
      );
      return;
    }
    const s = startAssistedSession({
      ownerUid: user.uid,
      helperUid: picked ? picked.uid : '',
      helperName: name,
    });
    if (s) {
      showToast(
        safeTranslate(
          'assisted_started',
          `Assisted session started — ${s.helperName} is helping. Their help will be noted beside each action.`,
          `সহায়তা সেশন শুরু হয়েছে — ${s.helperName} সাহায্য করছেন। প্রতিটি কাজের পাশে তাঁর সহায়তার উল্লেখ থাকবে।`,
          `सहायता सत्र शुरू हो गया है — ${s.helperName} सहायता कर रहे हैं। हर कार्य के साथ उनकी सहायता का उल्लेख रहेगा।`,
        ),
        'success',
      );
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-teal-200 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-400"></div>
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3 uppercase tracking-widest">
        <HeartHandshake size={18} className="text-teal-600" />
        {safeTranslate('assisted_card_title', 'Assisted Session', 'সহায়তা সেশন', 'सहायता सत्र')}
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-4">
        {safeTranslate(
          'assisted_card_body',
          'Sometimes a son helps his mother, or a sevadar helps a devotee at the desk — on her own account. Declare it here, and every action taken while the session runs is honestly recorded as done by the account owner, with the helper named beside it. The helper gets no access of their own, nothing is shared or moved between accounts, and the owner can end the session anytime.',
          'কখনো ছেলে মাকে সাহায্য করে, বা সেবাদার ডেস্কে কোনো ভক্তকে সাহায্য করে — তাঁর নিজের অ্যাকাউন্টেই। এখানে ঘোষণা করুন, এবং সেশন চলাকালীন প্রতিটি কাজ সৎভাবে লিপিবদ্ধ হবে অ্যাকাউন্ট মালিকের দ্বারা, পাশে সাহায্যকারীর নামসহ। সাহায্যকারী নিজে কোনো প্রবেশাধিকার পান না, অ্যাকাউন্টের মধ্যে কিছু ভাগ বা স্থানান্তর হয় না, এবং মালিক যেকোনো সময় সেশন শেষ করতে পারেন।',
          'कभी बेटा माँ की सहायता करता है, या सेवादार डेस्क पर किसी भक्त की — उनके अपने खाते पर ही। यहाँ घोषित करें, और सत्र के दौरान हर कार्य ईमानदारी से खाता-स्वामी के नाम दर्ज होगा, साथ में सहायक का नाम। सहायक को अपनी कोई पहुँच नहीं मिलती, खातों के बीच कुछ साझा या स्थानांतरित नहीं होता, और स्वामी कभी भी सत्र समाप्त कर सकते हैं।',
        )}
      </p>

      {session ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
            {safeTranslate(
              'assisted_active',
              `${session.helperName} is helping on this account right now.`,
              `${session.helperName} এখন এই অ্যাকাউন্টে সাহায্য করছেন।`,
              `${session.helperName} इस समय इस खाते पर सहायता कर रहे हैं।`,
            )}
          </p>
          <button
            type="button"
            onClick={() => endAssistedSession(session.ownerUid)}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow transition-all min-h-[44px]"
          >
            {safeTranslate('assisted_end_btn', 'End assisted session', 'সহায়তা সেশন শেষ করুন', 'सहायता सत्र समाप्त करें')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {memberOptions.length > 0 && (
            <label className="block">
              <span className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                {safeTranslate('assisted_pick_member', 'Helper is a member here?', 'সাহায্যকারী এখানকার সদস্য?', 'सहायक यहाँ के सदस्य हैं?')}
              </span>
              <select
                value={helperUid}
                onChange={(e) => setHelperUid(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">
                  {safeTranslate('assisted_pick_none', 'Not a member — use the name below', 'সদস্য নন — নিচের নাম ব্যবহার করুন', 'सदस्य नहीं — नीचे नाम लिखें')}
                </option>
                {memberOptions.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName || m.email || m.uid} · {m.role}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!helperUid && (
            <label className="block">
              <span className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                {safeTranslate('assisted_name_label', "Helper's name", 'সাহায্যকারীর নাম', 'सहायक का नाम')}
              </span>
              <input
                type="text"
                value={helperName}
                onChange={(e) => setHelperName(e.target.value)}
                placeholder={safeTranslate('assisted_name_ph', 'e.g. Ratan (son)', 'যেমন: রতন (ছেলে)', 'जैसे: रतन (पुत्र)')}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </label>
          )}
          <button
            type="button"
            onClick={start}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow transition-all min-h-[44px]"
          >
            <HeartHandshake size={16} />
            {safeTranslate('assisted_start_btn', 'Start assisted session', 'সহায়তা সেশন শুরু করুন', 'सहायता सत्र शुरू करें')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AssistedSessionCard;
