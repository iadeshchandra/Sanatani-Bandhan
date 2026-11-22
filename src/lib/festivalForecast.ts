/**
 * festivalForecast.ts — NEXT-LEVEL A3: the committee plans with its
 * own history (pure logic).
 * =====================================================================
 * A rules-based estimate built ENTIRELY from the organisation's own
 * past festival registers: of the parties who booked, what share
 * actually came — overall, and in the segments the records honestly
 * support (paid pass vs free booking; how far ahead the party
 * booked). Those rates are then applied to the festival now being
 * planned, producing an expected turnout RANGE, a prasad quantity
 * to cook for, and a gate staffing hint.
 *
 * This is arithmetic over the committee's own records — a stated
 * method over real registers, labelled exactly that way at the
 * surface. It is not a guess, and it is never presented as more
 * than it is.
 *
 * HONESTY LAWS (the standing directive, applied figure by figure):
 *  - A past festival whose register carries bookings but NOT ONE
 *    arrival mark cannot witness a show-rate: whether nobody came
 *    or nobody marked is unknowable from the record, so the
 *    festival is counted as skipped (named in the basis), never
 *    read as a 0% turnout — the E4 null-turnout law, inherited.
 *  - A segment with too little data (fewer than MIN_SEGMENT_PARTIES
 *    parties) never drives the range: the overall rate stands in
 *    for it, and the basis records which segments were used and
 *    which stood aside.
 *  - The range is the spread of three stated lenses (overall rate;
 *    paid/free rates; lead-time rates) — low is the most cautious
 *    lens, high the most generous. Nothing narrower is claimed
 *    than the lenses support.
 *  - No usable history → no forecast (a blocker names why). A
 *    number is never fabricated to fill the card.
 *  - Only confirmed parties are bookings (the E4 register law):
 *    the surface filters waitlisted records out before building
 *    the facts this module receives.
 *
 * No Firestore, no React — unit-testable and offline-safe, like
 * lib/festivalDebrief.
 */

/* ------------------------------------------------------------------ */
/* Inputs — per-party facts, as the records carry them                 */
/* ------------------------------------------------------------------ */

export interface ForecastPartyInput {
  /** Heads in the party (the register's headcount, 1–20). */
  headcount: number;
  /** The gate / team marked this party arrived (checkedIn). */
  arrived: boolean;
  /** The booking record's creation stamp (ISO), when it carries one. */
  createdAt?: string;
  /**
   * The party holds a paid seva pass. The surface derives this
   * from the pass records (a live paid-wallet / pay-at-venue pass
   * linked to the party's register record); a complimentary pass
   * is not a paid pass.
   */
  paid: boolean;
}

export interface ForecastHistoryFestival {
  festivalId: string;
  /** The festival's first civil day (YYYY-MM-DD). */
  startDateISO: string;
  /** Confirmed parties only, as the register stands. */
  parties: readonly ForecastPartyInput[];
}

export interface ForecastTarget {
  /** The festival being planned — its first civil day. */
  startDateISO: string;
  /** Its confirmed bookings so far. */
  parties: readonly ForecastPartyInput[];
  /** Confirmed parties booked for the busiest single day. */
  busiestDayBookedParties: number;
}

/* ------------------------------------------------------------------ */
/* Constants — named, stated, tunable in one place                     */
/* ------------------------------------------------------------------ */

/** A segment needs at least this many history parties to speak. */
export const MIN_SEGMENT_PARTIES = 10;
/** The whole history needs at least this many parties to speak. */
export const MIN_HISTORY_PARTIES = 10;
/** Booked 7+ days ahead = early; 3–6 = mid; under 3 = late. */
export const LEAD_EARLY_MIN_DAYS = 7;
export const LEAD_MID_MIN_DAYS = 3;
/**
 * Gate staffing rule: one gate sevadar can greet and check in
 * about GATE_PARTIES_PER_VOLUNTEER parties across a day; never
 * fewer than GATE_MIN_VOLUNTEERS, so a gate is never single-handed.
 */
export const GATE_PARTIES_PER_VOLUNTEER = 40;
export const GATE_MIN_VOLUNTEERS = 2;

export type LeadBucket = 'early' | 'mid' | 'late';

/* ------------------------------------------------------------------ */
/* Lead time — civil days between the booking day and the first day    */
/* ------------------------------------------------------------------ */

const DAY_MS = 86400000;

/** Civil-day number of an ISO instant, on the reader's local day —
 *  the same convention the gate's day attribution uses. */
function civilDayNumberOfInstant(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

function civilDayNumberOfDate(dateISO: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO || '');
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

/**
 * Whole civil days from the booking day to the festival's first
 * day. A booking made on the day itself is 0; one made during the
 * festival (a desk sale) is also 0, never negative. Null when the
 * record carries no usable stamp — the party then takes the
 * overall rate in the lead-time lens.
 */
export function leadDaysFor(createdAt: string | undefined, festivalStartISO: string): number | null {
  if (!createdAt) return null;
  const booked = civilDayNumberOfInstant(createdAt);
  const start = civilDayNumberOfDate(festivalStartISO);
  if (booked === null || start === null) return null;
  return Math.max(0, start - booked);
}

export function leadBucketOf(leadDays: number | null): LeadBucket | null {
  if (leadDays === null || !Number.isFinite(leadDays)) return null;
  if (leadDays >= LEAD_EARLY_MIN_DAYS) return 'early';
  if (leadDays >= LEAD_MID_MIN_DAYS) return 'mid';
  return 'late';
}

/* ------------------------------------------------------------------ */
/* Rate cells — one per segment, each carrying its own sample size     */
/* ------------------------------------------------------------------ */

export interface ForecastRateCell {
  parties: number;
  arrivedParties: number;
  heads: number;
  arrivedHeads: number;
  /** arrivedParties ÷ parties (0..1); null when the cell is empty. */
  partyRate: number | null;
  /** arrivedHeads ÷ heads (0..1); null when the cell is empty. */
  headRate: number | null;
}

const emptyCell = (): ForecastRateCell => ({
  parties: 0,
  arrivedParties: 0,
  heads: 0,
  arrivedHeads: 0,
  partyRate: null,
  headRate: null,
});

function addToCell(cell: ForecastRateCell, p: ForecastPartyInput): void {
  const heads = Math.max(0, Math.floor(p.headcount || 0));
  cell.parties += 1;
  cell.heads += heads;
  if (p.arrived) {
    cell.arrivedParties += 1;
    cell.arrivedHeads += heads;
  }
}

function sealCell(cell: ForecastRateCell): ForecastRateCell {
  return {
    ...cell,
    partyRate: cell.parties > 0 ? cell.arrivedParties / cell.parties : null,
    headRate: cell.heads > 0 ? cell.arrivedHeads / cell.heads : null,
  };
}

/** A segment speaks only with at least MIN_SEGMENT_PARTIES behind it. */
export const segmentSpeaks = (cell: ForecastRateCell): boolean =>
  cell.parties >= MIN_SEGMENT_PARTIES;

/* ------------------------------------------------------------------ */
/* The basis — what the estimate rests on, stated for the surface      */
/* ------------------------------------------------------------------ */

export interface ForecastBasis {
  /** Concluded festivals whose registers carried gate marks. */
  festivalsUsed: number;
  /** Concluded festivals with bookings but no arrival mark at all. */
  festivalsSkippedNoGateData: number;
  partiesBooked: number;
  partiesArrived: number;
  headsBooked: number;
  headsArrived: number;
  /** Segments that met the sample threshold and shaped the range. */
  paidSegmentUsed: boolean;
  freeSegmentUsed: boolean;
  leadSegmentsUsed: LeadBucket[];
}

/* ------------------------------------------------------------------ */
/* The forecast                                                        */
/* ------------------------------------------------------------------ */

export interface FestivalForecast {
  overall: ForecastRateCell;
  paid: ForecastRateCell;
  free: ForecastRateCell;
  lead: Record<LeadBucket, ForecastRateCell>;
  basis: ForecastBasis;
  /**
   * Expected turnout for the target's current bookings. Null when
   * the target has no confirmed bookings yet — the rates above
   * still stand, and the surface says the estimate will sharpen
   * as bookings arrive.
   */
  expected: {
    partiesLow: number;
    partiesHigh: number;
    headsLow: number;
    headsHigh: number;
    headsMid: number;
  } | null;
  /**
   * Prasad: cook for the middle of the range, widened by a buffer
   * drawn from the range's own spread (bufferFactor = 1 +
   * spreadRatio ÷ 2, so a wide, uncertain range cooks for more),
   * rounded UP to the nearest 10 — a kitchen-sane number. The
   * reasoning inputs ride along so the surface can show its work.
   */
  prasad: {
    expectedHeadsMid: number;
    spreadRatio: number;
    bufferFactor: number;
    headsToCookFor: number;
  } | null;
  /** Gate staffing hint for the busiest day (the named rule above). */
  gate: {
    busiestDayBookedParties: number;
    /** Booked parties for that day × the overall party show-rate. */
    expectedParties: number;
    volunteers: number;
    partiesPerVolunteer: number;
  } | null;
}

export type ForecastBlocker =
  | 'no-history'
  | 'no-gate-data'
  | 'thin-history'
  | 'no-bookings';

export interface ForecastResult {
  forecast: FestivalForecast | null;
  /** Null exactly when a full forecast (with expectations) stands. */
  blocker: ForecastBlocker | null;
  /** The history as seen, whatever the outcome — for honest copy. */
  history: {
    festivalsSeen: number;
    festivalsUsed: number;
    festivalsSkippedNoGateData: number;
    partiesBooked: number;
  };
}

type Lens = 'overall' | 'paid' | 'lead';

interface TargetParty extends ForecastPartyInput {
  leadDays: number | null;
}

/**
 * Build the forecast. `history` = the workspace's concluded
 * festivals' registers (confirmed parties only); `target` = the
 * festival being planned and its bookings so far.
 */
export function buildForecast(
  history: readonly ForecastHistoryFestival[],
  target: ForecastTarget
): ForecastResult {
  /* ---- Which past festivals may witness a show-rate? ------------- */
  let festivalsSkippedNoGateData = 0;
  let partiesBookedSeen = 0;
  const usable: ForecastHistoryFestival[] = [];
  for (const f of history) {
    partiesBookedSeen += f.parties.length;
    if (f.parties.length === 0) continue;
    if (!f.parties.some((p) => p.arrived)) {
      // Bookings exist but no arrival was ever marked — the record
      // cannot say whether nobody came or nobody marked. Skipped,
      // never read as a 0% turnout.
      festivalsSkippedNoGateData += 1;
      continue;
    }
    usable.push(f);
  }
  const historyStats = {
    festivalsSeen: history.length,
    festivalsUsed: usable.length,
    festivalsSkippedNoGateData,
    partiesBooked: partiesBookedSeen,
  };
  if (usable.length === 0) {
    return {
      forecast: null,
      blocker: partiesBookedSeen > 0 ? 'no-gate-data' : 'no-history',
      history: historyStats,
    };
  }

  /* ---- Segment cells over the usable registers ------------------- */
  const overall = emptyCell();
  const paid = emptyCell();
  const free = emptyCell();
  const lead: Record<LeadBucket, ForecastRateCell> = {
    early: emptyCell(),
    mid: emptyCell(),
    late: emptyCell(),
  };
  for (const f of usable) {
    for (const p of f.parties) {
      addToCell(overall, p);
      addToCell(p.paid ? paid : free, p);
      const bucket = leadBucketOf(leadDaysFor(p.createdAt, f.startDateISO));
      if (bucket) addToCell(lead[bucket], p);
    }
  }
  const basis: ForecastBasis = {
    festivalsUsed: usable.length,
    festivalsSkippedNoGateData,
    partiesBooked: overall.parties,
    partiesArrived: overall.arrivedParties,
    headsBooked: overall.heads,
    headsArrived: overall.arrivedHeads,
    paidSegmentUsed: segmentSpeaks(paid),
    freeSegmentUsed: segmentSpeaks(free),
    leadSegmentsUsed: (Object.keys(lead) as LeadBucket[]).filter((b) => segmentSpeaks(lead[b])),
  };
  if (overall.parties < MIN_HISTORY_PARTIES) {
    return { forecast: null, blocker: 'thin-history', history: historyStats };
  }
  const cells = {
    overall: sealCell(overall),
    paid: sealCell(paid),
    free: sealCell(free),
    lead: {
      early: sealCell(lead.early),
      mid: sealCell(lead.mid),
      late: sealCell(lead.late),
    },
  };

  /* ---- Apply the lenses to the target's bookings ----------------- */
  const targetParties: TargetParty[] = target.parties.map((p) => ({
    ...p,
    leadDays: leadDaysFor(p.createdAt, target.startDateISO),
  }));

  const rateFor = (p: TargetParty, lens: Lens, kind: 'party' | 'head'): number => {
    const overallRate = (kind === 'party' ? cells.overall.partyRate : cells.overall.headRate) || 0;
    if (lens === 'overall') return overallRate;
    const cell =
      lens === 'paid'
        ? p.paid
          ? cells.paid
          : cells.free
        : (() => {
            const b = leadBucketOf(p.leadDays);
            return b ? cells.lead[b] : null;
          })();
    if (!cell || !segmentSpeaks(cell)) return overallRate;
    const r = kind === 'party' ? cell.partyRate : cell.headRate;
    return r === null ? overallRate : r;
  };
  const lensEstimate = (lens: Lens): { parties: number; heads: number } => {
    let parties = 0;
    let heads = 0;
    for (const p of targetParties) {
      parties += rateFor(p, lens, 'party');
      heads += Math.max(0, Math.floor(p.headcount || 0)) * rateFor(p, lens, 'head');
    }
    return { parties, heads };
  };

  let expected: FestivalForecast['expected'] = null;
  let prasad: FestivalForecast['prasad'] = null;
  let gate: FestivalForecast['gate'] = null;
  if (targetParties.length > 0) {
    const lenses: Lens[] = ['overall', 'paid', 'lead'];
    const estimates = lenses.map(lensEstimate);
    const headsLow = Math.round(Math.min(...estimates.map((e) => e.heads)));
    const headsHigh = Math.round(Math.max(...estimates.map((e) => e.heads)));
    const partiesLow = Math.round(Math.min(...estimates.map((e) => e.parties)));
    const partiesHigh = Math.round(Math.max(...estimates.map((e) => e.parties)));
    const headsMid = Math.round((headsLow + headsHigh) / 2);
    expected = { partiesLow, partiesHigh, headsLow, headsHigh, headsMid };

    const spreadRatio = headsMid > 0 ? (headsHigh - headsLow) / headsMid : 0;
    const bufferFactor = 1 + spreadRatio / 2;
    prasad = {
      expectedHeadsMid: headsMid,
      spreadRatio,
      bufferFactor,
      headsToCookFor: Math.ceil((headsMid * bufferFactor) / 10) * 10,
    };

    if (target.busiestDayBookedParties > 0) {
      const expectedParties = Math.round(
        target.busiestDayBookedParties * (cells.overall.partyRate || 0)
      );
      gate = {
        busiestDayBookedParties: target.busiestDayBookedParties,
        expectedParties,
        volunteers: Math.max(
          GATE_MIN_VOLUNTEERS,
          Math.ceil(expectedParties / GATE_PARTIES_PER_VOLUNTEER)
        ),
        partiesPerVolunteer: GATE_PARTIES_PER_VOLUNTEER,
      };
    }
  }

  return {
    forecast: { ...cells, basis, expected, prasad, gate },
    blocker: targetParties.length > 0 ? null : 'no-bookings',
    history: historyStats,
  };
}
