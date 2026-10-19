/**
 * moderation.test.ts — Audit Fix #9: report → moderation, wired end-to-end.
 *
 * Covers the pure decision logic:
 * - toCloudReport produces EXACTLY the sangamReports create whitelist
 * - warnTargetForReport derives the warn target from targetId (not targetUid)
 * - shouldThankReporter thanks on action, never on dismiss, never without a reporter
 * - actionsForTarget offers contextual actions per target type
 * - isHidden drives the client-side hide filtering
 */
import { toCloudReport } from '../serializers';
import {
  isHidden,
  warnTargetForReport,
  shouldThankReporter,
  actionsForTarget,
  REPORT_CREATE_WHITELIST,
  reportPayloadKeysValid,
} from '../moderationPure';
import type { SangamReport } from '../types';

// --- sangamReports create whitelist mirror (firestore.rules) ---
const REPORT_WHITELIST = [...REPORT_CREATE_WHITELIST];

const baseReport: SangamReport = {
  id: 'report_abc123',
  reporterUid: 'uid_reporter',
  reporterName: 'Meera',
  targetType: 'post',
  targetId: 'post_xyz',
  reason: 'spam',
  details: 'Selling watches in the feed',
  status: 'open',
  createdAt: 1729500000000,
};

describe('toCloudReport whitelist compliance', () => {
  it('produces exactly the 8 whitelisted fields', () => {
    const out = toCloudReport(baseReport);
    expect(Object.keys(out).sort()).toEqual([...REPORT_WHITELIST].sort());
  });

  it('strips the local id (the Fix #1 rejection cause)', () => {
    const out = toCloudReport(baseReport);
    expect('id' in out).toBe(false);
    expect('localOnly' in out).toBe(false);
    expect('updatedAt' in out).toBe(false);
  });

  it('strips undefined details (Firestore rejects undefined)', () => {
    const out = toCloudReport({ ...baseReport, details: undefined });
    expect('details' in out).toBe(false);
    expect(Object.keys(out).sort()).toEqual(
      REPORT_WHITELIST.filter((k) => k !== 'details').sort(),
    );
  });

  it('keeps status open (rules require status == open on create)', () => {
    expect(toCloudReport(baseReport).status).toBe('open');
  });

  it('supports short and video target types (Fix #9)', () => {
    const shortOut = toCloudReport({ ...baseReport, targetType: 'short', targetId: 'short_1' });
    expect(shortOut.targetType).toBe('short');
    expect(Object.keys(shortOut).sort()).toEqual([...REPORT_WHITELIST].sort());
    const videoOut = toCloudReport({ ...baseReport, targetType: 'video', targetId: 'vid_1' });
    expect(videoOut.targetType).toBe('video');
    expect(Object.keys(videoOut).sort()).toEqual([...REPORT_WHITELIST].sort());
  });
});

describe('warnTargetForReport', () => {
  it('warns the reported user via targetId (the Fix #9 correction)', () => {
    expect(warnTargetForReport({ targetType: 'user', targetId: 'uid_bad' })).toBe('uid_bad');
  });

  it('returns null for content targets (never warns a post)', () => {
    expect(warnTargetForReport({ targetType: 'post', targetId: 'post_1' })).toBeNull();
    expect(warnTargetForReport({ targetType: 'short', targetId: 'short_1' })).toBeNull();
    expect(warnTargetForReport({ targetType: 'video', targetId: 'vid_1' })).toBeNull();
  });

  it('returns null when targetId is missing (fail-closed)', () => {
    expect(warnTargetForReport({ targetType: 'user', targetId: '' })).toBeNull();
    expect(warnTargetForReport({ targetType: 'user' })).toBeNull();
  });

  it('ignores the legacy targetUid field entirely', () => {
    // The old code read rep.targetUid — a field that never exists.
    expect(warnTargetForReport({ targetType: 'user', targetId: 'uid_x' } as never)).toBe('uid_x');
  });
});

describe('shouldThankReporter', () => {
  it('thanks on hide_content, warn_user, suspend_user', () => {
    const rep = { reporterUid: 'uid_r' };
    expect(shouldThankReporter('hide_content', rep)).toBe(true);
    expect(shouldThankReporter('warn_user', rep)).toBe(true);
    expect(shouldThankReporter('suspend_user', rep)).toBe(true);
  });

  it('never thanks on dismiss', () => {
    expect(shouldThankReporter('dismiss', { reporterUid: 'uid_r' })).toBe(false);
  });

  it('never thanks without a reporter uid', () => {
    expect(shouldThankReporter('hide_content', {})).toBe(false);
    expect(shouldThankReporter('hide_content', { reporterUid: '' })).toBe(false);
  });
});

describe('actionsForTarget', () => {
  it('offers dismiss + hide for content targets', () => {
    expect(actionsForTarget('post')).toEqual(['dismiss', 'hide_content']);
    expect(actionsForTarget('short')).toEqual(['dismiss', 'hide_content']);
    expect(actionsForTarget('video')).toEqual(['dismiss', 'hide_content']);
    expect(actionsForTarget('comment')).toEqual(['dismiss', 'hide_content']);
  });

  it('offers dismiss + warn + suspend for user targets', () => {
    expect(actionsForTarget('user')).toEqual(['dismiss', 'warn_user', 'suspend_user']);
  });

  it('defaults to content actions for unknown types', () => {
    expect(actionsForTarget(undefined)).toEqual(['dismiss', 'hide_content']);
  });
});

describe('isHidden', () => {
  it('detects hidden ids', () => {
    const hidden = new Set(['post_1', 'short_9']);
    expect(isHidden(hidden, 'post_1')).toBe(true);
    expect(isHidden(hidden, 'short_9')).toBe(true);
    expect(isHidden(hidden, 'post_2')).toBe(false);
  });

  it('empty set hides nothing', () => {
    expect(isHidden(new Set(), 'anything')).toBe(false);
  });
});

describe('reportPayloadKeysValid', () => {
  it('accepts whitelist-exact payloads', () => {
    expect(reportPayloadKeysValid(toCloudReport(baseReport))).toBe(true);
  });

  it('rejects payloads with extra keys (id, localOnly)', () => {
    expect(reportPayloadKeysValid({ ...toCloudReport(baseReport), id: 'x' })).toBe(false);
    expect(reportPayloadKeysValid({ ...toCloudReport(baseReport), localOnly: true })).toBe(false);
  });
});
