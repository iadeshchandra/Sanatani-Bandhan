import {
  ensureEventIds,
  parseEventStart,
  canShareToSangam,
  isShared,
  buildSangamEventInput,
  buildSangamEventUpdate,
  validateOrgEvent,
  type OrgEventItem,
} from '../eventBridge';

/**
 * eventBridge.test.ts — Queued Fix #1 (org events → Sangam bridge).
 * Pure logic: date parsing, share eligibility, dedupe bookkeeping,
 * and rules-compliance of the built Sangam event shapes.
 */

const ORG = { orgId: 'org-123', orgName: 'Dakshineswar Kali Mandir' };

const item = (over: Partial<OrgEventItem> = {}): OrgEventItem => ({
  id: 'ev-1',
  title: 'Janmashtami Mahotsav',
  date: '2026-08-26',
  time: '18:00',
  description: 'Midnight abhishek',
  ...over,
});

// --- parseEventStart ---

test('parses YYYY-MM-DD to epoch ms', () => {
  const at = parseEventStart('2026-08-26');
  expect(at).not.toBeNull();
  const d = new Date(at as number);
  expect(d.getFullYear()).toBe(2026);
  expect(d.getMonth()).toBe(7);
  expect(d.getDate()).toBe(26);
});

test('applies HH:MM time when given', () => {
  const at = parseEventStart('2026-08-26', '18:30') as number;
  const d = new Date(at);
  expect(d.getHours()).toBe(18);
  expect(d.getMinutes()).toBe(30);
});

test('defaults to morning when no time given', () => {
  const at = parseEventStart('2026-08-26') as number;
  expect(new Date(at).getHours()).toBe(9);
});

test('returns null for free-text dates', () => {
  expect(parseEventStart('Every Purnima')).toBeNull();
  expect(parseEventStart('')).toBeNull();
  expect(parseEventStart('next month')).toBeNull();
});

// --- canShareToSangam / isShared ---

test('shareable when titled with a concrete date', () => {
  expect(canShareToSangam(item())).toBe(true);
});

test('not shareable without a title', () => {
  expect(canShareToSangam(item({ title: '  ' }))).toBe(false);
});

test('not shareable with a free-text date', () => {
  expect(canShareToSangam(item({ date: 'Every Purnima' }))).toBe(false);
});

test('isShared reflects sangamEventId', () => {
  expect(isShared(item())).toBe(false);
  expect(isShared(item({ sangamEventId: 'se-1' }))).toBe(true);
});

// --- ensureEventIds ---

test('backfills ids on legacy items, preserves existing', () => {
  const out = ensureEventIds([
    { title: 'A', date: '2026-01-01' },
    { title: 'B', date: '2026-02-02', id: 'keep-me', sangamEventId: 'se-9' } as never,
  ]);
  expect(out[0].id).toBeTruthy();
  expect(out[1].id).toBe('keep-me');
  expect(out[1].sangamEventId).toBe('se-9');
});

// --- buildSangamEventInput ---

test('builds an official org event input', () => {
  const input = buildSangamEventInput(item(), ORG);
  expect(input).not.toBeNull();
  expect(input!.title).toBe('Janmashtami Mahotsav');
  expect(input!.kind).toBe('utsav');
  expect(input!.orgId).toBe('org-123');
  expect(input!.orgName).toBe('Dakshineswar Kali Mandir');
  expect(input!.isOfficial).toBe(true);
  expect(typeof input!.startsAt).toBe('number');
  expect(input!.description).toContain('Dakshineswar Kali Mandir');
});

test('returns null when the event cannot be shared', () => {
  expect(buildSangamEventInput(item({ date: 'Every Purnima' }), ORG)).toBeNull();
  expect(buildSangamEventInput(item({ title: '' }), ORG)).toBeNull();
});

test('input matches the sangamEvents create whitelist exactly', () => {
  const input = buildSangamEventInput(item(), ORG) as Record<string, unknown>;
  const whitelist = [
    'title', 'kind', 'description', 'venue', 'startsAt', 'endsAt',
    'orgId', 'orgName', 'isOfficial',
  ];
  // createEvent adds creatorUid/creatorName/rsvpCount/createdAt itself;
  // the bridge must not add anything else.
  for (const k of Object.keys(input)) {
    expect(whitelist).toContain(k);
  }
});

// --- buildSangamEventUpdate ---

test('update mirrors the sangamEvents update-rule whitelist', () => {
  const update = buildSangamEventUpdate(item(), ORG) as Record<string, unknown>;
  expect(update).not.toBeNull();
  // Events+Polls P1: 'recurrence' joins the mirror — the rules
  // creator-update whitelist carries it, and removal writes null.
  const allowed = ['title', 'kind', 'description', 'venue', 'startsAt', 'endsAt', 'updatedAt', 'recurrence'];
  for (const k of Object.keys(update!)) {
    expect(allowed).toContain(k);
  }
  expect(update!).not.toHaveProperty('orgId');
  expect(update!).not.toHaveProperty('isOfficial');
});

// --- validateOrgEvent ---

test('validateOrgEvent flags missing title and date', () => {
  expect(validateOrgEvent({ title: '', date: '2026-01-01' })).toBe('title');
  expect(validateOrgEvent({ title: 'X', date: '' })).toBe('date');
  expect(validateOrgEvent({ title: 'X', date: 'Every Purnima' })).toBeNull();
});
