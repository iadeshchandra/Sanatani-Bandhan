/**
 * wave2Routing.test.ts — NOTIFICATION WAVE 2: per-org modes + the
 * L8 digest floor in the delivery path (engine.decideRouting).
 *
 * The laws under test (DESIGN §5 / L8):
 *  - 'actions' silences an org's INFORMATION, never its actions.
 *  - 'muted' silences information outright and demotes actions to
 *    the digest — "digest, never off".
 *  - SOS / critical is unmuzzable under every mode.
 *  - A floored item (approval-requested, payout-failed) survives
 *    even a kind switch set to OFF — demoted to the digest.
 *  - Broadcasts are information even at 'important' priority
 *    (organn:), and poll reminders are actions (pollremind:) — the
 *    tier vocabulary is the DESIGN's, not the priority's.
 */
import { decideRouting, hasDigestFloor, orgTierClass } from '../engine';
import { DEFAULT_PREFS, mergePrefs, orgModeFor, type NotificationPrefs } from '../preferences';
import type { NotifyEvent } from '../types';

/** Midday local — safely outside the default 05:00–07:00 quiet hours. */
const NOW = new Date(2026, 10, 24, 12, 0, 0).getTime();

const prefs = (patch: Partial<NotificationPrefs> = {}): NotificationPrefs => mergePrefs(patch);

const ev = (over: Partial<NotifyEvent> = {}): NotifyEvent => ({
  kind: 'org',
  priority: 'important',
  title: { en: 't', bn: 't', hi: 't' },
  body: { en: 'b', bn: 'b', hi: 'b' },
  dedupeKey: 'x:1',
  payload: { orgId: 'org-1' },
  ...over,
});

describe('orgModeFor', () => {
  it('absent, unknown-org, and garbage values all read as all', () => {
    expect(orgModeFor(DEFAULT_PREFS, 'org-1')).toBe('all');
    expect(orgModeFor(prefs({ orgModes: { 'org-2': 'muted' } }), 'org-1')).toBe('all');
    expect(
      orgModeFor(prefs({ orgModes: { 'org-1': 'loud' as never } }), 'org-1'),
    ).toBe('all');
    expect(orgModeFor(DEFAULT_PREFS, null)).toBe('all');
    expect(orgModeFor(DEFAULT_PREFS, undefined)).toBe('all');
  });

  it('reads the recorded mode', () => {
    expect(orgModeFor(prefs({ orgModes: { 'org-1': 'actions' } }), 'org-1')).toBe('actions');
    expect(orgModeFor(prefs({ orgModes: { 'org-1': 'muted' } }), 'org-1')).toBe('muted');
  });
});

describe('orgTierClass — the DESIGN vocabulary, not the priority', () => {
  it('critical priority and the sos kind are critical', () => {
    expect(orgTierClass(ev({ priority: 'critical' }))).toBe('critical');
    expect(orgTierClass(ev({ kind: 'sos', priority: 'important' }))).toBe('critical');
  });

  it('a trustee broadcast is INFORMATION even though it rides important', () => {
    expect(orgTierClass(ev({ dedupeKey: 'organn:b-9' }))).toBe('info');
  });

  it('a poll reminder is an ACTION even though it arrives as a broadcast', () => {
    expect(orgTierClass(ev({ dedupeKey: 'pollremind:p-1:u-2' }))).toBe('action');
  });

  it('important is action, gentle is info', () => {
    expect(orgTierClass(ev({ dedupeKey: 'resolution:r-1:pending' }))).toBe('action');
    expect(orgTierClass(ev({ priority: 'gentle', dedupeKey: 'txn:t-1' }))).toBe('info');
  });
});

describe('hasDigestFloor', () => {
  it('only the stamped floor counts', () => {
    expect(hasDigestFloor(ev({ payload: { floor: 'digest' } }))).toBe(true);
    expect(hasDigestFloor(ev({ payload: { orgId: 'org-1' } }))).toBe(false);
    expect(hasDigestFloor(ev({ payload: { floor: 'off' } }))).toBe(false);
    expect(hasDigestFloor(ev({ payload: undefined }))).toBe(false);
  });
});

describe('decideRouting — per-org modes', () => {
  const muted = prefs({ orgModes: { 'org-1': 'muted' } });
  const actionsOnly = prefs({ orgModes: { 'org-1': 'actions' } });

  it('muted: an info item is not written at all (suppressed org)', () => {
    const d = decideRouting(ev({ priority: 'gentle', dedupeKey: 'txn:t-1' }), muted, NOW);
    expect(d.inApp).toBe(false);
    expect(d.suppressed).toBe('org');
  });

  it('muted: a broadcast (info at important priority) is not written either', () => {
    const d = decideRouting(ev({ dedupeKey: 'organn:b-9' }), muted, NOW);
    expect(d.inApp).toBe(false);
    expect(d.suppressed).toBe('org');
  });

  it('muted: an action item still arrives — demoted to the digest, never off', () => {
    const d = decideRouting(ev({ dedupeKey: 'resolution:r-1:pending' }), muted, NOW);
    expect(d.inApp).toBe(true);
    expect(d.ping).toBe(false);
    expect(d.digestCandidate).toBe(true);
    expect(d.suppressed ?? null).toBeNull();
  });

  it('muted: SOS from that very org still breaks through (unmuzzable)', () => {
    const d = decideRouting(
      ev({ kind: 'sos', priority: 'critical', dedupeKey: 'sos:s-1' }),
      muted,
      NOW,
    );
    expect(d.ping).toBe(true);
    expect(d.inApp).toBe(true);
    expect(d.persistent).toBe(true);
  });

  it('actions-only: info rests, actions ring normally', () => {
    const info = decideRouting(ev({ priority: 'gentle', dedupeKey: 'txn:t-1' }), actionsOnly, NOW);
    expect(info.inApp).toBe(false);
    expect(info.suppressed).toBe('org');
    const action = decideRouting(
      ev({ dedupeKey: 'resolution:r-1:pending' }),
      actionsOnly,
      NOW,
    );
    expect(action.inApp).toBe(true);
    expect(action.ping).toBe(true);
    expect(action.suppressed ?? null).toBeNull();
  });

  it('a mode for org-1 says nothing about org-2, and personal items are untouched', () => {
    const other = decideRouting(
      ev({ priority: 'gentle', dedupeKey: 'txn:t-2', payload: { orgId: 'org-2' } }),
      muted,
      NOW,
    );
    expect(other.inApp).toBe(true);
    const personal = decideRouting(
      ev({ priority: 'gentle', dedupeKey: 'txn:t-3', payload: {} }),
      muted,
      NOW,
    );
    expect(personal.inApp).toBe(true);
    expect(personal.suppressed ?? null).toBeNull();
  });

  it('all (default): the org block changes nothing', () => {
    const d = decideRouting(ev({ priority: 'gentle', dedupeKey: 'txn:t-1' }), DEFAULT_PREFS, NOW);
    expect(d.inApp).toBe(true);
    expect(d.digestCandidate).toBe(true);
  });
});

describe('decideRouting — the L8 floor vs the kind switch', () => {
  const securityOff = prefs({ kindToggles: { security: false } });
  const approval = ev({
    kind: 'security',
    dedupeKey: 'payoutreq:r-1:u-9',
    payload: { orgId: 'org-1', requestId: 'r-1', floor: 'digest' },
  });

  it('a floored approval request survives its kind being switched OFF — as digest', () => {
    const d = decideRouting(approval, securityOff, NOW);
    expect(d.inApp).toBe(true);
    expect(d.ping).toBe(false);
    expect(d.digestCandidate).toBe(true);
    expect(d.suppressed ?? null).toBeNull();
  });

  it('the same event WITHOUT the floor stamp is silenced by the switch', () => {
    const unfloored = ev({
      kind: 'security',
      dedupeKey: 'payoutreq:r-1:u-9',
      payload: { orgId: 'org-1', requestId: 'r-1' },
    });
    const d = decideRouting(unfloored, securityOff, NOW);
    expect(d.inApp).toBe(false);
    expect(d.suppressed).toBe('category');
  });

  it('floor + muted org together still land in the digest (the two demotions agree)', () => {
    const both = prefs({
      kindToggles: { security: false },
      orgModes: { 'org-1': 'muted' },
    });
    const d = decideRouting(approval, both, NOW);
    expect(d.inApp).toBe(true);
    expect(d.digestCandidate).toBe(true);
  });
});
