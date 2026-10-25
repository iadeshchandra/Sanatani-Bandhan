/**
 * vibeBatch3.render.test.tsx — VIBE B3 render gates (SSR, node env).
 *
 * · The temple-acknowledgment card renders the record's REAL fields —
 *   org, brass amount, receipt number, the engine's tithi for the
 *   record's date, the blessing — and renders NO row for a field the
 *   record does not carry (no invented receipt numbers, ever).
 * · The mala thread renders beads in order; beads at/after the break
 *   carry the broken class and the break label appears exactly once;
 *   an intact chain shows no broken bead. MalaStrip windows a long
 *   chain around its break.
 * · SandhyaSettings offers the three choices in the user's language
 *   (dictionary-voiced), defaulting to Off.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { core as enCore } from '../i18n/lang/en/core';

const dict: Record<string, unknown> = enCore as unknown as Record<string, unknown>;
const resolveKey = (key: string): string => {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)?.[part];
  }
  return typeof node === 'string' ? node : key;
};

jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => resolveKey(key),
    safeTranslate: (key: string, en: string) =>
      resolveKey(key) !== key ? resolveKey(key) : en,
    currentLang: 'en',
    rt: (key: string) => key,
  }),
}));

jest.mock('../components/common/PanchangHeader', () => ({
  useSanctumLite: () => false,
}));

// OrgLogo pulls the org-branding store (firebase) — the card's tests
// assert on fields and classes, not on the monogram artwork.
jest.mock('../components/common/OrgLogo', () => ({
  OrgLogo: () => null,
}));

import {
  TempleReceiptCard,
  tithiForDate,
  type TempleReceiptData,
} from '../components/common/TempleReceiptCard';
import { MalaThread, MalaStrip, type MalaBead } from '../components/common/MalaThread';
import { SandhyaSettings } from '../components/common/SandhyaSettings';

const FULL: TempleReceiptData = {
  orgName: 'Kashi Vishwanath Mandir Trust',
  donorName: 'Meera Devi',
  amount: 1100,
  currencySymbol: '₹',
  dateISO: '2026-10-25',
  purpose: 'Annadanam',
  paymentMode: 'UPI / QR',
  receiptNo: 'SB-80G-248913',
};

describe('TempleReceiptCard — the acknowledgment, from the record', () => {
  it('renders org, brass amount, receipt no, tithi, donor, mode, blessing', () => {
    const html = renderToString(<TempleReceiptCard data={FULL} />);
    expect(html).toContain('Kashi Vishwanath Mandir Trust');
    expect(html).toContain('₹1,100');
    expect(html).toContain('SB-80G-248913');
    expect(html).toContain('Meera Devi');
    expect(html).toContain('UPI / QR');
    expect(html).toContain('Annadanam');
    expect(html).toContain('Temple Acknowledgment');
    // the tithi line is the engine's own reading of 2026-10-25
    expect(html).toContain(tithiForDate('2026-10-25'));
    expect(html).toContain('received with gratitude');
    expect(html).toContain('Share receipt');
    expect(html).toContain('receipt-paper');
  });

  it('renders NO row for a field the record does not carry', () => {
    const bare: TempleReceiptData = {
      orgName: 'Anand Ashram',
      amount: 251,
      currencySymbol: '₹',
      dateISO: '2026-10-25',
    };
    const html = renderToString(<TempleReceiptCard data={bare} />);
    expect(html).toContain('Anand Ashram');
    expect(html).toContain('₹251');
    expect(html).not.toContain('Receipt No.');
    expect(html).not.toContain('Offered by');
    expect(html).not.toContain('Offered via');
    expect(html).not.toContain('undefined');
  });
});

const BEADS: MalaBead[] = [0, 1, 2, 3].map((i) => ({
  id: `ev-${i}`,
  seqLabel: `#${i + 1}`,
  title: `Event ${i + 1}`,
  hashShort: `hash${i}`,
}));

describe('MalaThread — the unbroken mala, and the honest break', () => {
  it('an intact chain: beads in order, no broken bead, no break label', () => {
    const html = renderToString(
      <MalaThread beads={BEADS} breakLabel="The thread breaks here" />
    );
    expect(html).toContain('mala-thread');
    expect(html).not.toContain('mala-bead-broken');
    expect(html).not.toContain('The thread breaks here');
    expect(html.indexOf('Event 1')).toBeLessThan(html.indexOf('Event 4'));
  });

  it('a broken chain: beads at/after the break hollow out; label once', () => {
    const beads = BEADS.map((b, i) => ({ ...b, broken: i >= 2 }));
    const html = renderToString(
      <MalaThread beads={beads} breakLabel="The thread breaks here" />
    );
    expect(html).toContain('mala-bead-broken');
    expect(html).toContain('mala-segment-broken');
    expect(html.split('The thread breaks here').length - 1).toBe(1);
  });

  it('MalaStrip windows a long chain around the break', () => {
    const html = renderToString(<MalaStrip total={200} brokenAt={150} />);
    expect(html).toContain('mala-strip-bead-break');
    expect(html).toContain('···');
    const intact = renderToString(<MalaStrip total={200} brokenAt={-1} />);
    expect(intact).not.toContain('mala-strip-bead-broken');
    expect(renderToString(<MalaStrip total={0} brokenAt={-1} />)).toBe('');
  });
});

describe('SandhyaSettings — three choices, dictionary-voiced', () => {
  it('renders Off / On / Automatic at dusk with the honest note', () => {
    const html = renderToString(<SandhyaSettings />);
    expect(html).toContain('Sandhya Mode');
    expect(html).toContain('Automatic at dusk');
    expect(html).toContain('5:30 PM');
    expect(html).toContain('aria-checked="true"'); // one choice selected (Off by default)
  });
});
