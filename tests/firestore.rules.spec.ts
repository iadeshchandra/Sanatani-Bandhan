
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';

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
