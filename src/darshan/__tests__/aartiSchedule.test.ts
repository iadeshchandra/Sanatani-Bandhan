/**
 * aartiSchedule.test.ts — pure schedule math + reminder subscription logic.
 */
import {
  parseScheduleTime,
  validateAartiSlot,
  nextOccurrence,
  nextAarti,
  dueWithin,
  friendlyCountdown,
  localDateKey,
  type AartiSlot,
} from '../aartiSchedule';
import {
  listSubscriptions,
  toggleSubscription,
  isSubscribed,
  occurrenceKey,
  subKey,
  type AartiSubscription,
} from '../aartiReminders';

const daily = (time: string, name = 'Morning Aarti'): AartiSlot => ({ name, time });

describe('parseScheduleTime', () => {
  it('parses HH:MM into minutes', () => {
    expect(parseScheduleTime('06:00')).toBe(360);
    expect(parseScheduleTime('18:30')).toBe(1110);
    expect(parseScheduleTime('0:05')).toBe(5);
  });
  it('rejects invalid times', () => {
    expect(parseScheduleTime('25:00')).toBeNull();
    expect(parseScheduleTime('6pm')).toBeNull();
    expect(parseScheduleTime('')).toBeNull();
    expect(parseScheduleTime(undefined)).toBeNull();
    expect(parseScheduleTime('06:60')).toBeNull();
  });
});

describe('validateAartiSlot', () => {
  it('accepts a daily slot and a weekday slot', () => {
    expect(validateAartiSlot(daily('06:00'))).toBeNull();
    expect(validateAartiSlot({ name: 'Sunday Aarti', time: '07:00', days: [0] })).toBeNull();
  });
  it('rejects missing name / bad time / bad days', () => {
    expect(validateAartiSlot({ name: ' ', time: '06:00' })).toBe('name-required');
    expect(validateAartiSlot({ name: 'X', time: '6pm' })).toBe('time-invalid');
    expect(validateAartiSlot({ name: 'X', time: '06:00', days: [7] })).toBe('days-invalid');
    expect(validateAartiSlot(null)).toBe('empty');
  });
});

describe('nextOccurrence', () => {
  const now = new Date(2026, 9, 19, 5, 0, 0); // Monday 05:00 local
  it('finds today when the aarti is later today', () => {
    const at = nextOccurrence(daily('06:00'), now);
    expect(at).not.toBeNull();
    expect(at!.getHours()).toBe(6);
    expect(at!.getDate()).toBe(19);
  });
  it('rolls to tomorrow when the aarti already passed', () => {
    const at = nextOccurrence(daily('04:30'), now);
    expect(at!.getDate()).toBe(20);
  });
  it('skips days the slot does not run (weekly slot)', () => {
    // Monday now; slot runs Sundays only → next is 6 days ahead (Oct 25)
    const sunday: AartiSlot = { name: 'Sunday Aarti', time: '07:00', days: [0] };
    const at = nextOccurrence(sunday, now);
    expect(at!.getDay()).toBe(0);
    expect(at!.getDate()).toBe(25);
  });
  it('returns null for an invalid time', () => {
    expect(nextOccurrence({ name: 'X', time: 'bad' }, now)).toBeNull();
  });
});

describe('nextAarti + dueWithin', () => {
  const now = new Date(2026, 9, 19, 17, 45, 0); // 17:45
  const slots: AartiSlot[] = [
    { name: 'Sandhya Aarti', time: '18:00' }, // in 15 min
    { name: 'Night Aarti', time: '21:00' },
    { name: 'Morning Aarti', time: '06:00' },
  ];
  it('picks the soonest upcoming aarti', () => {
    const next = nextAarti(slots, now);
    expect(next!.slot.name).toBe('Sandhya Aarti');
  });
  it('dueWithin returns only aartis inside the lead window', () => {
    const due = dueWithin(slots, 15, now);
    expect(due).toHaveLength(1);
    expect(due[0].slot.name).toBe('Sandhya Aarti');
    expect(due[0].startsInMin).toBe(15);
  });
  it('dueWithin is empty when nothing is near', () => {
    expect(dueWithin(slots, 15, new Date(2026, 9, 19, 12, 0, 0))).toHaveLength(0);
  });
  it('dueWithin ignores already-started aartis', () => {
    const due = dueWithin(slots, 30, new Date(2026, 9, 19, 18, 5, 0));
    expect(due.map((d) => d.slot.name)).not.toContain('Sandhya Aarti');
  });
});

describe('friendlyCountdown + localDateKey', () => {
  it('formats minutes, hours, and tomorrow', () => {
    const now = new Date(2026, 9, 19, 17, 45, 0);
    expect(friendlyCountdown(new Date(2026, 9, 19, 18, 0, 0), now)).toBe('in 15m');
    expect(friendlyCountdown(new Date(2026, 9, 19, 20, 45, 0), now)).toBe('in 3h');
    expect(friendlyCountdown(new Date(2026, 9, 20, 6, 0, 0), now)).toContain('tomorrow');
  });
  it('localDateKey is YYYY-MM-DD in local time', () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });
});

describe('reminder subscriptions (localStorage)', () => {
  // jest testEnvironment is 'node' — stub localStorage in-memory.
  beforeAll(() => {
    const map = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      clear: () => map.clear(),
    };
  });

  const sub: AartiSubscription = {
    orgId: 'org-kashi',
    orgName: 'Kashi Vishwanath',
    name: 'Mangala Aarti',
    time: '04:00',
  };
  beforeEach(() => localStorage.clear());

  it('toggle subscribes then unsubscribes', () => {
    expect(isSubscribed(sub)).toBe(false);
    expect(toggleSubscription(sub)).toBe(true);
    expect(isSubscribed(sub)).toBe(true);
    expect(listSubscriptions()).toHaveLength(1);
    expect(toggleSubscription(sub)).toBe(false);
    expect(listSubscriptions()).toHaveLength(0);
  });
  it('subscriptions for different orgs coexist', () => {
    toggleSubscription(sub);
    toggleSubscription({ ...sub, orgId: 'org-other', name: 'Evening Aarti', time: '19:00' });
    expect(listSubscriptions()).toHaveLength(2);
  });
  it('occurrenceKey is date-scoped (one bell per occurrence)', () => {
    const k1 = occurrenceKey(sub, new Date(2026, 9, 19, 4, 0));
    const k2 = occurrenceKey(sub, new Date(2026, 9, 20, 4, 0));
    expect(k1).not.toBe(k2);
    expect(subKey(sub)).toContain('org-kashi');
  });
  it('corrupt storage fails open (empty list, toggle still works)', () => {
    localStorage.setItem('sb.aartiReminders.v1', '{broken json');
    expect(listSubscriptions()).toEqual([]);
    expect(toggleSubscription(sub)).toBe(true);
    expect(listSubscriptions()).toHaveLength(1);
  });
});
