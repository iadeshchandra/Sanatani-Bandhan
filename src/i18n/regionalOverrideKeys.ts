/**
 * i18n/regionalOverrideKeys.ts — regional override key codec.
 * ============================================================
 * Pure and tiny: the `regional.{region}.{termKey}` key convention shared
 * by the suggestion writer, the GodMode console, and the Firestore rules.
 * No Firebase imports — safe for plain jest.
 *
 * Convention: owner-approved regional corrections live in
 * `translationOverrides/{lang}` under flat keys like
 * `regional.tamil-nadu.temple`, alongside ordinary string corrections.
 * The `regional.` prefix keeps the two layers apart.
 */

/**
 * The canonical Firestore field key for a regional vocabulary override:
 * `regional.{region}.{termKey}` — e.g. `regional.tamil-nadu.temple`.
 */
export function regionalOverrideKey(region: string, termKey: string): string {
  return `regional.${region}.${termKey}`;
}

/**
 * Parse a regional override key back into its parts.
 * Returns null for any other key — pure, no side effects.
 */
export function parseRegionalOverrideKey(
  key: string
): { region: string; termKey: string } | null {
  if (!key || typeof key !== 'string') return null;
  const m = key.match(/^regional\.([a-z-]+)\.([a-zA-Z]+)$/);
  return m ? { region: m[1], termKey: m[2] } : null;
}

/**
 * Pull the regional overrides out of a flat override map:
 * `regional.{region}.{termKey}` → region → termKey → text.
 * Pure — does not touch the network or any store. Non-string values and
 * non-regional keys are ignored.
 */
export function extractRegionalOverrides(
  flat: Record<string, unknown> | null | undefined
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!flat || typeof flat !== 'object') return out;
  for (const k of Object.keys(flat)) {
    const parsed = parseRegionalOverrideKey(k);
    if (!parsed) continue;
    const v = (flat as Record<string, unknown>)[k];
    if (typeof v !== 'string') continue;
    (out[parsed.region] ??= {})[parsed.termKey] = v;
  }
  return out;
}
