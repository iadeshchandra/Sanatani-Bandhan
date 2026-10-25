/**
 * vibeBatch3.test.ts — VIBE B3 (paper/polish pass) logic gates.
 *
 * 1. Sandhya state machine: mode × clock matrix against FIXED Date
 *    fixtures (the shipped code never fakes a clock — these are the
 *    pure function's inputs), persistence via an injected storage,
 *    garbage in storage → the honest default 'off'.
 * 2. Receipt honesty: the share text and the tithi line are built
 *    ONLY from the record's own fields + the canonical engine's
 *    reading of the record's own date (engine-equality pin, the B2
 *    panjika pattern) — absent fields produce absent lines, never
 *    invented ones.
 * 3. CSS contract: the Sandhya block, the mala classes and the
 *    receipt-paper fixed colours exist in index.css; the boot splash
 *    is untouched by the dusk theme (no data-sandhya styling reaches
 *    the splash markup in index.html beyond the attribute script).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  isSandhyaActive,
  getSandhyaMode,
  storeSandhyaMode,
  DUSK_START_MIN,
  DUSK_END_MIN,
  SANDHYA_STORAGE_KEY,
  type StorageLike,
} from '../sandhyaMode';
import {
  buildReceiptShareText,
  tithiForDate,
  parseRecordDate,
  type TempleReceiptData,
  type ReceiptLabels,
} from '../../components/common/TempleReceiptCard';
import { calculatePanchang } from '../../utils/panchang';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

// OrgLogo pulls the org-branding store (firebase ESM) — irrelevant to
// the pure helpers under test here.
jest.mock('../../components/common/OrgLogo', () => ({ OrgLogo: () => null }));

// LanguageContext pulls the Firestore-backed translation overrides —
// the helpers under test never call it (only the component does).
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const at = (h: number, m: number) => new Date(2026, 9, 25, h, m);

describe('Sandhya Mode — the dusk window, honestly bounded', () => {
  it('off is never active; on is always active', () => {
    for (const d of [at(0, 0), at(12, 0), at(18, 0), at(23, 59)]) {
      expect(isSandhyaActive('off', d)).toBe(false);
      expect(isSandhyaActive('on', d)).toBe(true);
    }
  });

  it('auto is active exactly inside 17:30–21:00 local', () => {
    expect(DUSK_START_MIN).toBe(17 * 60 + 30);
    expect(DUSK_END_MIN).toBe(21 * 60);
    expect(isSandhyaActive('auto', at(17, 29))).toBe(false);
    expect(isSandhyaActive('auto', at(17, 30))).toBe(true);
    expect(isSandhyaActive('auto', at(19, 45))).toBe(true);
    expect(isSandhyaActive('auto', at(20, 59))).toBe(true);
    expect(isSandhyaActive('auto', at(21, 0))).toBe(false);
    expect(isSandhyaActive('auto', at(12, 0))).toBe(false);
    expect(isSandhyaActive('auto', at(3, 0))).toBe(false);
  });

  it('mode persists through the injected storage; garbage reads as off', () => {
    const mem = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k, v) => void mem.set(k, v),
    };
    expect(getSandhyaMode(storage)).toBe('off');
    storeSandhyaMode('auto', storage);
    expect(mem.get(SANDHYA_STORAGE_KEY)).toBe('auto');
    expect(getSandhyaMode(storage)).toBe('auto');
    storeSandhyaMode('on', storage);
    expect(getSandhyaMode(storage)).toBe('on');
    mem.set(SANDHYA_STORAGE_KEY, 'purple');
    expect(getSandhyaMode(storage)).toBe('off');
    expect(getSandhyaMode(null)).toBe('off');
  });
});

const LABELS: ReceiptLabels = {
  title: 'Temple Acknowledgment',
  offeredBy: 'Offered by',
  purpose: 'Purpose',
  mode: 'Offered via',
  receiptNo: 'Receipt No.',
  date: 'Date',
  tithi: 'Tithi',
  blessing: 'Your seva has been received with gratitude.',
  shareLine: 'Dhanyavaad! I offered {amount} to {org}.',
};

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

describe('Temple receipt — real fields only, engine tithi', () => {
  it('a bare YYYY-MM-DD parses as that local civil day', () => {
    const d = parseRecordDate('2026-10-25');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(9);
    expect(d!.getDate()).toBe(25);
    expect(parseRecordDate('not-a-date')).toBeNull();
  });

  it('the tithi line is the canonical engine reading of the record date', () => {
    const engine = calculatePanchang(new Date(2026, 9, 25, 12)).tithi;
    expect(engine).toBeTruthy();
    expect(tithiForDate('2026-10-25')).toBe(engine.trim());
    expect(tithiForDate('garbage')).toBe('');
  });

  it('share text carries every field the record carries', () => {
    const text = buildReceiptShareText(FULL, LABELS, 'Shukla Chaturdashi', 'Sunday, 25 October 2026', '₹1,100');
    expect(text).toContain('Kashi Vishwanath Mandir Trust');
    expect(text).toContain('₹1,100');
    expect(text).toContain('SB-80G-248913');
    expect(text).toContain('Shukla Chaturdashi');
    expect(text).toContain('Annadanam');
    expect(text).toContain('received with gratitude');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('{amount}');
    expect(text).not.toContain('{org}');
  });

  it('share text omits lines for fields the record does not carry', () => {
    const bare: TempleReceiptData = {
      orgName: 'Anand Ashram',
      amount: 251,
      currencySymbol: '₹',
      dateISO: '2026-10-25',
    };
    const text = buildReceiptShareText(bare, LABELS, '', 'Sunday, 25 October 2026', '₹251');
    expect(text).not.toContain('Receipt No.');
    expect(text).not.toContain('Tithi:');
    expect(text).not.toContain('Purpose:');
    expect(text).not.toContain('undefined');
  });
});

describe('CSS contract — Sandhya, mala, paper', () => {
  const css = read('index.css');

  it('Sandhya is scoped under [data-sandhya="on"] and deepens the sanctum tokens', () => {
    expect(css).toContain(':root[data-sandhya="on"]');
    expect(css).toContain('--sanctum-ivory: #38220f');
    expect(css).toContain('[data-sandhya="on"] .sanctum-header');
    // the literal light surfaces of the top screens rest to dusk tones
    expect(css).toContain('[data-sandhya="on"] .bg-white');
    expect(css).toContain('[data-sandhya="on"] .text-temple-900');
    // floor law: the lite step-down still wins at dusk
    expect(css).toContain('[data-sandhya="on"] .sanctum-lite .lamplight');
  });

  it('the mala classes exist, with an honest broken state', () => {
    expect(css).toContain('.mala-bead');
    expect(css).toContain('.mala-bead-broken');
    expect(css).toContain('.mala-segment-broken');
    expect(css).toContain('.mala-break-label');
    expect(css).toContain('.sanctum-lite .mala-bead');
  });

  it('the receipt paper carries fixed colours — it never flips', () => {
    expect(css).toContain('.receipt-paper');
    expect(css).toContain('#fffbf2');
    expect(css).toContain('.receipt-paper .rp-amount');
    // no sandhya rule may reach inside the paper
    const sandhyaBlocks = css.split('[data-sandhya="on"]').slice(1);
    for (const block of sandhyaBlocks) {
      expect(block.slice(0, 200)).not.toContain('receipt-paper');
    }
  });

  it('the boot splash stays light: the html boot only sets the attribute', () => {
    const html = read('../index.html');
    expect(html).toContain("localStorage.getItem('sb-sandhya-mode')");
    expect(html).toContain("setAttribute('data-sandhya', 'on')");
    // window constants mirrored (17:30 = 1050, 21:00 = 1260)
    expect(html).toContain('mins >= 1050 && mins < 1260');
  });
});
