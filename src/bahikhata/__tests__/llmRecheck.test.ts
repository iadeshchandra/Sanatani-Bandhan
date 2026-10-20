import {
  attachLlmProposals, buildRecheckPrompt, eligibleFields, filterLlmFixes, parseLlmFixes,
} from '../scan/llmRecheck';
import type { ImportRow, ScanCell } from '../types';

/* Phase 2 AI re-check (owner addendum: CORE layer). The model only
 * ever PROPOSES; the local filter is the law — closed vocabularies
 * must be dictionary members, amounts must parse, green cells are
 * untouchable, and nothing here can apply a value by itself. */

const cell = (text: string, cls: ScanCell['cls']): ScanCell => ({
  text, confidence: 80, cls, reasons: [],
  bbox: { x0: 0, y0: 0, x1: 0.4, y1: 0.1 },
});

const row = (rowId: string, cells: Record<string, ScanCell>): ImportRow => ({
  rowId, pageNo: 1, raw: {}, mapped: {}, state: 'ok',
  issues: [], defaultedFields: [], approved: true, cells,
});

const donorRow = row('r1', {
  fullName: cell('Rames', 'green'),
  gotra: cell('Kashap', 'amber'),
  donationAmount: cell('11O0', 'red'),
  phone: cell('0171234567', 'red'),
});

const DICTS = { gotra: ['Kashyap', 'Bharadwaj'] };

describe('eligibility + prompt', () => {
  it('only non-green cells are eligible', () => {
    expect(eligibleFields(donorRow).sort()).toEqual(['donationAmount', 'gotra', 'phone']);
  });

  it('the prompt carries the row, its flags and the org dictionaries', () => {
    const msgs = buildRecheckPrompt([donorRow], 'donors', DICTS);
    expect(msgs).not.toBeNull();
    const user = msgs!.find((m) => m.role === 'user')!.content;
    expect(user).toContain('Kashap');
    expect(user).toContain('Kashyap, Bharadwaj');
    expect(user).toContain('donationAmount');
    const system = msgs!.find((m) => m.role === 'system')!.content;
    expect(system).toMatch(/ONLY a JSON object/);
    expect(system).toMatch(/exactly one entry from that list/);
  });

  it('no eligible cells → no prompt (the model is never bothered)', () => {
    const clean = row('r2', { fullName: cell('Asha', 'green') });
    expect(buildRecheckPrompt([clean], 'donors', DICTS)).toBeNull();
  });
});

describe('output parsing', () => {
  it('parses bare JSON and salvages fenced JSON', () => {
    expect(parseLlmFixes('{"fixes":[{"row":0,"field":"gotra","value":"Kashyap"}]}').length).toBe(1);
    expect(parseLlmFixes('```json\n{"fixes":[{"row":0,"field":"gotra","value":"Kashyap"}]}\n```').length).toBe(1);
  });

  it('garbage and malformed entries yield nothing', () => {
    expect(parseLlmFixes('I think the gotra is Kashyap')).toEqual([]);
    expect(parseLlmFixes('{"fixes":[{"row":"x","field":1}]}')).toEqual([]);
    expect(parseLlmFixes('{"fixes":[]}')).toEqual([]);
  });
});

describe('the filter — where the law actually lives', () => {
  it('accepts a dictionary-canonical fix for a flagged cell', () => {
    const out = filterLlmFixes([donorRow], [{ row: 0, field: 'gotra', value: 'kashyap' }], 'donors', DICTS);
    expect(out.get('r1')).toEqual({ gotra: 'Kashyap' }); // canonical spelling lands
  });

  it('drops a closed-vocabulary value that is not the org’s word', () => {
    const out = filterLlmFixes([donorRow], [{ row: 0, field: 'gotra', value: 'Vashishtha' }], 'donors', DICTS);
    expect(out.size).toBe(0);
  });

  it('amounts must parse; phones must be usable', () => {
    const okAmt = filterLlmFixes([donorRow], [{ row: 0, field: 'donationAmount', value: '1100' }], 'donors', DICTS);
    expect(okAmt.get('r1')).toEqual({ donationAmount: '1100' });
    const badAmt = filterLlmFixes([donorRow], [{ row: 0, field: 'donationAmount', value: 'eleven hundred' }], 'donors', DICTS);
    expect(badAmt.size).toBe(0);
    const badPhone = filterLlmFixes([donorRow], [{ row: 0, field: 'phone', value: '123' }], 'donors', DICTS);
    expect(badPhone.size).toBe(0);
  });

  it('green cells are untouchable, and no-op suggestions die', () => {
    const green = filterLlmFixes([donorRow], [{ row: 0, field: 'fullName', value: 'Ramesh' }], 'donors', DICTS);
    expect(green.size).toBe(0);
    const noop = filterLlmFixes([donorRow], [{ row: 0, field: 'gotra', value: 'Kashap' }], 'donors', DICTS);
    expect(noop.size).toBe(0);
  });

  it('out-of-range rows are ignored', () => {
    const out = filterLlmFixes([donorRow], [{ row: 9, field: 'gotra', value: 'Kashyap' }], 'donors', DICTS);
    expect(out.size).toBe(0);
  });
});

describe('attachment', () => {
  it('proposals land on cells as suggestions — values do not change', () => {
    const proposals = new Map([['r1', { gotra: 'Kashyap' }]]);
    const [next] = attachLlmProposals([donorRow], proposals);
    expect(next.cells!.gotra.llmProposal).toBe('Kashyap');
    expect(next.cells!.gotra.text).toBe('Kashap'); // the read stands until a human taps
    expect(next.mapped).toEqual(donorRow.mapped);
    expect(donorRow.cells!.gotra.llmProposal).toBeUndefined(); // immutable
  });
});
