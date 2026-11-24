/**
 * pollAgreement.ts — POLLS NEXT-LEVEL P3: "Where we agree".
 * =====================================================================
 * A deterministic, read-only view over a workspace's CONCLUDED
 * polls: where the house was united, where it leaned, where it was
 * divided. Every number comes from the recorded outcome (or, for
 * pre-P1 polls without one, the same derived reading the
 * Transparency Board uses) — no model, no inference, no scoring
 * of people: polls are measured, members never are (the engagement
 * laws forbid leaderboards of devotees; this is a mirror for the
 * house's own questions, nothing more).
 *
 * The margin is the winner's share of the votes that chose between
 * the options (abstentions excluded — standing aside is not a side):
 *  - choice / multi / time: the leader's tally over candidate votes;
 *  - ranked: the winner's FINAL-round tally over the final round's
 *    continuing ballots (the count that actually decided it);
 *  - points: the leading head's points over all points placed.
 * A tie at the top is its own honest band, never a hidden winner.
 * Text polls and voteless polls carry no margin — 'unmeasured',
 * stated as such.
 */
import {
  ABSTAIN_OPTION_ID,
  pollKind,
  pollStoredOutcome,
  type PollKind,
  type PollLike,
} from './pollLogic';

export type AgreementBand = 'united' | 'leaning' | 'divided' | 'tied' | 'unmeasured';

export interface AgreementPoll extends PollLike {
  id: string;
  title?: string;
  createdAt?: number;
  expiresAt?: number;
}

export interface AgreementRow {
  pollId: string;
  title: string;
  kind: PollKind;
  band: AgreementBand;
  /** The leading option's text, when a single leader exists. */
  leaderText: string | null;
  /** The winner's share of the deciding votes, 0..1 (null = unmeasured). */
  share: number | null;
  totalVotes: number;
  verdict?: 'carried' | 'not-carried' | 'quorum-not-met';
  concludedAt: number;
}

const UNITED_AT = 0.75;
const LEANING_AT = 0.5;

function bandFor(share: number): AgreementBand {
  if (share >= UNITED_AT) return 'united';
  if (share >= LEANING_AT) return 'leaning';
  return 'divided';
}

/** One concluded poll → its agreement row, or null while it runs. */
export function pollAgreementRow(poll: AgreementPoll, now: number): AgreementRow | null {
  const concluded =
    poll.status === 'CONCLUDED' ||
    (poll.status === 'ACTIVE' && typeof poll.expiresAt === 'number' && poll.expiresAt > 0 && now >= poll.expiresAt);
  if (!concluded) return null;

  const kind = pollKind(poll);
  const stored = pollStoredOutcome(poll);
  const totalVotes = stored?.totalVotes ?? 0;
  const base: AgreementRow = {
    pollId: poll.id,
    title: poll.title || 'Community poll',
    kind,
    band: 'unmeasured',
    leaderText: null,
    share: null,
    totalVotes,
    ...(stored?.verdict ? { verdict: stored.verdict } : {}),
    concludedAt: stored?.concludedAt ?? poll.expiresAt ?? poll.createdAt ?? 0,
  };
  const textOf = (id: string) => poll.options?.[id]?.text || id;

  if (kind === 'text') return base;

  if (kind === 'ranked') {
    // Only the recorded count can speak for a ranked poll — its
    // option counters never moved. No outcome yet = not counted.
    if (!stored || stored.countMethod !== 'irv' || !stored.rounds || stored.rounds.length === 0) return base;
    if (stored.winnerOptionIds.length > 1) return { ...base, band: 'tied' };
    if (stored.winnerOptionIds.length === 0) return base;
    const last = stored.rounds[stored.rounds.length - 1];
    const winner = stored.winnerOptionIds[0];
    const share = last.continuing > 0 ? (last.tallies[winner] ?? 0) / last.continuing : null;
    if (share === null) return base;
    return { ...base, band: bandFor(share), leaderText: textOf(winner), share };
  }

  if (kind === 'points') {
    if (!stored || stored.countMethod !== 'points' || !stored.pointsTotal || stored.pointsTotal <= 0) return base;
    if (stored.winnerOptionIds.length > 1) return { ...base, band: 'tied' };
    if (stored.winnerOptionIds.length === 0) return base;
    const winner = stored.winnerOptionIds[0];
    const share = (stored.tallies[winner] ?? 0) / stored.pointsTotal;
    return { ...base, band: bandFor(share), leaderText: textOf(winner), share };
  }

  // Counter kinds: the recorded outcome when present, else the
  // derived reading from the poll doc's own counters.
  const tallies: Record<string, number> = stored
    ? stored.tallies
    : Object.fromEntries(Object.entries(poll.options || {}).map(([id, o]) => [id, o?.votes || 0]));
  const total = stored?.totalVotes ?? Object.values(tallies).reduce((s, v) => s + v, 0);
  base.totalVotes = total;
  const abstain = tallies[ABSTAIN_OPTION_ID] || 0;
  const candidateVotes = total - abstain;
  const candidateIds = Object.keys(tallies).filter((id) => id !== ABSTAIN_OPTION_ID);
  if (candidateVotes <= 0 || candidateIds.length === 0) return base;
  const top = Math.max(...candidateIds.map((id) => tallies[id] || 0));
  const leaders = candidateIds.filter((id) => (tallies[id] || 0) === top);
  if (top <= 0) return base;
  if (leaders.length > 1) return { ...base, band: 'tied' };
  const share = top / candidateVotes;
  return { ...base, band: bandFor(share), leaderText: textOf(leaders[0]), share };
}

/** The whole view: rows newest-first + the band census. */
export function summariseAgreement(
  polls: readonly AgreementPoll[],
  now: number
): { rows: AgreementRow[]; census: Record<AgreementBand, number> } {
  const rows = polls
    .map((p) => pollAgreementRow(p, now))
    .filter((r): r is AgreementRow => r !== null)
    .sort((a, b) => b.concludedAt - a.concludedAt);
  const census: Record<AgreementBand, number> = {
    united: 0,
    leaning: 0,
    divided: 0,
    tied: 0,
    unmeasured: 0,
  };
  for (const r of rows) census[r.band] += 1;
  return { rows, census };
}
