/**
 * CounterpartProfileSheet.tsx — QUEUED #28: tap the person in a chat
 * header → see who they truly are; if they are a seva provider, book
 * without leaving the conversation (talk → trust → book).
 * ======================================================================
 * Rendered ONLY for direct threads (see threadProfile.counterpartSurface).
 *
 * COMMERCE BOUNDARY: the services list and every Book button render
 * ONLY when the provider probe positively resolves the counterpart as
 * a marketplace provider (`isMarketplaceProvider` — professional
 * identity OR active gigs OR active seva cards). A devotee counterpart
 * (family, friends — personal P2P chat) gets a warm identity sheet
 * with NO services and NO book button. The probe starts empty and the
 * book UI waits for it; absence of evidence is never commerce.
 *
 * Booking reuses the existing flows whole — no new order machinery:
 * - Seva cards → `SevaBookingSheet` (its order + receipt land in THIS
 *   thread: the sheet opens the same deterministic direct chat).
 * - Gigs → `GigBookingFlow` (rail detection → BookGig /
 *   Rail2PaymentScreen, exactly as ClientMarketplace mounts them),
 *   lazy-loaded to keep the chat bundle free of the marketplace graph.
 */
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, T, useLocaleText } from '../solo/ui';
import { ChatAvatar, VerifiedBadge } from './ChatList';
import {
  isMarketplaceProvider,
  providerRoles,
  type ProviderProbe,
} from './threadProfile';
import type { ChatParticipant } from './types';
import {
  fetchUnifiedProfessional,
  type UnifiedProfessional,
} from '../lib/sevaPro/profile';
import {
  getProviderBlessings,
  listProviderGigs,
  type Gig,
  type ProviderBlessings,
} from '../lib/marketplace';
import { listProviderServiceCards } from '../sangam/providerCards';
import { SevaBookingSheet } from '../sangam/SevaBookingSheet';
import { formatServiceDakshina } from '../sangam/ServiceCardPost';
import { fetchOwnSanId } from '../sangam/referralThanksService';
import { formatMoney } from '../lib/money';
import { useToast } from '../context/ToastContext';
import type { SangamPost } from '../sangam/types';

const GigBookingFlow = lazy(() =>
  import('../marketplace/GigBookingFlow').then((m) => ({
    default: m.GigBookingFlow,
  })),
);

const CATEGORY_TILE: Record<string, string> = {
  Puja: '🪔', Havan: '🔥', Katha: '📖', Samskara: '🕉️', Vastu: '🏠',
  Kundli: '🔮', Horoscope: '✨', Remedy: '🌿', Consultation: '💬', Other: '🙏',
};

export const CounterpartProfileSheet: React.FC<{
  viewerUid: string;
  viewerName: string;
  counterpartUid: string;
  person: ChatParticipant;
  onClose: () => void;
}> = ({ viewerUid, viewerName, counterpartUid, person, onClose }) => {
  const { lang } = useLocaleText();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loaded, setLoaded] = useState(false);
  const [professional, setProfessional] = useState<UnifiedProfessional | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [cards, setCards] = useState<SangamPost[]>([]);
  const [blessings, setBlessings] = useState<ProviderBlessings | null>(null);

  const [bookingGig, setBookingGig] = useState<Gig | null>(null);
  const [bookingPost, setBookingPost] = useState<SangamPost | null>(null);
  const [viewerSanId, setViewerSanId] = useState<string | undefined>(undefined);

  /* The provider probe — every read fails quiet; an all-empty result is
   * a devotee, and the sheet simply stays a personal profile. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, g, c, b] = await Promise.all([
        fetchUnifiedProfessional(counterpartUid).catch(() => null),
        listProviderGigs(counterpartUid).catch(() => [] as Gig[]),
        listProviderServiceCards(counterpartUid),
        getProviderBlessings(counterpartUid).catch(() => null),
      ]);
      if (!alive) return;
      setProfessional(p);
      setGigs(g);
      setCards(c);
      setBlessings(b);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [counterpartUid]);

  const probe: ProviderProbe = useMemo(
    () => ({
      hasPurohit: !!professional?.hasPurohit,
      hasJyotish: !!professional?.hasJyotish,
      activeGigs: gigs.length,
      activeCards: cards.length,
    }),
    [professional, gigs, cards],
  );
  const isProvider = loaded && isMarketplaceProvider(probe);
  const roles = providerRoles(probe);

  const displayName = professional?.displayName || person.displayName;
  const sanId = professional?.sanId || person.sanataniId;
  const memberSince = useMemo(() => {
    const stamps = [
      (professional?.purohit as { createdAt?: number } | undefined)?.createdAt,
      (professional?.jyotish as { createdAt?: number } | undefined)?.createdAt,
    ].filter((n): n is number => typeof n === 'number' && n > 0);
    if (stamps.length === 0) return null;
    return new Date(Math.min(...stamps)).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }, [professional]);

  const openCardBooking = async (post: SangamPost) => {
    try {
      const own = await fetchOwnSanId(viewerUid);
      setViewerSanId(own || undefined);
    } catch {
      setViewerSanId(undefined);
    }
    setBookingPost(post);
  };

  const openFullProfile = () => {
    navigate(
      isProvider ? `/seva/pro/${counterpartUid}` : `/u/${counterpartUid}`,
    );
    onClose();
  };

  return (
    <>
      <Modal title={<T en="Profile" bn="প্রোফাইল" hi="प्रोफ़ाइल" />} onClose={onClose}>
        <div className="flex flex-col items-center text-center">
          <ChatAvatar
            person={{
              ...person,
              displayName,
              photoUrl: professional?.photoURL || person.photoUrl,
              sanataniId: sanId || person.sanataniId,
            }}
            size={72}
          />
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-lg font-extrabold text-stone-900">{displayName}</span>
            <VerifiedBadge person={person} />
          </div>
          {sanId && (
            <span className="mt-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-0.5">
              {sanId}
            </span>
          )}

          {/* Role chips — providers named by their seva; devotees simply
              fellow Sanatanis. Rendered only once the probe resolves. */}
          {loaded && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
              {roles.includes('purohit') && (
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  🪔 <T en="Purohit" bn="পুরোহিত" hi="पुरोहित" />
                </span>
              )}
              {roles.includes('jyotish') && (
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                  🔮 <T en="Jyotishi" bn="জ্যোতিষী" hi="ज्योतिषी" />
                </span>
              )}
              {isProvider && roles.length === 0 && (
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  🙏 <T en="Seva provider" bn="সেবা প্রদানকারী" hi="सेवा प्रदाता" />
                </span>
              )}
              {!isProvider && (
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                  🙏 <T en="Devotee" bn="ভক্ত" hi="भक्त" />
                </span>
              )}
            </div>
          )}

          {memberSince && (
            <p className="text-xs text-stone-500 mt-2">
              <T en="Offering seva since" bn="সেবা দিচ্ছেন" hi="सेवा दे रहे हैं" /> {memberSince}
            </p>
          )}

          {/* Blessings — the #22 unified read model: gigs + seva notices
              read as one trust story. */}
          {blessings && blessings.count > 0 && (
            <p className="text-sm font-bold text-amber-800 mt-2">
              ★ {blessings.avg.toFixed(1)} · 🙏 {blessings.count}{' '}
              <T
                en="blessings from families"
                bn="পরিবারের আশীর্বাদ"
                hi="परिवारों के आशीर्वाद"
              />
              {professional && professional.combinedCompletedSevas > 0 && (
                <>
                  {' '}· {professional.combinedCompletedSevas}{' '}
                  <T en="sevas completed" bn="সেবা সম্পন্ন" hi="सेवाएँ पूर्ण" />
                </>
              )}
            </p>
          )}

          {!loaded && (
            <div className="text-3xl animate-pulse mt-4" aria-hidden>
              🪔
            </div>
          )}
        </div>

        {/* ---- Services + booking: PROVIDERS ONLY (the boundary) ---- */}
        {isProvider && (
          <div className="mt-5 text-left">
            <h4 className="text-sm font-extrabold text-stone-800">
              <T en="Sevas offered" bn="প্রদত্ত সেবা" hi="दी जाने वाली सेवाएँ" />
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              <T
                en="Book right here — no need to leave this conversation."
                bn="এখান থেকেই বুক করুন — কথোপকথন ছাড়তে হবে না।"
                hi="यहीं से बुक करें — बातचीत छोड़ने की ज़रूरत नहीं।"
              />
            </p>
            {gigs.length === 0 && cards.length === 0 ? (
              <p className="text-xs text-stone-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mt-3">
                <T
                  en="No sevas are listed right now — ask here in chat, or see the full profile."
                  bn="এখন কোনো সেবা তালিকাভুক্ত নেই — এখানে চ্যাটে জিজ্ঞাসা করুন, বা পুরো প্রোফাইল দেখুন।"
                  hi="अभी कोई सेवा सूचीबद्ध नहीं है — यहाँ चैट में पूछें, या पूरा प्रोफ़ाइल देखें।"
                />
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                {gigs.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3"
                  >
                    <div
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 flex items-center justify-center text-xl shrink-0"
                      aria-hidden
                    >
                      {CATEGORY_TILE[g.category] || '🙏'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900 truncate">{g.title}</p>
                      <p className="text-[11px] text-stone-500">
                        {g.category} · {g.durationMinutes}m ·{' '}
                        <span className="font-bold text-amber-700">
                          {formatMoney(Number(g.priceAmount), g.priceCurrency)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingGig(g)}
                      className="shrink-0 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
                    >
                      🙏 <T en="Book" bn="বুক করুন" hi="बुक करें" />
                    </button>
                  </div>
                ))}
                {cards.map((p) => {
                  const card = p.serviceCard;
                  if (!card) return null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3"
                    >
                      <div
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 flex items-center justify-center text-xl shrink-0"
                        aria-hidden
                      >
                        🪔
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {card.serviceLine}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          <T en="Seva notice" bn="সেবা বিজ্ঞপ্তি" hi="सेवा सूचना" /> ·{' '}
                          <span className="font-bold text-amber-700">
                            {formatServiceDakshina(card.dakshina, card.currency)}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCardBooking(p)}
                        className="shrink-0 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
                      >
                        🙏 <T en="Book" bn="বুক করুন" hi="बुक करें" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Devotee counterpart — a person, never a storefront. */}
        {loaded && !isProvider && (
          <p className="text-sm text-stone-500 text-center mt-5 leading-relaxed">
            <T
              en="A fellow Sanatani in conversation with you."
              bn="আপনার সঙ্গে কথোপকথনে একজন সহ-সনাতনী।"
              hi="आपके साथ बातचीत में एक साथी सनातनी।"
            />
          </p>
        )}

        <button
          type="button"
          onClick={openFullProfile}
          className="w-full mt-5 px-4 py-3 min-h-[44px] rounded-xl text-sm font-black bg-amber-700 text-amber-50 hover:bg-amber-800"
        >
          <T en="View full profile →" bn="পুরো প্রোফাইল দেখুন →" hi="पूरा प्रोफ़ाइल देखें →" />
        </button>
      </Modal>

      {/* Gig booking — the marketplace flow, mounted in place. */}
      {bookingGig && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[125] bg-[#faf7f2] flex items-center justify-center">
              <div className="text-4xl animate-pulse" aria-hidden>
                🪔
              </div>
            </div>
          }
        >
          <GigBookingFlow
            gig={bookingGig}
            onBack={() => setBookingGig(null)}
            onDone={() => {
              setBookingGig(null);
              showToast(
                lang === 'bn'
                  ? 'সেবা অনুরোধ করা হয়েছে 🙏 — আমার বুকিং-এ দেখুন।'
                  : lang === 'hi'
                    ? 'सेवा अनुरोधित 🙏 — मेरी बुकिंग में देखें।'
                    : 'Seva requested 🙏 — track it under My Bookings.',
                'success',
              );
              onClose();
            }}
          />
        </Suspense>
      )}

      {/* Seva-card booking — the sheet's order + receipt land in THIS
          thread (same deterministic direct chat). */}
      {bookingPost && (
        <SevaBookingSheet
          post={bookingPost}
          viewer={{ uid: viewerUid, name: viewerName, sanId: viewerSanId }}
          onClose={() => setBookingPost(null)}
          onBooked={() => {
            setBookingPost(null);
            showToast(
              lang === 'bn'
                ? 'সেবা অনুরোধ করা হয়েছে 🙏 — বুকিংটি এই কথোপকথনেই আছে।'
                : lang === 'hi'
                  ? 'सेवा अनुरोधित 🙏 — बुकिंग इसी बातचीत में है।'
                  : 'Seva requested 🙏 — the booking lives right here in this conversation.',
              'success',
            );
            onClose();
          }}
        />
      )}
    </>
  );
};
