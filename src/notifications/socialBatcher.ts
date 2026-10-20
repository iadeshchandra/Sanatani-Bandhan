/**
 * notifications/socialBatcher.ts — pure batching logic for social notifications.
 * ============================================================================
 * Ashirvads and RSVPs arrive one by one (each is its own Firestore doc).
 * Emitting one notification per arrival would buzz the devotee's phone for
 * every blessing. Instead we collect arrivals in a 90-second window per
 * target (post/event) and emit ONE warm summary.
 *
 * This module is pure (no Firebase, no React) so every rule is unit-testable:
 *   - window expiry, duplicate suppression, actor-name summarization.
 */

export type BatchableKind = 'ashirvad' | 'rsvp';

export interface SocialArrival {
  kind: BatchableKind;
  /** postId for ashirvad, eventId for rsvp. */
  targetId: string;
  /** Human label for copy: post excerpt or event title. */
  targetLabel: string;
  actorUid: string;
  actorName: string;
  at: number;
}

export interface SocialSummary {
  kind: BatchableKind;
  targetId: string;
  targetLabel: string;
  actors: Array<{ uid: string; name: string }>;
  windowStart: number;
  dedupeKey: string;
}

/** How long arrivals collect before a summary is emitted. */
export const SOCIAL_BATCH_WINDOW_MS = 90_000;

/**
 * QUEUED #38: signature of the watcher set socialNotify's reconcile would
 * build — the UTC day (so day-keyed state rolls over at midnight) plus the
 * watched post ids and event ids, in build order. Reconcile keeps its
 * live listeners whenever this signature is unchanged, instead of tearing
 * them down and re-billing every watcher's initial snapshot.
 */
export function watcherSignature(dayKey: string, postIds: string[], eventIds: string[]): string {
  return [dayKey, ...postIds.map((id) => `p:${id}`), ...eventIds.map((id) => `e:${id}`)].join('|');
}

/**
 * Summarize actor names for notification copy, in the devotee's language.
 *   1 → "Meera"
 *   2-3 → "Meera, Arjun" / "Meera, Arjun, Priya"
 *   4+ → "Meera and 3 other devotees" (localized)
 */
export function summarizeActors(
  names: string[],
  lang: 'en' | 'bn' | 'hi',
): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return lang === 'bn' ? 'একজন ভক্ত' : lang === 'hi' ? 'एक भक्त' : 'A devotee';
  if (unique.length <= 3) return unique.join(', ');
  const more = unique.length - 1;
  if (lang === 'bn') return `${unique[0]} এবং আরও ${more} জন ভক্ত`;
  if (lang === 'hi') return `${unique[0]} और ${more} अन्य भक्त`;
  return `${unique[0]} and ${more} other devotees`;
}

interface Batch {
  kind: BatchableKind;
  targetId: string;
  targetLabel: string;
  arrivals: SocialArrival[];
  windowStart: number;
}

export class SocialBatcher {
  private batches = new Map<string, Batch>();

  private key(kind: BatchableKind, targetId: string): string {
    return `${kind}::${targetId}`;
  }

  /**
   * Collect one arrival. Same actor twice in one window counts once
   * (Ashirvad docs are per-user anyway; this guards replays).
   */
  collect(a: SocialArrival): void {
    const k = this.key(a.kind, a.targetId);
    let b = this.batches.get(k);
    if (!b) {
      b = { kind: a.kind, targetId: a.targetId, targetLabel: a.targetLabel, arrivals: [], windowStart: a.at };
      this.batches.set(k, b);
    }
    if (!b.arrivals.some((x) => x.actorUid === a.actorUid)) {
      b.arrivals.push(a);
    }
  }

  /**
   * Return summaries for batches whose window has expired. Flushed batches
   * are removed — each summary is emitted exactly once.
   */
  flushReady(now: number): SocialSummary[] {
    const out: SocialSummary[] = [];
    for (const [k, b] of this.batches) {
      if (now - b.windowStart >= SOCIAL_BATCH_WINDOW_MS) {
        out.push({
          kind: b.kind,
          targetId: b.targetId,
          targetLabel: b.targetLabel,
          actors: b.arrivals.map((a) => ({ uid: a.actorUid, name: a.actorName })),
          windowStart: b.windowStart,
          dedupeKey: `social:${b.kind}:${b.targetId}:${b.windowStart}`,
        });
        this.batches.delete(k);
      }
    }
    return out;
  }

  /** Number of batches currently collecting (for tests/debugging). */
  get pendingBatches(): number {
    return this.batches.size;
  }
}
