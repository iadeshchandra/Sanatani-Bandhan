/**
 * JyotishMarketplace — the devotee-facing consultation marketplace hub.
 * =====================================================================
 * Self-contained in a JyotishProvider (works in org / solo / B2C context).
 * Tabs: Find a Jyotishi · Post Requirement · My Consultations.
 *
 * Devotees can post a requirement (any jyotishi may accept) OR book a
 * jyotishi directly. Ratings open after completion; chat is in-app;
 * call/video are scheduled session links (honest $0 scope).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { JyotishProvider, useJyotish, useConsultationMessages } from '../context/JyotishContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import {
  CONSULTATION_TYPES,
  CONSULTATION_TYPE_META,
  JYOTISH_SPECIALIZATIONS,
  Consultation,
  ConsultationType,
  JyotishIdentity,
} from '../types/jyotish';
import { Card, StatusPill, Btn, Empty, SectionTitle, Field, inputCls } from './ui';
import { ConsultationChat } from './ConsultationChat';

type MarketTab = 'find' | 'post' | 'mine';

const InnerMarketplace: React.FC = () => {
  const [tab, setTab] = useState<MarketTab>('find');
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'find', label: '🔍 Find a Jyotishi' },
            { id: 'post', label: '📝 Post Requirement' },
            { id: 'mine', label: '📋 My Consultations' },
          ] as { id: MarketTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all min-h-[44px] ${
              tab === t.id
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-indigo-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'find' && <FindJyotish />}
      {tab === 'post' && <PostRequirement onPosted={() => setTab('mine')} />}
      {tab === 'mine' && <MyConsultationsDevotee />}
    </div>
  );
};

export const JyotishMarketplace: React.FC = () => (
  <JyotishProvider>
    <InnerMarketplace />
  </JyotishProvider>
);

/* ------------------------------------------------------------------ */
/* Find a Jyotishi                                                     */
/* ------------------------------------------------------------------ */

const FindJyotish: React.FC = () => {
  const { browseJyotishis, getEndorsements } = useJyotish();
  const { t } = useLanguage();
  const [list, setList] = useState<JyotishIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [spec, setSpec] = useState('');
  const [lang, setLang] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    try {
      setList(await browseJyotishis({ city: city || undefined, specialization: spec || undefined, language: lang || undefined }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <SectionTitle>{t('jyotish.findJyotishi')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('jyotish.city')} className={inputCls} />
        <select value={spec} onChange={(e) => setSpec(e.target.value)} className={inputCls}>
          <option value="">{t('jyotish.anySpecialization')}</option>
          {JYOTISH_SPECIALIZATIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input value={lang} onChange={(e) => setLang(e.target.value)} placeholder={t('jyotish.languageSearch')} className={inputCls} />
        <Btn onClick={search}>{t('jyotish.search')}</Btn>
      </div>
      {loading ? (
        <p className="text-sm text-stone-400">Searching…</p>
      ) : list.length === 0 ? (
        <Empty text="No jyotishis found. Try widening your search." />
      ) : (
        <div className="space-y-3">
          {list.map((j) => (
            <JyotishCard key={j.id} j={j} expanded={expanded === j.id} onToggle={() => setExpanded(expanded === j.id ? null : j.id)} getEndorsements={getEndorsements} />
          ))}
        </div>
      )}
    </Card>
  );
};

const JyotishCard: React.FC<{
  j: JyotishIdentity;
  expanded: boolean;
  onToggle: () => void;
  getEndorsements: (id: string) => Promise<any[]>;
}> = ({ j, expanded, onToggle, getEndorsements }) => {
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [endorseOpen, setEndorseOpen] = useState(false);
  useEffect(() => {
    if (expanded) {
      getEndorsements(j.id).then(setEndorsements).catch(() => setEndorsements([]));
    }
  }, [expanded, j.id, getEndorsements]);

  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-stone-900">{j.displayName}</span>
            <VerificationBadge tier={j.verificationTier} subject="Jyotishi" size="xs" />
          </div>
          <p className="text-xs text-stone-500 font-mono mt-0.5">{j.id} · {j.city}</p>
          <p className="text-xs text-stone-600 mt-1">
            {j.specializations?.slice(0, 3).join(' · ')}
            {j.ratingCount > 0 && <span className="ml-2 text-amber-600 font-bold">★ {j.ratingAggregate.toFixed(1)} ({j.ratingCount})</span>}
          </p>
        </div>
        <button type="button" onClick={onToggle} className="text-xs font-bold text-indigo-700 hover:underline shrink-0 min-h-[44px] px-2">
          {expanded ? 'Hide ▲' : 'Details ▼'}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          {j.bio && <p className="text-sm text-stone-700">{j.bio}</p>}
          <p className="text-xs text-stone-500">
            {j.parampara && <>🪔 Parampara: {j.parampara} · </>}
            {j.experienceYears > 0 && <>{j.experienceYears} yrs experience · </>}
            🗣️ {(j.languages || []).join(', ')}
            {(j.feeRangeMin || j.feeRangeMax) && (
              <> · 💰 ₹{j.feeRangeMin || '—'}–₹{j.feeRangeMax || '—'} <span className="text-stone-400">(informational)</span></>
            )}
          </p>
          {endorsements.length > 0 && (
            <div className="text-xs text-stone-600">
              <span className="font-bold">🏛️ Endorsed by:</span> {endorsements.map((e) => e.orgName).join(', ')}
            </div>
          )}
          <EndorseForm jyotishId={j.id} open={endorseOpen} setOpen={setEndorseOpen} />
        </div>
      )}
    </div>
  );
};

const EndorseForm: React.FC<{ jyotishId: string; open: boolean; setOpen: (b: boolean) => void }> = ({
  jyotishId,
  open,
  setOpen,
}) => {
  const { t } = useLanguage();
  const { endorseJyotish } = useJyotish();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-indigo-700 hover:underline min-h-[44px]">
        🏛️ Endorse as organisation
      </button>
    );
  }

  const submit = async () => {
    setSaving(true);
    try {
      await endorseJyotish(jyotishId, text, parseInt(count, 10) || 0);
      setOpen(false);
      setText('');
    } catch (err: any) {
      showToast(err.message || 'Endorsement failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 space-y-2">
      <p className="text-xs font-bold text-indigo-800">Trustee endorsement (public record)</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t('jyotish.endorseReasonPlaceholder')} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
      <div className="flex gap-2">
        <input type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} placeholder={t('jyotish.consultationsTogether')} className="w-32 px-3 py-2 rounded-xl border border-stone-300 text-sm" />
        <Btn onClick={submit} disabled={saving || !text.trim()}>{t('jyotish.submitEndorsement')}</Btn>
        <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Post a requirement                                                  */
/* ------------------------------------------------------------------ */

const PostRequirement: React.FC<{ onPosted: () => void }> = ({ onPosted }) => {
  const { t } = useLanguage();
  const { postConsultation } = useJyotish();
  const { firebaseUser } = useAuthWorkspace();
  const [form, setForm] = useState({
    consultationType: 'Kundli Vishleshan' as ConsultationType,
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    partnerBirthDate: '',
    partnerBirthTime: '',
    partnerBirthPlace: '',
    preferredDate: '',
    mode: 'chat' as 'chat' | 'call' | 'video',
    city: '',
    language: 'Hindi',
    budgetMin: '',
    budgetMax: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      alert('Please sign in to post a requirement.');
      return;
    }
    setSaving(true);
    try {
      await postConsultation({
        consultationType: form.consultationType,
        birthDate: form.birthDate || undefined,
        birthTime: form.birthTime || undefined,
        birthPlace: form.birthPlace.trim() || undefined,
        partnerBirthDate: form.partnerBirthDate || undefined,
        partnerBirthTime: form.partnerBirthTime || undefined,
        partnerBirthPlace: form.partnerBirthPlace.trim() || undefined,
        preferredDate: form.preferredDate,
        mode: form.mode,
        city: form.city.trim(),
        language: form.language,
        budgetMin: Math.max(0, parseInt(form.budgetMin, 10) || 0),
        budgetMax: Math.max(0, parseInt(form.budgetMax, 10) || 0),
        notes: form.notes.trim(),
      });
      onPosted();
    } catch (err: any) {
      alert(err.message || 'Could not post requirement');
    } finally {
      setSaving(false);
    }
  };

  const needsPartner = form.consultationType === 'Kundli Milan';
  const needsBirth = form.consultationType !== 'Prashna Shastra';

  return (
    <Card>
      <SectionTitle>{t('jyotish.postRequirement')}</SectionTitle>
      <p className="text-xs text-stone-500 mb-4">
        Any registered jyotishi can accept. Birth details are used only for the chart reading.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Consultation type">
            <select value={form.consultationType} onChange={(e) => setForm({ ...form, consultationType: e.target.value as ConsultationType })} className={inputCls}>
              {CONSULTATION_TYPES.map((t) => (
                <option key={t} value={t}>{CONSULTATION_TYPE_META[t].icon} {t}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred mode">
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as any })} className={inputCls}>
              <option value="chat">💬 In-app chat</option>
              <option value="call">📞 Call (scheduled link)</option>
              <option value="video">🎥 Video (scheduled link)</option>
            </select>
          </Field>
        </div>
        {needsBirth && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Birth date">
              <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Birth time">
              <input type="time" value={form.birthTime} onChange={(e) => setForm({ ...form, birthTime: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Birth place">
              <input value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} placeholder={t('jyotish.city')} className={inputCls} />
            </Field>
          </div>
        )}
        {needsPartner && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-rose-50 border border-rose-200 p-3">
            <Field label="Partner birth date">
              <input type="date" value={form.partnerBirthDate} onChange={(e) => setForm({ ...form, partnerBirthDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Partner birth time">
              <input type="time" value={form.partnerBirthTime} onChange={(e) => setForm({ ...form, partnerBirthTime: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Partner birth place">
              <input value={form.partnerBirthPlace} onChange={(e) => setForm({ ...form, partnerBirthPlace: e.target.value })} placeholder={t('jyotish.city')} className={inputCls} />
            </Field>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Preferred date">
            <input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Language">
            <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget min (₹)">
            <input type="number" min={0} value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Budget max (₹)">
            <input type="number" min={0} value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Notes for the jyotishi">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} placeholder={t('jyotish.guidancePlaceholder')} />
        </Field>
        <p className="text-[11px] text-stone-400">
          Payments happen directly between you and the jyotishi — no money moves through this app.
        </p>
        <Btn type="submit" disabled={saving} className="w-full">
          {saving ? 'Posting…' : '📝 Post requirement'}
        </Btn>
      </form>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* My consultations (devotee side: chat, confirm, rate)               */
/* ------------------------------------------------------------------ */

const MyConsultationsDevotee: React.FC = () => {
  const { myPostedConsultations, submitReview, hasReviewed, advanceConsultation } = useJyotish();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [ratingFor, setRatingFor] = useState<Consultation | null>(null);

  const sorted = useMemo(() => [...myPostedConsultations].sort((a, b) => b.updatedAt - a.updatedAt), [myPostedConsultations]);

  return (
    <Card>
      <SectionTitle>{t('jyotish.myConsultations')}</SectionTitle>
      {sorted.length === 0 ? (
        <Empty text="You haven't posted any consultation requirements yet." />
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <div key={c.id} className="rounded-2xl border border-stone-200 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CONSULTATION_TYPE_META[c.consultationType]?.icon || '🪐'}</span>
                  <span className="font-bold text-stone-900 text-sm">{c.consultationType}</span>
                  <StatusPill status={c.status} />
                </div>
                <span className="text-xs text-stone-500">{c.assignedJyotishName ? `🔮 ${c.assignedJyotishName}` : 'Awaiting a jyotishi'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== 'OPEN' && c.status !== 'CANCELLED' && (
                  <Btn variant="ghost" onClick={() => setOpenChatId(openChatId === c.id ? null : c.id)}>💬 Chat</Btn>
                )}
                {c.mode !== 'chat' && c.sessionLink && (
                  <a href={c.sessionLink} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-indigo-700 border border-indigo-300 min-h-[44px] inline-flex items-center">
                    🔗 Join session
                  </a>
                )}
                {c.status === 'COMPLETED' && (
                  <Btn
                    onClick={() => {
                      if (confirm('Confirm the consultation is complete and release the agreed dakshina? (Workflow record only — pay the jyotishi directly.)')) {
                        advanceConsultation(c, 'DAKSHINA_RELEASED').catch((e) => showToast(e.message, 'error'));
                      }
                    }}
                  >
                    Confirm & release dakshina
                  </Btn>
                )}
                {(c.status === 'COMPLETED' || c.status === 'DAKSHINA_RELEASED') && !hasReviewed(c.id) && (
                  <Btn variant="ghost" onClick={() => setRatingFor(c)}>⭐ Rate</Btn>
                )}
                {c.status === 'OPEN' && (
                  <Btn variant="danger" onClick={() => { if (confirm('Cancel this requirement?')) advanceConsultation(c, 'CANCELLED').catch((e) => showToast(e.message, 'error')); }}>
                    Cancel
                  </Btn>
                )}
              </div>
              {openChatId === c.id && <ConsultationChat consultation={c} />}
            </div>
          ))}
        </div>
      )}
      {ratingFor && <RateDialog consultation={ratingFor} onClose={() => setRatingFor(null)} submitReview={submitReview} />}
    </Card>
  );
};

const RateDialog: React.FC<{
  consultation: Consultation;
  onClose: () => void;
  submitReview: (c: Consultation, rating: number, note: string) => Promise<void>;
}> = ({ consultation, onClose, submitReview }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const send = async () => {
    setSaving(true);
    try {
      await submitReview(consultation, rating, note);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Rating failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-black text-stone-900">⭐ Rate your consultation</h3>
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={`text-3xl min-h-[44px] min-w-[44px] ${n <= rating ? 'text-amber-500' : 'text-stone-300'}`}>
              ★
            </button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('jyotish.guidanceFeedback')} className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm" />
        <div className="flex gap-2">
          <Btn onClick={send} disabled={saving} className="flex-1">{saving ? 'Submitting…' : 'Submit rating'}</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
};
