/**
 * Seva Professional Program — Phase 1
 * Unified professional profile page — ONE page per person, both specializations.
 * ============================================================================
 * Route: /seva/pro/:uid
 *
 * Shows the purohit AND jyotish identities of one person together:
 * header "Pandit Ramesh Shastri — Purohit (VERIFIED ✓) + Jyotishi (VERIFIED ✓)".
 * Gracefully degrades to a single specialization when the person has only one,
 * with a gentle cross-discovery card for the other.
 *
 * Props:
 * - viewSpec?: 'purohit' | 'jyotish' — when set (by ProfessionalViewSwitcher),
 *   only that specialization is shown so the professional can preview exactly
 *   what devotees see per role.
 * - uidOverride?: string — lets dashboards embed the page without routing.
 *
 * Trilingual EN/BN/HI via useLanguage().safeTranslate (existing pattern).
 * Warm, dignified Sanatani tone everywhere — verification reads as an honor.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2, Check, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { PUROHIT_TIER_META } from '../../types/purohit';
import {
  fetchUnifiedProfessional,
  type SpecializationKind,
  type UnifiedProfessional,
} from '../../lib/sevaPro/profile';
import {
  Chip,
  HonorBadge,
  Monogram,
  SectionCard,
  Skeleton,
  Stars,
} from './sevaProUi';
import { BookingSheet } from './BookingSheet';
import { ProviderGratitudeWall } from './ProviderGratitudeWall';
import {
  getProviderBlessings,
  listProviderGigs,
  type Gig,
  type ProviderBlessings,
} from '../../lib/marketplace';
import { listProviderServiceCards } from '../../sangam/providerCards';
import type { SangamPost } from '../../sangam/types';
import { formatServiceDakshina } from '../../sangam/ServiceCardPost';
import { formatMoney } from '../../lib/money';
import { Chat } from '../../chat/Chat';
import { getOrCreateDirectChat } from '../../chat/chatService';
import type { ChatParticipant } from '../../chat/types';

interface ProfilePageProps {
  viewSpec?: SpecializationKind;
  uidOverride?: string;
  hideBookCta?: boolean;
}

export const UnifiedProfessionalProfile: React.FC<ProfilePageProps> = ({
  viewSpec,
  uidOverride,
  hideBookCta = false,
}) => {
  const { uid: routeUid } = useParams<{ uid: string }>();
  const uid = uidOverride || routeUid || '';
  const navigate = useNavigate();
  const { safeTranslate, language } = useLanguage();
  const tx = (en: string, bn: string, hi: string) => safeTranslate('', en, bn, hi);
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const myUid = ((firebaseUser as { uid?: string; displayName?: string | null; photoURL?: string | null } | null)?.uid || '') as string;

  const [profile, setProfile] = useState<UnifiedProfessional | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTab, setBookingTab] = useState<SpecializationKind | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatStarting, setChatStarting] = useState(false);
  // QUEUED #22 — the silo bridge: this provider's marketplace gigs AND
  // Sangam seva notices, plus the blessings both surfaces earned. Each
  // fetch fails quiet — the profile stands without them.
  const [sevaGigs, setSevaGigs] = useState<Gig[]>([]);
  const [sevaCards, setSevaCards] = useState<SangamPost[]>([]);
  const [sevaBlessings, setSevaBlessings] = useState<ProviderBlessings | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const g = await listProviderGigs(uid);
        if (!cancelled) setSevaGigs(g);
      } catch { /* enhancement only */ }
      try {
        const c = await listProviderServiceCards(uid);
        if (!cancelled) setSevaCards(c);
      } catch { /* enhancement only */ }
      try {
        const b = await getProviderBlessings(uid);
        if (!cancelled) setSevaBlessings(b);
      } catch { /* enhancement only */ }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchUnifiedProfessional(uid)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setLoading(false);
        if (!p) setLoadError(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const openBooking = (kind: SpecializationKind) => {
    setBookingTab(kind);
    setBookingOpen(true);
  };

  const openUnifiedBooking = () => {
    // Both specializations: open the sheet on the tabbed view.
    setBookingTab(profile?.hasPurohit ? 'purohit' : 'jyotish');
    setBookingOpen(true);
  };

  /** Contact-before-commit (spec §4): chat with the professional before
   *  booking. Opens (or creates) the 1:1 thread and deep-links into it. */
  const openChat = async () => {
    if (!profile) return;
    if (!myUid) {
      showToast(
        tx('Sign in to chat with this professional', 'এই পেশাদারের সঙ্গে চ্যাট করতে সাইন ইন করুন', 'इस पेशेवर से चैट करने हेतु साइन इन करें'),
        'info'
      );
      return;
    }
    if (myUid === profile.uid) return;
    setChatStarting(true);
    try {
      const selfInfo: ChatParticipant = {
        uid: myUid,
        displayName:
          (firebaseUser as { displayName?: string | null } | null)?.displayName ||
          tx('Sanatani', 'সনাতনী', 'सनातनी'),
        photoUrl: ((firebaseUser as { photoURL?: string | null } | null)?.photoURL as string) || undefined,
      };
      const peerInfo: ChatParticipant = {
        uid: profile.uid,
        displayName: profile.displayName,
        photoUrl: profile.photoURL || undefined,
      };
      const id = await getOrCreateDirectChat(myUid, profile.uid, selfInfo, peerInfo);
      setChatId(id);
      setChatOpen(true);
    } catch (e: any) {
      showToast(
        e?.message || tx('Could not open chat', 'চ্যাট খোলা যায়নি', 'चैट नहीं खुला'),
        'error'
      );
    }
    setChatStarting(false);
  };

  const shareProfile = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/seva/pro/${profile.uid}`;
    const shareData = {
      title: `${profile.displayName} — Sanatani Bandhan`,
      text: tx(
        `Blessings from ${profile.displayName} — verified seva professional on Sanatani Bandhan.`,
        `${profile.displayName}-এর আশীর্বাদ — সনাতনী বন্ধনে যাচাইকৃত সেবা পেশাদার।`,
        `${profile.displayName} का आशीर्वाद — सनातनी बंधन पर सत्यापित सेवा पेशेवर।`
      ),
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user dismissed the share sheet — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
    } catch {
      /* clipboard unavailable — nothing more to offer */
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4" aria-busy="true">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">
          🪔
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">
          {tx(
            'Profile not found',
            'প্রোফাইল পাওয়া যায়নি',
            'प्रोफ़ाइल नहीं मिला'
          )}
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          {tx(
            'This seva professional has no public profile yet, or the connection was lost. Please check your connection and try again.',
            'এই সেবা পেশাদারের এখনও কোনো পাবলিক প্রোফাইল নেই, অথবা সংযোগ বিচ্ছিন্ন হয়েছে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
            'इस सेवा पेशेवर का अभी कोई सार्वजनिक प्रोफ़ाइल नहीं है, या कनेक्शन टूट गया है। कृपया अपना कनेक्शन जाँचें और पुनः प्रयास करें।'
          )}
        </p>
      </div>
    );
  }

  const showPurohit = profile.hasPurohit && (!viewSpec || viewSpec === 'purohit');
  const showJyotish = profile.hasJyotish && (!viewSpec || viewSpec === 'jyotish');
  const dual = profile.hasPurohit && profile.hasJyotish;
  const singleKind: SpecializationKind = profile.hasPurohit ? 'purohit' : 'jyotish';

  const bios: Array<{ kind: SpecializationKind; text: string }> = [];
  if (profile.purohit?.bio) bios.push({ kind: 'purohit', text: profile.purohit.bio });
  if (profile.jyotish?.bio) bios.push({ kind: 'jyotish', text: profile.jyotish.bio });

  // One-liner headline (spec §2 — the Fiverr rule: who + specialty + proof).
  // Built only from real profile data; absent parts are simply omitted.
  const headlineParts: string[] = [];
  const firstSpec = profile.purohit?.specializations?.[0] || profile.jyotish?.specializations?.[0];
  if (firstSpec) headlineParts.push(firstSpec);
  if (profile.experienceYears > 0)
    headlineParts.push(
      tx(
        `${profile.experienceYears} yrs of sadhana`,
        `${profile.experienceYears} বছরের সাধনা`,
        `${profile.experienceYears} वर्षों की साधना`
      )
    );
  if (profile.serviceAreas[0]) headlineParts.push(profile.serviceAreas[0]);
  const headline = headlineParts.join(' · ');

  return (
    <div className={`max-w-3xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 ${hideBookCta ? 'pb-10' : 'pb-28'}`}>
      {/* ============ HERO ============ */}
      <header className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-3xl border border-amber-200 shadow-sm p-5 sm:p-6">
        <button
          type="button"
          onClick={shareProfile}
          aria-label={tx('Share profile', 'প্রোফাইল শেয়ার করুন', 'प्रोफ़ाइल साझा करें')}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full bg-white/85 border border-amber-200 text-amber-900 text-xs font-bold shadow-sm transition active:scale-95 hover:bg-white"
        >
          {shareState === 'copied' ? (
            <Check className="w-4 h-4 text-green-700" aria-hidden="true" />
          ) : (
            <Share2 className="w-4 h-4" aria-hidden="true" />
          )}
          {shareState === 'copied'
            ? tx('Copied', 'কপি হয়েছে', 'कॉपी हुआ')
            : tx('Share', 'শেয়ার', 'साझा करें')}
        </button>
        <div className="flex items-start gap-4">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <Monogram name={profile.displayName} size="w-20 h-20 sm:w-24 sm:h-24 text-3xl" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
              {profile.displayName}
            </h1>
            {/* Role line: "Purohit (VERIFIED ✓) + Jyotishi (VERIFIED ✓)" */}
            <p className="text-sm font-semibold text-amber-900 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {showPurohit && (
                <span className="inline-flex items-center gap-1">
                  {tx('Purohit', 'পুরোহিত', 'पुरोहित')}
                  <span aria-hidden="true" className="text-green-700">
                    ✓
                  </span>
                </span>
              )}
              {showPurohit && showJyotish && <span aria-hidden="true">+</span>}
              {showJyotish && (
                <span className="inline-flex items-center gap-1">
                  {tx('Jyotishi', 'জ্যোতিষী', 'ज्योतिषी')}
                  <span aria-hidden="true" className="text-green-700">
                    ✓
                  </span>
                </span>
              )}
            </p>
            {/* One-liner headline: specialty + proof (spec §2) */}
            {headline && (
              <p className="text-[13px] text-stone-600 mt-1">{headline}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {showPurohit && profile.purohit && (
                <HonorBadge tier={profile.purohit.verificationTier} role="Purohit" />
              )}
              {showJyotish && profile.jyotish && (
                <HonorBadge tier={profile.jyotish.verificationTier} role="Jyotishi" />
              )}
              {profile.sanId && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-indigo-100 border border-indigo-200 text-indigo-900 min-h-[32px]"
                  title={tx(
                    'Linked Universal Sanatani identity',
                    'সংযুক্ত সর্বজনীন সনাতনী পরিচয়',
                    'जुड़ी हुई सार्वभौमिक सनातनी पहचान'
                  )}
                >
                  <span aria-hidden="true">🕉️</span>
                  {profile.sanId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Combined trust stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white/70 rounded-xl border border-amber-200/60 px-3 py-3 text-center">
            <div className="text-lg font-bold text-stone-900">
              {profile.combinedRating > 0 ? profile.combinedRating.toFixed(1) : '—'}
            </div>
            <Stars value={profile.combinedRating} size="w-3.5 h-3.5" />
            <div className="text-[11px] text-stone-600 mt-1">
              {tx('Blessings', 'আশীর্বাদ', 'आशीर्वाद')} · {profile.combinedRatingCount}
            </div>
          </div>
          <div className="bg-white/70 rounded-xl border border-amber-200/60 px-3 py-3 text-center">
            <div className="text-lg font-bold text-stone-900">
              {profile.combinedCompletedSevas}
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              {tx('Sevas completed', 'সম্পন্ন সেবা', 'पूर्ण सेवाएँ')}
            </div>
          </div>
          <div className="bg-white/70 rounded-xl border border-amber-200/60 px-3 py-3 text-center">
            <div className="text-lg font-bold text-stone-900">
              {profile.experienceYears > 0 ? profile.experienceYears : '—'}
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              {tx('Years of sadhana', 'সাধনার বছর', 'साधना के वर्ष')}
            </div>
          </div>
        </div>
      </header>

      {/* ============ ABOUT ============ */}
      {bios.length > 0 && (
        <SectionCard
          title={tx('About', 'সম্পর্কে', 'परिचय')}
          icon="🪔"
        >
          <div className="space-y-3">
            {bios.map((b) => (
              <div key={b.kind}>
                {bios.length > 1 && (
                  <div className="text-xs font-semibold text-amber-800 mb-1">
                    {b.kind === 'purohit'
                      ? tx('As a Purohit', 'পুরোহিত হিসেবে', 'पुरोहित के रूप में')
                      : tx('As a Jyotishi', 'জ্যোতিষী হিসেবে', 'ज्योतिषी के रूप में')}
                  </div>
                )}
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ============ SPECIALIZATIONS ============ */}
      {showPurohit && profile.purohit && (
        <SectionCard
          title={tx('Purohit Seva', 'পুরোহিত সেবা', 'पुरोहित सेवा')}
          icon="🛕"
        >
          <SpecializationDetail
            kind="purohit"
            specializations={profile.purohit.specializations}
            feeMin={profile.purohit.dakshinaRangeMin}
            feeMax={profile.purohit.dakshinaRangeMax}
            feeLabel={tx('Dakshina range', 'দক্ষিণা পরিসর', 'दक्षिणा सीमा')}
            honorTierLabel={PUROHIT_TIER_META[profile.purohit.verificationTier].label}
            tx={tx}
          />
        </SectionCard>
      )}

      {showJyotish && profile.jyotish && (
        <SectionCard
          title={tx('Jyotish Consultations', 'জ্যোতিষ পরামর্শ', 'ज्योतिष परामर्श')}
          icon="🪐"
        >
          <SpecializationDetail
            kind="jyotish"
            specializations={profile.jyotish.specializations}
            feeMin={profile.jyotish.feeRangeMin}
            feeMax={profile.jyotish.feeRangeMax}
            feeLabel={tx('Consultation fee range', 'পরামর্শ ফি পরিসর', 'परामर्श शुल्क सीमा')}
            honorTierLabel={PUROHIT_TIER_META[profile.jyotish.verificationTier].label}
            tx={tx}
          />
        </SectionCard>
      )}

      {/* ============ LANGUAGES / TRADITION / AREAS ============ */}
      <SectionCard
        title={tx('Languages, Tradition & Service Areas', 'ভাষা, পরম্পরা ও সেবা এলাকা', 'भाषाएँ, परंपरा और सेवा क्षेत्र')}
        icon="🌺"
      >
        <div className="space-y-3 text-sm">
          {profile.languages.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-500 mb-1.5">
                {tx('Languages', 'ভাষা', 'भाषाएँ')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <Chip key={l}>{l}</Chip>
                ))}
              </div>
            </div>
          )}
          {profile.traditions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-500 mb-1.5">
                {tx('Tradition / Parampara', 'পরম্পরা', 'परंपरा')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.traditions.map((t) => (
                  <Chip key={t}>📿 {t}</Chip>
                ))}
              </div>
            </div>
          )}
          {profile.serviceAreas.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-500 mb-1.5">
                {tx('Service areas', 'সেবা এলাকা', 'सेवा क्षेत्र')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.serviceAreas.map((a) => (
                  <Chip key={a}>📍 {a}</Chip>
                ))}
              </div>
            </div>
          )}
          {profile.languages.length === 0 &&
            profile.traditions.length === 0 &&
            profile.serviceAreas.length === 0 && (
              <p className="text-sm text-stone-500 italic">
                {tx(
                  'Details are being added — please check back soon.',
                  'বিস্তারিত যোগ করা হচ্ছে — শীঘ্রই আবার দেখুন।',
                  'विवरण जोड़े जा रहे हैं — कृपया शीघ्र पुनः देखें।'
                )}
              </p>
            )}
        </div>
      </SectionCard>

      {/* ============ GALLERY (grows in Phase 2) ============ */}
      {profile.photos.length > 0 && (
        <SectionCard
          title={tx('Gallery', 'গ্যালারি', 'झलकियाँ')}
          icon="🖼️"
        >
          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${profile.displayName} — ${i + 1}`}
                className="w-full aspect-square object-cover rounded-xl border border-stone-200"
                loading="lazy"
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ============ SEVAS OFFERED — BOTH SILOS, ONE PROVIDER ============
          QUEUED #22: marketplace gigs (marketplaceGigs) and Sangam seva
          notices (sangamPosts service cards) used to be invisible to each
          other. Here they meet: one listing of everything this sevak
          offers, and the blessings earned across BOTH. Gig rows open the
          Seva marketplace; notice rows open the notice in the Sangam
          feed — the surfaces where booking actually happens. */}
      {(sevaGigs.length > 0 || sevaCards.length > 0) && (
        <SectionCard
          title={tx('Sevas offered', 'প্রদত্ত সেবা', 'प्रदत्त सेवाएँ')}
          icon="🪔"
        >
          {sevaBlessings && sevaBlessings.count > 0 && (
            <p className="text-sm text-stone-700 mb-3 flex items-center gap-1.5 flex-wrap">
              <Stars value={sevaBlessings.avg} size="w-3.5 h-3.5" />
              <span className="font-bold text-amber-800">{sevaBlessings.avg.toFixed(1)}</span>
              <span aria-hidden="true">·</span>
              <span>
                🙏 {sevaBlessings.count}{' '}
                {tx(
                  'blessings from families across all sevas',
                  'সব সেবা জুড়ে পরিবারদের আশীর্বাদ',
                  'सभी सेवाओं में परिवारों के आशीर्वाद'
                )}
              </span>
            </p>
          )}
          <ul className="space-y-2">
            {sevaGigs.map((g) => (
              <li key={`gig-${g.id}`}>
                <button
                  type="button"
                  onClick={() => navigate('/app/home/marketplace')}
                  className="w-full text-left bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 rounded-xl p-3.5 transition-colors min-h-[44px]"
                  aria-label={`${g.title} — ${tx('view in the Seva marketplace', 'সেবা বাজারে দেখুন', 'सेवा बाज़ार में देखें')}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-800 min-w-0 truncate">
                      {g.providerType === 'jyotishi' ? '🔮' : '🛕'} {g.title}
                    </span>
                    <span className="text-sm font-bold text-amber-800 shrink-0">
                      {formatMoney(Number(g.priceAmount || 0), g.priceCurrency || 'INR')}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 flex-wrap">
                    <span className="font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                      {tx('Marketplace seva', 'বাজারের সেবা', 'बाज़ार सेवा')}
                    </span>
                    {Number(g.avgRating || 0) > 0 && (
                      <span>
                        ★ {Number(g.avgRating).toFixed(1)} · 🙏 {Number((g as { ratingCount?: number }).ratingCount || 0)}
                      </span>
                    )}
                    {Number(g.totalOrders || 0) > 0 && (
                      <span>
                        {g.totalOrders} {tx('sevas booked', 'সেবা বুক হয়েছে', 'सेवाएँ बुक हुईं')}
                      </span>
                    )}
                    <span className="ml-auto text-amber-700 font-semibold">
                      {tx('Book in Seva Bazar →', 'সেবা বাজারে বুক করুন →', 'सेवा बाज़ार में बुक करें →')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {sevaCards.map((p) => (
              <li key={`card-${p.id}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/app/home/sangam?post=${p.id}`)}
                  className="w-full text-left bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 rounded-xl p-3.5 transition-colors min-h-[44px]"
                  aria-label={`${p.serviceCard?.serviceLine || ''} — ${tx('view the seva notice', 'সেবা বিজ্ঞপ্তি দেখুন', 'सेवा सूचना देखें')}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-800 min-w-0 truncate">
                      🪔 {p.serviceCard?.serviceLine}
                    </span>
                    {p.serviceCard && (
                      <span className="text-sm font-bold text-amber-800 shrink-0">
                        {formatServiceDakshina(p.serviceCard.dakshina, p.serviceCard.currency)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 flex-wrap">
                    <span className="font-medium text-orange-800 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                      {tx('Seva notice', 'সেবা বিজ্ঞপ্তি', 'सेवा सूचना')}
                    </span>
                    <span className="ml-auto text-amber-700 font-semibold">
                      {tx('View notice →', 'বিজ্ঞপ্তি দেখুন →', 'सूचना देखें →')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {sevaBlessings && sevaBlessings.writtenCount > 0 && (
            <div className="mt-4 space-y-2">
              {sevaBlessings.ratings
                .filter((r) => (r.review || '').trim())
                .slice(0, 3)
                .map((r) => (
                  <div key={r.orderId} className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 flex-wrap">
                      <span aria-hidden="true">★</span> {r.rating}/5
                      <span className="font-medium text-stone-500">
                        {r.gigId
                          ? tx('· Marketplace seva', '· বাজারের সেবা', '· बाज़ार सेवा')
                          : tx('· Seva notice', '· সেবা বিজ্ঞপ্তি', '· सेवा सूचना')}
                      </span>
                    </p>
                    <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap">{r.review}</p>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ============ COMBINED REVIEWS ============ */}
      <SectionCard
        title={`${tx('Blessings from devotees', 'ভক্তদের আশীর্বাদ', 'भक्तों के आशीर्वाद')} (${profile.reviews.length})`}
        icon="🙏"
      >
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-stone-500 italic">
            {tx(
              'No written blessings yet — be the first to share your experience after a seva.',
              'এখনও কোনো লিখিত আশীর্বাদ নেই — সেবার পর আপনার অভিজ্ঞতা প্রথম শেয়ার করুন।',
              'अभी कोई लिखित आशीर्वाद नहीं — सेवा के बाद अपना अनुभव सबसे पहले साझा करें।'
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {profile.reviews.map((r) => (
              <li
                key={r.id}
                className="bg-stone-50 border border-stone-200 rounded-xl p-3.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-stone-800">
                    {r.reviewerName}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                      {r.source === 'purohit'
                        ? tx('Purohit seva', 'পুরোহিত সেবা', 'पुरोहित सेवा')
                        : tx('Jyotish consultation', 'জ্যোতিষ পরামর্শ', 'ज्योतिष परामर्श')}
                    </span>
                    <Stars value={r.rating} size="w-3.5 h-3.5" />
                  </span>
                </div>
                {r.note && (
                  <p className="text-sm text-stone-700 leading-relaxed">{r.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ============ KRITAGYATA WALL ============
          Sacred social proof: families' thanks after completed sevas.
          "N families shared gratitude" — never star numbers. The wall
          renders its own warm empty state until the first gratitude. */}
      <div className="mt-4">
        <ProviderGratitudeWall providerUid={uid} lang={language} viewerUid={myUid || undefined} />
      </div>

      {/* ============ SINGLE-SPEC UPSELL (gentle cross-discovery) ============ */}
      {!dual && !viewSpec && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-indigo-950 mb-1.5">
            {singleKind === 'purohit'
              ? tx(
                  'Also seeking Jyotish guidance?',
                  'জ্যোতিষ নির্দেশনাও খুঁজছেন?',
                  'ज्योतिष मार्गदर्शन भी चाहिए?'
                )
              : tx(
                  'Also need a Purohit for rituals?',
                  'আচার-অনুষ্ঠানের জন্য পুরোহিতও দরকার?',
                  'अनुष्ठानों के लिए पुरोहित भी चाहिए?'
                )}
          </h2>
          <p className="text-sm text-indigo-900/80 leading-relaxed">
            {singleKind === 'purohit'
              ? tx(
                  `${profile.displayName} currently offers Purohit seva here. Verified jyotishis are listed in the Jyotish marketplace — many professionals offer both under one Seva Professional profile.`,
                  `${profile.displayName} বর্তমানে এখানে পুরোহিত সেবা দেন। যাচাইকৃত জ্যোতিষীরা জ্যোতিষ মার্কেটপ্লেসে তালিকাভুক্ত — অনেক পেশাদার একটি সেবা পেশাদার প্রোফাইলের অধীনে উভয়ই দেন।`,
                  `${profile.displayName} वर्तमान में यहाँ पुरोहित सेवा देते हैं। सत्यापित ज्योतिषी ज्योतिष मार्केटप्लेस में सूचीबद्ध हैं — कई पेशेवर एक सेवा पेशेवर प्रोफ़ाइल के अंतर्गत दोनों देते हैं।`
                )
              : tx(
                  `${profile.displayName} currently offers Jyotish consultations here. Verified purohits are listed in the Purohit marketplace — many professionals offer both under one Seva Professional profile.`,
                  `${profile.displayName} বর্তমানে এখানে জ্যোতিষ পরামর্শ দেন। যাচাইকৃত পুরোহিতরা পুরোহিত মার্কেটপ্লেসে তালিকাভুক্ত — অনেক পেশাদার একটি সেবা পেশাদার প্রোফাইলের অধীনে উভয়ই দেন।`,
                  `${profile.displayName} वर्तमान में यहाँ ज्योतिष परामर्श देते हैं। सत्यापित पुरोहित पुरोहित मार्केटप्लेस में सूचीबद्ध हैं — कई पेशेवर एक सेवा पेशेवर प्रोफ़ाइल के अंतर्गत दोनों देते हैं।`
                )}
          </p>
        </div>
      )}

      {/* ============ STICKY CTA BAR ============
          [Chat] (ghost) + [Book Seva] (solid), side by side, on EVERY
          viewport (spec §4 — the old bar was mobile-only; on desktop the
          CTA scrolled away). Contact-before-commit for trust goods. */}
      {!hideBookCta && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3">
            <div className="max-w-3xl mx-auto flex gap-2">
              <button
                type="button"
                onClick={openChat}
                disabled={chatStarting}
                className="flex-1 min-h-[48px] rounded-xl border-2 border-amber-600 text-amber-800 font-bold text-base hover:bg-amber-50 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" aria-hidden />
                {chatStarting
                  ? tx('Opening…', 'খোলা হচ্ছে…', 'खुल रहा…')
                  : tx('Chat', 'চ্যাট', 'चैट')}
              </button>
              {dual ? (
                <button
                  type="button"
                  onClick={openUnifiedBooking}
                  className="flex-[2] min-h-[48px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-base shadow-md active:scale-[0.99]"
                >
                  {tx('🪔 Book Seva', '🪔 সেবা বুক করুন', '🪔 सेवा बुक करें')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openBooking(singleKind)}
                  className="flex-[2] min-h-[48px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-base shadow-md active:scale-[0.99]"
                >
                  {singleKind === 'purohit'
                    ? tx('🪔 Book Purohit Seva', '🪔 পুরোহিত সেবা বুক করুন', '🪔 पुरोहित सेवा बुक करें')
                    : tx('🪐 Book Jyotish Consultation', '🪐 জ্যোতিষ পরামর্শ বুক করুন', '🪐 ज्योतिष परामर्श बुक करें')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {chatOpen && myUid && (
        <Chat
          uid={myUid}
          selfInfo={{
            uid: myUid,
            displayName:
              (firebaseUser as { displayName?: string | null } | null)?.displayName ||
              tx('Sanatani', 'সনাতনী', 'सनातनी'),
            photoUrl: ((firebaseUser as { photoURL?: string | null } | null)?.photoURL as string) || undefined,
          }}
          initialChatId={chatId || undefined}
          onClose={() => setChatOpen(false)}
        />
      )}

      {bookingOpen && (
        <BookingSheet
          profile={profile}
          initialTab={bookingTab || singleKind}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
};

/** Per-specialization detail block: offerings, fee range, honor line. */
const SpecializationDetail: React.FC<{
  kind: SpecializationKind;
  specializations: string[];
  feeMin?: number;
  feeMax?: number;
  feeLabel: string;
  honorTierLabel: string;
  tx: (en: string, bn: string, hi: string) => string;
}> = ({ kind, specializations, feeMin, feeMax, feeLabel, honorTierLabel, tx }) => (
  <div className="space-y-3">
    {specializations.length > 0 && (
      <div>
        <div className="text-xs font-semibold text-stone-500 mb-1.5">
          {kind === 'purohit'
            ? tx('Rituals offered', 'অনুষ্ঠানসমূহ', 'अनुष्ठान')
            : tx('Consultation types', 'পরামর্শের ধরন', 'परामर्श के प्रकार')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {specializations.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </div>
    )}
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {(feeMin !== undefined || feeMax !== undefined) && (
        <div>
          <span className="text-stone-500">{feeLabel}: </span>
          <span className="font-semibold text-stone-800">
            {feeMin !== undefined ? `₹${feeMin}` : ''}
            {feeMin !== undefined && feeMax !== undefined ? ' – ' : ''}
            {feeMax !== undefined ? `₹${feeMax}` : ''}
          </span>
          {/* Escrow trust line — directly under the price (spec §4) */}
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mt-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {tx(
              'Held securely until your seva is complete',
              'সেবা সম্পূর্ণ না হওয়া পর্যন্ত নিরাপদে সংরক্ষিত',
              'सेवा पूर्ण होने तक सुरक्षित रखा जाता है'
            )}
          </p>
        </div>
      )}
      <div>
        <span className="text-stone-500">
          {tx('Standing', 'মর্যাদা', 'स्थान')}:{' '}
        </span>
        <span className="font-semibold text-amber-800">{honorTierLabel}</span>
      </div>
    </div>
  </div>
);

export default UnifiedProfessionalProfile;
