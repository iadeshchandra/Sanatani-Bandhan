/**
 * criticalUpdate.test.ts — UI/UX audit D-09 pins (logic half).
 *
 * The "Important update required" hard-block showed no reason. The law
 * now: a build may only be flagged critical when a human-readable
 * note exists, and the client only hard-blocks when the manifest it
 * received actually carries that note. These tests pin the client
 * half; updatePromptNote.test.ts pins the dialog + generator halves.
 */
import { criticalNoteOf, isEffectivelyCritical, criticalBodyText } from '../criticalUpdate';

const FALLBACK = 'This update fixes an important issue. Please update to continue.';

describe('D-09 — critical only with a note', () => {
  it('no manifest → not critical, generic body', () => {
    expect(criticalNoteOf(null)).toBeNull();
    expect(criticalNoteOf(undefined)).toBeNull();
    expect(isEffectivelyCritical(null)).toBe(false);
    expect(criticalBodyText(null, FALLBACK)).toBe(FALLBACK);
  });

  it('a note without the critical flag is not a block', () => {
    const m = { critical: false, criticalNote: 'Fixes a crash on the Treasury desk.' };
    expect(criticalNoteOf(m)).toBeNull();
    expect(isEffectivelyCritical(m)).toBe(false);
    expect(criticalBodyText(m, FALLBACK)).toBe(FALLBACK);
  });

  it('critical WITHOUT a note degrades to a normal update (never a silent hard-block)', () => {
    const m = { critical: true };
    expect(criticalNoteOf(m)).toBeNull();
    expect(isEffectivelyCritical(m)).toBe(false);
    expect(criticalBodyText(m, FALLBACK)).toBe(FALLBACK);
  });

  it('critical with a blank/whitespace note is not critical either', () => {
    expect(isEffectivelyCritical({ critical: true, criticalNote: '   ' })).toBe(false);
    expect(isEffectivelyCritical({ critical: true, criticalNote: '' })).toBe(false);
  });

  it('critical WITH a note: the note is the reason and becomes the dialog body', () => {
    const m = { critical: true, criticalNote: '  Fixes donation receipts printing blank.  ' };
    expect(criticalNoteOf(m)).toBe('Fixes donation receipts printing blank.');
    expect(isEffectivelyCritical(m)).toBe(true);
    expect(criticalBodyText(m, FALLBACK)).toBe('Fixes donation receipts printing blank.');
  });
});
