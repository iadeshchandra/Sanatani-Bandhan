/**
 * Sanatani Bandhan — Sacred Document Design System
 *
 * "Sacred document, not corporate form." A temple receipt should feel like
 * prasad — something the devotee keeps, frames, or treasures.
 *
 * This module holds every design token used by the pdfmake-based PDF engine
 * (src/utils/pdfSanatani.ts). Colours, typography, borders, invocations,
 * blessings, and bilingual label helpers.
 *
 * Phase B of the PDF engine roadmap. $0, offline, MIT-compatible.
 */

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */

export const SANATANI_COLORS = {
  /** Deep Saffron — headers, primary accents, borders */
  saffron: '#E8590C',
  /** Temple Gold — dividers, highlights, secondary borders */
  gold: '#F59E0B',
  /** Kumkum Red — auspicious marks, seals, important stamps */
  kumkum: '#C92A2A',
  /** Sacred Cream — backgrounds, content areas */
  cream: '#FFF8E7',
  /** Dark Umber — body text (warmer than black) */
  umber: '#3E2723',
  /** Sandalwood — subtle backgrounds, watermarks */
  sandalwood: '#D4A574',
  /** Muted stone for secondary text */
  stone: '#78716C',
  /** Pure white for contrast areas */
  white: '#FFFFFF',
} as const;

/* ------------------------------------------------------------------ */
/*  Typography                                                         */
/* ------------------------------------------------------------------ */

/**
 * Font stacks for pdfmake's `fonts` config.
 *
 * pdfmake needs TTF files registered. The font NAMES below are what the
 * document definitions reference; the actual TTF loading happens in
 * pdfSanatani.ts (see FONT_LOADING_GUIDE there).
 *
 * Required TTFs (all SIL Open Font License, self-host in /public/fonts/):
 *  - NotoSans-Regular.ttf / NotoSans-Bold.ttf            (Latin body)
 *  - NotoSansDevanagari-Regular.ttf / -Bold.ttf          (Devanagari body)
 *  - NotoSansBengali-Regular.ttf / -Bold.ttf             (Bengali body)
 *  - NotoSansTamil-Regular.ttf / -Bold.ttf               (Tamil body)
 *  - TiroDevanagariHindi-Regular.ttf                     (sacred headings)
 */
export const SANATANI_FONTS = {
  /** Clean sans for Latin body text */
  body: 'NotoSans',
  /** Devanagari body — donor names, Hindi labels */
  devanagari: 'NotoSansDevanagari',
  /** Bengali body */
  bengali: 'NotoSansBengali',
  /** Tamil body */
  tamil: 'NotoSansTamil',
  /** Sacred serif for mantras, invocations, headings */
  sacred: 'TiroDevanagari',
} as const;

/**
 * Map an app language code to the pdfmake font that renders its script.
 * Falls back to Devanagari for Sanskrit, Latin for English.
 */
export function fontForLanguage(langCode: string): string {
  switch (langCode) {
    case 'hi':
    case 'mr':
    case 'sa':
      return SANATANI_FONTS.devanagari;
    case 'bn':
      return SANATANI_FONTS.bengali;
    case 'ta':
      return SANATANI_FONTS.tamil;
    case 'te':
    case 'kn':
    case 'ml':
    case 'gu':
      // Phase B ships Devanagari + Bengali + Tamil. Telugu/Kannada/Malayalam/
      // Gujarati fall back to Devanagari-shaped Latin until their TTFs land.
      // (See FONT_LOADING_GUIDE in pdfSanatani.ts for adding more scripts.)
      return SANATANI_FONTS.devanagari;
    default:
      return SANATANI_FONTS.body;
  }
}

/* ------------------------------------------------------------------ */
/*  Sacred text (never translated)                                     */
/* ------------------------------------------------------------------ */

export const INVOCATION_DEFAULT = '॥ श्री गणेशाय नमः ॥';
export const BLESSING_DEFAULT = '॥ सर्वे भवन्तु सुखिनः ॥';
export const OM = 'ॐ';

/**
 * Resolve the invocation line for a workspace.
 * Trusts can configure their own in Settings → Legal/Branding;
 * falls back to the default Ganesh invocation.
 */
export function invocationFor(workspace: any): string {
  return workspace?.pdfInvocation || workspace?.invocationMantra || INVOCATION_DEFAULT;
}

/**
 * Resolve the footer blessing for a workspace.
 */
export function blessingFor(workspace: any): string {
  return workspace?.pdfBlessing || workspace?.blessingMantra || BLESSING_DEFAULT;
}

/* ------------------------------------------------------------------ */
/*  Bilingual labels                                                   */
/* ------------------------------------------------------------------ */

/**
 * A bilingual label: English (legal precision) + Devanagari (soul).
 * Returns a pdfmake-compatible stacked text node.
 *
 * Example: bilingual('Donor Name', 'दाता का नाम')
 */
export function bilingual(en: string, dev: string): any {
  return {
    stack: [
      { text: en, font: SANATANI_FONTS.body, fontSize: 7, color: SANATANI_COLORS.stone, margin: [0, 0, 0, 1] },
      { text: dev, font: SANATANI_FONTS.devanagari, fontSize: 8, color: SANATANI_COLORS.umber },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Decorative elements                                                */
/* ------------------------------------------------------------------ */

/**
 * Lotus-petal divider: ❁ ❁ ❁ centred, in temple gold.
 * A lightweight sacred divider that needs no images.
 */
export function lotusDivider(): any {
  return {
    text: '❁   ❁   ❁',
    alignment: 'center',
    font: SANATANI_FONTS.body,
    fontSize: 10,
    color: SANATANI_COLORS.gold,
    margin: [0, 6, 0, 6],
  };
}

/**
 * Triple border via nested tables (pdfmake has no multi-border primitive).
 * Outer thin gold → middle saffron → inner thin gold, with Om corner motifs.
 *
 * Usage: wrap your page content: buildTripleBorder(contentArray)
 */
export function tripleBorder(content: any[]): any {
  const omCorner = {
    text: OM,
    font: SANATANI_FONTS.devanagari,
    fontSize: 9,
    color: SANATANI_COLORS.gold,
    alignment: 'center' as const,
  };
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          {
            columns: [
              omCorner,
              {
                stack: [
                  {
                    table: {
                      widths: ['*'],
                      body: [[{
                        stack: [
                          {
                            table: {
                              widths: ['*'],
                              body: [[{ stack: content }]],
                            },
                            layout: {
                              hLineWidth: () => 0.5,
                              vLineWidth: () => 0.5,
                              hLineColor: () => SANATANI_COLORS.gold,
                              vLineColor: () => SANATANI_COLORS.gold,
                              paddingLeft: () => 10,
                              paddingRight: () => 10,
                              paddingTop: () => 10,
                              paddingBottom: () => 10,
                            },
                          },
                        ],
                      }]],
                    },
                    layout: {
                      hLineWidth: () => 1.5,
                      vLineWidth: () => 1.5,
                      hLineColor: () => SANATANI_COLORS.saffron,
                      vLineColor: () => SANATANI_COLORS.saffron,
                      paddingLeft: () => 4,
                      paddingRight: () => 4,
                      paddingTop: () => 4,
                      paddingBottom: () => 4,
                    },
                  },
                ],
              },
              omCorner,
            ],
            columnGap: 6,
          },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => SANATANI_COLORS.gold,
      vLineColor: () => SANATANI_COLORS.gold,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
  };
}

/**
 * Sacred header block: trust name, invocation, optional logo handled by
 * the caller (pdfmake images need data URLs — see pdfSanatani.ts).
 */
export function sacredHeader(opts: {
  trustName: string;
  trustAddress?: string;
  metaLine?: string;
  invocation?: string;
}): any {
  return {
    stack: [
      {
        text: opts.trustName.toUpperCase(),
        font: SANATANI_FONTS.body,
        fontSize: 16,
        bold: true,
        color: SANATANI_COLORS.saffron,
        alignment: 'center',
        margin: [0, 0, 0, 2],
      },
      {
        text: opts.invocation || INVOCATION_DEFAULT,
        font: SANATANI_FONTS.sacred,
        fontSize: 11,
        color: SANATANI_COLORS.kumkum,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      ...(opts.trustAddress ? [{
        text: opts.trustAddress,
        font: SANATANI_FONTS.body,
        fontSize: 8,
        color: SANATANI_COLORS.stone,
        alignment: 'center',
        margin: [0, 0, 0, 2],
      }] : []),
      ...(opts.metaLine ? [{
        text: opts.metaLine,
        font: SANATANI_FONTS.body,
        fontSize: 7.5,
        bold: true,
        color: SANATANI_COLORS.umber,
        alignment: 'center',
        margin: [0, 0, 0, 2],
      }] : []),
      lotusDivider(),
    ],
    margin: [0, 0, 0, 8],
  };
}

/**
 * Sacred footer: blessing mantra + doc ref + generator credit.
 */
export function sacredFooter(opts: { blessing?: string; docRef?: string }): any {
  return {
    stack: [
      lotusDivider(),
      {
        text: opts.blessing || BLESSING_DEFAULT,
        font: SANATANI_FONTS.sacred,
        fontSize: 10,
        color: SANATANI_COLORS.kumkum,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      {
        text: [
          ...(opts.docRef ? [{ text: opts.docRef + '   |   ', fontSize: 6.5 } as any] : []),
          { text: 'Generated by Sanatani Bandhan', fontSize: 6.5 } as any,
        ],
        font: SANATANI_FONTS.body,
        color: SANATANI_COLORS.stone,
        alignment: 'center',
      },
    ],
    margin: [0, 10, 0, 0],
  };
}

/**
 * Amount display box: large tabular figure + words below.
 * Money ALWAYS uses Latin digits (never Devanagari numerals).
 */
export function amountBox(amount: number, amountInWords: string): any {
  const formatted = '₹' + amount.toLocaleString('en-IN');
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          {
            text: formatted,
            font: SANATANI_FONTS.body,
            fontSize: 20,
            bold: true,
            color: SANATANI_COLORS.saffron,
            alignment: 'center',
          },
          {
            text: amountInWords,
            font: SANATANI_FONTS.body,
            fontSize: 9,
            italics: true,
            color: SANATANI_COLORS.umber,
            alignment: 'center',
            margin: [0, 4, 0, 0],
          },
        ],
        margin: [0, 8, 0, 8],
      }]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => SANATANI_COLORS.gold,
      vLineColor: () => SANATANI_COLORS.gold,
      fillColor: () => SANATANI_COLORS.cream,
    },
    margin: [0, 6, 0, 6],
  };
}

/**
 * Key-value detail grid (donor info, receipt meta).
 * Cream rows with saffron left accent via cell styling.
 */
export function detailGrid(rows: Array<[any, any]>): any {
  return {
    table: {
      widths: ['35%', '65%'],
      body: rows.map(([label, value]) => [
        { text: label, font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.umber },
        { stack: Array.isArray(value) ? value : [{ text: String(value), font: SANATANI_FONTS.body, fontSize: 8.5, color: SANATANI_COLORS.umber }] },
      ]),
    },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === rows.length ? 0.5 : 0.25),
      vLineWidth: () => 0,
      hLineColor: () => SANATANI_COLORS.sandalwood,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? SANATANI_COLORS.cream : SANATANI_COLORS.white),
    },
    margin: [0, 4, 0, 4],
  };
}

/**
 * Section title: small caps, letter-spaced, deep saffron.
 * pdfmake has no letter-spacing; we fake it with spaces.
 */
export function sectionTitle(en: string, dev?: string): any {
  const spaced = en.toUpperCase().split('').join(' ');
  return {
    stack: [
      { text: spaced, font: SANATANI_FONTS.body, fontSize: 9, bold: true, color: SANATANI_COLORS.saffron, margin: [0, 8, 0, 1] },
      ...(dev ? [{ text: dev, font: SANATANI_FONTS.devanagari, fontSize: 9, color: SANATANI_COLORS.umber, margin: [0, 0, 0, 4] }] : []),
    ],
  };
}
