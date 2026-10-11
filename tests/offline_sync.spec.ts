const mockAddDoc = jest.fn(() => Promise.resolve({ id: 'mock-doc-1' }));
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockSetDoc = jest.fn(() => Promise.resolve());

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db: any, name: string) => ({ db, name })),
  doc: jest.fn((db: any, ...pathSegments: string[]) => ({ db, path: pathSegments.join('/') })),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  serverTimestamp: jest.fn(() => 'MOCK_SERVER_TIMESTAMP'),
  increment: jest.fn((val: number) => ({ _increment: val })),
  arrayUnion: jest.fn((val: any) => ({ _arrayUnion: val }))
}));

let mockCurrentUser: { uid: string } | null = { uid: 'user-1' };

jest.mock('../src/firebase', () => ({
  db: { _type: 'MOCK_DB' },
  auth: {
    get currentUser() {
      return mockCurrentUser;
    }
  }
}));

import { OfflineSyncManager, QueuedAction } from '../src/services/OfflineSyncManager';

describe('OfflineSyncManager Tenant Context & Session Isolation', () => {
  let store: Record<string, string> = {};
  let mockOnLine = true;

  beforeAll(() => {
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
      },
      writable: true
    });

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      get: () => mockOnLine,
      set: (val: boolean) => { mockOnLine = val; },
      configurable: true
    });

    // Mock window & CustomEvent
    Object.defineProperty(global, 'window', {
      value: {
        dispatchEvent: () => true,
        addEventListener: () => {}
      },
      writable: true
    });
    (global as any).CustomEvent = class CustomEvent {
      name: string;
      detail: any;
      constructor(name: string, opts?: any) {
        this.name = name;
        this.detail = opts?.detail;
      }
    };
  });

  beforeEach(() => {
    store = {};
    mockCurrentUser = { uid: 'user-1' };
    mockOnLine = true;
    mockAddDoc.mockClear();
    mockUpdateDoc.mockClear();
    mockSetDoc.mockClear();
  });

  it('1. Captures and retains immutable tenant communityId at queue creation time', () => {
    // Queuing an action in Workspace 1
    OfflineSyncManager.addToQueue('RICH_SOS', {
      senderId: 'user-1',
      senderName: 'Devotee 1',
      communityId: 'ws-1',
      text: 'Emergency SOS'
    });

    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(1);
    const item = queue[0];
    expect(item.communityId).toBe('ws-1');
    expect(item.payload.communityId).toBe('ws-1');
    expect(item.authorUid).toBe('user-1');
    expect(item.status).toBe('PENDING');
  });

  it('2. Switching active workspace does not alter already queued action tenant context', () => {
    // Queue action in Workspace A
    OfflineSyncManager.addToQueue('MESSAGE', {
      senderId: 'user-1',
      senderName: 'Devotee 1',
      communityId: 'ws-1',
      text: 'Message in ws-1'
    });

    // Simulate switching local workspace to Workspace B by queuing another action for ws-2
    OfflineSyncManager.addToQueue('MESSAGE', {
      senderId: 'user-1',
      senderName: 'Devotee 1',
      communityId: 'ws-2',
      text: 'Message in ws-2'
    });

    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(2);
    // First action must remain strictly bound to ws-1
    expect(queue[0].communityId).toBe('ws-1');
    expect(queue[0].payload.communityId).toBe('ws-1');
    // Second action must be bound to ws-2
    expect(queue[1].communityId).toBe('ws-2');
    expect(queue[1].payload.communityId).toBe('ws-2');
  });

  it('3. Supports all Yatra action types with tenant context binding', () => {
    const actionTypes: QueuedAction['type'][] = [
      'SOS',
      'MESSAGE',
      'LOCATION',
      'RICH_SOS',
      'DIRECT_MESSAGE',
      'RESPOND_SOS',
      'FORWARD_SOS',
      'RESOLVE_SOS'
    ];

    actionTypes.forEach((type, idx) => {
      OfflineSyncManager.addToQueue(type, {
        senderId: 'user-1',
        communityId: `ws-${idx}`,
        sosId: `sos-${idx}`,
        text: `Action ${type}`
      });
    });

    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(actionTypes.length);
    actionTypes.forEach((type, idx) => {
      expect(queue[idx].type).toBe(type);
      expect(queue[idx].communityId).toBe(`ws-${idx}`);
      expect(queue[idx].payload.communityId).toBe(`ws-${idx}`);
    });
  });

  it('4. Queued actions retain author UID across offline lifecycle', () => {
    OfflineSyncManager.addToQueue('RESPOND_SOS', {
      sosId: 'sos-123',
      responderId: 'responder-456',
      responderName: 'Responder Devotee',
      communityId: 'ws-1'
    });

    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].authorUid).toBe('user-1');
    expect(queue[0].communityId).toBe('ws-1');
  });

  it('5. Replay flushQueue() preserves Workspace A communityId and does NOT use Workspace B', async () => {
    // 1. Queue action under Workspace A while offline
    mockOnLine = false;
    OfflineSyncManager.addToQueue('RICH_SOS', {
      senderId: 'user-1',
      senderName: 'Devotee 1',
      communityId: 'ws-1',
      text: 'Emergency in ws-1'
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
    const queueBefore = OfflineSyncManager.getQueue();
    expect(queueBefore.length).toBe(1);
    expect(queueBefore[0].communityId).toBe('ws-1');

    // 2. Simulate switching local context/workspace to Workspace B
    // and network coming back online
    mockOnLine = true;

    // 3. Call flushQueue()
    await OfflineSyncManager.flushQueue();

    // 4. Verify Firestore write payload still contains Workspace A's communityId
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [collectionRef, writtenDoc] = mockAddDoc.mock.calls[0];
    expect(collectionRef.name).toBe('yatra_broadcasts');
    expect(writtenDoc.communityId).toBe('ws-1');
    // 5. Verify it does NOT use Workspace B
    expect(writtenDoc.communityId).not.toBe('ws-2');
    expect(writtenDoc.type).toBe('RICH_SOS');
    expect(writtenDoc.text).toBe('Emergency in ws-1');

    // Verify queue is cleaned up
    expect(OfflineSyncManager.getQueue().length).toBe(0);
  });

  it('6. Replay flushQueue() prevents replay if user session is logged out', async () => {
    // Queue action under user-1 in ws-1 while offline
    mockOnLine = false;
    OfflineSyncManager.addToQueue('MESSAGE', {
      senderId: 'user-1',
      senderName: 'Devotee 1',
      communityId: 'ws-1',
      text: 'Offline message'
    });

    // User logs out before reconnection
    mockCurrentUser = null;
    mockOnLine = true;

    // Call flushQueue()
    await OfflineSyncManager.flushQueue();

    // Replay MUST be rejected because auth.currentUser is null
    expect(mockAddDoc).not.toHaveBeenCalled();
    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('PENDING');
    expect(queue[0].authorUid).toBe('user-1');
  });

  it('7. Replay flushQueue() prevents cross-user attribution when different user is logged in', async () => {
    // Action queued by user-1 in ws-1
    mockOnLine = false;
    OfflineSyncManager.addToQueue('LOCATION', {
      senderId: 'user-1',
      communityId: 'ws-1',
      lat: 27.1,
      lng: 78.0
    });

    // Different user (user-2 in ws-2) logs in on shared device
    mockCurrentUser = { uid: 'user-2' };
    mockOnLine = true;

    // Call flushQueue()
    await OfflineSyncManager.flushQueue();

    // Replay MUST NOT attribute user-1's action to user-2
    expect(mockAddDoc).not.toHaveBeenCalled();
    const queue = OfflineSyncManager.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('PENDING');
    expect(queue[0].authorUid).toBe('user-1');
  });

  it('8. Replay flushQueue() succeeds once original author session is restored', async () => {
    // Action queued by user-1 in ws-1
    mockOnLine = false;
    OfflineSyncManager.addToQueue('SOS', {
      senderId: 'user-1',
      communityId: 'ws-1',
      text: 'Pending user-1 SOS'
    });

    // Original author user-1 is logged in and network returns
    mockCurrentUser = { uid: 'user-1' };
    mockOnLine = true;

    await OfflineSyncManager.flushQueue();

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, writtenDoc] = mockAddDoc.mock.calls[0];
    expect(writtenDoc.communityId).toBe('ws-1');
    expect(writtenDoc.type).toBe('SOS');
    expect(OfflineSyncManager.getQueue().length).toBe(0);
  });

  it('9. Replay flushQueue() updates Yatra SOS statuses without tampering with communityId', async () => {
    mockOnLine = false;
    OfflineSyncManager.addToQueue('RESPOND_SOS', {
      sosId: 'sos-777',
      responderId: 'user-1',
      responderName: 'Devotee Helper',
      communityId: 'ws-1'
    });
    OfflineSyncManager.addToQueue('FORWARD_SOS', {
      sosId: 'sos-777',
      forwarderId: 'user-1',
      communityId: 'ws-1'
    });
    OfflineSyncManager.addToQueue('RESOLVE_SOS', {
      sosId: 'sos-777',
      resolverId: 'user-1',
      resolverName: 'Marshal Lead',
      communityId: 'ws-1'
    });

    mockOnLine = true;
    await OfflineSyncManager.flushQueue();

    expect(mockUpdateDoc).toHaveBeenCalledTimes(3);

    // 1. RESPOND_SOS
    const [docRef1, updateData1] = mockUpdateDoc.mock.calls[0];
    expect(docRef1.path).toBe('yatra_broadcasts/sos-777');
    expect(updateData1.sosStatus).toBe('RESPONDED');
    expect(updateData1.responderId).toBe('user-1');

    // 2. FORWARD_SOS
    const [docRef2, updateData2] = mockUpdateDoc.mock.calls[1];
    expect(docRef2.path).toBe('yatra_broadcasts/sos-777');
    expect(updateData2.forwardCount).toEqual({ _increment: 1 });

    // 3. RESOLVE_SOS
    const [docRef3, updateData3] = mockUpdateDoc.mock.calls[2];
    expect(docRef3.path).toBe('yatra_broadcasts/sos-777');
    expect(updateData3.sosStatus).toBe('RESOLVED');
    expect(updateData3.resolverId).toBe('user-1');

    expect(OfflineSyncManager.getQueue().length).toBe(0);
  });
});
