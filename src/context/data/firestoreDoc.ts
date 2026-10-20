/**
 * firestoreDoc.ts — document hygiene for Firestore writes (QUEUED #45).
 *
 * Root cause pinned by #45: Firestore is initialized WITHOUT
 * `ignoreUndefinedProperties`, so any `undefined` field value makes the
 * client SDK reject the write outright ("Unsupported field value:
 * undefined"). Our forms deliberately build optional fields as
 * `value || undefined` — so member adds and vouchers were rejected by the
 * SDK before ever reaching the network, while the UI celebrated success.
 *
 * `stripUndefinedDeep` is the single funnel every core-collection write
 * passes through: `undefined`-valued keys are removed from plain objects
 * (recursively), arrays are mapped element-wise, and everything else —
 * primitives, null, Dates, Timestamps, FieldValue sentinels such as
 * serverTimestamp(), and any class instance — passes through untouched.
 * Money semantics are unchanged: only absent (undefined) keys are dropped;
 * 0, false, '' and null are real values and are always kept.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[key] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}
