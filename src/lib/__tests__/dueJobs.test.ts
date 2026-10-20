/**
 * dueJobs.test.ts — QUEUED #15: the runner's decisions are pure and
 * pinned here: scope ownership, occurrence identity, ledger idempotency,
 * gentle re-emit windows, run caps, throttling, log hygiene.
 */
import {
  discoverSamskaraScopes,
  occurrenceKey,
  planDeliveries,
  pruneLedger,
  shouldAutoRun,
  appendRunLog,
  summariseRun,
  runTotals,
  SAMSKARA_AGE_REEMIT_MS,
  AUTO_RUN_THROTTLE_MS,
  LEDGER_PRUNE_MS,
  RUN_LOG_CAP,
  type DueJobsLedger,
  type DueJobsRunReport,
} from '../dueJobs';
import type { Reminder } from '../../samskara/samskaraStore';

const NOW = Date.UTC(2026, 9, 20, 6, 0, 0); // 2026-10-20

const reminder = (patch: Partial<Reminder>): Reminder => ({
  id: 'r1',
  kind: 'samskara-age',
  title: 'A title',
  detail: 'A detail',
  gentle: false,
  ...patch,
});

describe('discoverSamskaraScopes', () => {
  const keys = [
    'sb_samskara_solo_userA',
    'sb_samskara_solo_userB',
    'sb_samskara_ws_temple1',
    'sb_samskara_default',
    'sb.aartiReminders.v1',
    'unrelated',
  ];

  it('includes the signed-in user’s own solo scope', () => {
    expect(discoverSamskaraScopes(keys, 'userA')).toContain('solo_userA');
  });

  it('excludes another user’s solo scope on a shared device', () => {
    const scopes = discoverSamskaraScopes(keys, 'userA');
    expect(scopes).not.toContain('solo_userB');
    expect(discoverSamskaraScopes(keys, 'userB')).toContain('solo_userB');
  });

  it('includes workspace scopes and ignores non-samskara keys, sorted', () => {
    expect(discoverSamskaraScopes(keys, 'userA')).toEqual(['default', 'solo_userA', 'ws_temple1']);
  });
});

describe('occurrenceKey', () => {
  it('shraddha keys carry the occurrence date — each year is a new occurrence', () => {
    const a = reminder({ kind: 'shraddha', id: 'sh_anc1', date: '2026-10-05' });
    const b = reminder({ kind: 'shraddha', id: 'sh_anc1', date: '2027-09-25' });
    expect(occurrenceKey(a)).not.toBe(occurrenceKey(b));
    expect(occurrenceKey(a)).toContain('2026-10-05');
  });

  it('ceremony keys split into far / near buckets for the same plan date', () => {
    const far = reminder({ kind: 'ceremony', id: 'ce_plan1', date: '2026-12-01', inDays: 42 });
    const near = reminder({ kind: 'ceremony', id: 'ce_plan1', date: '2026-12-01', inDays: 5 });
    expect(occurrenceKey(far)).toContain(':far');
    expect(occurrenceKey(near)).toContain(':near');
    expect(occurrenceKey(far)).not.toBe(occurrenceKey(near));
  });

  it('samskara-age keys are stable per member + samskara', () => {
    const r = reminder({ kind: 'samskara-age', id: 'sa_m1_upanayana' });
    expect(occurrenceKey(r)).toBe('samskara-age:sa_m1_upanayana');
  });
});

describe('planDeliveries', () => {
  it('delivers fresh due reminders under the cap', () => {
    const plan = planDeliveries([reminder({ id: 'a' }), reminder({ id: 'b' })], {}, NOW);
    expect(plan.deliver.map((d) => d.reminder.id)).toEqual(['a', 'b']);
    expect(plan.skipped).toHaveLength(0);
  });

  it('never double-sends: a ledger-hit shraddha occurrence is skipped', () => {
    const r = reminder({ kind: 'shraddha', id: 'sh_anc1', date: '2026-10-05', gentle: true });
    const ledger: DueJobsLedger = { [occurrenceKey(r)]: NOW - 86400000 };
    const plan = planDeliveries([r], ledger, NOW);
    expect(plan.deliver).toHaveLength(0);
    expect(plan.skipped[0].reason).toBe('already-delivered');
  });

  it('samskara-age re-delivers only after the gentle 90-day window', () => {
    const r = reminder({ kind: 'samskara-age', id: 'sa_m1_vidyarambha' });
    const key = occurrenceKey(r);
    const recent = planDeliveries([r], { [key]: NOW - 10 * 86400000 }, NOW);
    expect(recent.deliver).toHaveLength(0);
    expect(recent.skipped[0].reason).toBe('reminded-recently');
    const stale = planDeliveries([r], { [key]: NOW - SAMSKARA_AGE_REEMIT_MS - 1 }, NOW);
    expect(stale.deliver).toHaveLength(1);
  });

  it('enforces the per-run cap and reports the overflow as run-cap skips', () => {
    const many = Array.from({ length: 8 }, (_, i) => reminder({ id: `m${i}` }));
    const plan = planDeliveries(many, {}, NOW, 5);
    expect(plan.deliver).toHaveLength(5);
    expect(plan.skipped).toHaveLength(3);
    expect(plan.skipped.every((s) => s.reason === 'run-cap')).toBe(true);
  });

  it('a duplicated reminder inside one run is delivered once', () => {
    const r = reminder({ id: 'dup' });
    const plan = planDeliveries([r, r], {}, NOW);
    expect(plan.deliver).toHaveLength(1);
    expect(plan.skipped[0].reason).toBe('already-delivered');
  });
});

describe('ledger + log hygiene', () => {
  it('pruneLedger drops entries older than the prune window', () => {
    const ledger: DueJobsLedger = {
      fresh: NOW - 1000,
      ancient: NOW - LEDGER_PRUNE_MS - 1,
    };
    expect(Object.keys(pruneLedger(ledger, NOW))).toEqual(['fresh']);
  });

  it('appendRunLog is newest-first and capped', () => {
    const mk = (at: number): DueJobsRunReport => summariseRun('u1', 'manual', [], at);
    let log: DueJobsRunReport[] = [];
    for (let i = 0; i < RUN_LOG_CAP + 3; i++) log = appendRunLog(log, mk(i));
    expect(log).toHaveLength(RUN_LOG_CAP);
    expect(log[0].at).toBe(RUN_LOG_CAP + 2);
  });
});

describe('shouldAutoRun + runTotals', () => {
  it('auto runs fire when never run, wait inside the throttle, fire after it', () => {
    expect(shouldAutoRun(undefined, NOW)).toBe(true);
    expect(shouldAutoRun(NOW - AUTO_RUN_THROTTLE_MS + 1, NOW)).toBe(false);
    expect(shouldAutoRun(NOW - AUTO_RUN_THROTTLE_MS, NOW)).toBe(true);
  });

  it('runTotals sums every outcome column', () => {
    const report = summariseRun('u1', 'boot', [
      { job: 'shraddha', scanned: 3, due: 1, delivered: 1, skipped: 0, failed: 0 },
      { job: 'reminder-queue', scanned: 2, due: 2, delivered: 0, skipped: 2, failed: 0 },
    ], NOW);
    expect(runTotals(report)).toEqual({ scanned: 5, due: 3, delivered: 1, skipped: 2, failed: 0 });
  });
});
