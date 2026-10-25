/**
 * icsExport.ts — ONE shared calendar (.ics) exporter (EVENTS P1).
 * =====================================================================
 * Until this module, the only .ics export in the app lived inside the
 * legacy Vedic Calendar desk and worked only on that desk's
 * non-persisted, in-memory list. Every event surface — org public
 * page, festival page, Sangam, Solo, Utsav — now builds its calendar
 * file through here, so a devotee's family calendar receives the
 * same truth whichever door they came through.
 *
 * RFC 5545 shape: CRLF lines, escaped text, UTC DTSTAMP, floating or
 * date values as appropriate, and a real RRULE line for recurring
 * series (from lib/eventRecurrence — the same rule the surfaces
 * expand for display, so the calendar and the app agree).
 */
import {
  occurrenceStartMs,
  recurrenceRRule,
  type RecurrenceRule,
} from './eventRecurrence';

export interface IcsEventInput {
  /** Stable unique id for the calendar entry. */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  /** All-day / civil-date form: YYYY-MM-DD (+ optional HH:MM time). */
  date?: string;
  time?: string;
  /** Inclusive last day for multi-day all-day events (YYYY-MM-DD). */
  endDate?: string;
  /** Timed form: epoch ms (takes precedence over date/time). */
  startMs?: number;
  endMs?: number;
  recurrence?: RecurrenceRule;
}

const CRLF = '\r\n';

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets (RFC 5545 §3.1), UTF-8 aware enough for our scripts. */
const utf8Octets = (s: string): number => new TextEncoder().encode(s).length;
const glyphOctets = (cp: number): number => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

function foldLine(line: string): string {
  // RFC 5545 folds at 75 OCTETS, not characters — a Devanagari or
  // Bengali title reaches the limit in far fewer glyphs. Walk code
  // points, accumulating UTF-8 byte length, never splitting one.
  if (utf8Octets(line) <= 75) return line;
  const out: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const room = first ? 75 : 74; // continuation lines spend 1 octet on the leading space
    let bytes = 0;
    let cut = 0;
    for (const ch of rest) {
      const b = glyphOctets(ch.codePointAt(0)!);
      if (bytes + b > room) break;
      bytes += b;
      cut += ch.length;
    }
    if (cut === 0) cut = 1; // a single glyph wider than the room (cannot happen ≤4 octets, but never loop forever)
    out.push((first ? '' : ' ') + rest.slice(0, cut));
    rest = rest.slice(cut);
    first = false;
  }
  return out.join(CRLF);
}

function utcStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function dateValue(iso: string): string {
  return iso.replace(/-/g, '');
}

/** The day after a YYYY-MM-DD civil date (all-day DTEND is exclusive). */
export function dayAfterISO(iso: string): string {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d + 1, 12);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(dt.getFullYear(), 4)}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** Build one VEVENT block (no calendar wrapper). Exported for tests. */
export function buildIcsEvent(ev: IcsEventInput, nowMs: number): string | null {
  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(`UID:${ev.uid}@sanatanibandhan`);
  lines.push(`DTSTAMP:${utcStamp(nowMs)}`);

  if (typeof ev.startMs === 'number' && Number.isFinite(ev.startMs)) {
    lines.push(`DTSTART:${utcStamp(ev.startMs)}`);
    const end = typeof ev.endMs === 'number' && ev.endMs > ev.startMs ? ev.endMs : ev.startMs + 3600000;
    lines.push(`DTEND:${utcStamp(end)}`);
    if (ev.recurrence && ev.date) {
      const rr = recurrenceRRule(ev.date, ev.recurrence);
      if (rr) lines.push(rr);
    }
  } else if (ev.date) {
    if (ev.time) {
      const startMs = occurrenceStartMs(ev.date, ev.time);
      if (!Number.isFinite(startMs)) return null;
      lines.push(`DTSTART:${utcStamp(startMs)}`);
      lines.push(`DTEND:${utcStamp(startMs + 3600000)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${dateValue(dayAfterISO(ev.endDate && ev.endDate >= ev.date ? ev.endDate : ev.date))}`);
    }
    if (ev.recurrence) {
      const rr = recurrenceRRule(ev.date, ev.recurrence);
      if (rr) lines.push(rr);
    }
  } else {
    return null;
  }

  lines.push(`SUMMARY:${escapeText(ev.title || 'Event')}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  lines.push('END:VEVENT');
  return lines.map(foldLine).join(CRLF);
}

/** Build a complete VCALENDAR document from event inputs (invalid ones are skipped). */
export function buildIcsCalendar(events: IcsEventInput[], nowMs: number = Date.now()): string {
  const blocks = events
    .map((ev) => buildIcsEvent(ev, nowMs))
    .filter((b): b is string => b !== null);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sanatani Bandhan//Events//EN',
    'CALSCALE:GREGORIAN',
    ...blocks,
    'END:VCALENDAR',
  ].join(CRLF) + CRLF;
}

/** Browser download of an .ics payload (no-op outside the browser). */
export function downloadIcs(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Filesystem-safe base name for a download. */
export function icsFileName(title: string): string {
  const base = (title || 'event').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${base || 'event'}.ics`;
}
