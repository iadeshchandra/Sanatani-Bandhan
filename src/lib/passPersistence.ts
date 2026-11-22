/**
 * passPersistence.ts — NEXT-LEVEL A2: the pass stops being a lost link.
 * =====================================================================
 * A devotee's booking used to live only as a page they had to find
 * again. This module gives it two durable homes:
 *
 *  1. THEIR CALENDAR — booking-scoped calendar entries built on the
 *     ONE shared ICS machinery (lib/icsExport): one all-day VEVENT
 *     per BOOKED day (the booking is day-scoped — the pass itself is
 *     minted per day and the gate admits per day), plus a Google
 *     Calendar template link. Google template links carry exactly
 *     ONE event, so the link spans first→last booked day as a single
 *     all-day event — the same span shape the festival page's own
 *     ICS export has always used for a festival. The .ics download
 *     is the exact-days artefact; the Google link is the one-tap
 *     artefact. No times are ever invented: festival timings are
 *     free-form programme labels ("6:30 PM" aarti lines), not a
 *     machine start time, so every entry here is all-day — exactly
 *     as the existing festival export already models them.
 *
 *  2. A SAVED PASS IMAGE — a keepsake picture composed on a plain
 *     canvas (no new dependency): ivory ground, the festival facts,
 *     and the pass's REAL QR image (the very data URL the card
 *     minted — drawn, never re-encoded, so the picture can never
 *     carry a different payload than the live pass). The image
 *     prints its own honesty line: the living pass refreshes, and
 *     the gate may ask to see it in the app. When the day is already
 *     admitted there is no live code to draw — the image carries
 *     the admitted stamp instead, mirroring the card.
 *
 * There is deliberately NO "Google Wallet" / "Apple Wallet" button
 * anywhere in this batch: a wallet pass needs an issuer account
 * that does not exist yet (Wave B). These are the honest
 * equivalents that work today, on the floor devices too (canvas 2d
 * only, no OffscreenCanvas).
 *
 * The pure parts (booked days, ICS inputs, the Google URL, image
 * lines/layout/filename) are unit-tested without a DOM; the canvas
 * composition and the share/download delivery are thin DOM shells
 * over them, following the app's RequestQR/fileVault idioms.
 */
import { rsvpAttendsDay } from './eventPass';
import { dayAfterISO, type IcsEventInput } from './icsExport';
import type { RsvpEntry } from './festival';

/* ------------------------------------------------------------------ */
/* Booked days                                                         */
/* ------------------------------------------------------------------ */

/**
 * The festival days this booking actually attends, in festival
 * order. A record with no `days` attends every day (EVENTS P1);
 * stray day strings outside the festival never survive.
 */
export function bookedDaysFor(
  rsvp: Pick<RsvpEntry, 'days'>,
  festivalDays: readonly string[]
): string[] {
  return festivalDays.filter((d) => rsvpAttendsDay(rsvp, d, festivalDays));
}

/* ------------------------------------------------------------------ */
/* Calendar facts → ICS inputs + Google template link                  */
/* ------------------------------------------------------------------ */

export interface BookingCalendarFacts {
  /** Published festival_events doc id. */
  eventId: string;
  festivalName: string;
  orgName: string;
  /** REAL-WORLD PACK venue, when the record carries one. */
  venue?: string;
  /** The canonical public festival page URL. */
  link: string;
  /** Booked days (YYYY-MM-DD), in order. */
  days: string[];
  /**
   * A localised one-liner about the booking itself (e.g. the party
   * line) — composed by the caller, which owns the dictionary.
   */
  noteLine?: string;
}

function bookingDescription(facts: BookingCalendarFacts): string {
  const lines = [facts.noteLine, facts.link].filter(
    (s): s is string => typeof s === 'string' && s.trim() !== ''
  );
  return lines.join('\n');
}

function bookingLocation(facts: BookingCalendarFacts): string {
  return facts.venue && facts.venue.trim() !== '' ? facts.venue : facts.orgName;
}

/**
 * One all-day VEVENT input per booked day — the booking's exact
 * days, each with its own uid, ready for lib/icsExport's
 * buildIcsCalendar. Location is the venue when the record carries
 * one, else the organising body's name (the festival export's own
 * convention). The description carries the booking note and the
 * festival page link — facts only.
 */
export function bookingIcsInputs(facts: BookingCalendarFacts): IcsEventInput[] {
  const description = bookingDescription(facts);
  const location = bookingLocation(facts);
  return facts.days
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((day) => ({
      uid: `booking-${facts.eventId}-${day}`,
      title: facts.festivalName,
      date: day,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
    }));
}

const GOOGLE_CALENDAR_TEMPLATE = 'https://calendar.google.com/calendar/render';

/**
 * The Google Calendar template link for this booking. A template
 * link carries ONE event, so the booking becomes a single all-day
 * span from its first to its last booked day (end exclusive — the
 * day after the last day), the span shape the festival ICS export
 * already uses. Returns '' when the booking has no valid day.
 */
export function googleCalendarUrl(facts: BookingCalendarFacts): string {
  const days = facts.days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (days.length === 0) return '';
  const first = days[0];
  const last = days[days.length - 1];
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: facts.festivalName || 'Festival',
    dates: `${first.replace(/-/g, '')}/${dayAfterISO(last).replace(/-/g, '')}`,
  });
  const description = bookingDescription(facts);
  if (description) params.set('details', description);
  const location = bookingLocation(facts);
  if (location) params.set('location', location);
  return `${GOOGLE_CALENDAR_TEMPLATE}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Pass image — pure spec                                              */
/* ------------------------------------------------------------------ */

/** 4:5 portrait — generous on a phone, modest enough for the floor. */
export const PASS_IMAGE_WIDTH = 1080;
export const PASS_IMAGE_HEIGHT = 1350;

export interface PassImageLayout {
  width: number;
  height: number;
  /** Inset of the dashed inner border. */
  borderInset: number;
  /** Height of the saffron band across the top. */
  bandHeight: number;
  /** Square QR tile (white ground) size and position. */
  qrSize: number;
  qrX: number;
  qrY: number;
  /** Horizontal centre every centred line hangs on. */
  centerX: number;
  /** Text measure width for wrapped lines. */
  textWidth: number;
}

/** Deterministic geometry for the pass image. Pure. */
export function passImageLayout(): PassImageLayout {
  const width = PASS_IMAGE_WIDTH;
  const height = PASS_IMAGE_HEIGHT;
  const qrSize = 620;
  return {
    width,
    height,
    borderInset: 36,
    bandHeight: 26,
    qrSize,
    qrX: (width - qrSize) / 2,
    qrY: 470,
    centerX: width / 2,
    textWidth: width - 180,
  };
}

export interface PassImageContent {
  /** Localised pass title ("Your event pass"). */
  passTitle: string;
  festivalName: string;
  orgName: string;
  /** Human date line for the pass day, composed by the caller. */
  dateLabel: string;
  /** Localised party line ("Ananda · party of 4"). */
  partyLine: string;
  /** The honesty line printed on the image itself (localised). */
  noteLine: string;
  /** Brand line — the app's name, a proper noun in every language. */
  brandLine: string;
  /** True when the gate has already admitted this party today. */
  admitted: boolean;
  /** Localised admitted stamp text (used when admitted). */
  admittedLabel: string;
}

export interface PassImageLines {
  header: string;
  title: string;
  sub: string;
  party: string;
  /** The stamp text when admitted; null while the pass is live. */
  stamp: string | null;
  note: string;
  brand: string;
}

/** The logical text lines of the image, in draw order. Pure. */
export function passImageLines(content: PassImageContent): PassImageLines {
  return {
    header: content.passTitle,
    title: content.festivalName,
    sub: `${content.orgName} · ${content.dateLabel}`,
    party: content.partyLine,
    stamp: content.admitted ? content.admittedLabel : null,
    note: content.noteLine,
    brand: content.brandLine,
  };
}

/** Filesystem-safe PNG name for the saved pass image. Pure. */
export function passImageFileName(festivalNameEn: string, dateISO: string): string {
  const base = (festivalNameEn || 'festival')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? `-${dateISO}` : '';
  return `sanatani-pass-${base || 'festival'}${day}.png`;
}

/* ------------------------------------------------------------------ */
/* Pass image — DOM composition + delivery (thin shells)               */
/* ------------------------------------------------------------------ */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}

/** Wrap `text` to `maxWidth` by the canvas' own measure. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line);
      line = w;
      if (out.length >= maxLines) return out;
    } else {
      line = next;
    }
  }
  if (line && out.length < maxLines) out.push(line);
  return out;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Compose the pass image file. Draws the pass's REAL QR data URL
 * (never a re-encode); in the admitted state draws the stamp
 * instead — an admitted pass has no live code, and the picture
 * must not pretend otherwise. Throws on any failure; the caller
 * fails soft (the live pass on screen is untouched).
 */
export async function composePassImageFile(
  content: PassImageContent,
  qrDataUrl: string,
  fileName: string
): Promise<File> {
  if (typeof document === 'undefined') throw new Error('no-document');
  const layout = passImageLayout();
  const lines = passImageLines(content);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');

  // Warm ivory ground + saffron band + the card's dashed border.
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(0, 0, layout.width, layout.bandHeight);
  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 14]);
  ctx.strokeRect(
    layout.borderInset,
    layout.borderInset,
    layout.width - layout.borderInset * 2,
    layout.height - layout.borderInset * 2
  );
  ctx.setLineDash([]);

  const cx = layout.centerX;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Header — the pass title. (No manual letterspacing: splitting
  // the string would tear Indic combining marks apart.)
  ctx.fillStyle = '#C2410C';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.fillText(lines.header.toUpperCase(), cx, 148);

  // Festival name — up to two wrapped lines.
  ctx.fillStyle = '#1C1917';
  ctx.font = '900 62px system-ui, sans-serif';
  const titleLines = wrapLines(ctx, lines.title, layout.textWidth, 2);
  titleLines.forEach((ln, i) => ctx.fillText(ln, cx, 232 + i * 72));

  // Org · date, then the party.
  ctx.fillStyle = '#78716C';
  ctx.font = '700 38px system-ui, sans-serif';
  ctx.fillText(lines.sub, cx, 232 + titleLines.length * 72 + 26);
  ctx.fillStyle = '#44403C';
  ctx.font = '800 44px system-ui, sans-serif';
  const partyBaseline = 232 + titleLines.length * 72 + 96;
  ctx.fillText(lines.party, cx, partyBaseline);

  // The code tile starts below the party line — a two-line festival
  // name pushes it down (the layout's qrY is the one-line floor).
  const qrTop = Math.max(layout.qrY, partyBaseline + 30);

  if (lines.stamp !== null) {
    // Admitted: the emerald stamp stands where the code would be.
    const stampH = 300;
    ctx.fillStyle = '#059669';
    roundRectPath(ctx, layout.qrX, qrTop, layout.qrSize, stampH, 36);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 130px system-ui, sans-serif';
    ctx.fillText('✓', cx, qrTop + 150);
    ctx.font = '900 46px system-ui, sans-serif';
    wrapLines(ctx, lines.stamp, layout.qrSize - 60, 2).forEach((ln, i) =>
      ctx.fillText(ln, cx, qrTop + 226 + i * 54)
    );
  } else {
    // The white tile + the pass's own QR image, drawn as minted.
    if (!qrDataUrl) throw new Error('qr-not-ready');
    const qr = await loadImage(qrDataUrl);
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, layout.qrX, qrTop, layout.qrSize, layout.qrSize, 36);
    ctx.fill();
    const pad = 28;
    ctx.drawImage(qr, layout.qrX + pad, qrTop + pad, layout.qrSize - pad * 2, layout.qrSize - pad * 2);
  }

  // The honesty line, printed on the picture itself.
  ctx.fillStyle = '#78716C';
  ctx.font = '600 33px system-ui, sans-serif';
  wrapLines(ctx, lines.note, layout.textWidth, 3).forEach((ln, i) =>
    ctx.fillText(ln, cx, layout.height - 196 + i * 44)
  );

  // Brand.
  ctx.fillStyle = '#C2410C';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText(`🪔 ${lines.brand}`, cx, layout.height - 84);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('png-export-failed');
  return new File([blob], fileName, { type: 'image/png' });
}

export type ImageDelivery = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Hand the image to the devotee: the native share sheet with the
 * file where the platform supports it (the RequestQR/fileVault
 * idiom), else a plain download. A dismissed share sheet is a
 * cancellation, not a failure.
 */
export async function shareOrDownloadImageFile(
  file: File,
  title: string,
  text: string
): Promise<ImageDelivery> {
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      // A share that fails for another reason still owes the
      // devotee the picture — fall through to the download.
    }
  }
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return 'failed';
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
