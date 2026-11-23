/**
 * liveBoard.ts — NEXT-LEVEL A4: the festival's live notice board.
 * =====================================================================
 * Pure builders for the `liveBoard` field on the published
 * `festival_events` doc — day-of notes from the organising team:
 * gate changes, lost & found, announcements. No new collection and
 * no rules change: the board rides the doc's existing staff update
 * path (the same setDoc-merge the committee already uses to stamp
 * festivalCancelled / debriefSummary / sponsorThanks onto it), and
 * the public page reads it read-free with the rest of the doc.
 *
 * The laws kept here, in the builders, so no surface can break them:
 *  - Text is the organiser's own words — trimmed and length-capped
 *    (LIVE_BOARD_TEXT_MAX), never scanned, never rewritten. The
 *    composer's "no personal phone numbers" line is a hint in the
 *    UI, not a censor in the data path.
 *  - The board stays small: at most LIVE_BOARD_CAP entries ride the
 *    doc. When a write would pass the cap, the oldest RESOLVED
 *    entries leave first (their story is finished), then the oldest
 *    entries overall — the newest notes always survive.
 *  - Display order is a reader's order, not storage order: open
 *    lost & found first (someone is looking for something NOW),
 *    then gate notes and announcements newest-first, then resolved
 *    lost & found — kept visible, badged, as the warm closing note.
 *  - Reads are defensive: the doc is shaped by these builders on
 *    every read (sanitiseBoard), so a malformed entry can never
 *    reach a surface.
 */

export type LiveBoardKind = 'gate' | 'lost' | 'found' | 'announcement';

export interface LiveBoardEntry {
  id: string;
  kind: LiveBoardKind;
  /** The organiser's own words (trimmed, ≤ LIVE_BOARD_TEXT_MAX). */
  text: string;
  /** Posted at, epoch ms. */
  at: number;
  /** Lost & found closure — set when the story ends well. */
  resolved?: boolean;
}

export const LIVE_BOARD_KINDS: readonly LiveBoardKind[] = [
  'gate',
  'lost',
  'found',
  'announcement',
] as const;

/** The board is a notice board, not an archive: the newest 20 notes. */
export const LIVE_BOARD_CAP = 20;

/** One note, one breath — a notice, not an essay. */
export const LIVE_BOARD_TEXT_MAX = 280;

const isKind = (v: unknown): v is LiveBoardKind =>
  v === 'gate' || v === 'lost' || v === 'found' || v === 'announcement';

/** Trim + length-cap the organiser's words. '' when nothing remains. */
export function cleanBoardText(raw: string): string {
  return (raw || '').trim().slice(0, LIVE_BOARD_TEXT_MAX);
}

/**
 * Shape an untrusted stored value into board entries. Anything that
 * is not a well-formed entry (known kind, non-empty text, a finite
 * timestamp, an id) is dropped — the public page must never render
 * a shape these builders did not produce.
 */
export function sanitiseBoard(raw: unknown): LiveBoardEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveBoardEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const e = r as Record<string, unknown>;
    if (!isKind(e.kind)) continue;
    if (typeof e.id !== 'string' || e.id === '') continue;
    if (typeof e.text !== 'string') continue;
    const text = cleanBoardText(e.text);
    if (!text) continue;
    if (typeof e.at !== 'number' || !Number.isFinite(e.at)) continue;
    out.push({
      id: e.id,
      kind: e.kind,
      text,
      at: e.at,
      ...(e.resolved === true ? { resolved: true } : {}),
    });
  }
  return out;
}

/**
 * Build one entry, or null when the words clean away to nothing —
 * a blank note is never posted.
 */
export function makeBoardEntry(
  kind: LiveBoardKind,
  rawText: string,
  at: number,
  id: string
): LiveBoardEntry | null {
  const text = cleanBoardText(rawText);
  if (!text) return null;
  return { id, kind, text, at };
}

/**
 * Hold the board at its cap. Storage order is append order (oldest
 * first), so the tail is always the newest. Overflow leaves in this
 * order: oldest RESOLVED entries first (any kind — a closed story),
 * then the oldest entries overall.
 */
export function applyBoardCap(board: readonly LiveBoardEntry[]): LiveBoardEntry[] {
  if (board.length <= LIVE_BOARD_CAP) return [...board];
  const drop = new Set<string>();
  let excess = board.length - LIVE_BOARD_CAP;
  for (const e of board) {
    if (excess <= 0) break;
    if (e.resolved) {
      drop.add(e.id);
      excess -= 1;
    }
  }
  for (const e of board) {
    if (excess <= 0) break;
    if (!drop.has(e.id)) {
      drop.add(e.id);
      excess -= 1;
    }
  }
  return board.filter((e) => !drop.has(e.id));
}

/** Append one entry and hold the cap — the composer's write shape. */
export function appendBoardEntry(
  board: readonly LiveBoardEntry[],
  entry: LiveBoardEntry
): LiveBoardEntry[] {
  return applyBoardCap([...board, entry]);
}

/** Mark one entry resolved (the lost & found happy ending). */
export function resolveBoardEntry(
  board: readonly LiveBoardEntry[],
  id: string
): LiveBoardEntry[] {
  return board.map((e) => (e.id === id ? { ...e, resolved: true } : e));
}

/** Remove one entry entirely (a note posted in error). */
export function removeBoardEntry(
  board: readonly LiveBoardEntry[],
  id: string
): LiveBoardEntry[] {
  return board.filter((e) => e.id !== id);
}

const isLostFound = (e: LiveBoardEntry) => e.kind === 'lost' || e.kind === 'found';

/**
 * The reader's order for the public page: open lost & found first
 * (newest first), then gate notes and announcements (newest first),
 * then resolved lost & found (newest first) — the reunions stay on
 * the board, badged, below the live notes.
 */
export function boardForDisplay(board: readonly LiveBoardEntry[]): LiveBoardEntry[] {
  const clean = sanitiseBoard(board);
  const newestFirst = (a: LiveBoardEntry, b: LiveBoardEntry) => b.at - a.at;
  const open = clean.filter((e) => isLostFound(e) && !e.resolved).sort(newestFirst);
  const notes = clean.filter((e) => !isLostFound(e)).sort(newestFirst);
  const closed = clean.filter((e) => isLostFound(e) && e.resolved).sort(newestFirst);
  return [...open, ...notes, ...closed];
}

/** Entries a devotee can still act on (the /events card chip count). */
export function unresolvedBoardCount(board: readonly LiveBoardEntry[] | undefined): number {
  if (!board) return 0;
  return sanitiseBoard(board).filter((e) => !e.resolved).length;
}

/** The board has something to show — the public section's gate. */
export function boardHasVisible(board: readonly LiveBoardEntry[] | undefined): boolean {
  return !!board && sanitiseBoard(board).length > 0;
}
