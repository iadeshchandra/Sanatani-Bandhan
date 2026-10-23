/**
 * langEntityGuard.test.ts — UIUX Batch 2 pins for D-11 + D-05.
 *
 * D-11: raw HTML entities (&bull;, &lt;) lived inside dictionary
 * VALUES, where they print literally on screens ("Terminal:
 * TURNSTILE-GATE-02 &bull; Mode: High-Velocity"). The sweep replaced
 * all 55 with the real characters; this guard fails the build if any
 * raw &entity; reappears anywhere under src/i18n/lang/.
 *
 * D-05: the Treasury and Devotees flagship headers rendered hard-coded
 * English in a Bangla session. The desks now read their header/hero/
 * totals strings from the dictionaries; the pins below hold (a) the
 * wiring in the two desk sources, (b) the new keys' presence in the
 * schema + all 10 org fragments, and (c) the repaired bn/hi totals
 * values being genuinely translated, not half-English.
 */
import * as fs from 'fs';
import * as path from 'path';

const LANG_DIR = path.join(__dirname, '../lang');
const SRC = path.join(__dirname, '../..');

function* walkTs(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkTs(p);
    else if (entry.name.endsWith('.ts')) yield p;
  }
}

const ENTITY_RE = /&[a-zA-Z]+;|&#[0-9]+;/;

describe('D-11 entity guard', () => {
  it('no raw HTML entities remain in any language file', () => {
    const offenders: string[] = [];
    for (const file of walkTs(LANG_DIR)) {
      const text = fs.readFileSync(file, 'utf-8');
      const m = text.match(ENTITY_RE);
      if (m) offenders.push(`${path.relative(LANG_DIR, file)}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the swept strings carry the real characters', () => {
    const enOrg = fs.readFileSync(path.join(LANG_DIR, 'en/org.ts'), 'utf-8');
    expect(enOrg).toContain('Terminal: TURNSTILE-GATE-02 • Mode: High-Velocity');
    expect(enOrg).toContain('(Compressed automatically <300px)');
  });
});

const NEW_TREASURY_KEYS = [
  'auditedDoubleentryLedgerWithRestrictedVs',
  'statutoryAdherenceToDonorMandatesUnderTh',
];
const NEW_DEVOTEE_KEYS = ['all', 'donors', 'register', 'staff', 'suspended', 'total'];
const LANG_CODES = ['en', 'bn', 'hi', 'gu', 'kn', 'ml', 'mr', 'sa', 'ta', 'te'];

describe('D-05 new dictionary keys', () => {
  it('exist in the schema and in all 10 org fragments', () => {
    const schema = fs.readFileSync(path.join(__dirname, '../schema.ts'), 'utf-8');
    for (const key of [...NEW_TREASURY_KEYS, ...NEW_DEVOTEE_KEYS]) {
      expect(schema).toContain(`${key}: string;`);
      for (const code of LANG_CODES) {
        const frag = fs.readFileSync(path.join(LANG_DIR, `${code}/org.ts`), 'utf-8');
        expect(frag).toContain(`${key}: "`);
      }
    }
  });

  it('bn/hi totals values are genuinely translated (no half-English labels left)', () => {
    for (const code of ['bn', 'hi']) {
      const frag = fs.readFileSync(path.join(LANG_DIR, `${code}/org.ts`), 'utf-8');
      const grab = (key: string) => {
        const m = frag.match(new RegExp(`^\\s*${key}: "([^"]*)"`, 'm'));
        expect(m).not.toBeNull();
        return m![1];
      };
      expect(grab('totalIncomeInflow')).not.toMatch(/Income \(Inflow\)/);
      expect(grab('totalExpensesOutflow')).not.toMatch(/Expenses \(Outflow\)/);
      expect(grab('netAvailableTreasury')).not.toContain('Net Available');
      expect(grab('treasuryFundBalanceSheet')).not.toContain('Fund Balance Sheet');
      expect(grab('printStatementPdf')).not.toContain('Statement (PDF)');
      expect(grab('comprehensiveDirectoryWithGotraPravaraSe')).not.toContain('Comprehensive directory');
    }
  });
});

describe('D-05 desk wiring', () => {
  const treasury = fs.readFileSync(
    path.join(SRC, 'components/domain2/TreasuryLedgerDesk.tsx'),
    'utf-8'
  );
  const devotees = fs.readFileSync(
    path.join(SRC, 'components/domain1/DevoteeGrid.tsx'),
    'utf-8'
  );

  it('Treasury hero header reads from the dictionaries', () => {
    expect(treasury).toContain("t('org.finance.treasury.treasuryFundBalanceSheet')");
    expect(treasury).toContain("t('org.finance.treasury.doubleentryTreasuryLedger')");
    expect(treasury).toContain("t('org.finance.treasury.charitableTrustAccountingStandard')");
    expect(treasury).toContain("t('org.finance.treasury.auditedDoubleentryLedgerWithRestrictedVs')");
    expect(treasury).not.toContain('>Treasury & Fund Balance Sheet<');
    expect(treasury).not.toContain('Trust Fund Segregation (Restricted vs. Unrestricted)');
    expect(treasury).toContain("t('org.finance.treasury.trustFundSegregationRestrictedVsUnrestri')");
    expect(treasury).toContain("t('org.finance.treasury.unrestrictedCorpus')");
    expect(treasury).toContain("t('org.finance.treasury.restrictedEarmarked')");
  });

  it('Devotees header + filter tabs read from the dictionaries', () => {
    expect(devotees).toContain("t('org.people.devoteeGrid.comprehensiveDirectoryWithGotraPravaraSe')");
    expect(devotees).not.toContain('Comprehensive directory with Gotra, Pravara, Seva Tiers, and QR Gate Passes');
    expect(devotees).toContain("t('org.people.devoteeGrid.staff')");
    expect(devotees).toContain("t('org.people.devoteeGrid.donors')");
    expect(devotees).toContain("t('org.people.devoteeGrid.suspended')");
    expect(devotees).not.toContain("? 'Suspended' :");
  });
});
