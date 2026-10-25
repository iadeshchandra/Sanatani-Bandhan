/**
 * Sanatani Bandhan — Org broadcast manager (trustee) + announcements
 * section (public). QUEUED #14.
 * ======================================================
 * Before this, an org's "broadcasts" went nowhere in-app: the WhatsApp
 * desk simulated dispatch and GodMode fan-out stopped at one user.
 * Now a trustee publishes ONE doc (orgBroadcasts — see broadcast.ts);
 * followers' devices self-listen and ring their own Suchana bell
 * (broadcastListener.ts). This component is the trustee's desk for it:
 *
 *  - Composer: headline + message, honest delivery copy (followers
 *    receive it when they next open the app — a PWA has no push rail
 *    on Spark, and we say so instead of pretending).
 *  - Campaign history: the org's past broadcasts with timestamps and
 *    the REAL follower count snapshotted at send time. No invented
 *    delivery/read metrics — ever.
 *
 * Non-trustee visitors see the latest announcements as a public list
 * (announcements are public information; the notification deep-link
 * /org/{orgId} lands here).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { appLocale } from '../lib/format';
import { Megaphone, Send, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import {
  validateBroadcastInput,
  BROADCAST_TITLE_MAX,
  BROADCAST_BODY_MAX,
  type OrgBroadcast,
} from './broadcast';
import { fetchAudienceCount, listBroadcastHistory, publishBroadcast } from './broadcastService';

export interface OrgAnnouncementsSectionProps {
  orgId: string;
  orgName: string;
  isTrustee: boolean;
}

/** How many announcements non-trustees see on the public page. */
const PUBLIC_LIST_COUNT = 3;

function formatWhen(ms: number): string {
  try {
    return new Date(ms).toLocaleString(appLocale(), {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const BroadcastRow: React.FC<{ b: OrgBroadcast; T: (k: string, en: string, bn: string, hi: string) => string }> = ({ b, T }) => (
  <li className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
    <p className="text-sm font-black text-stone-900">{b.title}</p>
    {b.body && <p className="text-xs text-stone-600 mt-1 leading-relaxed whitespace-pre-wrap">{b.body}</p>}
    <p className="text-[11px] text-stone-400 mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
      <span>{formatWhen(b.createdAt)}</span>
      {b.createdByName && <span>{b.createdByName}</span>}
      <span>
        {b.audienceCount}{' '}
        {T('orgbroadcast_followers_word', 'followers', 'অনুসারী', 'अनुयायी')}
      </span>
    </p>
  </li>
);

export const OrgAnnouncementsSection: React.FC<OrgAnnouncementsSectionProps> = ({ orgId, orgName, isTrustee }) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();

  const [history, setHistory] = useState<OrgBroadcast[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      setHistory(await listBroadcastHistory(orgId));
    } catch {
      setHistory([]);
    } finally {
      setLoaded(true);
    }
    if (isTrustee) {
      setAudience(await fetchAudienceCount(orgId));
    }
  }, [orgId, isTrustee]);

  useEffect(() => {
    void load();
  }, [load]);

  // Nothing to show a visitor until the org has actually announced —
  // and trustees always see their desk.
  if (!isTrustee && loaded && history.length === 0) return null;
  if (!loaded && !isTrustee) return null;

  const errorCopy = (code: string): string => {
    switch (code) {
      case 'title_required':
        return T('orgbroadcast_err_title', 'Please write a headline for your announcement.', 'আপনার ঘোষণার জন্য একটি শিরোনাম লিখুন।', 'अपनी घोषणा के लिए शीर्षक लिखें।');
      case 'title_too_long':
        return T('orgbroadcast_err_title_long', `Headline is too long (max ${BROADCAST_TITLE_MAX} characters).`, `শিরোনাম খুব লম্বা (সর্বোচ্চ ${BROADCAST_TITLE_MAX} অক্ষর)।`, `शीर्षक बहुत लंबा है (अधिकतम ${BROADCAST_TITLE_MAX} अक्षर)।`);
      case 'body_too_long':
        return T('orgbroadcast_err_body_long', `Message is too long (max ${BROADCAST_BODY_MAX} characters).`, `বার্তা খুব লম্বা (সর্বোচ্চ ${BROADCAST_BODY_MAX} অক্ষর)।`, `संदेश बहुत लंबा है (अधिकतम ${BROADCAST_BODY_MAX} अक्षर)।`);
      default:
        return T('orgbroadcast_err_generic', 'Could not publish. Please try again.', 'প্রকাশ করা যায়নি। আবার চেষ্টা করুন।', 'प्रकाशित नहीं हो सका। फिर से प्रयास करें।');
    }
  };

  const handlePublish = async () => {
    if (!firebaseUser || publishing) return;
    const err = validateBroadcastInput({ title, body });
    if (err) {
      setFormError(errorCopy(err));
      return;
    }
    setFormError(null);
    setPublishing(true);
    try {
      const published = await publishBroadcast({
        orgId,
        orgName,
        title,
        body,
        createdBy: firebaseUser.uid,
        createdByName: firebaseUser.displayName || 'Trustee',
      });
      setHistory((h) => [published, ...h]);
      setAudience(published.audienceCount);
      setTitle('');
      setBody('');
      showToast(
        T(
          'orgbroadcast_sent',
          `Announcement published — ${published.audienceCount} followers will receive it in their Suchana inbox when they next open the app.`,
          `ঘোষণা প্রকাশিত হয়েছে — ${published.audienceCount} অনুসারী পরেরবার অ্যাপ খুললে তাদের সূচনা ইনবক্সে এটি পাবেন।`,
          `घोषणा प्रकाशित हुई — ${published.audienceCount} अनुयायी अगली बार ऐप खोलने पर अपने सूचना इनबॉक्स में इसे पाएंगे।`,
        ),
        'success',
      );
    } catch {
      setFormError(errorCopy('generic'));
    } finally {
      setPublishing(false);
    }
  };

  const visible = isTrustee ? history : history.slice(0, PUBLIC_LIST_COUNT);

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
        <Megaphone size={16} className="text-amber-700" />
        {T('orgbroadcast_heading', 'Announcements', 'ঘোষণা', 'घोषणाएं')}
      </h2>

      {isTrustee && (
        <div className="mb-5 bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-stone-500 flex items-center gap-1.5">
            <Users size={14} className="text-amber-700 shrink-0" />
            {audience === null
              ? T('orgbroadcast_audience_loading', 'Counting your followers…', 'আপনার অনুসারী গণনা হচ্ছে…', 'आपके अनुयायी गिने जा रहे हैं…')
              : T(
                  'orgbroadcast_audience',
                  `Your ${audience} followers receive announcements in their Suchana inbox 🔔`,
                  `আপনার ${audience} অনুসারী তাদের সূচনা ইনবক্সে ঘোষণা পান 🔔`,
                  `आपके ${audience} अनुयायी अपने सूचना इनबॉक्स में घोषणाएं पाते हैं 🔔`,
                )}
          </p>
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={BROADCAST_TITLE_MAX + 20}
              placeholder={T('orgbroadcast_title_ph', 'Headline — e.g. Maha Shivaratri abhishek at 6 PM', 'শিরোনাম — যেমন মহা শিবরাত্রি অভিষেক সন্ধ্যা ৬টায়', 'शीर्षक — जैसे महा शिवरात्रि अभिषेक शाम 6 बजे')}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-stone-900 focus:outline-none focus:border-amber-500"
              aria-label={T('orgbroadcast_title_label', 'Announcement headline', 'ঘোষণার শিরোনাম', 'घोषणा शीर्षक')}
            />
            <p className="text-[10px] text-stone-400 text-right mt-0.5 font-mono">{title.length} / {BROADCAST_TITLE_MAX}</p>
          </div>
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={BROADCAST_BODY_MAX + 20}
              placeholder={T('orgbroadcast_body_ph', 'Your message to devotees (optional)…', 'ভক্তদের জন্য আপনার বার্তা (ঐচ্ছিক)…', 'भक्तों के लिए आपका संदेश (वैकल्पिक)…')}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
              aria-label={T('orgbroadcast_body_label', 'Announcement message', 'ঘোষণার বার্তা', 'घोषणा संदेश')}
            />
            <p className="text-[10px] text-stone-400 text-right mt-0.5 font-mono">{body.length} / {BROADCAST_BODY_MAX}</p>
          </div>
          {formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}
          <button
            type="button"
            disabled={publishing}
            onClick={() => void handlePublish()}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{publishing ? T('orgbroadcast_publishing', 'Publishing…', 'প্রকাশ হচ্ছে…', 'प्रकाशित हो रहा है…') : T('orgbroadcast_publish', '📢 Publish announcement', '📢 ঘোষণা প্রকাশ করুন', '📢 घोषणा प्रकाशित करें')}</span>
          </button>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            {T(
              'orgbroadcast_delivery_note',
              'Followers receive this in their Suchana inbox when they next open the app. There is no SMS or WhatsApp charge — announcements stay inside Sanatani Bandhan.',
              'অনুসারীরা পরেরবার অ্যাপ খুললে তাদের সূচনা ইনবক্সে এটি পাবেন। SMS বা WhatsApp-এর কোনো খরচ নেই — ঘোষণা সনাতনী বন্ধনের ভিতরেই থাকে।',
              'अनुयायी अगली बार ऐप खोलने पर अपने सूचना इनबॉक्स में इसे पाएंगे। SMS या WhatsApp का कोई शुल्क नहीं — घोषणाएं सनातनी बंधन के भीतर ही रहती हैं।',
            )}
          </p>
        </div>
      )}

      {loaded && history.length === 0 && isTrustee && (
        <p className="text-xs text-stone-400 leading-relaxed">
          {T('orgbroadcast_none_yet', 'No announcements yet. Your first sandesh to devotees starts above 🙏', 'এখনও কোনো ঘোষণা নেই। ভক্তদের জন্য আপনার প্রথম সন্দেশ উপরে শুরু করুন 🙏', 'अभी कोई घोषणा नहीं। भक्तों के लिए आपका पहला संदेश ऊपर से शुरू करें 🙏')}
        </p>
      )}

      {visible.length > 0 && (
        <>
          {isTrustee && (
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-2">
              {T('orgbroadcast_history', 'Campaign history', 'ঘোষণার ইতিহাস', 'घोषणा इतिहास')}
            </h3>
          )}
          <ul className="space-y-3">
            {visible.map((b) => (
              <BroadcastRow key={b.id} b={b} T={T} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
