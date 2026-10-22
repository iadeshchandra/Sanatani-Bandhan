/**
 * voiceEntry.test.ts — Blueprint D, deliverable 5: the spoken-line
 * parser, on Bengali / Hindi / English sample phrases. The law:
 * voice lands a PRE-FILLED ROW for human review — fields the words
 * did not clearly carry stay absent (never invented), and a line
 * with no hearable amount parses to null rather than opening an
 * empty form. Amounts ride Blueprint C's parser family (Bengali /
 * Devanagari digits included).
 */
import { buildVoiceBatch, parseVoiceDonation, voiceLangFor } from '../voiceEntry';

describe('parseVoiceDonation', () => {
  it('English: "donation from Ratan Barman 500 taka for annadanam cash"', () => {
    const p = parseVoiceDonation('donation from Ratan Barman 500 taka for annadanam cash');
    expect(p).not.toBeNull();
    expect(p!.amount).toBe(500);
    expect(p!.donorName).toBe('Ratan Barman');
    expect(p!.purpose).toBe('annadanam');
    expect(p!.paymentMode).toBe('Cash');
  });

  it('Bengali digits + থেকে/জন্য anchors: "রতন বর্মন থেকে ৫০০ টাকা অন্নদানের জন্য"', () => {
    const p = parseVoiceDonation('রতন বর্মন থেকে ৫০০ টাকা অন্নদানের জন্য');
    expect(p).not.toBeNull();
    expect(p!.amount).toBe(500);
    expect(p!.donorName).toBe('রতন বর্মন');
    expect(p!.purpose).toBe('অন্নদানের');
    // no mode was spoken — the field stays absent, never defaulted
    expect(p!.paymentMode).toBeNull();
    expect(p!.donationDate).toBeNull();
  });

  it('Hindi: "रतन बर्मन से 1000 रुपये अन्नदान के लिए यूपीआई"', () => {
    const p = parseVoiceDonation('रतन बर्मन से 1000 रुपये अन्नदान के लिए यूपीआई');
    expect(p).not.toBeNull();
    expect(p!.amount).toBe(1000);
    expect(p!.donorName).toBe('रतन बर्मन');
    expect(p!.purpose).toBe('अन्नदान');
    expect(p!.paymentMode).toBe('UPI / QR');
  });

  it('Bengali with a spoken mode: "সীতা দেবী থেকে ২০০০ টাকা মন্দির সংস্কারের জন্য বিকাশ"', () => {
    const p = parseVoiceDonation('সীতা দেবী থেকে ২০০০ টাকা মন্দির সংস্কারের জন্য বিকাশ');
    expect(p!.amount).toBe(2000);
    expect(p!.donorName).toBe('সীতা দেবী');
    expect(p!.purpose).toBe('মন্দির সংস্কারের');
    // bKash is not one of the ledger's modes — parsePaymentMode's
    // honest fallback for an unmatched-but-present mode word is
    // Cash; the REVIEWER sees the transcript and corrects it.
    expect(p!.paymentMode).toBe('Cash');
  });

  it('a line with no amount parses to null — no empty form', () => {
    expect(parseVoiceDonation('অন্নদানের জন্য দান')).toBeNull();
    expect(parseVoiceDonation('')).toBeNull();
    expect(parseVoiceDonation('thank you very much')).toBeNull();
  });

  it('an amount alone is a valid minimal prefill (name/purpose left for the human)', () => {
    const p = parseVoiceDonation('500 taka');
    expect(p!.amount).toBe(500);
    expect(p!.donorName).toBeNull();
    expect(p!.purpose).toBeNull();
  });
});

describe('buildVoiceBatch', () => {
  it('builds an ordinary donors batch: one ok row, transcript preserved, unheard fields absent', () => {
    const parsed = parseVoiceDonation('রতন বর্মন থেকে ৫০০ টাকা অন্নদানের জন্য')!;
    const batch = buildVoiceBatch({
      workspaceId: 'WS-1',
      enteredBy: { uid: 'u-1', name: 'Sevadar', role: 'Sevadar' },
      label: 'Dan khata — voice entry',
      parsed,
    });
    expect(batch.target).toBe('donors');
    expect(batch.state).toBe('draft');
    expect(batch.rows).toHaveLength(1);
    const row = batch.rows[0];
    expect(row.state).toBe('ok');
    expect(row.approved).toBe(true);
    expect(row.raw.transcript).toContain('রতন বর্মন');
    expect(row.mapped.donationAmount).toBe(500);
    expect(row.mapped.fullName).toBe('রতন বর্মন');
    expect(row.mapped.purpose).toBe('অন্নদানের');
    expect('paymentMode' in row.mapped).toBe(false);
    expect('donationDate' in row.mapped).toBe(false);
  });

  it('recognition language follows the app language', () => {
    expect(voiceLangFor('bn')).toBe('bn-IN');
    expect(voiceLangFor('hi')).toBe('hi-IN');
    expect(voiceLangFor('en')).toBe('en-IN');
  });
});
