/** Four-tier verification: progress checklist + credential application form. */
import React, { useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import {
  PUROHIT_TIER_META,
  PUROHIT_TIERS,
  RITUAL_TYPES,
  VEDIC_BRANCHES,
} from '../../../types/purohit';
import { Card, SectionTitle, PrimaryButton, Field, inputCls, EmptyState } from '../ui';

const ID_PROOFS = ['Aadhaar', 'Voter ID', 'PAN Card', 'Parishad ID Card', 'Passport'];

export const VerificationTab: React.FC = () => {
  const {
    profile,
    effectiveTier,
    claimTierAdvancement,
    myApplication,
    submitApplication,
    endorsements,
  } = usePurohit();

  const [form, setForm] = useState({
    certificates: '',
    gurukulAffiliation: profile?.gurukulAffiliation || '',
    idProofType: 'Aadhaar',
    experienceYears: String(profile?.experienceYears || 5),
    specializations: (profile?.specializations || []).join(', '),
    languages: (profile?.languages || []).join(', '),
    city: profile?.city || '',
    phone: profile?.phone || '',
    vedicBranch: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!profile) return <EmptyState title="Loading…" />;

  const current = effectiveTier || profile.verificationTier;
  const currentIdx = PUROHIT_TIERS.indexOf(current);
  const canClaim = effectiveTier && effectiveTier !== profile.verificationTier;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myApplication?.status === 'PENDING') {
      alert('Your application is already under review.');
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication({
        certificates: form.certificates.split('\n').map((s) => s.trim()).filter(Boolean),
        gurukulAffiliation: form.gurukulAffiliation.trim(),
        idProofType: form.idProofType,
        experienceYears: Math.max(0, parseInt(form.experienceYears, 10) || 0),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        city: form.city.trim(),
        phone: form.phone.trim(),
      });
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="Transparent pipeline — every tier has clear, public criteria.">
        Verification
      </SectionTitle>

      {/* Stepper */}
      <Card>
        <div className="space-y-3">
          {PUROHIT_TIERS.map((t, i) => {
            const meta = PUROHIT_TIER_META[t];
            const done = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div
                key={t}
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  isCurrent ? 'border-amber-400 bg-amber-50' : done ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-200'
                }`}
              >
                <div className="text-2xl">{done ? '✅' : meta.badge}</div>
                <div className="flex-1">
                  <p className="text-sm font-black text-stone-900">
                    {i + 1}. {meta.label}
                    <span className="ml-2 text-[11px] font-bold text-stone-400">{meta.labelHi}</span>
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{meta.description}</p>
                  {t === 'CREDENTIAL_VERIFIED' && myApplication && (
                    <p className="text-[11px] font-bold mt-1 text-stone-600">
                      Application: {myApplication.status}
                      {myApplication.status === 'REJECTED' && myApplication.rejectionReason && (
                        <span className="text-red-600"> — {myApplication.rejectionReason}</span>
                      )}
                    </p>
                  )}
                  {t === 'ORG_ENDORSED' && (
                    <p className="text-[11px] font-bold mt-1 text-stone-600">
                      Endorsements: {endorsements.length} (need ≥ 1)
                    </p>
                  )}
                  {t === 'PLATFORM_VERIFIED' && (
                    <p className="text-[11px] font-bold mt-1 text-stone-600">
                      {profile.completedGigs} gigs · ★ {profile.ratingAggregate.toFixed(1)} (need 10 gigs @ ≥ 4.5, or an endorsement)
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {canClaim && (
          <PrimaryButton className="w-full mt-4" onClick={claimTierAdvancement}>
            🎉 Claim {PUROHIT_TIER_META[effectiveTier!].label}
          </PrimaryButton>
        )}
      </Card>

      {/* Application form */}
      {currentIdx < 1 && (
        <Card>
          <SectionTitle sub="Reviewed by the platform team. Honest credentials only — false claims lead to permanent removal.">
            Credential application
          </SectionTitle>
          {myApplication?.status === 'PENDING' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <p className="font-black">⏳ Under review</p>
              <p className="text-xs mt-1">
                Submitted {new Date(myApplication.createdAt).toLocaleDateString('en-IN')}. You'll be
                notified when the platform team decides.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Vedic certificates" hint="One per line: e.g. 'Acharya, Shukla Yajurveda — Sampurnanand Univ., 2018'">
                <textarea
                  value={form.certificates}
                  onChange={(e) => setForm({ ...form, certificates: e.target.value })}
                  rows={3}
                  required
                  className={inputCls}
                  placeholder={'Acharya, Shukla Yajurveda — Sampurnanand Sanskrit Vishwavidyalaya, 2018\nKarmakanda Diploma — …'}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Gurukul affiliation">
                  <input
                    value={form.gurukulAffiliation}
                    onChange={(e) => setForm({ ...form, gurukulAffiliation: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Kashi Gurukulam"
                  />
                </Field>
                <Field label="Vedic branch">
                  <select
                    value={form.vedicBranch}
                    onChange={(e) => setForm({ ...form, vedicBranch: e.target.value })}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="">Select…</option>
                    {VEDIC_BRANCHES.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ID proof type">
                  <select
                    value={form.idProofType}
                    onChange={(e) => setForm({ ...form, idProofType: e.target.value })}
                    className={`${inputCls} bg-white`}
                  >
                    {ID_PROOFS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Years of experience">
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Specializations" hint="Comma-separated">
                <input
                  value={form.specializations}
                  onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  className={inputCls}
                  placeholder="Vivah Samskara, Grihapravesh, Navagraha Havan"
                />
              </Field>
              <Field label="Languages" hint="Comma-separated">
                <input
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  className={inputCls}
                  placeholder="Sanskrit, Hindi, English"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
              <PrimaryButton type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting…' : myApplication?.status === 'REJECTED' ? 'Re-submit application' : 'Submit for verification'}
              </PrimaryButton>
              <p className="text-[11px] text-stone-400 text-center">
                No document uploads in this version — list your credentials; the review team may ask for
                scans over a verification call.
              </p>
            </form>
          )}
        </Card>
      )}

      {/* Endorsements received */}
      {endorsements.length > 0 && (
        <Card>
          <SectionTitle>Organisation endorsements ({endorsements.length})</SectionTitle>
          <div className="space-y-3">
            {endorsements.map((e) => (
              <div key={e.id} className="border border-stone-200 rounded-xl p-3.5">
                <p className="text-sm font-black text-stone-900">🏛️ {e.orgName}</p>
                <p className="text-xs text-stone-600 mt-1">“{e.text}”</p>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {e.ritualCount} rituals together · {new Date(e.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <p className="text-[11px] text-stone-400 px-1">
        Ritual types recognized: {RITUAL_TYPES.join(' · ')}
      </p>
    </div>
  );
};
