/**
 * notifyCopy.test.ts — NOTIFICATION WAVE 3 proofs.
 * ========================================================
 * The Suchana centre's copy migrated from the trilingual warmCopy
 * store to the 10-language dictionary (surfaces.notify; 176 leaves
 * at Wave 3, 178 after Wave 4's platform-notice frame).
 * This suite proves:
 *   (a) every migrated leaf exists, non-empty, in ALL 10 languages,
 *       with identical key sets — and the en/hi/bn values are the
 *       authored warmCopy text VERBATIM (samples pinned byte-exact);
 *   (b) resolution picks the user's language when its dictionary is
 *       genuinely loaded and falls back to English when it is not —
 *       English is never stamped under another language's code;
 *   (c) the P2a poll-reminder TITLE CONTRACT (a matching key over the
 *       rules-pinned broadcast shape, NOT display copy) is
 *       byte-unchanged and was deliberately NOT migrated.
 */

// NT.tsx pulls LanguageContext → the app firebase module; mock it the
// house way (same pattern as NotificationCenter.test.ts) before imports.
jest.mock('../../firebase', () => ({ db: {} }));

import { core as enCore } from '../../i18n/lang/en/core';
import { core as bnCore } from '../../i18n/lang/bn/core';
import { core as hiCore } from '../../i18n/lang/hi/core';
import { core as taCore } from '../../i18n/lang/ta/core';
import { core as teCore } from '../../i18n/lang/te/core';
import { core as mrCore } from '../../i18n/lang/mr/core';
import { core as guCore } from '../../i18n/lang/gu/core';
import { core as knCore } from '../../i18n/lang/kn/core';
import { core as mlCore } from '../../i18n/lang/ml/core';
import { core as saCore } from '../../i18n/lang/sa/core';
import { loadLanguageDict } from '../../i18n/translations';
import {
  NOTIFY_LANGS,
  buildNotifyText,
  fillNotifyTemplate,
  notifyLeafKey,
  notifyTemplateFrom,
  renderNotifyText,
} from '../notifyCopy';
import { pick } from '../NT';
import {
  POLL_REMINDER_TITLE_PREFIX,
  pollReminderBroadcastTitle,
} from '../../lib/memberPolls';
import type { NotifyKind } from '../types';

const CORES: Record<string, typeof enCore> = {
  en: enCore, bn: bnCore, hi: hiCore, ta: taCore, te: teCore,
  mr: mrCore, gu: guCore, kn: knCore, ml: mlCore, sa: saCore,
};

describe('Wave 3 — surfaces.notify completeness (all 10 languages)', () => {
  const enNotify = enCore.surfaces?.notify ?? {};

  it('carries exactly 178 leaves (89 entries x title/body)', () => {
    // 176 from Wave 3 + 2 from NOTIFICATION WAVE 4 (the platform
    // notice frame: suchanaPlatformNotice title/body).
    expect(Object.keys(enNotify).length).toBe(178);
  });

  it('every language carries the identical 178 keys, all non-empty', () => {
    const expected = Object.keys(enNotify).sort();
    for (const lang of NOTIFY_LANGS) {
      const bucket = CORES[lang].surfaces?.notify ?? {};
      expect(Object.keys(bucket).sort()).toEqual(expected);
      for (const leaf of expected) {
        expect(typeof bucket[leaf]).toBe('string');
        expect((bucket[leaf] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('placeholder sets are identical across all 10 languages, leaf by leaf', () => {
    const ph = (s: string) => Array.from(new Set(s.match(/\{[a-zA-Z]+\}/g) ?? [])).sort().join(',');
    for (const leaf of Object.keys(enNotify)) {
      const ref = ph(enNotify[leaf] as string);
      for (const lang of NOTIFY_LANGS) {
        expect(ph((CORES[lang].surfaces?.notify ?? {})[leaf] as string)).toBe(ref);
      }
    }
  });

  it('en/hi/bn values are the authored warmCopy text, verbatim (samples)', () => {
    // sos.alertSent — titles in all three authored languages.
    expect(enNotify.sosAlertSentTitle).toBe('Help is on the way 🪔');
    expect(bnCore.surfaces?.notify?.sosAlertSentTitle).toBe('সাহায্য আসছে 🪔');
    expect(hiCore.surfaces?.notify?.sosAlertSentTitle).toBe('सहायता आ रही है 🪔');
    // suchana.morningDigest — the digest card.
    expect(enNotify.suchanaMorningDigestTitle).toBe('🌅 Ajker Suchana');
    expect(bnCore.surfaces?.notify?.suchanaMorningDigestTitle).toBe('🌅 আজকের সূচনা');
    expect(hiCore.surfaces?.notify?.suchanaMorningDigestTitle).toBe('🌅 आज की सूचना');
    // org.pollReminder + wallet.payoutFailed bodies, placeholders intact.
    expect(enNotify.orgPollReminderBody).toBe(
      'Voting is open: {title}. If you have not voted yet, your voice is awaited — open Polls from your Personal home.',
    );
    expect(enNotify.walletPayoutFailedBody).toBe(
      'Your payout of {amount} was not approved. Please check your payment details and request again — your earnings remain yours.',
    );
    // A verdict fragment (Wave 1) — curly quotes and placeholder preserved.
    expect(enNotify.orgPollVerdictWinnerTitle).toBe('Result: “{winner}” received the most support.');
  });

  it('leaf naming is mechanical: kind + entry + Title/Body', () => {
    expect(notifyLeafKey('seva_order' as NotifyKind, 'ticketPurchased', 'title')).toBe(
      'sevaOrderTicketPurchasedTitle',
    );
    expect(notifyLeafKey('money_request' as NotifyKind, 'received', 'body')).toBe(
      'moneyRequestReceivedBody',
    );
    expect(notifyLeafKey('org' as NotifyKind, 'pollReminder', 'body')).toBe('orgPollReminderBody');
    expect(notifyTemplateFrom(enCore, 'sosAlertSentTitle')).toBe('Help is on the way 🪔');
    expect(notifyTemplateFrom(enCore, 'noSuchLeaf')).toBeUndefined();
  });
});

describe('Wave 3 — resolution: user language first, English fallback', () => {
  it('an unloaded language falls back to English — never stamps English as its own', () => {
    // No dictionary has been loaded in this test file yet, so 'mr'
    // resolves through the English template (house fallback chain).
    const r = renderNotifyText('sos', 'alertSent', {}, 'mr');
    expect(r.title).toBe('Help is on the way 🪔');
    // …and buildNotifyText omits the unloaded draft slots entirely.
    const t = buildNotifyText('sos', 'alertSent');
    expect(t.title.en).toBe('Help is on the way 🪔');
    expect(t.title.mr).toBeUndefined();
    expect(t.title.ta).toBeUndefined();
  });

  it('once the dictionary loads, resolution picks the user language', async () => {
    await loadLanguageDict('ta');
    await loadLanguageDict('mr');
    const ta = renderNotifyText('sos', 'alertSent', {}, 'ta');
    expect(ta.title).toBe('உதவி வந்து கொண்டிருக்கிறது 🪔');
    const mr = renderNotifyText('wallet', 'payoutFailed', { amount: '₹500' }, 'mr');
    expect(mr.title).toBe('पेमेंट निकाली काढता आले नाही');
    expect(mr.body).toContain('₹500');
    // buildNotifyText now carries the loaded draft slots…
    const t = buildNotifyText('sos', 'alertSent');
    expect(t.title.ta).toBe('உதவி வந்து கொண்டிருக்கிறது 🪔');
    expect(t.title.mr).toBe('मदत येत आहे 🪔');
    // …while a still-unloaded draft language stays honestly absent.
    expect(t.title.kn).toBeUndefined();
  });

  it('a loaded authored language (bn) fills its guaranteed slot with real Bengali', async () => {
    await loadLanguageDict('bn');
    const t = buildNotifyText('sos', 'alertSent');
    expect(t.title.bn).toBe('সাহায্য আসছে 🪔');
    expect(t.body.bn).toContain('সংঘকে জানানো হয়েছে');
  });

  it('unknown copy keys keep the visible marker + empty body (copyFor law)', () => {
    const t = buildNotifyText('org' as NotifyKind, 'noSuchEntry');
    expect(t.title.en).toBe('[copy:org/noSuchEntry]');
    expect(t.body.en).toBe('');
    const r = renderNotifyText('org' as NotifyKind, 'noSuchEntry', {}, 'en');
    expect(r.title).toBe('[copy:org/noSuchEntry]');
    expect(r.body).toBe('');
  });

  it('placeholder fill: known params fill, unknown stay visibly intact', () => {
    expect(fillNotifyTemplate('{name} sent {amount}', { name: 'Rahim' })).toBe(
      'Rahim sent {amount}',
    );
    expect(fillNotifyTemplate('{count} things', { count: 3 })).toBe('3 things');
  });

  it('NT.pick reads the widened map and falls back to English', () => {
    const withTa = { en: 'Hello', bn: 'হ্যালো', hi: 'नमस्ते', ta: 'வணக்கம்' };
    expect(pick(withTa, 'ta')).toBe('வணக்கம்');
    expect(pick(withTa, 'bn')).toBe('হ্যালো');
    const triOnly = { en: 'Hello', bn: 'হ্যালো', hi: 'नमस्ते' };
    expect(pick(triOnly, 'ta')).toBe('Hello');
    expect(pick(triOnly, 'mr')).toBe('Hello');
    expect(pick(triOnly, 'en')).toBe('Hello');
  });
});

describe('Wave 3 — the poll-reminder title contract is NOT display copy', () => {
  it('the broadcast title prefix is byte-unchanged', () => {
    expect(POLL_REMINDER_TITLE_PREFIX).toBe('Voting reminder: ');
    expect(pollReminderBroadcastTitle('Which day for the festival?')).toBe(
      'Voting reminder: Which day for the festival?',
    );
  });

  it('the migrated org.pollReminder copy is the Suchana display copy, not the contract', () => {
    // The dictionary entry is the in-app item's own title/body — its
    // title is the org-name line, and it never carries the prefix the
    // receiver-side matcher keys on.
    const t = buildNotifyText('org', 'pollReminder', { orgName: 'TestOrg', title: 'X' });
    expect(t.title.en).toBe('🗳️ TestOrg');
    expect(t.title.en.startsWith(POLL_REMINDER_TITLE_PREFIX)).toBe(false);
    expect(t.body.en).toContain('Voting is open: X.');
  });
});
