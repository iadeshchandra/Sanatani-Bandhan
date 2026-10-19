import {
  emptyProfile, validateBio, toDevoteeProfile, profileDoc,
} from '../types';

describe('devotee profile types', () => {
  test('emptyProfile has safe defaults', () => {
    const p = emptyProfile('uid1');
    expect(p.uid).toBe('uid1');
    expect(p.isPublic).toBe(true);
    expect(p.followerCount).toBe(0);
  });

  test('validateBio rejects overlong bios', () => {
    expect(validateBio('x'.repeat(161))).toBe('bio_too_long');
    expect(validateBio('x'.repeat(160))).toBeNull();
    expect(validateBio('')).toBeNull();
  });

  test('toDevoteeProfile sanitizes hostile input', () => {
    const p = toDevoteeProfile('u1', {
      displayName: 'x'.repeat(200),
      sanId: 'SAN-123',
      followerCount: -5,
      followingCount: 'nope',
      isPublic: 'yes',
      bio: 123,
    });
    expect(p.displayName.length).toBeLessThanOrEqual(80);
    expect(p.followerCount).toBe(0);
    expect(p.followingCount).toBe(0);
    expect(p.isPublic).toBe(true); // 'yes' !== false → true
    expect(p.bio).toBeUndefined();
  });

  test('toDevoteeProfile handles empty data', () => {
    const p = toDevoteeProfile('u1', {});
    expect(p.displayName).toBe('');
    expect(p.isPublic).toBe(true);
  });

  test('profileDoc truncates and strips empties', () => {
    const d = profileDoc({
      uid: 'u1',
      displayName: 'A'.repeat(100),
      sanId: 'SAN-1',
      bio: '  hello  ',
      isPublic: false,
    }) as Record<string, unknown>;
    expect((d.displayName as string).length).toBe(80);
    expect(d.bio).toBe('hello');
    expect(d.isPublic).toBe(false);
    expect(d.avatarUrl).toBeUndefined();
    expect(d.uid).toBe('u1');
  });

  test('profileDoc includes avatarUrl when provided', () => {
    const d = profileDoc({
      uid: 'u1', displayName: 'A', sanId: 'SAN-1', avatarUrl: 'https://x/y.png', isPublic: true,
    }) as Record<string, unknown>;
    expect(d.avatarUrl).toBe('https://x/y.png');
  });

  test('profileDoc always sets updatedAt', () => {
    const before = Date.now();
    const d = profileDoc({ uid: 'u1', displayName: 'A', sanId: 'SAN-1', isPublic: true }) as Record<string, unknown>;
    expect(typeof d.updatedAt).toBe('number');
    expect((d.updatedAt as number)).toBeGreaterThanOrEqual(before);
  });

  test('no PII fields leak into profile doc keys', () => {
    const d = profileDoc({ uid: 'u1', displayName: 'A', sanId: 'SAN-1', isPublic: true });
    const keys = Object.keys(d);
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('phone');
  });

  test('bio whitespace-only is treated as empty', () => {
    const d = profileDoc({ uid: 'u1', displayName: 'A', sanId: 'SAN-1', bio: '   ', isPublic: true }) as Record<string, unknown>;
    expect(d.bio).toBeUndefined();
  });

  test('toDevoteeProfile preserves avatarUrl', () => {
    const p = toDevoteeProfile('u1', { avatarUrl: 'https://x/a.png', displayName: 'A', sanId: 'S1' });
    expect(p.avatarUrl).toBe('https://x/a.png');
  });

  test('toDevoteeProfile defaults isPublic true when missing', () => {
    const p = toDevoteeProfile('u1', { displayName: 'A' });
    expect(p.isPublic).toBe(true);
  });

  test('toDevoteeProfile respects isPublic false', () => {
    const p = toDevoteeProfile('u1', { displayName: 'A', isPublic: false });
    expect(p.isPublic).toBe(false);
  });

  test('validateBio allows exactly 160 chars', () => {
    expect(validateBio('x'.repeat(160))).toBeNull();
  });

  test('emptyProfile uid is preserved', () => {
    expect(emptyProfile('abc').uid).toBe('abc');
  });

  test('profileDoc bio trimmed before length check', () => {
    const d = profileDoc({ uid: 'u1', displayName: 'A', sanId: 'S1', bio: '  hi  ', isPublic: true }) as Record<string, unknown>;
    expect(d.bio).toBe('hi');
  });
});
