/**
 * TicketPurchase — seva passes on the public festival page (E2).
 * =====================================================================
 * The devotee picks a pass, names EVERY attendee (household booking —
 * one buyer, every person named), applies a discount code, and sees
 * the full itemised quote — price − discount + platform fee + GST on
 * the fee — BEFORE confirming. Payment is the Seva Wallet or pay at
 * the venue; no card money is ever held here. MyTicketCard carries
 * the buyer's own passes: cancel with the refund shown first (the
 * published ladder), and transfer to another devotee by SAN ID —
 * the recipient accepts in their own account before the festival
 * begins, and the E3 gate pass follows the RSVP automatically.
 *
 * Copy law: a paid tier is a seva pass for a cultural programme,
 * yatra or workshop — darshan is never sold. Early-bird is a plain
 * date, never a countdown.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../lib/firebase';
import { formatMoney } from '../../lib/money';
import type { FestivalEventDoc, TicketTier } from '../../lib/festival';
import { festivalDayList, festivalEventUrl } from '../../lib/festival';
import { PassCalendarActions } from './PassCalendarActions';
import {
  DEFAULT_MAX_PER_BOOKING,
  acceptTransfer,
  cancelTicket,
  codeKeyFor,
  computeQuote,
  daysBeforeFestival,
  declineTransfer,
  isLiveTicket,
  lookupDevoteeForTransfer,
  normalizeDiscountCode,
  offerTransfer,
  passesOpen,
  purchaseTicket,
  refundAmountFor,
  refundPercentFor,
  startMsFor,
  tierRemaining,
  unitPriceAt,
  withdrawTransfer,
  type EventTicket,
} from '../../lib/eventTickets';
import { quotasForEvent, tierQuota } from '../../lib/festivalFairness';
import {
  dipDrawOf,
  dipEntryId,
  dipWindowState,
  enterDip,
  isDipTier,
  withdrawDipEntry,
  type DipEntry,
} from '../../lib/eventDip';

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[44px]';
const btnCls =
  'rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-4 py-2.5 min-h-[44px] disabled:opacity-50';
const ghostCls =
  'rounded-xl border border-stone-300 text-stone-700 font-bold text-sm px-4 py-2.5 min-h-[44px] disabled:opacity-50';

type Tr = (key: string) => string;

/* ── Purchase section ──────────────────────────────────────────── */

interface SectionProps {
  event: FestivalEventDoc;
  uid: string;
  buyerName: string;
  myTickets: EventTicket[];
  onNeedSignIn: () => void;
}

export const TicketPurchaseSection: React.FC<SectionProps> = ({ event, uid, buyerName, myTickets, onNeedSignIn }) => {
  const { t, language } = useLanguage();
  const tr: Tr = (k) => t(`surfaces.events.${k}`);
  const tiers = event.ticketTiers ?? [];
  const [tierId, setTierId] = useState('');
  const [names, setNames] = useState<string[]>([buyerName || '']);
  const [ages, setAges] = useState<string[]>(['']);
  const [addonQty, setAddonQty] = useState(1);
  const [code, setCode] = useState('');
  const [payMethod, setPayMethod] = useState<'wallet' | 'venue'>('wallet');
  const [currency, setCurrency] = useState<'INR' | 'BDT' | 'USD'>('INR');
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneNote, setDoneNote] = useState('');
  // NEXT-LEVEL B1b — a dip tier shows its dip panel, not the buy
  // form; the form opens for it only when a selected party taps
  // "Claim my place" (claimTierId names that tier).
  const [claimTierId, setClaimTierId] = useState('');

  const tier: TicketTier | undefined = tiers.find((x) => x.id === tierId) ?? tiers[0];
  const isAddon = tier?.kind === 'addon';
  const cap = tier?.maxPerBooking ?? DEFAULT_MAX_PER_BOOKING;
  const qty = isAddon ? addonQty : names.length;
  const remaining = tier ? tierRemaining(tier, event.tierSold, tier.id) : 0;
  const soldOut = remaining <= 0;
  const hasAttendancePass = myTickets.some((x) => x.rsvpId && isLiveTicket(x));

  useEffect(() => {
    if (!uid) { setWallet(null); return; }
    let live = true;
    getDoc(doc(db, 'wallets', uid))
      .then((s) => {
        if (!live) return;
        if (s.exists()) {
          const w = s.data() as { balance?: number; currency?: string };
          setWallet({ balance: Number(w.balance || 0), currency: w.currency || 'INR' });
          if (w.currency === 'INR' || w.currency === 'BDT' || w.currency === 'USD') setCurrency(w.currency);
        } else setWallet({ balance: 0, currency: 'INR' });
      })
      .catch(() => setWallet(null));
    return () => { live = false; };
  }, [uid]);

  const codeNorm = normalizeDiscountCode(code);
  const codeTerms = codeNorm ? event.discountTerms?.[codeKeyFor(codeNorm)] ?? null : undefined;
  const quote = useMemo(() => {
    if (!tier) return null;
    return computeQuote({
      tier,
      qty,
      codeTerms: codeNorm ? codeTerms : undefined,
      feeBearer: event.ticketFeeBearer ?? 'organiser',
      currency,
      nowMs: Date.now(),
    });
  }, [tier, qty, codeNorm, codeTerms, event.ticketFeeBearer, currency]);

  if (tiers.length === 0) return null;

  const setCount = (n: number) => {
    const next = Math.min(cap, Math.max(1, n));
    setNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push('');
      return arr.slice(0, next);
    });
    setAges((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push('');
      return arr.slice(0, next);
    });
  };

  const buy = async () => {
    setError('');
    if (!tier || !quote) return;
    if (!uid) { onNeedSignIn(); return; }
    if (codeNorm && codeTerms === null) { setError(tr('ticketCodeInvalid')); return; }
    const attendees = isAddon
      ? []
      : names.map((n, i) => ({ name: n.trim(), ...(ages[i]?.trim() ? { age: Math.max(0, parseInt(ages[i], 10) || 0) } : {}) }));
    if (!isAddon && attendees.some((a) => a.name.length < 2)) { setError(tr('ticketNamesRequired')); return; }
    setBusy(true);
    try {
      await purchaseTicket(db, {
        event,
        tier,
        buyerUid: uid,
        buyerName: buyerName || attendees[0]?.name || '',
        attendees,
        qty,
        discountCode: codeNorm || undefined,
        currency,
        payWith: payMethod,
        nowMs: Date.now(),
      });
      setDoneNote(tr('ticketBookedNote'));
      setCode('');
      // A claimed dip place returns the tier to its dip panel,
      // which now reads the entry's 'claimed' standing.
      if (claimTierId) setClaimTierId('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg === 'insufficient-balance' ? tr('ticketInsufficient')
          : msg === 'code-invalid' ? tr('ticketCodeInvalid')
            : msg === 'currency-mismatch' ? tr('ticketCurrencyMismatch')
              : msg === 'sold-out' ? tr('ticketSoldOut')
                : msg === 'passes-not-open' ? tr('releaseNotYet')
                  : msg === 'dip-not-selected' ? tr('dipNotSelected')
                    : msg === 'dip-claim-closed' ? tr('dipClaimClosed')
                      : tr('ticketBuyFailed')
      );
    } finally {
      setBusy(false);
    }
  };

  const unit = tier ? unitPriceAt(tier, Date.now()) : null;
  const money = (n: number) => formatMoney(n, currency);

  // EVENTS E8 — the release gate: before the announced moment the
  // purchase panel is replaced by the notice (firestore.rules
  // refuses an early purchase too — tkReleaseOpen). The free RSVP
  // above this section is never gated.
  if (!passesOpen(event, Date.now())) {
    const when = new Date(event.ticketReleaseAtMs || 0).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return (
      <section className="rounded-3xl border border-orange-100 bg-white/80 p-4 sm:p-5 shadow-sm text-center">
        <div className="text-4xl mb-2">🪔</div>
        <h3 className="font-black text-stone-800 text-lg">
          {tr('releaseOpensOn').replace('{when}', when)}
        </h3>
        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">{tr('releaseNotice')}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-orange-100 bg-white/80 p-4 sm:p-5 shadow-sm">
      <h3 className="font-black text-stone-800 text-lg">{tr('ticketSectionTitle')}</h3>
      <p className="text-xs text-stone-500 mt-0.5 mb-3">{tr('ticketSectionSub')}</p>

      {event.festivalCancelled && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold px-3 py-2 mb-3">
          {tr('ticketFestivalCancelled')}
        </div>
      )}

      {/* Tier picker — NEXT-LEVEL B1a: every metered tier also
          carries its live quota, shaped by lib/festivalFairness
          from the SAME anchored counters the purchase path trusts
          (tierCaps + tierSold on this doc), so the count a devotee
          reads here is the count the rules enforce at checkout.
          Plain fact only — no countdown, no hurry, no scarcity
          styling; an unmetered tier shows no quota line at all. */}
      <div className="space-y-2 mb-3">
        {tiers.map((x) => {
          const u = unitPriceAt(x, Date.now());
          const rem = tierRemaining(x, event.tierSold, x.id);
          const q = tierQuota(x, event.tierSold, event.tierCaps);
          const active = tier?.id === x.id;
          // NEXT-LEVEL B1b — a dip tier is never "sold out" in
          // the picker: its places move by draw, not by the
          // counter, so the button stays tappable and its line
          // speaks of the dip (after the draw, the published
          // aggregates — pool and allotted counts, never a name).
          const dip = isDipTier(event, x.id);
          const draw = dip ? dipDrawOf(event, x.id) : undefined;
          return (
            <button key={x.id} disabled={!dip && rem <= 0}
              onClick={() => { setTierId(x.id); setError(''); setClaimTierId(''); }}
              className={`w-full text-left rounded-2xl border px-3.5 py-3 min-h-[44px] transition ${active ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-stone-200 bg-white'} ${!dip && rem <= 0 ? 'opacity-50' : ''}`}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-stone-800">{x.name[language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en'] || x.name.en}</span>
                <span className="font-black text-orange-800">
                  {x.kind === 'free' ? tr('ticketFree') : money(u.unit)}
                </span>
              </span>
              <span className="block text-[11px] text-stone-500 mt-0.5">
                {x.kind === 'addon' ? tr('ticketAddonNote') : tr('ticketPassNote')}
                {u.earlyBirdApplied && x.earlyBird ? ` · ${tr('ticketEarlyUntil')} ${x.earlyBird.untilDate}` : ''}
                {dip
                  ? draw?.drawnAtMs
                    ? ` · ${tr('dipPublicResults').replace('{pool}', String(draw.poolCount)).replace('{winners}', String(draw.winnersCount ?? 0))}`
                    : ` · ${tr('dipTierNote')}`
                  : q.capacity !== null
                    ? q.soldOut
                      ? ` · ${tr('quotaBookedOut')}`
                      : ` · ${tr('quotaLeft').replace('{remaining}', String(q.remaining)).replace('{capacity}', String(q.capacity))}`
                    : rem <= 0
                      ? ` · ${tr('ticketSoldOut')}`
                      : ''}
              </span>
            </button>
          );
        })}
      </div>
      {quotasForEvent(event).some((q) => q.capacity !== null) && (
        <p className="text-[11px] text-stone-400 mb-3 -mt-1">{tr('quotaNote')}</p>
      )}

      {/* NEXT-LEVEL B1b — a dip tier's panel stands where the
          buy form would: entry, standing and claim live there.
          The form itself opens for the tier only in claim mode. */}
      {tier && isDipTier(event, tier.id) && claimTierId !== tier.id && (
        <DipTierPanel
          event={event}
          tier={tier}
          uid={uid}
          buyerName={buyerName}
          onNeedSignIn={onNeedSignIn}
          onClaim={() => setClaimTierId(tier.id)}
        />
      )}
      {tier && isDipTier(event, tier.id) && claimTierId === tier.id && soldOut && (
        <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          {tr('ticketSoldOut')}
        </p>
      )}
      {tier && !soldOut && (!isDipTier(event, tier.id) || claimTierId === tier.id) && (
        <>
          {hasAttendancePass && !isAddon ? (
            <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
              {tr('ticketAlreadyHave')}
            </p>
          ) : (
            <>
              {/* Attendees / quantity */}
              {!isAddon ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-600">{tr('ticketWhoComing')}</span>
                    <span className="flex items-center gap-2">
                      <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="Fewer"
                        onClick={() => setCount(names.length - 1)} disabled={names.length <= 1}>−</button>
                      <span className="font-black w-6 text-center">{names.length}</span>
                      <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="More"
                        onClick={() => setCount(names.length + 1)} disabled={names.length >= cap}>+</button>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {names.map((n, i) => (
                      <div key={i} className="flex gap-1.5">
                        <input className={inputCls} value={n} placeholder={`${tr('ticketAttendeeName')} ${i + 1}`}
                          onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
                        <input className={`${inputCls} !w-24`} value={ages[i] ?? ''} inputMode="numeric" placeholder={tr('ticketAge')}
                          onChange={(e) => setAges(ages.map((x, j) => (j === i ? e.target.value : x)))} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">{tr('ticketHouseholdNote')}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-stone-600">{tr('ticketHowMany')}</span>
                  <span className="flex items-center gap-2">
                    <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="Fewer"
                      onClick={() => setAddonQty(Math.max(1, addonQty - 1))} disabled={addonQty <= 1}>−</button>
                    <span className="font-black w-6 text-center">{addonQty}</span>
                    <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="More"
                      onClick={() => setAddonQty(Math.min(cap, addonQty + 1))} disabled={addonQty >= cap}>+</button>
                  </span>
                </div>
              )}

              {/* Discount code */}
              <div className="flex gap-1.5 mb-3">
                <input className={`${inputCls} uppercase`} value={code} placeholder={tr('ticketCodePlaceholder')}
                  onChange={(e) => setCode(e.target.value)} />
                {codeNorm && (
                  <span className={`shrink-0 self-center text-xs font-bold ${codeTerms ? 'text-emerald-700' : 'text-red-600'}`}>
                    {codeTerms ? tr('ticketCodeApplied') : tr('ticketCodeInvalid')}
                  </span>
                )}
              </div>

              {/* Itemised quote — every line, before confirming */}
              {quote && (
                <div className="rounded-2xl bg-stone-50 border border-stone-200 px-3.5 py-3 mb-3 text-sm">
                  <div className="flex justify-between py-0.5">
                    <span className="text-stone-600">{tr('ticketLinePrice')} × {qty}</span>
                    <span className="font-bold">{money(quote.price)}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-700">
                      <span>{tr('ticketLineDiscount')}</span>
                      <span className="font-bold">− {money(quote.discount)}</span>
                    </div>
                  )}
                  {quote.fee > 0 && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-stone-600">{tr('ticketLineFee')}</span>
                      <span className="font-bold">
                        {(event.ticketFeeBearer ?? 'organiser') === 'buyer' ? money(quote.fee) : tr('ticketFeeByOrganiser')}
                      </span>
                    </div>
                  )}
                  {quote.gst > 0 && (event.ticketFeeBearer ?? 'organiser') === 'buyer' && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-stone-600">{tr('ticketLineGst')}</span>
                      <span className="font-bold">{money(quote.gst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-stone-200 mt-1.5 pt-1.5">
                    <span className="font-black text-stone-800">{tr('ticketLineTotal')}</span>
                    <span className="font-black text-orange-800">{money(quote.total)}</span>
                  </div>
                  {unit?.earlyBirdApplied && tier.earlyBird && (
                    <p className="text-[11px] text-stone-500 mt-1">{tr('ticketEarlyUntil')} {tier.earlyBird.untilDate}</p>
                  )}
                </div>
              )}

              {/* Payment path */}
              {quote && quote.total > 0 && (
                <div className="space-y-1.5 mb-3">
                  <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 min-h-[44px] cursor-pointer">
                    <input type="radio" name="pay" checked={payMethod === 'wallet'} onChange={() => setPayMethod('wallet')} />
                    <span className="text-sm font-semibold text-stone-700 flex-1">{tr('ticketPayWallet')}</span>
                    {wallet && <span className="text-xs text-stone-500">{money(wallet.balance)}</span>}
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 min-h-[44px] cursor-pointer">
                    <input type="radio" name="pay" checked={payMethod === 'venue'} onChange={() => setPayMethod('venue')} />
                    <span className="text-sm font-semibold text-stone-700">{tr('ticketPayVenue')}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{tr('ticketCurrency')}</span>
                    {(['INR', 'BDT', 'USD'] as const).map((c) => (
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold min-h-[44px] ${currency === c ? 'bg-orange-600 text-white' : 'border border-stone-300 text-stone-600'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2">{error}</div>}
              {doneNote && <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-2">{doneNote}</div>}
              {/* NEXT-LEVEL A2 — a purchased pass joins the buyer's
                  calendar at the confirmation moment (a ticket's
                  party record attends every festival day). */}
              {doneNote && (
                <PassCalendarActions
                  className="flex flex-wrap gap-2 mb-2"
                  facts={{
                    eventId: event.id,
                    festivalName: event.name[language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en'] || event.name.en,
                    orgName: event.orgName,
                    ...(event.venue ? { venue: event.venue } : {}),
                    link: typeof window !== 'undefined'
                      ? festivalEventUrl(window.location.origin, event.workspaceId, event.id)
                      : '',
                    days: festivalDayList(event.dateISO, event.endDateISO),
                    noteLine: names.filter((n) => n.trim() !== '').join(', ') || buyerName,
                  }}
                />
              )}
              <button className={`${btnCls} w-full`} disabled={busy} onClick={buy}>
                {busy ? tr('ticketBooking') : quote && quote.total === 0 ? tr('ticketConfirmFree') : tr('ticketConfirm')}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
};

/* ── The e-dip panel for one tier (NEXT-LEVEL B1b) ───────────────
 * The devotee's side of the draw, in the tier's own states:
 * announced (the window's dates), open (enter — or the sign-in
 * door), entered (your standing + withdraw while the window
 * stands), closed awaiting the draw, and drawn (selected →
 * claim into the ordinary purchase; waitlisted → your published
 * position; lapsed/closed in plain words). After the draw the
 * panel also carries the PUBLIC aggregates — pool count, places
 * allotted, the method line — never another party's name or
 * standing: a signed-in devotee sees only their OWN result. */

const DipTierPanel: React.FC<{
  event: FestivalEventDoc;
  tier: TicketTier;
  uid: string;
  buyerName: string;
  onNeedSignIn: () => void;
  onClaim: () => void;
}> = ({ event, tier, uid, buyerName, onNeedSignIn, onClaim }) => {
  const { t } = useLanguage();
  const tr: Tr = (k) => t(`surfaces.events.${k}`);
  const [entry, setEntry] = useState<DipEntry | null>(null);
  const [names, setNames] = useState<string[]>([buyerName || '']);
  const [ages, setAges] = useState<string[]>(['']);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const cap = tier.maxPerBooking ?? DEFAULT_MAX_PER_BOOKING;
  const nowMs = Date.now();
  const winState = dipWindowState(event, tier.id, nowMs);
  const draw = dipDrawOf(event, tier.id);
  const drawn = !!draw?.drawnAtMs;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  // My standing, live — the draw's flips (selected, promoted,
  // lapsed) reach this panel the moment staff make them.
  useEffect(() => {
    if (!uid) {
      setEntry(null);
      return;
    }
    const un = onSnapshot(
      doc(db, 'event_dip_entries', dipEntryId(event.id, tier.id, uid)),
      (s) => setEntry(s.exists() ? { ...(s.data() as Omit<DipEntry, 'id'>), id: s.id } : null),
      () => setEntry(null)
    );
    return un;
  }, [event.id, tier.id, uid]);

  const setCount = (n: number) => {
    const next = Math.min(cap, Math.max(1, n));
    setNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push('');
      return arr.slice(0, next);
    });
    setAges((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push('');
      return arr.slice(0, next);
    });
  };

  const doEnter = async () => {
    setError('');
    const attendees = names.map((n, i) => ({
      name: n.trim(),
      ...(ages[i]?.trim() ? { age: Math.max(0, parseInt(ages[i], 10) || 0) } : {}),
    }));
    if (attendees.some((a) => a.name.length < 2)) {
      setError(tr('ticketNamesRequired'));
      return;
    }
    setBusy(true);
    try {
      await enterDip(db, {
        event,
        tierId: tier.id,
        uid,
        buyerName: buyerName || attendees[0]?.name || '',
        attendees,
        nowMs: Date.now(),
      });
    } catch {
      setError(tr('dipEnterFailed'));
    } finally {
      setBusy(false);
    }
  };

  const doWithdraw = async () => {
    if (!entry) return;
    setBusy(true);
    setError('');
    try {
      await withdrawDipEntry(db, entry.id);
      setNote(tr('dipWithdrawnNote'));
    } catch {
      setError(tr('dipEnterFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/50 px-3.5 py-3">
      <div className="font-black text-stone-800">{tr('dipEnterTitle')}</div>

      {drawn && draw && (
        <p className="text-xs text-stone-500 mt-1">
          {tr('dipPublicResults')
            .replace('{pool}', String(draw.poolCount))
            .replace('{winners}', String(draw.winnersCount ?? 0))}
          {' · '}
          {tr('dipMethodLine')}
        </p>
      )}

      {note && (
        <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2">{note}</div>
      )}
      {error && (
        <div className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">{error}</div>
      )}

      {drawn ? (
        <div className="mt-2">
          {entry?.status === 'selected' && (
            draw.claimByMs && nowMs > draw.claimByMs ? (
              <p className="text-sm text-stone-600 leading-relaxed">{tr('dipClaimPassedNote')}</p>
            ) : (
              <>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {tr('dipSelectedNote').replace('{date}', draw.claimByMs ? fmt(draw.claimByMs) : '')}
                </p>
                <button className={`${btnCls} w-full mt-2`} onClick={onClaim}>
                  {tr('dipClaimBtn')}
                </button>
              </>
            )
          )}
          {entry?.status === 'waitlisted' && (
            <p className="text-sm text-stone-700 leading-relaxed">
              {tr('dipWaitlistedNote').replace('{position}', String(entry.dipPosition ?? ''))}
            </p>
          )}
          {entry?.status === 'claimed' && (
            <p className="text-sm font-bold text-emerald-700">{tr('dipClaimedNote')}</p>
          )}
          {entry?.status === 'lapsed' && (
            <p className="text-sm text-stone-600 leading-relaxed">{tr('dipLapsedNote')}</p>
          )}
          {!entry && (
            <p className="text-sm text-stone-600 leading-relaxed">{tr('dipDrawnClosedNote')}</p>
          )}
        </div>
      ) : winState === 'upcoming' ? (
        <p className="text-sm text-stone-600 leading-relaxed mt-1">
          {tr('dipAnnounced')
            .replace('{opens}', fmt(event.dipOpensAtMs?.[tier.id] || 0))
            .replace('{closes}', fmt(event.dipClosesAtMs?.[tier.id] || 0))}
        </p>
      ) : winState === 'closed' ? (
        <p className="text-sm text-stone-600 leading-relaxed mt-1">{tr('dipClosedNote')}</p>
      ) : winState === 'open' ? (
        <div className="mt-2">
          {!uid ? (
            <>
              <p className="text-sm text-stone-600 leading-relaxed">{tr('dipSignInNote')}</p>
              <button className={`${btnCls} w-full mt-2`} onClick={onNeedSignIn}>
                {tr('dipSignInBtn')}
              </button>
            </>
          ) : entry ? (
            <>
              <p className="text-sm font-bold text-emerald-800">
                {tr('dipEnteredNote').replace('{count}', String(entry.heads))}
              </p>
              <button className={`${ghostCls} mt-2`} disabled={busy} onClick={doWithdraw}>
                {tr('dipWithdrawBtn')}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-stone-500 leading-relaxed">{tr('dipEnterNote')}</p>
              <div className="flex items-center justify-between mt-2 mb-1.5">
                <span className="text-xs font-bold text-stone-600">{tr('ticketWhoComing')}</span>
                <span className="flex items-center gap-2">
                  <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="Fewer"
                    onClick={() => setCount(names.length - 1)} disabled={names.length <= 1}>−</button>
                  <span className="font-black w-6 text-center">{names.length}</span>
                  <button className="w-11 h-11 rounded-xl border border-stone-300 font-black" aria-label="More"
                    onClick={() => setCount(names.length + 1)} disabled={names.length >= cap}>+</button>
                </span>
              </div>
              <div className="space-y-1.5">
                {names.map((n, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input className={inputCls} value={n} placeholder={`${tr('ticketAttendeeName')} ${i + 1}`}
                      onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
                    <input className={`${inputCls} !w-24`} value={ages[i] ?? ''} inputMode="numeric" placeholder={tr('ticketAge')}
                      onChange={(e) => setAges(ages.map((x, j) => (j === i ? e.target.value : x)))} />
                  </div>
                ))}
              </div>
              <button className={`${btnCls} w-full mt-2.5`} disabled={busy} onClick={doEnter}>
                {tr('dipEnterBtn')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

/* ── My ticket card (cancel + transfer) ────────────────────────── */

interface CardProps {
  ticket: EventTicket;
  event: FestivalEventDoc;
  uid: string;
}

export const MyTicketCard: React.FC<CardProps> = ({ ticket, event, uid }) => {
  const { t, language } = useLanguage();
  const tr: Tr = (k) => t(`surfaces.events.${k}`);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [sanInput, setSanInput] = useState('');
  const [found, setFound] = useState<{ uid: string; displayName: string } | null>(null);
  const [lookupNote, setLookupNote] = useState('');

  const live = isLiveTicket(ticket);
  const tier = event.ticketTiers?.find((x) => x.id === ticket.tierId);
  const startMs = startMsFor(event.dateISO);
  const pct = refundPercentFor(event.refundPolicy, daysBeforeFestival(startMs, Date.now()), event.festivalCancelled === true);
  const refundPreview = ticket.paymentState === 'paid-wallet' ? refundAmountFor(ticket.amounts, pct) : 0;
  const money = (n: number) => formatMoney(n, ticket.currency);
  const stateText =
    ticket.paymentState === 'paid-wallet' ? tr('ticketStateWallet')
      : ticket.paymentState === 'pay-at-venue' ? (ticket.venueReceived === true ? tr('ticketStateVenuePaid') : tr('ticketStateVenue'))
        : ticket.paymentState === 'comp' ? tr('ticketStateComp')
          : ticket.paymentState === 'refunded' ? tr('ticketStateRefunded')
            : tr('ticketStateCancelled');

  const doCancel = async () => {
    setBusy(true);
    try {
      const out = await cancelTicket(db, { ticket, event, nowMs: Date.now() });
      setNote(out.newState === 'refunded' ? `${tr('ticketRefundedNote')} ${money(out.refundAmount)}` : tr('ticketCancelledNote'));
      setConfirmingCancel(false);
    } catch {
      setNote(tr('ticketBuyFailed'));
    } finally {
      setBusy(false);
    }
  };

  const doLookup = async () => {
    setLookupNote('');
    setFound(null);
    const hit = await lookupDevoteeForTransfer(db, sanInput);
    if (!hit) { setLookupNote(tr('transferNotFound')); return; }
    if (hit.uid === uid) { setLookupNote(tr('transferSelf')); return; }
    setFound(hit);
  };

  const doOffer = async () => {
    if (!found) return;
    setBusy(true);
    try {
      await offerTransfer(db, ticket.id, found, Date.now());
      setNote(`${tr('transferOfferedNote')} ${found.displayName}`);
      setFound(null);
      setSanInput('');
    } catch {
      setNote(tr('ticketBuyFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-orange-100 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-black text-stone-800">{tier?.name.en ?? ticket.tierId} · ×{ticket.qty}</div>
          <div className="text-xs text-stone-500 truncate">{ticket.attendees.map((a) => a.name).join(', ') || ticket.buyerName}</div>
          <div className="text-xs font-bold text-stone-600 mt-0.5">{stateText}</div>
          {ticket.paymentState === 'cancelled' && ticket.venueReceived === true && (
            <div className="text-xs font-bold text-amber-700">{tr('ticketDeskRefundDue')}</div>
          )}
          {ticket.transferState === 'offered' && (
            <div className="text-xs font-bold text-orange-700">{tr('transferPendingTo')} {ticket.transferToName}</div>
          )}
          {ticket.transferState === 'declined' && (
            <div className="text-xs font-bold text-stone-500">{tr('transferDeclinedNote')}</div>
          )}
        </div>
        <div className="font-black text-orange-800 shrink-0">{money(ticket.amounts.total)}</div>
      </div>

      {note && <div className="text-xs font-bold text-emerald-700 mt-2">{note}</div>}

      {live && (
        <div className="mt-3 space-y-2">
          {/* Transfer */}
          {ticket.transferState !== 'offered' ? (
            <div>
              <div className="flex gap-1.5">
                <input className={inputCls} value={sanInput} placeholder={tr('transferPlaceholder')}
                  onChange={(e) => { setSanInput(e.target.value); setFound(null); }} />
                <button className={ghostCls} onClick={doLookup} disabled={!sanInput.trim()}>
                  {tr('transferFind')}
                </button>
              </div>
              {lookupNote && <div className="text-xs font-bold text-red-600 mt-1">{lookupNote}</div>}
              {found && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-bold text-stone-700 flex-1">{found.displayName}</span>
                  <button className={btnCls} disabled={busy} onClick={doOffer}>{tr('transferOffer')}</button>
                </div>
              )}
            </div>
          ) : (
            <button className={ghostCls} disabled={busy}
              onClick={async () => { setBusy(true); try { await withdrawTransfer(db, ticket.id, Date.now()); } finally { setBusy(false); } }}>
              {tr('transferWithdraw')}
            </button>
          )}
          {ticket.transferState === 'declined' && (
            <button className={ghostCls} disabled={busy}
              onClick={async () => { setBusy(true); try { await withdrawTransfer(db, ticket.id, Date.now()); } finally { setBusy(false); } }}>
              {tr('transferDismiss')}
            </button>
          )}

          {/* Cancel */}
          {confirmingCancel ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
              <p className="text-xs font-bold text-red-800 mb-2">
                {ticket.paymentState === 'paid-wallet'
                  ? `${tr('ticketCancelRefundPrefix')} ${money(refundPreview)} (${pct}%)`
                  : tr('ticketCancelVenueNote')}
              </p>
              <div className="flex gap-2">
                <button className={btnCls} disabled={busy} onClick={doCancel}>{tr('ticketCancelYes')}</button>
                <button className={ghostCls} onClick={() => setConfirmingCancel(false)}>{tr('ticketCancelKeep')}</button>
              </div>
            </div>
          ) : (
            <button className="text-sm font-bold text-red-700 min-h-[44px]" onClick={() => setConfirmingCancel(true)}>
              {tr('ticketCancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Incoming offer card (accept / decline) ────────────────────── */

export const TicketOfferCard: React.FC<{ ticket: EventTicket; event: FestivalEventDoc; uid: string; myName: string }> = ({ ticket, event, uid, myName }) => {
  const { t, language } = useLanguage();
  const tr: Tr = (k) => t(`surfaces.events.${k}`);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const tier = event.ticketTiers?.find((x) => x.id === ticket.tierId);
  const money = (n: number) => formatMoney(n, ticket.currency);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptTransfer(db, {
        ticket,
        myUid: uid,
        myName,
        festivalStartMs: startMsFor(event.dateISO),
        nowMs: Date.now(),
      });
      setNote(tr('transferAcceptedNote'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setNote(msg === 'already-have-place' ? tr('transferAlreadyHave') : tr('transferExpiredNote'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
      <div className="font-black text-stone-800">{tr('transferOfferTitle')}</div>
      <p className="text-sm text-stone-600 mt-0.5">
        {ticket.buyerName} · {tier?.name.en ?? ticket.tierId} · ×{ticket.qty} · {money(ticket.amounts.total)}
      </p>
      <p className="text-xs text-stone-500">{ticket.attendees.map((a) => a.name).join(', ')}</p>
      {note ? (
        <div className="text-xs font-bold text-emerald-700 mt-2">{note}</div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button className={btnCls} disabled={busy} onClick={accept}>{tr('transferAccept')}</button>
          <button className={ghostCls} disabled={busy}
            onClick={async () => { setBusy(true); try { await declineTransfer(db, ticket.id, Date.now()); setNote(tr('transferDeclinedDone')); } finally { setBusy(false); } }}>
            {tr('transferDecline')}
          </button>
        </div>
      )}
    </div>
  );
};
