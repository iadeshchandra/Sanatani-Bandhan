/**
 * googleAuth.test.ts — Google sign-in helper tests (Membership sprint).
 * Mocks firebase/auth + firestore: no emulator, no network.
 */
import { signInWithGoogle, googleErrorMessage } from '../lib/googleAuth';

jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args: any[]) => ({ path: args.join('/') })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'TS'),
}));

// Point ../firebase at the mocks (avoid initializing a real app).
jest.mock('../firebase', () => ({
  auth: { currentUser: null },
  googleProvider: { providerId: 'google.com' },
  db: {},
}));

const { signInWithPopup } = require('firebase/auth');
const { getDoc, setDoc } = require('firebase/firestore');

describe('googleErrorMessage', () => {
  it('maps popup-closed to a friendly message', () => {
    expect(googleErrorMessage({ code: 'auth/popup-closed-by-user' })).toMatch(/closed/i);
  });
  it('maps popup-blocked to a friendly message', () => {
    expect(googleErrorMessage({ code: 'auth/popup-blocked' })).toMatch(/blocked/i);
  });
  it('maps account-exists-with-different-credential', () => {
    expect(googleErrorMessage({ code: 'auth/account-exists-with-different-credential' }))
      .toMatch(/different sign-in method/i);
  });
  it('maps operation-not-allowed (console toggle needed)', () => {
    expect(googleErrorMessage({ code: 'auth/operation-not-allowed' })).toMatch(/not switched on/i);
  });
  it('falls back to the raw message', () => {
    expect(googleErrorMessage({ message: 'Firebase: boom' })).toBe('boom');
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an identity-only users doc for a new user (NEVER a role)', async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: 'g-uid-1', email: 'new@example.com', displayName: 'New Devotee', photoURL: 'http://pic' },
    });
    getDoc.mockResolvedValue({ exists: () => false });

    const result = await signInWithGoogle();

    expect(result.isNewUser).toBe(true);
    expect(result.uid).toBe('g-uid-1');
    expect(setDoc).toHaveBeenCalledTimes(1);
    const written = setDoc.mock.calls[0][1];
    // H-11: identity fields only — no role / workspaceId / privilege keys.
    expect(written).not.toHaveProperty('role');
    expect(written).not.toHaveProperty('workspaceId');
    expect(written).not.toHaveProperty('membership');
    expect(written).toHaveProperty('uid', 'g-uid-1');
    expect(written).toHaveProperty('provider', 'google');
  });

  it('does not rewrite the users doc for a returning user', async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: 'g-uid-2', email: 'old@example.com', displayName: 'Old', photoURL: '' },
    });
    getDoc.mockResolvedValue({ exists: () => true });

    const result = await signInWithGoogle();

    expect(result.isNewUser).toBe(false);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('warns about the console toggle on operation-not-allowed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    signInWithPopup.mockRejectedValue({ code: 'auth/operation-not-allowed' });
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'auth/operation-not-allowed' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Firebase Console'));
    warn.mockRestore();
  });
});
