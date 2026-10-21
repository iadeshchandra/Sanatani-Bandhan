/**
 * QUEUED #52 (audit D12) — Bahi-Khata honesty pins:
 *
 * 1) "Entered by" must be the actual signed-in user. Opening the
 *    register form in an org session used to stamp the batch with the
 *    auth layer's generic placeholder "Acharya / Trustee
 *    Administrator" — a title, not a person. resolveActorName must
 *    skip placeholders and walk the real identity chain.
 * 2) A draft exists only once a row is entered. batchHasEnteredRows
 *    is the single predicate the desk's lazy-persist uses, so merely
 *    opening (or renaming, or paging) a fresh batch creates nothing.
 */
import { batchHasEnteredRows, resolveActorName, GENERIC_ACTOR_NAMES } from '../bahikhataStore';
import type { ImportBatch } from '../types';

const PLACEHOLDER = 'Acharya / Trustee Administrator';

describe('resolveActorName — the actual user, never a placeholder (QUEUED #52)', () => {
  it('prefers the Firebase display name', () => {
    expect(resolveActorName(['Adesh Chandra', PLACEHOLDER], 'x@y.z')).toBe('Adesh Chandra');
  });

  it('skips the generic placeholder wherever it appears in the chain', () => {
    expect(resolveActorName([PLACEHOLDER, 'Adesh Chandra'], null)).toBe('Adesh Chandra');
    expect(resolveActorName([null, PLACEHOLDER, undefined, '  Meena Devi  '], null)).toBe('Meena Devi');
  });

  it('falls back to the account email — still the actual user', () => {
    expect(resolveActorName([PLACEHOLDER, 'Staff', null], 'sevak@mandir.org')).toBe('sevak@mandir.org');
    expect(resolveActorName([], 'sevak@mandir.org')).toBe('sevak@mandir.org');
  });

  it('never returns a generic placeholder, even with no identity at all', () => {
    const name = resolveActorName([PLACEHOLDER], null);
    expect(GENERIC_ACTOR_NAMES).not.toContain(name);
    expect(name).toBe('Sanatani Sevak');
  });

  it('treats blank/whitespace candidates as absent', () => {
    expect(resolveActorName(['', '   ', 'Real Name'], null)).toBe('Real Name');
  });
});

describe('batchHasEnteredRows — a draft is born at the first row (QUEUED #52)', () => {
  const batch = (rows: ImportBatch['rows']): Pick<ImportBatch, 'rows'> => ({ rows });

  it('a freshly created batch has no content (opening the form creates nothing)', () => {
    expect(batchHasEnteredRows(batch([]))).toBe(false);
  });

  it('the first entered row makes it a real draft', () => {
    const row = { rowId: 'r1' } as ImportBatch['rows'][number];
    expect(batchHasEnteredRows(batch([row]))).toBe(true);
  });

  it('is defensive about malformed state', () => {
    expect(batchHasEnteredRows({ rows: undefined as never })).toBe(false);
    expect(batchHasEnteredRows({ rows: null as never })).toBe(false);
  });
});
