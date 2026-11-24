
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

let testEnv;

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
    // Setup Admin
    await db.collection('platform_admins').doc('global-admin-uid').set({ active: true });
    await db.collection('platform_admins').doc('disabled-admin-uid').set({ active: false });
    
    // Setup Workspaces
    await db.collection('workspaces').doc('ws-1').set({ name: 'Workspace 1' });
    await db.collection('workspaces').doc('ws-2').set({ name: 'Workspace 2' });

    // Setup Users
    await db.collection('users').doc('admin-1').set({ workspaceId: 'ws-1', role: 'SUPER_ADMIN' });
    await db.collection('users').doc('user-1').set({ workspaceId: 'ws-1', role: 'DEVOTEE' });
    await db.collection('users').doc('user-2').set({ workspaceId: 'ws-2', role: 'DEVOTEE' });
    await db.collection('users').doc('demo-user-1').set({ workspaceId: 'DEMO_123', role: 'SUPER_ADMIN' });
    await db.collection('users').doc('acct-1').set({ workspaceId: 'ws-1', role: 'Accountant' });

    // Setup Devotees (Tenant Data)
    await db.collection('devotees').doc('dev-1').set({ workspaceId: 'ws-1', name: 'Devotee 1' });
    await db.collection('devotees').doc('dev-2').set({ workspaceId: 'ws-2', name: 'Devotee 2' });
    await db.collection('devotees').doc('demo-dev-1').set({ workspaceId: 'DEMO_123', name: 'Demo Devotee 1' });

    // Setup Treasury
    await db.collection('treasury').doc('tr-1').set({ workspaceId: 'ws-1', amount: 100 });
    await db.collection('treasury').doc('demo-tr-1').set({ workspaceId: 'DEMO_123', amount: 50 });

    // Setup Tenants (public discovery doc)
    await db.collection('tenants').doc('t1').set({ name: 'Test Mandir', city: 'Varanasi', type: 'Mandir' });

    // Setup Purohit One (global marketplace collections)
    await db.collection('purohits').doc('PUR-TEST01').set({
      id: 'PUR-TEST01',
      uid: 'purohit-user-1',
      displayName: 'Test Purohit',
      phone: '+910000000001',
      city: 'Varanasi',
      languages: ['Sanskrit', 'Hindi'],
      specializations: ['Vivah Samskara'],
      experienceYears: 5,
      verificationTier: 'REGISTERED',
      ratingAggregate: 0,
      ratingCount: 0,
      completedGigs: 0,
      source: 'independent',
      createdAt: 1,
      updatedAt: 1,
    });
    await db.collection('endorsements').doc('END-001').set({
      orgId: 'ws-1',
      orgName: 'Workspace 1',
      purohitId: 'PUR-TEST01',
      text: 'Exemplary Vedic scholarship',
      ritualCount: 12,
      createdAt: 1,
    });

    // Setup P2P money requests (Phase 3 wallet) — user-1 pays user-2.
    await db.collection('p2pRequests').doc('p2p-1').set({
      direction: 'user_to_user',
      senderId: 'user-1',
      senderName: 'User One',
      receiverId: 'user-2',
      receiverName: 'User Two',
      amount: 500,
      currency: 'BDT',
      note: 'shared lunch',
      status: 'accepted',
      chatId: 'chat-1',
      expiresAt: 9999999999999,
      createdAt: 1,
      updatedAt: 1,
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('Firestore Security Rules', () => {

  it('1. Anonymous user cannot read protected tenant data', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('devotees').get());
  });

  it('1.1. Anonymous user cannot create production membership', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('users').doc('anon').set({ workspaceId: 'ws-1' }));
  });

  it('1.2. Anonymous user cannot modify production role', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('users').doc('user-1').update({ role: 'SUPER_ADMIN' }));
  });

  it('1.3. Anonymous user cannot access production workspace data', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('workspaces').doc('ws-1').get());
  });

  it('2. Workspace A user cannot read Workspace B devotees', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    const query = user1Db.collection('devotees').where('workspaceId', '==', 'ws-2');
    await assertFails(query.get());
  });

  it('3. Workspace A user cannot write Workspace B data', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('devotees').add({ workspaceId: 'ws-2', name: 'Hack' }));
  });

  it('3.1. Workspace A user cannot delete Workspace B data', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('devotees').doc('dev-2').delete());
  });

  it('4. User cannot change their own role', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-1').update({ role: 'SUPER_ADMIN' }));
  });

  it('5. User cannot change their own workspace membership', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-1').update({ workspaceId: 'ws-2' }));
  });

  it('6. Unauthorized user cannot create treasury records', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore(); // role DEVOTEE
    await assertFails(user1Db.collection('treasury').add({ workspaceId: 'ws-1', amount: 500 }));
  });

  it('7. Unauthorized user cannot modify treasury records', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore(); // role DEVOTEE
    await assertFails(user1Db.collection('treasury').doc('tr-1').update({ amount: 9999 }));
  });

  it('8. Non-participant cannot read a private chat', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('chats').doc('admin-1_user-1').collection('messages').add({ text: 'Hello' });
    });
    const user2Db = testEnv.authenticatedContext('user-2').firestore();
    await assertFails(user2Db.collection('chats').doc('admin-1_user-1').collection('messages').get());
  });

  it('9. Non-authorized user cannot modify protected chat data', async () => {
    const user2Db = testEnv.authenticatedContext('user-2').firestore();
    await assertFails(user2Db.collection('chats').doc('admin-1_user-1').set({ text: 'Hack' }));
  });

  it('10. Cross-workspace community access is denied', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('communities').doc('ws-2').collection('social_feed').get());
  });

  it('11. Ordinary user cannot modify audit records', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('audit_logs').doc('audit-1').set({ workspaceId: 'ws-1', action: 'test' });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('audit_logs').doc('audit-1').update({ action: 'hacked' }));
  });

  it('12. Ordinary user cannot delete audit records', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('audit_logs').doc('audit-1').delete());
  });

  it('13. User cannot change protected admin flags', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-1').update({ admin: true }));
  });

  it('14. User cannot impersonate another user', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-2').set({ role: 'DEVOTEE' }));
  });

  it('15. Authorized workspace administrator succeeds', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1').firestore(); // SUPER_ADMIN in ws-1
    await assertSucceeds(adminDb.collection('treasury').add({ workspaceId: 'ws-1', amount: 1000 }));
  });

  it('16. Authorized global administrator succeeds where intended', async () => {
    const globalAdminDb = testEnv.authenticatedContext('global-admin-uid').firestore();
    await assertSucceeds(globalAdminDb.collection('devotees').doc('dev-2').update({ name: 'Updated' }));
  });

  it('17. Demo workspace bypass allows role setting', async () => {
    const demoDb = testEnv.authenticatedContext('new-demo-user').firestore();
    await assertSucceeds(demoDb.collection('users').doc('new-demo-user').set({ workspaceId: 'DEMO_123', role: 'SUPER_ADMIN' }));
  });
  
  // New specific test cases for Phase 1A Security Correction
  
  it('18. Self-created arbitrary workspace membership is denied', async () => {
    const newDb = testEnv.authenticatedContext('new-user-123').firestore();
    // Cannot claim ws-1 workspaceId on creation
    await assertFails(newDb.collection('users').doc('new-user-123').set({ workspaceId: 'ws-1' }));
  });

  it('19. Changing workspaceId is denied', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-1').update({ workspaceId: 'ws-2' }));
  });

  it('20. Changing defaultWorkspaceId is denied', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-1').update({ defaultWorkspaceId: 'ws-2' }));
  });

  it('21. Creating a profile claiming another workspace is denied', async () => {
    const newDb = testEnv.authenticatedContext('new-user-456').firestore();
    await assertFails(newDb.collection('users').doc('new-user-456').set({ workspaceId: 'ws-1', role: 'DEVOTEE' }));
  });

  it('22. Disabled global admin is denied', async () => {
    const disabledAdminDb = testEnv.authenticatedContext('disabled-admin-uid').firestore();
    await assertFails(disabledAdminDb.collection('devotees').doc('dev-2').update({ name: 'Hacked' }));
  });

  it('23. DEMO workspace cannot access production workspace', async () => {
    const demoUserDb = testEnv.authenticatedContext('demo-user-1').firestore();
    // demo-user-1 is in DEMO_123, cannot read ws-1
    await assertFails(demoUserDb.collection('devotees').doc('dev-1').get());
  });

  it('24. Production workspace cannot access DEMO data unless explicitly intended', async () => {
    const prodUserDb = testEnv.authenticatedContext('user-1').firestore();
    // user-1 is in ws-1, cannot read DEMO_123
    await assertFails(prodUserDb.collection('devotees').doc('demo-dev-1').get());
  });

  it('25. DEMO user cannot become platform admin', async () => {
    const demoUserDb = testEnv.authenticatedContext('demo-user-1').firestore();
    await assertFails(demoUserDb.collection('platform_admins').doc('demo-user-1').set({ active: true }));
  });

  it('26. User cannot create another users membership', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-2').set({ workspaceId: 'ws-1' }));
  });

  it('27. User cannot create another users privileged profile', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-2').set({ role: 'SUPER_ADMIN' }));
  });
  it('28. Cross-tenant update attack is denied', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1').firestore();
    await assertFails(adminDb.collection('devotees').doc('dev-1').update({ workspaceId: 'ws-2' }));
  });
  it('29. Cross-tenant update attack denied in treasury', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1').firestore(); 
    await assertFails(adminDb.collection('treasury').doc('tr-1').update({ workspaceId: 'ws-2' }));
  });

  it('30. Ordinary user cannot create platform admin record', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('platform_admins').doc('user-1').set({ active: true }));
  });

  it('31. Ordinary user cannot modify platform admin record', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('platform_admins').doc('admin-1').update({ active: false }));
  });

  it('32. Demo user cannot alter production workspaces', async () => {
    const demoDb = testEnv.authenticatedContext('demo-user-1').firestore();
    await assertFails(demoDb.collection('workspaces').doc('ws-1').update({ name: 'Hacked' }));
  });

  it('33. Chat participant can access chat', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('chats').doc('chat1').set({ participants: ['user-1', 'user-2'] });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(user1Db.collection('chats').doc('chat1').get());
  });

  it('34. Participant cannot arbitrarily change participants', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('chats').doc('chat2').set({ participants: ['user-1', 'user-2'] });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('chats').doc('chat2').update({ participants: ['user-1', 'hacker'] }));
  });

  it('35. SenderId cannot be forged in chat messages', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('chats').doc('chat3').set({ participants: ['user-1', 'user-2'] });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('chats').doc('chat3').collection('messages').add({ senderId: 'user-2', text: 'Forgery' }));
  });

  it('36. Ordinary user can create only their own legitimate audit event', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(user1Db.collection('audit_logs').add({ workspaceId: 'ws-1', actorId: 'user-1', action: 'test' }));
  });

  it('37. ActorId cannot be forged in audit event', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('audit_logs').add({ workspaceId: 'ws-1', actorId: 'user-2', action: 'test' }));
  });

  it('38. WorkspaceId cannot be forged in audit event', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('audit_logs').add({ workspaceId: 'ws-2', actorId: 'user-1', action: 'test' }));
  });

  it('39. Cross-workspace access denied in audit logs', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('audit_logs').doc('audit-ws-2').set({ workspaceId: 'ws-2', actorId: 'user-2', action: 'test' });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('audit_logs').doc('audit-ws-2').get());
  });

  it('40. Anonymous user cannot read production Yatra broadcasts', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('yatra_broadcasts').doc('broadcast-ws-1').get());
  });
  
  it('41. Anonymous user cannot create production Yatra broadcasts', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('yatra_broadcasts').add({ communityId: 'ws-1', type: 'RICH_SOS' }));
  });

  it('42. Authorized tenant user can read their own tenants broadcasts', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('yatra_broadcasts').doc('broadcast-ws-1').set({ communityId: 'ws-1', type: 'RICH_SOS' });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(user1Db.collection('yatra_broadcasts').doc('broadcast-ws-1').get());
  });

  it('43. Authorized tenant user can create a broadcast for their own tenant', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(user1Db.collection('yatra_broadcasts').add({ communityId: 'ws-1', type: 'RICH_SOS' }));
  });

  it('44. Tenant A cannot read Tenant Bs broadcast', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('yatra_broadcasts').doc('broadcast-ws-2').set({ communityId: 'ws-2', type: 'RICH_SOS' });
    });
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').doc('broadcast-ws-2').get());
  });

  it('45. Tenant A cannot create a broadcast for Tenant B', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').add({ communityId: 'ws-2', type: 'RICH_SOS' }));
  });

  it('46. Tenant A cannot update Tenant Bs broadcast', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').doc('broadcast-ws-2').update({ sosStatus: 'RESPONDED' }));
  });

  it('47. Tenant A cannot delete Tenant Bs broadcast', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').doc('broadcast-ws-2').delete());
  });

  it('48. Tenant A cannot change its own broadcasts tenant/workspace to Tenant B', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').doc('broadcast-ws-1').update({ communityId: 'ws-2' }));
  });

  it('49. Global admin can read and delete any broadcast', async () => {
    const adminDb = testEnv.authenticatedContext('global-admin-uid').firestore();
    await assertSucceeds(adminDb.collection('yatra_broadcasts').doc('broadcast-ws-1').get());
    await assertSucceeds(adminDb.collection('yatra_broadcasts').doc('broadcast-ws-1').delete());
  });

  it('50. DEMO isolation remains intact for broadcasts', async () => {
    const demoDb = testEnv.authenticatedContext('demo-user').firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('demo-user').set({ workspaceId: 'DEMO_123' });
    });
    await assertSucceeds(demoDb.collection('yatra_broadcasts').add({ communityId: 'DEMO_123', type: 'RICH_SOS' }));
  });

  it('51. Production cannot be accessed through a DEMO workspace path for broadcasts', async () => {
    const demoDb = testEnv.authenticatedContext('demo-user').firestore();
    await assertFails(demoDb.collection('yatra_broadcasts').doc('broadcast-ws-1').get());
    await assertFails(demoDb.collection('yatra_broadcasts').add({ communityId: 'ws-1', type: 'RICH_SOS' }));
  });

  it('52. Offline replay regression: Queued action for Tenant A retains Tenant A communityId and succeeds on replay by Tenant A user', async () => {
    const queuedAction = {
      type: 'RICH_SOS',
      communityId: 'ws-1',
      authorUid: 'user-1',
      payload: {
        communityId: 'ws-1',
        senderId: 'user-1',
        senderName: 'Devotee 1',
        text: 'Offline SOS in ws-1',
        type: 'RICH_SOS'
      }
    };
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(user1Db.collection('yatra_broadcasts').add({
      ...queuedAction.payload,
      communityId: queuedAction.communityId
    }));
  });

  it('53. Offline replay regression: Swapping tenant context on replay to Tenant B is rejected for Tenant A user', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('yatra_broadcasts').add({
      senderId: 'user-1',
      senderName: 'Devotee 1',
      text: 'Offline SOS attempted in ws-2',
      type: 'RICH_SOS',
      communityId: 'ws-2'
    }));
  });

  it('54. Offline replay regression: Logged-out session cannot replay queued production broadcast', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('yatra_broadcasts').add({
      senderId: 'user-1',
      senderName: 'Devotee 1',
      text: 'Offline SOS replay after logout',
      type: 'RICH_SOS',
      communityId: 'ws-1'
    }));
  });

  it('55. Offline replay regression: Different user (user-2 in ws-2) cannot replay Tenant A queued action into Tenant A', async () => {
    const user2Db = testEnv.authenticatedContext('user-2').firestore();
    await assertFails(user2Db.collection('yatra_broadcasts').add({
      senderId: 'user-1',
      senderName: 'Devotee 1',
      text: 'Offline SOS replay by wrong user',
      type: 'RICH_SOS',
      communityId: 'ws-1'
    }));
  });

  // ---- Phase 21S Security Hardening: deny-by-default + tenant isolation ----

  it('56. Unauthenticated read of the treasury ledger is denied', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('treasury').doc('tr-1').get());
  });

  it('57. Cross-tenant read of the treasury ledger is denied', async () => {
    const user2Db = testEnv.authenticatedContext('user-2').firestore(); // ws-2
    await assertFails(user2Db.collection('treasury').doc('tr-1').get()); // ws-1
  });

  it('58. Accountant cannot write devotee PII (outside finance role scope)', async () => {
    const acctDb = testEnv.authenticatedContext('acct-1').firestore(); // Accountant in ws-1
    await assertFails(acctDb.collection('devotees').doc('dev-1').update({ name: 'Tampered' }));
    await assertFails(acctDb.collection('devotees').add({ workspaceId: 'ws-1', name: 'Sneaky' }));
  });

  it('58b. Accountant CAN read the treasury ledger of their own tenant', async () => {
    const acctDb = testEnv.authenticatedContext('acct-1').firestore(); // Accountant in ws-1
    await assertSucceeds(acctDb.collection('treasury').doc('tr-1').get());
  });

  it('59. DEMO treasury reads are public, but anonymous writes are denied', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('treasury').doc('demo-tr-1').get());
    await assertFails(unauthDb.collection('treasury').add({ workspaceId: 'DEMO_123', amount: 1 }));
  });

  it('60. User cannot write another user\'s /users document', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(user1Db.collection('users').doc('user-2').update({ phone: '+91 00000 00000' }));
    await assertFails(user1Db.collection('users').doc('user-2').set({ workspaceId: 'ws-1' }));
  });

  it('61. Tenant discovery doc is publicly readable but not publicly writable', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('tenants').doc('t1').get());
    await assertFails(unauthDb.collection('tenants').doc('t1').update({ name: 'Hijacked' }));
  });

  it('62. Authenticated non-staff member cannot write devotee PII', async () => {
    const user1Db = testEnv.authenticatedContext('user-1').firestore(); // DEVOTEE in ws-1
    await assertFails(user1Db.collection('devotees').doc('dev-1').update({ name: 'Tampered' }));
  });

  it('63. Treasury ledger is append-only: deletes are denied even for admins', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1').firestore(); // SUPER_ADMIN in ws-1
    await assertFails(adminDb.collection('treasury').doc('tr-1').delete());
  });

  it('64. workspaceId cannot be moved between tenants on update', async () => {
    const adminDb = testEnv.authenticatedContext('admin-1').firestore();
    await assertFails(adminDb.collection('treasury').doc('tr-1').update({ workspaceId: 'ws-2' }));
  });

  // ---- Purohit One: independent identity + marketplace rules ----

  it('65. Purohit marketplace profiles are publicly readable', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('purohits').doc('PUR-TEST01').get());
  });

  it('66. Owner can mint their own identity as REGISTERED; others cannot', async () => {
    const ownerDb = testEnv.authenticatedContext('purohit-user-1').firestore();
    await assertSucceeds(
      ownerDb.collection('purohits').doc('PUR-OWN001').set({
        uid: 'purohit-user-1',
        displayName: 'Test Purohit',
        verificationTier: 'REGISTERED',
        ratingAggregate: 0,
        ratingCount: 0,
        completedGigs: 0,
      })
    );
    const otherDb = testEnv.authenticatedContext('user-1').firestore();
    await assertFails(
      otherDb.collection('purohits').doc('PUR-OWN002').set({
        uid: 'purohit-user-1',
        displayName: 'Impostor',
        verificationTier: 'REGISTERED',
        ratingAggregate: 0,
        ratingCount: 0,
        completedGigs: 0,
      })
    );
  });

  it('67. Owner cannot self-escalate verificationTier', async () => {
    const ownerDb = testEnv.authenticatedContext('purohit-user-1').firestore();
    await assertFails(
      ownerDb.collection('purohits').doc('PUR-TEST01').update({ verificationTier: 'PLATFORM_VERIFIED' })
    );
  });

  it('68. Signed-in users may refresh public counters; anonymous may not', async () => {
    const userDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(
      userDb.collection('purohits').doc('PUR-TEST01').update({ ratingAggregate: 4.5, ratingCount: 2 })
    );
    // Absurd values are rejected even for counter updates.
    await assertFails(
      userDb.collection('purohits').doc('PUR-TEST01').update({ ratingAggregate: 9.9, ratingCount: 2 })
    );
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthDb.collection('purohits').doc('PUR-TEST01').update({ ratingAggregate: 4.5, ratingCount: 2 })
    );
  });

  it('69. Gig lifecycle: devotee posts, purohit accepts, status path enforced', async () => {
    const devoteeDb = testEnv.authenticatedContext('user-1').firestore();
    const purohitDb = testEnv.authenticatedContext('purohit-user-1').firestore();
    const strangerDb = testEnv.authenticatedContext('user-2').firestore();

    // Devotee posts an OPEN gig.
    await assertSucceeds(
      devoteeDb.collection('gigs').doc('GIG-001').set({
        id: 'GIG-001',
        devoteeUid: 'user-1',
        devoteeName: 'Devotee 1',
        status: 'OPEN',
        createdAt: 1,
      })
    );
    // Stranger cannot post as someone else.
    await assertFails(
      strangerDb.collection('gigs').doc('GIG-002').set({
        id: 'GIG-002',
        devoteeUid: 'user-1',
        devoteeName: 'Devotee 1',
        status: 'OPEN',
        createdAt: 1,
      })
    );
    // Skip-step OPEN → COMPLETED is rejected.
    await assertFails(devoteeDb.collection('gigs').doc('GIG-001').update({ status: 'COMPLETED' }));
    // Purohit accepts: OPEN → ASSIGNED naming themselves.
    await assertSucceeds(
      purohitDb.collection('gigs').doc('GIG-001').update({
        status: 'ASSIGNED',
        assignedPurohitUid: 'purohit-user-1',
        assignedPurohitId: 'PUR-TEST01',
      })
    );
    // Stranger (non-party) cannot touch the gig.
    await assertFails(strangerDb.collection('gigs').doc('GIG-001').update({ status: 'CANCELLED' }));
    // Ordered path continues for the parties.
    await assertSucceeds(purohitDb.collection('gigs').doc('GIG-001').update({ status: 'IN_PROGRESS' }));
    await assertSucceeds(purohitDb.collection('gigs').doc('GIG-001').update({ status: 'COMPLETED' }));
    await assertSucceeds(devoteeDb.collection('gigs').doc('GIG-001').update({ status: 'DAKSHINA_RELEASED' }));
    // Immutable keys cannot change.
    await assertFails(devoteeDb.collection('gigs').doc('GIG-001').update({ devoteeUid: 'user-2' }));
  });

  it('70. Reviews: only gig parties, only after completion, rating 1–5', async () => {
    const devoteeDb = testEnv.authenticatedContext('user-1').firestore();
    const purohitDb = testEnv.authenticatedContext('purohit-user-1').firestore();
    const strangerDb = testEnv.authenticatedContext('user-2').firestore();
    // GIG-001 is DAKSHINA_RELEASED with user-1 + purohit-user-1 as parties.
    await assertSucceeds(
      devoteeDb.collection('reviews').doc('GIG-001_user-1_devotee').set({
        gigId: 'GIG-001',
        reviewerUid: 'user-1',
        reviewerKind: 'devotee',
        rating: 5,
        note: 'Wonderful ritual',
      })
    );
    await assertFails(
      strangerDb.collection('reviews').doc('GIG-001_user-2_devotee').set({
        gigId: 'GIG-001',
        reviewerUid: 'user-2',
        reviewerKind: 'devotee',
        rating: 5,
      })
    );
    await assertFails(
      devoteeDb.collection('reviews').doc('GIG-001_user-1_devotee2').set({
        gigId: 'GIG-001',
        reviewerUid: 'user-1',
        reviewerKind: 'devotee',
        rating: 6,
      })
    );
    // Reviews are publicly readable.
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('reviews').doc('GIG-001_user-1_devotee').get());
    // Reviews are immutable.
    await assertFails(
      devoteeDb.collection('reviews').doc('GIG-001_user-1_devotee').update({ rating: 1 })
    );
  });

  it('71. Applications: applicant creates PENDING; only platform admin decides', async () => {
    const applicantDb = testEnv.authenticatedContext('purohit-user-1').firestore();
    const otherDb = testEnv.authenticatedContext('user-1').firestore();
    const adminDb = testEnv.authenticatedContext('global-admin-uid').firestore();
    await assertSucceeds(
      applicantDb.collection('purohitApplications').doc('APP-001').set({
        purohitId: 'PUR-TEST01',
        uid: 'purohit-user-1',
        displayName: 'Test Purohit',
        status: 'PENDING',
        createdAt: 1,
      })
    );
    // Another user cannot read the application.
    await assertFails(otherDb.collection('purohitApplications').doc('APP-001').get());
    // Applicant cannot self-approve.
    await assertFails(
      applicantDb.collection('purohitApplications').doc('APP-001').update({ status: 'APPROVED' })
    );
    // Platform admin approves.
    await assertSucceeds(
      adminDb.collection('purohitApplications').doc('APP-001').update({ status: 'APPROVED', reviewedAt: 2 })
    );
  });

  it('72. Endorsements are public to read; only Trustees/admins may create', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(unauthDb.collection('endorsements').doc('END-001').get());
    const devoteeDb = testEnv.authenticatedContext('user-1').firestore(); // DEVOTEE, not Trustee
    await assertFails(
      devoteeDb.collection('endorsements').add({
        orgId: 'ws-1',
        orgName: 'Workspace 1',
        purohitId: 'PUR-TEST01',
        text: 'Fake endorsement',
      })
    );
  });
});

describe('P2P money requests — privacy & transitions', () => {
  const req1 = () => testEnv.authenticatedContext('user-1').firestore().collection('p2pRequests').doc('p2p-1');
  const req2 = () => testEnv.authenticatedContext('user-2').firestore().collection('p2pRequests').doc('p2p-1');
  const strangerDb = () => testEnv.authenticatedContext('stranger-1').firestore();

  it('73. Sender and receiver can read their own request', async () => {
    await assertSucceeds(req1().get());
    await assertSucceeds(req2().get());
  });

  it('74. A third party (user B) CANNOT read user A\'s request', async () => {
    await assertFails(strangerDb().collection('p2pRequests').doc('p2p-1').get());
  });

  it('75. A third party cannot list another user\'s requests by querying', async () => {
    const q = strangerDb().collection('p2pRequests').where('senderId', '==', 'user-1');
    await assertFails(q.get());
  });

  it('76. A user cannot create a request impersonating someone else', async () => {
    await assertFails(
      strangerDb().collection('p2pRequests').add({
        direction: 'user_to_user',
        senderId: 'user-1', // not the caller
        senderName: 'User One',
        receiverId: 'stranger-1',
        receiverName: 'Stranger',
        amount: 100,
        currency: 'BDT',
        note: 'impersonation',
        status: 'pending',
        chatId: 'chat-x',
        expiresAt: 9999999999999,
        createdAt: 1,
        updatedAt: 1,
      })
    );
  });

  it('77. Sender marks paid (accepted→paid); receiver confirms settled (paid→settled)', async () => {
    await assertSucceeds(
      req1().update({ status: 'paid', paidAt: 2, paidRef: 'TrxID-1', paidVia: 'bkash', updatedAt: 2 })
    );
    await assertSucceeds(req2().update({ status: 'settled', settledAt: 3, updatedAt: 3 }));
  });

  it('78. Receiver cannot mark the request paid (sender-only transition)', async () => {
    await assertFails(req2().update({ status: 'paid', paidAt: 2, updatedAt: 2 }));
  });

  it('79. Anonymous users cannot read p2pRequests', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('p2pRequests').doc('p2p-1').get());
  });
});

describe('EVENTS E2 — seva pass ticketing (event_tickets)', () => {
  const EV = 'ws-1__fest1';
  const startMs = Date.now() + 30 * 86400000; // 30 days out → 100% rung
  const ticketDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    festivalId: EV,
    tierId: 'pass1',
    tierName: 'Cultural evening pass',
    buyerUid: 'user-1',
    buyerName: 'User One',
    attendees: [{ name: 'User One' }, { name: 'Guest Two' }],
    qty: 2,
    amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
    currency: 'INR',
    paymentState: 'paid-wallet',
    rsvpId: `${EV}__user-1`,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  // Runs after the global beforeEach (which clears + reseeds base).
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('festival_plans').doc(EV).set({
        workspaceId: 'ws-1',
        ticketing: {
          tiers: [],
          tierPrices: { pass1: 500 },
          tierKinds: { pass1: 'paid' },
          tierEarly: {},
          tierMax: { pass1: 6 },
          codeMap: {},
          refundLadder: [
            { minDaysBefore: 7, percent: 100 },
            { minDaysBefore: 0, percent: 0 },
          ],
          discountUses: {},
          feeBearer: 'organiser',
          startMs,
          endMs: startMs + 86400000 - 1,
        },
      });
      await db.collection('festival_events').doc(EV).set({
        workspaceId: 'ws-1',
        published: true,
        ticketFeeBearer: 'organiser',
        tierCaps: { pass1: 100 },
        tierSold: {},
        rsvpHeadcount: 0,
        slotBooked: {},
      });
      await db.collection('wallets').doc('user-1').set({
        uid: 'user-1', balance: 2000, totalSpent: 0, totalReceived: 0, currency: 'INR',
      });
    });
  });

  const buyerDb = () => testEnv.authenticatedContext('user-1').firestore();
  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const strangerDb = () => testEnv.authenticatedContext('stranger-1').firestore();

  const purchaseBatch = (db: any, amounts = { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 }) => {
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc('tk-e2-1'), ticketDoc({ amounts }));
    batch.set(db.collection('festival_rsvps').doc(`${EV}__user-1`), {
      eventId: EV, workspaceId: 'ws-1', uid: 'user-1', name: 'User One',
      headcount: 2, status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', ticketId: 'tk-e2-1',
    });
    batch.update(db.collection('wallets').doc('user-1'), {
      balance: 2000 - amounts.total, totalSpent: amounts.total, lastDebitTicketId: 'tk-e2-1', updatedAt: 1,
    });
    batch.set(db.collection('walletTransactions').doc('txn-e2-1'), {
      uid: 'user-1', type: 'spend', amount: amounts.total, currency: 'INR',
      orderId: 'tk-e2-1', note: 'Seva pass', createdAt: 1,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 2 }, tierAnchorTicketId: 'tk-e2-1', updatedAt: 1,
    });
    return batch.commit();
  };

  it('80. Buyer purchases a wallet pass in one anchored batch', async () => {
    await assertSucceeds(purchaseBatch(buyerDb()));
  });

  it('81. A tampered total fails the whole purchase batch', async () => {
    await assertFails(purchaseBatch(buyerDb(), { price: 1000, discount: 0, fee: 50, gst: 9, total: 999 }));
  });

  it('82. A ticket cannot be created for someone else', async () => {
    await assertFails(
      strangerDb().collection('event_tickets').doc('tk-e2-x').set(ticketDoc())
    );
    await assertFails(
      buyerDb().collection('event_tickets').doc('tk-e2-y').set(ticketDoc({ buyerUid: 'user-2' }))
    );
  });

  it('83. Read: buyer and workspace staff yes, stranger no', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('event_tickets').doc('tk-e2-1').set(ticketDoc());
    });
    await assertSucceeds(buyerDb().collection('event_tickets').doc('tk-e2-1').get());
    await assertSucceeds(staffDb().collection('event_tickets').doc('tk-e2-1').get());
    await assertFails(strangerDb().collection('event_tickets').doc('tk-e2-1').get());
  });

  it('84. Buyer cancel refunds 100% by the ladder, wallet credited in the same batch', async () => {
    await assertSucceeds(purchaseBatch(buyerDb()));
    const db = buyerDb();
    await assertSucceeds(db.collection('festival_rsvps').doc(`${EV}__user-1`).delete());
    const batch = db.batch();
    batch.update(db.collection('event_tickets').doc('tk-e2-1'), {
      paymentState: 'refunded', refundAmount: 1000, refundedAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    });
    batch.update(db.collection('wallets').doc('user-1'), {
      balance: 2000, totalReceived: 1000, lastRefundTicketId: 'tk-e2-1', updatedAt: 2,
    });
    batch.set(db.collection('walletTransactions').doc('txn-e2-2'), {
      uid: 'user-1', type: 'refund', amount: 1000, currency: 'INR',
      orderId: 'tk-e2-1', note: 'Seva pass refund', createdAt: 2,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 0 }, tierAnchorTicketId: 'tk-e2-1', updatedAt: 2,
    });
    await assertSucceeds(batch.commit());
  });

  it('85. A short-changed refund is denied', async () => {
    await assertSucceeds(purchaseBatch(buyerDb()));
    const db = buyerDb();
    const batch = db.batch();
    batch.update(db.collection('event_tickets').doc('tk-e2-1'), {
      paymentState: 'refunded', refundAmount: 500, refundedAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 0 }, tierAnchorTicketId: 'tk-e2-1', updatedAt: 2,
    });
    await assertFails(batch.commit());
  });

  it('86. Staff mark venue money received; the buyer cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('event_tickets').doc('tk-e2-2').set(
        ticketDoc({ paymentState: 'pay-at-venue' })
      );
    });
    await assertFails(
      buyerDb().collection('event_tickets').doc('tk-e2-2').update({
        venueReceived: true, receivedBy: 'User One', receivedAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
      })
    );
    await assertSucceeds(
      staffDb().collection('event_tickets').doc('tk-e2-2').update({
        venueReceived: true, receivedBy: 'Admin', receivedAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
      })
    );
  });

  it('87. Transfer accept rebinds the pass and the giver RSVP delete is witnessed', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('event_tickets').doc('tk-e2-3').set(ticketDoc({
        transferToUid: 'user-2', transferToName: 'User Two', transferState: 'offered',
        offeredAt: '2026-01-01T00:00:00.000Z',
      }));
      await db.collection('festival_rsvps').doc(`${EV}__user-1`).set({
        eventId: EV, workspaceId: 'ws-1', uid: 'user-1', name: 'User One',
        headcount: 2, status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', ticketId: 'tk-e2-3',
      });
    });
    const db = testEnv.authenticatedContext('user-2').firestore();
    const batch = db.batch();
    batch.update(db.collection('event_tickets').doc('tk-e2-3'), {
      buyerUid: 'user-2',
      buyerName: 'User Two',
      transferFromUid: 'user-1',
      transferredAt: '2026-01-02T00:00:00.000Z',
      rsvpId: `${EV}__user-2`,
      transferToUid: firebase.firestore.FieldValue.delete(),
      transferToName: firebase.firestore.FieldValue.delete(),
      transferState: firebase.firestore.FieldValue.delete(),
      offeredAt: firebase.firestore.FieldValue.delete(),
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    batch.set(db.collection('festival_rsvps').doc(`${EV}__user-2`), {
      eventId: EV, workspaceId: 'ws-1', uid: 'user-2', name: 'User Two',
      headcount: 2, status: 'confirmed', createdAt: '2026-01-02T00:00:00.000Z', ticketId: 'tk-e2-3',
    });
    batch.delete(db.collection('festival_rsvps').doc(`${EV}__user-1`));
    await assertSucceeds(batch.commit());
  });

  it('88. Tickets are never deletable', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('event_tickets').doc('tk-e2-1').set(ticketDoc());
    });
    await assertFails(buyerDb().collection('event_tickets').doc('tk-e2-1').delete());
    await assertFails(staffDb().collection('event_tickets').doc('tk-e2-1').delete());
  });
});

describe('EVENTS E8 — the pass release gate (tkReleaseOpen)', () => {
  const EV = 'ws-1__fest1';
  const startMs = Date.now() + 30 * 86400000; // festival 30 days out
  const ticketDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    festivalId: EV,
    tierId: 'pass1',
    tierName: 'Cultural evening pass',
    buyerUid: 'user-1',
    buyerName: 'User One',
    attendees: [{ name: 'User One' }, { name: 'Guest Two' }],
    qty: 2,
    amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
    currency: 'INR',
    paymentState: 'paid-wallet',
    rsvpId: `${EV}__user-1`,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  // Seeds the E2 fixtures, then stamps the published doc's
  // release moment as the test asks (undefined = no stamp at all,
  // the pre-E8 shape).
  const seed = async (releaseAtMs?: number) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('festival_plans').doc(EV).set({
        workspaceId: 'ws-1',
        ticketing: {
          tiers: [],
          tierPrices: { pass1: 500 },
          tierKinds: { pass1: 'paid' },
          tierEarly: {},
          tierMax: { pass1: 6 },
          codeMap: {},
          refundLadder: [
            { minDaysBefore: 7, percent: 100 },
            { minDaysBefore: 0, percent: 0 },
          ],
          discountUses: {},
          feeBearer: 'organiser',
          startMs,
          endMs: startMs + 86400000 - 1,
        },
      });
      await db.collection('festival_events').doc(EV).set({
        workspaceId: 'ws-1',
        published: true,
        ticketFeeBearer: 'organiser',
        tierCaps: { pass1: 100 },
        tierSold: {},
        rsvpHeadcount: 0,
        slotBooked: {},
        ...(releaseAtMs !== undefined ? { ticketReleaseAtMs: releaseAtMs } : {}),
      });
      await db.collection('wallets').doc('user-1').set({
        uid: 'user-1', balance: 2000, totalSpent: 0, totalReceived: 0, currency: 'INR',
      });
    });
  };

  const buyerDb = () => testEnv.authenticatedContext('user-1').firestore();

  const purchaseBatch = (db: any) => {
    const amounts = { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 };
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc('tk-e8-1'), ticketDoc({ amounts }));
    batch.set(db.collection('festival_rsvps').doc(`${EV}__user-1`), {
      eventId: EV, workspaceId: 'ws-1', uid: 'user-1', name: 'User One',
      headcount: 2, status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', ticketId: 'tk-e8-1',
    });
    batch.update(db.collection('wallets').doc('user-1'), {
      balance: 2000 - amounts.total, totalSpent: amounts.total, lastDebitTicketId: 'tk-e8-1', updatedAt: 1,
    });
    batch.set(db.collection('walletTransactions').doc('txn-e8-1'), {
      uid: 'user-1', type: 'spend', amount: amounts.total, currency: 'INR',
      orderId: 'tk-e8-1', note: 'Seva pass', createdAt: 1,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 2 }, tierAnchorTicketId: 'tk-e8-1', updatedAt: 1,
    });
    return batch.commit();
  };

  it('99. A purchase before the stamped release moment is refused', async () => {
    await seed(Date.now() + 86400000); // passes open tomorrow
    await assertFails(purchaseBatch(buyerDb()));
  });

  it('100. A purchase after the release moment succeeds', async () => {
    await seed(Date.now() - 86400000); // passes opened yesterday
    await assertSucceeds(purchaseBatch(buyerDb()));
  });

  it('101. No stamp (pre-E8 doc) and a 0 stamp both leave the gate open', async () => {
    await seed(undefined);
    await assertSucceeds(purchaseBatch(buyerDb()));
    await seed(0);
    await assertSucceeds(purchaseBatch(buyerDb()));
  });
});

describe('EVENTS E5 — attendee feedback (event_feedback)', () => {
  const EV = 'ws-1__fest1';
  const FB = `${EV}__user-1`;
  const feedbackDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    festivalId: EV,
    authorUid: 'user-1',
    authorName: 'User One',
    aspects: { arrangements: 5, prasad: 4, darshanFlow: 5, cleanliness: 4 },
    overall: 5,
    text: 'Beautifully arranged, prasad was warm.',
    wouldReturn: true,
    attendedDay: '2026-01-01',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    state: 'visible',
    ...over,
  });

  // user-1 was gate-checked-in for the festival; user-2 holds an
  // RSVP that was never checked in.
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('festival_rsvps').doc(`${EV}__user-1`).set({
        eventId: EV, workspaceId: 'ws-1', uid: 'user-1', name: 'User One',
        headcount: 2, status: 'confirmed', checkedIn: true,
        checkedInAt: '2026-01-01T08:30:00.000Z', createdAt: '2025-12-30T00:00:00.000Z',
      });
      await db.collection('festival_rsvps').doc(`${EV}__user-2`).set({
        eventId: EV, workspaceId: 'ws-1', uid: 'user-2', name: 'User Two',
        headcount: 1, status: 'confirmed', createdAt: '2025-12-30T00:00:00.000Z',
      });
    });
  });

  const attendeeDb = () => testEnv.authenticatedContext('user-1').firestore();
  const uncheckedDb = () => testEnv.authenticatedContext('user-2').firestore();
  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const strangerDb = () => testEnv.authenticatedContext('stranger-1').firestore();
  const seedFeedback = async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('event_feedback').doc(FB).set(feedbackDoc());
    });
  };

  it('89. A checked-in attendee creates their feedback', async () => {
    await assertSucceeds(attendeeDb().collection('event_feedback').doc(FB).set(feedbackDoc()));
  });

  it('90. No check-in, no feedback: an unchecked RSVP and a non-attendee are denied', async () => {
    await assertFails(
      uncheckedDb().collection('event_feedback').doc(`${EV}__user-2`)
        .set(feedbackDoc({ authorUid: 'user-2', authorName: 'User Two' }))
    );
    await assertFails(
      strangerDb().collection('event_feedback').doc(`${EV}__stranger-1`)
        .set(feedbackDoc({ authorUid: 'stranger-1', authorName: 'Stranger One' }))
    );
  });

  it('91. Feedback cannot be written for someone else or under a foreign id', async () => {
    await assertFails(
      attendeeDb().collection('event_feedback').doc(`${EV}__user-2`)
        .set(feedbackDoc({ authorUid: 'user-2', authorName: 'User Two' }))
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc('some-other-id').set(feedbackDoc())
    );
  });

  it('92. A create cannot arrive hidden or carrying a committee response', async () => {
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB).set(feedbackDoc({ state: 'hidden' }))
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB)
        .set(feedbackDoc({ orgResponse: { text: 'Thank you', at: '2026-01-03T00:00:00.000Z', byName: 'Admin' } }))
    );
  });

  it('93. Out-of-range ratings and over-long text are denied', async () => {
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB).set(feedbackDoc({ overall: 6 }))
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB)
        .set(feedbackDoc({ aspects: { arrangements: 5, prasad: 0, darshanFlow: 5, cleanliness: 4 } }))
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB)
        .set(feedbackDoc({ aspects: { arrangements: 5, prasad: 4, darshanFlow: 5 } }))
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB)
        .set(feedbackDoc({ text: 'x'.repeat(601) }))
    );
  });

  it('94. Read: the author and workspace staff yes, a stranger no', async () => {
    await seedFeedback();
    await assertSucceeds(attendeeDb().collection('event_feedback').doc(FB).get());
    await assertSucceeds(staffDb().collection('event_feedback').doc(FB).get());
    await assertFails(strangerDb().collection('event_feedback').doc(FB).get());
    await assertFails(uncheckedDb().collection('event_feedback').doc(FB).get());
  });

  it('95. The author edits their own words while visible — but cannot touch the state', async () => {
    await seedFeedback();
    await assertSucceeds(
      attendeeDb().collection('event_feedback').doc(FB).update({
        aspects: { arrangements: 4, prasad: 4, darshanFlow: 5, cleanliness: 4 },
        overall: 4,
        text: 'One more thought after going home.',
        updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB).update({
        state: 'hidden', updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB).update({
        authorName: 'Someone Else', updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
  });

  it('96. Once the committee hides it, the author can no longer edit', async () => {
    await seedFeedback();
    await assertSucceeds(
      staffDb().collection('event_feedback').doc(FB).update({
        state: 'hidden', updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
    await assertFails(
      attendeeDb().collection('event_feedback').doc(FB).update({
        text: 'Editing after moderation', updatedAt: '2026-01-05T00:00:00.000Z',
      })
    );
    // The author still SEES their own words.
    await assertSucceeds(attendeeDb().collection('event_feedback').doc(FB).get());
  });

  it('97. Staff hide, unhide and respond — but cannot rewrite the devotee\'s words', async () => {
    await seedFeedback();
    await assertSucceeds(
      staffDb().collection('event_feedback').doc(FB).update({
        orgResponse: { text: 'Dhanyavaad — we will add more water points.', at: '2026-01-04T00:00:00.000Z', byName: 'Admin' },
        updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
    await assertSucceeds(
      staffDb().collection('event_feedback').doc(FB).update({
        state: 'hidden', updatedAt: '2026-01-04T01:00:00.000Z',
      })
    );
    await assertSucceeds(
      staffDb().collection('event_feedback').doc(FB).update({
        state: 'visible', updatedAt: '2026-01-04T02:00:00.000Z',
      })
    );
    await assertFails(
      staffDb().collection('event_feedback').doc(FB).update({
        text: 'Rewritten by staff', updatedAt: '2026-01-04T03:00:00.000Z',
      })
    );
    await assertFails(
      staffDb().collection('event_feedback').doc(FB).update({
        overall: 1, updatedAt: '2026-01-04T03:00:00.000Z',
      })
    );
  });

  it('98. A stranger cannot moderate, and nobody can delete feedback', async () => {
    await seedFeedback();
    await assertFails(
      strangerDb().collection('event_feedback').doc(FB).update({
        state: 'hidden', updatedAt: '2026-01-04T00:00:00.000Z',
      })
    );
    await assertFails(attendeeDb().collection('event_feedback').doc(FB).delete());
    await assertFails(staffDb().collection('event_feedback').doc(FB).delete());
  });
});

describe('REAL-WORLD PACK — desk (counter) sales (event_tickets)', () => {
  const EV = 'ws-1__fest1';
  const TID = 'tk-desk-1';
  const DESK_UID = `desk_${TID}`;
  const startMs = Date.now() + 30 * 86400000; // festival 30 days out

  const deskTicket = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    festivalId: EV,
    tierId: 'pass1',
    tierName: 'Cultural evening pass',
    buyerUid: DESK_UID,
    buyerName: 'Walk-in Guest',
    attendees: [{ name: 'Walk-in Guest' }, { name: 'Guest Two' }],
    qty: 2,
    amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
    currency: 'INR',
    paymentState: 'pay-at-venue',
    rsvpId: `${EV}__${DESK_UID}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    deskSale: true,
    recordedBy: 'admin-1',
    venueReceived: true,
    receivedBy: 'Admin One',
    receivedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  const deskRsvp = (over: Record<string, unknown> = {}) => ({
    eventId: EV,
    workspaceId: 'ws-1',
    uid: DESK_UID,
    name: 'Walk-in Guest',
    headcount: 2,
    status: 'confirmed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ticketId: TID,
    ...over,
  });

  const seed = async (releaseAtMs?: number) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('festival_plans').doc(EV).set({
        workspaceId: 'ws-1',
        ticketing: {
          tiers: [],
          tierPrices: { pass1: 500 },
          tierKinds: { pass1: 'paid' },
          tierEarly: {},
          tierMax: { pass1: 6 },
          codeMap: {},
          refundLadder: [
            { minDaysBefore: 7, percent: 100 },
            { minDaysBefore: 0, percent: 0 },
          ],
          discountUses: {},
          feeBearer: 'organiser',
          startMs,
          endMs: startMs + 86400000 - 1,
        },
      });
      await db.collection('festival_events').doc(EV).set({
        workspaceId: 'ws-1',
        published: true,
        ticketFeeBearer: 'organiser',
        tierCaps: { pass1: 100 },
        tierSold: {},
        rsvpHeadcount: 0,
        slotBooked: {},
        ...(releaseAtMs !== undefined ? { ticketReleaseAtMs: releaseAtMs } : {}),
      });
    });
  };

  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const devoteeDb = () => testEnv.authenticatedContext('user-1').firestore();

  // The whole sale as ONE batch, exactly as lib/deskSales writes it:
  // the ticket, the party RSVP under the desk identity, the
  // headcount anchor (rsvpAnchorUid) and the tierSold anchor.
  const deskBatch = (db: any, ticketOver: Record<string, unknown> = {}) => {
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc(TID), deskTicket(ticketOver));
    batch.set(db.collection('festival_rsvps').doc(`${EV}__${DESK_UID}`), deskRsvp());
    batch.update(db.collection('festival_events').doc(EV), {
      rsvpHeadcount: 2, rsvpAnchorUid: DESK_UID, updatedAt: 1,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 2 }, tierAnchorTicketId: TID, updatedAt: 1,
    });
    return batch.commit();
  };

  it('102. A staff desk sale commits as one batch — ticket, desk RSVP, both anchors', async () => {
    await seed();
    await assertSucceeds(deskBatch(staffDb()));
  });

  it('103. A devotee cannot make a desk sale (the desk clauses are staff-only)', async () => {
    await seed();
    await assertFails(deskBatch(devoteeDb()));
  });

  it('104. A desk ticket claiming paid-wallet is refused — a desk identity holds no wallet', async () => {
    await seed();
    await assertFails(deskBatch(staffDb(), { paymentState: 'paid-wallet' }));
  });

  it('105. A desk ticket carrying a discount code is refused — codes stay a devotee-channel feature', async () => {
    await seed();
    await assertFails(deskBatch(staffDb(), { discountCode: 'DIWALI10' }));
  });

  it('106. A desk ticket whose buyer is not the derived desk identity is refused', async () => {
    await seed();
    await assertFails(deskBatch(staffDb(), { buyerUid: 'admin-1', rsvpId: `${EV}__admin-1` }));
  });

  it('107. A desk ticket recorded by someone else is refused (recordedBy must be the caller)', async () => {
    await seed();
    await assertFails(deskBatch(staffDb(), { recordedBy: 'acct-1' }));
  });

  it('108. The headcount anchor cannot move without its witness ticket', async () => {
    await seed();
    const db = staffDb();
    await assertFails(
      db.collection('festival_events').doc(EV).update({
        rsvpHeadcount: 2, rsvpAnchorUid: DESK_UID, updatedAt: 1,
      })
    );
  });

  it('109. A desk sale before the stamped release moment is refused', async () => {
    await seed(Date.now() + 86400000); // passes open tomorrow
    await assertFails(deskBatch(staffDb()));
  });

  it('110. A devotee cannot create an RSVP under a desk identity', async () => {
    await seed();
    await assertFails(
      devoteeDb().collection('festival_rsvps').doc(`${EV}__${DESK_UID}`).set(deskRsvp())
    );
  });

  it('111. A buyer-self ticket cannot smuggle desk fields past the pinned key set', async () => {
    await seed();
    const db = devoteeDb();
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc('tk-smuggle'), {
      workspaceId: 'ws-1',
      festivalId: EV,
      tierId: 'pass1',
      tierName: 'Cultural evening pass',
      buyerUid: 'user-1',
      buyerName: 'User One',
      attendees: [{ name: 'User One' }, { name: 'Guest Two' }],
      qty: 2,
      amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
      currency: 'INR',
      paymentState: 'pay-at-venue',
      rsvpId: `${EV}__user-1`,
      createdAt: '2026-01-01T00:00:00.000Z',
      deskSale: true,
      recordedBy: 'user-1',
    });
    await assertFails(batch.commit());
  });
});

describe('NEXT-LEVEL A1 — user follows (user_follows)', () => {
  const mine = () => testEnv.authenticatedContext('user-1').firestore().collection('user_follows').doc('user-1');
  const asOther = () => testEnv.authenticatedContext('user-2').firestore().collection('user_follows').doc('user-1');
  const shape = (over: Record<string, unknown> = {}) => ({
    orgIds: ['ws-1'],
    festivalIds: ['ws-1__fest1'],
    updatedAt: 1730000000000,
    ...over,
  });

  it('112. The owner creates, reads, updates and deletes their own follows doc', async () => {
    await assertSucceeds(mine().set(shape()));
    await assertSucceeds(mine().get());
    await assertSucceeds(mine().update({ orgIds: ['ws-1', 'ws-2'], updatedAt: 1730000001000 }));
    await assertSucceeds(mine().delete());
  });

  it('113. Another user cannot read someone else\'s follows', async () => {
    await assertSucceeds(mine().set(shape()));
    await assertFails(asOther().get());
  });

  it('114. Another user cannot create or update a doc under someone else\'s uid', async () => {
    await assertFails(asOther().set(shape()));
    await assertFails(asOther().update({ orgIds: [], updatedAt: 1730000002000 }));
    await assertFails(asOther().delete());
  });

  it('115. A create smuggling an extra key is refused', async () => {
    await assertFails(mine().set(shape({ admin: true })));
    await assertFails(mine().set(shape({ role: 'Trustee' })));
  });

  it('116. Oversized lists, non-list fields and a non-numeric updatedAt are refused', async () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => `ws-${i}`);
    await assertFails(mine().set(shape({ orgIds: tooMany })));
    await assertFails(mine().set(shape({ festivalIds: 'ws-1__fest1' })));
    await assertFails(mine().set(shape({ updatedAt: 'just now' })));
    // A create missing one of the three pinned keys is refused too.
    await assertFails(mine().set({ orgIds: [], updatedAt: 1730000000000 }));
  });

  it('117. Anonymous callers can neither read nor write follows', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection('user_follows').doc('user-1').get());
    await assertFails(unauthDb.collection('user_follows').doc('user-1').set(shape()));
  });
});

describe('NEXT-LEVEL B1b — the e-dip (event_dip_entries + the purchase interlock)', () => {
  const EV = 'ws-1__fest1';
  const now = Date.now();
  const startMs = now + 30 * 86400000; // festival 30 days out → 100% rung
  const OPEN = now - 3600000;          // dip window opened an hour ago
  const CLOSE = now + 3600000;         // …and closes in an hour
  const CLAIM_BY = now + 86400000;     // selected parties claim within a day
  const ENTRY_ID = `${EV}__pass1__user-1`;

  const entryDoc = (over: Record<string, unknown> = {}) => ({
    festivalId: EV,
    tierId: 'pass1',
    workspaceId: 'ws-1',
    uid: 'user-1',
    buyerName: 'User One',
    attendees: [{ name: 'User One' }, { name: 'Guest Two' }],
    heads: 2,
    createdAt: now,
    status: 'entered',
    ...over,
  });

  const ticketDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    festivalId: EV,
    tierId: 'pass1',
    tierName: 'Cultural evening pass',
    buyerUid: 'user-1',
    buyerName: 'User One',
    attendees: [{ name: 'User One' }, { name: 'Guest Two' }],
    qty: 2,
    amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
    currency: 'INR',
    paymentState: 'paid-wallet',
    rsvpId: `${EV}__user-1`,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  // The festival carries TWO tiers: pass1 dips, pass2 does not —
  // the control that proves non-dip behaviour is untouched.
  const seed = async (over: { claimByMs?: number; closesMs?: number } = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('festival_plans').doc(EV).set({
        workspaceId: 'ws-1',
        ticketing: {
          tiers: [],
          tierPrices: { pass1: 500, pass2: 500 },
          tierKinds: { pass1: 'paid', pass2: 'paid' },
          tierEarly: {},
          tierMax: { pass1: 6, pass2: 6 },
          codeMap: {},
          refundLadder: [
            { minDaysBefore: 7, percent: 100 },
            { minDaysBefore: 0, percent: 0 },
          ],
          discountUses: {},
          feeBearer: 'organiser',
          startMs,
          endMs: startMs + 86400000 - 1,
        },
      });
      await db.collection('festival_events').doc(EV).set({
        workspaceId: 'ws-1',
        published: true,
        ticketFeeBearer: 'organiser',
        tierCaps: { pass1: 100, pass2: 100 },
        tierSold: {},
        rsvpHeadcount: 0,
        slotBooked: {},
        dipOpensAtMs: { pass1: OPEN },
        dipClosesAtMs: { pass1: over.closesMs ?? CLOSE },
        dipDraws: {
          pass1: {
            seed: 'chit-42', poolHash: 'abc', poolCount: 1, frozenAtMs: now,
            drawnAtMs: now, winnersCount: 1, claimByMs: over.claimByMs ?? CLAIM_BY,
          },
        },
      });
      await db.collection('wallets').doc('user-1').set({
        uid: 'user-1', balance: 2000, totalSpent: 0, totalReceived: 0, currency: 'INR',
      });
    });
  };

  const seedEntry = async (status: string, extra: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('event_dip_entries').doc(ENTRY_ID)
        .set(entryDoc({ status, ...extra }));
    });
  };

  const buyerDb = () => testEnv.authenticatedContext('user-1').firestore();
  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const strangerDb = () => testEnv.authenticatedContext('stranger-1').firestore();

  // The E2 purchase batch, plus — for a dip claim — the entry
  // flip the same batch carries (selected → claimed).
  const purchaseBatch = (db: any, opts: { tierId?: string; consumeClaim?: boolean } = {}) => {
    const tierId = opts.tierId ?? 'pass1';
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc('tk-dip-1'), ticketDoc({ tierId }));
    batch.set(db.collection('festival_rsvps').doc(`${EV}__user-1`), {
      eventId: EV, workspaceId: 'ws-1', uid: 'user-1', name: 'User One',
      headcount: 2, status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', ticketId: 'tk-dip-1',
    });
    batch.update(db.collection('wallets').doc('user-1'), {
      balance: 1000, totalSpent: 1000, lastDebitTicketId: 'tk-dip-1', updatedAt: 1,
    });
    batch.set(db.collection('walletTransactions').doc('txn-dip-1'), {
      uid: 'user-1', type: 'spend', amount: 1000, currency: 'INR',
      orderId: 'tk-dip-1', note: 'Seva pass', createdAt: 1,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { [tierId]: 2 }, tierAnchorTicketId: 'tk-dip-1', updatedAt: 1,
    });
    if (opts.consumeClaim) {
      batch.update(db.collection('event_dip_entries').doc(ENTRY_ID), {
        status: 'claimed', updatedAt: 2,
      });
    }
    return batch.commit();
  };

  it('118. A devotee enters the dip inside the stamped window, under the derived id', async () => {
    await seed();
    await assertSucceeds(buyerDb().collection('event_dip_entries').doc(ENTRY_ID).set(entryDoc()));
  });

  it('119. An entry for someone else, or under a non-derived id, is refused', async () => {
    await seed();
    await assertFails(buyerDb().collection('event_dip_entries').doc(`${EV}__pass1__user-2`)
      .set(entryDoc({ uid: 'user-2' })));
    await assertFails(buyerDb().collection('event_dip_entries').doc('some-other-id')
      .set(entryDoc()));
    // A stranger may enter for THEMSELVES (the dip is a devotee
    // act) — but never into someone else's derived id.
    await assertFails(strangerDb().collection('event_dip_entries').doc(ENTRY_ID)
      .set(entryDoc()));
  });

  it('120. An entry outside the window is refused (window already closed)', async () => {
    await seed({ closesMs: now - 1000 });
    await assertFails(buyerDb().collection('event_dip_entries').doc(ENTRY_ID).set(entryDoc()));
  });

  it('121. Shape pins: extra keys, a heads lie, an over-cap party and a born-selected entry all fail', async () => {
    await seed();
    const db = buyerDb().collection('event_dip_entries').doc(ENTRY_ID);
    await assertFails(db.set(entryDoc({ admin: true })));
    await assertFails(db.set(entryDoc({ heads: 3 })));
    const bigParty = Array.from({ length: 7 }, (_, i) => ({ name: `Guest ${i}` }));
    await assertFails(db.set(entryDoc({ attendees: bigParty, heads: 7 })));
    await assertFails(db.set(entryDoc({ status: 'selected' })));
    await assertFails(db.set(entryDoc({ workspaceId: 'ws-2' })));
  });

  it('122. Read: the owner and workspace staff yes, a stranger no', async () => {
    await seed();
    await seedEntry('entered');
    const ref = (db: any) => db.collection('event_dip_entries').doc(ENTRY_ID);
    await assertSucceeds(ref(buyerDb()).get());
    await assertSucceeds(ref(staffDb()).get());
    await assertFails(ref(strangerDb()).get());
  });

  it('123. Withdraw: the owner may withdraw an entered entry while the window stands open', async () => {
    await seed();
    await assertSucceeds(buyerDb().collection('event_dip_entries').doc(ENTRY_ID).set(entryDoc()));
    await assertSucceeds(buyerDb().collection('event_dip_entries').doc(ENTRY_ID).delete());
  });

  it('124. Staff run the draw standings; a devotee cannot move their own standing', async () => {
    await seed();
    await seedEntry('entered');
    const ref = (db: any) => db.collection('event_dip_entries').doc(ENTRY_ID);
    await assertSucceeds(ref(staffDb()).update({ status: 'selected', dipPosition: 1, updatedAt: 3 }));
    await assertFails(ref(buyerDb()).update({ status: 'waitlisted', dipPosition: 2, updatedAt: 4 }));
    // A standing can never be rewritten backwards or sideways.
    await assertFails(ref(staffDb()).update({ status: 'entered', updatedAt: 5 }));
    await assertFails(ref(staffDb()).update({ status: 'claimed', updatedAt: 6 }));
  });

  it('125. Promotion and lapse: waitlisted → selected, selected → lapsed, staff only', async () => {
    await seed();
    await seedEntry('waitlisted', { dipPosition: 4 });
    const ref = (db: any) => db.collection('event_dip_entries').doc(ENTRY_ID);
    await assertSucceeds(ref(staffDb()).update({ status: 'selected', updatedAt: 7 }));
    await assertSucceeds(ref(staffDb()).update({ status: 'lapsed', updatedAt: 8 }));
  });

  it('126. After the draw, an entry is the audit: owner delete and staff delete are both denied', async () => {
    await seed();
    await seedEntry('selected', { dipPosition: 1 });
    const ref = (db: any) => db.collection('event_dip_entries').doc(ENTRY_ID);
    await assertFails(ref(buyerDb()).delete());
    await assertFails(ref(staffDb()).delete());
  });

  it('127. INTERLOCK: a direct purchase of the dip tier with no selected entry is refused', async () => {
    await seed();
    await assertFails(purchaseBatch(buyerDb()));
    // An entry that merely stands 'entered' is not a place.
    await seedEntry('entered');
    await assertFails(purchaseBatch(buyerDb()));
    // Nor is a waitlisted standing.
    await seedEntry('waitlisted', { dipPosition: 3 });
    await assertFails(purchaseBatch(buyerDb()));
  });

  it('128. A selected party claims: the purchase commits and consumes the claim in the same batch', async () => {
    await seed();
    await seedEntry('selected', { dipPosition: 1 });
    await assertSucceeds(purchaseBatch(buyerDb(), { consumeClaim: true }));
    const snap = await buyerDb().collection('event_dip_entries').doc(ENTRY_ID).get();
    expect(snap.data()?.status).toBe('claimed');
  });

  it('129. After the claim window, even a selected party cannot buy', async () => {
    await seed({ claimByMs: now - 1000 });
    await seedEntry('selected', { dipPosition: 1 });
    await assertFails(purchaseBatch(buyerDb(), { consumeClaim: true }));
  });

  it('130. A desk (counter) sale of the dip tier is refused — dip places are allotted by the draw alone', async () => {
    await seed();
    const db = staffDb();
    const TID = 'tk-dip-desk';
    const DESK_UID = `desk_${TID}`;
    const batch = db.batch();
    batch.set(db.collection('event_tickets').doc(TID), {
      workspaceId: 'ws-1', festivalId: EV, tierId: 'pass1', tierName: 'Cultural evening pass',
      buyerUid: DESK_UID, buyerName: 'Walk-in Guest',
      attendees: [{ name: 'Walk-in Guest' }, { name: 'Guest Two' }], qty: 2,
      amounts: { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 },
      currency: 'INR', paymentState: 'pay-at-venue', rsvpId: `${EV}__${DESK_UID}`,
      createdAt: '2026-01-01T00:00:00.000Z', deskSale: true, recordedBy: 'admin-1',
      venueReceived: true, receivedBy: 'Admin One', receivedAt: '2026-01-01T00:00:00.000Z',
    });
    batch.set(db.collection('festival_rsvps').doc(`${EV}__${DESK_UID}`), {
      eventId: EV, workspaceId: 'ws-1', uid: DESK_UID, name: 'Walk-in Guest',
      headcount: 2, status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', ticketId: TID,
    });
    batch.update(db.collection('festival_events').doc(EV), {
      tierSold: { pass1: 2 }, tierAnchorTicketId: TID, updatedAt: 1,
    });
    await assertFails(batch.commit());
  });

  it('131. CONTROL: the non-dip tier of the same festival sells exactly as before, no entry involved', async () => {
    await seed();
    await assertSucceeds(purchaseBatch(buyerDb(), { tierId: 'pass2' }));
  });
});

describe('POLLS NEXT-LEVEL P1 — the Decision-grade core (polls)', () => {
  const now = Date.now();
  const OUTCOME = {
    tallies: { opt_0: 3, opt_1: 1 },
    totalVotes: 4,
    turnout: 40,
    quorumMet: true,
    verdict: 'carried',
    winnerOptionIds: ['opt_0'],
    concludedAt: now,
  };

  // A launch-shaped poll doc (the create clause's closed key set).
  const pollDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    title: 'Repair the hall roof this year?',
    description: '',
    targetAudience: 'ALL_MEMBERS',
    status: 'ACTIVE',
    createdAt: now,
    createdBy: 'Admin One',
    expiresAt: now + 86400000,
    expiresAtTs: firebase.firestore.Timestamp.fromMillis(now + 86400000),
    options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
    totalVotes: 0,
    kind: 'choice',
    resultVisibility: 'afterClose',
    ...over,
  });

  const decisionDoc = (over: Record<string, unknown> = {}) => pollDoc({
    pollClass: 'decision',
    binding: true,
    ballot: 'secret',
    eligibleCount: 10,
    quorumPct: 25,
    passPct: 50,
    createdByUid: 'admin-1',
    ...over,
  });

  const seedPoll = async (id: string, doc: Record<string, unknown>) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('polls').doc(id).set(doc);
    });
  };

  const seedBallot = async (pollId: string, uid: string) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('polls').doc(pollId)
        .collection('votes').doc(uid)
        .set({ optionId: 'opt_0', optionIds: ['opt_0'], castAt: now });
    });
  };

  const committeeDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const memberDb = () => testEnv.authenticatedContext('user-1').firestore();

  it('132. a Decision poll launches with every P1 field carried', async () => {
    await assertSucceeds(committeeDb().collection('polls').doc('p1-a').set(decisionDoc()));
  });

  it('133. a bad pollClass value is refused at launch', async () => {
    await assertFails(committeeDb().collection('polls').doc('p1-b').set(decisionDoc({ pollClass: 'ranked' })));
  });

  it('134. a negative quorum mark is refused at launch', async () => {
    await assertFails(committeeDb().collection('polls').doc('p1-c').set(decisionDoc({ quorumPct: -5 })));
  });

  it('135. an outcome key at launch is refused — outcomes are concluded into existence', async () => {
    await assertFails(committeeDb().collection('polls').doc('p1-d').set(decisionDoc({ outcome: OUTCOME })));
  });

  it('136. the committee concludes WITH the recorded outcome in the same write', async () => {
    await seedPoll('p1-e', decisionDoc());
    await assertSucceeds(committeeDb().collection('polls').doc('p1-e')
      .update({ status: 'CONCLUDED', outcome: OUTCOME }));
  });

  it('137. the outcome is write-once: a rewrite over a concluded record fails', async () => {
    await seedPoll('p1-f', decisionDoc({ status: 'CONCLUDED', outcome: OUTCOME }));
    await assertFails(committeeDb().collection('polls').doc('p1-f')
      .update({ outcome: { ...OUTCOME, verdict: 'not-carried' } }));
  });

  it('138. CONTROL: the official note still moves on a concluded poll whose outcome is stored', async () => {
    await seedPoll('p1-g', decisionDoc({ status: 'CONCLUDED', outcome: OUTCOME }));
    await assertSucceeds(committeeDb().collection('polls').doc('p1-g')
      .update({ adminNote: 'Roof contract awarded.' }));
  });

  it('139. the committee may stamp the outcome onto a poll the deadline already concluded', async () => {
    await seedPoll('p1-h', decisionDoc({ status: 'CONCLUDED' }));
    await assertSucceeds(committeeDb().collection('polls').doc('p1-h')
      .update({ outcome: OUTCOME }));
  });

  it('140. an outcome write onto a still-ACTIVE poll fails', async () => {
    await seedPoll('p1-i', decisionDoc());
    await assertFails(committeeDb().collection('polls').doc('p1-i')
      .update({ outcome: OUTCOME }));
  });

  it('141. a member lands the deadline conclusion (status only), as before', async () => {
    await seedPoll('p1-j', decisionDoc({
      expiresAt: now - 1000,
      expiresAtTs: firebase.firestore.Timestamp.fromMillis(now - 1000),
    }));
    await assertSucceeds(memberDb().collection('polls').doc('p1-j')
      .update({ status: 'CONCLUDED' }));
  });

  it('142. a member outcome write fails — the record is the committee\u2019s to stamp', async () => {
    await seedPoll('p1-k', decisionDoc({ status: 'CONCLUDED' }));
    await assertFails(memberDb().collection('polls').doc('p1-k')
      .update({ outcome: OUTCOME }));
  });

  it('143. Decision + NAMED: the committee may read another member\u2019s ballot', async () => {
    await seedPoll('p1-l', decisionDoc({ ballot: 'named' }));
    await seedBallot('p1-l', 'user-1');
    await assertSucceeds(committeeDb().collection('polls').doc('p1-l')
      .collection('votes').doc('user-1').get());
  });

  it('144. Decision + SECRET: the committee may NOT read another member\u2019s ballot', async () => {
    await seedPoll('p1-m', decisionDoc({ ballot: 'secret' }));
    await seedBallot('p1-m', 'user-1');
    await assertFails(committeeDb().collection('polls').doc('p1-m')
      .collection('votes').doc('user-1').get());
  });

  it('145. CONTROL: a member always reads their own ballot, named or secret', async () => {
    await seedPoll('p1-n', decisionDoc({ ballot: 'secret' }));
    await seedBallot('p1-n', 'user-1');
    await assertSucceeds(memberDb().collection('polls').doc('p1-n')
      .collection('votes').doc('user-1').get());
  });
});

describe('AUCTION A1 — Nilam lots (auction_lots)', () => {
  const LOT = 'lot-a1-1';
  const lotDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    source: { kind: 'standalone', label: 'Brass lamps (12)' },
    lotClass: 'movables',
    title: 'Brass lamps, set of twelve',
    description: 'Store-room surplus',
    mediaRefs: [],
    reservePrice: 4000,
    valuationBasis: null,
    sanction: null,
    leaseTermYears: null,
    status: 'draft',
    history: { draft: { at: 1, by: 'admin-1' } },
    notice: null,
    affixtures: [],
    objections: [],
    registrations: [],
    outcome: null,
    settlement: { depositAmount: 0, depositTxId: '', balanceTxId: '' },
    failReason: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  });
  const VALUATION = { kind: 'committee-estimate', figure: 4500, valuedOn: '2026-11-01' };
  const SANCTION = { authority: 'Commissioner, HR&CE', reference: 'Order 12/2026', date: '2026-11-02' };
  const NOTICE = { auctionAt: 1765000000000, auctionPlace: 'Temple hall', emdAmount: 400, objectionDeadline: 1764500000000, publishedAt: 1 };

  const seedLot = async (over: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('auction_lots').doc(LOT).set(lotDoc(over));
    });
  };
  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const acctDb = () => testEnv.authenticatedContext('acct-1').firestore();
  const devoteeDb = () => testEnv.authenticatedContext('user-1').firestore();
  const ref = (db: any) => db.collection('auction_lots').doc(LOT);

  it('146. Staff create a draft lot; the birth shape is pinned', async () => {
    await assertSucceeds(ref(staffDb()).set(lotDoc()));
    await assertSucceeds(ref(acctDb()).set(lotDoc()));
    await assertFails(ref(staffDb()).set(lotDoc({ lotClass: 'land' })));
    await assertFails(ref(staffDb()).set(lotDoc({ title: '' })));
    await assertFails(ref(staffDb()).set(lotDoc({ status: 'approved' })));
    await assertFails(ref(staffDb()).set(lotDoc({ registrations: [{ name: 'Early' }] })));
    await assertFails(ref(staffDb()).set(lotDoc({ surpriseKey: true })));
    await assertFails(ref(devoteeDb()).set(lotDoc()));
  });

  it('147. The lot doc is staff-read only — bidder personal data never leaves the desk', async () => {
    await seedLot();
    await assertSucceeds(ref(staffDb()).get());
    await assertSucceeds(ref(acctDb()).get());
    await assertFails(ref(devoteeDb()).get());
  });

  it('148. VALUATION GATE: a lot cannot leave draft without a valuation basis', async () => {
    await seedLot();
    await assertFails(ref(staffDb()).update({ status: 'approved', updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({ status: 'approved', valuationBasis: VALUATION, updatedAt: 2 }));
  });

  it('149. SANCTION GATE: an immovable-sale lot cannot be noticed without a sanction record', async () => {
    await seedLot({ lotClass: 'immovable-sale', status: 'approved', valuationBasis: VALUATION });
    await assertFails(ref(staffDb()).update({ status: 'noticed', notice: NOTICE, updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({ sanction: SANCTION, updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({ status: 'noticed', notice: NOTICE, updatedAt: 3 }));
  });

  it('150. SANCTION GATE: a lease over five years is gated the same way; a short lease is not', async () => {
    await seedLot({ lotClass: 'rights-lease', leaseTermYears: 9, status: 'approved', valuationBasis: VALUATION });
    await assertFails(ref(staffDb()).update({ status: 'noticed', notice: NOTICE, updatedAt: 2 }));
    await seedLot({ lotClass: 'rights-lease', leaseTermYears: 3, status: 'approved', valuationBasis: VALUATION });
    await assertSucceeds(ref(staffDb()).update({ status: 'noticed', notice: NOTICE, updatedAt: 2 }));
  });

  it('151. TRANSITIONS: the lifecycle cannot skip steps and settled is terminal', async () => {
    await seedLot({ valuationBasis: VALUATION });
    await assertFails(ref(staffDb()).update({ status: 'settled', updatedAt: 2 }));
    await assertFails(ref(staffDb()).update({ status: 'noticed', notice: NOTICE, updatedAt: 2 }));
    await seedLot({ status: 'settled', valuationBasis: VALUATION });
    await assertFails(ref(staffDb()).update({ status: 'open', updatedAt: 2 }));
    // …but an accepted lot whose winner defaults is recorded failed.
    await seedLot({ status: 'accepted', valuationBasis: VALUATION });
    await assertSucceeds(ref(staffDb()).update({ status: 'failed', failReason: 'Winner defaulted', updatedAt: 2 }));
  });

  it('152. NOTICE FREEZE: once noticed, the published notice cannot be rewritten — affixtures still record', async () => {
    await seedLot({ status: 'noticed', valuationBasis: VALUATION, notice: NOTICE });
    await assertFails(ref(staffDb()).update({ notice: { ...NOTICE, place: 'Elsewhere' }, updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({
      affixtures: [{ place: 'temple-board', at: '2026-11-20', by: 'admin-1' }], updatedAt: 2,
    }));
  });

  it('153. ARRAYS NEVER SHRINK and registrations are capped at 100', async () => {
    const reg = { name: 'Bidder One', phone: '9000000000', idReference: 'Aadhaar ****1234', relatedParty: false, emdAmount: 400, emdMode: 'cash', receivedAt: 1 };
    await seedLot({ status: 'open', valuationBasis: VALUATION, notice: NOTICE, registrations: [reg] });
    await assertFails(ref(staffDb()).update({ registrations: [], updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({ registrations: [reg, { ...reg, name: 'Bidder Two' }], updatedAt: 2 }));
    const full = Array.from({ length: 100 }, (_, i) => ({ ...reg, name: `Bidder ${i}` }));
    await seedLot({ status: 'open', valuationBasis: VALUATION, notice: NOTICE, registrations: full });
    await assertFails(ref(staffDb()).update({ registrations: [...full, reg], updatedAt: 2 }));
  });

  it('154. OBJECTIONS: an objection records on the lot and its response lands at the same size', async () => {
    await seedLot({ status: 'open', valuationBasis: VALUATION, notice: NOTICE });
    const objection = { id: 'ob1', objectorName: 'Neighbour', text: 'The boundary is disputed', receivedOn: '2026-11-21' };
    await assertSucceeds(ref(staffDb()).update({ objections: [objection], updatedAt: 2 }));
    await assertSucceeds(ref(staffDb()).update({
      objections: [{ ...objection, response: 'Survey attached; boundary confirmed.', respondedOn: '2026-11-22', respondedBy: 'admin-1' }],
      updatedAt: 3,
    }));
  });

  it('155. OUTCOME FREEZE: once accepted, the recorded outcome cannot be rewritten', async () => {
    const outcome = { winnerRegistrationId: 'reg-1', winnerName: 'Bidder One', winningAmount: 5200, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: true };
    await seedLot({ status: 'accepted', valuationBasis: VALUATION, notice: NOTICE, outcome });
    await assertFails(ref(staffDb()).update({ outcome: { ...outcome, winningAmount: 1 }, updatedAt: 2 }));
    await seedLot({ status: 'settled', valuationBasis: VALUATION, notice: NOTICE, outcome });
    await assertFails(ref(staffDb()).update({ outcome: { ...outcome, winningAmount: 1 }, updatedAt: 2 }));
  });

  it('156. SETTLEMENT: treasury tx ids are append-only — a posted id can never be swapped', async () => {
    const outcome = { winnerRegistrationId: 'reg-1', winnerName: 'Bidder One', winningAmount: 5200, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: true };
    await seedLot({ status: 'accepted', valuationBasis: VALUATION, notice: NOTICE, outcome });
    const withDeposit = { depositAmount: 2000, depositTxId: 'tx-dep-1', balanceTxId: '' };
    await assertSucceeds(ref(staffDb()).update({ settlement: withDeposit, updatedAt: 2 }));
    await assertFails(ref(staffDb()).update({ settlement: { ...withDeposit, depositTxId: 'tx-other' }, updatedAt: 3 }));
    await assertSucceeds(ref(staffDb()).update({
      status: 'settled',
      settlement: { ...withDeposit, balanceTxId: 'tx-bal-1' },
      updatedAt: 4,
    }));
  });

  it('157. The lot class is immutable once created — the sanction gate cannot be dodged by reclassing', async () => {
    await seedLot({ lotClass: 'immovable-sale', status: 'approved', valuationBasis: VALUATION });
    await assertFails(ref(staffDb()).update({ lotClass: 'movables', updatedAt: 2 }));
  });

  it('158. DELETE is denied to everyone — a failed or disputed lot stays on record', async () => {
    await seedLot();
    await assertFails(ref(staffDb()).delete());
    await assertFails(ref(devoteeDb()).delete());
  });
});

describe('NOTIFICATION WAVE 4 — platform notices + broadcast audience', () => {
  // 'global-admin-uid' is the platform_admins-seeded SuperAdmin (see
  // beforeEach); 'user-1' is an ordinary signed-in devotee of ws-1.
  const superDb = () => testEnv.authenticatedContext('global-admin-uid').firestore();
  const userDb = () => testEnv.authenticatedContext('user-1').firestore();
  const anonDb = () => testEnv.unauthenticatedContext().firestore();

  const NOTICE = 'notice-w4-1';
  const noticeDoc = (over: Record<string, unknown> = {}) => ({
    title: 'Maintenance on Sunday, 6–8 am',
    body: 'Sanatani Bandhan will be briefly unavailable while we tend the servers.',
    kind: 'info',
    createdAt: 1,
    expiresAt: 0,
    active: true,
    ...over,
  });
  const noticeRef = (db: any) => db.collection('platformNotices').doc(NOTICE);
  const seedNotice = async (over: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('platformNotices').doc(NOTICE).set(noticeDoc(over));
    });
  };

  it('159. platformNotices: any signed-in user may read; anonymous may not', async () => {
    await seedNotice();
    await assertSucceeds(noticeRef(userDb()).get());
    await assertSucceeds(noticeRef(superDb()).get());
    await assertFails(noticeRef(anonDb()).get());
  });

  it('160. platformNotices: create is SuperAdmin-only — an ordinary user is refused', async () => {
    await assertFails(noticeRef(userDb()).set(noticeDoc()));
    await assertFails(noticeRef(anonDb()).set(noticeDoc()));
    await assertSucceeds(noticeRef(superDb()).set(noticeDoc()));
  });

  it('161. platformNotices: the create shape is pinned — kind enum, numeric clocks, no extra keys, non-empty title', async () => {
    await assertSucceeds(noticeRef(superDb()).set(noticeDoc({ kind: 'important', expiresAt: 9999999999999 })));
    await assertFails(noticeRef(superDb()).set(noticeDoc({ kind: 'urgent' })));
    await assertFails(noticeRef(superDb()).set(noticeDoc({ title: '' })));
    await assertFails(noticeRef(superDb()).set(noticeDoc({ createdAt: 'now' })));
    await assertFails(noticeRef(superDb()).set(noticeDoc({ expiresAt: 'never' })));
    await assertFails(noticeRef(superDb()).set(noticeDoc({ surpriseKey: true })));
  });

  it('162. platformNotices: update may flip ONLY active — a published notice is never rewritten', async () => {
    await seedNotice();
    await assertSucceeds(noticeRef(superDb()).update({ active: false }));
    await assertFails(noticeRef(superDb()).update({ title: 'Rewritten after the fact' }));
    await assertFails(noticeRef(superDb()).update({ body: 'Different words' }));
    await assertFails(noticeRef(superDb()).update({ active: true, kind: 'important' }));
    await assertFails(noticeRef(userDb()).update({ active: false }));
  });

  it('163. platformNotices: delete is SuperAdmin-only', async () => {
    await seedNotice();
    await assertFails(noticeRef(userDb()).delete());
    await assertSucceeds(noticeRef(superDb()).delete());
  });

  const BC = 'bc-w4-1';
  const bcDoc = (over: Record<string, unknown> = {}) => ({
    orgId: 'ws-1',
    orgName: 'Workspace 1',
    title: 'Annual general meeting on Friday',
    body: 'Members are requested to attend.',
    createdBy: 'global-admin-uid',
    createdByName: 'Platform Admin',
    audienceCount: 48,
    createdAt: 1,
    ...over,
  });
  const bcRef = (db: any) => db.collection('orgBroadcasts').doc(BC);

  it('164. orgBroadcasts audience: a legacy doc with NO audience field still creates (followers by default)', async () => {
    await assertSucceeds(bcRef(superDb()).set(bcDoc()));
    await assertSucceeds(bcRef(superDb()).set(bcDoc({ audience: 'followers' })));
  });

  it('165. orgBroadcasts audience: members and staff addressing create; a bad enum value is refused', async () => {
    await assertSucceeds(bcRef(superDb()).set(bcDoc({ audience: 'members' })));
    await assertSucceeds(bcRef(superDb()).set(bcDoc({ audience: 'staff' })));
    await assertFails(bcRef(superDb()).set(bcDoc({ audience: 'everyone' })));
    await assertFails(bcRef(superDb()).set(bcDoc({ audience: 42 })));
  });

  it('166. orgBroadcasts audience: audienceRole is allowed only alongside audience == staff', async () => {
    await assertSucceeds(bcRef(superDb()).set(bcDoc({ audience: 'staff', audienceRole: 'Accountant' })));
    await assertFails(bcRef(superDb()).set(bcDoc({ audience: 'members', audienceRole: 'Accountant' })));
    await assertFails(bcRef(superDb()).set(bcDoc({ audienceRole: 'Accountant' })));
    await assertFails(bcRef(superDb()).set(bcDoc({ audience: 'followers', audienceRole: 'Trustee' })));
  });
});

describe('POLLS NEXT-LEVEL P2b — drafts, scheduling, templates, abstain (polls)', () => {
  const now = Date.now();
  const FUTURE = now + 86400000;
  const PAST = now - 3600000;
  const OUTCOME = {
    tallies: { opt_0: 3, opt_1: 1 },
    totalVotes: 4,
    turnout: 40,
    quorumMet: true,
    verdict: 'carried',
    winnerOptionIds: ['opt_0'],
    concludedAt: now,
  };

  // A P2b launch-shaped poll doc: Decision-grade, abstention
  // offered as a field (allowAbstain) with its counter born at 0.
  const p2bDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    title: 'Repair the hall roof this year?',
    description: '',
    targetAudience: 'ALL_MEMBERS',
    status: 'ACTIVE',
    createdAt: now,
    createdBy: 'Admin One',
    createdByUid: 'admin-1',
    expiresAt: FUTURE,
    expiresAtTs: firebase.firestore.Timestamp.fromMillis(FUTURE),
    options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
    totalVotes: 0,
    kind: 'choice',
    resultVisibility: 'afterClose',
    pollClass: 'decision',
    binding: true,
    ballot: 'secret',
    eligibleCount: 10,
    quorumPct: 25,
    passPct: 50,
    allowAbstain: true,
    abstainVotes: 0,
    ...over,
  });

  const opts = (n: number) => {
    const map: Record<string, unknown> = {};
    for (let i = 0; i < n; i++) map[`opt_${i}`] = { text: `Option ${i + 1}`, votes: 0 };
    return map;
  };

  const seedPoll = async (id: string, doc: Record<string, unknown>) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('polls').doc(id).set(doc);
    });
  };

  const committeeDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const memberDb = () => testEnv.authenticatedContext('user-1').firestore();
  const mgrDb = () => testEnv.authenticatedContext('mgr-1').firestore();

  // The app's choice-ballot batch (pollVoting.commitPlan): the
  // ballot doc under the caller's own uid + the anchored +1s.
  const castChoice = (db: any, pollId: string, uid: string) => {
    const batch = db.batch();
    batch.set(db.collection('polls').doc(pollId).collection('votes').doc(uid), {
      optionId: 'opt_0',
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc(pollId), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      'options.opt_0.votes': firebase.firestore.FieldValue.increment(1),
    });
    return batch.commit();
  };

  // The app's abstain batch: {abstain: true} + turnout and the
  // abstention counter move; no option counter ever moves.
  const castAbstain = (db: any, pollId: string, uid: string) => {
    const batch = db.batch();
    batch.set(db.collection('polls').doc(pollId).collection('votes').doc(uid), {
      abstain: true,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc(pollId), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      abstainVotes: firebase.firestore.FieldValue.increment(1),
    });
    return batch.commit();
  };

  it('167. a draft is born committee-only: members cannot read it, the committee can', async () => {
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-a').set(p2bDoc({ status: 'DRAFT' })));
    await assertFails(memberDb().collection('polls').doc('p2b-a').get());
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-a').get());
    // A dateless draft (the desk may save one with no dates at all)
    // is equally lawful at birth.
    const dateless = p2bDoc({ status: 'DRAFT' });
    delete (dateless as Record<string, unknown>).expiresAt;
    delete (dateless as Record<string, unknown>).expiresAtTs;
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-a2').set(dateless));
  });

  it('168. a ballot cast on a draft is refused', async () => {
    await seedPoll('p2b-b', p2bDoc({ status: 'DRAFT' }));
    await assertFails(castChoice(memberDb(), 'p2b-b', 'user-1'));
  });

  it('169. a ballot before the scheduled opening is refused; at/after opening it lands', async () => {
    await seedPoll('p2b-c', p2bDoc({
      opensAt: FUTURE,
      opensAtTs: firebase.firestore.Timestamp.fromMillis(FUTURE),
    }));
    await assertFails(castChoice(memberDb(), 'p2b-c', 'user-1'));
    await seedPoll('p2b-c2', p2bDoc({
      opensAt: PAST,
      opensAtTs: firebase.firestore.Timestamp.fromMillis(PAST),
    }));
    await assertSucceeds(castChoice(memberDb(), 'p2b-c2', 'user-1'));
  });

  it('170. eight real options launch; nine are refused', async () => {
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-d').set(p2bDoc({ options: opts(8) })));
    await assertFails(committeeDb().collection('polls').doc('p2b-e').set(p2bDoc({ options: opts(9) })));
  });

  it('171. the reserved abstain entry never consumes an option slot (8 real + abstain launches)', async () => {
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-f')
      .set(p2bDoc({ options: { ...opts(8), abstain: { text: 'Abstain', votes: 0 } } })));
  });

  it('172. the abstain ballot shape is pinned and gated on the poll offering abstention', async () => {
    await seedPoll('p2b-g', p2bDoc());
    await assertSucceeds(castAbstain(memberDb(), 'p2b-g', 'user-1'));
    // The poll does not offer abstention -> the ballot is refused.
    await seedPoll('p2b-h', p2bDoc({ allowAbstain: false }));
    await assertFails(castAbstain(memberDb(), 'p2b-h', 'user-1'));
    // A ballot that claims abstention AND names an option is not
    // the abstain shape at all.
    await seedPoll('p2b-h2', p2bDoc());
    const db = memberDb();
    const batch = db.batch();
    batch.set(db.collection('polls').doc('p2b-h2').collection('votes').doc('user-1'), {
      abstain: true,
      optionId: 'opt_0',
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc('p2b-h2'), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      abstainVotes: firebase.firestore.FieldValue.increment(1),
    });
    await assertFails(batch.commit());
  });

  it('173. the abstain anchor moves turnout + abstentions only — an option-inflating batch fails', async () => {
    await seedPoll('p2b-i', p2bDoc());
    await assertSucceeds(castAbstain(memberDb(), 'p2b-i', 'user-1'));
    const snap = await committeeDb().collection('polls').doc('p2b-i').get();
    expect(snap.data()?.totalVotes).toBe(1);
    expect(snap.data()?.abstainVotes).toBe(1);
    expect(snap.data()?.options?.opt_0?.votes).toBe(0);

    await seedPoll('p2b-j', p2bDoc());
    const db = memberDb();
    const batch = db.batch();
    batch.set(db.collection('polls').doc('p2b-j').collection('votes').doc('user-1'), {
      abstain: true,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc('p2b-j'), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      abstainVotes: firebase.firestore.FieldValue.increment(1),
      'options.opt_0.votes': firebase.firestore.FieldValue.increment(1),
    });
    await assertFails(batch.commit());
  });

  it('174. a draft edits, then opens with the electorate re-stamp — the stamp is immovable elsewhere', async () => {
    await seedPoll('p2b-k', p2bDoc({ status: 'DRAFT', eligibleCount: 7 }));
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-k')
      .update({ title: 'Repair the hall roof next year?' }));
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-k')
      .update({ status: 'ACTIVE', eligibleCount: 12 }));
    // On an ACTIVE poll, no manage write may move the electorate.
    await seedPoll('p2b-l', p2bDoc());
    await assertFails(committeeDb().collection('polls').doc('p2b-l')
      .update({ adminNote: 'Noted.', eligibleCount: 99 }));
  });

  it('175. CONTROL: conclude + the write-once outcome behave exactly as P1 left them', async () => {
    await seedPoll('p2b-m', p2bDoc());
    await assertSucceeds(committeeDb().collection('polls').doc('p2b-m')
      .update({ status: 'CONCLUDED', outcome: OUTCOME }));
    await seedPoll('p2b-n', p2bDoc({ status: 'CONCLUDED', outcome: OUTCOME }));
    await assertFails(committeeDb().collection('polls').doc('p2b-n')
      .update({ outcome: { ...OUTCOME, verdict: 'not-carried' } }));
  });

  it('176. a board member (Manager) may write ONLY pollTemplates on the workspace doc', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('mgr-1')
        .set({ workspaceId: 'ws-1', role: 'MANAGER' });
    });
    await assertSucceeds(mgrDb().collection('workspaces').doc('ws-1').update({
      pollTemplates: [{ id: 'tpl-1', name: 'Monthly seva roster', savedAt: now, shape: { title: 'Roster' } }],
      updatedAt: now,
    }));
    // The same hand may not rename the workspace in the same write.
    await assertFails(mgrDb().collection('workspaces').doc('ws-1').update({
      pollTemplates: [],
      name: 'Renamed',
    }));
  });

  it('177. a plain member may not write pollTemplates', async () => {
    await assertFails(memberDb().collection('workspaces').doc('ws-1').update({
      pollTemplates: [],
      updatedAt: now,
    }));
  });

  it('178. CONTROL: a member still cannot vote twice', async () => {
    await seedPoll('p2b-o', p2bDoc());
    await assertSucceeds(castChoice(memberDb(), 'p2b-o', 'user-1'));
    await assertFails(castChoice(memberDb(), 'p2b-o', 'user-1'));
  });
});

describe('POLLS NEXT-LEVEL P3 — ranked, points, time (polls)', () => {
  const now = Date.now();
  const FUTURE = now + 86400000;

  // The P2b launch shape with the kind swapped: Decision-grade,
  // abstention as a field. Counted kinds are 'named' by the app's
  // create (the committee counts the papers); time is a counter
  // kind and keeps the creator's secrecy choice.
  const p3Doc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    title: 'Which hall design should we build?',
    description: '',
    targetAudience: 'ALL_MEMBERS',
    status: 'ACTIVE',
    createdAt: now,
    createdBy: 'Admin One',
    createdByUid: 'admin-1',
    expiresAt: FUTURE,
    expiresAtTs: firebase.firestore.Timestamp.fromMillis(FUTURE),
    options: {
      opt_0: { text: 'Design A', votes: 0 },
      opt_1: { text: 'Design B', votes: 0 },
      opt_2: { text: 'Design C', votes: 0 },
    },
    totalVotes: 0,
    kind: 'ranked',
    resultVisibility: 'afterClose',
    pollClass: 'decision',
    binding: false,
    ballot: 'named',
    eligibleCount: 10,
    quorumPct: 25,
    passPct: 50,
    allowAbstain: true,
    abstainVotes: 0,
    ...over,
  });

  const seedPoll = async (id: string, doc: Record<string, unknown>) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('polls').doc(id).set(doc);
    });
  };

  const committeeDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const memberDb = () => testEnv.authenticatedContext('user-1').firestore();

  // The app's counted batches (pollVoting.commitPlan): the ballot
  // doc under the caller's own uid + turnout +1 — NO option
  // counter ever moves (pollCountedVoteAnchorOk).
  const castRanked = (db: any, pollId: string, uid: string, ranking: string[]) => {
    const batch = db.batch();
    batch.set(db.collection('polls').doc(pollId).collection('votes').doc(uid), {
      ranking,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc(pollId), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
    });
    return batch.commit();
  };

  const castPoints = (db: any, pollId: string, uid: string, allocations: unknown[]) => {
    const batch = db.batch();
    batch.set(db.collection('polls').doc(pollId).collection('votes').doc(uid), {
      allocations,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc(pollId), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
    });
    return batch.commit();
  };

  const castChoiceOn = (db: any, pollId: string, uid: string) => {
    const batch = db.batch();
    batch.set(db.collection('polls').doc(pollId).collection('votes').doc(uid), {
      optionId: 'opt_0',
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc(pollId), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      'options.opt_0.votes': firebase.firestore.FieldValue.increment(1),
    });
    return batch.commit();
  };

  it('179. a ranked poll launches, a ranked ballot lands, and the options map stays frozen', async () => {
    await assertSucceeds(committeeDb().collection('polls').doc('p3-a').set(p3Doc()));
    await assertSucceeds(castRanked(memberDb(), 'p3-a', 'user-1', ['opt_2', 'opt_0']));
    const snap = await committeeDb().collection('polls').doc('p3-a').get();
    expect(snap.data()?.totalVotes).toBe(1);
    expect(snap.data()?.options?.opt_0?.votes).toBe(0);
    expect(snap.data()?.options?.opt_2?.votes).toBe(0);
    // One voter, one ballot — the counted anchor refuses a second.
    await assertFails(castRanked(memberDb(), 'p3-a', 'user-1', ['opt_1']));
  });

  it('180. a ranked ballot naming a stranger, the abstain id, or nothing is refused', async () => {
    await seedPoll('p3-b', p3Doc());
    await assertFails(castRanked(memberDb(), 'p3-b', 'user-1', ['opt_9']));
    await assertFails(castRanked(memberDb(), 'p3-b', 'user-1', ['abstain']));
    await assertFails(castRanked(memberDb(), 'p3-b', 'user-1', []));
  });

  it('181. a points ballot summing to exactly 100 lands; 90 and an over-100 entry are refused', async () => {
    await seedPoll('p3-c', p3Doc({ kind: 'points', title: 'Where should the money lean?' }));
    await assertSucceeds(castPoints(memberDb(), 'p3-c', 'user-1', [
      { optionId: 'opt_0', points: 60 },
      { optionId: 'opt_1', points: 40 },
    ]));
    await seedPoll('p3-d', p3Doc({ kind: 'points' }));
    await assertFails(castPoints(memberDb(), 'p3-d', 'user-1', [
      { optionId: 'opt_0', points: 50 },
      { optionId: 'opt_1', points: 40 },
    ]));
    await seedPoll('p3-e', p3Doc({ kind: 'points' }));
    await assertFails(castPoints(memberDb(), 'p3-e', 'user-1', [
      { optionId: 'opt_0', points: 101 },
    ]));
    // A stranger head is refused even when the sum is 100.
    await seedPoll('p3-e2', p3Doc({ kind: 'points' }));
    await assertFails(castPoints(memberDb(), 'p3-e2', 'user-1', [
      { optionId: 'opt_9', points: 100 },
    ]));
  });

  it('182. a counted ballot whose batch inflates an option counter fails whole', async () => {
    await seedPoll('p3-f', p3Doc());
    const db = memberDb();
    const batch = db.batch();
    batch.set(db.collection('polls').doc('p3-f').collection('votes').doc('user-1'), {
      ranking: ['opt_0'],
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc('p3-f'), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      'options.opt_0.votes': firebase.firestore.FieldValue.increment(1),
    });
    await assertFails(batch.commit());
  });

  it('183. the committee reads counted ballots for the count; a member reads only their own', async () => {
    await seedPoll('p3-g', p3Doc());
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('polls').doc('p3-g').collection('votes').doc('user-1')
        .set({ ranking: ['opt_1', 'opt_0'], votedAt: firebase.firestore.Timestamp.fromMillis(now) });
      await db.collection('polls').doc('p3-g').collection('votes').doc('acct-1')
        .set({ ranking: ['opt_0'], votedAt: firebase.firestore.Timestamp.fromMillis(now) });
    });
    // The count: the poll's own committee may read the papers.
    await assertSucceeds(committeeDb().collection('polls').doc('p3-g').collection('votes').doc('acct-1').get());
    await assertSucceeds(committeeDb().collection('polls').doc('p3-g').collection('votes').get());
    // A member may read their OWN ballot (control) — never another's.
    await assertSucceeds(memberDb().collection('polls').doc('p3-g').collection('votes').doc('user-1').get());
    await assertFails(memberDb().collection('polls').doc('p3-g').collection('votes').doc('acct-1').get());
    await assertFails(memberDb().collection('polls').doc('p3-g').collection('votes').get());
  });

  it('184. a time poll launches with slots, and its ballot is an ordinary choice ballot', async () => {
    const slot = (text: string, slotAt: number) => ({ text, votes: 0, slotAt });
    await assertSucceeds(committeeDb().collection('polls').doc('p3-h').set(p3Doc({
      kind: 'time',
      ballot: 'secret',
      title: 'When shall we hold the satsang?',
      options: {
        opt_0: slot('Saturday morning', FUTURE),
        opt_1: slot('Sunday evening', FUTURE + 86400000),
      },
    })));
    await assertSucceeds(castChoiceOn(memberDb(), 'p3-h', 'user-1'));
    const snap = await committeeDb().collection('polls').doc('p3-h').get();
    expect(snap.data()?.options?.opt_0?.votes).toBe(1);
  });

  it('185. CONTROL: text ballots and abstentions behave exactly as P2b left them', async () => {
    const textDoc = p3Doc({ kind: 'text', ballot: 'named', options: {} });
    delete (textDoc as Record<string, unknown>).allowAbstain;
    delete (textDoc as Record<string, unknown>).abstainVotes;
    await seedPoll('p3-i', textDoc);
    const db = memberDb();
    const batch = db.batch();
    batch.set(db.collection('polls').doc('p3-i').collection('votes').doc('user-1'), {
      text: 'More parking near the gate, please.',
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection('polls').doc('p3-i'), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
    });
    await assertSucceeds(batch.commit());

    await seedPoll('p3-j', p3Doc({ kind: 'choice', ballot: 'secret' }));
    const db2 = memberDb();
    const batch2 = db2.batch();
    batch2.set(db2.collection('polls').doc('p3-j').collection('votes').doc('user-1'), {
      abstain: true,
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch2.update(db2.collection('polls').doc('p3-j'), {
      totalVotes: firebase.firestore.FieldValue.increment(1),
      abstainVotes: firebase.firestore.FieldValue.increment(1),
    });
    await assertSucceeds(batch2.commit());
  });

  it('186. the ballot shape follows the kind — cross-shape ballots are refused both ways', async () => {
    // A choice-shaped ballot on a ranked poll.
    await seedPoll('p3-k', p3Doc());
    await assertFails(castChoiceOn(memberDb(), 'p3-k', 'user-1'));
    // A ranking ballot on a choice poll.
    await seedPoll('p3-l', p3Doc({ kind: 'choice', ballot: 'secret' }));
    await assertFails(castRanked(memberDb(), 'p3-l', 'user-1', ['opt_0']));
    // A points ballot on a ranked poll.
    await seedPoll('p3-m', p3Doc());
    await assertFails(castPoints(memberDb(), 'p3-m', 'user-1', [{ optionId: 'opt_0', points: 100 }]));
    // A ranking ballot on a points poll.
    await seedPoll('p3-n', p3Doc({ kind: 'points' }));
    await assertFails(castRanked(memberDb(), 'p3-n', 'user-1', ['opt_0']));
  });
});

describe('AUCTION A2 — sealed bids (auction_lots/{lotId}/bids)', () => {
  const LOT = 'lot-a2-1';
  const FUTURE = 9999999999999;
  const PAST = 1000;
  const lotDoc = (over: Record<string, unknown> = {}) => ({
    workspaceId: 'ws-1',
    source: { kind: 'standalone', label: 'Brass lamps (12)' },
    lotClass: 'movables',
    title: 'Brass lamps, set of twelve',
    description: 'Store-room surplus',
    mediaRefs: [],
    reservePrice: 4000,
    valuationBasis: { kind: 'committee-estimate', figure: 4500, valuedOn: '2026-11-01' },
    sanction: null,
    leaseTermYears: null,
    status: 'open',
    history: { draft: { at: 1, by: 'admin-1' } },
    notice: { auctionAt: FUTURE, auctionPlace: 'Temple hall', emdAmount: 400, objectionDeadline: FUTURE, publishedAt: 1 },
    affixtures: [],
    objections: [],
    registrations: [
      { id: 'reg-1', name: 'Bidder One', phone: '9000000000', idReference: 'Aadhaar ****1234', relatedParty: false, emdAmount: 400, emdMode: 'cash', receivedAt: 1, bidderUid: 'user-1' },
      { id: 'reg-2', name: 'Bidder Two', phone: '9000000001', idReference: 'Aadhaar ****5678', relatedParty: false, emdAmount: 400, emdMode: 'cash', receivedAt: 1, bidderUid: 'user-2' },
    ],
    outcome: null,
    settlement: { depositAmount: 0, depositTxId: '', balanceTxId: '' },
    failReason: null,
    lotMode: 'sealed',
    bidderUids: ['user-1', 'user-2'],
    createdAt: 1,
    updatedAt: 1,
    ...over,
  });
  const bidDoc = (over: Record<string, unknown> = {}) => ({
    bidderUid: 'user-1', amount: 5000, createdAt: 1, updatedAt: 1, ...over,
  });
  const seedLot = async (over: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('auction_lots').doc(LOT).set(lotDoc(over));
    });
  };
  const seedBid = async (uid = 'user-1', over: Record<string, unknown> = {}) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('auction_lots').doc(LOT).collection('bids').doc(uid).set(bidDoc({ bidderUid: uid, ...over }));
    });
  };
  const staffDb = () => testEnv.authenticatedContext('admin-1').firestore();
  const acctDb = () => testEnv.authenticatedContext('acct-1').firestore();
  const bidderDb = () => testEnv.authenticatedContext('user-1').firestore();
  const bidder2Db = () => testEnv.authenticatedContext('user-2').firestore();
  const strangerDb = () => testEnv.authenticatedContext('user-9').firestore();
  const lotRef = (db: any) => db.collection('auction_lots').doc(LOT);
  const bidRef = (db: any, uid = 'user-1') => lotRef(db).collection('bids').doc(uid);

  it('187. Sealed birth: the mode is an enum, the bidder register is born empty, the A1 shape still births', async () => {
    const birth = { status: 'draft', notice: null, registrations: [], bidderUids: [] };
    await assertSucceeds(lotRef(staffDb()).set(lotDoc(birth)));
    await assertSucceeds(lotRef(staffDb()).set(lotDoc({ ...birth, lotMode: 'hall' })));
    await assertFails(lotRef(staffDb()).set(lotDoc({ ...birth, lotMode: 'secret' })));
    await assertFails(lotRef(staffDb()).set(lotDoc({ ...birth, bidderUids: ['user-1'] })));
    const legacy = lotDoc(birth) as Record<string, unknown>;
    delete legacy.lotMode; delete legacy.bidderUids;
    await assertSucceeds(lotRef(staffDb()).set(legacy));
  });

  it('188. The mode is frozen at launch and the bidder register only grows', async () => {
    await seedLot();
    await assertFails(lotRef(staffDb()).update({ lotMode: 'hall', updatedAt: 2 }));
    await assertSucceeds(lotRef(staffDb()).update({ bidderUids: ['user-1', 'user-2', 'user-9'], updatedAt: 2 }));
    await assertFails(lotRef(staffDb()).update({ bidderUids: ['user-1'], updatedAt: 3 }));
  });

  it('189. A registered bidder places a sealed bid inside the window — nobody else can', async () => {
    await seedLot();
    await assertSucceeds(bidRef(bidderDb()).set(bidDoc()));
    await assertFails(bidRef(strangerDb(), 'user-9').set(bidDoc({ bidderUid: 'user-9' })));
    await assertFails(bidRef(bidderDb(), 'user-2').set(bidDoc({ bidderUid: 'user-2' })));
    await assertFails(bidRef(bidder2Db(), 'user-2').set(bidDoc({ bidderUid: 'user-1' })));
    await assertFails(bidRef(bidderDb()).set(bidDoc({ amount: 0 })));
    await assertFails(bidRef(bidderDb()).set(bidDoc({ note: 'psst' })));
  });

  it('190. THE SEAL: before the close, not even the committee can read a bid — the bidder reads their own', async () => {
    await seedLot();
    await seedBid();
    await assertSucceeds(bidRef(bidderDb()).get());
    await assertFails(bidRef(staffDb()).get());
    await assertFails(bidRef(acctDb()).get());
    await assertFails(bidRef(bidder2Db()).get());
    await assertFails(bidRef(strangerDb()).get());
  });

  it('191. One live bid: the bidder may replace it inside the window — the bidder field itself never moves', async () => {
    await seedLot();
    await seedBid();
    await assertSucceeds(bidRef(bidderDb()).update({ amount: 6500, updatedAt: 2 }));
    await assertFails(bidRef(bidderDb()).update({ bidderUid: 'user-2', updatedAt: 3 }));
    await assertFails(bidRef(bidderDb()).update({ amount: -5, updatedAt: 3 }));
  });

  it('192. Withdrawal: the bidder may take their bid back inside the window', async () => {
    await seedLot();
    await seedBid();
    await assertFails(bidRef(bidder2Db()).delete());
    await assertSucceeds(bidRef(bidderDb()).delete());
  });

  it('193. THE OPENING: after the close the bids freeze and the committee may read them', async () => {
    await seedLot({ notice: { auctionAt: PAST, auctionPlace: 'Temple hall', emdAmount: 400, objectionDeadline: PAST, publishedAt: 1 } });
    await seedBid();
    await assertFails(bidRef(bidderDb()).update({ amount: 9000, updatedAt: 2 }));
    await assertFails(bidRef(bidderDb()).delete());
    await assertFails(bidRef(bidderDb(), 'user-1').set(bidDoc({ amount: 9000 })));
    await assertSucceeds(bidRef(staffDb()).get());
    await assertSucceeds(bidRef(acctDb()).get());
    await assertSucceeds(bidRef(bidderDb()).get());
    await assertFails(bidRef(strangerDb()).get());
    await assertFails(bidRef(bidder2Db()).get());
  });

  it('194. A hall lot takes no electronic bids at all', async () => {
    await seedLot({ lotMode: 'hall' });
    await assertFails(bidRef(bidderDb()).set(bidDoc()));
    const legacy = lotDoc() as Record<string, unknown>;
    delete legacy.lotMode;
    await seedLot(legacy as any);
    await assertFails(bidRef(bidderDb()).set(bidDoc()));
  });

  it('195. No window, no bid: before the lot opens and after the close has passed, creation is refused', async () => {
    await seedLot({ status: 'noticed' });
    await assertFails(bidRef(bidderDb()).set(bidDoc()));
    await seedLot({ notice: { auctionAt: PAST, auctionPlace: 'Temple hall', emdAmount: 400, objectionDeadline: PAST, publishedAt: 1 } });
    await assertFails(bidRef(bidderDb()).set(bidDoc()));
  });

  it('196. CONTROL: the A1 lifecycle is untouched — hall lots still move, delete still denied', async () => {
    const legacy = lotDoc({ status: 'draft', notice: null, registrations: [], bidderUids: [] }) as Record<string, unknown>;
    delete legacy.lotMode; delete legacy.bidderUids;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('auction_lots').doc(LOT).set(legacy);
    });
    await assertSucceeds(lotRef(staffDb()).update({ status: 'approved', updatedAt: 2 }));
    await assertFails(lotRef(staffDb()).delete());
    await seedLot();
    await assertFails(bidRef(staffDb()).delete());
  });
});
