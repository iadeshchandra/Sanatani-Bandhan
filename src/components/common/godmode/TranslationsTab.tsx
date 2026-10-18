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
import { db } from '../../../firebase';
import {
  ALL_DRAFT_NAMESPACES,
  countKeysUnder,
  flattenKeys,
  resolveNestedKey,
} from '../../../i18n/translationQuality';
import {
  applyTranslationOverrides,
  getDict,
  getOverrideMap,
  loadLanguageDict,
} from '../../../i18n/translations';
import { fetchTranslationOverrides } from '../../../i18n/translationOverrides';
import {
  APPROVED_TERMS,
  DRAFT_LANGS,
  NEVER_TRANSLATE_GUIDANCE,
  type DraftLang,
} from '../../../i18n/glossary';

/* ------------------------------------------------------------------ types */

interface Suggestion {
  id: string;
  lang?: string;
  key?: string;
  currentText?: string;
  suggestedText?: string;
  uid?: string;
  sanataniId?: string | null;
  status?: string;
  createdAt?: { toDate?: () => Date } | null;
}

type Section = 'dashboard' | 'queue' | 'editor' | 'port';

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
  );
};

/* ------------------------------------------------------- suggestions queue */

const Queue: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
        // The override goes live for every user without a redeploy.
        batch.set(
          doc(db, 'translationOverrides', s.lang),
          { [s.key]: s.suggestedText },
          { merge: true }
        );
        // …and immediately in this console session too.
        applyTranslationOverrides(s.lang, { [s.key]: s.suggestedText });
      }
      batch.update(sugRef, {
        status: approve ? 'approved' : 'rejected',
        reviewedAt: serverTimestamp(),
      });
      await batch.commit();
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
          {items.map((s) => (
            <div key={s.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="font-black uppercase tracking-widest text-stone-500">{s.lang}</span>
                <code className="font-mono text-stone-600 bg-stone-100 rounded px-1.5 py-0.5">{s.key}</code>
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
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => decide(s, true)}
                  className="min-h-[44px] px-5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 text-[13px] font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden /> Approve — goes live
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
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------ direct editor */

const Editor: React.FC = () => {
  const [lang, setLang] = useState<DraftLang>('ta');
  const [ns, setNs] = useState<string>(ALL_DRAFT_NAMESPACES[0]);
  const [dictReady, setDictReady] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [, setOvTick] = useState(0);

  useEffect(() => {
    setDictReady(false);
    setEdits({});
    setSaved({});
    loadLanguageDict(lang).then(() => setDictReady(true)).catch(() => setDictReady(true));
    // Pull this language's override doc so "customized" badges and
    // effective text are correct on a fresh console load.
    fetchTranslationOverrides(lang).then(() => setOvTick((x) => x + 1));
  }, [lang]);

  const keys = useMemo(
    () => flattenKeys(getDict('en')).filter((k) => k === ns || k.startsWith(ns + '.')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ns]
  );
  const overrides = getOverrideMap(lang);
  const bundled = getDict(lang);

  const effectiveText = (key: string): string => {
    if (overrides[key] !== undefined) return overrides[key];
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
              onChange={(e) => setLang(e.target.value as DraftLang)}
              className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] text-stone-800"
            >
              {DRAFT_LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] font-bold text-stone-500 flex items-center gap-2">
            Namespace
            <select
              value={ns}
              onChange={(e) => setNs(e.target.value)}
              className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] text-stone-800 font-mono"
            >
              {ALL_DRAFT_NAMESPACES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        {!dictReady ? (
          <p className="mt-4 text-[13px] text-stone-500">Loading dictionary…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {keys.map((key) => (
              <div key={key} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-[12px] text-stone-600 bg-stone-100 rounded px-1.5 py-0.5">{key}</code>
                  {overrides[key] !== undefined ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">✏️ customized</span>
                  ) : (
                    <span className="text-[11px] font-bold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">bundled</span>
                  )}
                  {saved[key] && (
                    <span className="text-[11px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">saved ✓</span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-stone-400">English: {resolveNestedKey(getDict('en'), key)}</p>
                <textarea
                  rows={2}
                  value={edits[key] !== undefined ? edits[key] : effectiveText(key)}
                  onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2 text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
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
              <span className="text-stone-800">{t.forms[lang]}</span>
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
  const [lang, setLang] = useState<DraftLang>('ta');
  const [ns, setNs] = useState<string>(ALL_DRAFT_NAMESPACES[0]);
  const [importText, setImportText] = useState('');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [, setOvTick] = useState(0);

  useEffect(() => {
    // Export should reflect the live override doc, not just this session.
    fetchTranslationOverrides(lang).then(() => setOvTick((x) => x + 1));
  }, [lang]);

  const doExport = () => {
    const overrides = getOverrideMap(lang);
    const bundled = getDict(lang);
    const keys = flattenKeys(getDict('en')).filter((k) => k === ns || k.startsWith(ns + '.'));
    const out: Record<string, string> = {};
    for (const k of keys) {
      out[k] =
        overrides[k] !== undefined
          ? overrides[k]
          : resolveNestedKey(bundled, k) || resolveNestedKey(getDict('en'), k) || k;
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanatani-${lang}-${ns.replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    // Validate: every key must exist in the bundled schema.
    const validKeys = new Set(flattenKeys(getDict('en')));
    const payload: Record<string, string> = {};
    const skipped: string[] = [];
    for (const k of Object.keys(parsed as Record<string, unknown>)) {
      const v = (parsed as Record<string, unknown>)[k];
      if (!validKeys.has(k)) {
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
          onChange={(e) => setLang(e.target.value as DraftLang)}
          className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px]"
        >
          {DRAFT_LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={ns}
          onChange={(e) => setNs(e.target.value)}
          className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] font-mono"
        >
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
