/**
 * groups/__tests__/groups.test.ts — unit tests for group chat pure logic.
 * Covers: invite codes, group ids, member/admin RBAC helpers, warm system
 * messages, typing labels, name/code validation, message previews.
 * (Firestore I/O itself is covered by the emulator rules suite, not here.)
 */
/**
 * Mock the Firebase surface before any group module loads it —
 * these are pure-logic tests: no emulator, no network.
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  increment: jest.fn(),
  deleteField: jest.fn(),
}));

jest.mock('../../../firebase', () => ({
  db: {},
}));

import {
  generateInviteCode,
  newGroupId,
  isGroupMember,
  isGroupAdmin,
  groupTypeLabel,
  groupTypeIcon,
  systemMessageText,
  typingLabel,
  validGroupName,
  validInviteCode,
  groupMessagePreview,
  type GroupChat,
} from '../types';

function fakeGroup(overrides: Partial<GroupChat> = {}): GroupChat {
  return {
    id: 'grp_test',
    name: 'Test Group',
    type: 'satsang',
    createdBy: 'uidA',
    createdAt: 1000,
    updatedAt: 1000,
    memberIds: ['uidA', 'uidB', 'uidC'],
    adminIds: ['uidA'],
    memberInfo: {
      uidA: { uid: 'uidA', displayName: 'Anjali' },
      uidB: { uid: 'uidB', displayName: 'Ravi' },
      uidC: { uid: 'uidC', displayName: 'Meera' },
    },
    inviteCode: 'ABCDEFGH',
    ...overrides,
  };
}

describe('generateInviteCode', () => {
  it('produces an 8-char code from the unambiguous alphabet', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(code).not.toMatch(/[01ILO]/);
  });

  it('is unique across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(45);
  });

  it('accepts a custom random source (deterministic in tests)', () => {
    const code = generateInviteCode(() => 0);
    expect(code).toBe('AAAAAAAA');
  });
});

describe('newGroupId', () => {
  it('starts with grp_ and is unique', () => {
    const a = newGroupId('uidA', () => 0.1);
    const b = newGroupId('uidA', () => 0.9);
    expect(a.startsWith('grp_')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('isGroupMember / isGroupAdmin', () => {
  const g = fakeGroup();

  it('identifies members', () => {
    expect(isGroupMember(g, 'uidA')).toBe(true);
    expect(isGroupMember(g, 'uidB')).toBe(true);
    expect(isGroupMember(g, 'uidZ')).toBe(false);
  });

  it('identifies admins', () => {
    expect(isGroupAdmin(g, 'uidA')).toBe(true);
    expect(isGroupAdmin(g, 'uidB')).toBe(false);
  });

  it('handles null/undefined group safely', () => {
    expect(isGroupMember(null, 'uidA')).toBe(false);
    expect(isGroupMember(undefined, 'uidA')).toBe(false);
    expect(isGroupAdmin(null, 'uidA')).toBe(false);
  });

  it('handles empty uid safely', () => {
    expect(isGroupMember(g, '')).toBe(false);
    expect(isGroupAdmin(g, '')).toBe(false);
  });
});

describe('groupTypeLabel', () => {
  it('labels all types in English', () => {
    expect(groupTypeLabel('family', 'en')).toBe('Family');
    expect(groupTypeLabel('satsang', 'en')).toBe('Satsang');
    expect(groupTypeLabel('temple', 'en')).toBe('Temple');
    expect(groupTypeLabel('yatra', 'en')).toBe('Yatra');
    expect(groupTypeLabel('custom', 'en')).toBe('Group');
  });

  it('labels in Bangla and Hindi', () => {
    expect(groupTypeLabel('satsang', 'bn')).toBe('সৎসঙ্গ');
    expect(groupTypeLabel('satsang', 'hi')).toBe('सत्संग');
    expect(groupTypeLabel('family', 'bn')).toBe('পরিবার');
  });
});

describe('groupTypeIcon', () => {
  it('returns a distinct icon per type', () => {
    const icons = ['family', 'satsang', 'temple', 'yatra', 'custom'].map((t) =>
      groupTypeIcon(t as never),
    );
    expect(new Set(icons).size).toBe(5);
  });
});

describe('systemMessageText — warm Sanatani tone, never corporate', () => {
  it('created message carries a blessing', () => {
    const t = systemMessageText('created', 'Anjali', undefined, 'en');
    expect(t).toContain('🙏');
    expect(t).toContain('Anjali');
    expect(t).not.toMatch(/user/i);
  });

  it('joined message welcomes warmly', () => {
    expect(systemMessageText('joined', 'Ravi', undefined, 'en')).toMatch(/welcome/i);
  });

  it('left message is gentle, not cold', () => {
    const t = systemMessageText('left', 'Ravi', undefined, 'en');
    expect(t).toMatch(/shubh yatra/i);
  });

  it('added names both actor and target', () => {
    const t = systemMessageText('added', 'Anjali', 'Ravi', 'en');
    expect(t).toContain('Anjali');
    expect(t).toContain('Ravi');
  });

  it('renamed announces the new name', () => {
    const t = systemMessageText('renamed', '', 'Morning Satsang', 'en');
    expect(t).toContain('Morning Satsang');
  });

  it('renders in Bangla', () => {
    const t = systemMessageText('joined', 'অঞ্জলি', undefined, 'bn');
    expect(t).toContain('🙏');
    expect(t).toContain('অঞ্জলি');
  });

  it('renders in Hindi', () => {
    const t = systemMessageText('joined', 'अंजलि', undefined, 'hi');
    expect(t).toContain('🙏');
    expect(t).toContain('अंजलि');
  });

  it('truncates very long names (no injection bloat)', () => {
    const t = systemMessageText('joined', 'x'.repeat(200), undefined, 'en');
    expect(t.length).toBeLessThan(120);
  });
});

describe('typingLabel', () => {
  const g = fakeGroup();

  it('returns null when nobody is typing', () => {
    expect(typingLabel({}, g.memberInfo, 'uidA', 'en')).toBeNull();
    expect(typingLabel(undefined, g.memberInfo, 'uidA', 'en')).toBeNull();
  });

  it('names a single typist', () => {
    const t = typingLabel({ uidB: true }, g.memberInfo, 'uidA', 'en');
    expect(t).toBe('Ravi is typing…');
  });

  it('counts multiple typists', () => {
    const t = typingLabel({ uidB: true, uidC: true }, g.memberInfo, 'uidA', 'en');
    expect(t).toBe('2 people typing…');
  });

  it('excludes self from the count', () => {
    expect(typingLabel({ uidA: true }, g.memberInfo, 'uidA', 'en')).toBeNull();
    const t = typingLabel({ uidA: true, uidB: true }, g.memberInfo, 'uidA', 'en');
    expect(t).toBe('Ravi is typing…');
  });

  it('renders in Bangla and Hindi', () => {
    expect(typingLabel({ uidB: true }, g.memberInfo, 'uidA', 'bn')).toContain('লিখছেন');
    expect(typingLabel({ uidB: true, uidC: true }, g.memberInfo, 'uidA', 'hi')).toContain('लिख रहे हैं');
  });
});

describe('validGroupName', () => {
  it('accepts normal names', () => {
    expect(validGroupName('Sharma Family')).toBe(true);
    expect(validGroupName('AB')).toBe(true);
  });

  it('rejects too-short, too-long, and blank names', () => {
    expect(validGroupName('A')).toBe(false);
    expect(validGroupName('')).toBe(false);
    expect(validGroupName('   ')).toBe(false);
    expect(validGroupName('x'.repeat(61))).toBe(false);
    expect(validGroupName('x'.repeat(60))).toBe(true);
  });
});

describe('validInviteCode', () => {
  it('accepts well-formed codes', () => {
    expect(validInviteCode('ABCDEFGH')).toBe(true);
    expect(validInviteCode('abcdefgh')).toBe(true); // normalized
    expect(validInviteCode('  ABCD2345  ')).toBe(true);
  });

  it('rejects malformed codes', () => {
    expect(validInviteCode('ABC')).toBe(false);
    expect(validInviteCode('ABCDEFGH1')).toBe(false);
    expect(validInviteCode('ABCD01LO')).toBe(false); // ambiguous chars excluded
    expect(validInviteCode('')).toBe(false);
  });
});

describe('groupMessagePreview', () => {
  it('prefixes blessings with a diya', () => {
    expect(groupMessagePreview({ kind: 'blessing', text: 'Shubh' })).toBe('🪔 Shubh');
  });

  it('passes system and text through', () => {
    expect(groupMessagePreview({ kind: 'system', text: '🙏 x joined' })).toBe('🙏 x joined');
    expect(groupMessagePreview({ kind: 'text', text: 'Namaste' })).toBe('Namaste');
  });
});
