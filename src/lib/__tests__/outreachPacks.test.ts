/**
 * outreachPacks.test.ts — EVENTS E8 pure-logic pins.
 * =====================================================================
 * The share & invite builders: interpolation from the festival's
 * real data, the days-aware reminder when-phrase, the wa.me deep
 * link's encoding (Indic scripts, emoji, newlines survive the
 * round-trip), and the no-placeholder law — a missing value
 * degrades its sentence, it never prints "{date}" at a devotee.
 */
import {
  buildChangeMessage,
  buildInviteMessage,
  buildOutreachMessage,
  buildPollReminderMessage,
  datesLineFor,
  daysBeforeFor,
  fillTemplate,
  reminderWhen,
  whatsAppUrl,
  type ChangeStrings,
  type OutreachData,
  type OutreachStrings,
  type PollReminderData,
  type PollReminderStrings,
} from '../outreachPacks';

const S: OutreachStrings = {
  announcement: '🙏 Namaskar! {org} warmly invites you to {festival} — {dates}. Details & RSVP: {link}',
  reminder: '🙏 A gentle reminder — {festival} at {org} is {when}. Details: {link}',
  reminderWhenDays: 'in {days} days',
  reminderWhenTomorrow: 'tomorrow',
  reminderWhenToday: 'today',
  lastCall: '🙏 Last call — {festival} at {org}, {dates}. Details: {link}',
  invite: '🙏 I am going to {festival} at {org} — {dates}. Come with us! Details: {link}',
};

const DATA: OutreachData = {
  festivalName: 'Durga Puja',
  orgName: 'Mayapur Mandir',
  datesLine: '21–23 Nov 2026',
  link: 'https://sanatanibandhan.web.app/festival/ws1/ws1__fest1',
  daysBefore: 5,
};

describe('buildOutreachMessage — interpolation from real data', () => {
  it('announcement carries name, org, dates and the canonical link', () => {
    const m = buildOutreachMessage('announcement', DATA, S);
    expect(m).toContain('Durga Puja');
    expect(m).toContain('Mayapur Mandir');
    expect(m).toContain('21–23 Nov 2026');
    expect(m).toContain(DATA.link);
    expect(m).not.toMatch(/[{}]/);
  });

  it('last call carries the dates line', () => {
    const m = buildOutreachMessage('lastcall', DATA, S);
    expect(m).toContain('21–23 Nov 2026');
    expect(m).not.toMatch(/[{}]/);
  });

  it('the personal invite is first-person', () => {
    const m = buildInviteMessage(DATA, S);
    expect(m.startsWith('🙏 I am going to Durga Puja')).toBe(true);
    expect(m).toContain(DATA.link);
  });
});

describe('the reminder when-phrase — days-aware', () => {
  it('2+ days out speaks in days', () => {
    expect(reminderWhen(5, S)).toBe('in 5 days');
    expect(buildOutreachMessage('reminder', DATA, S)).toContain('is in 5 days.');
  });
  it('one day out is tomorrow; the day itself is today', () => {
    expect(reminderWhen(1, S)).toBe('tomorrow');
    expect(reminderWhen(0, S)).toBe('today');
    expect(reminderWhen(-2, S)).toBe('today');
  });
  it('an unknown distance degrades the sentence, never a placeholder', () => {
    const m = buildOutreachMessage('reminder', { ...DATA, daysBefore: null }, S);
    expect(m).not.toMatch(/[{}]/);
    expect(m).not.toContain('  ');
    expect(m).toContain('Durga Puja');
  });
});

describe('the no-placeholder law', () => {
  it('missing org and dates degrade cleanly', () => {
    const m = buildOutreachMessage('announcement', { ...DATA, orgName: '', datesLine: '' }, S);
    expect(m).not.toMatch(/[{}]/);
    expect(m).not.toContain('  ');
    expect(m).not.toContain(' — .');
    expect(m).toContain('Durga Puja');
    expect(m).toContain(DATA.link);
  });
  it('a wholly empty record still yields the link, no braces', () => {
    const m = buildInviteMessage(
      { festivalName: '', orgName: '', datesLine: '', link: DATA.link, daysBefore: null },
      S
    );
    expect(m).not.toMatch(/[{}]/);
    expect(m).toContain(DATA.link);
  });
  it('fillTemplate removes unknown tokens with their separator', () => {
    expect(fillTemplate('Come on {date} to {place}.', { place: 'the mandir' })).toBe(
      'Come on to the mandir.'
    );
  });
});

describe('whatsAppUrl — the wa.me deep link', () => {
  it('encodes Indic script, emoji and punctuation losslessly', () => {
    const msg = '🙏 নমস্কার! দুর্গা পূজা — 21 Nov 2026.\nDetails: https://x.example/a?b=1&c=2';
    const url = whatsAppUrl(msg);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe(msg);
    expect(url).not.toContain(' ');
    expect(url).not.toContain('\n');
  });
});

describe('datesLineFor — civil dates, noon-stable', () => {
  it('single day', () => {
    expect(datesLineFor('2026-11-21')).toBe('21 Nov 2026');
  });
  it('a span inside one month collapses the month', () => {
    expect(datesLineFor('2026-11-21', '2026-11-23')).toBe('21–23 Nov 2026');
  });
  it('a span across months names both', () => {
    expect(datesLineFor('2026-11-30', '2026-12-02')).toBe('30 Nov – 2 Dec 2026');
  });
  it('same start and end is a single day', () => {
    expect(datesLineFor('2026-11-21', '2026-11-21')).toBe('21 Nov 2026');
  });
});

describe('daysBeforeFor — the festival clock', () => {
  it('whole days until the first moment (the rules formula)', () => {
    const start = new Date('2026-11-21T00:00:00.000Z').getTime();
    expect(daysBeforeFor('2026-11-21', start - 5 * 86400000)).toBe(5);
    expect(daysBeforeFor('2026-11-21', start - 86400000)).toBe(1);
    expect(daysBeforeFor('2026-11-21', start)).toBe(0);
  });
});

describe('buildChangeMessage — the REAL-WORLD PACK change pack', () => {
  const CS: ChangeStrings = {
    change: '🙏 Namaskar — a change of plan for {festival} at {org}. {changeDates} {changeVenue} {note} Latest details: {link}',
    changeDatesLine: 'New dates: {value}.',
    changeVenueLine: 'New venue: {value}.',
  };

  it('composes every organiser line into its own sentence', () => {
    const msg = buildChangeMessage(DATA, {
      newDates: '24 Nov 2026',
      newVenue: 'Community Hall, Temple Road',
      note: 'The aarti time is unchanged.',
    }, CS);
    expect(msg).toContain('Durga Puja');
    expect(msg).toContain('Mayapur Mandir');
    expect(msg).toContain('New dates: 24 Nov 2026.');
    expect(msg).toContain('New venue: Community Hall, Temple Road.');
    expect(msg).toContain('The aarti time is unchanged.');
    expect(msg).toContain(DATA.link);
    expect(msg).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('a missing line degrades its sentence away — never a placeholder', () => {
    const msg = buildChangeMessage(DATA, { note: 'Postponed by a day due to rain.' }, CS);
    expect(msg).toContain('Postponed by a day due to rain.');
    expect(msg).not.toContain('New dates');
    expect(msg).not.toContain('New venue');
    expect(msg).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(msg).not.toMatch(/\s{2,}/);
  });

  it('with no lines at all it still reads honestly and points at the page', () => {
    const msg = buildChangeMessage(DATA, {}, CS);
    expect(msg).toContain('a change of plan for Durga Puja at Mayapur Mandir');
    expect(msg).toContain(DATA.link);
    expect(msg).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('blank-whitespace lines count as missing', () => {
    const msg = buildChangeMessage(DATA, { newDates: '   ', newVenue: ' ' }, CS);
    expect(msg).not.toContain('New dates');
    expect(msg).not.toContain('New venue');
  });
});

describe('buildPollReminderMessage — POLLS P2a WhatsApp reminder pack', () => {
  const PS: PollReminderStrings = {
    pollReminder:
      '🙏 Namaskar — {org} is asking: {poll} {standing} Voting closes {closes}. If you have not voted yet, please open Sanatani Bandhan and cast your vote from Polls on your Personal home.',
  };
  const PD: PollReminderData = {
    pollTitle: 'Which day should the festival be held?',
    orgName: 'Mayapur Samaj',
    closesLine: '28 Nov 2026',
    standingLine: 'This is a formal vote of the house — binding: the house will act on the result.',
  };

  it('composes from the poll\u2019s real data: question, org, standing, closing', () => {
    const m = buildPollReminderMessage(PD, PS);
    expect(m).toContain('Which day should the festival be held?');
    expect(m).toContain('Mayapur Samaj');
    expect(m).toContain('binding: the house will act on the result');
    expect(m).toContain('28 Nov 2026');
    expect(m).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('a missing closing line degrades its sentence, never prints a placeholder', () => {
    const m = buildPollReminderMessage({ ...PD, closesLine: '' }, PS);
    expect(m).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(m).not.toContain('Voting closes .');
    expect(m).toContain('Which day should the festival be held?');
  });

  it('the wa.me link encodes the reminder losslessly', () => {
    const m = buildPollReminderMessage(PD, PS);
    const url = whatsAppUrl(m);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe(m);
  });
});
