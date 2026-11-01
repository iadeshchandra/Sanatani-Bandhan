/**
 * lib/margdarshan/suggestions.ts — Your Voice: the suggestion model (pure).
 * ============================================================================
 * Margdarshan J3 (blueprint §5 / §8). The data contract here MIRRORS
 * firestore.rules exactly — the `suggestions` match the diet-3 + J3
 * block added (see ARCHITECTURE.md §18/§19):
 *
 *   suggestions/{id} — authorId, authorName, kind, deskId, title,
 *     body, language, status, statusHistory, officialReplies,
 *     supporterCount, hidden, createdAt, updatedAt, shippedVersion,
 *     duplicateOf. Create is author-only and pinned by rules to
 *     status 'received', supporterCount 0, hidden false; the field
 *     set is closed by a hasOnly() list — SUGGESTION_CREATE_KEYS
 *     below is that list, and the contract tests parse the rules
 *     file and compare the two so they can never drift apart.
 *
 *   suggestions/{id}/supporters/{uid} — the ballot box (polls
 *     pattern): existence = support; the parent's supporterCount may
 *     move only ±1 in the same batch as the caller's own ballot
 *     appearing/vanishing (the suggAnchorOk rules anchor).
 *
 * This file is firebase-free and jest-safe. Firestore I/O lives in
 * suggestionsService.ts; seed content in suggestionSeeds.ts.
 */

/* ------------------------------------------------------------------ */
/* The rules-mirrored vocabulary                                       */
/* ------------------------------------------------------------------ */

/** SUGG_KINDS() in firestore.rules — the four kinds a voice can be. */
export const SUGGESTION_KINDS = [
  'feature',
  'problem',
  'praise',
  'manual-gap',
] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

/** SUGG_STATUSES() in firestore.rules — the full pipeline + exits. */
export const SUGGESTION_STATUSES = [
  'received',
  'under-review',
  'planned',
  'in-progress',
  'shipped',
  'not-now',
  'duplicate',
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/** The browsable pipeline stages (the two exits appear under "All"
 *  and in My Suggestions — they are endings, not stages to browse). */
export const PIPELINE_STATUSES: readonly SuggestionStatus[] = [
  'received',
  'under-review',
  'planned',
  'in-progress',
  'shipped',
];

/**
 * The EXACT create field set — the rules' hasOnly() list, in the
 * rules' own order. buildSuggestionCreate emits precisely these
 * keys, no more, no fewer (contract-tested against the rules text).
 */
export const SUGGESTION_CREATE_KEYS = [
  'authorId',
  'authorName',
  'kind',
  'deskId',
  'title',
  'body',
  'language',
  'status',
  'statusHistory',
  'officialReplies',
  'supporterCount',
  'hidden',
  'createdAt',
  'updatedAt',
  'shippedVersion',
  'duplicateOf',
] as const;

/** The keys a SuperAdmin triage update may touch (rules diffKeysOnly). */
export const SUGGESTION_TRIAGE_KEYS = [
  'status',
  'statusHistory',
  'officialReplies',
  'hidden',
  'duplicateOf',
  'shippedVersion',
  'updatedAt',
] as const;

/** The keys the anchored support/withdraw batch may touch. */
export const SUGGESTION_ANCHOR_KEYS = ['supporterCount', 'updatedAt'] as const;

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface SuggestionStatusEntry {
  status: SuggestionStatus;
  /** Epoch ms (client clock — a history display field). */
  at: number;
  /** Who moved it: 'author' at filing, 'team' at triage. */
  byRole: 'author' | 'team';
}

export interface OfficialReply {
  text: string;
  /** Epoch ms. */
  at: number;
  byName: string;
}

/** A suggestion as the UI holds it (timestamps resolved to ms). */
export interface Suggestion {
  id: string;
  authorId: string;
  authorName: string;
  kind: SuggestionKind;
  deskId: string | null;
  title: string;
  body: string;
  language: string;
  status: SuggestionStatus;
  statusHistory: SuggestionStatusEntry[];
  officialReplies: OfficialReply[];
  supporterCount: number;
  hidden: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  shippedVersion: string | null;
  duplicateOf: string | null;
}

export interface SuggestionDraftInput {
  authorId: string;
  authorName: string;
  kind: SuggestionKind;
  deskId?: string | null;
  title: string;
  body: string;
  language: string;
}

/* ------------------------------------------------------------------ */
/* Validation — the rules' own limits, checked before the write       */
/* ------------------------------------------------------------------ */

/**
 * Problem codes for a draft, mirroring suggTitleBodyOk() + the
 * create clause in the rules (title 1–140, body 1–2000, authorName
 * 1–80, language ≤ 8, deskId null or a string ≤ 64, kind in the
 * list). Empty array = the rules will accept the shape.
 */
export function validateSuggestionDraft(input: SuggestionDraftInput): string[] {
  const problems: string[] = [];
  const title = (input.title || '').trim();
  const body = (input.body || '').trim();
  const name = (input.authorName || '').trim();
  if (title.length < 1 || title.length > 140) problems.push('title-length');
  if (body.length < 1 || body.length > 2000) problems.push('body-length');
  if (name.length < 1 || name.length > 80) problems.push('authorName-length');
  if (!(SUGGESTION_KINDS as readonly string[]).includes(input.kind)) problems.push('kind');
  if (!input.language || input.language.length > 8) problems.push('language');
  if (
    input.deskId != null &&
    (typeof input.deskId !== 'string' || input.deskId.length > 64)
  ) {
    problems.push('deskId');
  }
  if (!input.authorId) problems.push('authorId');
  return problems;
}

/* ------------------------------------------------------------------ */
/* The create payload — exactly the rules' field set                   */
/* ------------------------------------------------------------------ */

/**
 * Build the create payload. `stamp` is injected (serverTimestamp()
 * from the service; a plain value in tests) so this stays pure.
 * Title/body are trimmed here — the rules measure the stored text.
 */
export function buildSuggestionCreate(
  input: SuggestionDraftInput,
  opts: { nowMs: number; stamp: unknown }
): Record<string, unknown> {
  return {
    authorId: input.authorId,
    authorName: (input.authorName || '').trim(),
    kind: input.kind,
    deskId: input.deskId ?? null,
    title: (input.title || '').trim(),
    body: (input.body || '').trim(),
    language: input.language,
    status: 'received',
    statusHistory: [
      { status: 'received', at: opts.nowMs, byRole: 'author' },
    ] as SuggestionStatusEntry[],
    officialReplies: [] as OfficialReply[],
    supporterCount: 0,
    hidden: false,
    createdAt: opts.stamp,
    updatedAt: opts.stamp,
    shippedVersion: null,
    duplicateOf: null,
  };
}

/** Append a status movement to the history (triage writes). */
export function nextStatusHistory(
  history: readonly SuggestionStatusEntry[],
  status: SuggestionStatus,
  nowMs: number,
  byRole: 'author' | 'team' = 'team'
): SuggestionStatusEntry[] {
  return [...history, { status, at: nowMs, byRole }];
}

/* ------------------------------------------------------------------ */
/* Board ordering — client-side by design (blueprint §8: no           */
/* composite-index dependency at pilot volume)                        */
/* ------------------------------------------------------------------ */

export type BoardSort = 'top' | 'new';

/** Supporters first (support counts ideas, never people), newest
 *  breaks ties; or purely newest-first. Returns a new array. */
export function sortBoard(
  items: readonly Suggestion[],
  mode: BoardSort
): Suggestion[] {
  const out = [...items];
  if (mode === 'new') {
    out.sort((a, b) => b.createdAtMs - a.createdAtMs);
  } else {
    out.sort(
      (a, b) =>
        b.supporterCount - a.supporterCount || b.createdAtMs - a.createdAtMs
    );
  }
  return out;
}

/** Filter for the board chips: 'all' or one pipeline status. */
export function filterBoard(
  items: readonly Suggestion[],
  filter: SuggestionStatus | 'all'
): Suggestion[] {
  if (filter === 'all') return [...items];
  return items.filter((s) => s.status === filter);
}
