/**
 * outreachPacks.ts — share & invite messages (EVENTS E8).
 * =====================================================================
 * Outreach that is REAL today: a ready message composed from the
 * festival's own published facts (name, dates, organisation, the
 * canonical public page link), handed to the sender's OWN WhatsApp
 * through a wa.me deep link, or copied for any other channel. The
 * sender chooses every recipient in their own WhatsApp — nothing
 * is sent by the app, nothing is bulk, and the UI says exactly
 * that ("Send from your own WhatsApp"). This is deliberately a
 * different thing from the WhatsApp Broadcaster desk, which stays
 * labelled a simulation until a real sending connection exists.
 *
 * The builders are pure: templates arrive as i18n strings in the
 * reader's language, the festival's values are interpolated, and
 * the no-placeholder law holds — a missing value degrades its
 * sentence (the token and its dangling separator go away), it
 * never prints "{date}" at a devotee.
 */
import { daysBeforeFestival, startMsFor } from './eventTickets';

export type OutreachTone = 'announcement' | 'reminder' | 'lastcall';

export interface OutreachData {
  festivalName: string;
  orgName: string;
  /** Human dates line, e.g. "21 Nov 2026" or "21–23 Nov 2026". */
  datesLine: string;
  /** The canonical public festival page URL. */
  link: string;
  /** Whole days until the festival starts (negative once begun). */
  daysBefore: number | null;
}

export interface OutreachStrings {
  announcement: string;
  reminder: string;
  /** "in {days} days" — the reminder's when-phrase for 2+ days. */
  reminderWhenDays: string;
  reminderWhenTomorrow: string;
  reminderWhenToday: string;
  lastCall: string;
  invite: string;
}

/** "21 Nov 2026" for one day, "21–23 Nov 2026" inside one month,
 *  "30 Nov – 2 Dec 2026" across months. Noon-local reads keep the
 *  civil date stable in every timezone (the festivalDayList law). */
export function datesLineFor(dateISO: string, endDateISO?: string): string {
  const fmt = (d: Date, parts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-IN', parts);
  const start = new Date(`${dateISO}T12:00:00`);
  if (!Number.isFinite(start.getTime())) return dateISO || '';
  const endISO = endDateISO && endDateISO !== dateISO ? endDateISO : '';
  const end = endISO ? new Date(`${endISO}T12:00:00`) : null;
  if (!end || !Number.isFinite(end.getTime())) {
    return fmt(start, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * Interpolate `{key}` tokens. A token whose value is missing or
 * blank is removed together with one adjacent separator space,
 * and the seams are cleaned (collapsed spaces, no space before
 * punctuation, no dangling dash) — the sentence degrades, the
 * placeholder never survives.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  let out = template || '';
  out = out.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = values[key];
    return typeof v === 'string' && v.trim() !== '' ? v : '';
  });
  out = out
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*[—–-]\s*([.;!?])/g, '$1')
    .replace(/ +([,.;!?:])/g, '$1')
    .replace(/([,;])(?=\S)/g, '$1 ')
    .replace(/:(?=[^\s/])/g, ': ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/(^|\n)\s*[—–-]\s*(?=\n|$)/g, '$1')
    .replace(/\s+([—–])\s*$/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
  return out;
}

/** The reminder's when-phrase: today / tomorrow / in N days. */
export function reminderWhen(daysBefore: number | null, s: OutreachStrings): string {
  if (daysBefore === null || !Number.isFinite(daysBefore)) return '';
  if (daysBefore <= 0) return s.reminderWhenToday;
  if (daysBefore === 1) return s.reminderWhenTomorrow;
  return fillTemplate(s.reminderWhenDays, { days: String(daysBefore) });
}

function baseValues(data: OutreachData): Record<string, string> {
  return {
    festival: data.festivalName || '',
    org: data.orgName || '',
    dates: data.datesLine || '',
    link: data.link || '',
  };
}

/** One ready message for a tone, from the festival's real data. */
export function buildOutreachMessage(
  tone: OutreachTone,
  data: OutreachData,
  s: OutreachStrings
): string {
  const values = baseValues(data);
  if (tone === 'reminder') {
    return fillTemplate(s.reminder, { ...values, when: reminderWhen(data.daysBefore, s) });
  }
  if (tone === 'lastcall') return fillTemplate(s.lastCall, values);
  return fillTemplate(s.announcement, values);
}

/** The devotee's personal invite (FestivalEventPage). */
export function buildInviteMessage(data: OutreachData, s: OutreachStrings): string {
  return fillTemplate(s.invite, baseValues(data));
}

/* ------------------------------------------------------------------ */
/* REAL-WORLD PACK — the Change pack                                   */
/* ------------------------------------------------------------------ */

/**
 * The organiser-supplied facts of a change of plan. Every line is
 * typed by the organiser in the War Room (a new date, a new venue,
 * a postponement note in their own words) — the app NEVER invents
 * a change. A blank line simply leaves its sentence out.
 */
export interface ChangeLines {
  newDates?: string;
  newVenue?: string;
  note?: string;
}

export interface ChangeStrings {
  /** "🙏 Namaskar — a change of plan for {festival} at {org}. {changeDates} {changeVenue} {note} Latest details: {link}" */
  change: string;
  /** "New dates: {value}." — composed only when the organiser supplied one. */
  changeDatesLine: string;
  /** "New venue: {value}." — composed only when the organiser supplied one. */
  changeVenueLine: string;
}

/**
 * The Change message: for people ALREADY BOOKED, sent by the
 * organiser from their own WhatsApp to their own contacts (the
 * panel says exactly that — nothing is delivered by the app).
 * Composed from the festival's real data plus the organiser's
 * change lines; a missing line degrades its sentence away under
 * the same no-placeholder law as every other pack.
 */
export function buildChangeMessage(
  data: OutreachData,
  lines: ChangeLines,
  s: ChangeStrings
): string {
  const newDates = (lines.newDates || '').trim();
  const newVenue = (lines.newVenue || '').trim();
  return fillTemplate(s.change, {
    ...baseValues(data),
    changeDates: newDates ? fillTemplate(s.changeDatesLine, { value: newDates }) : '',
    changeVenue: newVenue ? fillTemplate(s.changeVenueLine, { value: newVenue }) : '',
    note: (lines.note || '').trim(),
  });
}

/* ------------------------------------------------------------------ */
/* POLLS NEXT-LEVEL P2a — the Poll Reminder pack                       */
/* ------------------------------------------------------------------ */

/**
 * The facts of an open poll, for the committee's WhatsApp reminder.
 * Every value is real poll data: the question, the organisation,
 * when voting closes, and the poll's standing — its class and, for
 * a Decision poll, whether the house is bound by the result (the
 * P1 labelling law rides along: the standing is stated BEFORE the
 * vote, in the reminder too). The standing line is composed by the
 * caller from the dictionary (pulse / advisory / binding), so this
 * builder stays a pure interpolator like every other pack.
 */
export interface PollReminderData {
  pollTitle: string;
  orgName: string;
  /** Human closing line, e.g. "28 Nov 2026, 6:00 pm" ('' if none). */
  closesLine: string;
  /** The standing sentence (pulse / advisory / binding). */
  standingLine: string;
}

export interface PollReminderStrings {
  /** "🙏 Namaskar — {org} is asking: {poll} {standing} Voting closes {closes}. If you have not voted yet, please open Sanatani Bandhan and cast your vote from Polls on your Personal home." */
  pollReminder: string;
}

/**
 * The committee's WhatsApp voting reminder: composed here, sent by
 * the organiser from their OWN WhatsApp to people they choose
 * there — the panel carries the standing honesty line, and the app
 * sends nothing. It pairs with the in-app reminder (lib/memberPolls):
 * the in-app one suppresses itself on the devices of members who
 * already voted; this one reaches the organiser's own contacts.
 */
export function buildPollReminderMessage(
  data: PollReminderData,
  s: PollReminderStrings
): string {
  return fillTemplate(s.pollReminder, {
    poll: data.pollTitle || '',
    org: data.orgName || '',
    closes: data.closesLine || '',
    standing: data.standingLine || '',
  });
}

/** Whole days from now until the festival's first moment — the
 *  same clock the rules use (lib/eventTickets' festival clock). */
export function daysBeforeFor(dateISO: string, nowMs: number): number {
  return daysBeforeFestival(startMsFor(dateISO), nowMs);
}

/** The wa.me deep link: opens the sender's own WhatsApp with the
 *  message ready; the sender picks the recipients there. */
export function whatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
