/**
 * ai/godmode/accuracy.ts — Copilot accuracy hardening (QUEUED #36, PURE).
 * =====================================================================
 * The owner's requirement: the Copilot "will do his job 100%
 * accurately." 100% is not a promise a person can make about prose —
 * so this module makes wrongness STRUCTURALLY hard and MEASURED:
 *
 *  1. PROVENANCE — every factual answer carries its sources (which
 *     read/doc produced the figures, and when). Built here + in the
 *     executors; rendered as a small footer on the owner surface only.
 *  2. DUAL COMPUTATION — money figures are computed twice via genuinely
 *     independent paths (float formula vs integer arithmetic). If the
 *     two ever disagree, the answer shows NEITHER figure (fail-honest).
 *  3. SELF-VERIFICATION — verifyFigures() re-checks every figure an
 *     executor cited against the final rendered text (the pipeline runs
 *     it after rendering + any voice rephrase). A missing/altered
 *     figure auto-corrects the answer to the computed values.
 *     This generalises #32's H2b numeric-preservation (voice-only)
 *     into the main render path.
 *
 * Pure module: no Firestore, no writes, fully unit-testable.
 */

import type { PlatformTerms } from '../../lib/termsConfig';
import type { AnswerSource, FigureClaim, LangCode } from '../types';

/* ------------------------------------------------------------------ */
/* Provenance builders                                                 */
/* ------------------------------------------------------------------ */

function lc(lang: LangCode): 'en' | 'hi' | 'bn' {
  return lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
}

/** Sources for an answer built from a terms snapshot. The read time is
 *  the snapshot's own load time — a cached read says so honestly. */
export function termsSources(terms: PlatformTerms, now: number): AnswerSource[] {
  const readAt = terms.loadedAt ?? now;
  const live = terms.loadedAt !== null;
  return [
    { label: 'plans/{seva,standard,premium,purohit_pro}', readAt, live },
    { label: 'platformConfig/commission', readAt, live },
  ];
}

/** Source for the #31 terms-history audit read. */
export function historySource(now: number): AnswerSource {
  return { label: 'audit_logs (terms history)', readAt: now, live: true };
}

/** Source for a live collection count/read. */
export function collectionSource(collectionName: string, now: number): AnswerSource {
  return { label: `collection ${collectionName}`, readAt: now, live: true };
}

/**
 * The small footer line for an answer card, e.g.
 * "Source: plans/standard · platformConfig/commission — read just now".
 * When any source is a defaults snapshot, the footer says so plainly.
 */
export function formatSourcesFooter(sources: AnswerSource[], now: number): string {
  if (!sources.length) return '';
  const labels = sources.map((s) => s.label).join(' · ');
  const readAt = Math.max(...sources.map((s) => s.readAt));
  const when =
    now - readAt < 90_000
      ? 'read just now'
      : `read at ${new Date(readAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  const defaultsNote = sources.some((s) => !s.live)
    ? ' — code defaults (the live config could not be read)'
    : '';
  return `Source: ${labels} — ${when}${defaultsNote}`;
}

/* ------------------------------------------------------------------ */
/* Dual computation — money computed twice, independently              */
/* ------------------------------------------------------------------ */

export interface DualResult {
  agree: boolean;
  /** Path A result (float formula). */
  floatPath: number;
  /** Path B result (integer arithmetic). */
  integerPath: number;
  /** The agreed value, or null when the paths disagree. */
  value: number | null;
}

export function combineDual(floatPath: number, integerPath: number): DualResult {
  const agree = floatPath === integerPath;
  return { agree, floatPath, integerPath, value: agree ? floatPath : null };
}

/**
 * Commission on an order, computed twice:
 *  · Path A — the direct float formula: round(amount × rate / 100).
 *  · Path B — exact integer arithmetic: the rate in hundredths of a
 *    percent (12% → 1200), commission = amount × rateHundredths / 10000
 *    with manual half-up rounding. No float ever touches the money.
 * The two implementations share no code; agreement is therefore real
 * evidence, not a tautology. (Domain: non-negative amounts/rates.)
 */
export function dualCommission(amountInr: number, ratePct: number): DualResult {
  const floatPath = Math.round((amountInr * ratePct) / 100);
  const rateHundredths = Math.round(ratePct * 100);
  const integerPath = Math.floor((amountInr * rateHundredths + 5000) / 10000);
  return combineDual(floatPath, integerPath);
}

/** A midpoint figure, computed as (a+b)/2 and as a + (b−a)/2. */
export function dualAverage(a: number, b: number): DualResult {
  const floatPath = Math.round((a + b) / 2);
  const integerPath = a + Math.round((b - a) / 2);
  return combineDual(floatPath, integerPath);
}

/* ------------------------------------------------------------------ */
/* Self-verification — cited figures vs the final rendered text        */
/* ------------------------------------------------------------------ */

/**
 * Numeric tokens of a text (mirrors the H2b extractor in voice/enhance:
 * commas stripped, decimals and % preserved).
 */
export function extractNumericTokens(text: string): string[] {
  const out: string[] = [];
  const re = /\d[\d,]*(?:\.\d+)?%?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || '')) !== null) {
    out.push(m[0].replace(/,/g, ''));
  }
  return out;
}

/** All numeric values appearing in the given texts (for strict-mode extras). */
export function numericTokensOf(...texts: string[]): number[] {
  const vals = new Set<number>();
  for (const t of texts) {
    for (const tok of extractNumericTokens(t)) {
      const v = Number(tok.replace(/%$/, ''));
      if (Number.isFinite(v)) vals.add(v);
    }
  }
  return [...vals];
}

export interface FigureVerification {
  ok: boolean;
  /** Claims whose rendered figure is absent from the text. */
  missing: FigureClaim[];
  /** Numeric tokens no claim/extra explains (strict mode only). */
  stray: string[];
}

/**
 * Re-check an answer's cited figures against its final text.
 *  · Presence (always): every claim's `rendered` string must appear.
 *  · Strict (opt-in): every numeric token in the text must be explained
 *    by a claim (its rendered form or its raw value in plain/locale/
 *    2-dp dress) or by a declared extra number.
 */
export function verifyFigures(
  text: string,
  claims: FigureClaim[],
  opts?: { strict?: boolean; extraNumbers?: number[] }
): FigureVerification {
  const missing = claims.filter((c) => !text.includes(c.rendered));
  const stray: string[] = [];
  if (opts?.strict) {
    const allowed = new Set<string>();
    const addValue = (v: number) => {
      for (const t of extractNumericTokens(String(v))) allowed.add(t);
      for (const t of extractNumericTokens(v.toLocaleString('en-IN'))) allowed.add(t);
      if (!Number.isInteger(v)) {
        for (const t of extractNumericTokens(v.toFixed(2))) allowed.add(t);
      }
    };
    for (const c of claims) {
      for (const t of extractNumericTokens(c.rendered)) allowed.add(t);
      addValue(c.value);
    }
    for (const e of opts.extraNumbers ?? []) addValue(e);
    const seen = new Set<string>();
    for (const t of extractNumericTokens(text)) {
      if (!allowed.has(t) && !seen.has(t)) {
        seen.add(t);
        stray.push(t);
      }
    }
  }
  return { ok: missing.length === 0 && stray.length === 0, missing, stray };
}

/**
 * The auto-correction rendering: when verification fails, the owner
 * sees the figures stated plainly, computed from the raw values —
 * never the corrupted text. (Dev metadata records what happened.)
 */
export function renderClaimsFallback(claims: FigureClaim[], lang: LangCode): string {
  const l = lc(lang);
  const head =
    l === 'hi'
      ? '🪔 जाँचे हुए आँकड़े, साफ़ शब्दों में:'
      : l === 'bn'
        ? '🪔 যাচাইকৃত সংখ্যা, সহজ কথায়:'
        : '🪔 The checked figures, stated plainly:';
  return [head, ...claims.map((c) => `· ${c.label}: ${c.rendered}`)].join('\n');
}
