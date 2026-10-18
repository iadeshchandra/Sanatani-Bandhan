import React, { useMemo, useState, lazy, Suspense } from 'react';
import { SangamProvider, useSangam, type AuthorInfo } from './sangamStore';
import { useSolo } from '../solo/SoloContext';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';
import { useMyJyotishIdentity } from '../jyotish/useMyJyotishIdentity';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { FeedTab } from './FeedTab';
import { CirclesTab } from './CirclesTab';
import { SevaBoardTab } from './SevaBoardTab';
import { EventsTab } from './EventsTab';
import { PagesTab } from './PagesTab';
import { VerificationBadge, useLocaleText, T } from './ui';

// Sangam Watch — lazy-loaded (video UI is heavy, loaded on demand).
const WatchTab = lazy(() => import('./watch/WatchTab').then((m) => ({ default: m.WatchTab })));

/* Sangam — the Sanatani social layer (personal view).
 * =====================================================================
 * Rendered ONLY inside the Solo (personal) shell — session-kind
 * separation means organisation internals can never leak into the
 * feed, and the feed never leaks into the ERP.
 *
 * TRUST: every actor is identity-anchored (SAN id). Purohit/jyotish
 * authors carry their verification tier; organisation page posts are
 * trustee-gated and badged OFFICIAL. No ads, no data selling — stated
 * plainly. Chronological feed, honest counts.
 */

type SangamTab = 'feed' | 'watch' | 'circles' | 'seva' | 'events' | 'pages';

const InnerSangam: React.FC = () => {
  const { profile } = useSolo();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { identity: jyotishIdentity } = useMyJyotishIdentity();
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [tab, setTab] = useState<SangamTab>('feed');
  const [postAsPage, setPostAsPage] = useState(false);

  const uid = profile?.id ? (profile as unknown as { uid?: string }).uid || 'anon' : 'anon';
  // The SAN profile id IS the display id; the firebase uid keys follows/ashirvad.
  // SanataniProfile carries both: `id` (SAN-XXXXXX) and `uid` (Firebase uid).
  const fbUid = (profile as unknown as { uid?: string } | null)?.uid || 'anon';

  const author: AuthorInfo = useMemo(() => {
    const base = {
      uid: fbUid,
      name: profile?.displayName || 'Sanatani',
      sanId: profile?.id || 'SAN-…',
      kind: 'devotee' as const,
    };
    // A verified guide posts with their tier badge — same tier language everywhere.
    if (purohitIdentity) {
      return { ...base, kind: 'purohit' as const, roleId: (purohitIdentity as { id?: string }).id, tier: (purohitIdentity as { verificationTier?: AuthorInfo['tier'] }).verificationTier };
    }
    if (jyotishIdentity) {
      return { ...base, kind: 'jyotish' as const, roleId: (jyotishIdentity as { id?: string }).id, tier: (jyotishIdentity as { verificationTier?: AuthorInfo['tier'] }).verificationTier };
    }
    return base;
  }, [profile, purohitIdentity, jyotishIdentity, fbUid]);

  // Trustee page-posting: available when the user's org session carries a
  // trustee role. In the solo session we read the last active workspace.
  const trusteeOrg = useMemo(() => {
    const ws = activeWorkspace as unknown as { id?: string; name?: string; type?: string } | null;
    const role = String(currentRole || '').toLowerCase();
    const isTrustee = role === 'trustee' || role === 'superadmin';
    if (ws?.id && isTrustee && !String(ws.id).startsWith('DEMO_')) return { orgId: ws.id, orgName: ws.name || ws.id };
    // Demo workspaces: the demo user is a Trustee — allow page posting so the
    // flow is testable, clearly labeled as the demo sandbox.
    if (ws?.id && isTrustee) return { orgId: ws.id, orgName: ws.name || ws.id };
    return null;
  }, [activeWorkspace, currentRole]);

  const postingAs = postAsPage && trusteeOrg ? { orgId: trusteeOrg.orgId, orgName: trusteeOrg.orgName } : undefined;

  const TABS: Array<{ id: SangamTab; en: string; bn: string; hi: string; icon: string }> = [
    { id: 'feed', en: 'Feed', bn: 'ফিড', hi: 'फ़ीड', icon: '🪔' },
    { id: 'watch', en: 'Watch', bn: 'দেখুন', hi: 'देखें', icon: '📺' },
    { id: 'circles', en: 'Circles', bn: 'বৃত্ত', hi: 'मंडल', icon: '⭕' },
    { id: 'seva', en: 'Community Board', bn: 'কমিউনিটি বোর্ড', hi: 'सामुदायिक बोर्ड', icon: '🤲' },
    { id: 'events', en: 'Events', bn: 'অনুষ্ঠান', hi: 'आयोजन', icon: '📅' },
    { id: 'pages', en: 'Pages', bn: 'পৃষ্ঠা', hi: 'पृष्ठ', icon: '🏛️' },
  ];

  return (
    <div>
      {/* Sangam header */}
      <div className="rounded-3xl bg-gradient-to-r from-orange-700 via-amber-700 to-orange-800 p-5 mb-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl" aria-hidden>🪔</div>
          <div className="min-w-0">
            <h1 className="text-xl font-black flex items-center gap-2 flex-wrap">
              <T en="Sangam" bn="সঙ্গম" hi="संगम" />
              {(author.kind === 'purohit' || author.kind === 'jyotish') && (
                <VerificationBadge tier={author.tier} kind={author.kind} size="md" />
              )}
            </h1>
            <p className="text-orange-100/90 text-xs mt-0.5">
              {tr('The confluence — every Sanatani, one community.', 'মিলন — প্রতিটি সনাতনী, এক সম্প্রদায়।', 'संगम — प्रत्येक सनातनी, एक समुदाय।')}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-bold">
          <span className="bg-white/15 rounded-full px-2.5 py-1">🚫 {tr('No ads', 'বিজ্ঞাপন নেই', 'विज्ञापन नहीं')}</span>
          <span className="bg-white/15 rounded-full px-2.5 py-1">🔒 {tr('No data selling', 'তথ্য বিক্রি নেই', 'डेटा बिक्री नहीं')}</span>
          <span className="bg-white/15 rounded-full px-2.5 py-1">🕐 {tr('Chronological feed', 'কালানুক্রমিক ফিড', 'कालानुक्रमिक फ़ीड')}</span>
        </div>
      </div>

      {/* Honest scope */}
      <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-xs text-stone-600">
        <span className="font-bold text-orange-800">⚖️ {tr('Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
        {tr(
          'Sangam is your personal community space. Posting as yourself is always free. Organisation page posts need a trustee role and are badged OFFICIAL.',
          'সঙ্গম আপনার ব্যক্তিগত সম্প্রদায়।',
          'संगम आपका व्यक्तिगत समुदाय है।'
        )}
      </div>

      {/* Post-as selector for trustees */}
      {trusteeOrg && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-stone-500">{tr('Posting as', 'হিসেবে পোস্ট', 'के रूप में पोस्ट')}:</span>
          <button
            onClick={() => { setPostAsPage(false); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] ${!postAsPage ? 'bg-temple-950 text-amber-200' : 'bg-white border border-stone-200 text-stone-600'}`}
          >
            🙏 {author.name} <span className="font-mono opacity-70">({author.sanId})</span>
          </button>
          <button
            onClick={() => { setPostAsPage(true); showToast(`Posting as ${trusteeOrg.orgName} — badged OFFICIAL`, 'info'); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-1.5 ${postAsPage ? 'bg-indigo-600 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
          >
            🏛️ {trusteeOrg.orgName}
            <VerificationBadge official size="sm" />
          </button>
        </div>
      )}

      {/* Tab bar */}
      <nav className="flex gap-1.5 overflow-x-auto pb-1 mb-4" aria-label="Sangam">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-colors ${tab === t.id ? 'bg-orange-600 text-white shadow' : 'bg-white border border-stone-200 text-stone-600 hover:bg-orange-50'}`}
          >
            {t.icon} {t.en}
          </button>
        ))}
      </nav>

      {tab === 'feed' && <FeedTab author={author} pageContext={postingAs} />}
      {tab === 'watch' && (
        <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>}>
          <WatchTab author={author} />
        </Suspense>
      )}
      {tab === 'circles' && <CirclesTab author={author} />}
      {tab === 'seva' && <SevaBoardTab author={author} />}
      {tab === 'events' && <EventsTab author={author} />}
      {tab === 'pages' && <PagesTab author={author} />}
    </div>
  );
};

export const SangamView: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  return (
    <SangamProvider uid={uid}>
      <InnerSangam />
    </SangamProvider>
  );
};
