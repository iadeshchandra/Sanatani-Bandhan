/**
 * Chat foundation — unit tests for pure logic.
 * Covers: deterministic thread ids, blessing catalogue, chat time formatting.
 * (Firestore I/O itself is covered by the emulator rules suite, not here.)
 */
/**
 * Mock the Firebase surface before any chat module loads it —
 * these are pure-logic tests: no emulator, no network.
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn(),
  deleteField: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {},
}));

import { directChatId, orgChatId } from '../chat/chatService';
import { BLESSING_OCCASIONS, blessingFor } from '../chat/BlessingCard';
import { formatChatTime } from '../chat/ChatList';

describe('deterministic thread ids', () => {
  it('directChatId sorts uids so the same pair always maps to one thread', () => {
    expect(directChatId('uidB', 'uidA')).toBe(directChatId('uidA', 'uidB'));
    expect(directChatId('uidA', 'uidB')).toBe('uidA_uidB');
  });

  it('directChatId differs per pair', () => {
    expect(directChatId('uidA', 'uidB')).not.toBe(directChatId('uidA', 'uidC'));
  });

  it('orgChatId is deterministic per user+org', () => {
    expect(orgChatId('user1', 'org9')).toBe('org_org9_user1');
    expect(orgChatId('user1', 'org9')).toBe(orgChatId('user1', 'org9'));
    expect(orgChatId('user1', 'org9')).not.toBe(orgChatId('user2', 'org9'));
  });
});

describe('blessing catalogue', () => {
  it('has at least the six required occasions', () => {
    const keys = BLESSING_OCCASIONS.map((b) => b.key);
    for (const k of ['generic', 'deepavali', 'holi', 'janmashtami', 'durga_puja', 'ekadashi']) {
      expect(keys).toContain(k);
    }
  });

  it('every occasion is trilingual with a Devanagari greeting', () => {
    for (const b of BLESSING_OCCASIONS) {
      expect(b.en.length).toBeGreaterThan(10);
      expect(b.bn.length).toBeGreaterThan(10);
      expect(b.hi.length).toBeGreaterThan(10);
      expect(b.greetingSa).toMatch(/॥/);
      expect(b.gradient).toContain('from-');
    }
  });

  it('blessingFor falls back to generic for unknown keys', () => {
    expect(blessingFor('diwali-typo').key).toBe('generic');
    expect(blessingFor('deepavali').key).toBe('deepavali');
  });
});

describe('formatChatTime', () => {
  it('returns empty for missing timestamps', () => {
    expect(formatChatTime(undefined, 'en')).toBe('');
  });

  it('shows time for today, weekday for this week, date for older', () => {
    const now = Date.now();
    const today = formatChatTime(now - 1000, 'en');
    expect(today.length).toBeGreaterThan(0);
    // 3 days ago → weekday name
    const threeDays = formatChatTime(now - 3 * 86400000, 'en');
    expect(threeDays.length).toBeGreaterThan(0);
    expect(threeDays).not.toBe(today);
    // 30 days ago → date
    const month = formatChatTime(now - 30 * 86400000, 'en');
    expect(month.length).toBeGreaterThan(0);
  });

  it('localises for bn and hi', () => {
    const now = Date.now() - 1000;
    expect(formatChatTime(now, 'bn').length).toBeGreaterThan(0);
    expect(formatChatTime(now, 'hi').length).toBeGreaterThan(0);
  });
});
