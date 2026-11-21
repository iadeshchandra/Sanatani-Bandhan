/**
 * eventPass.test.ts — SB-EVENT pass + gate decision tests (EVENTS E3).
 *
 * The token round-trip exercises the REAL family verifier
 * (utils/qrUtils generateDynamicToken/verifyDynamicToken, HMAC and
 * all). Two jest shims make that importable under ts-jest/node:
 *  - services/firebaseClient is stubbed (it reads import.meta.env,
 *    which node cannot), and
 *  - crypto-js is re-exported with an explicit default so the
 *    compiled default-import in qrUtils resolves to the real package.
 * Neither shim touches the signing code itself — tamper tests below
 * fail against the genuine HMAC check.
 */
jest.mock('../../services/firebaseClient', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('crypto-js', () => {
  const actual = jest.requireActual('crypto-js');
  return { __esModule: true, default: actual, ...actual };
});

import { generateDynamicToken } from '../../utils/qrUtils';
import {
  buildEventPassPayload,
  mintEventPassToken,
  parseEventPassPayload,
  readEventPassToken,
  evaluateGateScan,
  gateCounts,
  rsvpAttendsDay,
  admittedOnDay,
  pickPassDate,
  localDateOfIso,
  type EventPassInput,
} from '../eventPass';
import { registerScan, type GateRegistryData } from '../eventGateRegistry';
import type { RsvpEntry } from '../festival';

const WS = 'ws1';
const EVENT_ID = 'ws1__durga_2026-10-01';
const DAYS = ['2026-10-01', '2026-10-02', '2026-10-03'];

const input = (over: Partial<EventPassInput> = {}): EventPassInput => ({
  workspaceId: WS,
  eventId: EVENT_ID,
  date: '2026-10-02',
  rsvpId: `${EVENT_ID}__uid1`,
  name: 'Ananya Devi',
  headcount: 4,
  ...over,
});

const record = (over: Partial<RsvpEntry> = {}): RsvpEntry => ({
  id: `${EVENT_ID}__uid1`,
  eventId: EVENT_ID,
  workspaceId: WS,
  uid: 'uid1',
  name: 'Ananya Devi',
  headcount: 4,
  createdAt: '2026-09-01T10:00:00.000Z',
  status: 'confirmed',
  ...over,
});

describe('SB-EVENT pass round-trip (real family verifier)', () => {
  it('mints and reads back every bound field', () => {
    const read = readEventPassToken(mintEventPassToken(input()));
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.payload).toEqual(buildEventPassPayload(input()));
    }
  });

  it('rejects a payload edited after signing (signature mismatch)', () => {
    const token = mintEventPassToken(input());
    const body = token.slice('SBDYN:'.length);
    const dot = body.lastIndexOf('.');
    const decoded = JSON.parse(decodeURIComponent(atob(body.slice(0, dot))));
    decoded.name = 'Forged Name';
    decoded.headcount = 40;
    const forged = `SBDYN:${btoa(encodeURIComponent(JSON.stringify(decoded)))}.${body.slice(dot + 1)}`;
    const read = readEventPassToken(forged);
    expect(read.ok).toBe(false);
    if (read.ok === false) expect(read.error).toBe('SIGNATURE_MISMATCH');
  });

  it('rejects a darshan Gate Pass token — valid family token, wrong pass', () => {
    const gatePass = generateDynamicToken(
      { uid: 'uid1', name: 'Ananya Devi', workspaceId: WS, purpose: 'Gate Pass' },
      300
    );
    const read = readEventPassToken(gatePass);
    expect(read.ok).toBe(false);
    if (read.ok === false) expect(read.error).toBe('NOT_AN_EVENT_PASS');
  });

  it('rejects garbage and empty scans as invalid format', () => {
    expect(readEventPassToken('').ok).toBe(false);
    expect(readEventPassToken('https://evil.example/phish').ok).toBe(false);
    expect(readEventPassToken('SB-ZONE:2:ws1:gate:abc123').ok).toBe(false);
  });

  it('rejects UNSIGNED payloads — sb-event has no legacy format', () => {
    // The family verifier accepts unsigned legacy JSON / base64-JSON
    // payloads for older pass kinds. An event pass exists only as a
    // signed SBDYN: token, so a hand-written payload naming a REAL
    // confirmed booking must still read INVALID_FORMAT and admit
    // nobody at the gate.
    const forged = JSON.stringify(buildEventPassPayload(input()));
    const rawRead = readEventPassToken(forged);
    expect(rawRead.ok).toBe(false);
    if (rawRead.ok === false) expect(rawRead.error).toBe('INVALID_FORMAT');
    const b64Read = readEventPassToken(Buffer.from(forged, 'utf-8').toString('base64'));
    expect(b64Read.ok).toBe(false);
    if (b64Read.ok === false) expect(b64Read.error).toBe('INVALID_FORMAT');
    const decision = evaluateGateScan({
      read: rawRead,
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record(),
      registryFirstScanAt: null,
    });
    expect(decision.outcome).toBe('INVALID');
    expect(decision.reason).toBe('format');
  });

  it('an expired event pass reads TOKEN_EXPIRED, never admitted', () => {
    const read = readEventPassToken(mintEventPassToken(input(), -60));
    expect(read.ok).toBe(false);
    if (read.ok === false) expect(read.error).toBe('TOKEN_EXPIRED');
    const decision = evaluateGateScan({
      read,
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record(),
      registryFirstScanAt: null,
    });
    expect(decision.outcome).toBe('INVALID');
    expect(decision.reason).toBe('expired');
  });

  it('parseEventPassPayload flags a signed-but-shape-broken payload as tampered', () => {
    const bad = parseEventPassPayload({ ...buildEventPassPayload(input()), headcount: 0 });
    expect(bad.ok).toBe(false);
    if (bad.ok === false) expect(bad.error).toBe('TAMPER_DETECTED');
    const badDate = parseEventPassPayload({ ...buildEventPassPayload(input()), date: 'Oct 2' });
    expect(badDate.ok).toBe(false);
  });
});

describe('gate validity windows', () => {
  const scan = (
    read = readEventPassToken(mintEventPassToken(input())),
    over: Partial<Parameters<typeof evaluateGateScan>[0]> = {}
  ) =>
    evaluateGateScan({
      read,
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record(),
      registryFirstScanAt: null,
      ...over,
    });

  it('admits the right pass on the right day', () => {
    const d = scan();
    expect(d.outcome).toBe('ADMITTED');
    expect(d.payload?.name).toBe('Ananya Devi');
  });

  it('a pass for another festival reads WRONG_EVENT', () => {
    const read = readEventPassToken(mintEventPassToken(input({ eventId: 'ws1__kali_2026-10-20' })));
    expect(scan(read).outcome).toBe('WRONG_EVENT');
  });

  it('a pass for day 1 at the day-2 gate reads WRONG_DAY and names its day', () => {
    const read = readEventPassToken(mintEventPassToken(input({ date: '2026-10-01' })));
    const d = scan(read);
    expect(d.outcome).toBe('WRONG_DAY');
    expect(d.payload?.date).toBe('2026-10-01');
  });

  it('multi-day: a day-3-only booking admits at the day-3 gate', () => {
    const read = readEventPassToken(mintEventPassToken(input({ date: '2026-10-03' })));
    const d = scan(read, {
      gateDay: '2026-10-03',
      record: record({ days: ['2026-10-03'] }),
    });
    expect(d.outcome).toBe('ADMITTED');
  });

  it('multi-day: a day-1-only booking scanned on day 2 reads WRONG_DAY even with a day-2 pass date', () => {
    // A pass is only minted for a booked day — but if one is presented,
    // the record is the authority and the gate refuses.
    const d = scan(readEventPassToken(mintEventPassToken(input())), {
      record: record({ days: ['2026-10-01'] }),
    });
    expect(d.outcome).toBe('WRONG_DAY');
  });

  it('a cancelled or waitlisted booking admits nobody', () => {
    expect(scan(readEventPassToken(mintEventPassToken(input())), {
      record: record({ status: 'waitlisted' }),
    }).outcome).toBe('INVALID');
    const missing = scan(readEventPassToken(mintEventPassToken(input())), { record: null });
    expect(missing.outcome).toBe('INVALID');
    expect(missing.reason).toBe('no-record');
  });

  it('a tampered token reads INVALID/signature at the gate', () => {
    const d = scan({ ok: false, error: 'SIGNATURE_MISMATCH' });
    expect(d.outcome).toBe('INVALID');
    expect(d.reason).toBe('signature');
  });
});

describe('one-scan-once', () => {
  it('the registry witness: first scan admits, second reads ALREADY_USED with the first time', () => {
    let registry: GateRegistryData = {};
    const at = Date.parse('2026-10-02T07:30:00.000Z');
    const first = registerScan(registry, EVENT_ID, '2026-10-02', record().id, at);
    expect(first.alreadyUsed).toBe(false);
    registry = first.data;

    const { registryFirstScanAt } = jest.requireActual('../eventGateRegistry') as typeof import('../eventGateRegistry');
    const second = evaluateGateScan({
      read: readEventPassToken(mintEventPassToken(input())),
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record(),
      registryFirstScanAt: registryFirstScanAt(registry, EVENT_ID, '2026-10-02', record().id),
    });
    expect(second.outcome).toBe('ALREADY_USED');
    expect(second.firstAdmittedAt).toBe(new Date(at).toISOString());
  });

  it('the record witness: checked in earlier TODAY (another gate device) reads ALREADY_USED', () => {
    const thisMorning = new Date();
    thisMorning.setFullYear(2026, 9, 2);
    thisMorning.setHours(8, 15, 0, 0);
    const d = evaluateGateScan({
      read: readEventPassToken(mintEventPassToken(input())),
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record({ checkedIn: true, checkedInAt: thisMorning.toISOString() }),
      registryFirstScanAt: null,
    });
    expect(d.outcome).toBe('ALREADY_USED');
    expect(d.firstAdmittedAt).toBe(thisMorning.toISOString());
  });

  it('checked in on day 1 does NOT block day 2 of a multi-day booking', () => {
    const day1 = new Date();
    day1.setFullYear(2026, 9, 1);
    day1.setHours(9, 0, 0, 0);
    const d = evaluateGateScan({
      read: readEventPassToken(mintEventPassToken(input())),
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: record({ checkedIn: true, checkedInAt: day1.toISOString() }),
      registryFirstScanAt: null,
    });
    expect(d.outcome).toBe('ADMITTED');
  });

  it('name-search fallback admit registers the pass: a later scan reads ALREADY_USED', () => {
    // The fallback performs the identical admit path: register the
    // record id in the registry, then write checkedIn. Afterwards a
    // scan of the devotee’s own pass must read ALREADY_USED.
    let registry: GateRegistryData = {};
    const at = Date.parse('2026-10-02T08:00:00.000Z');
    registry = registerScan(registry, EVENT_ID, '2026-10-02', record().id, at).data;
    const admittedRecord = record({ checkedIn: true, checkedInAt: new Date(at).toISOString() });

    const { registryFirstScanAt } = jest.requireActual('../eventGateRegistry') as typeof import('../eventGateRegistry');
    const d = evaluateGateScan({
      read: readEventPassToken(mintEventPassToken(input())),
      selectedEventId: EVENT_ID,
      gateDay: '2026-10-02',
      festivalDays: DAYS,
      record: admittedRecord,
      registryFirstScanAt: registryFirstScanAt(registry, EVENT_ID, '2026-10-02', record().id),
    });
    expect(d.outcome).toBe('ALREADY_USED');
  });
});

describe('day helpers + counts', () => {
  it('rsvpAttendsDay honours the P1 days semantics', () => {
    expect(rsvpAttendsDay(record(), '2026-10-02', DAYS)).toBe(true);
    expect(rsvpAttendsDay(record({ days: ['2026-10-01'] }), '2026-10-02', DAYS)).toBe(false);
    expect(rsvpAttendsDay(record(), '2026-12-25', DAYS)).toBe(false);
  });

  it('localDateOfIso reads the device-local civil date', () => {
    const d = new Date();
    d.setFullYear(2026, 9, 2);
    d.setHours(23, 30, 0, 0);
    expect(localDateOfIso(d.toISOString())).toBe('2026-10-02');
    expect(localDateOfIso(undefined)).toBeNull();
    expect(localDateOfIso('not-a-date')).toBeNull();
  });

  it('admittedOnDay prefers the registry witness, falls back to the record', () => {
    const at = Date.parse('2026-10-02T07:00:00.000Z');
    expect(admittedOnDay(record(), '2026-10-02', at).used).toBe(true);
    expect(admittedOnDay(record(), '2026-10-02', null).used).toBe(false);
  });

  it('gateCounts separates expected from admitted, per day', () => {
    const at = Date.parse('2026-10-02T07:00:00.000Z');
    const rsvps: RsvpEntry[] = [
      record(),
      record({ id: `${EVENT_ID}__uid2`, uid: 'uid2', name: 'Bimal', headcount: 2, days: ['2026-10-02'] }),
      record({ id: `${EVENT_ID}__uid3`, uid: 'uid3', name: 'Chitra', headcount: 3, days: ['2026-10-01'] }),
      record({ id: `${EVENT_ID}__uid4`, uid: 'uid4', name: 'Dinesh', headcount: 5, status: 'waitlisted' }),
    ];
    const counts = gateCounts(rsvps, DAYS, '2026-10-02', (id) => (id === record().id ? at : null));
    expect(counts.expectedParties).toBe(2);
    expect(counts.expectedHeads).toBe(6);
    expect(counts.admittedParties).toBe(1);
    expect(counts.admittedHeads).toBe(4);
  });

  it('pickPassDate chooses today, else the next attending day, else the last', () => {
    expect(pickPassDate(record(), DAYS, '2026-10-02')).toBe('2026-10-02');
    expect(pickPassDate(record({ days: ['2026-10-03'] }), DAYS, '2026-10-02')).toBe('2026-10-03');
    expect(pickPassDate(record({ days: ['2026-10-01'] }), DAYS, '2026-10-02')).toBe('2026-10-01');
    expect(pickPassDate(record(), DAYS, '2026-09-30')).toBe('2026-10-01');
  });
});
