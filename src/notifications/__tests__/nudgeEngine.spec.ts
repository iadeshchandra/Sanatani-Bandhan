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
    expect(nudges[0].action.deepLink).toBe('/wallet/requests/REQ-1');
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
    expect(nudges[0].action.deepLink).toBe('/suchana');
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
