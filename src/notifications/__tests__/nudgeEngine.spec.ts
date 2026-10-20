/**
 * nudgeEngine.spec.ts — suggestions only, quiet-hours-aware, never nag twice.
 */
import {
  dismissNudge,
  generateNudges,
  NudgeStore,
  type NudgeSignals,
  type StorageLike,
} from '../nudgeEngine';

/** Deterministic in-memory storage (localStorage is unavailable in jest node env). */
function memStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const QUIET: { start: string; end: string } = { start: '22:00', end: '06:00' };
const DAYTIME = new Date(2026, 9, 17, 10, 0, 0); // 10:00 — outside quiet hours
const NIGHT = new Date(2026, 9, 17, 23, 30, 0); // 23:30 — inside quiet hours

const EMPTY: NudgeSignals = {
  moneyRequests: [],
  digestUnopenedHours: null,
  digestPendingCount: 0,
  unreadAnnouncements: [],
};

describe('nudgeEngine — money reminders', () => {
  test('fires when a request is 3 days old', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 3, settled: false }] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(1);
    expect(nudges[0].kind).toBe('money_reminder');
    expect(nudges[0].priority).toBe('gentle');
    expect(nudges[0].dismissable).toBe(true);
    expect(nudges[0].body.en).toContain('Rahim');
    expect(nudges[0].body.en).toContain('3 days old');
    expect(nudges[0].action.deepLink).toBe('/app/home/wallet');
    // Trilingual: every nudge carries all three languages.
    expect(nudges[0].title.bn).toBeTruthy();
    expect(nudges[0].title.hi).toBeTruthy();
    expect(nudges[0].body.bn).toBeTruthy();
    expect(nudges[0].body.hi).toBeTruthy();
  });

  test('does not fire before 3 days', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 2, settled: false }] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
  });

  test('fires exactly once per request — never nags twice', () => {
    const store = new NudgeStore(memStorage());
    const signals: NudgeSignals = {
      ...EMPTY,
      moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 5, settled: false }],
    };
    expect(generateNudges(signals, { now: DAYTIME, quietHours: QUIET, store })).toHaveLength(1);
    expect(generateNudges(signals, { now: DAYTIME, quietHours: QUIET, store })).toHaveLength(0);
  });

  test('settled requests never fire', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 30, settled: true }] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
  });

  test('dismissing a nudge prevents it from ever returning', () => {
    const store = new NudgeStore(memStorage());
    const signals: NudgeSignals = {
      ...EMPTY,
      moneyRequests: [{ id: 'REQ-9', name: 'Sita', ageDays: 4, settled: false }],
    };
    const first = generateNudges(signals, { now: DAYTIME, quietHours: QUIET, store });
    expect(first).toHaveLength(1);
    dismissNudge(first[0].id, store);
    // Even a fresh store check would show it — the dismissal is persisted.
    const store2 = new NudgeStore(memStorage());
    dismissNudge(first[0].id, store2);
    expect(generateNudges(signals, { now: DAYTIME, quietHours: QUIET, store: store2 })).toHaveLength(0);
  });
});

describe('nudgeEngine — quiet hours', () => {
  test('nudges wait during quiet hours — they never interrupt', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 9, settled: false }] },
      { now: NIGHT, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
    // …and they fire again once quiet hours pass (not lost, just waiting).
    const later = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 9, settled: false }] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(later).toHaveLength(1);
  });
});

describe('nudgeEngine — digest waiting', () => {
  test('fires when the digest is unopened for 24h with items waiting', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, digestUnopenedHours: 30, digestPendingCount: 3 },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(1);
    expect(nudges[0].kind).toBe('digest_waiting');
    expect(nudges[0].title.en).toContain('3');
    expect(nudges[0].action.deepLink).toBe('/app/suchana');
  });

  test('does not re-fire within 24h of the last digest nudge', () => {
    const store = new NudgeStore(memStorage());
    const signals: NudgeSignals = { ...EMPTY, digestUnopenedHours: 30, digestPendingCount: 3 };
    expect(generateNudges(signals, { now: DAYTIME, quietHours: QUIET, store })).toHaveLength(1);
    const twoHoursLater = new Date(DAYTIME.getTime() + 2 * 60 * 60 * 1000);
    expect(generateNudges(signals, { now: twoHoursLater, quietHours: QUIET, store })).toHaveLength(0);
  });

  test('does not fire when the digest has nothing waiting', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, digestUnopenedHours: 72, digestPendingCount: 0 },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
  });
});

describe('nudgeEngine — unread announcements', () => {
  test('fires at 48h for members, with the org name', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      {
        ...EMPTY,
        unreadAnnouncements: [{ id: 'ANN-1', orgName: 'Dhakeshwari Mandir', ageHours: 50, isMember: true }],
      },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(1);
    expect(nudges[0].kind).toBe('announcement_unread');
    expect(nudges[0].body.en).toContain('Dhakeshwari Mandir');
  });

  test('never fires for non-members', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      {
        ...EMPTY,
        unreadAnnouncements: [{ id: 'ANN-1', orgName: 'Dhakeshwari Mandir', ageHours: 96, isMember: false }],
      },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
  });
});

describe('nudgeEngine — storage resilience', () => {
  test('works without any storage backend (never crashes, just no persistence)', () => {
    const store = new NudgeStore(null);
    const nudges = generateNudges(
      { ...EMPTY, moneyRequests: [{ id: 'REQ-1', name: 'Rahim', ageDays: 3, settled: false }] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(1);
  });
});

describe('nudgeEngine — tithi-timed giving reminders (Phase 3 devotional layer)', () => {
  // The signal id is rooted in the observance DATE (like the real
  // collectUpcomingTithiSignals: `ekadashi-2026-11-04`), so the same
  // observance keeps one id as daysUntil counts down.
  const tithi = (t: 'Ekadashi' | 'Purnima' | 'Amavasya', daysUntil: number, dateIso = '2026-10-21') => ({
    id: `${t.toLowerCase()}-${dateIso}`,
    tithi: t,
    daysUntil,
    dateIso,
  });

  test('fires gently for Ekadashi 3 days out, trilingual and dismissible', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 3)] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(1);
    expect(nudges[0].kind).toBe('upcoming_tithi');
    expect(nudges[0].priority).toBe('gentle');
    expect(nudges[0].dismissable).toBe(true);
    expect(nudges[0].body.en).toContain('Ekadashi is in 3 days');
    expect(nudges[0].body.en).toContain('anna-dana');
    expect(nudges[0].body.bn).toBeTruthy();
    expect(nudges[0].body.hi).toBeTruthy();
    expect(nudges[0].action.deepLink).toBe('/app/home/sadhana');
  });

  test('stays silent outside the window and on the day itself', () => {
    const store = new NudgeStore(memStorage());
    expect(
      generateNudges(
        { ...EMPTY, upcomingTithis: [tithi('Purnima', 0)] },
        { now: DAYTIME, quietHours: QUIET, store },
      ),
    ).toHaveLength(0);
    expect(
      generateNudges(
        { ...EMPTY, upcomingTithis: [tithi('Amavasya', 8)] },
        { now: DAYTIME, quietHours: QUIET, store },
      ),
    ).toHaveLength(0);
  });

  test('waits through quiet hours like every other nudge', () => {
    const store = new NudgeStore(memStorage());
    const nudges = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 2)] },
      { now: NIGHT, quietHours: QUIET, store },
    );
    expect(nudges).toHaveLength(0);
  });

  test('fires once per lead-time bucket — the SAME bucket never repeats, even across runs (QUEUED #43)', () => {
    const storage = memStorage();
    const first = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 5)] },
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(first).toHaveLength(1);
    // The nudge id carries the bucket, so the center dedupeKey (and the
    // read-time collapse keyed on it) is per-bucket too.
    expect(first[0].id).toBe('nudge-tithi-ekadashi-2026-10-21-d5');

    // Same bucket again — a fresh store over the same storage, the
    // relaunch case from the audit: the ledger must hold, no repeat.
    const repeat = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 5)] },
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(repeat).toHaveLength(0);

    // A different bucket is a different notice ("in 4 days" ≠ "in 5
    // days" — the copy itself differs), so it may fire — once.
    const nextBucket = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 4)] },
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(nextBucket).toHaveLength(1);
    expect(nextBucket[0].body.en).toContain('Ekadashi is in 4 days');
    const repeatBucket = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Ekadashi', 4)] },
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(repeatBucket).toHaveLength(0);

    // A genuinely different observance (different id) still fires.
    const other = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Purnima', 6, '2026-10-22')] },
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(other).toHaveLength(1);
  });

  test('dismissal is permanent for that observance', () => {
    const storage = memStorage();
    const store = new NudgeStore(storage);
    const [nudge] = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Purnima', 6)] },
      { now: DAYTIME, quietHours: QUIET, store },
    );
    expect(nudge).toBeTruthy();
    dismissNudge(nudge.id, store);
    const again = generateNudges(
      { ...EMPTY, upcomingTithis: [tithi('Purnima', 5)] }, // same id — same observance, one day closer
      { now: DAYTIME, quietHours: QUIET, store: new NudgeStore(storage) },
    );
    expect(again).toHaveLength(0);
  });
});
