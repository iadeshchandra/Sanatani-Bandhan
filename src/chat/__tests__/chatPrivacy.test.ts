/**
 * chatPrivacy.test.ts — mirrors the firestore.rules chatOrgId / isChatOrgTrustee
 * logic (2026-10-19 privacy fix) in plain JS so the scoping behavior is
 * pinned by tests. The rules functions are the source of truth; this test
 * documents the intended before/after behavior.
 */

// Mirror of firestore.rules chatOrgId(chatData)
function chatOrgId(chatData: Record<string, unknown>): string {
  const orgId = (chatData['orgId'] as string) ?? '';
  if (orgId !== '') return orgId;
  const participants = chatData['participants'];
  return Array.isArray(participants) && participants.length === 2
    ? String(participants[1] ?? '')
    : '';
}

// Mirror of firestore.rules isChatOrgTrustee(chatData) minus the membership
// check (which needs Firestore). Returns the orgId a trustee claim would be
// evaluated against, or null when trustee access must be denied outright.
function trusteeScopeOrg(chatData: Record<string, unknown>): string | null {
  if (chatData['type'] !== 'org') return null;
  const orgId = chatOrgId(chatData);
  return orgId !== '' ? orgId : null;
}

describe('chat privacy scoping (2026-10-19 fix)', () => {
  it('denies trustee access to 1:1 direct chats', () => {
    const direct = {
      type: 'direct',
      participants: ['uid_alice', 'uid_bob'],
    };
    expect(trusteeScopeOrg(direct)).toBeNull();
  });

  it('denies trustee access when type is missing (fail closed)', () => {
    const legacy = { participants: ['uid_alice', 'uid_bob'] };
    expect(trusteeScopeOrg(legacy)).toBeNull();
  });

  it('scopes trustee access to the orgId on new org chats (explicit field)', () => {
    const orgChat = {
      type: 'org',
      orgId: 'org_kashi',
      participants: ['uid_alice', 'org_kashi'],
    };
    expect(trusteeScopeOrg(orgChat)).toBe('org_kashi');
  });

  it('falls back to participants[1] for legacy org chats', () => {
    const legacyOrgChat = {
      type: 'org',
      participants: ['uid_alice', 'org_kashi'],
    };
    expect(trusteeScopeOrg(legacyOrgChat)).toBe('org_kashi');
  });

  it('explicit orgId wins over participants[1] when both present', () => {
    const chat = {
      type: 'org',
      orgId: 'org_new',
      participants: ['uid_alice', 'org_old'],
    };
    expect(chatOrgId(chat)).toBe('org_new');
  });

  it('returns empty when participants is malformed', () => {
    expect(chatOrgId({ type: 'org', participants: ['only_one'] })).toBe('');
    expect(chatOrgId({ type: 'org', participants: 'not-a-list' })).toBe('');
    expect(chatOrgId({ type: 'org' })).toBe('');
  });

  it('before/after: old blanket roleIn would allow, new scoping denies 1:1', () => {
    // Old rule: roleIn(['SuperAdmin','SUPER_ADMIN','Trustee','TRUSTEE']) → true
    // for ANY trustee on ANY chat. New rule: trusteeScopeOrg returns null for
    // direct chats, so the trustee branch cannot match. Participant and
    // SuperAdmin branches are unchanged.
    const direct = { type: 'direct', participants: ['uid_a', 'uid_b'] };
    const wouldOldRuleAllowTrustee = true; // blanket roleIn
    const doesNewRuleAllowTrustee = trusteeScopeOrg(direct) !== null;
    expect(wouldOldRuleAllowTrustee).toBe(true);
    expect(doesNewRuleAllowTrustee).toBe(false);
  });
});
