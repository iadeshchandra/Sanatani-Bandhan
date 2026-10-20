/**
 * platformAdminsGate.test.ts — the GodMode unlock resolution at the
 * service boundary (QUEUED #42).
 *
 * Pins the three properties the live incident violated:
 *   1. The owner resolves WITHOUT the registry ever being read — an
 *      empty, unreadable, or deleted platformAdmins collection cannot
 *      lock the owner out (getDoc must not even be called).
 *   2. Every refusal carries a distinct reason (no-grant / revoked /
 *      malformed / lookup-failed / signed-out) so the gate can say WHY
 *      in plain words instead of failing silently.
 *   3. The legacy resolveRoleForUser wrapper still returns exactly the
 *      role (owner / delegated / null) existing callers expect.
 *
 * Firestore + firestoreAdmin are stubbed in the repo's usual jest.mock
 * style; the owner allowlist (pure) runs for real.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ __col: name })),
  doc: jest.fn((_db: unknown, name: string, id: string) => ({ __doc: `${name}/${id}` })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'audit-1' })),
  serverTimestamp: jest.fn(() => 'ts'),
}));

jest.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

// Faithful stand-in for the canonical owner constants (firestoreAdmin.ts):
// the same UID/email and the same isOwnerUid semantics.
jest.mock('../firestoreAdmin', () => {
  const OWNER_UID = 'sxIGHmvpYUTqPnpI1bLFT1O1cA62';
  return {
    OWNER_UID,
    OWNER_EMAIL: 'iadeshchandra@gmail.com',
    isOwnerUid: (uid?: string | null) => !!uid && uid === OWNER_UID,
  };
});

import { getDoc } from 'firebase/firestore';
import { resolveRoleForUser, resolveRoleForUserDetailed } from '../platformAdmins';

const getDocMock = getDoc as unknown as jest.Mock;

const OWNER_UID = 'sxIGHmvpYUTqPnpI1bLFT1O1cA62';
const OWNER_EMAIL = 'iadeshchandra@gmail.com';
const ADMIN_UID = 'delegated-admin-uid';

function snapOf(data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    data: () => data ?? {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getDocMock.mockReset();
});

describe('owner — fail-safe, registry never consulted', () => {
  it('owner UID resolves to owner even if the registry read would explode', async () => {
    getDocMock.mockRejectedValue(new Error('permission-denied'));
    await expect(resolveRoleForUserDetailed(OWNER_UID, OWNER_EMAIL))
      .resolves.toEqual({ role: 'owner', reason: 'owner' });
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('owner UID resolves with no email at all and an empty registry', async () => {
    getDocMock.mockResolvedValue(snapOf(null));
    await expect(resolveRoleForUserDetailed(OWNER_UID, null))
      .resolves.toEqual({ role: 'owner', reason: 'owner' });
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('owner email alone (different uid) still resolves to owner', async () => {
    getDocMock.mockResolvedValue(snapOf(null));
    await expect(resolveRoleForUserDetailed('some-other-uid', OWNER_EMAIL))
      .resolves.toEqual({ role: 'owner', reason: 'owner' });
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('legacy wrapper: owner resolves to the plain role', async () => {
    getDocMock.mockRejectedValue(new Error('offline'));
    await expect(resolveRoleForUser(OWNER_UID, null)).resolves.toBe('owner');
  });
});

describe('delegated resolution — distinct, explainable refusals', () => {
  it('no registry doc → no-grant', async () => {
    getDocMock.mockResolvedValue(snapOf(null));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'admin@example.org'))
      .resolves.toEqual({ role: null, reason: 'no-grant' });
  });

  it('active admin grant → admin / grant', async () => {
    getDocMock.mockResolvedValue(snapOf({ role: 'admin', active: true }));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'admin@example.org'))
      .resolves.toEqual({ role: 'admin', reason: 'grant' });
  });

  it('moderator grant with active missing → moderator / grant', async () => {
    getDocMock.mockResolvedValue(snapOf({ role: 'moderator' }));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'mod@example.org'))
      .resolves.toEqual({ role: 'moderator', reason: 'grant' });
  });

  it('revoked grant → revoked', async () => {
    getDocMock.mockResolvedValue(snapOf({ role: 'admin', active: false }));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'admin@example.org'))
      .resolves.toEqual({ role: null, reason: 'revoked' });
  });

  it('malformed grant (role claims owner) → malformed, never owner', async () => {
    getDocMock.mockResolvedValue(snapOf({ role: 'owner', active: true }));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'admin@example.org'))
      .resolves.toEqual({ role: null, reason: 'malformed' });
  });

  it('registry read failure → lookup-failed, distinct from no-grant', async () => {
    getDocMock.mockRejectedValue(new Error('permission-denied'));
    await expect(resolveRoleForUserDetailed(ADMIN_UID, 'admin@example.org'))
      .resolves.toEqual({ role: null, reason: 'lookup-failed' });
  });

  it('no signed-in user → signed-out, registry untouched', async () => {
    await expect(resolveRoleForUserDetailed(null, null))
      .resolves.toEqual({ role: null, reason: 'signed-out' });
    await expect(resolveRoleForUserDetailed(undefined, undefined))
      .resolves.toEqual({ role: null, reason: 'signed-out' });
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('legacy wrapper: delegated paths unchanged', async () => {
    getDocMock.mockResolvedValue(snapOf({ role: 'admin', active: true }));
    await expect(resolveRoleForUser(ADMIN_UID, 'admin@example.org')).resolves.toBe('admin');
    getDocMock.mockResolvedValue(snapOf(null));
    await expect(resolveRoleForUser(ADMIN_UID, 'admin@example.org')).resolves.toBeNull();
    getDocMock.mockRejectedValue(new Error('offline'));
    await expect(resolveRoleForUser(ADMIN_UID, 'admin@example.org')).resolves.toBeNull();
  });
});
