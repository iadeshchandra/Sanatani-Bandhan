/**
 * godmode/TranslationsTab.tsx — GodMode "Translations" tab.
 * ===========================================================
 * The Translation Quality System's review console:
 *
 *  1. Quality dashboard — per language × namespace: draft vs verified
 *     key counts with a progress bar.
 *  2. Suggestions queue — devotees' "🙏 Help us say this better"
 *     suggestions, current vs suggested side-by-side. Approve writes a
 *     runtime override (live without redeploy); reject keeps the record.
 *  3. Direct editor — pick language + namespace, edit any key's text;
 *     saves as a runtime override. Glossary hints sit beside the editor.
 *  4. Export / Import — export a namespace as JSON for a professional
 *     reviewer; import their reviewed JSON back as overrides (keys are
 *     validated against the bundled schema).
 *
 * Data:
 *  translationSuggestions/{autoId}  devotee suggestions (status pending/approved/rejected)
 *  translationOverrides/{lang}      flat map key → approved text, merged over bundled dicts
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Languages,
  Pencil,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { auth, db } from '../../../firebase';
import {
  ALL_DRAFT_NAMESPACES,
  SUPPORTED_LANGS,
  countKeysUnder,
  flattenKeys,
  resolveNestedKey,
  type SupportedLang,
} from '../../../i18n/translationQuality';
import {
  applyTranslationOverrides,
  getDict,
  getOverrideMap,
  loadLanguageDict,
} from '../../../i18n/translations';
import {
  extractRegionalOverrides,
  fetchTranslationOverrides,
  parseRegionalOverrideKey,
  regionalOverrideKey,
} from '../../../i18n/translationOverrides';
import {
  APPROVED_TERMS,
  DRAFT_LANGS,
  NEVER_TRANSLATE_GUIDANCE,
  REGIONAL_TERMS,
  REGIONAL_TERM_KEYS,
  REGIONS,
  isDraftLang,
  regionalTermHint,
  type DraftLang,
} from '../../../i18n/glossary';
import {
  REGION_IDS,
  effectiveRegionalTerm,
  isDraftRegionalTerm,
  type RegionId,
} from '../../../i18n/regionalTerms';
import { scoreSuggestion, type TriageResult } from '../../../ai/godmode/triage';
import { logAiAction } from '../../../ai/audit';
import { useLanguage } from '../../../context/LanguageContext';

/* ------------------------------------------------------------------ types */

interface Suggestion {
  id: string;
  lang?: string;
  key?: string;
  currentText?: string;
  suggestedText?: string;
  uid?: string;
  sanataniId?: string | null;
  /** Regional vocabulary context (RegionId), when the suggestion is regional. */
  region?: string | null;
  /** Regional term key (e.g. 'temple'), when the suggestion is regional. */
  termKey?: string | null;
  status?: string;
  createdAt?: { toDate?: () => Date } | null;
}

type Section = 'dashboard' | 'queue' | 'editor' | 'port';

/** Namespace value that switches the editor/export to the regional layer. */
const REGIONAL_NS = 'regional';

/**
 * Trilingual copy for the regional-vocabulary surfaces. The owner
 * console's older sections are English-hardcoded; the new regional UI
 * ships EN/HI/BN from day one via the app's safeTranslate.
 */
function useRegionalStrings() {
  const { safeTranslate } = useLanguage();
  return useMemo(
    () => ({
      regionalTitle: safeTranslate(
        'gm.tr.regionalTitle', 'Regional vocabulary',
        'আঞ্চলিক শব্দভাণ্ডার', 'क्षेत्रीय शब्दावली'),
      regionalBlurb: safeTranslate(
        'gm.tr.regionalBlurb',
        'Every region keeps its own words for community things — a Tamil devotee reads கோவில், never a northern word in Tamil script. Sacred terms never vary.',
        'প্রতিটি অঞ্চলের নিজস্ব শব্দ আছে সম্প্রদায়ের বিষয়গুলোর জন্য — তামিল ভক্ত পড়বেন கோவில், তামিল লিপিতে উত্তর ভারতীয় শব্দ নয়। পবিত্র শব্দ কখনো বদলায় না।',
        'हर क्षेत्र के अपने शब्द हैं सामुदायिक बातों के लिए — तमिल भक्त கோவில் पढ़ेंगे, तमिल लिपि में कोई उत्तर भारतीय शब्द नहीं। पवित्र शब्द कभी नहीं बदलते।'),
      customized: safeTranslate(
        'gm.tr.customized', 'customized', 'সংশোধিত', 'अनुकूलित'),
      draft: safeTranslate(
        'gm.tr.draft', 'draft', 'খসড়া', 'मसौदा'),
      verified: safeTranslate(
        'gm.tr.verified', 'verified', 'যাচাইকৃত', 'सत्यापित'),
      regionLabel: safeTranslate(
        'gm.tr.region', 'Region', 'অঞ্চল', 'क्षेत्र'),
      regionalNs: safeTranslate(
        'gm.tr.regionalNs', '🗺️ regional — community words by region',
        '🗺️ আঞ্চলিক — অঞ্চলভেদে সম্প্রদায়ের শব্দ',
        '🗺️ क्षेत्रीय — क्षेत्र के अनुसार सामुदायिक शब्द'),
      whyVaries: safeTranslate(
        'gm.tr.whyVaries', 'Why this word varies',
        'এই শব্দ কেন বদলায়', 'यह शब्द क्यों बदलता है'),
      curatorConfidence: safeTranslate(
        'gm.tr.curatorConfidence', 'Curator confidence',
        'সংকলকের আস্থা', 'संकलक का विश्वास'),
      regionalFootnote: safeTranslate(
        'gm.tr.regionalFootnote',
        'Overrides land here as you approve suggestions or edit below — live in the app without a redeploy. 🙏',
        'আপনি পরামর্শ অনুমোদন করলে বা নিচে সম্পাদনা করলে সংশোধন এখানে আসবে — পুনরায় ডিপ্লয় ছাড়াই অ্যাপে সরাসরি। 🙏',
        'जैसे ही आप सुझाव स्वीकृत करेंगे या नीचे संपादित करेंगे, संशोधन यहाँ दिखेंगे — बिना री-डिप्लॉय के ऐप में सीधे। 🙏'),
    }),
    [safeTranslate]
  );
}

/* ------------------------------------------------------- quality dashboard */

const Dashboard: React.FC = () => {
  const enDict = getDict('en');
  const rows = useMemo(
    () =>
      DRAFT_LANGS.map((lang) => ({
        lang,
        namespaces: ALL_DRAFT_NAMESPACES.map((ns) => ({
          ns,
          keys: countKeysUnder(enDict, ns),
        })),
      })),
    [enDict]
  );
  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
        <Languages className="w-5 h-5 text-amber-700" aria-hidden />
        Translation quality
      </h3>
      <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">
        Draft strings display normally in the app — an imperfect mother-tongue
        string beats English for someone who doesn't read English. Review a
        namespace below (or approve suggestions) and its strings graduate to
        verified. <span className="font-semibold text-stone-700">en · hi · bn</span> are
        fully verified already.
      </p>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.lang} className="rounded-xl bg-stone-50 border border-stone-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-black uppercase tracking-widest text-stone-700">
                {r.lang}
              </span>
              <span className="text-[12px] font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
                draft
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {r.namespaces.map((n) => (
                <div key={n.ns} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-[13px] text-stone-600 font-mono">{n.ns}</span>
                  <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden" aria-hidden>
                    <div className="h-full w-0 bg-amber-500 rounded-full" />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[12px] text-stone-500">
                    0 / {n.keys} verified
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-stone-400">
        The bar fills as overrides land — every approved suggestion or direct
        edit moves its key toward verified.
      </p>
      </div>
      <RegionalCard />
    </>
  );
};

/* ----------------------------------------------- regional vocabulary card */

const RegionalCard: React.FC = () => {
  const s = useRegionalStrings();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // One public read per language doc; the regional.* keys in each doc's
      // flat map are the live override layer.
      const langs = [...new Set(Object.values(REGIONS).map((r) => r.lang))];
      const out: Record<string, number> = {};
      await Promise.all(
        langs.map(async (l) => {
          try {
            const snap = await getDoc(doc(db, 'translationOverrides', l));
            if (!snap.exists()) return;
            const data = snap.data() as Record<string, unknown>;
            const flat: Record<string, string> = {};
            for (const k of Object.keys(data)) {
              if (typeof data[k] === 'string') flat[k] = data[k] as string;
            }
            const byRegion = extractRegionalOverrides(flat);
            for (const [regionId, terms] of Object.entries(byRegion)) {
              out[regionId] = (out[regionId] || 0) + Object.keys(terms).length;
            }
          } catch {
            // The card degrades to zeros — never blocks the console.
          }
        })
      );
      if (alive) {
        setCounts(out);
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const total = REGIONAL_TERM_KEYS.length;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 mt-4">
      <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
        <span aria-hidden>🗺️</span> {s.regionalTitle}
      </h3>
      <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">{s.regionalBlurb}</p>
      {!loaded ? (
        <p className="mt-3 text-[13px] text-stone-500">Loading regional overrides…</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REGION_IDS.map((id) => {
            const info = REGIONS[id];
            const n = counts[id] || 0;
            // The 7 draft languages' regions start draft; en/hi/bn are verified.
            const draft = isDraftLang(info.lang);
            return (
              <div key={id} className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-stone-800">{info.label}</span>
                  {draft ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      {s.draft}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                      {s.verified}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-stone-500">{info.blurb}</p>
                <p className="mt-1 text-[12px] text-stone-500">
                  <span className="font-bold text-stone-700">
                    {n} / {total}
                  </span>{' '}
                  {s.customized}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[12px] text-stone-400">{s.regionalFootnote}</p>
    </div>
  );
};

/* -------------------------------- AI triage (Phase 0): proposes, owner disposes

   scoreSuggestion (src/ai/godmode/triage.ts) is deterministic and
   explainable — it only PROPOSES a verdict. The Approve/Reject tap in
   the queue below stays the owner's, always. */

const TriageBadge: React.FC<{
  score: number;
  recommendation: TriageResult['recommendation'];
}> = ({ score, recommendation }) => (
  <span
    title="AI triage score — open ‘AI triage — why?’ below for the reasons. The Approve/Reject tap stays the owner’s."
    className={`text-[11px] font-black rounded-full px-2 py-0.5 ${
      recommendation === 'approve'
        ? 'text-green-700 bg-green-100'
        : recommendation === 'review'
          ? 'text-amber-700 bg-amber-100'
          : 'text-red-700 bg-red-100'
    }`}
  >
    🤖 {score}
  </span>
);

/* ------------------------------------------------------- suggestions queue */

const Queue: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const s = useRegionalStrings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Single-field orderBy avoids a composite index; filter client-side.
      const q = query(collection(db, 'translationSuggestions'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const all: Suggestion[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));
      setItems(all.filter((s) => (s.status || 'pending') === 'pending'));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (s: Suggestion, approve: boolean) => {
    if (!s.id || busy) return;
    setBusy(s.id);
    try {
      const batch = writeBatch(db);
      const sugRef = doc(db, 'translationSuggestions', s.id);
      if (approve && s.lang && s.key && s.suggestedText) {
        // The override is written under the key verbatim. For regional
        // suggestions the key is already the full
        // `regional.{region}.{termKey}` — it lands exactly where the
        // regional layer reads it, live without a redeploy. A malformed
        // regional key never reaches the override doc (the suggestion is
        // still marked reviewed so it can't jam the queue).
        const overrideKey = s.key;
        const regionalOk =
          !overrideKey.startsWith('regional.') || parseRegionalOverrideKey(overrideKey);
        if (regionalOk) {
          batch.set(
            doc(db, 'translationOverrides', s.lang),
            { [overrideKey]: s.suggestedText },
            { merge: true }
          );
          // …and immediately in this console session too.
          applyTranslationOverrides(s.lang, { [overrideKey]: s.suggestedText });
        }
      }
      batch.update(sugRef, {
        status: approve ? 'approved' : 'rejected',
        reviewedAt: serverTimestamp(),
      });
      await batch.commit();
      // AI audit (Phase 0): the triage verdict that informed this decision,
      // appended to the append-only audit log. Fail-open — never throws.
      {
        const t = scoreSuggestion({
          lang: s.lang || 'en',
          key: s.key || '',
          currentText: s.currentText || '',
          suggestedText: s.suggestedText || '',
          region: s.region || null,
          termKey: s.termKey || null,
        });
        await logAiAction({
          actorUid: auth.currentUser?.uid || '',
          action: approve ? 'translation_triage_approve' : 'translation_triage_reject',
          detail: `${s.lang}/${s.key} · triage ${t.score}/100 (${t.recommendation}) · ${t.reasons[0] || ''}`,
        });
      }
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      onChanged();
    } catch {
      // leave the item in place; the owner can retry
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-stone-900">
          Suggestions from devotees {items.length > 0 && (
            <span className="ml-1 text-[12px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
              {items.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={load}
          className="min-h-[44px] px-3 rounded-xl border border-stone-200 text-[13px] font-bold text-stone-600 flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" aria-hidden /> Refresh
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-[13px] text-stone-500">Loading suggestions…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-[13px] text-stone-500">
          No pending suggestions. When a devotee taps “🙏 Help us say this better”
          on a draft string, it appears here. 🙏
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((s) => {
            // Regional suggestions show WHERE the wording belongs:
            // prefer the writer's explicit fields, fall back to parsing
            // the `regional.{region}.{termKey}` key itself.
            const regional =
              s.region && s.termKey
                ? { region: s.region, termKey: s.termKey }
                : s.key
                  ? parseRegionalOverrideKey(s.key)
                  : null;
            // AI triage (Phase 0): deterministic score + explainable reasons.
            // The verdict is advisory — the buttons below stay human-only.
            const t = scoreSuggestion({
              lang: s.lang || 'en',
              key: s.key || '',
              currentText: s.currentText || '',
              suggestedText: s.suggestedText || '',
              region: s.region || null,
              termKey: s.termKey || null,
            });
            return (
            <div key={s.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-black uppercase tracking-widest text-stone-500">{s.lang}</span>
                <code className="font-mono text-stone-600 bg-stone-100 rounded px-1.5 py-0.5">{s.key}</code>
                <TriageBadge score={t.score} recommendation={t.recommendation} />
                {regional && (
                  <span className="font-bold text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5">
                    🗺️ {regional.region} · {regional.termKey}
                  </span>
                )}
                <span className="text-stone-400">
                  from {s.sanataniId || (s.uid ? s.uid.slice(0, 8) + '…' : 'a devotee')}
                </span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Current</p>
                  <p className="mt-1 text-[13px] text-stone-600 leading-relaxed">{s.currentText}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Suggested</p>
                  <p className="mt-1 text-[13px] text-stone-800 leading-relaxed">{s.suggestedText}</p>
                </div>
              </div>
              <details className="mt-2 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
                <summary className="cursor-pointer min-h-[44px] flex items-center text-[12px] font-bold text-stone-500">
                  🤖 AI triage {t.score}/100 · {t.recommendation} — why?
                </summary>
                <ul className="pb-1 space-y-1">
                  {t.reasons.map((r, i) => (
                    <li key={i} className="text-[12px] text-stone-600">{r}</li>
                  ))}
                </ul>
                <p className="pb-1 text-[11px] text-stone-400">
                  The AI only proposes — the Approve/Reject tap stays yours. 🙏
                </p>
              </details>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => decide(s, true)}
                  className="min-h-[44px] px-5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 text-[13px] font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden /> Approve ✓ {t.score} — goes live
                </button>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => decide(s, false)}
                  className="min-h-[44px] px-4 rounded-xl border border-stone-200 text-[13px] font-bold text-stone-500 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" aria-hidden /> Reject
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------ direct editor */

const Editor: React.FC = () => {
  const [lang, setLang] = useState<SupportedLang>('ta');
  const [ns, setNs] = useState<string>(ALL_DRAFT_NAMESPACES[0]);
  const [region, setRegion] = useState<RegionId>('tamil-nadu');
  const [dictReady, setDictReady] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [, setOvTick] = useState(0);
  const s = useRegionalStrings();
  const isRegional = ns === REGIONAL_NS;

  useEffect(() => {
    setDictReady(false);
    setEdits({});
    setSaved({});
    loadLanguageDict(lang).then(() => setDictReady(true)).catch(() => setDictReady(true));
    // Pull this language's override doc so "customized" badges and
    // effective text are correct on a fresh console load. Regional
    // overrides live in the same doc under `regional.{region}.{termKey}`.
    fetchTranslationOverrides(lang).then(() => setOvTick((x) => x + 1));
  }, [lang]);

  // Switching region (or layer) re-targets every row's override key —
  // clear in-progress edits so a Tamil edit can't leak into a Kerala cell.
  useEffect(() => {
    setEdits({});
    setSaved({});
  }, [region, ns]);

  const keys = useMemo(
    () =>
      isRegional
        ? REGIONAL_TERM_KEYS
        : flattenKeys(getDict('en')).filter((k) => k === ns || k.startsWith(ns + '.')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ns, isRegional]
  );
  const overrides = getOverrideMap(lang);
  const bundled = getDict(lang);

  /** The override-doc key a row edits: the plain key, or `regional.{region}.{termKey}`. */
  const editKey = (key: string): string =>
    isRegional ? regionalOverrideKey(region, key) : key;

  const effectiveText = (key: string): string => {
    const ovKey = editKey(key);
    if (overrides[ovKey] !== undefined) return overrides[ovKey];
    if (isRegional) return effectiveRegionalTerm(key, lang, region);
    return resolveNestedKey(bundled, key) || resolveNestedKey(getDict('en'), key) || key;
  };

  const saveAll = async () => {
    const changed = Object.keys(edits).filter((k) => edits[k].trim());
    if (changed.length === 0 || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const k of changed) payload[k] = edits[k].trim();
      await setDoc(doc(db, 'translationOverrides', lang), payload, { merge: true });
      applyTranslationOverrides(lang, payload);
      const done: Record<string, boolean> = {};
      for (const k of changed) done[k] = true;
      setSaved((s) => ({ ...s, ...done }));
      setEdits({});
    } catch {
      // owner retries; nothing half-written (single setDoc merge)
    } finally {
      setSaving(false);
    }
  };

  const glossaryForLang = APPROVED_TERMS;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
          <Pencil className="w-5 h-5 text-amber-700" aria-hidden />
          Direct editor
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="text-[12px] font-bold text-stone-500 flex items-center gap-2">
            Language
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLang)}
              className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] text-stone-800"
            >
              {(isRegional ? SUPPORTED_LANGS : DRAFT_LANGS).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          {isRegional && (
            <label className="text-[12px] font-bold text-stone-500 flex items-center gap-2">
              {s.regionLabel}
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionId)}
                className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] text-stone-800"
              >
                {REGION_IDS.map((id) => (
                  <option key={id} value={id}>{REGIONS[id].label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-[12px] font-bold text-stone-500 flex items-center gap-2">
            Namespace
            <select
              value={ns}
              onChange={(e) => {
                const v = e.target.value;
                setNs(v);
                // The guide namespaces only exist for the draft languages —
                // snap back when leaving the regional layer.
                if (v !== REGIONAL_NS && !isDraftLang(lang)) setLang('ta');
              }}
              className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] text-stone-800 font-mono"
            >
              <option value={REGIONAL_NS}>{s.regionalNs}</option>
              {ALL_DRAFT_NAMESPACES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {isRegional && (
          <p className="mt-2 text-[13px] text-stone-500">
            {REGIONS[region].label} · {REGIONS[region].blurb}
          </p>
        )}

        {!dictReady ? (
          <p className="mt-4 text-[13px] text-stone-500">Loading dictionary…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {keys.map((key) => {
              const ovKey = editKey(key);
              const hint = isRegional ? regionalTermHint(key) : null;
              const draftTerm = isRegional && isDraftRegionalTerm(lang, key);
              return (
              <div key={ovKey} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-[12px] text-stone-600 bg-stone-100 rounded px-1.5 py-0.5">
                    {isRegional ? `${region} · ${key}` : key}
                  </code>
                  {overrides[ovKey] !== undefined ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">✏️ {s.customized}</span>
                  ) : (
                    <span className="text-[11px] font-bold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">bundled</span>
                  )}
                  {draftTerm && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{s.draft}</span>
                  )}
                  {saved[ovKey] && (
                    <span className="text-[11px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">saved ✓</span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-stone-400">
                  English: {isRegional ? REGIONAL_TERMS[key].en : resolveNestedKey(getDict('en'), key)}
                </p>
                {hint && hint.note && (
                  <p className="mt-1 text-[12px] text-stone-500 leading-relaxed">
                    <span className="font-bold text-stone-600">💡 {s.whyVaries}:</span> {hint.note}{' '}
                    <span className="text-stone-400">· {s.curatorConfidence}: {hint.confidence}</span>
                  </p>
                )}
                <textarea
                  rows={2}
                  value={edits[ovKey] !== undefined ? edits[ovKey] : effectiveText(key)}
                  onChange={(e) => setEdits((p) => ({ ...p, [ovKey]: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2 text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              );
            })}
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="min-h-[48px] px-6 rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 text-[14px] font-bold"
            >
              {saving ? 'Saving…' : 'Save overrides — live without redeploy'}
            </button>
          </div>
        )}
      </div>

      {/* Glossary reference */}
      <aside className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 h-fit">
        <h4 className="flex items-center gap-2 text-[14px] font-bold text-stone-900">
          <BookOpen className="w-4 h-4 text-amber-700" aria-hidden />
          Glossary — {lang}
        </h4>
        <ul className="mt-2 space-y-1">
          {NEVER_TRANSLATE_GUIDANCE.map((g) => (
            <li key={g} className="text-[12px] text-stone-600 leading-relaxed">• {g}</li>
          ))}
        </ul>
        <div className="mt-3 space-y-2">
          {glossaryForLang.map((t) => (
            <div key={t.concept} className="text-[12px] leading-relaxed">
              <span className="font-bold text-stone-700">{t.concept}</span>
              <span className="text-stone-500"> → </span>
              {/* The aside only shows draft-language forms; the regional
                  layer carries its own per-term hints inline. */}
              <span className="text-stone-800">{t.forms[lang as DraftLang] || t.en}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-stone-400">
          Starter terms — confirm with a native speaker before treating as final.
        </p>
      </aside>
    </div>
  );
};

/* ---------------------------------------------------------- export / import */

const Port: React.FC = () => {
  const [lang, setLang] = useState<SupportedLang>('ta');
  const [ns, setNs] = useState<string>(ALL_DRAFT_NAMESPACES[0]);
  const [importText, setImportText] = useState('');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [, setOvTick] = useState(0);
  const s = useRegionalStrings();
  const isRegional = ns === REGIONAL_NS;

  useEffect(() => {
    // Export should reflect the live override doc, not just this session.
    fetchTranslationOverrides(lang).then(() => setOvTick((x) => x + 1));
  }, [lang]);

  const downloadJson = (fileName: string, obj: Record<string, string>) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExport = () => {
    const overrides = getOverrideMap(lang);
    if (isRegional) {
      // Regional vocabulary: every region × term as EFFECTIVE values (live
      // override over the curated starter). The `regional.*` keys already in
      // the flat map are the override layer — nothing is filtered out.
      const out: Record<string, string> = {};
      for (const rid of REGION_IDS) {
        for (const tk of REGIONAL_TERM_KEYS) {
          const k = regionalOverrideKey(rid, tk);
          out[k] = overrides[k] !== undefined ? overrides[k] : effectiveRegionalTerm(tk, lang, rid);
        }
      }
      downloadJson(`sanatani-${lang}-regional.json`, out);
      setResult(
        `Exported ${Object.keys(out).length} regional keys for ${lang} — overrides over curated starters. Send the file to your reviewer. 🙏`
      );
      return;
    }
    const bundled = getDict(lang);
    const keys = flattenKeys(getDict('en')).filter((k) => k === ns || k.startsWith(ns + '.'));
    const out: Record<string, string> = {};
    for (const k of keys) {
      out[k] =
        overrides[k] !== undefined
          ? overrides[k]
          : resolveNestedKey(bundled, k) || resolveNestedKey(getDict('en'), k) || k;
    }
    downloadJson(`sanatani-${lang}-${ns.replace(/\./g, '-')}.json`, out);
    setResult(`Exported ${keys.length} keys for ${lang} / ${ns}. Send the file to your reviewer. 🙏`);
  };

  const doImport = async () => {
    setResult('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setResult('That is not valid JSON — please paste the exported file content.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setResult('Expected a JSON object of key → text.');
      return;
    }
    // Validate: every key must exist in the bundled schema — or be a
    // well-formed regional key (`regional.{region}.{termKey}`), which the
    // regional layer reads verbatim from the same override doc.
    const validKeys = new Set(flattenKeys(getDict('en')));
    const payload: Record<string, string> = {};
    const skipped: string[] = [];
    for (const k of Object.keys(parsed as Record<string, unknown>)) {
      const v = (parsed as Record<string, unknown>)[k];
      const isRegionalKey = parseRegionalOverrideKey(k) !== null;
      if (!validKeys.has(k) && !isRegionalKey) {
        skipped.push(k);
        continue;
      }
      if (typeof v !== 'string' || !v.trim() || v.length > 4000) {
        skipped.push(k);
        continue;
      }
      payload[k] = v;
    }
    if (Object.keys(payload).length === 0) {
      setResult(`Nothing to apply.${skipped.length ? ` Skipped: ${skipped.join(', ')}` : ''}`);
      return;
    }
    setBusy(true);
    try {
      await setDoc(doc(db, 'translationOverrides', lang), payload, { merge: true });
      applyTranslationOverrides(lang, payload);
      setResult(
        `Applied ${Object.keys(payload).length} overrides for ${lang} — live without redeploy. 🙏` +
        (skipped.length ? ` Skipped ${skipped.length} unknown/invalid keys.` : '')
      );
      setImportText('');
    } catch {
      setResult('Could not save — please check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="text-[16px] font-bold text-stone-900">Export / Import for reviewers</h3>
      <p className="mt-1 text-[13px] text-stone-500 leading-relaxed">
        Export a namespace as JSON, send it to a native speaker, and import
        their reviewed file back — keys are validated against the bundled
        schema before anything is applied.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as SupportedLang)}
          className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px]"
        >
          {SUPPORTED_LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={ns}
          onChange={(e) => setNs(e.target.value)}
          className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] font-mono"
        >
          <option value={REGIONAL_NS}>{s.regionalNs}</option>
          {ALL_DRAFT_NAMESPACES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={doExport}
          className="min-h-[44px] px-4 rounded-xl border border-stone-200 text-[13px] font-bold text-stone-700 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" aria-hidden /> Export JSON
        </button>
      </div>
      <div className="mt-4">
        <p className="text-[12px] font-bold uppercase tracking-widest text-stone-400">Import reviewed JSON</p>
        <textarea
          rows={6}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='Paste the reviewed JSON here — { "guide.vda.s1t": "…" }'
          className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2 text-[13px] font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="button"
          onClick={doImport}
          disabled={busy || !importText.trim()}
          className="mt-2 min-h-[48px] px-6 rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 text-[14px] font-bold flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" aria-hidden /> {busy ? 'Applying…' : 'Validate & apply as overrides'}
        </button>
        {result && <p className="mt-2 text-[13px] text-stone-600 leading-relaxed">{result}</p>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- tab */

export const TranslationsTab: React.FC = () => {
  const [section, setSection] = useState<Section>('dashboard');
  const [queueTick, setQueueTick] = useState(0);

  const tabs: Array<{ id: Section; label: string }> = [
    { id: 'dashboard', label: 'Quality' },
    { id: 'queue', label: 'Suggestions' },
    { id: 'editor', label: 'Editor' },
    { id: 'port', label: 'Export / Import' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`min-h-[44px] px-4 rounded-xl text-[13px] font-bold ${
              section === t.id
                ? 'bg-amber-700 text-amber-50'
                : 'bg-white border border-stone-200 text-stone-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {section === 'dashboard' && <Dashboard />}
      {section === 'queue' && <Queue onChanged={() => setQueueTick((x) => x + 1)} />}
      {section === 'editor' && <Editor key={queueTick} />}
      {section === 'port' && <Port />}
    </div>
  );
};
