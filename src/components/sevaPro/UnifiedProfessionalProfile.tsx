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
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
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
  const { safeTranslate } = useLanguage();
  const tx = (en: string, bn: string, hi: string) => safeTranslate('', en, bn, hi);

  const [profile, setProfile] = useState<UnifiedProfessional | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTab, setBookingTab] = useState<SpecializationKind | null>(null);

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

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 sm:pb-10 pt-4 sm:pt-6 space-y-4">
      {/* ============ HERO ============ */}
      <header className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-3xl border border-amber-200 shadow-sm p-5 sm:p-6">
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

      {/* ============ BOOK CTA ============ */}
      {!hideBookCta && (
        <div className="fixed bottom-0 inset-x-0 z-40 sm:static sm:mt-2">
          <div className="bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3 sm:rounded-2xl sm:border sm:shadow-sm">
            <div className="max-w-3xl mx-auto flex gap-2">
              {dual ? (
                <button
                  type="button"
                  onClick={openUnifiedBooking}
                  className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-base shadow-md active:scale-[0.99]"
                >
                  {tx('🪔 Book Seva', '🪔 সেবা বুক করুন', '🪔 सेवा बुक करें')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openBooking(singleKind)}
                  className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-base shadow-md active:scale-[0.99]"
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
