/**
 * Jyotish One — personal workspace tabs (consolidated).
 * Overview · Find work · My consultations (chat + status machine) ·
 * Earnings · Availability · Verification · Reviews · Referrals · Profile.
 */
import React, { useMemo, useState } from 'react';
import { useJyotish, useConsultationMessages } from '../context/JyotishContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import {
  CONSULTATION_STATUS_META,
  CONSULTATION_TYPES,
  CONSULTATION_TYPE_META,
  JYOTISH_SPECIALIZATIONS,
  JYOTISH_TIERS,
  JYOTISH_TIER_META,
  Consultation,
  ConsultationStatus,
  JyotishIdentity,
} from '../types/jyotish';
import { Card, StatusPill, Btn, Empty, SectionTitle, Field, inputCls } from './ui';
import { ConsultationChat } from './ConsultationChat';
import { ReferProfessional } from './RemedyReferral';

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export const OverviewTab: React.FC<{ goTo: (t: any) => void }> = ({ goTo }) => {
  const { t } = useLanguage();
  const { profile, myConsultations, openConsultations, effectiveTier, myInvites, myReferrals } = useJyotish();
  const active = myConsultations.filter((c) => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length;
  const earned = myConsultations
    .filter((c) => c.status === 'DAKSHINA_RELEASED')
    .reduce((s, c) => s + (c.dakshinaAgreed || 0), 0);
  const stats = [
    { label: t('jyotish.activeConsultations'), value: String(active), go: 'consultations' },
    { label: t('jyotish.openRequirements'), value: String(openConsultations.length), go: 'find' },
    { label: t('jyotish.dakshinaReleased'), value: `₹${earned.toLocaleString('en-IN')}`, go: 'earnings' },
    { label: t('jyotish.referralsMade'), value: String(myReferrals.length), go: 'referrals' },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <SectionTitle>
              <span className="text-xl">{t('jyotish.namaste')}, {profile?.displayName?.split(' ')[0] || t('jyotish.shell.fallbackName')} 🙏</span>
            </SectionTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {effectiveTier && <VerificationBadge tier={effectiveTier} subject="Jyotishi" size="md" />}
              <span className="text-xs text-stone-500 font-mono">{profile?.id}</span>
            </div>
          </div>
        </div>
        {myInvites.filter((i) => i.status === 'PENDING').length > 0 && (
          <p className="mt-3 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
            🏛️ {t('jyotish.orgInvites').replace('{n}', String(myInvites.filter((i) => i.status === 'PENDING').length))}
          </p>
        )}
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <button key={s.label} onClick={() => goTo(s.go)} className="text-left">
            <Card className="hover:border-indigo-300 transition-colors h-full">
              <div className="text-2xl font-black text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            </Card>
          </button>
        ))}
      </div>
      <Card>
        <SectionTitle>{t('jyotish.consultationTypes')}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {CONSULTATION_TYPES.map((t) => (
            <div key={t} className="flex items-start gap-2 rounded-xl border border-stone-100 p-2.5">
              <span className="text-xl">{CONSULTATION_TYPE_META[t].icon}</span>
              <div>
                <div className="text-sm font-bold text-stone-800">{t}</div>
                <div className="text-xs text-stone-500">{CONSULTATION_TYPE_META[t].description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Find work (open requirements)                                       */
/* ------------------------------------------------------------------ */

export const FindConsultationsTab: React.FC = () => {
  const { t } = useLanguage();
  const { openConsultations, acceptConsultation } = useJyotish();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const list = useMemo(
    () => (typeFilter ? openConsultations.filter((c) => c.consultationType === typeFilter) : openConsultations),
    [openConsultations, typeFilter]
  );
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <SectionTitle>{t('jyotish.openRequirements')}</SectionTitle>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${inputCls} !w-auto`}>
            <option value="">{t('jyotish.allTypes')}</option>
            {CONSULTATION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {list.length === 0 ? (
          <Empty text={t('jyotish.noOpen')} />
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <ConsultationCard key={c.id} c={c}>
                <Btn onClick={() => acceptConsultation(c).catch((e) => alert(e.message))}>{t('jyotish.accept')}</Btn>
              </ConsultationCard>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export const ConsultationCard: React.FC<{ c: Consultation; children?: React.ReactNode }> = ({ c, children }) => (
  <div className="rounded-2xl border border-stone-200 p-4 space-y-2">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{CONSULTATION_TYPE_META[c.consultationType]?.icon || '🪐'}</span>
        <span className="font-bold text-stone-900 text-sm">{c.consultationType}</span>
        <StatusPill status={c.status} />
      </div>
      <span className="text-xs text-stone-500">{c.mode === 'chat' ? '💬 Chat' : c.mode === 'call' ? '📞 Call' : '🎥 Video'}</span>
    </div>
    <div className="text-xs text-stone-600">
      {c.devoteeName} · {c.city} · {c.language} · prefers {c.preferredDate || 'flexible'}
      {c.budgetMax > 0 && <> · budget ₹{c.budgetMin}–₹{c.budgetMax}</>}
    </div>
    {c.notes && <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-2.5">{c.notes}</p>}
    {(c.birthDate || c.partnerBirthDate) && (
      <p className="text-[11px] text-stone-500">
        {c.birthDate && <>🎂 {c.birthDate}{c.birthTime ? ` ${c.birthTime}` : ''}{c.birthPlace ? `, ${c.birthPlace}` : ''}</>}
        {c.partnerBirthDate && <> · partner: {c.partnerBirthDate}{c.partnerBirthTime ? ` ${c.partnerBirthTime}` : ''}{c.partnerBirthPlace ? `, ${c.partnerBirthPlace}` : ''}</>}
      </p>
    )}
    {children && <div className="flex gap-2 pt-1">{children}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* My consultations (status machine + chat)                            */
/* ------------------------------------------------------------------ */

const NEXT_ACTIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['DAKSHINA_RELEASED'],
  DAKSHINA_RELEASED: [],
  CANCELLED: [],
};

const getActionLabel = (t: (k: string) => string): Record<string, string> => ({
  IN_PROGRESS: t('jyotish.startConsultation'),
  COMPLETED: t('jyotish.markComplete'),
  DAKSHINA_RELEASED: t('jyotish.confirmRelease'),
  CANCELLED: t('jyotish.cancel'),
});

export const MyConsultationsTab: React.FC = () => {
  const { t } = useLanguage();
  const { myConsultations, advanceConsultation, setSessionLink } = useJyotish();
  const { showToast } = useToast();
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [linkVal, setLinkVal] = useState('');
  const ACTION_LABEL = getActionLabel(t);

  const sorted = useMemo(
    () => [...myConsultations].sort((a, b) => b.updatedAt - a.updatedAt),
    [myConsultations]
  );

  const saveLink = async (c: Consultation) => {
    if (!linkVal.trim()) return;
    await setSessionLink(c, linkVal.trim());
    setLinkFor(null);
    setLinkVal('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('jyotish.myConsultations')}</SectionTitle>
        <p className="text-[11px] text-stone-400 mb-3">
          {t('jyotish.dakshinaNote')}
        </p>
        {sorted.length === 0 ? (
          <Empty text={t('jyotish.noConsultations')} />
        ) : (
          <div className="space-y-3">
            {sorted.map((c) => (
              <div key={c.id}>
                <ConsultationCard c={c}>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_ACTIONS[c.status].map((next) => (
                      <Btn
                        key={next}
                        variant={next === 'CANCELLED' ? 'danger' : next === 'DAKSHINA_RELEASED' ? 'primary' : 'ghost'}
                        onClick={() => {
                          const label = ACTION_LABEL[next] || next;
                          if (next === 'CANCELLED' && !confirm(t('jyotish.confirmCancel'))) return;
                          if (next === 'DAKSHINA_RELEASED' && !confirm(t('jyotish.confirmDakshinaPrompt'))) return;
                          advanceConsultation(c, next).catch((e) => showToast(e.message, 'error'));
                        }}
                      >
                        {ACTION_LABEL[next] || next}
                      </Btn>
                    ))}
                    <Btn variant="ghost" onClick={() => setOpenChatId(openChatId === c.id ? null : c.id)}>
                      💬 {t('jyotish.chat')}
                    </Btn>
                    {c.mode !== 'chat' && (
                      <Btn variant="ghost" onClick={() => { setLinkFor(c.id); setLinkVal(c.sessionLink || ''); }}>
                        🔗 {t('jyotish.sessionLink')}
                      </Btn>
                    )}
                    {c.status === 'ASSIGNED' && (
                      <ReferProfessional consultationId={c.id} compact />
                    )}
                  </div>
                </ConsultationCard>
                {c.mode !== 'chat' && c.sessionLink && (
                  <p className="text-[11px] text-stone-500 mt-1 ml-1">
                    🔗 {t('jyotish.scheduledSession')}: <a href={c.sessionLink} target="_blank" rel="noreferrer" className="text-indigo-600 underline break-all">{c.sessionLink}</a>
                    <span className="text-stone-400"> {t('jyotish.noTelephony')}</span>
                  </p>
                )}
                {linkFor === c.id && (
                  <div className="flex gap-2 mt-2 ml-1">
                    <input value={linkVal} onChange={(e) => setLinkVal(e.target.value)} placeholder={t('jyotish.pasteLink')} className={inputCls} />
                    <Btn onClick={() => saveLink(c)}>{t('jyotish.save')}</Btn>
                  </div>
                )}
                {openChatId === c.id && (
                  <div className="mt-2 ml-1">
                    <ConsultationChat consultation={c} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Earnings                                                            */
/* ------------------------------------------------------------------ */

export const EarningsTab: React.FC = () => {
  const { t } = useLanguage();
  const { myConsultations } = useJyotish();
  const released = myConsultations.filter((c) => c.status === 'DAKSHINA_RELEASED');
  const total = released.reduce((s, c) => s + (c.dakshinaAgreed || 0), 0);
  const byType = useMemo(() => {
    const m = new Map<string, { n: number; amt: number }>();
    for (const c of released) {
      const e = m.get(c.consultationType) || { n: 0, amt: 0 };
      e.n += 1;
      e.amt += c.dakshinaAgreed || 0;
      m.set(c.consultationType, e);
    }
    return [...m.entries()];
  }, [released]);
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('jyotish.earnings')}</SectionTitle>
        <div className="text-3xl font-black text-stone-900">₹{total.toLocaleString('en-IN')}</div>
        <p className="text-xs text-stone-500 mt-1">
          {t('jyotish.sumAcross').replace('{n}', String(released.length))}
        </p>
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
          ⚠️ {t('jyotish.workflowNote')}
        </p>
      </Card>
      <Card>
        <SectionTitle>{t('jyotish.byType')}</SectionTitle>
        {byType.length === 0 ? (
          <Empty text={t('jyotish.nothingYet')} />
        ) : (
          <div className="space-y-2">
            {byType.map(([t, e]) => (
              <div key={t} className="flex items-center justify-between text-sm border-b border-stone-100 py-2">
                <span className="font-bold text-stone-800">{t} <span className="text-stone-400 font-medium">× {e.n}</span></span>
                <span className="font-black text-stone-900">₹{e.amt.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SHIFTS = ['morning', 'evening'];

export const AvailabilityTab: React.FC = () => {
  const { t } = useLanguage();
  const { availability, saveAvailability } = useJyotish();
  const [slots, setSlots] = useState<Record<string, boolean>>(availability?.slots || {});
  const [saving, setSaving] = useState(false);

  const toggle = (k: string) => setSlots((s) => ({ ...s, [k]: !s[k] }));

  const save = async () => {
    setSaving(true);
    try {
      await saveAvailability(slots);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle>{t('jyotish.weeklyAvailability')}</SectionTitle>
      <p className="text-xs text-stone-500 mb-4">{t('jyotish.tickSlots')}</p>
      <div className="space-y-2">
        {DAYS.map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-12 text-xs font-black uppercase text-stone-500">{d}</span>
            {SHIFTS.map((s) => {
              const k = `${d}-${s}`;
              const on = !!slots[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggle(k)}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border transition-all ${
                    on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-stone-500 border-stone-200'
                  }`}
                >
                  {s === 'morning' ? `🌅 ${t('jyotish.parts_morning')}` : `🌙 ${t('jyotish.parts_evening')}`}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <Btn onClick={save} disabled={saving} className="mt-4 w-full">
        {saving ? t('jyotish.saving') : t('jyotish.saveAvailability')}
      </Btn>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Verification (4-tier pipeline)                                      */
/* ------------------------------------------------------------------ */

const ID_PROOFS = ['Aadhaar', 'Voter ID', 'PAN Card', 'Parishad ID Card', 'Passport'];

export const VerificationTab: React.FC = () => {
  const { t } = useLanguage();
  const {
    profile,
    effectiveTier,
    claimTierAdvancement,
    myApplication,
    submitApplication,
    endorsements,
  } = useJyotish();

  const [form, setForm] = useState({
    certificates: '',
    parampara: profile?.parampara || '',
    guruName: '',
    idProofType: 'Aadhaar',
    experienceYears: String(profile?.experienceYears || 5),
    specializations: (profile?.specializations || []).join(', '),
    languages: (profile?.languages || []).join(', '),
    city: profile?.city || '',
    phone: profile?.phone || '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!profile) return <Empty text={t('jyotish.loading')} />;

  const current = effectiveTier || profile.verificationTier;
  const currentIdx = JYOTISH_TIERS.indexOf(current);
  const canClaim = effectiveTier && effectiveTier !== profile.verificationTier;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myApplication?.status === 'PENDING') {
      alert(t('jyotish.alreadyUnderReview'));
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication({
        certificates: form.certificates.split('\n').map((s) => s.trim()).filter(Boolean),
        parampara: form.parampara.trim(),
        guruName: form.guruName.trim(),
        idProofType: form.idProofType,
        experienceYears: Math.max(0, parseInt(form.experienceYears, 10) || 0),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        city: form.city.trim(),
        phone: form.phone.trim(),
      });
    } catch (err: any) {
      alert(err.message || t('jyotish.submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('jyotish.verificationPipeline')}</SectionTitle>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {JYOTISH_TIERS.map((t, i) => (
            <React.Fragment key={t}>
              <div className={`flex flex-col items-center gap-1 ${i <= currentIdx ? '' : 'opacity-40'}`}>
                <VerificationBadge tier={t} subject="Jyotishi" />
                <span className="text-[10px] text-stone-500 max-w-[90px] text-center">{JYOTISH_TIER_META[t].description}</span>
              </div>
              {i < JYOTISH_TIERS.length - 1 && <span className="text-stone-300">→</span>}
            </React.Fragment>
          ))}
        </div>
        {canClaim && (
          <Btn onClick={() => claimTierAdvancement()}>
            ⬆️ {t('jyotish.claimTier').replace('{tier}', effectiveTier.replace(/_/g, ' '))}
          </Btn>
        )}
        <p className="text-[11px] text-stone-400 mt-3">
          {t('jyotish.pipelineSub')}
        </p>
      </Card>

      <Card>
        <SectionTitle>{t('jyotish.credentialApplication')}</SectionTitle>
        {myApplication ? (
          <div className="text-sm">
            <p>
              {t('jyotish.status')}:{' '}
              <span className={`font-black ${myApplication.status === 'APPROVED' ? 'text-emerald-700' : myApplication.status === 'REJECTED' ? 'text-red-600' : 'text-amber-700'}`}>
                {myApplication.status}
              </span>
            </p>
            {myApplication.rejectionReason && (
              <p className="text-xs text-red-600 mt-1">{t('jyotish.rejectionReason')}: {myApplication.rejectionReason}</p>
            )}
            <p className="text-xs text-stone-400 mt-2">
              {t('jyotish.adminReview')}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label={t('jyotish.vedicCerts')}>
              <textarea value={form.certificates} onChange={(e) => setForm({ ...form, certificates: e.target.value })} rows={3} className={inputCls} placeholder={'Jyotish Acharya — Sampurnanand Sanskrit Vishwavidyalaya\n…'} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('jyotish.parampara')}>
                <input value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('jyotish.guruName')}>
                <input value={form.guruName} onChange={(e) => setForm({ ...form, guruName: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('jyotish.idProofType')}>
                <select value={form.idProofType} onChange={(e) => setForm({ ...form, idProofType: e.target.value })} className={inputCls}>
                  {ID_PROOFS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('jyotish.yearsExp')}>
                <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label={t('jyotish.specializations')}>
              <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} className={inputCls} placeholder={[...JYOTISH_SPECIALIZATIONS].slice(0, 4).join(', ')} />
            </Field>
            <Btn type="submit" disabled={submitting} className="w-full">
              {submitting ? t('jyotish.submitting') : `📜 ${t('jyotish.submitApp')}`}
            </Btn>
          </form>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('jyotish.endorsementsTitle')} ({endorsements.length})</SectionTitle>
        {endorsements.length === 0 ? (
          <p className="text-xs text-stone-500">
            Any real organisation's Trustee can endorse you from your public profile in the
            marketplace. One endorsement advances Credential Verified → Organisation Endorsed.
          </p>
        ) : (
          <div className="space-y-2">
            {endorsements.map((e) => (
              <div key={e.id} className="rounded-xl border border-stone-200 p-3">
                <div className="text-sm font-bold text-stone-800">🏛️ {e.orgName}</div>
                <p className="text-xs text-stone-600 mt-1">{e.text}</p>
                <p className="text-[11px] text-stone-400 mt-1">{e.consultationCount} {t('jyotish.consultationsTogether')}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export const ReviewsTab: React.FC = () => {
  const { t } = useLanguage();
  const { myReceivedReviews, profile } = useJyotish();
  return (
    <Card>
      <SectionTitle>{t('jyotish.reviews')}</SectionTitle>
      {profile && profile.ratingCount > 0 && (
        <p className="text-sm text-stone-600 mb-3">
          ★ <b>{profile.ratingAggregate.toFixed(1)}</b> {t('jyotish.averageAcross').replace('{n}', String(profile.ratingCount))}
        </p>
      )}
      {myReceivedReviews.length === 0 ? (
        <Empty text={t('jyotish.noReviews')} />
      ) : (
        <div className="space-y-2">
          {myReceivedReviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-stone-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-800">{r.reviewerName}</span>
                <span className="text-amber-600 font-black text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.note && <p className="text-xs text-stone-600 mt-1">{r.note}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Referrals (cross-link with Purohit One)                             */
/* ------------------------------------------------------------------ */

export const ReferralsTab: React.FC = () => {
  const { t } = useLanguage();
  const { myReferrals, myInvites, respondToInvite, profile } = useJyotish();
  const pending = myInvites.filter((i) => i.status === 'PENDING');
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>{t('jyotish.referralsMade')}</SectionTitle>
        <p className="text-xs text-stone-500 mb-3">
          {t('jyotish.referralNote')}
        </p>
        {myReferrals.length === 0 ? (
          <Empty text={t('jyotish.noReferrals')} />
        ) : (
          <div className="space-y-2">
            {myReferrals.map((r) => (
              <div key={r.id} className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-stone-800">🤝 {r.toName}</div>
                  <p className="text-xs text-stone-500">{r.reason}</p>
                </div>
                <VerificationBadge tier={r.toTier} subject={r.toKind === 'purohit' ? 'Purohit' : 'Jyotishi'} size="xs" />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <SectionTitle>{t('jyotish.orgInvites').replace('{n}', String(pending.length))}</SectionTitle>
        {pending.length === 0 ? (
          <Empty text={t('jyotish.noInvites')} />
        ) : (
          <div className="space-y-2">
            {pending.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-stone-200 p-3">
                <div className="text-sm font-bold text-stone-800">🏛️ {inv.orgName}</div>
                {inv.message && <p className="text-xs text-stone-600 mt-1">{inv.message}</p>}
                <div className="flex gap-2 mt-2">
                  <Btn onClick={() => respondToInvite(inv, true)}>{t('jyotish.accept')}</Btn>
                  <Btn variant="ghost" onClick={() => respondToInvite(inv, false)}>{t('jyotish.decline')}</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const ProfileTab: React.FC = () => {
  const { t } = useLanguage();
  const { profile, updateProfile, effectiveTier } = useJyotish();
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
    languages: (profile?.languages || []).join(', '),
    specializations: (profile?.specializations || []).join(', '),
    parampara: profile?.parampara || '',
    bio: profile?.bio || '',
    experienceYears: String(profile?.experienceYears || 0),
    feeRangeMin: String(profile?.feeRangeMin || ''),
    feeRangeMax: String(profile?.feeRangeMax || ''),
  });
  const [_saving, _setSaving] = useState(false);

  if (!profile) return <Empty text={t('jyotish.loading')} />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    _setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        parampara: form.parampara.trim(),
        bio: form.bio.trim(),
        experienceYears: Math.max(0, parseInt(form.experienceYears, 10) || 0),
        feeRangeMin: form.feeRangeMin ? Math.max(0, parseInt(form.feeRangeMin, 10) || 0) : undefined,
        feeRangeMax: form.feeRangeMax ? Math.max(0, parseInt(form.feeRangeMax, 10) || 0) : undefined,
      } as any);
    } finally {
      _setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <SectionTitle>{t('jyotish.publicProfile')}</SectionTitle>
        {effectiveTier && <VerificationBadge tier={effectiveTier} subject="Jyotishi" />}
      </div>
      <form onSubmit={save} className="space-y-3">
        <Field label={t('jyotish.displayName')}>
          <input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('jyotish.phone')}>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t('jyotish.city')}>
            <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label={t('jyotish.bioLabel')}>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputCls} placeholder={t('jyotish.bioPlaceholder')} />
        </Field>
        <Field label={t('jyotish.paramparaLabel')}>
          <input value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('jyotish.yearsExp')}>
            <input type="number" min={0} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t('jyotish.languagesLabel')}>
            <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label={t('jyotish.specializationsLabel')}>
          <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fee range min (₹, informational)">
            <input type="number" min={0} value={form.feeRangeMin} onChange={(e) => setForm({ ...form, feeRangeMin: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Fee range max (₹, informational)">
            <input type="number" min={0} value={form.feeRangeMax} onChange={(e) => setForm({ ...form, feeRangeMax: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <p className="text-[11px] text-stone-400">
          Fee ranges are informational only. Devotees pay you directly — no money moves through this app.
        </p>
        <Btn type="submit" disabled={_saving} className="w-full">
          {_saving ? 'Saving…' : 'Save profile'}
        </Btn>
      </form>
    </Card>
  );
};
