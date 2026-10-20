/**
 * solo/__tests__/discoverabilityDoors.test.ts — doors for offenses #9/#10/#12.
 * =====================================================================
 * Audit 2026-10-20: features that exist but users can't find. These
 * fs-scan tests pin the three relocation doors so they can never
 * silently regress:
 *   #9  Personal Wallet: a LABELED "Request money" door opens the same
 *       RequestModal the chat composer uses (the icon-only 🙏 was the
 *       only compose door before).
 *   #10 OrgsTab: "View public page" navigates to /org/:id — the public
 *       face where aarti schedules, campus map, events and live darshan
 *       live (orgId == workspace id, orgPages is keyed by it).
 *   #12 GigDetail: the provider's name is a door to /seva/pro/:uid —
 *       the trust profile (gratitude wall, verification, other sevas).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const src = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('offense #9 — the wallet gains a labeled request door', () => {
  const wallet = () => src('chat/PersonalWallet.tsx');

  it('has a labeled Request-money door (not an icon-only button)', () => {
    expect(wallet()).toMatch(/Request money/);
    expect(wallet()).toMatch(/onClick=\{\(\) => setPickerOpen\(true\)\}/);
  });

  it('the door opens the same RequestModal chat uses', () => {
    expect(wallet()).toContain("import RequestModal from './RequestModal';");
    expect(wallet()).toContain('<RequestModal');
    expect(wallet()).toContain('recipient={activeTarget.recipient}');
  });

  it('targets reuse the counterparty\'s existing thread', () => {
    expect(wallet()).toContain("import { requestTargetsFromEntries");
    expect(wallet()).toContain('chatId={activeTarget.chatId}');
  });

  it('SoloHome supplies the devotee identity so the door can compose', () => {
    expect(src('solo/SoloHome.tsx')).toContain('<PersonalWallet');
    expect(src('solo/SoloHome.tsx')).toContain('currentUser={selfInfo}');
  });
});

describe('offense #10 — OrgsTab rows gain a public-page door', () => {
  const tab = () => src('solo/OrgsTab.tsx');

  it('renders a labeled public-page button per row', () => {
    expect(tab()).toMatch(/View public page/);
  });

  it('navigates to /org/:id (workspace id == orgPages id)', () => {
    expect(tab()).toContain('navigate(`/org/${ws.id}`)');
  });

  it('demo sandboxes (no published page) get no door', () => {
    expect(tab()).toContain("startsWith('DEMO_')");
  });
});

describe('offense #12 — GigDetail links the provider to their profile', () => {
  const detail = () => src('marketplace/GigDetail.tsx');

  it('the provider name opens /seva/pro/:uid', () => {
    expect(detail()).toContain('`/seva/pro/${gig.providerUid}`');
    expect(detail()).toContain('navigate(proPath)');
  });

  it('the door is labeled for screen readers', () => {
    expect(detail()).toContain('viewProfile');
  });

  it('a gig without a providerUid keeps the plain dead-text fallback', () => {
    expect(detail()).toContain('gig.providerUid ?');
  });
});
