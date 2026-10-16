/**
 * MySamskaras.tsx — personal samskara dates for the tithi-anniversary engine.
 * =====================================================================
 * Save your vivah / annaprason / upanayan tithi; each year, 7 days before
 * the tithi recurs, Ajker Suchana brings a blessing. Stored device-local
 * in the Solo store (exported with backup).
 */
import React, { useMemo, useState } from 'react';
import { Card, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useSoloStore, uid } from './soloStore';
import { useToast } from '../context/ToastContext';
import { drikTithiAt } from '../lib/drikPanchang';
import { nextTithiAnniversary, type UserSamskara } from '../lib/panjikaIntelligence';

const KINDS: Array<{ id: UserSamskara['kind']; en: string; bn: string; hi: string }> = [
  { id: 'vivah', en: 'Vivah (wedding)', bn: 'বিবাহ', hi: 'विवाह' },
  { id: 'annaprason', en: 'Annaprason', bn: 'অন্নপ্রাশন', hi: 'अन्नप्राशन' },
  { id: 'upanayan', en: 'Upanayan', bn: 'উপনয়ন', hi: 'उपनयन' },
  { id: 'namkaran', en: 'Namkaran', bn: 'নামকরণ', hi: 'नामकरण' },
  { id: 'other', en: 'Other samskara', bn: 'অন্য সংস্কার', hi: 'अन्य संस्कार' },
];

const TITHI_NAMES = [
  'Amavasya', 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

/** Drik tithi index 0..29 → display name. */
function tithiName(idx: number): string {
  if (idx === 0) return 'Amavasya';
  if (idx <= 14) return `Shukla ${TITHI_NAMES[idx]}`;
  if (idx === 29) return 'Amavasya';
  return `Krishna ${TITHI_NAMES[idx - 15]}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MySamskaras: React.FC = () => {
  const { state, add, remove } = useSoloStore();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [kind, setKind] = useState<UserSamskara['kind']>('vivah');
  const [label, setLabel] = useState('');
  const [dateISO, setDateISO] = useState('');

  const list = useMemo(() => {
    const today = todayISO();
    return (state.samskaras || []).map((s) => ({
      s,
      next: nextTithiAnniversary(s, today),
    }));
  }, [state.samskaras]);

  const save = () => {
    if (!dateISO) {
      showToast(tr('solo.samskara.needDate', 'Please pick the samskara date', 'সংস্কারের তারিখ দিন', 'संस्कार की तिथि चुनें'), 'error');
      return;
    }
    let tithiIndex = 1;
    let paksha: 'Shukla' | 'Krishna' = 'Shukla';
    try {
      const t = drikTithiAt(new Date(dateISO + 'T12:00:00'));
      tithiIndex = t.index;
      paksha = t.paksha;
    } catch { /* default kept */ }
    const kindLabel = KINDS.find((k) => k.id === kind);
    add('samskaras', {
      id: uid('samskara'),
      kind,
      tithiIndex,
      paksha,
      label: label.trim() || `${kindLabel?.en || kind}`,
      dateISO,
    } as UserSamskara);
    setLabel('');
    setDateISO('');
    showToast(tr('solo.samskara.saved', 'Samskara saved — blessings will find you each year 🌸', 'সংস্কার সংরক্ষিত 🌸', 'संस्कार सहेजा गया 🌸'), 'success');
  };

  return (
    <Card>
      <h3 className="font-extrabold text-stone-900 mb-1">
        🌸 <T en="My Samskaras" bn="আমার সংস্কার" hi="मेरे संस्कार" />
      </h3>
      <p className="text-xs text-stone-500 mb-3">
        <T
          en="Save sacred dates — each year the tithi returns, Suchana brings a blessing."
          bn="পবিত্র তারিখ সংরক্ষণ করুন — প্রতি বছর তিথি ফিরলে সূচনা আশীর্বাদ নিয়ে আসবে।"
          hi="पवित्र तिथियां सहेजें — हर वर्ष तिथि लौटने पर सूचना आशीर्वाद लाएगी।"
        />
      </p>

      {list.length > 0 && (
        <ul className="space-y-2 mb-4">
          {list.map(({ s, next }) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
              <div>
                <div className="text-sm font-bold text-stone-800">{s.label}</div>
                <div className="text-xs text-stone-500">
                  {s.paksha} {tithiName(s.tithiIndex)}
                  {next && <span className="text-amber-700 font-semibold"> · {next}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove('samskaras', s.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 min-h-[44px] px-3"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <Field label={<T en="Samskara" bn="সংস্কার" hi="संस्कार" />}>
          <select value={kind} onChange={(e) => setKind(e.target.value as UserSamskara['kind'])} className={inputCls}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.en}</option>
            ))}
          </select>
        </Field>
        <Field label={<T en="Label" bn="নাম" hi="नाम" />}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Our wedding" className={inputCls} />
        </Field>
        <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="mt-3">
        <Btn onClick={save}>
          <T en="Save samskara 🌸" bn="সংস্কার সংরক্ষণ 🌸" hi="संस्कार सहेजें 🌸" />
        </Btn>
      </div>
    </Card>
  );
};
