/**
 * ai/godmode/growthTools.ts — admin_growth answer composition (PURE).
 * =====================================================================
 * QUEUED #37 (+ owner addendum 2026-10-20: the Copilot is a GROWTH
 * expert, not only a marketer). Turns a GrowthSnapshot (live counts
 * read by the executor in copilotTasks.ts) into the counsel:
 *
 *   📈 Where we stand       — only figures that were actually read
 *   🔭 What the numbers     — AGGREGATE behaviour synthesis: funnel
 *      suggest                 shape, segment shape, rhythm. A reading
 *                             is arithmetic on claimed figures; where
 *                             an interpretation goes beyond the data
 *                             it is labelled "Hypothesis" and names the
 *                             observation that would confirm it.
 *   🎯 The opportunity      — the strongest real signal
 *   🪔 Plays                — across three lenses (Product / Marketing
 *                             / Profit), each: observation → play →
 *                             mechanism → the measure that would prove
 *                             it worked. NO invented projections, no
 *                             CTR/conversion benchmarks dressed as data.
 *   🏆 Where we win         — only when the question is market-shaped:
 *                             positioning vs the real competitive frame
 *                             (general knowledge, labelled as such).
 *   🚫 What NOT to do       — the brief's anti-patterns, always present
 *
 * Accuracy (#36 laws apply in full): the composer returns the figure
 * claims for exactly the numbers it rendered — a null field renders
 * nothing and claims nothing, and the gaps are named in the text
 * ("couldn't read: …") instead of being papered over.
 *
 * Behaviour HARD LINES: aggregates only. No per-user profiling, ever —
 * personal wallets, sadhana, chats are never inputs (the executor
 * reads counts, never documents' contents).
 */

import type { FigureClaim, LangCode } from '../types';
import { MARKET_FRAME } from './marketingBrief';

function lc(lang: LangCode): 'en' | 'hi' | 'bn' {
  return lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
}

/* ------------------------------------------------------------------ */
/* Snapshot — every field nullable; null = the read failed             */
/* ------------------------------------------------------------------ */

export interface GrowthFestival {
  name: string;
  daysUntil: number;
}

export interface GrowthSnapshot {
  signups7d: number | null;
  signupsPrior7d: number | null;
  activeUsers7d: number | null;
  usersTotal: number | null;
  providersTotal: number | null;
  bookings7d: number | null;
  bookingsPrior7d: number | null;
  /** Booking funnel shape, last 30 days (status census of orders). */
  orders30dTotal: number | null;
  orders30dCompleted: number | null;
  orders30dPendingPayment: number | null;
  orders30dCancelled: number | null;
  orders30dDisputed: number | null;
  orgsTotal: number | null;
  orgsNew30d: number | null;
  templesMapped: number | null;
  subsActive: number | null;
  subsProActive: number | null;
  referralClaims7d: number | null;
  referralClaims30d: number | null;
  nextFestival: GrowthFestival | null;
}

/** The core funnel corners — if ALL are dark, counsel abstains. */
export function growthCoreReadable(s: GrowthSnapshot): boolean {
  return s.signups7d !== null || s.bookings7d !== null || s.orgsTotal !== null;
}

/* ------------------------------------------------------------------ */
/* Plays — every play carries its observation and its measure          */
/* ------------------------------------------------------------------ */

export type PlayLens = 'Product' | 'Marketing' | 'Profit';

interface GrowthPlay {
  lens: PlayLens;
  name: string;
  observation: string;
  action: string;
  channel: string;
  mechanism: string;
  measure: string;
}

/** The classic payment-friction shape: a quarter or more of the last
 *  30 days' bookings never crossed payment (and there are enough of
 *  them to matter). Arithmetic on real counts, nothing more. */
export function pendingShareIsHeavy(s: GrowthSnapshot): boolean {
  return (
    s.orders30dTotal !== null &&
    s.orders30dPendingPayment !== null &&
    s.orders30dTotal > 0 &&
    s.orders30dPendingPayment >= 5 &&
    s.orders30dPendingPayment * 4 >= s.orders30dTotal
  );
}

function selectPlays(s: GrowthSnapshot): GrowthPlay[] {
  const candidates: GrowthPlay[] = [];
  const add = (p: GrowthPlay) => candidates.push(p);

  /* — Marketing: the festival beat — */
  if (s.nextFestival && s.nextFestival.daysUntil <= 45) {
    add({
      lens: 'Marketing',
      name: `Festival readiness — ${s.nextFestival.name}`,
      observation:
        `${s.nextFestival.name} falls in ${s.nextFestival.daysUntil} days — the nearest ` +
        'high-intent window on the panjika.',
      action:
        `Have every org publish its ${s.nextFestival.name} schedule — aarti times, special ` +
        'sevas, booking slots — a fortnight ahead, and surface the festival on Home.',
      channel: 'Org pages + Suchana + a festival card a family can forward on WhatsApp.',
      mechanism:
        'Festival weeks are when Sanatani families plan, book and gather. The festival ' +
        'does the reaching; we only need to be ready before it.',
      measure:
        'Bookings in the festival week against the week before — ask me for the count ' +
        'after the festival and I will read it.',
    });
  }

  /* — Product: the funnel's payment step, only when the shape shows it — */
  if (pendingShareIsHeavy(s)) {
    add({
      lens: 'Product',
      name: 'Unblock the payment step',
      observation:
        `${s.orders30dPendingPayment} of the last 30 days' ${s.orders30dTotal} bookings ` +
        'still wait at payment — the funnel\'s narrowest point is between booking and dakshina.',
      action:
        'Simplify the payment step to the fewest honest taps, and let a booking that ' +
        'waits on payment be gently resumable from Suchana — a reminder, never pressure.',
      channel: 'The booking flow itself + one Suchana nudge for the booker\'s own booking.',
      mechanism:
        'These devotees already decided — intent is proven; only friction remains. ' +
        'Removing friction converts existing intent without buying anyone\'s attention.',
      measure:
        'The pending-payment count over the next 30 days, against this month\'s — ' +
        'it should fall as a share of bookings.',
    });
  }

  /* — Marketing: the share loop, alive (feed) or quiet (light) — */
  if (s.referralClaims30d !== null && s.referralClaims30d > 0) {
    add({
      lens: 'Marketing',
      name: 'Feed the Kritagyata loop',
      observation:
        `${s.referralClaims30d} bookings came through shared links in the last 30 days — ` +
        'gratitude is already converting into growth.',
      action:
        'Right after a completed seva, invite the devotee\'s Kritagyata and make the ' +
        'share one tap — that is the moment gratitude is highest.',
      channel: 'The in-app completion moment; the share travels on WhatsApp family groups.',
      mechanism:
        'The share carries the referral and the sharer is thanked, so the loop rewards ' +
        'itself without spending a taka on reach.',
      measure: 'Shared-link bookings over the next 30 days, against these 30.',
    });
  } else if (s.referralClaims30d !== null) {
    add({
      lens: 'Marketing',
      name: 'Light the share loop',
      observation:
        'No bookings came through shared links in the last 30 days — the loop is built ' +
        'but quiet.',
      action:
        'Put the Kritagyata-and-share moment at the end of every completed seva, ' +
        'warmly, once — and never as a gate on anything.',
      channel: 'The in-app completion moment; the share travels on WhatsApp family groups.',
      mechanism:
        'A completed seva is the one moment a devotee genuinely wants to tell family. ' +
        'The attribution machinery already exists — it only needs the moment to be offered.',
      measure: 'The first shared-link bookings appearing — then their 30-day count.',
    });
  }

  /* — Profit: the bypass-proof floor, deepened by value — */
  if (s.subsActive !== null && s.subsProActive !== null) {
    add({
      lens: 'Profit',
      name: 'Deepen the Pro floor',
      observation:
        `${s.subsProActive} of ${s.subsActive} active subscriptions are Pro — the ` +
        'subscription floor that cannot be bypassed (the Pathao lesson).',
      action:
        'Make Pro visibly worth it — verified badge, ranking, dispute protection — and ' +
        'invite providers at their gratitude moment, right after a completed seva with ' +
        'warm Kritagyata. Never a price cut, never pressure.',
      channel: 'The provider\'s own completion moment + the Pro page.',
      mechanism:
        'Profit through value: a Pro that earns its keep renews itself; commission stays ' +
        'upside, the floor stays honest. (Your profit-through-value law.)',
      measure: 'Active Pro subscriptions in 30 days, against today\'s count.',
    });
  }

  /* — Marketing: org-led growth — */
  add({
    lens: 'Marketing',
    name: 'One temple brings its devotees',
    observation:
      s.orgsNew30d !== null && s.orgsNew30d > 0
        ? `${s.orgsNew30d} organisations joined in the last 30 days — orgs are arriving, ` +
          'and each carries its devotees.'
        : 'Organisations remain the highest-trust door we have — each register is a ' +
          'pre-built audience that already trusts the sender.',
    action:
      'Onboard organisations through Bahi-Khata: their paper register becomes the app, ' +
      'trustee-approved, page by page — and their devotees follow their own temple in.',
    channel: 'Trustee to trustee, in person. No ads.',
    mechanism:
      'An org\'s digitised register is also a switching cost no competitor\'s ad budget ' +
      'can buy its way past.',
    measure: 'Organisations joined in the next 30 days, and their devotees\' signups with them.',
  });

  /* — Product: retention is rhythm — */
  add({
    lens: 'Product',
    name: 'Retention is rhythm',
    observation:
      s.activeUsers7d !== null && s.signups7d !== null && s.activeUsers7d > s.signups7d
        ? `${s.activeUsers7d} seekers were active this week against ${s.signups7d} new ` +
          'arrivals — returning rhythm already outweighs the front door.'
        : 'Retention is the cheapest growth there is — a family kept is worth more than ' +
          'a family re-won.',
    action:
      'Keep Suchana strictly useful — aarti reminders, samskara dates, shraddha ' +
      'remembrance — and resist every urge to add noise.',
    channel: 'Suchana, and nothing louder.',
    mechanism:
      'A family reminded well never leaves; churn is usually silence, not anger. The ' +
      'companion that serves the whole life keeps the whole life.',
    measure: 'Active seekers next week against this week\'s — rhythm should hold or grow.',
  });

  /* Selection: priority order, cap 4 — then lens coverage. A full
   * counsel speaks Product, Marketing and Profit; if a lens is missing
   * from the picks but exists on the bench, swap it in for a pick
   * whose lens is duplicated (4 picks over 3 lenses always has one). */
  const picked: GrowthPlay[] = [];
  for (const c of candidates) {
    if (picked.length >= 4) break;
    picked.push(c);
  }
  for (const lens of ['Product', 'Marketing', 'Profit'] as PlayLens[]) {
    if (picked.some((p) => p.lens === lens)) continue;
    const spare = candidates.find((c) => c.lens === lens && !picked.includes(c));
    if (!spare) continue;
    let donor = picked.length - 1;
    for (let i = picked.length - 1; i >= 0; i--) {
      if (picked.filter((p) => p.lens === picked[i].lens).length > 1) {
        donor = i;
        break;
      }
    }
    picked[donor] = spare;
  }
  return picked;
}

/* ------------------------------------------------------------------ */
/* Behaviour synthesis — aggregate readings + labelled hypotheses      */
/* ------------------------------------------------------------------ */

function behaviourLines(s: GrowthSnapshot, claim: (id: string, label: string, v: number) => void): string[] {
  const out: string[] = [];

  /* Funnel shape (30 days). */
  if (s.orders30dTotal !== null) {
    claim('growth.orders30dTotal', 'Bookings in the last 30 days', s.orders30dTotal);
    const buckets: string[] = [];
    if (s.orders30dCompleted !== null) {
      claim('growth.orders30dCompleted', 'Bookings completed in the last 30 days', s.orders30dCompleted);
      buckets.push(`${s.orders30dCompleted} completed`);
    }
    if (s.orders30dPendingPayment !== null) {
      claim('growth.orders30dPendingPayment', 'Bookings still awaiting payment', s.orders30dPendingPayment);
      buckets.push(`${s.orders30dPendingPayment} still wait at payment`);
    }
    if (s.orders30dCancelled !== null) {
      claim('growth.orders30dCancelled', 'Bookings cancelled in the last 30 days', s.orders30dCancelled);
      buckets.push(`${s.orders30dCancelled} were cancelled`);
    }
    if (s.orders30dDisputed !== null && s.orders30dDisputed > 0) {
      claim('growth.orders30dDisputed', 'Bookings in dispute in the last 30 days', s.orders30dDisputed);
      buckets.push(`${s.orders30dDisputed} sit in dispute — each one a trust moment to close with care`);
    }
    out.push(
      buckets.length > 0
        ? `· Funnel (last 30 days): ${buckets.join(' · ')} — out of ${s.orders30dTotal} bookings.`
        : `· Funnel: ${s.orders30dTotal} bookings in the last 30 days (the status detail is dark to me right now).`
    );
    if (pendingShareIsHeavy(s)) {
      out.push(
        '· Hypothesis: the drop sits between booking and payment — a clumsy step or a ' +
          'moment of hesitation at dakshina. Would be proven by: the pending count ' +
          'falling after the payment step is simplified and resumable.'
      );
    }
  }

  /* Rhythm: returning seekers vs new arrivals. */
  if (s.activeUsers7d !== null && s.signups7d !== null) {
    if (s.activeUsers7d > s.signups7d) {
      out.push(
        `· Rhythm: ${s.activeUsers7d} seekers were active this week against ` +
          `${s.signups7d} new arrivals — more people returned than arrived. Retention ` +
          'is carrying growth; protect the rhythm features before buying reach.'
      );
    } else if (s.signups7d > 0) {
      out.push(
        `· Rhythm: new arrivals (${s.signups7d}) outnumber the week's active seekers ` +
          `(${s.activeUsers7d}) — the front door is currently stronger than the rhythm.`
      );
      out.push(
        '· Hypothesis: newcomers cool before their first reminder lands. Would be ' +
          'proven by: the active share rising in the weeks after a first-week ' +
          'aarti-reminder welcome.'
      );
    }
  }

  /* Segment shape. */
  const seg: string[] = [];
  if (s.usersTotal !== null) {
    claim('growth.usersTotal', 'Accounts on the platform', s.usersTotal);
    seg.push(`${s.usersTotal} accounts`);
  }
  if (s.orgsTotal !== null) seg.push(`${s.orgsTotal} organisations`);
  if (s.providersTotal !== null) {
    claim('growth.providersTotal', 'Professionals on the platform', s.providersTotal);
    seg.push(`${s.providersTotal} professionals`);
  }
  if (seg.length >= 2) {
    out.push(
      `· Segments: the platform's shape is ${seg.join(' · ')} — solo devotees are the ` +
        'sea, organisations are the harbours, professionals are the boats between them.'
    );
  }

  if (out.length === 0) {
    out.push(
      '· I could not read the behaviour aggregates (funnel, rhythm, segments) just ' +
        'now — so I will not invent a story about how users behave. Ask again in a ' +
        'moment and I will read them fresh.'
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export interface GrowthComposeOptions {
  /** The question is market/competition-shaped — add "Where we win". */
  marketFocus?: boolean;
}

export function composeGrowthWithClaims(
  s: GrowthSnapshot,
  lang: LangCode,
  opts: GrowthComposeOptions = {}
): { text: string; claims: FigureClaim[] } {
  const l = lc(lang);
  const head =
    l === 'hi'
      ? '📈 मेरी वृद्धि सलाह'
      : l === 'bn'
        ? '📈 আমার বৃদ্ধির পরামর্শ'
        : '📈 My growth counsel';
  const claims: FigureClaim[] = [];
  const claim = (id: string, label: string, value: number) => {
    claims.push({ id, label, value, rendered: `${value}` });
  };

  /* — Where we stand: only what was read — */
  const stand: string[] = [];
  if (s.signups7d !== null) {
    claim('growth.signups7d', 'New signups this week', s.signups7d);
    let line = `· ${s.signups7d} new signups this week`;
    if (s.signupsPrior7d !== null) {
      claim('growth.signupsPrior7d', 'New signups the week before', s.signupsPrior7d);
      line += ` (${s.signupsPrior7d} the week before)`;
    }
    stand.push(line);
  }
  if (s.activeUsers7d !== null) {
    claim('growth.activeUsers7d', 'Active seekers this week', s.activeUsers7d);
    stand.push(`· ${s.activeUsers7d} active seekers this week`);
  }
  if (s.bookings7d !== null) {
    claim('growth.bookings7d', 'Bookings this week', s.bookings7d);
    let line = `· ${s.bookings7d} bookings this week`;
    if (s.bookingsPrior7d !== null) {
      claim('growth.bookingsPrior7d', 'Bookings the week before', s.bookingsPrior7d);
      line += ` (${s.bookingsPrior7d} the week before)`;
    }
    stand.push(line);
  }
  if (s.orgsTotal !== null) {
    claim('growth.orgsTotal', 'Organisations on the platform', s.orgsTotal);
    let line = `· ${s.orgsTotal} organisations on the platform`;
    if (s.orgsNew30d !== null) {
      claim('growth.orgsNew30d', 'Organisations joined in the last 30 days', s.orgsNew30d);
      line += ` — ${s.orgsNew30d} joined in the last 30 days`;
    }
    stand.push(line);
  }
  if (s.templesMapped !== null) {
    claim('growth.templesMapped', 'Temples mapped', s.templesMapped);
    stand.push(`· ${s.templesMapped} temples mapped`);
  }
  if (s.subsActive !== null) {
    claim('growth.subsActive', 'Active subscriptions', s.subsActive);
    let line = `· ${s.subsActive} active subscriptions`;
    if (s.subsProActive !== null) {
      claim('growth.subsProActive', 'Active Pro subscriptions', s.subsProActive);
      line += ` — ${s.subsProActive} of them Pro (the bypass-proof floor)`;
    }
    stand.push(line);
  }
  if (s.referralClaims30d !== null) {
    claim('growth.referralClaims30d', 'Bookings via shared links, last 30 days', s.referralClaims30d);
    let line = `· ${s.referralClaims30d} bookings came through shared links in the last 30 days`;
    if (s.referralClaims7d !== null) {
      claim('growth.referralClaims7d', 'Bookings via shared links this week', s.referralClaims7d);
      line += ` (${s.referralClaims7d} this week)`;
    }
    stand.push(line);
  }

  const unreadable: string[] = [];
  if (s.signups7d === null) unreadable.push('signups');
  if (s.bookings7d === null) unreadable.push('bookings');
  if (s.orgsTotal === null) unreadable.push('organisations');
  if (s.subsActive === null) unreadable.push('subscriptions');
  if (s.referralClaims30d === null) unreadable.push('referral claims');
  if (s.orders30dTotal === null) unreadable.push('the booking funnel');
  if (s.usersTotal === null) unreadable.push('total accounts');

  /* — Behaviour synthesis (claims its own figures) — */
  const behaviour = behaviourLines(s, claim);

  /* — The opportunity: the strongest real signal — */
  let opportunity: string;
  if (s.nextFestival && s.nextFestival.daysUntil <= 45) {
    claim('growth.nextFestival.daysUntil', `Days until ${s.nextFestival.name}`, s.nextFestival.daysUntil);
    opportunity =
      `${s.nextFestival.name} is in ${s.nextFestival.daysUntil} days. Festival weeks are when ` +
      'families plan, book and gather — the highest-intent window of the season. The winning ' +
      'move is readiness, prepared a fortnight ahead — not noise during the festival itself.';
  } else if (pendingShareIsHeavy(s)) {
    opportunity =
      'The funnel itself is the opportunity: bookings already decided are waiting at ' +
      'payment. Unblocking one honest step is worth more than any campaign — it ' +
      'converts intent that already exists.';
  } else if (s.referralClaims30d !== null && s.referralClaims30d > 0) {
    opportunity =
      'The share loop is alive — bookings are arriving through shared links, which means ' +
      'gratitude is already converting into growth. Feeding that loop is worth more than ' +
      'any reach we could buy.';
  } else if (s.orgsNew30d !== null && s.orgsNew30d > 0) {
    opportunity =
      'Organisations are joining — and every org carries its devotees with it. Org-led ' +
      'growth is compounding quietly; making each new org\'s first week effortless is ' +
      'the highest-leverage work available right now.';
  } else {
    opportunity =
      'No festival spike or viral surge to ride this week — so the opportunity is rhythm ' +
      'and readiness: retention now, and the next festival prepared early. Quiet weeks ' +
      'are when festival weeks are won.';
  }

  const plays = selectPlays(s);
  const playLines = plays.map(
    (p, i) =>
      `${i + 1}) [${p.lens}] ${p.name}\n` +
      `   Observation: ${p.observation}\n` +
      `   Play: ${p.action}\n` +
      `   Channel: ${p.channel}\n` +
      `   Why it works: ${p.mechanism}\n` +
      `   Measure: ${p.measure}`
  );

  const lines = [
    head,
    'Where we stand:',
    ...stand,
    ...(unreadable.length > 0
      ? [`I couldn't read: ${unreadable.join(', ')} — those corners are dark to me right now, so I won't guess at them.`]
      : []),
    'What the numbers suggest:',
    ...behaviour,
    `The opportunity: ${opportunity}`,
    'Plays:',
    ...playLines,
    ...(opts.marketFocus
      ? [
          'Where we win (the market frame — general knowledge, not our data):',
          `· ${MARKET_FRAME.positioning}`,
          ...MARKET_FRAME.rivals.map((r) => `· vs ${r.name}: ${r.reality} ${r.ourAnswer}`),
          '· The moat: ' + MARKET_FRAME.moat.join(' '),
        ]
      : []),
    'What NOT to do:',
    '· Never discount a puja or seva — dignity is the price strategy (your never-discount-the-sacred law).',
    '· Never force a user — no dark patterns, no fake urgency, no pressure at a sacred moment; profit comes through value (your profit-through-value law).',
    '· Never buy reviews, followers or installs — trust is the moat, and fake gratitude poisons Kritagyata itself.',
    '· Never blast — Suchana speaks to people who chose to listen; a muted guide guides no one.',
  ];
  return { text: lines.join('\n'), claims };
}
