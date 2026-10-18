/**
 * Sanatani Bandhan — Campus pages (Phase 1: temple campus maps).
 * ============================================================================
 * Routes (registered in App.tsx):
 *   /org/:orgId/campus         → CampusPage        (devotee-facing visitor map)
 *   /org/:orgId/campus/manage  → CampusManagePage  (trustee-only map builder)
 *
 * The map program (src/campus/) was fully built but had no route or nav
 * entry — visitors could never reach it. These pages wire it into the app:
 * the visitor view is linked from the org's public page ("Explore the
 * Campus Map"), and trustees reach the builder from the same page.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { ArrowLeft, MapPin, ShieldAlert, Loader2, PencilLine } from 'lucide-react';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useMembership } from '../context/MembershipContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import type { OrgPage as OrgPageType } from '../types/membership';
import { CampusView } from '../campus/CampusView';
import { CampusBuilder } from '../campus/CampusBuilder';
import type { OrgKind } from '../campus/types';
import { OWNER_EMAIL } from '../lib/firestoreAdmin';

/* Resolve an org page by Firestore doc id OR public slug — the same lookup
 * OrgPublicPage uses, so slugs keep working on campus URLs. */
function useOrgPage() {
  const { orgId: param } = useParams<{ orgId: string }>();
  const [page, setPage] = useState<OrgPageType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!param) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let p: OrgPageType | null = null;
      try {
        const snap = await getDoc(doc(db, 'orgPages', param));
        if (snap.exists()) {
          p = snap.data() as OrgPageType;
        } else {
          const qs = await getDocs(
            query(collection(db, 'orgPages'), where('publicSlug', '==', param), limit(1))
          );
          if (!qs.empty) p = qs.docs[0].data() as OrgPageType;
        }
      } catch {
        p = null;
      }
      if (!cancelled) {
        setPage(p);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [param]);

  return { param, page, loading };
}

/** Map the org page's workspace type onto the campus builder's OrgKind. */
function orgKindOf(type: string | undefined): OrgKind {
  const t = (type || '').toLowerCase();
  if (t.includes('goshala') || t.includes('gaushala')) return 'goshala';
  if (t.includes('ashram') || t.includes('matha') || t.includes('dharamshala')) return 'ashram';
  if (t.includes('gurukul') || t.includes('pathshala') || t.includes('school') || t.includes('vidyalaya')) return 'gurukul';
  if (t.includes('sangha') || t.includes('sangh') || t.includes('samiti') || t.includes('parishad')) return 'sangha';
  if (t.includes('mandir') || t.includes('temple') || t.includes('devalaya') || t.includes('kovil') || t.includes('devasthan')) return 'mandir';
  return 'other';
}

function Shell({
  kicker,
  title,
  subtitle,
  backTo,
  backLabel,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-amber-50/60 pb-20">
      <header className="bg-gradient-to-br from-[#431407] via-[#7c2d12] to-[#92400e] text-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <button
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-2 text-amber-200/90 hover:text-white text-xs font-bold min-h-[44px] px-2 -ml-2 rounded-xl"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>
          <p className="text-amber-200/70 text-[11px] font-black uppercase tracking-widest mt-2">{kicker}</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1 flex items-center gap-2">
            <MapPin size={26} className="shrink-0 text-amber-300" />
            {title}
          </h1>
          <p className="text-amber-100/80 text-sm mt-1">{subtitle}</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 mt-4">{children}</main>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-stone-400">
      <Loader2 size={28} className="animate-spin mb-3" />
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}

function NotFound({ backTo, backLabel, message }: { backTo: string; backLabel: string; message: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-amber-50/60 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🪔</p>
        <p className="text-stone-700 font-bold">{message}</p>
        <button
          onClick={() => navigate(backTo)}
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-700 text-white text-sm font-black"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visitor view — /org/:orgId/campus                                   */
/* ------------------------------------------------------------------ */

export const CampusPage: React.FC = () => {
  const { param, page, loading } = useOrgPage();
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);

  useEffect(() => {
    if (page) document.title = `${page.name} — ${safeTranslate('campus_title', 'Campus Map', 'ক্যাম্পাস মানচিত্র', 'परिसर मानचित्र')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/60">
        <LoadingState label={T('campus_loading', 'Opening the campus…', 'ক্যাম্পাস খোলা হচ্ছে…', 'परिसर खोला जा रहा…')} />
      </div>
    );
  }
  if (!page) {
    return (
      <NotFound
        backTo="/orgs"
        backLabel={T('campus_back_orgs', 'Browse organisations', 'সংস্থা দেখুন', 'संस्थाएँ देखें')}
        message={T('campus_not_found', 'We could not find this organisation’s page.', 'এই প্রতিষ্ঠানের পেজ খুঁজে পাওয়া যায়নি।', 'इस संस्था का पेज नहीं मिला।')}
      />
    );
  }

  const canonical = `/org/${page.publicSlug || page.orgId}`;
  return (
    <Shell
      kicker={page.name}
      title={T('campus_title', 'Campus Map', 'ক্যাম্পাস মানচিত্র', 'परिसर मानचित्र')}
      subtitle={T(
        'campus_sub',
        'Every shrine, counter and quiet corner — drawn by the temple itself. 🗺️',
        'প্রতিটি মন্দির, কাউন্টার ও শান্ত কোণ — মন্দিরের নিজের আঁকা। 🗺️',
        'हर मंदिर, काउंटर और शांत कोना — मंदिर के अपने हाथों से। 🗺️'
      )}
      backTo={canonical}
      backLabel={T('campus_back_org', 'Back to organisation', 'প্রতিষ্ঠানে ফিরুন', 'संस्था पर वापस जाएँ')}
    >
      <CampusView orgId={page.orgId} orgName={page.name} />
      <p className="text-center text-[11px] text-stone-400 font-semibold mt-6">
        {T('campus_visit_cta', 'Planning a visit? See darshan timings on the ', 'দর্শনের পরিকল্পনা? দেখুন ', 'दर्शन की योजना? देखें ')}
        <Link to={canonical} className="text-amber-700 font-bold underline underline-offset-2">
          {T('campus_visit_cta_link', 'organisation page', 'প্রতিষ্ঠানের পেজে দর্শনের সময়', 'संस्था पेज पर दर्शन समय')}
        </Link>
        .
      </p>
    </Shell>
  );
};

/* ------------------------------------------------------------------ */
/* Trustee builder — /org/:orgId/campus/manage (admin-guarded)         */
/* ------------------------------------------------------------------ */

const MANAGING_ROLES = ['superadmin', 'trustee'];

export const CampusManagePage: React.FC = () => {
  const { param, page, loading } = useOrgPage();
  const navigate = useNavigate();
  const { safeTranslate } = useLanguage();
  const { myMemberships } = useMembership();
  const { firebaseUser } = useAuthWorkspace();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);

  const uid = firebaseUser?.uid || '';
  const isOwner =
    (firebaseUser?.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();
  const myRole = page
    ? (myMemberships.find((m) => m.workspaceId === page.orgId)?.role || '').toLowerCase()
    : '';
  const canManage = isOwner || MANAGING_ROLES.includes(myRole);

  useEffect(() => {
    if (page) document.title = `${page.name} — ${safeTranslate('campus_manage_title', 'Draw Campus Map', 'ক্যাম্পাস মানচিত্র আঁকুন', 'परिसर मानचित्र बनाएँ')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/60">
        <LoadingState label={T('campus_loading', 'Opening the campus…', 'ক্যাম্পাস খোলা হচ্ছে…', 'परिसर खोला जा रहा…')} />
      </div>
    );
  }
  if (!page) {
    return (
      <NotFound
        backTo="/orgs"
        backLabel={T('campus_back_orgs', 'Browse organisations', 'সংস্থা দেখুন', 'संस्थाएँ देखें')}
        message={T('campus_not_found', 'We could not find this organisation’s page.', 'এই প্রতিষ্ঠানের পেজ খুঁজে পাওয়া যায়নি।', 'इस संस्था का पेज नहीं मिला।')}
      />
    );
  }

  const canonical = `/org/${page.publicSlug || page.orgId}`;

  if (!firebaseUser) {
    return (
      <NotFound
        backTo={`/login?next=${encodeURIComponent(`/org/${param}/campus/manage`)}`}
        backLabel={T('campus_signin', 'Sign in', 'সাইন ইন করুন', 'साइन इन करें')}
        message={T(
          'campus_signin_needed',
          'Please sign in as a trustee of this organisation to draw its campus map.',
          'এই প্রতিষ্ঠানের ক্যাম্পাস মানচিত্র আঁকতে ট্রাস্টি হিসেবে সাইন ইন করুন।',
          'इस संस्था का परिसर मानचित्र बनाने के लिए ट्रस्टी के रूप में साइन इन करें।'
        )}
      />
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-amber-50/60 flex items-center justify-center px-4">
        <div className="text-center max-w-sm bg-white rounded-3xl border border-stone-200 p-8">
          <ShieldAlert size={36} className="mx-auto text-amber-600 mb-3" />
          <h1 className="text-lg font-black text-stone-900">
            {T('campus_locked_title', 'Trustees only 🪔', 'শুধুমাত্র ট্রাস্টিদের জন্য 🪔', 'केवल ट्रस्टियों के लिए 🪔')}
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            {T(
              'campus_locked_body',
              `Only trustees of ${page.name} can draw its campus map. You can still explore the visitor map.`,
              `শুধুমাত্র ${page.name}-এর ট্রাস্টিরা ক্যাম্পাস মানচিত্র আঁকতে পারেন। আপনি এখনও দর্শনার্থী মানচিত্র দেখতে পারেন।`,
              `केवल ${page.name} के ट्रस्टी परिसर मानचित्र बना सकते हैं। आप अभी भी दर्शक मानचित्र देख सकते हैं।`
            )}
          </p>
          <div className="flex flex-col gap-2 mt-5">
            <button
              onClick={() => navigate(`${canonical}/campus`)}
              className="px-5 py-3 min-h-[44px] rounded-xl bg-amber-700 text-white text-sm font-black"
            >
              {T('campus_view_map', 'View campus map', 'ক্যাম্পাস মানচিত্র দেখুন', 'परिसर मानचित्र देखें')}
            </button>
            <button
              onClick={() => navigate(canonical)}
              className="px-5 py-3 min-h-[44px] rounded-xl bg-white border border-stone-200 text-stone-700 text-sm font-black"
            >
              {T('campus_back_org', 'Back to organisation', 'প্রতিষ্ঠানে ফিরুন', 'संस्था पर वापस जाएँ')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Shell
      kicker={page.name}
      title={T('campus_manage_title', 'Draw Campus Map', 'ক্যাম্পাস মানচিত্র আঁকুন', 'परिसर मानचित्र बनाएँ')}
      subtitle={T(
        'campus_manage_sub',
        'Draw your temple in 10 minutes — devotees will find every corner with ease. 🙏',
        '১০ মিনিটে আপনার মন্দির আঁকুন — ভক্তরা সহজে প্রতিটি কোণ খুঁজে পাবেন। 🙏',
        '१० मिनट में अपना मंदिर बनाएँ — भक्त हर कोना आसानी से पाएँगे। 🙏'
      )}
      backTo={`${canonical}/campus`}
      backLabel={T('campus_view_map', 'View campus map', 'ক্যাম্পাস মানচিত্র দেখুন', 'परिसर मानचित्र देखें')}
    >
      <CampusBuilder
        orgId={page.orgId}
        orgName={page.name}
        orgKind={orgKindOf(page.type)}
        uid={uid}
        onSaved={() => navigate(`${canonical}/campus`)}
      />
      <p className="text-center text-[11px] text-stone-400 font-semibold mt-6 flex items-center justify-center gap-1.5">
        <PencilLine size={13} />
        {T(
          'campus_manage_note',
          'Changes publish instantly to the visitor map.',
          'পরিবর্তন দর্শনার্থী মানচিত্রে সঙ্গে সঙ্গে প্রকাশিত হয়।',
          'बदलाव दर्शक मानचित्र पर तुरंत प्रकाशित होते हैं।'
        )}
      </p>
    </Shell>
  );
};
