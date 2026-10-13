/**
 * membership.rules.spec.ts — Organisation Membership System rules tests.
 * ==========================================================================
 * Covers: orgPages, followers, joinRequests, orgInvites, workspaceMembers,
 * and the isTenantMember/hasRole extension via workspaceMembers edges.
 *
 * Run: firebase emulators:exec --project demo-sanatanibandhan "jest tests/membership.rules.spec.ts"
 * (CI runs the emulator; these tests need it.)
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

const FUTURE = Date.now() + 30 * 24 * 60 * 60 * 1000;
const PAST = Date.now() - 1000;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-sanatanibandhan',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8081,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    // Workspaces
    await db.collection('workspaces').doc('ws-1').set({ name: 'Test Sangha', type: 'Sangha' });
    await db.collection('workspaces').doc('ws-2').set({ name: 'Test Mandir', type: 'Mandir' });

    // Users: trustee-1 is Trustee of ws-1 (via users-doc role + workspaceId);
    // member-1 is a plain Devotee; outsider-1 belongs nowhere.
    await db.collection('users').doc('trustee-1').set({ workspaceId: 'ws-1', role: 'Trustee' });
    await db.collection('users').doc('member-1').set({ workspaceId: 'ws-1', role: 'Devotee' });
    await db.collection('users').doc('outsider-1').set({ role: 'Devotee' });

    // A membership edge: edge-member-1 is a Sevadar of ws-1 via workspaceMembers only.
    await db.collection('users').doc('edge-member-1').set({ role: 'Devotee' });
    await db.collection('workspaceMembers').doc('ws-1_edge-member-1').set({
      id: 'ws-1_edge-member-1',
      workspaceId: 'ws-1',
      uid: 'edge-member-1',
      role: 'Sevadar',
      joinedAt: 1,
      joinedVia: 'invite',
    });

    // A pending invite naming outsider-1 by uid (role Sevadar), unexpired.
    await db.collection('orgInvites').doc('inv-1').set({
      id: 'inv-1',
      orgId: 'ws-1',
      orgName: 'Test Sangha',
      orgType: 'Sangha',
      invitedUid: 'outsider-1',
      invitedEmail: '',
      invitedPhone: '',
      role: 'Sevadar',
      status: 'PENDING',
      invitedByUid: 'trustee-1',
      invitedByName: 'Trustee One',
      createdAt: 1,
      expiresAt: FUTURE,
    });

    // An expired invite (must be un-acceptable).
    await db.collection('orgInvites').doc('inv-expired').set({
      id: 'inv-expired',
      orgId: 'ws-1',
      orgName: 'Test Sangha',
      orgType: 'Sangha',
      invitedUid: 'outsider-1',
      role: 'Devotee',
      status: 'PENDING',
      invitedByUid: 'trustee-1',
      invitedByName: 'Trustee One',
      createdAt: 1,
      expiresAt: PAST,
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('Membership rules — orgPages', () => {
  it('M1. Anyone (even anonymous) can read a public org page', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await c.firestore().collection('orgPages').doc('ws-1').set({ orgId: 'ws-1', name: 'Test Sangha', type: 'Sangha' });
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(anon.collection('orgPages').doc('ws-1').get());
  });

  it('M2. Non-trustee cannot write an org page', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(db.collection('orgPages').doc('ws-1').set({ orgId: 'ws-1', name: 'Hacked' }));
  });

  it('M3. Trustee can publish/update the org page (public fields only)', async () => {
    const db = testEnv.authenticatedContext('trustee-1').firestore();
    await assertSucceeds(
      db.collection('orgPages').doc('ws-1').set({
        orgId: 'ws-1', name: 'Test Sangha', type: 'Sangha', city: 'Nagpur', updatedAt: 1,
      })
    );
  });
});

describe('Membership rules — followers', () => {
  it('M4. Anyone can read followers; only the user can follow/unfollow as themselves', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(anon.collection('followers').doc('ws-1').collection('users').get());

    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertSucceeds(
      me.collection('followers').doc('ws-1').collection('users').doc('outsider-1').set({ uid: 'outsider-1', followedAt: 1 })
    );
    // Cannot follow as someone else
    await assertFails(
      me.collection('followers').doc('ws-1').collection('users').doc('member-1').set({ uid: 'member-1', followedAt: 1 })
    );
    await assertSucceeds(
      me.collection('followers').doc('ws-1').collection('users').doc('outsider-1').delete()
    );
  });
});

describe('Membership rules — joinRequests', () => {
  it('M5. User can create their own PENDING request; cannot create for another user', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertSucceeds(
      me.collection('joinRequests').doc('ws-1_outsider-1').set({
        id: 'ws-1_outsider-1', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
        userUid: 'outsider-1', userName: 'Outsider', message: 'Hi', status: 'PENDING', createdAt: 1,
      })
    );
    await assertFails(
      me.collection('joinRequests').doc('ws-1_member-1').set({
        id: 'ws-1_member-1', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
        userUid: 'member-1', userName: 'Member', message: 'Hi', status: 'PENDING', createdAt: 1,
      })
    );
  });

  it('M6. Requester cannot approve their own request; trustee can', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await me.collection('joinRequests').doc('ws-1_outsider-1').set({
      id: 'ws-1_outsider-1', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
      userUid: 'outsider-1', userName: 'Outsider', message: '', status: 'PENDING', createdAt: 1,
    });
    await assertFails(me.collection('joinRequests').doc('ws-1_outsider-1').update({ status: 'APPROVED' }));

    const trustee = testEnv.authenticatedContext('trustee-1').firestore();
    await assertSucceeds(
      trustee.collection('joinRequests').doc('ws-1_outsider-1').update({
        status: 'APPROVED', decidedBy: 'trustee-1', decidedAt: 2,
      })
    );
  });

  it('M7. Non-trustee member cannot decide requests', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await me.collection('joinRequests').doc('ws-1_outsider-1').set({
      id: 'ws-1_outsider-1', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
      userUid: 'outsider-1', userName: 'Outsider', message: '', status: 'PENDING', createdAt: 1,
    });
    const member = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(member.collection('joinRequests').doc('ws-1_outsider-1').update({ status: 'REJECTED' }));
  });
});

describe('Membership rules — orgInvites', () => {
  it('M8. Trustee can invite with a grantable role; cannot invite as Trustee', async () => {
    const trustee = testEnv.authenticatedContext('trustee-1').firestore();
    await assertSucceeds(
      trustee.collection('orgInvites').doc('inv-ok').set({
        id: 'inv-ok', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
        invitedEmail: 'new@example.com', role: 'Sevadar', status: 'PENDING',
        invitedByUid: 'trustee-1', createdAt: 1, expiresAt: FUTURE,
      })
    );
    // Role escalation refused: Trustee cannot grant Trustee
    await assertFails(
      trustee.collection('orgInvites').doc('inv-evil').set({
        id: 'inv-evil', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
        invitedEmail: 'evil@example.com', role: 'Trustee', status: 'PENDING',
        invitedByUid: 'trustee-1', createdAt: 1, expiresAt: FUTURE,
      })
    );
  });

  it('M9. Non-trustee cannot create invites', async () => {
    const member = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(
      member.collection('orgInvites').doc('inv-no').set({
        id: 'inv-no', orgId: 'ws-1', orgName: 'Test Sangha', orgType: 'Sangha',
        invitedEmail: 'x@example.com', role: 'Devotee', status: 'PENDING',
        invitedByUid: 'member-1', createdAt: 1, expiresAt: FUTURE,
      })
    );
  });

  it('M10. Invited user can accept while PENDING and unexpired; expired invite cannot be accepted', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertSucceeds(me.collection('orgInvites').doc('inv-1').update({ status: 'ACCEPTED', decidedAt: 2 }));
    await assertFails(me.collection('orgInvites').doc('inv-expired').update({ status: 'ACCEPTED', decidedAt: 2 }));
  });

  it('M11. Stranger cannot accept someone else\'s invite', async () => {
    const stranger = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(stranger.collection('orgInvites').doc('inv-1').update({ status: 'ACCEPTED' }));
  });
});

describe('Membership rules — workspaceMembers', () => {
  it('M12. Trustee approval path: trustee mints the membership edge', async () => {
    const trustee = testEnv.authenticatedContext('trustee-1').firestore();
    await assertSucceeds(
      trustee.collection('workspaceMembers').doc('ws-1_outsider-1').set({
        id: 'ws-1_outsider-1', workspaceId: 'ws-1', uid: 'outsider-1',
        role: 'Devotee', joinedAt: 1, joinedVia: 'request',
      })
    );
  });

  it('M13. Invite-accept path: user mints own edge only with matching ACCEPTED invite + role', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    // First accept the invite (M10 pattern), then mint the edge.
    await me.collection('orgInvites').doc('inv-1').update({ status: 'ACCEPTED', decidedAt: 2 });
    await assertSucceeds(
      me.collection('workspaceMembers').doc('ws-1_outsider-1').set({
        id: 'ws-1_outsider-1', workspaceId: 'ws-1', uid: 'outsider-1',
        role: 'Sevadar', joinedAt: 1, joinedVia: 'invite', viaInviteId: 'inv-1',
      })
    );
    // Escalation attempt: role differs from the invite's role
    await assertFails(
      me.collection('workspaceMembers').doc('ws-1_outsider-1b').set({
        id: 'ws-1_outsider-1b', workspaceId: 'ws-1', uid: 'outsider-1',
        role: 'Trustee', joinedAt: 1, joinedVia: 'invite', viaInviteId: 'inv-1',
      })
    );
  });

  it('M14. Expired invite cannot mint a membership edge', async () => {
    // Force-accept the expired invite via rules-disabled, then try the edge.
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await c.firestore().collection('orgInvites').doc('inv-expired').update({ status: 'ACCEPTED' });
    });
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertFails(
      me.collection('workspaceMembers').doc('ws-1_outsider-1').set({
        id: 'ws-1_outsider-1', workspaceId: 'ws-1', uid: 'outsider-1',
        role: 'Devotee', joinedAt: 1, joinedVia: 'invite', viaInviteId: 'inv-expired',
      })
    );
  });

  it('M15. User cannot forge a membership edge without trustee or invite', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertFails(
      me.collection('workspaceMembers').doc('ws-2_outsider-1').set({
        id: 'ws-2_outsider-1', workspaceId: 'ws-2', uid: 'outsider-1',
        role: 'Trustee', joinedAt: 1, joinedVia: 'request',
      })
    );
  });

  it('M16. Membership edge confers tenant access (isTenantMember extension)', async () => {
    // edge-member-1 has ONLY a workspaceMembers edge (no workspaceId claim).
    const edgeDb = testEnv.authenticatedContext('edge-member-1').firestore();
    // devotees read requires isTenantMember(ws-1) — passes via the edge.
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await c.firestore().collection('devotees').doc('edge-dev-1').set({ workspaceId: 'ws-1', name: 'Edge Devotee' });
    });
    await assertSucceeds(edgeDb.collection('devotees').doc('edge-dev-1').get());
    // And the edge role (Sevadar) passes staff gates.
    await assertSucceeds(
      edgeDb.collection('devotees').add({ workspaceId: 'ws-1', name: 'Created by edge Sevadar' })
    );
  });

  it('M17. Member cannot read another member\'s edge; trustee can list roster', async () => {
    const me = testEnv.authenticatedContext('outsider-1').firestore();
    await assertFails(me.collection('workspaceMembers').doc('ws-1_edge-member-1').get());
    const trustee = testEnv.authenticatedContext('trustee-1').firestore();
    await assertSucceeds(trustee.collection('workspaceMembers').where('workspaceId', '==', 'ws-1').get());
  });
});
