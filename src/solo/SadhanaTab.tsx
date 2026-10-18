import React, { useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO, type GivingRecord } from './soloStore';
import { Card, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { playSoftBell } from '../lib/sacredAudio';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import { ShareReceiptRow, ReceiptModal, blessingForRecord, formatDanaAmount, RECEIPT_BLESSING, type ShareLang } from './ShareReceipt';

/* SadhanaTab — japa counter, vrata observances, personal sankalpa.
 * =====================================================================
 * Device-local, offline-first. A mala is 108 — quick-add buttons for
 * 108 / 1008 keep the counter honest and fast.
 */

const QUICK_COUNTS = [108, 1008];

/* Dana journal entry — one offering with its own blessing line.
 * Reads the shared soloStore giving record; presents, never copies.
 */
const DanaJournalEntry: React.FC<{ record: GivingRecord; lang: ShareLang; first?: boolean }> = ({ record: g, lang, first = false }) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <li className="rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-amber-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <b className="text-stone-800 text-sm block truncate">{g.orgName}</b>
          <span className="text-xs text-stone-500">
            {g.purpose ? `${g.purpose} · ` : ''}{g.date}
            {g.receiptNo && <span className="ml-1 font-mono text-emerald-700">{g.receiptNo}</span>}
          </span>
        </span>
        <b className="text-amber-800 shrink-0">{formatDanaAmount(g.amount)}</b>
      </div>
      <p className="text-xs italic text-amber-700 mt-1.5">{blessingForRecord(g, lang)}</p>
      <div className="mt-2">
        <button
          onClick={() => setShareOpen((v) => !v)}
          {...(first ? { 'data-guide-anchor': 'sadhana-punya-share' } : {})}
          className="text-xs font-bold text-amber-700 underline min-h-[32px]"
        >
          <T en="Share receipt 🪔" bn="রসিদ শেয়ার করুন 🪔" hi="रसीद साझा करें 🪔" />
        </button>
        <button onClick={() => setModalOpen(true)} className="ml-3 text-xs font-bold text-stone-500 underline min-h-[32px]">
          <T en="View" bn="দেখুন" hi="देखें" />
        </button>
        {shareOpen && (
          <div className="mt-2 rounded-xl bg-white border border-amber-100 p-3">
            <ShareReceiptRow record={g} />
          </div>
        )}
        {modalOpen && <ReceiptModal record={g} onClose={() => setModalOpen(false)} />}
      </div>
    </li>
  );
};

export const SadhanaTab: React.FC = () => {
  const { state, add, remove, update } = useSoloStore();
  const { tr, lang } = useLocaleText();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [mantra, setMantra] = useState('ॐ नमः शिवाय');
  const [customCount, setCustomCount] = useState('');

  // Quick Guide uid (invitational only — never auto-plays on this screen).
  const { firebaseUser } = useAuthWorkspace();
  const guideUid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const devotionalGuide = useGuide('devotional', guideUid);

  // Dana journal — devotional presentation of the shared giving records.
  // PRESENT, don't copy: every number below is read live from state.giving.
  const danaTotal = useMemo(() => state.giving.reduce((s, g) => s + g.amount, 0), [state.giving]);
  const danaRecent = useMemo(
    () => [...state.giving].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [state.giving]
  );
  const shareLang: ShareLang = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';

  const [vrataForm, setVrataForm] = useState({ name: '', date: todayISO(), notes: '' });
  const [sankalpaText, setSankalpaText] = useState('');

  const today = todayISO();
  const japaToday = useMemo(
    () => state.japa.filter((j) => j.date === today).reduce((s, j) => s + j.count, 0),
    [state.japa, today]
  );
  const streak = useMemo(() => {
    const days = new Set(state.japa.filter((j) => j.count > 0).map((j) => j.date));
    let n = 0;
    const d = new Date();
    if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [state.japa]);

  const logJapa = (count: number) => {
    const m = mantra.trim() || 'Japa';
    add('japa', { id: uid('j'), date: today, mantra: m, count, createdAt: Date.now() });
    // A full mala (108 / 1008) completes a round — honour it with a soft bell.
    if (count >= 108) playSoftBell();
    showToast(tr('solo.sadhana.logged', `+${count} ${m} recorded`, `+${count} ${m} সংরক্ষিত`, `+${count} ${m} दर्ज`), 'success');
  };

  const addVrata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrataForm.name.trim()) return;
    add('vrata', {
      id: uid('v'),
      date: vrataForm.date,
      name: vrataForm.name.trim(),
      observed: vrataForm.date <= today,
      notes: vrataForm.notes.trim() || undefined,
      createdAt: Date.now(),
    });
    setVrataForm({ name: '', date: todayISO(), notes: '' });
    showToast(tr('solo.sadhana.vrataAdded', 'Vrata recorded', 'ব্রত সংরক্ষিত', 'व्रत दर्ज'), 'success');
  };

  const addSankalpa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sankalpaText.trim()) return;
    add('sankalpa', { id: uid('s'), text: sankalpaText.trim(), startDate: today, active: true, createdAt: Date.now() });
    setSankalpaText('');
    showToast(tr('solo.sadhana.sankalpaAdded', 'Sankalpa set — shubham', 'সংকল্প গৃহীত — শুভম্', 'संकल्प लिया — शुभम्'), 'success');
  };

  return (
    <div className="space-y-4">
      {/* Japa counter */}
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-1">
          <T en="Japa counter" bn="জপ গণনা" hi="जप गणना" sa="जप-गणना" />
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          <T en={`Today: ${japaToday.toLocaleString('en-IN')} · ${streak}-day streak`} bn={`আজ: ${japaToday} · ${streak} দিন`} hi={`आज: ${japaToday} · ${streak} दिन`} />
        </p>
        <Field label={<T en="Mantra" bn="মন্ত্র" hi="मंत्र" />}>
          <input className={inputCls} value={mantra} onChange={(e) => setMantra(e.target.value)} placeholder="ॐ नमः शिवाय" />
        </Field>
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_COUNTS.map((c) => (
            <Btn key={c} onClick={() => logJapa(c)}>
              +{c} 📿
            </Btn>
          ))}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              className={`${inputCls} !w-28`}
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
              placeholder={t('solo.sadhana.custom')}
            />
            <Btn variant="ghost" onClick={() => { const n = parseInt(customCount, 10); if (n > 0) { logJapa(n); setCustomCount(''); } }}>
              <T en="Add" bn="যোগ" hi="जोड़ें" />
            </Btn>
          </div>
        </div>
        {state.japa.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
              <T en="Recent" bn="সাম্প্রতিক" hi="हाल का" />
            </h3>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {state.japa.slice(0, 8).map((j) => (
                <li key={j.id} className="flex items-center justify-between text-sm py-1 border-b border-stone-50">
                  <span className="text-stone-700">{j.mantra} <span className="text-stone-400">· {j.date}</span></span>
                  <span className="flex items-center gap-2">
                    <b className="text-amber-800">{j.count.toLocaleString('en-IN')}</b>
                    <button onClick={() => remove('japa', j.id)} className="text-xs text-red-500 hover:underline px-2 py-1">✕</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Vrata */}
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Vrata observances" bn="ব্রত পালন" hi="व्रत पालन" />
        </h2>
        <form onSubmit={addVrata} className="grid sm:grid-cols-3 gap-3 mb-4">
          <Field label={<T en="Vrata" bn="ব্রত" hi="व्रत" />}>
            <input className={inputCls} value={vrataForm.name} onChange={(e) => setVrataForm({ ...vrataForm, name: e.target.value })} placeholder="Ekadashi" />
          </Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
            <input type="date" className={inputCls} value={vrataForm.date} onChange={(e) => setVrataForm({ ...vrataForm, date: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Btn type="submit"><T en="Record" bn="সংরক্ষণ" hi="दर्ज करें" /></Btn>
          </div>
        </form>
        {state.vrata.length === 0 ? (
          <Empty text={tr('solo.sadhana.noVrata', 'No vrata recorded yet.', 'এখনও কোনো ব্রত নেই।', 'अभी कोई व्रत नहीं।')} />
        ) : (
          <ul className="space-y-1">
            {[...state.vrata].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((v) => (
              <li key={v.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-50">
                <span>
                  <b className="text-stone-800">{v.name}</b> <span className="text-stone-400">· {v.date}</span>
                  {v.observed && <span className="ml-2 text-emerald-600 text-xs font-bold">{t('solo.sadhana.observed')}</span>}
                </span>
                <span className="flex gap-1">
                  {!v.observed && (
                    <button onClick={() => update('vrata', v.id, { observed: true })} className="text-xs font-bold text-emerald-600 hover:underline px-2 py-1">
                      <T en="Mark observed" bn="পালিত" hi="पालित" />
                    </button>
                  )}
                  <button onClick={() => remove('vrata', v.id)} className="text-xs text-red-500 hover:underline px-2 py-1">✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Sankalpa */}
      <Card>
        <h2 className="text-lg font-extrabold text-stone-900 mb-3">
          <T en="Sankalpa" bn="সংকল্প" hi="संकल्प" />
        </h2>
        <form onSubmit={addSankalpa} className="flex gap-2 mb-4">
          <input
            className={inputCls}
            value={sankalpaText}
            onChange={(e) => setSankalpaText(e.target.value)}
            placeholder={tr('solo.sadhana.sankalpaPh', 'e.g. 11,000 Hanuman Chalisa paaths this month', 'যেমন: এই মাসে ১১,০০০ হনুমান চালিসা', 'जैसे: इस माह 11,000 हनुमान चालीसा')}
          />
          <Btn type="submit"><T en="Set" bn="নিন" hi="लें" /></Btn>
        </form>
        {state.sankalpa.filter((s) => s.active).length === 0 ? (
          <Empty text={tr('solo.sadhana.noSankalpa', 'No active sankalpa.', 'কোনো সক্রিয় সংকল্প নেই।', 'कोई सक्रिय संकल्प नहीं।')} />
        ) : (
          <ul className="space-y-2">
            {state.sankalpa.filter((s) => s.active).map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <span className="text-sm text-stone-800">🪔 {s.text} <span className="text-stone-400 text-xs">· {s.startDate}</span></span>
                <button onClick={() => update('sankalpa', s.id, { active: false })} className="text-xs font-bold text-stone-500 hover:underline px-2 py-1 shrink-0">
                  <T en="Complete" bn="সম্পূর্ণ" hi="पूर्ण" />
                </button>
              </li>
            ))}
            </ul>
          )}
        </Card>

        {/* Dana journal — "Your punya ledger 🪔". A devotional gathering of
            the devotee's giving: lifetime total + recent offerings, each with
            its own blessing. Reads state.giving live — no duplicate data. */}
        <Card>
          <div data-guide-anchor="sadhana-punya">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-lg font-extrabold text-stone-900">
                <T en="Your punya ledger 🪔" bn="আপনার পুণ্য-খতিয়ান 🪔" hi="आपका पुण्य-लेखा 🪔" />
              </h2>
              <TourLink guide={GUIDES.devotional} onRestart={devotionalGuide.restart} />
            </div>
            <p className="text-xs text-stone-500 mb-3">
              <T
                en="Every dana you have recorded, gathered as devotion — not data."
                bn="আপনার প্রতিটি দান, ভক্তিরূপে সংগৃহীত — তথ্য নয়।"
                hi="आपका हर दान, भक्ति के रूप में संजोया — डेटा नहीं।"
              />
            </p>
            <div className="rounded-2xl bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 text-center p-5 mb-3">
              <div className="text-amber-200/80 text-xs font-bold uppercase tracking-widest mb-1">
                <T en="Lifetime dana" bn="সর্বমোট দান" hi="कुल दान" />
              </div>
              <div className="text-3xl font-extrabold text-white">{formatDanaAmount(danaTotal)}</div>
              <div className="text-amber-200/70 text-xs mt-1 font-semibold">
                <T
                  en={`${state.giving.length} offerings of love`}
                  bn={`ভালোবাসার ${state.giving.length}টি অর্পণ`}
                  hi={`प्रेम के ${state.giving.length} अर्पण`}
                />
              </div>
              <div className="text-amber-200/60 text-xs italic mt-2">{RECEIPT_BLESSING[shareLang]}</div>
            </div>
            {danaRecent.length === 0 ? (
              <Empty text={tr('solo.sadhana.noDana', 'No dana recorded yet — your first offering will bloom here. 🪔', 'এখনও কোনো দান নেই — আপনার প্রথম অর্পণ এখানে ফুটবে। 🪔', 'अभी कोई दान नहीं — आपका पहला अर्पण यहीं खिलेगा। 🪔')} />
            ) : (
              <ul className="space-y-2">
                {danaRecent.map((g, i) => (
                  <DanaJournalEntry key={g.id} record={g} lang={shareLang} first={i === 0} />
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Quick Guide: giving-as-sadhana — invitational only, never auto-plays. */}
        {devotionalGuide.pillVisible && (
          <TourPill guide={GUIDES.devotional} uid={guideUid} onStart={devotionalGuide.start} onDismiss={devotionalGuide.dismissPill} />
        )}
        {devotionalGuide.tourActive && <CoachMark guide={GUIDES.devotional} onFinish={devotionalGuide.finish} />}
      </div>
    );
  };
