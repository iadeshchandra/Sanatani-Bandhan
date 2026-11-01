/**
 * FindPurohit — devotee/B2C marketplace browser.
 * PLATFORM_VERIFIED first, then by rating. Filters by city / specialization /
 * language. Profile cards show tier badge, rating, completed gigs, dakshina
 * range, and endorsements. Booking happens via gig posting; a trustee
 * of a real organisation can also endorse from the expanded card
 * (PUROHIT-PARITY — the endorsement loop's first step).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurohit } from '../../context/PurohitContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';
import { PurohitIdentity, RITUAL_TYPES, PUROHIT_TIER_META, normalizePurohitTier } from '../../types/purohit';
import { Card, SectionTitle, EmptyState, Stars, TierBadge } from './ui';

export const FindPurohit: React.FC = () => {
  const { browsePurohits, getEndorsements } = usePurohit();
  const [list, setList] = useState<PurohitIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [spec, setSpec] = useState('');
  const [lang, setLang] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [endorsements, setEndorsements] = useState<Record<string, any[]>>({});

  const search = async () => {
    setLoading(true);
    try {
      const res = await browsePurohits({
        city: city.trim() || undefined,
        specialization: spec || undefined,
        language: lang.trim() || undefined,
      });
      setList(res);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEndorsements = async (id: string) => {
    try {
      const e = await getEndorsements(id);
      setEndorsements((m) => ({ ...m, [id]: e }));
    } catch {
      setEndorsements((m) => ({ ...m, [id]: [] }));
    }
  };

  const toggleExpand = async (p: PurohitIdentity) => {
    if (expanded === p.id) {
      setExpanded(null);
      return;
    }
    setExpanded(p.id);
    if (!endorsements[p.id]) {
      await loadEndorsements(p.id);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="Verified independent purohits. Platform-verified appear first.">
        Find a Purohit
      </SectionTitle>

      <Card>
        <div className="grid sm:grid-cols-4 gap-2.5">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City…"
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px]"
          />
          <select value={spec} onChange={(e) => setSpec(e.target.value)} className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px] bg-white">
            <option value="">All specializations</option>
            {RITUAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            placeholder="Language…"
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px]"
          />
          <button
            type="button"
            onClick={search}
            className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold min-h-[44px]"
          >
            Search
          </button>
        </div>
      </Card>

      {loading ? (
        <Card><EmptyState title="Searching…" /></Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="No purohits found"
            sub="Try a nearby city, or post your requirement — purohits across the network will see it."
          />
        </Card>
      ) : (
        list.map((p) => {
          const meta = PUROHIT_TIER_META[normalizePurohitTier(p.verificationTier)];
          const isOpen = expanded === p.id;
          return (
            <Card key={p.id}>
              <button type="button" onClick={() => toggleExpand(p)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-stone-900">{p.displayName}</p>
                      <TierBadge tier={p.verificationTier} />
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 font-mono">
                      {p.id} · {p.city}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Stars value={p.ratingAggregate} size="w-3.5 h-3.5" />
                      <span className="text-[11px] text-stone-500 font-bold">
                        {p.ratingAggregate.toFixed(1)} ({p.ratingCount}) · {p.completedGigs} rituals
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      {(p.specializations || []).slice(0, 3).join(' · ')}
                      {(p.dakshinaRangeMin || p.dakshinaRangeMax) &&
                        ` · ₹${(p.dakshinaRangeMin || 0).toLocaleString('en-IN')}–₹${(p.dakshinaRangeMax || 0).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <span className="text-stone-400 text-lg shrink-0">{isOpen ? '▾' : '▸'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5">
                  {p.bio && <p className="text-xs text-stone-600 italic">“{p.bio}”</p>}
                  <p className="text-[11px] text-stone-500">
                    {p.experienceYears} yrs experience · {meta.labelHi}
                    {p.gurukulAffiliation && ` · ${p.gurukulAffiliation}`}
                    <br />
                    Languages: {(p.languages || []).join(', ') || '—'}
                  </p>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-stone-400 mb-1.5">
                      Organisation endorsements ({(endorsements[p.id] || []).length})
                    </p>
                    {(endorsements[p.id] || []).length === 0 ? (
                      <p className="text-[11px] text-stone-400">No endorsements yet.</p>
                    ) : (
                      (endorsements[p.id] || []).map((e: any) => (
                        <div key={e.id} className="text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 mb-1.5">
                          <p className="font-bold text-stone-800">🏛️ {e.orgName}{e.orgType ? <span className="ml-1.5 text-[10px] font-semibold text-stone-500 bg-stone-100 rounded-full px-1.5 py-0.5">{e.orgType}</span> : null}</p>
                          <p className="text-stone-600 mt-0.5">“{e.text}”</p>
                        </div>
                      ))
                    )}
                  </div>
                  <EndorseForm purohitId={p.id} onEndorsed={() => loadEndorsements(p.id)} />
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    To book {p.displayName.split(' ')[0]}, post your requirement — they'll see it in
                    their gig feed and can accept directly.
                  </p>
                  {p.uid && (
                    <Link
                      to={`/seva/pro/${p.uid}`}
                      className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 hover:underline min-h-[44px] py-1"
                    >
                      View {p.displayName.split(' ')[0]}'s full profile with reviews →
                    </Link>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

/**
 * PUROHIT-PARITY (PP-05) — the purohit endorsement loop's first step,
 * mirroring JyotishMarketplace's EndorseForm. `endorsePurohit` existed
 * on the context with NO caller anywhere in the app: a trustee had no
 * in-app way to endorse a purohit, so ORG_ENDORSED was unreachable
 * except by GodMode manual tier set (the JY-11 shape). The context
 * enforces the real gate (signed-in Trustee of a real workspace); its
 * errors speak here via friendlyError.
 */
const EndorseForm: React.FC<{ purohitId: string; onEndorsed: () => void }> = ({
  purohitId,
  onEndorsed,
}) => {
  const { t } = useLanguage();
  const { endorsePurohit } = usePurohit();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
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
      await endorsePurohit(purohitId, text, parseInt(count, 10) || 0);
      setOpen(false);
      setText('');
      onEndorsed();
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 space-y-2">
      <p className="text-xs font-bold text-indigo-800">Trustee endorsement (public record)</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Why does your organisation vouch for this purohit?" className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
      <div className="flex gap-2">
        <input type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} placeholder="Rituals together" className="w-32 px-3 py-2 rounded-xl border border-stone-300 text-sm" />
        <button type="button" onClick={submit} disabled={saving || !text.trim()} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold min-h-[44px] disabled:opacity-50">Submit endorsement</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl text-sm font-bold text-stone-500 min-h-[44px]">Cancel</button>
      </div>
    </div>
  );
};
