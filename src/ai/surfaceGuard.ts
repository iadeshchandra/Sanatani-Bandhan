/**
 * ai/surfaceGuard.ts — the never-surface output guard (QUEUED #32, H2).
 * =====================================================================
 * Defence in depth for the isolation law: the client-side assistant for
 * general users must NEVER surface GodMode / platform-internal
 * information. The structural guarantees already make this true (RBAC
 * gates, owner-only intents, corpora with no internal content). This
 * guard is the LAST step of ask() so that no future intent, template,
 * corpus entry, or voice rephrase can quietly break it:
 *
 *  · For any role ≠ 'owner', the FINAL answer text is scanned against
 *    the never-surface list below.
 *  · On ANY hit the WHOLE answer is replaced with a safe fallback —
 *    never partial redaction (a redacted sentence still leaks context,
 *    e.g. "our ████████ rate is …").
 *  · For the owner the guard is a no-op: the Copilot is supposed to
 *    talk about these things.
 *
 * Pure module — no imports from the pipeline, fully unit-testable.
 */

import type { Role } from './types';

/** Labels returned by scanSurface so tests/logs can say WHAT tripped. */
export type SurfaceHit =
  | 'godmode'
  | 'copilot'
  | 'platform-config'
  | 'commission'
  | 'rail-rate'
  | 'rate-field'
  | 'audit-log'
  | 'owner-identity'
  | 'api-key'
  | 'platform-fee'
  | 'terms-config';

interface GuardRule {
  hit: SurfaceHit;
  re: RegExp;
}

const RULES: GuardRule[] = [
  { hit: 'godmode', re: /god\s?mode/i },
  { hit: 'copilot', re: /\bcopilot\b/i },
  { hit: 'platform-config', re: /platform\s?config/i },
  { hit: 'commission', re: /\bcommission\b/i },
  { hit: 'rail-rate', re: /\brail[\s-]?[12]\b/i },
  // camelCase config field names (substring — they have no word edges).
  { hit: 'rate-field', re: /freerate|prorail|freegiglimit/i },
  { hit: 'audit-log', re: /audit[\s_]?logs?\b/i },
  { hit: 'owner-identity', re: /iadeshchandra/i },
  { hit: 'api-key', re: /api[\s-]?keys?\b/i },
  { hit: 'platform-fee', re: /platform\s+fee/i },
  { hit: 'terms-config', re: /termsconfig/i },
];

/** Scan a text for never-surface content. Returns the hit labels. */
export function scanSurface(text: string): SurfaceHit[] {
  if (!text) return [];
  const hits: SurfaceHit[] = [];
  for (const { hit, re } of RULES) {
    if (re.test(text)) hits.push(hit);
  }
  return hits;
}

/** The safe replacement — warm, useful, and itself token-free. */
export function safeSurfaceFallback(lang?: string): string {
  const l = (lang || 'en').toLowerCase();
  if (l === 'hi') {
    return '🙏 इसे सरल शब्दों में कहूँ — मैं तिथि, उत्सव, दान, बुकिंग और ऐप में राह दिखाने में सहायता कर सकता हूँ। क्या जानना चाहेंगे? 🌼';
  }
  if (l === 'bn') {
    return '🙏 সহজ করে বলি — আমি তিথি, উৎসব, দান, বুকিং আর অ্যাপে পথ দেখাতে সাহায্য করতে পারি। কী জানতে চান? 🌼';
  }
  return '🙏 Let me put that simply — I can help with tithis, festivals, dana, booking a seva, and finding your way around the app. What would you like to explore? 🌼';
}

/**
 * Guard a final answer. Non-owner roles: any never-surface hit replaces
 * the entire text with the safe fallback. Owner: returned untouched.
 */
export function guardSurface(text: string, role: Role, lang?: string): string {
  if (role === 'owner') return text;
  if (scanSurface(text).length === 0) return text;
  return safeSurfaceFallback(lang);
}
