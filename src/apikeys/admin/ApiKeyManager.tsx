/**
 * ApiKeyManager — GodMode "API Keys" tab.
 * ============================================================================
 * The owner adds, edits, enables/disables and publishes third-party API keys
 * at runtime — no code deploys. Two tiers, made unmistakable in the UI:
 *
 *  CLIENT-SAFE (green)  — browser keys the app may read: published to
 *     `platformConfig/public` on "Publish to app". Restrict the key at the
 *     provider (HTTP referrer / API restrictions) — the UI says this plainly.
 *  SERVER-ONLY (amber)  — secrets stored owner-only for when a backend
 *     exists. The app cannot read them on Spark; the UI forbids publishing.
 *
 * Data:
 *  platformConfig/apiKeys/{keyId}       owner read/write. Never published.
 *  platformConfig/public                published client-safe subset.
 *  platformConfig/apiKeysAudit/{autoId} append-only, owner-only, create-only.
 *
 * Honest rules: no delete (disable instead — history matters), test-before-save
 * uses read-only provider calls, key values are never logged or console'd.
 *
 * Layout law (discoverability fix, 2026-10-24): the tab's primary action —
 * the "+ Add key" button — renders FIRST, in the action bar at the very top,
 * above the key table and the API Health desk. An owner opening this tab to
 * paste a key must never have to scroll past the health wall to find where
 * keys are entered. The render is a hook-free view (ApiKeyManagerView) so
 * the layout order, the empty state and the load-failure banner are pinned
 * by render tests.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Pencil,
  Plus,
  Power,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { db } from '../../firebase';
import { clearApiKeyCache } from '../apiKeys';
import { ApiHealthDesk } from './ApiHealthDesk';

/* ------------------------------------------------------------------ types */

interface ApiKeyEntry {
  id: string;
  name: string;
  provider: string;
  keyValue: string;
  clientSafe: boolean;
  enabled: boolean;
  notes: string;
  updatedAt?: unknown;
  updatedBy?: string;
}

interface AuditEntry {
  id: string;
  at?: { toDate?: () => Date } | null;
  by?: string;
  action?: string;
  keyName?: string;
  detail?: string;
}

export interface ProviderPreset {
  id: string;
  label: string;
  suggestedName: string;
  clientSafeDefault: boolean;
  /** Read-only probe URL builder. Null = no safe test call exists. */
  testUrl: ((key: string) => string) | null;
  testOk: (data: unknown) => boolean;
  quotaNote?: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'youtube',
    label: 'YouTube Data API',
    suggestedName: 'youtubeDataApi',
    clientSafeDefault: true,
    testUrl: (k) =>
      `https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${encodeURIComponent(k)}`,
    testOk: (d) => !!d && typeof d === 'object' && Array.isArray((d as { items?: unknown[] }).items),
  },
  {
    id: 'gmaps',
    label: 'Google Maps (browser key)',
    suggestedName: 'googleMapsBrowser',
    clientSafeDefault: true,
    testUrl: (k) =>
      `https://maps.googleapis.com/maps/api/geocode/json?address=Dhaka&key=${encodeURIComponent(k)}`,
    testOk: (d) => {
      const s = (d as { status?: string } | null)?.status;
      return s === 'OK' || s === 'ZERO_RESULTS';
    },
    quotaNote: 'Uses a tiny amount of Maps quota per test.',
  },
  {
    id: 'sms',
    label: 'SMS provider',
    suggestedName: 'smsProvider',
    clientSafeDefault: false,
    testUrl: null,
    testOk: () => false,
  },
  {
    id: 'custom',
    label: 'Custom',
    suggestedName: '',
    clientSafeDefault: false,
    testUrl: null,
    testOk: () => false,
  },
];

/* ------------------------------------------------------------------ i18n */

type Lang = 'en' | 'hi' | 'bn';
const STR: Record<string, Record<Lang, string>> = {
  title: { en: 'API Keys', hi: 'API कुंजियाँ', bn: 'API কী' },
  subtitle: {
    en: 'Manage third-party keys at runtime — no code deploys. Changes apply the moment you publish.',
    hi: 'थर्ड-पार्टी कुंजियाँ रनटाइम पर प्रबंधित करें — कोई कोड डिप्लॉय नहीं।',
    bn: 'রানটাইমে থার্ড-পার্টি কী পরিচালনা করুন — কোনো কোড ডিপ্লয় নয়।',
  },
  addKey: { en: 'Add key', hi: 'कुंजी जोड़ें', bn: 'কী যোগ করুন' },
  loadFailTitle: { en: 'Keys could not be loaded', hi: 'कुंजियाँ लोड नहीं हो सकीं', bn: 'কী লোড করা যায়নি' },
  loadFailBody: {
    en: 'This usually means you are offline, or you are not signed in with the owner account — keys are visible only to the owner. If you are the owner, check your connection and reload.',
    hi: 'इसका आमतौर पर मतलब है कि आप ऑफ़लाइन हैं, या आप स्वामी खाते से साइन इन नहीं हैं — कुंजियाँ केवल स्वामी को ही दिखाई देती हैं। यदि आप स्वामी हैं, तो अपना कनेक्शन जाँचें और फिर से लोड करें।',
    bn: 'এর সাধারণ অর্থ হলো আপনি অফলাইনে আছেন, অথবা আপনি মালিক অ্যাকাউন্ট দিয়ে সাইন ইন করেননি — কী শুধুমাত্র মালিকই দেখতে পারেন। আপনি যদি মালিক হন, তাহলে সংযোগ পরীক্ষা করে আবার লোড করুন।',
  },
  reload: { en: 'Reload', hi: 'फिर से लोड करें', bn: 'আবার লোড করুন' },
  clientSafe: { en: 'Client-safe', hi: 'क्लाइंट-सुरक्षित', bn: 'ক্লায়েন্ট-নিরাপদ' },
  serverOnly: { en: 'Server-only', hi: 'केवल सर्वर', bn: 'শুধু সার্ভার' },
  enabled: { en: 'Enabled', hi: 'सक्रिय', bn: 'সক্রিয়' },
  disabled: { en: 'Disabled', hi: 'निष्क्रिय', bn: 'নিষ্ক্রিয়' },
  publish: { en: 'Publish to app', hi: 'ऐप में प्रकाशित करें', bn: 'অ্যাপে প্রকাশ করুন' },
  published: { en: 'Published', hi: 'प्रकाशित', bn: 'প্রকাশিত' },
  test: { en: 'Test key', hi: 'कुंजी परखें', bn: 'কী পরীক্ষা করুন' },
  testing: { en: 'Testing…', hi: 'परख रहे हैं…', bn: 'পরীক্ষা চলছে…' },
  testOk: { en: 'Key works ✓', hi: 'कुंजी काम करती है ✓', bn: 'কী কাজ করে ✓' },
  testFail: { en: 'Key failed ✗ — check the value and try again', hi: 'कुंजी विफल ✗', bn: 'কী ব্যর্থ ✗' },
  noTest: {
    en: 'No safe read-only test exists for this provider. Save, then verify in the provider dashboard.',
    hi: 'इस प्रदाता के लिए कोई सुरक्षित परीक्षण नहीं है।',
    bn: 'এই প্রদানকারীর জন্য কোনো নিরাপদ পরীক্ষা নেই।',
  },
  save: { en: 'Save', hi: 'सहेजें', bn: 'সংরক্ষণ' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', bn: 'বাতিল' },
  name: { en: 'Key name (used by the app)', hi: 'कुंजी का नाम', bn: 'কীর নাম' },
  provider: { en: 'Provider', hi: 'प्रदाता', bn: 'প্রদানকারী' },
  value: { en: 'Key value', hi: 'कुंजी मान', bn: 'কীর মান' },
  notes: { en: 'Notes (optional)', hi: 'टिप्पणी (वैकल्पिक)', bn: 'নোট (ঐচ্ছিক)' },
  clientSafeLabel: {
    en: 'Client-safe: this key may be read by the app on user devices',
    hi: 'क्लाइंट-सुरक्षित: यह कुंजी उपयोगकर्ता डिवाइस पर ऐप पढ़ सकता है',
    bn: 'ক্লায়েন্ট-নিরাপদ: এই কী ব্যবহারকারীর ডিভাইসে অ্যাপ পড়তে পারে',
  },
  clientSafeWarn: {
    en: 'Only for keys that are safe in public: restrict them at the provider (HTTP referrer + API restrictions in Google Cloud Console). Anything on a phone is visible in the network tab.',
    hi: 'केवल सार्वजनिक रूप से सुरक्षित कुंजियों के लिए।',
    bn: 'শুধুমাত্র সর্বজনীনভাবে নিরাপদ কীর জন্য।',
  },
  serverOnlyWarn: {
    en: 'Stored owner-only. The app cannot read this yet — there is no backend on the current plan. It will be usable when a server exists. Never mark a true secret as client-safe.',
    hi: 'केवल स्वामी के लिए संग्रहीत।',
    bn: 'শুধুমাত্র মালিকের জন্য সংরক্ষিত।',
  },
  noDelete: {
    en: 'Keys are disabled, never deleted — history matters for audits.',
    hi: 'कुंजियाँ अक्षम की जाती हैं, हटाई नहीं जातीं।',
    bn: 'কী নিষ্ক্রিয় করা হয়, মুছে ফেলা হয় না।',
  },
  auditTitle: { en: 'Recent changes', hi: 'हाल के बदलाव', bn: 'সাম্প্রতিক পরিবর্তন' },
  empty: {
    en: 'No keys yet. Add your first key above — e.g. a YouTube Data API key for live-darshan detection.',
    hi: 'अभी कोई कुंजी नहीं है।',
    bn: 'এখনও কোনো কী নেই।',
  },
  revealWarn: {
    en: 'Revealed on screen — make sure no one is watching.',
    hi: 'स्क्रीन पर दिख रहा है — सुनिश्चित करें कि कोई देख नहीं रहा।',
    bn: 'স্ক্রিনে দৃশ্যমান — কেউ দেখছে না তা নিশ্চিত করুন।',
  },
};

function useLang(): Lang {
  const [lang] = useState<Lang>(() => {
    try {
      const l = (navigator.language || 'en').toLowerCase();
      if (l.startsWith('hi')) return 'hi';
      if (l.startsWith('bn')) return 'bn';
      return 'en';
    } catch {
      return 'en';
    }
  });
  return lang;
}
const t = (k: string, lang: Lang): string => STR[k]?.[lang] ?? STR[k]?.en ?? k;

/* ---------------------------------------------------------------- helpers */

function mask(value: string): string {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

function fmtTime(at: AuditEntry['at']): string {
  try {
    const d = at?.toDate?.();
    return d ? d.toLocaleString() : '—';
  } catch {
    return '—';
  }
}

/* ------------------------------------------------- presentational shell */

/**
 * Everything ApiKeyManager renders, as a pure function of props — no hooks,
 * no Firebase — so render tests can pin the tab's layout contract (action
 * first, empty-state button, load-failure banner) in the SSR test stack.
 *
 * Order law: action bar → load-failure banner / notice → key table →
 * health desk → audit. The form is a fixed overlay; its DOM slot is inert.
 */
export interface ApiKeyManagerViewProps {
  lang: Lang;
  keys: ApiKeyEntry[];
  audit: AuditEntry[];
  loading: boolean;
  loadFailed: boolean;
  msg: string | null;
  showForm: boolean;
  editing: ApiKeyEntry | null;
  revealed: Record<string, boolean>;
  busy: boolean;
  fName: string;
  fProvider: string;
  fValue: string;
  fClientSafe: boolean;
  fNotes: string;
  testState: 'idle' | 'testing' | 'ok' | 'fail';
  preset: ProviderPreset;
  onReload: () => void;
  onOpenAdd: () => void;
  onOpenEdit: (k: ApiKeyEntry) => void;
  onToggleEnabled: (k: ApiKeyEntry) => void;
  onToggleReveal: (k: ApiKeyEntry) => void;
  onCloseForm: () => void;
  onProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClientSafeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNotesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunTest: () => void;
  onSave: (publish: boolean) => void;
}

export const ApiKeyManagerView: React.FC<ApiKeyManagerViewProps> = (p) => {
  const lang = p.lang;
  const keys = p.keys;
  const audit = p.audit;
  const loading = p.loading;
  const busy = p.busy;
  const showForm = p.showForm;
  const editing = p.editing;
  const revealed = p.revealed;
  const preset = p.preset;

  return (
    <div className="space-y-5">
      {/* Action bar — FIRST. The tab exists so the owner can add keys; the
          add action is never below the fold. */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" /> {t('title', lang)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">{t('subtitle', lang)}</p>
        </div>
        <button
          onClick={p.onOpenAdd}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> {t('addKey', lang)}
        </button>
      </div>

      {/* Load failure — a banner, not a grey line: if keys cannot load, the
          owner must know immediately whether it is the connection or the
          account, because the remedy differs. */}
      {p.loadFailed && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-500/60 bg-red-500/10 px-4 py-3.5 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-200">{t('loadFailTitle', lang)}</p>
            <p className="text-xs leading-relaxed text-red-200/80 mt-1">{t('loadFailBody', lang)}</p>
          </div>
          <button
            onClick={p.onReload}
            className="shrink-0 inline-flex items-center rounded-xl border border-red-400/50 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-500/20 min-h-[44px]"
          >
            {t('reload', lang)}
          </button>
        </div>
      )}

      {p.msg && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-200">
          {p.msg}
        </div>
      )}

      {/* Key table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            <p>{t('empty', lang)}</p>
            <button
              onClick={p.onOpenAdd}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> {t('addKey', lang)}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {keys.map((k) => (
              <div key={k.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm">{k.name}</span>
                    <span className="text-[11px] text-slate-500">{k.provider}</span>
                    {k.clientSafe ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        <ShieldCheck className="w-3 h-3" /> {t('clientSafe', lang)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                        <ShieldAlert className="w-3 h-3" /> {t('serverOnly', lang)}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        k.enabled ? 'bg-slate-700 text-slate-300' : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {k.enabled ? t('enabled', lang) : t('disabled', lang)}
                    </span>
                  </div>
                  <button
                    onClick={() => p.onToggleReveal(k)}
                    className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-slate-200"
                    title={t('revealWarn', lang)}
                  >
                    {revealed[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {revealed[k.id] ? k.keyValue : mask(k.keyValue)}
                  </button>
                  {k.notes && <div className="text-[11px] text-slate-500 mt-1">{k.notes}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => p.onOpenEdit(k)}
                    className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => p.onToggleEnabled(k)}
                    disabled={busy}
                    className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                    title={k.enabled ? 'Disable' : 'Enable'}
                  >
                    {k.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-600">{t('noDelete', lang)}</p>

      {/* Health desk — below the keys it watches. It describes the keys;
          it is not the door to them. */}
      <ApiHealthDesk entries={keys} ready={!loading} />

      {/* Add / edit form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white">{editing ? 'Edit key' : t('addKey', lang)}</h3>
              <button
                onClick={p.onCloseForm}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-400">{t('provider', lang)}</span>
              <select
                value={p.fProvider}
                onChange={p.onProviderChange}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 min-h-[44px]"
              >
                {PROVIDERS.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-400">{t('name', lang)}</span>
              <input
                value={p.fName}
                onChange={p.onNameChange}
                placeholder="youtubeDataApi"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 font-mono min-h-[44px]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-400">{t('value', lang)}</span>
              <input
                value={p.fValue}
                onChange={p.onValueChange}
                type="password"
                autoComplete="off"
                placeholder="Paste the key — it is never logged"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 font-mono min-h-[44px]"
              />
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={p.fClientSafe}
                onChange={p.onClientSafeChange}
                className="mt-1 w-5 h-5 accent-amber-500"
              />
              <span>
                <span className="text-sm font-bold text-slate-200">{t('clientSafeLabel', lang)}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {p.fClientSafe ? t('clientSafeWarn', lang) : t('serverOnlyWarn', lang)}
                </span>
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-400">{t('notes', lang)}</span>
              <input
                value={p.fNotes}
                onChange={p.onNotesChange}
                placeholder="e.g. Restricted to sanatanibandhan.web.app in Cloud Console"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 min-h-[44px]"
              />
            </label>

            {/* Test */}
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
              {preset.testUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={p.onRunTest}
                    disabled={p.testState === 'testing' || !p.fValue.trim() || busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 min-h-[44px]"
                  >
                    <FlaskConical className="w-4 h-4" />
                    {p.testState === 'testing' ? t('testing', lang) : t('test', lang)}
                  </button>
                  {p.testState === 'ok' && (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> {t('testOk', lang)}
                    </span>
                  )}
                  {p.testState === 'fail' && (
                    <span className="text-sm font-bold text-red-300">{t('testFail', lang)}</span>
                  )}
                  {preset.quotaNote && <span className="text-[11px] text-slate-500 w-full">{preset.quotaNote}</span>}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">{t('noTest', lang)}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => p.onSave(false)}
                disabled={busy}
                className="flex-1 rounded-xl border border-slate-600 px-3 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50 min-h-[44px]"
              >
                {t('save', lang)}
              </button>
              {p.fClientSafe && (
                <button
                  onClick={() => p.onSave(true)}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50 min-h-[44px]"
                >
                  {t('save', lang)} + {t('publish', lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit */}
      <div>
        <h3 className="text-sm font-black text-slate-300 mb-2">{t('auditTitle', lang)}</h3>
        <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800">
          {audit.length === 0 ? (
            <div className="p-4 text-xs text-slate-600">—</div>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-xs text-slate-400 flex flex-wrap gap-x-3">
                <span className="text-slate-500">{fmtTime(a.at)}</span>
                <span className="font-bold text-slate-300">{a.action}</span>
                <span className="font-mono">{a.keyName}</span>
                {a.detail && <span className="text-slate-600">{a.detail}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------- component */

export const ApiKeyManager: React.FC = () => {
  const lang = useLang();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiKeyEntry | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form state
  const [fName, setFName] = useState('');
  const [fProvider, setFProvider] = useState('youtube');
  const [fValue, setFValue] = useState('');
  const [fClientSafe, setFClientSafe] = useState(true);
  const [fNotes, setFNotes] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const preset = useMemo(
    () => PROVIDERS.find((p) => p.id === fProvider) ?? PROVIDERS[PROVIDERS.length - 1],
    [fProvider],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ks = await getDocs(query(collection(db, 'platformConfig/apiKeys'), orderBy('name')));
      setKeys(
        ks.docs.map((d) => {
          const data = d.data() as Omit<ApiKeyEntry, 'id'>;
          return { id: d.id, ...data };
        }),
      );
      const au = await getDocs(
        query(collection(db, 'platformConfig/apiKeysAudit'), orderBy('at', 'desc'), limit(20)),
      );
      setAudit(au.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, 'id'>) })));
      setLoadFailed(false);
    } catch {
      // Load failures get the banner in the view (loadFailed), not the
      // small grey notice line — a missed failure here looks exactly like
      // "there is nowhere to enter a key".
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFName('');
    setFProvider('youtube');
    setFValue('');
    setFClientSafe(true);
    setFNotes('');
    setTestState('idle');
    setShowForm(true);
  };

  const openEdit = (k: ApiKeyEntry) => {
    setEditing(k);
    setFName(k.name);
    const match = PROVIDERS.find((p) => p.label === k.provider);
    setFProvider(match ? match.id : 'custom');
    setFValue(k.keyValue);
    setFClientSafe(k.clientSafe);
    setFNotes(k.notes);
    setTestState('idle');
    setShowForm(true);
  };

  /** Read-only probe. The URL contains the key — never log it. */
  const runTest = async () => {
    if (!preset.testUrl || !fValue.trim()) return;
    setTestState('testing');
    try {
      const res = await fetch(preset.testUrl(fValue.trim()));
      const data: unknown = await res.json().catch(() => null);
      setTestState(res.ok && preset.testOk(data) ? 'ok' : 'fail');
    } catch {
      setTestState('fail');
    }
  };

  /**
   * Save (private doc) + publish (public subset) + audit, in one batch.
   * Publish rule: only clientSafe && enabled entries reach the app.
   */
  const save = async (publish: boolean) => {
    const name = fName.trim();
    if (!name || !fValue.trim()) {
      setMsg('Name and key value are required.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const id = editing ? editing.id : name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const entry: Omit<ApiKeyEntry, 'id'> = {
        name,
        provider: preset.label,
        keyValue: fValue.trim(),
        clientSafe: fClientSafe,
        enabled: editing ? editing.enabled : true,
        notes: fNotes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: 'owner',
      };
      const batch = writeBatch(db);
      batch.set(doc(db, 'platformConfig/apiKeys', id), entry, { merge: true });
      batch.set(doc(collection(db, 'platformConfig/apiKeysAudit')), {
        at: serverTimestamp(),
        by: 'owner',
        action: editing ? 'update' : 'create',
        keyName: name,
        detail: `clientSafe=${fClientSafe}`,
      });
      if (publish) {
        if (!fClientSafe) {
          setMsg('Server-only keys cannot be published to the app.');
          setBusy(false);
          return;
        }
        // Rebuild the published subset from current state + this save.
        const next = keys.filter((k) => k.id !== id).concat([{ id, ...entry }]);
        const published: Record<string, string> = {};
        for (const k of next) {
          if (k.clientSafe && k.enabled) published[k.name] = k.keyValue;
        }
        const pubRef = doc(db, 'platformConfig/public');
        batch.set(pubRef, { keys: published, updatedAt: serverTimestamp() }, { merge: true });
        // Bump configVersion atomically-ish: read-then-write is fine for an owner-only doc.
        const { getDoc } = await import('firebase/firestore');
        const cur = await getDoc(pubRef);
        const ver = (cur.data()?.configVersion as number) ?? 0;
        batch.set(pubRef, { configVersion: ver + 1 }, { merge: true });
      }
      await batch.commit();
      // Hot activation (#35): drop the key caches so this device resolves
      // the new key on the very next call; other devices follow within
      // the 60s cache TTL. The Health desk below sees the changed key
      // tail on reload and re-probes the API automatically.
      clearApiKeyCache();
      setShowForm(false);
      setMsg(publish ? 'Saved and published — the app picks it up within a minute.' : 'Saved.');
      await load();
    } catch {
      setMsg('Save failed — check your connection and owner access.');
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (k: ApiKeyEntry) => {
    setBusy(true);
    try {
      const batch = writeBatch(db);
      const ref = doc(db, 'platformConfig/apiKeys', k.id);
      batch.update(ref, { enabled: !k.enabled, updatedAt: serverTimestamp() });
      batch.set(doc(collection(db, 'platformConfig/apiKeysAudit')), {
        at: serverTimestamp(),
        by: 'owner',
        action: k.enabled ? 'disable' : 'enable',
        keyName: k.name,
        detail: '',
      });
      // Disabling a published key must unpublish it immediately.
      if (k.enabled && k.clientSafe) {
        const pubRef = doc(db, 'platformConfig/public');
        const { getDoc } = await import('firebase/firestore');
        const cur = await getDoc(pubRef);
        const data = cur.data() as { keys?: Record<string, string>; configVersion?: number } | undefined;
        const keysNow = { ...(data?.keys ?? {}) };
        delete keysNow[k.name];
        batch.set(
          pubRef,
          { keys: keysNow, configVersion: ((data?.configVersion as number) ?? 0) + 1, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
      await batch.commit();
      clearApiKeyCache();
      await load();
    } catch {
      setMsg('Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFProvider(e.target.value);
    const p = PROVIDERS.find((x) => x.id === e.target.value);
    if (p) {
      setFClientSafe(p.clientSafeDefault);
      if (!editing && p.suggestedName) setFName(p.suggestedName);
    }
    setTestState('idle');
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFValue(e.target.value);
    setTestState('idle');
  };

  const handleToggleReveal = (k: ApiKeyEntry) =>
    setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }));

  return (
    <ApiKeyManagerView
      lang={lang}
      keys={keys}
      audit={audit}
      loading={loading}
      loadFailed={loadFailed}
      msg={msg}
      showForm={showForm}
      editing={editing}
      revealed={revealed}
      busy={busy}
      fName={fName}
      fProvider={fProvider}
      fValue={fValue}
      fClientSafe={fClientSafe}
      fNotes={fNotes}
      testState={testState}
      preset={preset}
      onReload={() => void load()}
      onOpenAdd={openAdd}
      onOpenEdit={openEdit}
      onToggleEnabled={(k) => void toggleEnabled(k)}
      onToggleReveal={handleToggleReveal}
      onCloseForm={() => setShowForm(false)}
      onProviderChange={handleProviderChange}
      onNameChange={(e) => setFName(e.target.value)}
      onValueChange={handleValueChange}
      onClientSafeChange={(e) => setFClientSafe(e.target.checked)}
      onNotesChange={(e) => setFNotes(e.target.value)}
      onRunTest={() => void runTest()}
      onSave={(publish) => void save(publish)}
    />
  );
};
