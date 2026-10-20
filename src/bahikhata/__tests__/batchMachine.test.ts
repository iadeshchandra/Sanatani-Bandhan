import { applyTransition, canTransition, createBatch } from '../bahikhataStore';
import type { BatchActor } from '../types';

const entrant: BatchActor = { uid: 'u1', name: 'Sevadar Ram', role: 'Sevadar' };
const trustee: BatchActor = { uid: 'u2', name: 'Trustee Maa', role: 'Trustee' };

const draft = () =>
  createBatch({ workspaceId: 'ws1', target: 'members', source: 'register', label: 'Sadasya khata', enteredBy: entrant });

describe('batch state machine — draft → pending → committed, with a way back', () => {
  it('walks the happy path', () => {
    let b = draft();
    expect(b.state).toBe('draft');
    b = applyTransition(b, 'submit', entrant);
    expect(b.state).toBe('pending');
    expect(b.submittedAt).toBeGreaterThan(0);
    b = applyTransition(b, 'approve', trustee);
    expect(b.state).toBe('approved');
    expect(b.reviewedBy?.uid).toBe('u2');
    b = applyTransition(b, 'commit', trustee);
    expect(b.state).toBe('committed');
  });
  it('forbids skipping review — a draft can never commit directly', () => {
    expect(canTransition('draft', 'commit')).toBe(false);
    expect(canTransition('draft', 'approve')).toBe(false);
    const b = applyTransition(draft(), 'commit', trustee);
    expect(b.state).toBe('draft');
  });
  it('a committed batch is immutable to the machine', () => {
    expect(canTransition('committed', 'reopen')).toBe(false);
    expect(canTransition('committed', 'submit')).toBe(false);
  });
  it('reject carries the reviewer’s plain-language reason', () => {
    let b = applyTransition(draft(), 'submit', entrant);
    b = applyTransition(b, 'reject', trustee, { rejectReason: '3 phone numbers look wrong — page 13' });
    expect(b.state).toBe('rejected');
    expect(b.rejectReason).toMatch(/page 13/);
  });
  it('rejected batches reopen as drafts with the reason pinned until resubmit', () => {
    let b = applyTransition(draft(), 'submit', entrant);
    b = applyTransition(b, 'reject', trustee, { rejectReason: 'check page 2' });
    b = applyTransition(b, 'reopen', entrant);
    expect(b.state).toBe('draft');
    expect(b.rejectReason).toMatch(/page 2/);
    b = applyTransition(b, 'submit', entrant);
    expect(b.state).toBe('pending');
    expect(b.rejectReason).toBeUndefined();
  });
  it('the entrant can withdraw a pending batch back to draft', () => {
    let b = applyTransition(draft(), 'submit', entrant);
    b = applyTransition(b, 'withdraw', entrant);
    expect(b.state).toBe('draft');
  });
});
