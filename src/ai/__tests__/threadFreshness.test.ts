/**
 * threadFreshness.test.ts — UIUX Batch 2 pins for D-04 + U4.
 *
 * D-04: the Ask sheet reloads the saved thread on every open; past-day
 * messages must carry a freshness divider so a stale answer is never
 * presented as fresh. The divider logic is pure (threadFreshness.ts)
 * and tested here with locally-constructed dates (no TZ assumptions).
 *
 * U4: the sheet must open on the conversation — the voice-settings
 * view state resets on open. The sheet's import chain is not
 * jest-loadable in the node env (same constraint as orgChrome61), so
 * the U4 pin is a source contract on AssistantSheet.tsx.
 */
import * as fs from 'fs';
import * as path from 'path';
import { startOfLocalDay, threadDayDividers } from '../threadFreshness';

const at = (y: number, mo: number, d: number, h = 10, mi = 0) =>
  new Date(y, mo, d, h, mi).getTime();

const msg = (id: string, createdAt: number) => ({ id, createdAt });

describe('threadDayDividers (D-04)', () => {
  const now = at(2026, 9, 22, 9, 15); // Thu 22 Oct 2026, morning

  it('empty thread → no dividers', () => {
    expect(threadDayDividers([], now)).toEqual([]);
  });

  it('all messages today → no dividers (the conversation is fresh)', () => {
    const msgs = [msg('a', at(2026, 9, 22, 0, 5)), msg('b', at(2026, 9, 22, 9, 0))];
    expect(threadDayDividers(msgs, now)).toEqual([]);
  });

  it('a thread entirely from yesterday → one divider before its first message, marked first', () => {
    const msgs = [msg('a', at(2026, 9, 21, 18, 30)), msg('b', at(2026, 9, 21, 19, 2))];
    const out = threadDayDividers(msgs, now);
    expect(out).toHaveLength(1);
    expect(out[0].beforeId).toBe('a');
    expect(out[0].first).toBe(true);
    expect(out[0].dayStart).toBe(startOfLocalDay(at(2026, 9, 21, 18, 30)));
  });

  it('mixed thread: divider only before the past-day group, never before today', () => {
    const msgs = [
      msg('old', at(2026, 9, 21, 22, 10)),
      msg('fresh', at(2026, 9, 22, 8, 0)),
    ];
    const out = threadDayDividers(msgs, now);
    expect(out.map((d) => d.beforeId)).toEqual(['old']);
  });

  it('two past days → two dividers, only the first is flagged first', () => {
    const msgs = [
      msg('d1', at(2026, 9, 20, 11, 0)),
      msg('d1b', at(2026, 9, 20, 12, 0)),
      msg('d2', at(2026, 9, 21, 9, 0)),
      msg('d3', at(2026, 9, 22, 9, 0)),
    ];
    const out = threadDayDividers(msgs, now);
    expect(out.map((d) => d.beforeId)).toEqual(['d1', 'd2']);
    expect(out.map((d) => d.first)).toEqual([true, false]);
  });

  it('unknown-age messages (missing/invalid createdAt) never earn a divider and do not break grouping', () => {
    const msgs = [
      msg('ghost', 0),
      msg('nan', Number.NaN),
      msg('old', at(2026, 9, 21, 8, 0)),
      msg('old2', at(2026, 9, 21, 9, 0)),
    ];
    const out = threadDayDividers(msgs, now);
    expect(out.map((d) => d.beforeId)).toEqual(['old']);
  });

  it('a message later today (clock skew) is not labelled old', () => {
    const msgs = [msg('skew', at(2026, 9, 22, 23, 59))];
    expect(threadDayDividers(msgs, now)).toEqual([]);
  });

  it('startOfLocalDay zeroes the clock', () => {
    const d = new Date(startOfLocalDay(at(2026, 0, 5, 17, 45)));
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 5]);
  });
});

describe('AssistantSheet wiring (D-04 + U4 source contracts)', () => {
  const sheet = fs.readFileSync(
    path.join(__dirname, '../components/AssistantSheet.tsx'),
    'utf-8'
  );

  it('U4: opening the sheet resets the voice-settings view to the conversation', () => {
    expect(sheet).toContain('if (open) setShowVoiceSettings(false)');
  });

  it('U4: the nudge rule itself is untouched (nudge still gates the settings view)', () => {
    expect(sheet).toContain('shouldShowNudge');
    expect(sheet).toContain('setShowVoiceSettings(true)');
  });

  it('D-04: dividers are derived from the thread and rendered before their message', () => {
    expect(sheet).toContain('threadDayDividers(messages, Date.now())');
    expect(sheet).toContain('dividerById.get(m.id)');
    expect(sheet).toContain("tr('ai.thread.earlier', 'Earlier conversation'");
  });

  it('D-04: history is labelled, not wiped — the load-on-open effect still runs', () => {
    expect(sheet).toContain('loadThread(uidKey)');
  });
});
