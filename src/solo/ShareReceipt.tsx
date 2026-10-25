import React, { useMemo, useState } from 'react';
import { Modal, T, useLocaleText } from './ui';
import type { GivingRecord } from './soloStore';
import { TempleReceiptCard, receiptDataFromGiving } from '../components/common/TempleReceiptCard';

/* ShareReceipt — multi-channel receipts (SwaDharma teardown: WhatsApp +
 * Email + SMS + in-app — meet devotees where they already are).
 * =====================================================================
 * "Share receipt 🪔" for a solo giving record: WhatsApp (wa.me), SMS
 * (sms:), email (mailto:) with devotional copy, plus the in-app receipt
 * view (the existing GivingTab history is the in-app channel; the modal
 * below is its focused receipt display). All copy is trilingual and warm
 * — a receipt is a blessing shared, not paperwork forwarded.
 */

export type ShareLang = 'en' | 'bn' | 'hi';

/** The donor-facing blessing — "May your generosity return to you manifold 🙏". */
export const RECEIPT_BLESSING: Record<ShareLang, string> = {
  en: 'May your generosity return to you manifold 🙏',
  bn: 'আপনার দান শুভ হোক 🙏',
  hi: 'आपका दान शुभ हो 🙏',
};

/** Rotating blessings for the dana journal — one per offering, deterministic. */
const JOURNAL_BLESSINGS: Array<Record<ShareLang, string>> = [
  {
    en: 'Given with a full heart — punya recorded 🪔',
    bn: 'পূর্ণ হৃদয়ে দান — পুণ্য লিখিত 🪔',
    hi: 'पूरे मन से दान — पुण्य अंकित 🪔',
  },
  {
    en: 'Anna-dana is maha-dana — the gift of food feeds all 🙏',
    bn: 'অন্নদান মহাদান — খাদ্যের দান সকলকে পোষণ করে 🙏',
    hi: 'अन्नदान महादान है — अन्न का दान सबको पोषता है 🙏',
  },
  {
    en: 'What is offered in shraddhā returns as shanti 🕉️',
    bn: 'যা শ্রদ্ধায় অর্পিত, তা শান্তি হয়ে ফেরে 🕉️',
    hi: 'जो श्रद्धा से अर्पित, वह शांति बनकर लौटता है 🕉️',
  },
  {
    en: 'Dhanyavaad — the temple keeps your trust sacred 🏵️',
    bn: 'ধন্যবাদ — মন্দির আপনার আস্থা পবিত্র রাখে 🏵️',
    hi: 'धन्यवाद — मंदिर आपके विश्वास को पवित्र रखता है 🏵️',
  },
];

/** Deterministic blessing pick per record (stable across renders). */
export function blessingForRecord(g: GivingRecord, lang: ShareLang): string {
  let h = 0;
  for (let i = 0; i < g.id.length; i++) h = (h * 31 + g.id.charCodeAt(i)) >>> 0;
  return JOURNAL_BLESSINGS[h % JOURNAL_BLESSINGS.length][lang];
}

export function formatDanaAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Devotional share copy — the devotee shares their own punya, warmly. */
export function receiptShareText(g: GivingRecord, lang: ShareLang): { text: string; subject: string } {
  const amt = formatDanaAmount(g.amount);
  const bless = RECEIPT_BLESSING[lang];
  const purpose = g.purpose ? ` (${g.purpose})` : '';
  const receipt = g.receiptNo ? (lang === 'en' ? ` Receipt: ${g.receiptNo}.` : lang === 'bn' ? ` রসিদ: ${g.receiptNo}।` : ` रसीद: ${g.receiptNo}।`) : '';
  switch (lang) {
    case 'bn':
      return {
        subject: `দান রসিদ — ${g.orgName}`,
        text: `🪔 ধন্যবাদ! ${g.date} তারিখে আমি ${g.orgName}-কে ${amt}${purpose} দান করেছি।${receipt} ${bless}`,
      };
    case 'hi':
      return {
        subject: `दान रसीद — ${g.orgName}`,
        text: `🪔 धन्यवाद! मैंने ${g.date} को ${g.orgName} को ${amt}${purpose} दान दिया।${receipt} ${bless}`,
      };
    default:
      return {
        subject: `Dana receipt — ${g.orgName}`,
        text: `🪔 Dhanyavaad! On ${g.date} I offered ${amt}${purpose} as dana to ${g.orgName}.${receipt} ${bless}`,
      };
  }
}

/* ------------------------------------------------------------------ */
/* In-app receipt modal — the focused receipt display (in-app channel)  */
/* ------------------------------------------------------------------ */

export const ReceiptModal: React.FC<{ record: GivingRecord; onClose: () => void }> = ({ record: g, onClose }) => {
  return (
    <Modal
      title={<T en="Dana receipt 🪔" bn="দান রসিদ 🪔" hi="दान रसीद 🪔" />}
      onClose={onClose}
    >
      {/* VIBE B3 — the personal copy is the same temple-acknowledgment
          card the org surfaces use: sanctum paper, brass amount, the
          date with its tithi, the receipt number the record carries,
          the blessing. Sharing stays with the channel row below. */}
      <TempleReceiptCard data={receiptDataFromGiving(g)} hideShare />
      <div className="mt-4">
        <ShareReceiptRow record={g} hideView />
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Share row — WhatsApp · SMS · Email · In-app view                     */
/* ------------------------------------------------------------------ */

export const ShareReceiptRow: React.FC<{ record: GivingRecord; hideView?: boolean }> = ({ record: g, hideView = false }) => {
  const { lang } = useLocaleText();
  const L: ShareLang = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
  const [modalOpen, setModalOpen] = useState(false);

  const links = useMemo(() => {
    const { text, subject } = receiptShareText(g, L);
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      sms: `sms:?body=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    };
  }, [g, L]);

  const btn =
    'flex-1 min-h-[44px] rounded-xl border border-amber-200 bg-white text-sm font-bold text-stone-700 hover:border-amber-400 hover:bg-amber-50 transition flex items-center justify-center gap-1.5 px-3';

  return (
    <div>
      <div className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-2">
        <T en="Share receipt 🪔" bn="রসিদ শেয়ার করুন 🪔" hi="रसीद साझा करें 🪔" />
      </div>
      <div className="flex gap-2">
        <a href={links.whatsapp} target="_blank" rel="noreferrer" className={btn} aria-label="Share via WhatsApp">
          💬 <T en="WhatsApp" bn="হোয়াটসঅ্যাপ" hi="व्हाट्सऐप" />
        </a>
        <a href={links.sms} className={btn} aria-label="Share via SMS">
          ✉️ <T en="SMS" bn="এসএমএস" hi="एसएमएस" />
        </a>
        <a href={links.email} className={btn} aria-label="Share via email">
          📧 <T en="Email" bn="ইমেইল" hi="ईमेल" />
        </a>
        {!hideView && (
          <button onClick={() => setModalOpen(true)} className={btn} aria-label="View receipt in app">
            👁️ <T en="View" bn="দেখুন" hi="देखें" />
          </button>
        )}
      </div>
      {modalOpen && <ReceiptModal record={g} onClose={() => setModalOpen(false)} />}
    </div>
  );
};
