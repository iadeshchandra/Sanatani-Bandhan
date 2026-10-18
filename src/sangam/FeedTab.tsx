import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, Field, inputCls, Modal, AuthorLine, EmptyState, SyncLabel, useLocaleText, T } from './ui';
import type { SangamPost, PostKind, SangamReport } from './types';
import { uploadFile, resolveVaultUrl } from '../lib/fileVault';
import { ServiceCardFeedItem } from './ServiceCardFeedItem';
import { applyServiceCardDensity } from './serviceCard';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Sangam Feed — the personal home feed.
 * =====================================================================
 * CHRONOLOGICAL BY DEFAULT — no engagement-bait ranking, ever. Posts
 * from followed organisations, verified purohits/jyotishis, and the
 * community, newest first. Interactions in Sanatani language: Ashirvad
 * (🙏) instead of "like". Counts are honest, never inflated.
 */

const KIND_TABS: Array<{ id: PostKind | 'all'; en: string; bn: string; hi: string; icon: string }> = [
  { id: 'all', en: 'All', bn: 'সব', hi: 'सभी', icon: '🪔' },
  { id: 'text', en: 'Thoughts', bn: 'ভাবনা', hi: 'विचार', icon: '💬' },
  { id: 'shloka', en: 'Shloka', bn: 'শ্লোক', hi: 'श्लोक', icon: '📿' },
  { id: 'photo', en: 'Photos', bn: 'ছবি', hi: 'चित्र', icon: '🖼️' },
  { id: 'seva', en: 'Seva', bn: 'সেবা', hi: 'सेवा', icon: '🤲' },
  { id: 'event', en: 'Events', bn: 'অনুষ্ঠান', hi: 'आयोजन', icon: '🎪' },
  { id: 'service_card', en: 'Seva Notices', bn: 'সেবা বিজ্ঞপ্তি', hi: 'सेवा सूचनाएँ', icon: '🪔' },
];

/** Renders a post photo: resolves `vault://` uploads to blob URLs, passes
 *  plain https: URLs through untouched. Shows a soft placeholder while the
 *  vault file loads (and nothing at all if it is gone). */
const FeedImage: React.FC<{ url: string }> = ({ url }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    resolveVaultUrl(url).then((r) => { if (live) setSrc(r); }).catch(() => { if (live) setSrc(null); });
    return () => { live = false; };
  }, [url]);
  if (!src) return <div className="w-full h-40 bg-stone-100 animate-pulse rounded-xl" aria-hidden="true" />;
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-stone-100">
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img src={src} className="w-full max-h-80 object-cover" loading="lazy" />
    </div>
  );
};

const PostCard: React.FC<{ post: SangamPost; author: AuthorInfo }> = ({ post, author }) => {  const { toggleAshirvad, addComment, sharePost, volunteerSeva, reportContent, comments, online } = useSangam();
  const { tr } = useLocaleText();
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<SangamReport['reason']>('spam');
  const [reportDetails, setReportDetails] = useState('');

  const gave = (post.ashirvadBy || []).includes(author.uid);
  const volunteered = (post.volunteers || []).includes(author.uid);
  const postComments = comments[post.id] || [];

  const doComment = async () => {
    if (!commentText.trim()) return;
    await addComment(post.id, author, commentText);
    setCommentText('');
  };

  const doShare = async () => {
    const note = shareNote;
    setShareNote('');
    setShareOpen(false); // close immediately — sync is best-effort
    await sharePost(post, author, note);
  };

  const doReport = async () => {
    const reason = reportReason;
    const details = reportDetails;
    setReportOpen(false); // close immediately — sync is best-effort
    setReportDetails('');
    await reportContent(author.uid, author.name, 'post', post.id, reason, details);
  };

  const sevaFull = post.kind === 'seva' && post.seva && (post.volunteers || []).length >= post.seva.slots;

  return (
    <Card>
      <AuthorLine
        name={post.authorName} sanId={post.authorSanId} kind={post.authorKind}
        tier={post.authorTier} official={post.isOfficialPagePost} time={post.createdAt}
      />
      {post.sharedFrom && (
        <div className="mt-2 text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-xl px-3 py-1.5">
          🔁 {tr('Shared from', 'শেয়ার করা', 'साझा')} <span className="font-bold">{post.sharedFrom.authorName}</span>
          <span className="font-mono"> ({post.sharedFrom.authorSanId})</span>
          <span> — {tr('with attribution', 'কৃতিত্বসহ', 'श्रेय सहित')}</span>
        </div>
      )}
      <p className="mt-2.5 text-[15px] text-stone-800 whitespace-pre-wrap leading-relaxed">{post.text}</p>
      {post.kind === 'shloka' && post.shlokaRef && (
        <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 inline-block">
          📿 {post.shlokaRef}
        </div>
      )}
      {post.imageUrl && <FeedImage url={post.imageUrl} />}
      {post.kind === 'seva' && post.seva && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="text-sm font-extrabold text-emerald-900">🤲 {tr('Seva opportunity', 'সেবার সুযোগ', 'सेवा अवसर')}</div>
          <div className="text-xs text-emerald-800 mt-1">
            📍 {post.seva.venue} · 📅 {post.seva.date} · ⏱️ {tr('about', 'প্রায়', 'लगभग')} {post.seva.hoursEach}h
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (post.seva.slotsTaken / post.seva.slots) * 100)}%` }} />
            </div>
            <span className="text-[11px] font-bold text-emerald-800">{post.seva.slotsTaken}/{post.seva.slots}</span>
          </div>
          <Btn
            variant="soft" className="mt-2 w-full !border-emerald-300 !text-emerald-800 !bg-white"
            disabled={volunteered || sevaFull}
            onClick={() => volunteerSeva(post.id, author.uid)}
          >
            {volunteered ? `✓ ${tr('You volunteered — dhanyavaad!', 'আপনি স্বেচ্ছাসেবক — ধন্যবাদ!', 'आप स्वयंसेवक बने — धन्यवाद!')}`
              : sevaFull ? tr('Slots full', 'স্লট পূর্ণ', 'स्लॉट भरे')
              : `🙏 ${tr('Volunteer', 'স্বেচ্ছাসেবক হোন', 'स्वयंसेवक बनें')}`}
          </Btn>
        </div>
      )}

      {/* Honest counts — never inflated */}
      <div className="mt-3 flex items-center gap-4 text-xs text-stone-500 font-semibold">
        <span>🙏 {post.ashirvadCount} <T en="Ashirvad" bn="আশীর্বাদ" hi="आशीर्वाद" /></span>
        <span>💬 {post.commentCount}</span>
        <span>🔁 {post.shareCount}</span>
        {post.status === 'reported' && <span className="text-amber-600">⚠️ {tr('Under review', 'পর্যালোচনাধীন', 'समीक्षाधीन')}</span>}
      </div>

      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-1">
        <button
          onClick={() => toggleAshirvad(post.id, author.uid)}
          aria-pressed={gave}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold min-h-[44px] transition-colors ${gave ? 'bg-orange-100 text-orange-700' : 'text-stone-600 hover:bg-orange-50'}`}
        >
          {gave ? '🙏 ✓' : '🙏'} <T en="Ashirvad" bn="আশীর্বাদ" hi="आशीर्वाद" />
        </button>
        <button
          onClick={() => setCommentOpen((v) => !v)}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50 min-h-[44px]"
        >
          💬 <T en="Comment" bn="মন্তব্য" hi="टिप्पणी" />
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50 min-h-[44px]"
        >
          🔁 <T en="Share" bn="শেয়ার" hi="साझा" />
        </button>
        <button
          onClick={() => setReportOpen(true)}
          aria-label={tr('Report', 'রিপোর্ট', 'रिपोर्ट')}
          className="px-3 py-2.5 rounded-xl text-stone-400 hover:bg-stone-50 hover:text-stone-600 min-h-[44px] min-w-[44px]"
        >
          ⋯
        </button>
      </div>

      {commentOpen && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          {postComments.length === 0 && (
            <div className="text-xs text-stone-400 italic py-2">{tr('No comments yet — be the first to respond with kindness.', 'এখনও কোনো মন্তব্য নেই।', 'अभी कोई टिप्पणी नहीं।')}</div>
          )}
          {postComments.map((c) => (
            <div key={c.id} className="py-2 border-b border-stone-50 last:border-0">
              <AuthorLine name={c.authorName} sanId={c.authorSanId} kind={c.authorKind} tier={c.authorTier} time={c.createdAt} />
              <p className="text-sm text-stone-700 mt-1 ml-12">{c.text}</p>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder={tr('Write a kind comment…', 'সদয় মন্তব্য লিখুন…', 'सदय टिप्पणी लिखें…')}
              className={inputCls} maxLength={500}
              onKeyDown={(e) => { if (e.key === 'Enter') doComment(); }}
            />
            <Btn onClick={doComment} disabled={!commentText.trim()} className="!px-4">{tr('Post', 'পোস্ট', 'पोस्ट')}</Btn>
          </div>
          {!online && <div className="text-[11px] text-amber-600 mt-1">📴 {tr('Offline — your comment is saved on this device.', 'অফলাইন — মন্তব্য ডিভাইসে সংরক্ষিত।', 'ऑफ़लाइन — टिप्पणी डिवाइस पर सहेजी।')}</div>}
        </div>
      )}

      {shareOpen && (
        <Modal onClose={() => setShareOpen(false)} title={<T en="Share with attribution" bn="কৃতিত্বসহ শেয়ার" hi="श्रेय सहित साझा" />}>
          <p className="text-xs text-stone-500 mb-3">
            {tr('The original author is always credited. Add your own note below.', 'মূল লেখককে সর্বদা কৃতিত্ব দেওয়া হয়।', 'मूल लेखक को सदैव श्रेय दिया जाता है।')}
          </p>
          <Field label={<T en="Your note (optional)" bn="আপনার নোট" hi="आपकी टिप्पणी" />}>
            <textarea value={shareNote} onChange={(e) => setShareNote(e.target.value)} rows={3} maxLength={300} className={inputCls} />
          </Field>
          <Btn onClick={doShare} className="w-full mt-3">🔁 <T en="Share now" bn="শেয়ার করুন" hi="साझा करें" /></Btn>
        </Modal>
      )}

      {reportOpen && (
        <Modal onClose={() => setReportOpen(false)} title={<T en="Report content" bn="বিষয়বস্তু রিপোর্ট" hi="सामग्री रिपोर्ट" />}>
          <p className="text-xs text-stone-500 mb-3">
            {tr('Reports go to platform moderators. False reports may limit your account.', 'রিপোর্ট মডারেটরদের কাছে যায়।', 'रिपोर्ट मॉडरेटरों को जाती है।')}
          </p>
          <Field label={<T en="Reason" bn="কারণ" hi="कारण" />}>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value as SangamReport['reason'])} className={inputCls}>
              <option value="spam">{tr('Spam', 'স্প্যাম', 'स्पैम')}</option>
              <option value="impersonation">{tr('Impersonation', 'ছদ্মবেশ', 'छद्मवेश')}</option>
              <option value="inappropriate">{tr('Inappropriate', 'অনুপযুক্ত', 'अनुचित')}</option>
              <option value="misinformation">{tr('Misinformation', 'ভুল তথ্য', 'गलत जानकारी')}</option>
              <option value="other">{tr('Other', 'অন্যান্য', 'अन्य')}</option>
            </select>
          </Field>
          <Field label={<T en="Details (optional)" bn="বিস্তারিত" hi="विवरण" />}>
            <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={2} maxLength={300} className={inputCls} />
          </Field>
          <Btn variant="danger" onClick={doReport} className="w-full mt-3">{tr('Submit report', 'রিপোর্ট জমা দিন', 'रिपोर्ट भेजें')}</Btn>
        </Modal>
      )}
    </Card>
  );
};

const Composer: React.FC<{ author: AuthorInfo; pageContext?: { orgId: string; orgName: string } }> = ({ author, pageContext }) => {
  const { createPost } = useSangam();
  const { tr } = useLocaleText();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PostKind>('text');
  const [text, setText] = useState('');
  const [shlokaRef, setShlokaRef] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sevaVenue, setSevaVenue] = useState('');
  const [sevaDate, setSevaDate] = useState('');
  const [sevaSlots, setSevaSlots] = useState('10');
  const [sevaHours, setSevaHours] = useState('3');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  /** Upload a photo from the device into the public File Vault tier, then
   *  attach the resulting vault:// URL to the post. Images are compressed
   *  client-side before upload (see lib/fileVault). */
  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadFile(file, {
        visibility: 'public',
        category: 'gallery',
        ownerUid: author.uid,
        fileName: file.name,
      });
      setImageUrl(res.url);
    } catch (err: any) {
      setUploadError(err?.message || tr('Upload failed. Please try again.', 'আপলোড ব্যর্থ। আবার চেষ্টা করুন।', 'अपलोड विफल। पुनः प्रयास करें।'));
    }
    setUploading(false);
  };

  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const input = {
        kind, text,
        shlokaRef: kind === 'shloka' ? shlokaRef.trim() || undefined : undefined,
        imageUrl: kind === 'photo' ? imageUrl.trim() || undefined : undefined,
        seva: kind === 'seva' ? {
          venue: sevaVenue.trim() || tr('To be announced', 'ঘোষণা করা হবে', 'घोषणा होगी'),
          date: sevaDate || new Date().toISOString().slice(0, 10),
          slots: Math.max(1, parseInt(sevaSlots, 10) || 10),
          slotsTaken: 0,
          hoursEach: Math.max(1, parseInt(sevaHours, 10) || 3),
        } : undefined,
      };
    setText(''); setShlokaRef(''); setImageUrl(''); setSevaVenue(''); setSevaDate('');
    setKind('text'); setOpen(false); setBusy(false); // close immediately — sync is best-effort
    try {
      await createPost(author, input, pageContext);
    } finally { /* local state already updated */ }
  };

  if (!open) {
    return (
      <Card className="!p-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left px-4 py-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 text-sm font-semibold min-h-[48px]"
        >
          {tr('Share a thought, shloka, or seva appeal…', 'ভাবনা, শ্লোক বা সেবার আবেদন শেয়ার করুন…', 'विचार, श्लोक या सेवा निवेदन साझा करें…')}
        </button>
      </Card>
    );
  }

  return (
    <Card>
      {pageContext && (
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
          🏛️ {tr('Posting as', 'হিসেবে পোস্ট', 'के रूप में पोस्ट')} {pageContext.orgName}
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5">🏛️ OFFICIAL</span>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {(['text', 'shloka', 'photo', 'seva'] as PostKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] ${kind === k ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            {k === 'text' ? `💬 ${tr('Thought', 'ভাবনা', 'विचार')}`
              : k === 'shloka' ? `📿 ${tr('Shloka', 'শ্লোক', 'श्लोक')}`
              : k === 'photo' ? `🖼️ ${tr('Photo', 'ছবি', 'चित्र')}`
              : `🤲 ${tr('Seva appeal', 'সেবার আবেদন', 'सेवा निवेदन')}`}
          </button>
        ))}
      </div>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000}
        placeholder={kind === 'shloka'
          ? tr('Share a shloka with its meaning…', 'অর্থসহ শ্লোক শেয়ার করুন…', 'अर्थ सहित श्लोक साझा करें…')
          : kind === 'seva'
            ? tr('Describe the seva needed — what, where, when…', 'কী সেবা দরকার বর্ণনা করুন…', 'क्या सेवा चाहिए वर्णन करें…')
            : tr('What is on your heart today?', 'আজ আপনার হৃদয়ে কী?', 'आज आपके हृदय में क्या है?')}
        className={inputCls}
      />
      {kind === 'shloka' && (
        <div className="mt-2">
          <Field label={<T en="Source (e.g. Bhagavad Gita 2.47)" bn="উৎস" hi="स्रोत" />}>
            <input value={shlokaRef} onChange={(e) => setShlokaRef(e.target.value)} className={inputCls} maxLength={80} />
          </Field>
        </div>
      )}
      {kind === 'photo' && (
        <div className="mt-2 space-y-2">
          <Field label={<T en="Photo" bn="ছবি" hi="चित्र" />}>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputCls} placeholder="https://" maxLength={500} />
          </Field>
          <div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onPhotoFile} aria-hidden />
            <Btn variant="ghost" onClick={() => photoRef.current?.click()} disabled={uploading} className="w-full">
              {uploading
                ? tr('Uploading…', 'আপলোড হচ্ছে…', 'अपलोड हो रहा…')
                : `📤 ${tr('Upload from this device', 'এই ডিভাইস থেকে আপলোড', 'इस डिवाइस से अपलोड')}`}
            </Btn>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
            {imageUrl.startsWith('vault://') && (
              <p className="text-[11px] text-emerald-700 mt-1">✅ {tr('Photo attached — it will appear with your post.', 'ছবি যুক্ত হয়েছে — পোস্টের সঙ্গে দেখা যাবে।', 'चित्र जुड़ गया — पोस्ट के साथ दिखेगा।')}</p>
            )}
          </div>
        </div>
      )}
      {kind === 'seva' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Field label={<T en="Venue" bn="স্থান" hi="स्थान" />}><input value={sevaVenue} onChange={(e) => setSevaVenue(e.target.value)} className={inputCls} maxLength={80} /></Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" value={sevaDate} onChange={(e) => setSevaDate(e.target.value)} className={inputCls} /></Field>
          <Field label={<T en="Volunteers needed" bn="স্বেচ্ছাসেবক" hi="स्वयंसेवक" />}><input type="number" min={1} max={500} value={sevaSlots} onChange={(e) => setSevaSlots(e.target.value)} className={inputCls} /></Field>
          <Field label={<T en="Hours each" bn="ঘণ্টা" hi="घंटे" />}><input type="number" min={1} max={24} value={sevaHours} onChange={(e) => setSevaHours(e.target.value)} className={inputCls} /></Field>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <Btn variant="ghost" onClick={() => setOpen(false)} className="flex-1">{tr('Cancel', 'বাতিল', 'रद्द')}</Btn>
        <Btn onClick={post} disabled={!text.trim() || busy} className="flex-1">
          {busy ? tr('Posting…', 'পোস্ট হচ্ছে…', 'पोस्ट हो रहा…') : `🪔 ${tr('Share to Sangam', 'সঙ্গমে শেয়ার', 'संगम में साझा')}`}
        </Btn>
      </div>
    </Card>
  );
};

export const FeedTab: React.FC<{ author: AuthorInfo; pageContext?: { orgId: string; orgName: string } }> = ({ author, pageContext }) => {
  const { posts, online, lastSyncedAt, follows } = useSangam();
  const { firebaseUser } = useAuthWorkspace();
  const guideUid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const sevabazarGuide = useGuide('sevabazar', guideUid);
  const { tr } = useLocaleText();
  const [kindFilter, setKindFilter] = useState<PostKind | 'all'>('all');
  const [followingOnly, setFollowingOnly] = useState(false);

  const followedIds = useMemo(() => new Set(follows.map((f) => `${f.targetType}:${f.targetId}`)), [follows]);

  const visible = useMemo(() => {
    let list = posts.filter((p) => p.status !== 'removed');
    if (kindFilter !== 'all') list = list.filter((p) => p.kind === kindFilter);
    if (followingOnly) {
      list = list.filter((p) => {
        if (p.authorUid === author.uid) return true;
        if (p.isOfficialPagePost && p.orgId && followedIds.has(`org:${p.orgId}`)) return true;
        if ((p.authorKind === 'purohit' || p.authorKind === 'jyotish') && p.authorRoleId && followedIds.has(`${p.authorKind}:${p.authorRoleId}`)) return true;
        return false;
      });
    }
    // Chronological, newest first — no engagement ranking, ever.
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    // Seva Bazar: service cards are guests — ≤15% of the mixed feed.
    // (Explicit "Seva Notices" filter shows them all; the cap is for discovery.)
    return kindFilter === 'all' ? applyServiceCardDensity(sorted) : sorted;
  }, [posts, kindFilter, followingOnly, followedIds, author.uid]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <SyncLabel online={online} lastSyncedAt={lastSyncedAt} />
        <label className="flex items-center gap-2 text-xs font-bold text-stone-600 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={followingOnly} onChange={(e) => setFollowingOnly(e.target.checked)} className="w-5 h-5 accent-orange-600" />
          {tr('Following only', 'শুধু অনুসরণ', 'केवल अनुसरण')}
        </label>
      </div>

      <Composer author={author} pageContext={pageContext} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {KIND_TABS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKindFilter(k.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] ${kindFilter === k.id ? 'bg-temple-950 text-amber-200' : 'bg-white border border-stone-200 text-stone-600'}`}
          >
            {k.icon} {k.id === 'all' ? tr('All', 'সব', 'सभी') : k.en}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="🪔"
            title={<T en="The sangam is quiet here" bn="এখানে নীরবতা" hi="यहाँ शांति है" />}
            body={tr('Follow organisations and verified guides, or share the first thought.', 'প্রতিষ্ঠান অনুসরণ করুন।', 'संस्थाओं का अनुसरण करें।')}
          />
        </Card>
      ) : (
        visible.map((p) =>
          p.kind === 'service_card' ? (
            <ServiceCardFeedItem key={p.id} post={p} author={author} />
          ) : (
            <PostCard key={p.id} post={p} author={author} />
          )
        )
      )}
      {/* Quick Guide: Seva Bazar notices — invitational only, never auto-plays. */}
      {sevabazarGuide.pillVisible && (
        <TourPill guide={GUIDES.sevabazar} uid={guideUid} onStart={sevabazarGuide.start} onDismiss={sevabazarGuide.dismissPill} />
      )}
      {sevabazarGuide.tourActive && <CoachMark guide={GUIDES.sevabazar} onFinish={sevabazarGuide.finish} />}
    </div>
  );
};
