/**
 * ApiHealthDesk — GodMode "API Health & Quota" section (shipped; ex QUEUED #35).
 * ============================================================================
 * Rendered inside the API Keys tab, driven ENTIRELY by the two
 * registries: API_DESCRIPTORS (apiHealth.ts) for cards/quota models and
 * PROBES (apiProbes.ts) for checks. A future provider appears here by
 * adding one descriptor + one probe — nothing in this file changes.
 *
 * What the owner sees per API: the feature it powers, key status (masked,
 * last-4 only — full keys are never rendered here), a status light, the
 * last check + latency in plain words, a quota bar where an honest one
 * exists, and — when the API is unset or failing — exactly which
 * user-facing feature is affected (dark-feature clarity).
 *
 * HOT ACTIVATION (owner addendum): this desk watches the key table. When
 * a key's value changes (save / rotate / disable in the form below), the
 * affected API is re-probed automatically and its status updates in
 * place. A bad replacement shows 🔴 with the reason AND keeps the last
 * good check visible ("last good check … with the previous key") — the
 * desk never goes silently dark.
 *
 * Checks run on demand, plus automatically at most once per 15 minutes
 * (checks themselves cost quota — the YouTube probe is 1 unit, shown on
 * its card). Results persist in platformConfig/apiHealth (owner-write by
 * existing rules; the doc holds no key material).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appLocale } from '../../lib/format';
import { Activity, AlertTriangle, FlaskConical, RefreshCw } from 'lucide-react';
import {
  API_DESCRIPTORS,
  HEALTH_LABEL,
  HEALTH_LIGHT,
  effectiveLimit,
  goodCheckInfo,
  healthState,
  impactFor,
  limitIsAssumption,
  maskTail,
  nextPacificMidnight,
  quotaBand,
  quotaRatio,
  rotateGoodCheck,
  type ApiDescriptor,
  type GoodCheck,
  type ProbeResult,
  type QuotaAssumptions,
} from '../apiHealth';
import { runProbe } from '../apiProbes';
import { loadApiHealth, saveApiHealth } from '../apiHealthStore';
import { deviceUsage, globalUsageToday, recordApiUse, todayBucket, type UsageLedger } from '../apiUsage';
import { resolveGeminiKey } from '../../utils/geminiClient';

export interface HealthKeyEntry {
  name: string;
  keyValue: string;
  enabled: boolean;
}

const AUTO_CHECK_MS = 15 * 60_000;
const METERED = ['youtube', 'gemini'];

function fmtAgo(ms: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleString(appLocale());
}

interface ResolvedKey {
  key: string | null;
  tail: string;
  configured: boolean;
  /** 'set' | 'disabled' | 'missing' | 'device' | 'keyless' */
  keyState: 'set' | 'disabled' | 'missing' | 'device' | 'keyless';
}

export const ApiHealthDesk: React.FC<{ entries: HealthKeyEntry[]; ready: boolean }> = ({
  entries,
  ready,
}) => {
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [good, setGood] = useState<Record<string, GoodCheck>>({});
  const [assumptions, setAssumptions] = useState<QuotaAssumptions>({});
  const [deviceLedger, setDeviceLedger] = useState<UsageLedger>({});
  const [globalLedger, setGlobalLedger] = useState<UsageLedger | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [ytLimitInput, setYtLimitInput] = useState('');
  const [gemLimitInput, setGemLimitInput] = useState('');

  const resultsRef = useRef(results);
  resultsRef.current = results;
  const goodRef = useRef(good);
  goodRef.current = good;
  const assumptionsRef = useRef(assumptions);
  assumptionsRef.current = assumptions;
  const probedTailsRef = useRef<Record<string, string> | null>(null);
  const autoRanRef = useRef(false);

  /* ------------------------------------------------ key resolution */

  const resolveKey = useCallback(
    (desc: ApiDescriptor): ResolvedKey => {
      if (desc.keySource === 'keyless') {
        return { key: null, tail: '', configured: true, keyState: 'keyless' };
      }
      if (desc.keySource === 'device') {
        const k = resolveGeminiKey();
        return k
          ? { key: k, tail: maskTail(k), configured: true, keyState: 'device' }
          : { key: null, tail: '', configured: false, keyState: 'missing' };
      }
      const entry = entries.find((e) => e.name === desc.keyName);
      if (!entry) return { key: null, tail: '', configured: false, keyState: 'missing' };
      if (!entry.enabled) {
        return { key: null, tail: maskTail(entry.keyValue), configured: false, keyState: 'disabled' };
      }
      return { key: entry.keyValue, tail: maskTail(entry.keyValue), configured: true, keyState: 'set' };
    },
    [entries],
  );

  const resolved = useMemo(() => {
    const out: Record<string, ResolvedKey> = {};
    for (const d of API_DESCRIPTORS) out[d.id] = resolveKey(d);
    return out;
  }, [resolveKey]);

  /* ------------------------------------------------------------ usage */

  const refreshUsage = useCallback(async () => {
    setDeviceLedger({ ...deviceUsage() });
    setGlobalLedger(await globalUsageToday(METERED, Date.now()));
  }, []);

  /* ----------------------------------------------------------- probing */

  const persist = useCallback(
    async (r: Record<string, ProbeResult>, g: Record<string, GoodCheck>, a: QuotaAssumptions) => {
      try {
        await saveApiHealth(r, g, a);
      } catch {
        setNote('Could not save health results (owner access required) — showing live results only.');
      }
    },
    [],
  );

  const probeApis = useCallback(
    async (apiIds: string[]) => {
      const nextResults = { ...resultsRef.current };
      const nextGood = { ...goodRef.current };
      for (const apiId of apiIds) {
        const desc = API_DESCRIPTORS.find((d) => d.id === apiId);
        if (!desc) continue;
        const rk = resolveKey(desc);
        if (!rk.configured) continue; // untested by definition; card shows why
        setTesting((t) => ({ ...t, [apiId]: true }));
        try {
          const res = await runProbe(apiId, rk.key);
          nextResults[apiId] = res;
          const g = rotateGoodCheck(nextGood[apiId] ?? null, res, rk.tail);
          if (g) nextGood[apiId] = g;
          if (res.probeCostUnits > 0) recordApiUse(apiId, 0, res.probeCostUnits);
          setResults({ ...nextResults });
          setGood({ ...nextGood });
        } finally {
          setTesting((t) => ({ ...t, [apiId]: false }));
        }
      }
      setNowMs(Date.now());
      await persist(nextResults, nextGood, assumptionsRef.current);
      await refreshUsage();
    },
    [resolveKey, persist, refreshUsage],
  );

  /* ------------------------------------------- initial load + auto-check */

  useEffect(() => {
    if (!ready || autoRanRef.current) return;
    autoRanRef.current = true;
    void (async () => {
      const stored = await loadApiHealth();
      setResults(stored.results);
      setGood(stored.good);
      setAssumptions(stored.assumptions);
      if (stored.assumptions.youtubeDailyUnits) setYtLimitInput(String(stored.assumptions.youtubeDailyUnits));
      if (stored.assumptions.geminiDailyRequests) setGemLimitInput(String(stored.assumptions.geminiDailyRequests));
      resultsRef.current = stored.results;
      goodRef.current = stored.good;
      assumptionsRef.current = stored.assumptions;
      await refreshUsage();
      // Baseline the key tails so a later save/rotation is detectable.
      const tails: Record<string, string> = {};
      for (const d of API_DESCRIPTORS) tails[d.id] = resolveKey(d).tail;
      probedTailsRef.current = tails;
      // Auto-check when results are missing or older than 15 minutes.
      const newest = Math.max(0, ...Object.values(stored.results).map((r) => r.checkedAt));
      if (Date.now() - newest > AUTO_CHECK_MS) {
        await probeApis(API_DESCRIPTORS.map((d) => d.id));
      }
    })();
  }, [ready, probeApis, refreshUsage, resolveKey]);

  /* ------------------------------ hot activation: re-probe rotated keys */

  useEffect(() => {
    if (!ready || !probedTailsRef.current) return;
    const baseline = probedTailsRef.current;
    const changed: string[] = [];
    const nextBaseline = { ...baseline };
    for (const d of API_DESCRIPTORS) {
      const tail = resolveKey(d).tail;
      nextBaseline[d.id] = tail;
      if (baseline[d.id] !== undefined && baseline[d.id] !== tail && resolveKey(d).configured) {
        changed.push(d.id);
      }
    }
    probedTailsRef.current = nextBaseline;
    if (changed.length > 0) {
      setNote(`Key changed for ${changed.join(', ')} — re-checking health now…`);
      void probeApis(changed);
    }
  }, [entries, ready, resolveKey, probeApis]);

  /* ------------------------------------------------------------- actions */

  const testAll = async () => {
    setTestingAll(true);
    setNote(null);
    try {
      await probeApis(API_DESCRIPTORS.map((d) => d.id));
    } finally {
      setTestingAll(false);
    }
  };

  const saveAssumptions = async () => {
    const next: QuotaAssumptions = { ...assumptions };
    const yt = Number(ytLimitInput);
    if (ytLimitInput.trim() && Number.isFinite(yt) && yt > 0) next.youtubeDailyUnits = Math.floor(yt);
    else delete next.youtubeDailyUnits;
    const gm = Number(gemLimitInput);
    if (gemLimitInput.trim() && Number.isFinite(gm) && gm > 0) next.geminiDailyRequests = Math.floor(gm);
    else delete next.geminiDailyRequests;
    setAssumptions(next);
    assumptionsRef.current = next;
    await persist(resultsRef.current, goodRef.current, next);
    setNote('Quota assumptions saved.');
  };

  /* -------------------------------------------------------------- render */

  const usageFor = (desc: ApiDescriptor): { used: number; source: 'global' | 'device' } | null => {
    if (desc.quota.kind !== 'daily-units' && desc.quota.kind !== 'daily-requests') return null;
    const pick = (ledger: UsageLedger): number => {
      const b = todayBucket(ledger, desc.id, nowMs);
      return desc.quota.kind === 'daily-units' ? b.units : b.calls;
    };
    if (globalLedger) return { used: pick(globalLedger), source: 'global' };
    return { used: pick(deviceLedger), source: 'device' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> API Health &amp; Quota
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Every external API the app uses — is it working, and how much quota is left.
            Usage bars count the app’s own calls (providers do not report usage back to a key),
            and each card says so. Auto-checks run at most every 15 minutes; the YouTube check
            itself costs 1 of the 10,000 daily units.
          </p>
        </div>
        <button
          onClick={() => void testAll()}
          disabled={testingAll}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3.5 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
          {testingAll ? 'Testing…' : 'Test all'}
        </button>
      </div>

      {note && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-200">
          {note}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {API_DESCRIPTORS.map((desc) => {
          const rk = resolved[desc.id];
          const res = results[desc.id] ?? null;
          const usage = usageFor(desc);
          const limit = effectiveLimit(desc, assumptions);
          const ratio =
            usage && limit ? quotaRatio(usage.used, limit) : null;
          const state = healthState(res, { configured: rk.configured, ratio });
          const impact = impactFor(desc, state);
          const goodInfo = goodCheckInfo(good[desc.id] ?? null, res, rk.tail);
          const band = ratio !== null ? quotaBand(ratio) : 'normal';
          return (
            <div key={desc.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base" aria-hidden>{HEALTH_LIGHT[state]}</span>
                <span className="font-bold text-slate-100 text-sm">{desc.label}</span>
                <span className="text-[11px] font-bold text-slate-400">{HEALTH_LABEL[state]}</span>
                <span className="ml-auto">
                  <button
                    onClick={() => void probeApis([desc.id])}
                    disabled={!!testing[desc.id] || !rk.configured}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 min-h-[32px]"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    {testing[desc.id] ? 'Testing…' : 'Test now'}
                  </button>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{desc.feature}</p>

              <p className="text-[11px] text-slate-400">
                {rk.keyState === 'keyless' && 'Keyless service — no key to manage.'}
                {rk.keyState === 'set' && <>Key: <span className="font-mono">Set {rk.tail}</span> (published from the table below)</>}
                {rk.keyState === 'device' && <>Key: <span className="font-mono">found on this device {rk.tail}</span> — from the build or Account settings, not the table below.</>}
                {rk.keyState === 'disabled' && <>Key: <span className="font-mono">Set {rk.tail}</span> but <b>disabled</b> in the table below.</>}
                {rk.keyState === 'missing' && (desc.keySource === 'device'
                  ? 'Key: none found on this device.'
                  : 'Key: not set — add it in the table below and it goes live within a minute, no redeploy.')}
              </p>

              {res && (
                <p className="text-[11px] text-slate-400">
                  Last check {fmtAgo(res.checkedAt, nowMs)}
                  {res.latencyMs !== null && <> · {res.latencyMs} ms</>}
                  {res.probeCostUnits > 0 && <> · probe cost {res.probeCostUnits} unit</>}
                  {' — '}{res.detail}
                </p>
              )}
              {!res && rk.configured && (
                <p className="text-[11px] text-slate-500">Not tested yet — press Test now.</p>
              )}

              {goodInfo && (
                <p className="text-[11px] text-emerald-300/80">
                  Last good check {fmtAgo(goodInfo.checkedAt, nowMs)}
                  {goodInfo.rotated ? <> with the <b>previous key</b></> : ''}
                  {goodInfo.keyTail ? <> (<span className="font-mono">{goodInfo.keyTail}</span>)</> : ''}.
                </p>
              )}

              {impact && (
                <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] font-bold text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {impact}
                </p>
              )}

              {/* Quota */}
              {desc.quota.kind === 'daily-units' || desc.quota.kind === 'daily-requests' ? (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${band === 'full' ? 'bg-red-500' : band === 'near' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {usage && limit
                      ? `${usage.used.toLocaleString(appLocale())} of ${limit.toLocaleString(appLocale())} ${desc.quota.kind === 'daily-units' ? 'units' : 'requests'} used today — counted by the app itself (${usage.source === 'global' ? 'all devices' : 'this device only'}).`
                      : 'No tracked usage yet today.'}
                    {desc.quota.reset === 'midnight-pacific' &&
                      ` Resets ${new Date(nextPacificMidnight(nowMs)).toLocaleString(appLocale())} (midnight Los Angeles).`}
                    {desc.quota.reset === 'rolling-24h' && ' Free allowance is per device/IP over a rolling 24h.'}
                    {limitIsAssumption(desc) &&
                      ' The limit is Google’s published free-tier figure — an assumption you can edit below.'}
                  </p>
                </div>
              ) : desc.quota.kind === 'monthly-units' ? (
                <p className="text-[11px] text-slate-500">
                  Published limit: {desc.quota.limit.toLocaleString(appLocale())} {desc.quota.unitName}.
                  The provider does not report usage back to the key, so no honest usage bar exists — health only.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">{desc.quota.note}</p>
              )}

              <p className="text-[11px] text-slate-600">{desc.probeNote}</p>
            </div>
          );
        })}
      </div>

      {/* Quota assumptions */}
      <div className="rounded-2xl border border-slate-800 p-4 space-y-2">
        <h3 className="text-sm font-black text-slate-200">Quota limits (editable assumptions)</h3>
        <p className="text-[11px] text-slate-500 max-w-2xl">
          Providers change free-tier limits without notice. If Google’s published numbers change,
          correct them here — the bars and warnings follow immediately. Leave blank for the built-in defaults
          (YouTube 10,000 units/day · Gemini 250 requests/day).
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-400">YouTube units / day</span>
            <input
              value={ytLimitInput}
              onChange={(e) => setYtLimitInput(e.target.value)}
              inputMode="numeric"
              placeholder="10000"
              className="mt-1 w-36 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 min-h-[44px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-400">Gemini requests / day</span>
            <input
              value={gemLimitInput}
              onChange={(e) => setGemLimitInput(e.target.value)}
              inputMode="numeric"
              placeholder="250"
              className="mt-1 w-36 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 min-h-[44px]"
            />
          </label>
          <button
            onClick={() => void saveAssumptions()}
            className="rounded-xl bg-amber-500 px-3.5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 min-h-[44px]"
          >
            Save limits
          </button>
        </div>
      </div>
    </div>
  );
};
