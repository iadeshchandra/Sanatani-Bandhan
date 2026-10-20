/**
 * campus/__tests__/openHours.test.ts — structured zone hours (QUEUED #19).
 * =====================================================================
 * Pins the "Open now" honesty laws:
 *  1. No valid structured hours → status null → NO badge, ever.
 *  2. Boundaries are exact: at open = open, at close = closed.
 *  3. Split days (morning/evening) and overnight ranges compute right.
 *  4. Closed weekdays suppress their own ranges; an overnight session
 *     that began the day before still shows open in its tail.
 *  5. The builder persists only complete, valid ranges.
 * Plus fs-wiring pins (house pattern): the badge renders in the zone
 * list + detail sheet, and the editor mounts in CampusBuilder.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  buildOpenHours,
  draftRangesFrom,
  formatMinutes,
  normalizeOpenHours,
  openStatusLabel,
  parseHHMM,
  zoneOpenStatus,
} from '../openHours';
import type { ZoneOpenHours } from '../types';

const SRC = path.resolve(__dirname, '..', '..');
const src = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Oct 20, 2026 (a Tuesday) at h:m local. */
const at = (h: number, m = 0, dayOffset = 0): Date =>
  new Date(2026, 9, 20 + dayOffset, h, m, 0, 0);

const DAY = at(10).getDay();
const OTHER_DAY = (DAY + 3) % 7;

const single: ZoneOpenHours = { ranges: [{ open: '05:00', close: '21:00' }] };
const split: ZoneOpenHours = {
  ranges: [
    { open: '05:00', close: '12:00' },
    { open: '16:00', close: '21:00' },
  ],
};
const overnight: ZoneOpenHours = { ranges: [{ open: '20:00', close: '02:00' }] };

describe('parseHHMM', () => {
  it('parses valid times', () => {
    expect(parseHHMM('05:00')).toBe(300);
    expect(parseHHMM('7:05')).toBe(425);
    expect(parseHHMM('23:59')).toBe(1439);
    expect(parseHHMM('00:00')).toBe(0);
  });
  it('rejects invalid times', () => {
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('9:70')).toBeNull();
    expect(parseHHMM('')).toBeNull();
    expect(parseHHMM('noon')).toBeNull();
    expect(parseHHMM(null)).toBeNull();
    expect(parseHHMM(300)).toBeNull();
    expect(parseHHMM(undefined)).toBeNull();
  });
});

describe('normalizeOpenHours — defensive read', () => {
  it('returns undefined for absent/garbage input', () => {
    expect(normalizeOpenHours(undefined)).toBeUndefined();
    expect(normalizeOpenHours(null)).toBeUndefined();
    expect(normalizeOpenHours('always open')).toBeUndefined();
    expect(normalizeOpenHours({})).toBeUndefined();
    expect(normalizeOpenHours({ ranges: [] })).toBeUndefined();
  });
  it('drops invalid ranges and open==close ranges', () => {
    const out = normalizeOpenHours({
      ranges: [
        { open: '05:00', close: '21:00' },
        { open: 'bad', close: '21:00' },
        { open: '08:00', close: '08:00' },
      ],
    });
    expect(out?.ranges).toEqual([{ open: '05:00', close: '21:00' }]);
  });
  it('caps at two ranges and sanitizes closedDays', () => {
    const out = normalizeOpenHours({
      ranges: [
        { open: '05:00', close: '09:00' },
        { open: '10:00', close: '12:00' },
        { open: '16:00', close: '21:00' },
      ],
      closedDays: [OTHER_DAY, OTHER_DAY, 9, -1, 2.5],
    });
    expect(out?.ranges).toHaveLength(2);
    expect(out?.closedDays).toEqual([OTHER_DAY]);
  });
});

describe('zoneOpenStatus — the honesty contract', () => {
  it('returns null (no badge) when hours are absent or invalid', () => {
    expect(zoneOpenStatus(undefined, at(10))).toBeNull();
    expect(zoneOpenStatus(null, at(10))).toBeNull();
    expect(zoneOpenStatus({ ranges: [{ open: 'x', close: 'y' }] }, at(10))).toBeNull();
    expect(zoneOpenStatus({ ranges: [{ open: '08:00', close: '08:00' }] }, at(10))).toBeNull();
  });
});

describe('zoneOpenStatus — single range', () => {
  it('is open mid-range and reports the close time', () => {
    const st = zoneOpenStatus(single, at(10));
    expect(st?.state).toBe('open');
    if (st?.state === 'open') {
      expect(st.closesAt.getHours()).toBe(21);
      expect(st.closesAt.getDate()).toBe(20);
    }
  });
  it('boundaries: exactly at open = open, exactly at close = closed', () => {
    expect(zoneOpenStatus(single, at(5, 0))?.state).toBe('open');
    expect(zoneOpenStatus(single, at(21, 0))?.state).toBe('closed');
    expect(zoneOpenStatus(single, at(4, 59))?.state).toBe('closed');
    expect(zoneOpenStatus(single, at(20, 59))?.state).toBe('open');
  });
  it('before opening, opensAt is later today', () => {
    const st = zoneOpenStatus(single, at(3, 30));
    expect(st?.state).toBe('closed');
    if (st?.state === 'closed') {
      expect(st.opensAt?.getDate()).toBe(20);
      expect(st.opensAt?.getHours()).toBe(5);
      expect(st.todayClosed).toBe(false);
    }
  });
  it('after closing, opensAt is tomorrow', () => {
    const st = zoneOpenStatus(single, at(22, 15));
    expect(st?.state).toBe('closed');
    if (st?.state === 'closed') {
      expect(st.opensAt?.getDate()).toBe(21);
      expect(st.opensAt?.getHours()).toBe(5);
    }
  });
});

describe('zoneOpenStatus — split day (temple morning/evening)', () => {
  it('between sessions is closed and opens at the evening session', () => {
    const st = zoneOpenStatus(split, at(12, 30));
    expect(st?.state).toBe('closed');
    if (st?.state === 'closed') {
      expect(st.opensAt?.getHours()).toBe(16);
      expect(st.opensAt?.getDate()).toBe(20);
    }
  });
  it('evening session is open', () => {
    expect(zoneOpenStatus(split, at(17))?.state).toBe('open');
    expect(zoneOpenStatus(split, at(6))?.state).toBe('open');
  });
});

describe('zoneOpenStatus — overnight ranges', () => {
  it('is open late evening, closing after midnight', () => {
    const st = zoneOpenStatus(overnight, at(23));
    expect(st?.state).toBe('open');
    if (st?.state === 'open') {
      expect(st.closesAt.getDate()).toBe(21);
      expect(st.closesAt.getHours()).toBe(2);
    }
  });
  it('is still open in the small hours (spill from yesterday)', () => {
    const st = zoneOpenStatus(overnight, at(1));
    expect(st?.state).toBe('open');
    if (st?.state === 'open') {
      expect(st.closesAt.getDate()).toBe(20);
      expect(st.closesAt.getHours()).toBe(2);
    }
  });
  it('is closed after the overnight close, opening again this evening', () => {
    const st = zoneOpenStatus(overnight, at(3));
    expect(st?.state).toBe('closed');
    if (st?.state === 'closed') {
      expect(st.opensAt?.getDate()).toBe(20);
      expect(st.opensAt?.getHours()).toBe(20);
    }
  });
});

describe('zoneOpenStatus — closed weekdays', () => {
  const closedToday: ZoneOpenHours = { ...single, closedDays: [DAY] };
  it('a closed day suppresses its own ranges', () => {
    const st = zoneOpenStatus(closedToday, at(10));
    expect(st?.state).toBe('closed');
    if (st?.state === 'closed') {
      expect(st.todayClosed).toBe(true);
      expect(st.opensAt?.getDate()).toBe(21);
    }
  });
  it('the next day is unaffected', () => {
    expect(zoneOpenStatus(closedToday, at(10, 0, 1))?.state).toBe('open');
  });
  it('an overnight session begun yesterday still shows open on a closed day', () => {
    const h: ZoneOpenHours = { ...overnight, closedDays: [DAY] };
    // 01:00 today: today's own ranges are suppressed, but yesterday's
    // 20:00–02:00 session genuinely began yesterday → open.
    expect(zoneOpenStatus(h, at(1))?.state).toBe('open');
    // And yesterday evening itself was open as usual.
    expect(zoneOpenStatus(h, at(21, 0, -1))?.state).toBe('open');
  });
  it('if yesterday was the closed day, there is no spill into today', () => {
    const yesterday = at(0, 0, -1).getDay();
    const h: ZoneOpenHours = { ...overnight, closedDays: [yesterday] };
    expect(zoneOpenStatus(h, at(1))?.state).toBe('closed');
  });
});

describe('labels + formatting', () => {
  it('formats minutes as warm 12-hour times', () => {
    expect(formatMinutes(0)).toBe('12:00 AM');
    expect(formatMinutes(300)).toBe('5:00 AM');
    expect(formatMinutes(720)).toBe('12:00 PM');
    expect(formatMinutes(1260)).toBe('9:00 PM');
  });
  it('open label names the closing time', () => {
    const st = zoneOpenStatus(single, at(10));
    expect(st && openStatusLabel(st, at(10))).toBe('Open now · closes 9:00 PM');
  });
  it('closed label names the next opening (same day / tomorrow / closed day)', () => {
    const between = zoneOpenStatus(split, at(12, 30));
    expect(between && openStatusLabel(between, at(12, 30))).toBe('Closed · opens 4:00 PM');
    const night = zoneOpenStatus(single, at(22));
    expect(night && openStatusLabel(night, at(22))).toBe('Closed · opens tomorrow 5:00 AM');
    const closedDay = zoneOpenStatus({ ...single, closedDays: [DAY] }, at(10));
    expect(closedDay && openStatusLabel(closedDay, at(10))).toBe(
      'Closed today · opens tomorrow 5:00 AM',
    );
  });
});

describe('builder helpers', () => {
  it('buildOpenHours persists only complete, valid ranges', () => {
    expect(buildOpenHours([{ open: '', close: '' }], [])).toBeUndefined();
    expect(buildOpenHours([{ open: '05:00', close: '' }], [])).toBeUndefined();
    expect(buildOpenHours([{ open: '05:00', close: '05:00' }], [])).toBeUndefined();
    expect(
      buildOpenHours(
        [
          { open: '05:00', close: '12:00' },
          { open: '', close: '' },
        ],
        [],
      ),
    ).toEqual({ ranges: [{ open: '05:00', close: '12:00' }] });
    expect(
      buildOpenHours(
        [
          { open: '05:00', close: '12:00' },
          { open: '16:00', close: '21:00' },
        ],
        [OTHER_DAY],
      ),
    ).toEqual({
      ranges: [
        { open: '05:00', close: '12:00' },
        { open: '16:00', close: '21:00' },
      ],
      closedDays: [OTHER_DAY],
    });
  });
  it('draftRangesFrom round-trips stored hours into two draft slots', () => {
    expect(draftRangesFrom(undefined)).toEqual([
      { open: '', close: '' },
      { open: '', close: '' },
    ]);
    expect(draftRangesFrom(split)).toEqual([
      { open: '05:00', close: '12:00' },
      { open: '16:00', close: '21:00' },
    ]);
  });
});

describe('wiring pins', () => {
  it('CampusZone carries the optional structured hours field', () => {
    const types = src('campus/types.ts');
    expect(types).toContain('openHours?: ZoneOpenHours');
    expect(types).toContain('hours?: string'); // free-text note preserved
  });
  it('CampusView renders the badge in the zone list and the detail sheet', () => {
    const view = src('campus/CampusView.tsx');
    expect(view).toContain('zoneOpenStatus');
    expect(view).toContain('openStatusLabel');
    expect(view).toContain('selectedStatus');
    expect(view).toContain("device's clock"); // honesty caption
  });
  it('CampusBuilder mounts the structured-hours editor', () => {
    const builder = src('campus/CampusBuilder.tsx');
    expect(builder).toContain('ZoneHoursEditor');
    expect(builder).toContain('buildOpenHours');
    expect(builder).toContain('type="time"');
  });
});
