import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, CalendarClock, MoonStar, XCircle, ChevronRight } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchWorkspaceEvents } from '../../context/data/auditStore';
import { templateById } from '../../lib/roleTemplates';
import {
  accessReviewClockMark,
  accessReviewClockRead,
  accessReviewDue,
  buildAccessReview,
  lastActivityByActor,
  type AccessReviewRow,
} from '../../lib/accessReview';
import { emitNotify } from '../../notifications/emit';

/**
 * AccessReviewCard — Blueprint D, deliverable 2 (Settings → General,
 * Trustees and SuperAdmins only). The brief's §1f access review:
 * "These people can see money and records — is that still right?"
 * made into one calm card.
 *
 * Pure read surface: rows are computed by lib/accessReview from
 * Blueprint B's membership data (roles, templates, desk scopes,
 * expiries) and Blueprint A's audit stream (dormancy = no recorded
 * activity in 90 days). Nothing here edits anyone — the one-tap
 * action deep-links into the Membership desk with the member's
 * editor open, where the real, maker–checker-guarded tools live.
 *
 * Cadence: the review "comes due" quarterly (lib/accessReview's
 * clock). When due AND something needs attention, ONE gentle
 * Suchana reminder is emitted (dedupe-keyed per quarter) — never
 * a nag; dismissing marks the review done for the quarter.
 */
export const AccessReviewCard: React.FC = () => {
  const { user, activeWorkspace } = useAuthWorkspace();
  const { orgMembers, myMemberships } = useMembership();
  const { safeTranslate, t } = useLanguage();
  const [events, setEvents] = useState<import('../../lib/auditChain').AuditEvent[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const remindedRef = useRef(false);

  const wsId = activeWorkspace?.id;
  const creatorUid =
    (activeWorkspace as { createdBy?: string } | null | undefined)?.createdBy || undefined;
  const myRole = useMemo(() => {
    if (!wsId) return null;
    if (creatorUid && user?.uid === creatorUid) return 'SuperAdmin';
    return myMemberships.find((m) => m.workspaceId === wsId)?.role ?? null;
  }, [wsId, creatorUid, user?.uid, myMemberships]);
  const canReview = myRole === 'Trustee' || myRole === 'SuperAdmin';

  useEffect(() => {
    if (!wsId || !canReview) return;
    let live = true;
    fetchWorkspaceEvents(wsId, 300)
      .then((evs) => {
        if (live) setEvents(evs);
      })
      .catch(() => {
        if (live) setEvents([]);
      });
    return () => {
      live = false;
    };
  }, [wsId, canReview]);

  const review = useMemo(() => {
    if (!events) return null;
    return buildAccessReview(orgMembers || [], lastActivityByActor(events), Date.now(), creatorUid);
  }, [events, orgMembers, creatorUid]);

  const due = wsId ? accessReviewDue(wsId, Date.now()) : false;
  const flagged = review ? review.flagged.length : 0;

  // The calm quarterly nudge: at most once per mount, only when the
  // review is due AND something genuinely needs a trustee's eye.
  useEffect(() => {
    if (!wsId || !canReview || !review || remindedRef.current) return;
    if (!due || flagged === 0 || dismissed) return;
    remindedRef.current = true;
    if (!user?.uid) return;
    void emitNotify(user.uid, {
      kind: 'org',
      priority: 'gentle',
      title: {
        en: 'Time for a short access review',
        bn: 'ছোট্ট একটি প্রবেশাধিকার পর্যালোচনার সময় হয়েছে',
        hi: 'एक छोटी पहुँच-समीक्षा का समय है',
      },
      body: {
        en: `${flagged} member${flagged === 1 ? '' : 's'} to look at in Settings — who can see money and records, and whether that is still right.`,
        bn: `সেটিংসে ${flagged} জন সদস্যকে দেখার আছে — কে টাকা ও রেকর্ড দেখতে পারেন, এবং তা এখনো ঠিক আছে কি না।`,
        hi: `सेटिंग्स में ${flagged} सदस्य देखने योग्य हैं — कौन धन और रिकॉर्ड देख सकता है, और क्या यह अब भी सही है।`,
      },
      dedupeKey: `access-review:${wsId}:${Math.floor(Date.now() / (90 * 24 * 3600 * 1000))}`,
    }).catch(() => undefined);
  }, [wsId, canReview, review, due, flagged, dismissed, user?.uid]);

  if (!canReview || !activeWorkspace || !wsId) return null;
  if (dismissed) return null;

  const lastAt = accessReviewClockRead(wsId);
  const showRows = due || expanded;

  const openMember = (row: AccessReviewRow) => {
    try {
      sessionStorage.setItem('sb_focus_member', row.member.uid);
    } catch {
      /* private mode — the desk simply opens un-focused */
    }
    window.dispatchEvent(
      new CustomEvent('sanatani:navigate', { detail: { module: 'membership' } })
    );
  };

  const markDone = () => {
    accessReviewClockMark(wsId, Date.now());
    setDismissed(true);
  };

  const chip = (row: AccessReviewRow) => {
    const base =
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border';
    if (row.highlights.includes('expired'))
      return (
        <span className={`${base} bg-red-50 text-red-700 border-red-200`}>
          <XCircle size={11} />
          {safeTranslate('ar_expired', 'Expired', 'মেয়াদ শেষ', 'समाप्त')}
        </span>
      );
    if (row.highlights.includes('sensitive-no-expiry'))
      return (
        <span className={`${base} bg-amber-50 text-amber-800 border-amber-300`}>
          <ShieldAlert size={11} />
          {safeTranslate('ar_sensitive', 'Sensitive role · no expiry', 'সংবেদনশীল ভূমিকা · মেয়াদ নেই', 'संवेदनशील भूमिका · कोई समाप्ति नहीं')}
        </span>
      );
    if (row.highlights.includes('expiring-soon'))
      return (
        <span className={`${base} bg-amber-50 text-amber-800 border-amber-300`}>
          <CalendarClock size={11} />
          {safeTranslate('ar_expiring', 'Expiring soon', 'শীঘ্রই মেয়াদ শেষ', 'शीघ्र समाप्त')}
        </span>
      );
    if (row.highlights.includes('dormant'))
      return (
        <span className={`${base} bg-gray-50 text-gray-600 border-gray-200`}>
          <MoonStar size={11} />
          {safeTranslate('ar_dormant', 'Quiet 90+ days', '৯০+ দিন নীরব', '90+ दिन शांत')}
        </span>
      );
    return null;
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-emerald-200 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3 uppercase tracking-widest">
        <ShieldCheck size={18} className="text-emerald-600" />
        {safeTranslate('ar_title', 'Access Review', 'প্রবেশাধিকার পর্যালোচনা', 'पहुँच समीक्षा')}
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-4">
        {safeTranslate(
          'ar_body',
          'These people can see this organisation\u2019s money and records — is that still right? A short look, about once a quarter, keeps trust strong. This card only shows; any change happens in the member editor, with the usual safeguards.',
          'এই মানুষগুলো এই সংগঠনের টাকা ও রেকর্ড দেখতে পারেন — তা কি এখনো ঠিক আছে? প্রতি ত্রৈমাসিকে একবার ছোট্ট করে দেখা আস্থা দৃঢ় রাখে। এই কার্ড শুধু দেখায়; যেকোনো পরিবর্তন সদস্য সম্পাদকে হয়, স্বাভাবিক সুরক্ষাসহ।',
          'ये लोग इस संगठन के धन और रिकॉर्ड देख सकते हैं — क्या यह अब भी सही है? तिमाही में एक बार की छोटी-सी समीक्षा विश्वास मज़बूत रखती है। यह कार्ड केवल दिखाता है; कोई भी बदलाव सदस्य संपादक में, सामान्य सुरक्षा के साथ होता है।',
        )}
      </p>

      {!review ? (
        <p className="text-xs text-gray-400 font-semibold">
          {safeTranslate('ar_loading', 'Reading the recent record…', 'সাম্প্রতিক রেকর্ড পড়া হচ্ছে…', 'हाल का रिकॉर्ड पढ़ा जा रहा है…')}
        </p>
      ) : !showRows ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold text-gray-700">
            {lastAt
              ? safeTranslate(
                  'ar_last_done',
                  `Last marked reviewed on ${new Date(lastAt).toLocaleDateString()}.`,
                  `সর্বশেষ পর্যালোচিত চিহ্নিত: ${new Date(lastAt).toLocaleDateString()}।`,
                  `अंतिम बार समीक्षित चिह्नित: ${new Date(lastAt).toLocaleDateString()}।`,
                )
              : safeTranslate('ar_none_yet', 'Not reviewed yet.', 'এখনো পর্যালোচনা হয়নি।', 'अभी समीक्षा नहीं हुई।')}
            {flagged > 0
              ? ' ' +
                safeTranslate(
                  'ar_flagged_now',
                  `${flagged} to look at.`,
                  `${flagged} জনকে দেখার আছে।`,
                  `${flagged} देखने योग्य हैं।`,
                )
              : ''}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-[44px] px-4 rounded-xl border border-emerald-300 text-emerald-700 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors"
          >
            {safeTranslate('ar_review_anyway', 'Review anyway', 'তবু পর্যালোচনা করুন', 'फिर भी समीक्षा करें')}
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-100 mb-4">
            {review.rows.map((row) => {
              const tpl = row.member.templateId ? templateById(row.member.templateId) : undefined;
              const roleLabel = tpl ? `${row.effectiveRole} · ${t(tpl.nameKey)}` : row.effectiveRole;
              const scopeLabel =
                row.deskScope == null
                  ? safeTranslate('ar_scope_all', 'All desks', 'সব ডেস্ক', 'सभी डेस्क')
                  : row.deskScope.length === 0
                    ? safeTranslate('ar_scope_none', 'No desks', 'কোনো ডেস্ক নয়', 'कोई डेस्क नहीं')
                    : safeTranslate(
                        'ar_scope_n',
                        `${row.deskScope.length} desks`,
                        `${row.deskScope.length}টি ডেস্ক`,
                        `${row.deskScope.length} डेस्क`,
                      );
              const expiryLabel =
                row.expiry === 'none'
                  ? safeTranslate('ar_no_expiry', 'No expiry set', 'মেয়াদ নির্ধারিত নয়', 'कोई समाप्ति तय नहीं')
                  : row.member.roleExpiresAt
                    ? new Date(row.member.roleExpiresAt).toLocaleDateString()
                    : '';
              return (
                <li key={row.member.uid}>
                  <button
                    type="button"
                    onClick={() => openMember(row)}
                    className="w-full flex items-center gap-3 py-3 text-left min-h-[44px] hover:bg-emerald-50/60 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900 truncate">
                        {row.member.displayName || row.member.email || row.member.uid}
                      </span>
                      <span className="block text-[11px] text-gray-500 font-semibold truncate">
                        {roleLabel} · {scopeLabel} · {expiryLabel}
                      </span>
                    </span>
                    {chip(row)}
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
          {review.rows.length === 0 && (
            <p className="text-xs text-gray-500 font-semibold mb-4">
              {safeTranslate('ar_no_members', 'No members yet.', 'এখনো কোনো সদস্য নেই।', 'अभी कोई सदस्य नहीं।')}
            </p>
          )}
          <button
            type="button"
            onClick={markDone}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow transition-all min-h-[44px]"
          >
            <ShieldCheck size={16} />
            {safeTranslate('ar_mark_done', 'Looks right — mark reviewed', 'ঠিক আছে — পর্যালোচিত চিহ্নিত করুন', 'सही है — समीक्षित चिह्नित करें')}
          </button>
        </>
      )}
    </div>
  );
};

export default AccessReviewCard;
