/**
 * social/DevoteeProfile.tsx — public devotee profile.
 * ====================================================================
 * Warmer and simpler than the pro profile: no booking CTAs, no commerce.
 * Shows what the devotee made public: avatar, name, SAN id, bio, stats,
 * their public posts, follow + message actions.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { getOrCreateDirectChat } from '../chat/chatService';
import {
  getDevoteeProfile, getAuthorPosts, subscribeIsFollowing, setFollowing,
  type AuthorPostSummary,
} from './devoteeService';
import type { DevoteeProfile as Profile } from './types';

const tr = (en: string, bn: string, hi: string, lang: string) =>
  lang === 'bn' ? bn : lang === 'hi' ? hi : en;

export const DevoteeProfile: React.FC<{ uid: string }> = ({ uid }) => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuthWorkspace();
  const { currentLang } = useLanguage();
  const lang = currentLang || 'en';
  const viewerUid = (firebaseUser as { uid?: string } | null)?.uid || '';
  const viewerName = (firebaseUser as { displayName?: string } | null)?.displayName || 'Devotee';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<AuthorPostSummary[]>([]);
  const [following, setFollowingState] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isSelf = viewerUid === uid;

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await getDevoteeProfile(uid);
      if (!alive) return;
      setProfile(p);
      if (p && p.isPublic) {
        const ps = await getAuthorPosts(uid);
        if (alive) setPosts(ps);
      }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [uid]);

  useEffect(() => subscribeIsFollowing(viewerUid, uid, setFollowingState), [viewerUid, uid]);

  const toggleFollow = async () => {
    if (!viewerUid || isSelf || followBusy) return;
    setFollowBusy(true);
    try { await setFollowing(viewerUid, uid, !following); } finally { setFollowBusy(false); }
  };

  const openChat = async () => {
    if (!viewerUid || isSelf || msgBusy) return;
    setMsgBusy(true);
    try {
      const chatId = await getOrCreateDirectChat(
        viewerUid, uid,
        { uid: viewerUid, displayName: viewerName },
        { uid, displayName: profile?.displayName || 'Devotee' },
      );
      navigate(`/app/chat?with=${chatId}`);
    } finally { setMsgBusy(false); }
  };

  if (!loaded) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-4xl animate-pulse" aria-hidden>🪔</div>
      </div>
    );
  }

  // No public profile, or private
  if (!profile || !profile.isPublic) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4" aria-hidden>🙏</div>
        <h1 className="text-xl font-extrabold text-stone-800 mb-2">
          {tr('A quiet presence', 'একটি শান্ত উপস্থিতি', 'एक शांत उपस्थिति', lang)}
        </h1>
        <p className="text-stone-500 text-sm">
          {tr(
            'This devotee keeps to themselves. Their light still shines in the community.',
            'এই ভক্ত নিজেকে গোপন রাখেন। সম্প্রদায়ে তাঁদের আলো তবু জ্বলে।',
            'यह भक्त अपने में रहते हैं। समुदाय में उनका प्रकाश फिर भी चमकता है।',
            lang,
          )}
        </p>
      </div>
    );
  }

  const totalAshirvads = posts.reduce((s, p) => s + p.ashirvadCount, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-2xl shrink-0" aria-hidden>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
              : profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-stone-800 truncate">{profile.displayName}</h1>
            <div className="text-xs text-stone-500 font-mono">{profile.sanId}</div>
            {profile.bio && <p className="text-sm text-stone-600 mt-2">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-5 text-center">
          <div>
            <div className="font-extrabold text-stone-800">{posts.length}</div>
            <div className="text-[11px] text-stone-500">{tr('Posts', 'পোস্ট', 'पोस्ट', lang)}</div>
          </div>
          <div>
            <div className="font-extrabold text-stone-800">{profile.followerCount}</div>
            <div className="text-[11px] text-stone-500">{tr('Followers', 'অনুসারী', 'अनुयायी', lang)}</div>
          </div>
          <div>
            <div className="font-extrabold text-stone-800">{profile.followingCount}</div>
            <div className="text-[11px] text-stone-500">{tr('Following', 'অনুসরণ', 'अनुसरण', lang)}</div>
          </div>
          <div>
            <div className="font-extrabold text-stone-800">🪔 {totalAshirvads}</div>
            <div className="text-[11px] text-stone-500">{tr('Blessings', 'আশীর্বাদ', 'आशीर्वाद', lang)}</div>
          </div>
        </div>

        {/* Actions */}
        {!isSelf && viewerUid && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              className={`flex-1 min-h-[44px] rounded-2xl font-bold text-sm transition ${
                following
                  ? 'bg-stone-100 text-stone-600'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow'
              }`}
            >
              {following
                ? tr('✓ Following', '✓ অনুসরণ করছেন', '✓ अनुसरण कर रहे हैं', lang)
                : tr('🙏 Follow', '🙏 অনুসরণ করুন', '🙏 अनुसरण करें', lang)}
            </button>
            <button
              onClick={openChat}
              disabled={msgBusy}
              className="flex-1 min-h-[44px] rounded-2xl font-bold text-sm bg-white border-2 border-orange-200 text-orange-700"
            >
              {tr('💬 Message', '💬 বার্তা', '💬 संदेश', lang)}
            </button>
          </div>
        )}
      </div>

      {/* Posts */}
      <h2 className="font-extrabold text-stone-700 mb-3 px-1">
        {tr('Shared with the community', 'সম্প্রদায়ের সাথে ভাগ করা', 'समुदाय के साथ साझा', lang)}
      </h2>
      {posts.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">
          {tr('No public posts yet.', 'এখনও কোনো পাবলিক পোস্ট নেই।', 'अभी तक कोई सार्वजनिक पोस्ट नहीं।', lang)}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-100 p-4">
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{p.text}</p>
              <div className="flex gap-4 mt-2 text-[11px] text-stone-400">
                <span>🪔 {p.ashirvadCount}</span>
                <span>💬 {p.commentCount}</span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
