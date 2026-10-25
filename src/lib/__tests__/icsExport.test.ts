/**
 * icsExport.test.ts — EVENTS P1: .ics everywhere, one shared helper.
 * =====================================================================
 * RFC 5545 shape: CRLF lines, UTC DTSTAMP, all-day DTEND = the day
 * AFTER the last day (exclusive end), escaping, 75-octet folding and
 * the RRULE line for recurring events.
 */
import { buildIcsCalendar, buildIcsEvent, dayAfterISO, icsFileName } from '../icsExport';

const STAMP = new Date('2026-10-25T04:30:00Z').getTime();

describe('buildIcsCalendar — single events', () => {
  it('an all-day event ends (exclusively) the day after', () => {
    const ics = buildIcsCalendar([{ uid: 'a', title: 'Kali Puja', date: '2026-11-08' }], STAMP);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261108');
    expect(ics).toContain('DTEND;VALUE=DATE:20261109');
    expect(ics).toContain('DTSTAMP:20261025T043000Z');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true); // every content line ends CRLF
  });

  it('a multi-day span ends the day after its last day', () => {
    const ics = buildIcsCalendar(
      [{ uid: 'a', title: 'Durga Puja', date: '2026-10-16', endDate: '2026-10-20' }],
      STAMP
    );
    expect(ics).toContain('DTSTART;VALUE=DATE:20261016');
    expect(ics).toContain('DTEND;VALUE=DATE:20261021');
  });

  it('a timed event carries UTC times', () => {
    const ics = buildIcsCalendar(
      [{ uid: 'a', title: 'Satsang', startMs: Date.UTC(2026, 10, 1, 13, 0), endMs: Date.UTC(2026, 10, 1, 14, 30) }],
      STAMP
    );
    expect(ics).toContain('DTSTART:20261101T130000Z');
    expect(ics).toContain('DTEND:20261101T143000Z');
  });

  it('text is escaped (comma, semicolon, newline)', () => {
    const ics = buildIcsCalendar(
      [{ uid: 'a', title: 'Puja, arati; prasad', description: 'Line one\nLine two', date: '2026-11-08' }],
      STAMP
    );
    expect(ics).toContain('SUMMARY:Puja\\, arati\\; prasad');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two');
  });

  it('long lines fold at 75 octets with a space continuation', () => {
    const ics = buildIcsEvent(
      { uid: 'a', title: 'Annakut Mahotsav — ' + 'x'.repeat(120), date: '2026-11-08' },
      STAMP
    );
    expect(ics).not.toBeNull();
    for (const line of ics!.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(ics).toContain('\r\n ');
  });

  it('an event with neither date nor startMs is skipped, not faked', () => {
    expect(buildIcsEvent({ uid: 'a', title: 'Nowhere' }, STAMP)).toBeNull();
  });
});

describe('buildIcsCalendar — recurrence', () => {
  it('carries the RRULE for a recurring event', () => {
    const ics = buildIcsCalendar(
      [
        {
          uid: 'a',
          title: 'Weekly Satsang',
          date: '2026-10-25',
          time: '10:00',
          recurrence: { freq: 'weekly' },
        },
      ],
      STAMP
    );
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU');
    expect(ics).toContain('DTSTART:20261025T'); // timed start from the time field
  });
});

describe('helpers', () => {
  it('dayAfterISO rolls months and years', () => {
    expect(dayAfterISO('2026-10-31')).toBe('2026-11-01');
    expect(dayAfterISO('2026-12-31')).toBe('2027-01-01');
    expect(dayAfterISO('2028-02-28')).toBe('2028-02-29');
  });
  it('icsFileName is filesystem-safe (words joined by underscores, case kept)', () => {
    expect(icsFileName('Kali Puja / 2026!')).toBe('Kali_Puja_2026.ics');
    expect(icsFileName('')).toBe('event.ics');
  });
});
