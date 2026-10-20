import {
  analyzeRow, analyzeRows, deriveHerdStatus, nextTagId, defaultedSummary,
  type AnalyzeContext,
} from '../dedupe';

const emptyCtx: AnalyzeContext = { existingMembers: [], existingHerd: [], priorRows: [] };

describe('members — phone dedupe', () => {
  const ctx: AnalyzeContext = {
    existingMembers: [{ id: 'd1', fullName: 'Ramesh Chandra', phone: '+880 1712-345678', gotra: 'Kashyapa' }],
    existingHerd: [],
    priorRows: [],
  };
  it('marks a phone that already exists as duplicate — across country-code spellings', () => {
    const a = analyzeRow('members', { fullName: 'Ramesh Chandra', phone: '01712345678', gotra: 'Kashyapa' }, ctx);
    expect(a.state).toBe('duplicate');
  });
  it('marks the second in-batch use of a phone as duplicate', () => {
    const rows = analyzeRows(
      'members',
      [
        { raw: {}, mapped: { fullName: 'A Das', phone: '9876543210', gotra: 'Vatsa' }, pageNo: 1 },
        { raw: {}, mapped: { fullName: 'A Das', phone: '+91 98765 43210', gotra: 'Vatsa' }, pageNo: 1 },
      ],
      { existingMembers: [], existingHerd: [] },
      't'
    );
    expect(rows[0].state).toBe('ok');
    expect(rows[1].state).toBe('duplicate');
  });
  it('flags a too-short phone as needs_fix, warmly', () => {
    const a = analyzeRow('members', { fullName: 'B Roy', phone: '01712', gotra: 'Vatsa' }, emptyCtx);
    expect(a.state).toBe('needs_fix');
    expect(a.issues.join(' ')).toMatch(/looks short/);
  });
  it('no phone + same name & gotra in directory → needs_fix soft match, never auto-merge', () => {
    const a = analyzeRow('members', { fullName: 'ramesh chandra', phone: '', gotra: 'kashyapa' }, ctx);
    expect(a.state).toBe('needs_fix');
    expect(a.issues.join(' ')).toMatch(/Possible match/);
  });
  it('discloses the Kashyapa gotra default instead of hiding it', () => {
    const a = analyzeRow('members', { fullName: 'C Sen', phone: '9000000001', gotra: '' }, emptyCtx);
    expect(a.mapped.gotra).toBe('Kashyapa');
    expect(a.defaultedFields).toContain('gotra');
  });
});

describe('herd — tags, derivation, soft matches', () => {
  const herdCtx: AnalyzeContext = {
    existingMembers: [],
    existingHerd: [
      { id: 'n1', name: 'Kamdhenu', tagId: 'GM-0041', ageYears: 7 },
      { id: 'n2', name: 'Kapila', tagId: 'GM-0042', ageYears: 4 },
    ],
    priorRows: [],
  };
  it('nextTagId continues the herd’s own sequence', () => {
    expect(nextTagId(['GM-0041', 'GM-0042'])).toBe('GM-0043');
    expect(nextTagId([])).toBe('GM-0001');
  });
  it('auto-assigns the next tag when the paper has none — and flags it', () => {
    const a = analyzeRow('herd', { name: 'New Gai', breed: 'Gir', sex: 'cow', ageYears: '5', source: 'donated' }, herdCtx);
    expect(a.mapped.tagId).toBe('GM-0043');
    expect(a.mapped.tagAutoAssigned).toBe(true);
    expect(a.defaultedFields).toContain('tagId');
  });
  it('marks an existing ear-tag as a hard duplicate', () => {
    const a = analyzeRow('herd', { name: 'Copy', tagId: 'GM-0042', breed: 'Gir', sex: 'cow', ageYears: '4', source: 'donated' }, herdCtx);
    expect(a.state).toBe('duplicate');
  });
  it('soft-matches same name + near age as needs_fix (names repeat across generations)', () => {
    const a = analyzeRow('herd', { name: 'Kapila', tagId: '', breed: 'Gir', sex: 'cow', ageYears: '5', source: 'born' }, herdCtx);
    expect(a.state).toBe('needs_fix');
  });
  it('derives status — never asks: adult cow milking, calf vatsa, bull dry', () => {
    expect(deriveHerdStatus('cow', 6)).toBe('milking');
    expect(deriveHerdStatus('vatsa', 0)).toBe('vatsa');
    expect(deriveHerdStatus('cow', 1)).toBe('vatsa');
    expect(deriveHerdStatus('bull', 8)).toBe('dry');
    const a = analyzeRow('herd', { name: 'X', breed: '', sex: 'cow', ageYears: '6', source: 'donated' }, herdCtx);
    expect(a.mapped.status).toBe('milking');
    expect(a.defaultedFields).toContain('status');
  });
  it('arrival-year-only rows keep age unknown and say so', () => {
    const a = analyzeRow('herd', { name: 'Old Gai', breed: 'Desi', sex: 'cow', ageYears: '', arrivalYear: '2019', source: 'rescued' }, herdCtx);
    expect(a.mapped.ageYears).toBeNull();
    expect(a.mapped.ageUnknown).toBe(true);
    expect(a.mapped.arrivalYear).toBe(2019);
    expect(a.defaultedFields).toContain('ageYears');
  });
  it('defaults a blank breed to Desi, disclosed', () => {
    const a = analyzeRow('herd', { name: 'Y', breed: '', sex: 'cow', ageYears: '3', source: 'donated' }, herdCtx);
    expect(a.mapped.breed).toBe('Desi');
    expect(a.defaultedFields).toContain('breed');
  });
});

describe('donors — a phone match attaches, never twins', () => {
  const ctx: AnalyzeContext = {
    existingMembers: [{ id: 'd9', fullName: 'Meera Devi', phone: '98111 22334', gotra: 'Bharadwaja' }],
    existingHerd: [],
    priorRows: [],
  };
  it('attaches to the existing devotee and stays ok', () => {
    const a = analyzeRow('donors', { fullName: 'Meera Devi', phone: '+91 98111 22334', gotra: 'Bharadwaja', lifetimeDonated: 5100, donationAmount: 0 }, ctx);
    expect(a.state).toBe('ok');
    expect(a.mapped.attachToId).toBe('d9');
  });
  it('a donor row with no amount at all needs a look', () => {
    const a = analyzeRow('donors', { fullName: 'New Donor', phone: '9000000002', gotra: '', lifetimeDonated: 0, donationAmount: 0 }, emptyCtx);
    expect(a.state).toBe('needs_fix');
  });
  it('warns (only) on a repeated date+amount line inside one batch', () => {
    const rows = analyzeRows(
      'donors',
      [
        { raw: {}, mapped: { fullName: 'P Sen', phone: '9000000003', gotra: 'Vatsa', lifetimeDonated: 0, donationAmount: 501, donationDate: '2026-01-15' }, pageNo: 1 },
        { raw: {}, mapped: { fullName: 'P Sen', phone: '9000000004', gotra: 'Vatsa', lifetimeDonated: 0, donationAmount: 501, donationDate: '2026-01-15' }, pageNo: 1 },
      ],
      { existingMembers: [], existingHerd: [] },
      't'
    );
    expect(rows[1].state).toBe('ok');
    expect(rows[1].issues.join(' ')).toMatch(/separate gift/);
  });
});

describe('defaultedSummary — the review disclosure line', () => {
  it('counts defaulted fields across rows with the carried value', () => {
    const rows = analyzeRows(
      'members',
      [
        { raw: {}, mapped: { fullName: 'A', phone: '9000000010', gotra: '' }, pageNo: 1 },
        { raw: {}, mapped: { fullName: 'B', phone: '9000000011', gotra: '' }, pageNo: 1 },
        { raw: {}, mapped: { fullName: 'C', phone: '9000000012', gotra: 'Vatsa' }, pageNo: 1 },
      ],
      { existingMembers: [], existingHerd: [] },
      't'
    );
    const s = defaultedSummary(rows);
    const gotra = s.find((x) => x.field === 'gotra');
    expect(gotra?.count).toBe(2);
    expect(gotra?.value).toBe('Kashyapa');
  });
});
