/**
 * passPersistence.test.ts — NEXT-LEVEL A2: the pass stops being a
 * lost link. Pure parts only (no DOM canvas): booked days, the
 * booking's ICS inputs on the shared machinery, the Google
 * Calendar template link, and the pass image's lines/layout/name.
 * The two jest shims are the E3 test file's, verbatim — they make
 * the lib/eventPass import chain (utils/qrUtils) loadable under
 * ts-jest/node; neither touches any logic under test.
 */
jest.mock('../../services/firebaseClient', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('crypto-js', () => {
  const actual = jest.requireActual('crypto-js');
  return { __esModule: true, default: actual, ...actual };
});

import { buildIcsCalendar } from '../icsExport';
import {
  bookedDaysFor,
  bookingIcsInputs,
  googleCalendarUrl,
  passImageFileName,
  passImageLayout,
  passImageLines,
  PASS_IMAGE_HEIGHT,
  PASS_IMAGE_WIDTH,
  type BookingCalendarFacts,
  type PassImageContent,
} from '../passPersistence';

const FEST_DAYS = ['2026-11-21', '2026-11-22', '2026-11-23'];

const FACTS: BookingCalendarFacts = {
  eventId: 'ws1__durga-puja',
  festivalName: 'Durga Puja',
  orgName: 'Soyekpur Sarbojanin Samiti',
  venue: 'Community Hall, Station Road',
  link: 'https://sanatanibandhan.web.app/festival/ws1/ws1__durga-puja',
  days: ['2026-11-21', '2026-11-23'],
  noteLine: 'Ananda Sharma · party of 4',
};

describe('bookedDaysFor', () => {
  it('a record with no days attends every festival day', () => {
    expect(bookedDaysFor({}, FEST_DAYS)).toEqual(FEST_DAYS);
    expect(bookedDaysFor({ days: [] }, FEST_DAYS)).toEqual(FEST_DAYS);
  });

  it('a day-wise record attends exactly its days, in festival order', () => {
    expect(bookedDaysFor({ days: ['2026-11-23', '2026-11-21'] }, FEST_DAYS))
      .toEqual(['2026-11-21', '2026-11-23']);
  });

  it('days outside the festival never survive', () => {
    expect(bookedDaysFor({ days: ['2026-12-25'] }, FEST_DAYS)).toEqual([]);
  });
});

describe('bookingIcsInputs', () => {
  it('one all-day input per booked day, each with its own uid', () => {
    const inputs = bookingIcsInputs(FACTS);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({ date: '2026-11-21', title: 'Durga Puja' });
    expect(inputs[1]).toMatchObject({ date: '2026-11-23', title: 'Durga Puja' });
    expect(inputs[0].uid).not.toBe(inputs[1].uid);
    for (const i of inputs) {
      expect(i.startMs).toBeUndefined();
      expect(i.time).toBeUndefined();
      expect(i.recurrence).toBeUndefined();
    }
  });

  it('location is the venue when the record carries one, else the org name', () => {
    expect(bookingIcsInputs(FACTS)[0].location).toBe('Community Hall, Station Road');
    const noVenue = { ...FACTS, venue: undefined };
    expect(bookingIcsInputs(noVenue)[0].location).toBe('Soyekpur Sarbojanin Samiti');
    const blankVenue = { ...FACTS, venue: '   ' };
    expect(bookingIcsInputs(blankVenue)[0].location).toBe('Soyekpur Sarbojanin Samiti');
  });

  it('description carries the booking note and the festival page link', () => {
    const d = bookingIcsInputs(FACTS)[0].description || '';
    expect(d).toContain('Ananda Sharma · party of 4');
    expect(d).toContain(FACTS.link);
  });

  it('feeds the shared ICS builder: one VEVENT per day, no RRULE, no times', () => {
    const ics = buildIcsCalendar(bookingIcsInputs(FACTS), Date.UTC(2026, 10, 1));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261121');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261123');
    expect(ics).not.toContain('RRULE');
    expect(ics).not.toMatch(/DTSTART:\d{8}T/);
    expect(ics).toContain('LOCATION:Community Hall\\, Station Road');
  });

  it('invalid day strings are dropped, never exported', () => {
    const bad = { ...FACTS, days: ['not-a-date', '2026-11-21'] };
    expect(bookingIcsInputs(bad)).toHaveLength(1);
  });
});

describe('googleCalendarUrl', () => {
  it('is a TEMPLATE link spanning first to last booked day, end exclusive', () => {
    const url = googleCalendarUrl(FACTS);
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const u = new URL(url);
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('text')).toBe('Durga Puja');
    expect(u.searchParams.get('dates')).toBe('20261121/20261124');
    expect(u.searchParams.get('location')).toBe('Community Hall, Station Road');
    expect(u.searchParams.get('details')).toContain(FACTS.link);
  });

  it('a single booked day ends the day after', () => {
    const u = new URL(googleCalendarUrl({ ...FACTS, days: ['2026-11-22'] }));
    expect(u.searchParams.get('dates')).toBe('20261122/20261123');
  });

  it('no valid day → no link', () => {
    expect(googleCalendarUrl({ ...FACTS, days: [] })).toBe('');
    expect(googleCalendarUrl({ ...FACTS, days: ['junk'] })).toBe('');
  });
});

const CONTENT: PassImageContent = {
  passTitle: 'Your event pass',
  festivalName: 'Durga Puja',
  orgName: 'Soyekpur Sarbojanin Samiti',
  dateLabel: 'Sat, 22 Nov 2026',
  partyLine: 'Ananda Sharma · party of 4',
  noteLine: 'The living pass in the app refreshes every few minutes.',
  brandLine: 'Sanatani Bandhan',
  admitted: false,
  admittedLabel: 'Admitted at the gate',
};

describe('pass image spec', () => {
  it('lines carry the facts in draw order; a live pass has no stamp', () => {
    const lines = passImageLines(CONTENT);
    expect(lines.header).toBe('Your event pass');
    expect(lines.title).toBe('Durga Puja');
    expect(lines.sub).toBe('Soyekpur Sarbojanin Samiti · Sat, 22 Nov 2026');
    expect(lines.party).toBe('Ananda Sharma · party of 4');
    expect(lines.stamp).toBeNull();
    expect(lines.note).toContain('refreshes');
    expect(lines.brand).toBe('Sanatani Bandhan');
  });

  it('an admitted pass shows the stamp instead of a code', () => {
    const lines = passImageLines({ ...CONTENT, admitted: true });
    expect(lines.stamp).toBe('Admitted at the gate');
  });

  it('layout is a 4:5 portrait with the QR tile inside the frame', () => {
    const l = passImageLayout();
    expect(l.width).toBe(PASS_IMAGE_WIDTH);
    expect(l.height).toBe(PASS_IMAGE_HEIGHT);
    expect(l.width * 5).toBe(l.height * 4);
    expect(l.qrX).toBeGreaterThanOrEqual(0);
    expect(l.qrX + l.qrSize).toBeLessThanOrEqual(l.width);
    expect(l.qrY + l.qrSize).toBeLessThan(l.height);
    expect(l.centerX).toBe(l.width / 2);
  });

  it('file name is a safe slug with the pass day', () => {
    expect(passImageFileName('Durga Puja', '2026-11-22'))
      .toBe('sanatani-pass-Durga_Puja-2026-11-22.png');
    expect(passImageFileName('', '2026-11-22')).toBe('sanatani-pass-festival-2026-11-22.png');
    expect(passImageFileName('Durga Puja', 'junk')).toBe('sanatani-pass-Durga_Puja.png');
  });
});
