/**
 * components/org/SevaCards.tsx — tangible seva cards (Phase 2).
 * ==============================================================
 * Warm, tangible giving: each card is a fixed amount with a one-line
 * outcome ("₹101 = one day's bhog for 40 children") and an optional goal
 * target with a live progress bar.
 *
 * Data: `orgPages/{orgId}/sevaCards/{cardId}`
 *   - read:  public (a giving card is public information)
 *   - write: org trustee / superadmin only (rules-gated)
 * Follows the same public-boundary philosophy as the org page itself,
 * which reads ONLY from the public `orgPages/{id}` projection tree.
 * NOTE (Phase-2 spec deviation, deliberate): the spec named
 * `orgs/{orgId}/sevaCards/{cardId}`, but no `orgs` collection exists in
 * this tree — `orgPages/{orgId}` is the real public org document.
 *
 * Tapping a card opens Phase 1's express dana sheet prefilled via
 * lib/danaSheet (openDanaSheet) — never duplicated here. The card doc's
 * `raisedTotal` is the goal-tracker's source of truth; the donation write
 * path (Phase 1 sheet) increments it transactionally, and trustees can
 * record offline (hundi/counter) collections from the manager below.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Heart, Pencil, Plus, Trash2, X, Check, HandCoins, Landmark } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useMembership } from '../../context/MembershipContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { hasDanaSheetHandler, openDanaSheet } from '../../lib/danaSheet';
import { GUIDES, useGuide, TourPill, CoachMark } from '../guide';

export interface SevaCard {
  id: string;
  title: string;
  amount: number;
  currency: 'INR' | 'BDT' | 'USD';
  outcomeCopy: string;
  goalTarget?: number;
  raisedTotal: number;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR ₹' },
  { code: 'BDT', symbol: '৳', label: 'BDT ৳' },
  { code: 'USD', symbol: '$', label: 'USD $' },
] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || '₹';
}

export function formatSevaAmount(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  try {
    return `${sym}${Number(amount).toLocaleString(currency === 'BDT' ? 'bn-BD' : 'en-IN')}`;
  } catch {
    return `${sym}${amount}`;
  }
}

function cardsCol(orgId: string) {
  return collection(db, 'orgPages', orgId, 'sevaCards');
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'seva'
  );
}

/* ------------------------------------------------------------------ */
/* Devotee view — the warm card grid with goal trackers.               */
/* ------------------------------------------------------------------ */

export const SevaCardsSection: React.FC<{ orgId: string; orgName: string }> = ({
  orgId,
  orgName,
}) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  const { myMemberships } = useMembership();
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = (firebaseUser as { uid?: string } | null)?.uid;

  const guide = useGuide('sevacards', uid || 'anon');

  const [cards, setCards] = useState<SevaCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(cardsCol(orgId), orderBy('sortOrder', 'asc')),
      (snap) => {
        setCards(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SevaCard, 'id'>) })),
        );
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return unsub;
  }, [orgId]);

  const canManage = useMemo(
    () =>
      myMemberships.some(
        (m) =>
          m.workspaceId === orgId &&
          ['superadmin', 'trustee'].includes((m.role || '').toLowerCase()),
      ),
    [myMemberships, orgId],
  );

  const visible = cards.filter((c) => c.active);

  const onDonate = (card: SevaCard) => {
    if (!hasDanaSheetHandler()) {
      showToast(
        T(
          'sevacards.sheetSoon',
          'The express dana sheet is arriving shortly — please use Donate for now 🙏',
          'এক্সপ্রেস দান শীট শীঘ্রই আসছে — আপাতত Donate ব্যবহার করুন 🙏',
          'एक्सप्रेस दान शीट जल्द आ रही है — अभी Donate प्रयोग करें 🙏',
        ),
        'info',
      );
      return;
    }
    openDanaSheet({
      initialAmount: card.amount,
      initialOrg: { id: orgId, name: orgName },
      initialPurpose: card.title,
      cardId: card.id,
      currency: card.currency,
    });
  };

  if (loaded && visible.length === 0 && !canManage) return null;

  return (
    <>
      {(visible.length > 0 || canManage) && (
        <section
          className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-3xl shadow-sm border border-amber-200/60 p-6 mt-4"
          data-guide-anchor="seva-cards"
        >
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-1.5">
            <HandCoins size={16} className="text-amber-700" />
            {T('sevacards.title', 'Seva Cards', 'সেবা কার্ড', 'सेवा कार्ड')}
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            {T(
              'sevacards.sub',
              'Every rupee has a face — see exactly what your dana becomes. 🪔',
              'প্রতিটি টাকার একটি মুখ আছে — আপনার দান ঠিক কী হবে দেখুন। 🪔',
              'हर रुपये का एक चेहरा है — देखें आपका दान क्या बनेगा। 🪔',
            )}
          </p>

          {visible.length === 0 ? (
            <p className="text-xs text-stone-400 italic">
              {T(
                'sevacards.emptyTrustee',
                'No seva cards yet — create the first one below.',
                'এখনও কোনো সেবা কার্ড নেই — নিচে প্রথমটি তৈরি করুন।',
                'अभी कोई सेवा कार्ड नहीं — नीचे पहला बनाएँ।',
              )}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((card) => {
                const pct =
                  card.goalTarget && card.goalTarget > 0
                    ? Math.min(100, Math.round(((card.raisedTotal || 0) / card.goalTarget) * 100))
                    : null;
                return (
                  <button
                    key={card.id}
                    onClick={() => onDonate(card)}
                    className="text-left rounded-2xl bg-white border border-amber-200/70 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all min-h-[44px] group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-stone-900 text-sm leading-snug">
                        {card.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-amber-700 text-white text-sm font-black px-3 py-1">
                        {formatSevaAmount(card.amount, card.currency)}
                      </span>
                    </div>
                    {card.outcomeCopy && (
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                        <span className="font-black text-amber-700">
                          {formatSevaAmount(card.amount, card.currency)}
                        </span>{' '}
                        = {card.outcomeCopy}
                      </p>
                    )}
                    {pct !== null && (
                      <div className="mt-3">
                        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[11px] font-bold">
                          <span className="text-amber-800">
                            {formatSevaAmount(card.raisedTotal || 0, card.currency)}{' '}
                            {T('sevacards.raised', 'raised', 'সংগৃহীত', 'एकत्रित')}
                          </span>
                          <span className="text-stone-400">
                            {pct}% {T('sevacards.of', 'of', 'এর', 'का')}{' '}
                            {formatSevaAmount(card.goalTarget || 0, card.currency)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-amber-800 group-hover:text-amber-900">
                      <Heart size={14} className="fill-amber-700 text-amber-700" />
                      {T('sevacards.give', 'Offer this seva', 'এই সেবা অর্পণ করুন', 'यह सेवा अर्पित करें')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {canManage && <SevaCardsManager orgId={orgId} cards={cards} />}
        </section>
      )}

      {guide.pillVisible && (
        <div className="mt-2 px-1">
          <TourPill guide={GUIDES.sevacards} uid={uid || 'anon'} onStart={guide.start} onDismiss={guide.dismissPill} />
        </div>
      )}
      {guide.tourActive && <CoachMark guide={GUIDES.sevacards} onFinish={guide.finish} />}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Trustee manager — basic CRUD + offline-collection recording.        */
/* ------------------------------------------------------------------ */

interface Draft {
  title: string;
  amount: string;
  currency: 'INR' | 'BDT' | 'USD';
  outcomeCopy: string;
  goalTarget: string;
  sortOrder: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: '',
  amount: '',
  currency: 'INR',
  outcomeCopy: '',
  goalTarget: '',
  sortOrder: '0',
  active: true,
};

const SevaCardsManager: React.FC<{ orgId: string; cards: SevaCard[] }> = ({ orgId, cards }) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [offlineAmt, setOfflineAmt] = useState<Record<string, string>>({});

  const startEdit = (card: SevaCard | null) => {
    setEditingId(card ? card.id : null);
    setDraft(
      card
        ? {
            title: card.title,
            amount: String(card.amount),
            currency: card.currency,
            outcomeCopy: card.outcomeCopy || '',
            goalTarget: card.goalTarget ? String(card.goalTarget) : '',
            sortOrder: String(card.sortOrder ?? 0),
            active: card.active,
          }
        : EMPTY_DRAFT,
    );
  };

  const save = async () => {
    const uid = (firebaseUser as { uid?: string } | null)?.uid;
    if (!uid) return;
    const amount = Number(draft.amount);
    if (!draft.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast(
        T('sevacards.needTitle', 'Give the card a title and a positive amount.', 'কার্ডে একটি শিরোনাম ও ধনাত্মক পরিমাণ দিন।', 'कार्ड को शीर्षक और धनात्मक राशि दें।'),
        'error',
      );
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: draft.title.trim(),
        amount,
        currency: draft.currency,
        outcomeCopy: draft.outcomeCopy.trim(),
        goalTarget: draft.goalTarget ? Number(draft.goalTarget) || 0 : 0,
        sortOrder: Number(draft.sortOrder) || 0,
        active: draft.active,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      };
      if (editingId) {
        await updateDoc(doc(cardsCol(orgId), editingId), payload);
      } else {
        const id = `${slugify(draft.title)}-${Date.now().toString(36)}`;
        await setDoc(doc(cardsCol(orgId), id), {
          ...payload,
          raisedTotal: 0,
          createdAt: serverTimestamp(),
          createdBy: uid,
        });
      }
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      showToast(T('sevacards.saved', 'Seva card saved 🪔', 'সেবা কার্ড সংরক্ষিত 🪔', 'सेवा कार्ड सहेजा गया 🪔'), 'success');
    } catch {
      showToast(T('sevacards.saveFail', 'Could not save — please try again.', 'সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন।', 'सहेजा नहीं जा सका — पुनः प्रयास करें।'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (card: SevaCard) => {
    if (!window.confirm(T('sevacards.deleteConfirm', `Delete “${card.title}”? Devotees will no longer see it.`, `“${card.title}” মুছে ফেলবেন? ভক্তরা আর দেখতে পাবে না।`, `“${card.title}” हटाएँ? भक्त इसे नहीं देख पाएँगे।`))) return;
    try {
      await deleteDoc(doc(cardsCol(orgId), card.id));
      showToast(T('sevacards.deleted', 'Card deleted.', 'কার্ড মুছে ফেলা হয়েছে।', 'कार्ड हटाया गया।'), 'success');
    } catch {
      showToast(T('sevacards.deleteFail', 'Could not delete — please try again.', 'মোছা যায়নি — আবার চেষ্টা করুন।', 'हटाया नहीं जा सका — पुनः प्रयास करें।'), 'error');
    }
  };

  const toggleActive = async (card: SevaCard) => {
    try {
      await updateDoc(doc(cardsCol(orgId), card.id), { active: !card.active, updatedAt: serverTimestamp() });
    } catch {
      showToast(T('sevacards.saveFail', 'Could not save — please try again.', 'সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন।', 'सहेजा नहीं जा सका — पुनः प्रयास करें।'), 'error');
    }
  };

  /** Record a counter/hundi (offline) collection against the goal. */
  const recordOffline = async (card: SevaCard) => {
    const amt = Number(offlineAmt[card.id]);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast(T('sevacards.offlineNeed', 'Enter a positive amount first.', 'আগে একটি ধনাত্মক পরিমাণ দিন।', 'पहले धनात्मक राशि दर्ज करें।'), 'error');
      return;
    }
    try {
      await updateDoc(doc(cardsCol(orgId), card.id), {
        raisedTotal: increment(amt),
        updatedAt: serverTimestamp(),
      });
      setOfflineAmt((m) => ({ ...m, [card.id]: '' }));
      showToast(
        T('sevacards.offlineSaved', `${formatSevaAmount(amt, card.currency)} recorded toward “${card.title}” 🙏`, `“${card.title}”-এর জন্য ${formatSevaAmount(amt, card.currency)} লিপিবদ্ধ 🙏`, `“${card.title}” हेतु ${formatSevaAmount(amt, card.currency)} दर्ज 🙏`),
        'success',
      );
    } catch {
      showToast(T('sevacards.saveFail', 'Could not save — please try again.', 'সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন।', 'सहेजा नहीं जा सका — पुनः प्रयास करें।'), 'error');
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]';

  return (
    <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 min-h-[44px] text-sm font-black text-amber-900"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Landmark size={15} />
          {T('sevacards.manage', 'Seva cards — trustee desk', 'সেবা কার্ড — ট্রাস্টি ডেস্ক', 'सेवा कार्ड — ट्रस्टी डेस्क')}
        </span>
        <span className="text-xs font-bold text-amber-700">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2.5">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`rounded-xl border p-3 bg-white ${card.active ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-stone-900 truncate">{card.title}</div>
                  <div className="text-[11px] text-stone-500 font-bold">
                    {formatSevaAmount(card.amount, card.currency)}
                    {card.goalTarget ? ` · ${T('sevacards.goal', 'goal', 'লক্ষ্য', 'लक्ष्य')} ${formatSevaAmount(card.goalTarget, card.currency)}` : ''}
                    {' · '}
                    {formatSevaAmount(card.raisedTotal || 0, card.currency)} {T('sevacards.raised', 'raised', 'সংগৃহীত', 'एकत्रित')}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(card)} className="p-2 min-w-[44px] min-h-[44px] text-stone-500 hover:text-amber-700" aria-label={T('sevacards.edit', 'Edit', 'সম্পাদনা', 'संपादित करें')}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(card)} className="p-2 min-w-[44px] min-h-[44px] text-stone-500 hover:text-emerald-700" aria-label={card.active ? T('sevacards.hide', 'Hide', 'লুকান', 'छिपाएँ') : T('sevacards.show', 'Show', 'দেখান', 'दिखाएँ')}>
                    {card.active ? <X size={15} /> : <Check size={15} />}
                  </button>
                  <button onClick={() => remove(card)} className="p-2 min-w-[44px] min-h-[44px] text-stone-400 hover:text-red-600" aria-label={T('sevacards.delete', 'Delete', 'মুছুন', 'हटाएँ')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {card.goalTarget ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    className={`${inputCls} !min-h-[40px] !py-1.5`}
                    inputMode="decimal"
                    placeholder={T('sevacards.offlinePh', 'Counter / hundi collection…', 'কাউন্টার / হুন্ডি সংগ্রহ…', 'काउंटर / हुंडी संग्रह…')}
                    value={offlineAmt[card.id] || ''}
                    onChange={(e) => setOfflineAmt((m) => ({ ...m, [card.id]: e.target.value }))}
                    aria-label={T('sevacards.offlineLabel', 'Offline collection amount', 'অফলাইন সংগ্রহের পরিমাণ', 'ऑफ़लाइन संग्रह राशि')}
                  />
                  <button
                    onClick={() => recordOffline(card)}
                    className="shrink-0 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black"
                  >
                    {T('sevacards.record', 'Record', 'লিপিবদ্ধ', 'दर्ज करें')}
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          <div className="rounded-xl border border-amber-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-stone-700">
                {editingId
                  ? T('sevacards.editCard', 'Edit card', 'কার্ড সম্পাদনা', 'कार्ड संपादित करें')
                  : T('sevacards.newCard', 'New seva card', 'নতুন সেবা কার্ড', 'नया सेवा कार्ड')}
              </h4>
              {editingId && (
                <button onClick={() => { setEditingId(null); setDraft(EMPTY_DRAFT); }} className="text-[11px] font-bold text-stone-400 underline">
                  {T('sevacards.cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputCls} placeholder={T('sevacards.fTitle', 'Title — e.g. Annadanam', 'শিরোনাম — যেমন অন্নদানম', 'शीर्षक — जैसे अन्नदानम')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <div className="flex gap-2">
                <input className={inputCls} inputMode="decimal" placeholder={T('sevacards.fAmount', 'Amount', 'পরিমাণ', 'राशि')} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                <select className={`${inputCls} !w-28 shrink-0`} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value as Draft['currency'] })}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <input className={`${inputCls} sm:col-span-2`} placeholder={T('sevacards.fOutcome', 'Outcome line — e.g. one day’s bhog for 40 children', 'ফলের লাইন — যেমন ৪০ শিশুর একদিনের ভোগ', 'परिणाम पंक्ति — जैसे 40 बच्चों का एक दिन का भोग')} value={draft.outcomeCopy} onChange={(e) => setDraft({ ...draft, outcomeCopy: e.target.value })} />
              <input className={inputCls} inputMode="decimal" placeholder={T('sevacards.fGoal', 'Goal target (optional)', 'লক্ষ্য (ঐচ্ছিক)', 'लक्ष्य (वैकल्पिक)')} value={draft.goalTarget} onChange={(e) => setDraft({ ...draft, goalTarget: e.target.value })} />
              <input className={inputCls} inputMode="numeric" placeholder={T('sevacards.fOrder', 'Order', 'ক্রম', 'क्रम')} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs font-bold text-stone-600 min-h-[44px]">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="w-5 h-5 accent-amber-700" />
              {T('sevacards.fActive', 'Visible to devotees', 'ভক্তদের কাছে দৃশ্যমান', 'भक्तों को दिखे')}
            </label>
            <button
              onClick={save}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-black disabled:opacity-50"
            >
              <Plus size={15} />
              {editingId
                ? T('sevacards.update', 'Update card', 'কার্ড হালনাগাদ', 'कार्ड अद्यतन करें')
                : T('sevacards.create', 'Create card', 'কার্ড তৈরি', 'कार्ड बनाएँ')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
