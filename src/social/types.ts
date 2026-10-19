/**
 * social/types.ts — devotee public profile model.
 * ====================================================================
 * Privacy law: `users/{uid}` is self-read-only by Firestore rules, so a
 * public devotee profile can NEVER read it. Everything shown here comes
 * from (a) the public `devoteeProfiles/{uid}` doc the user controls, or
 * (b) denormalized author fields on their public sangamPosts.
 */

export interface DevoteeProfile {
  uid: string;
  displayName: string;
  sanId: string; // SAN-XXXXXX
  avatarUrl?: string;
  bio?: string;
  /** If false, the profile shows only the "quiet presence" card. Default true. */
  isPublic: boolean;
  followerCount: number;
  followingCount: number;
  updatedAt: number;
}

export interface FollowDoc {
  followerUid: string;
  targetUid: string;
  createdAt: number;
}

export const emptyProfile = (uid: string): DevoteeProfile => ({
  uid,
  displayName: '',
  sanId: '',
  isPublic: true,
  followerCount: 0,
  followingCount: 0,
  updatedAt: Date.now(),
});

/** Validate a bio before write. Returns an error string or null. */
export function validateBio(bio: string): string | null {
  const t = bio.trim();
  if (t.length > 160) return 'bio_too_long';
  return null;
}

/** Sanitize a profile doc read from Firestore. */
export function toDevoteeProfile(uid: string, data: Record<string, unknown>): DevoteeProfile {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName.slice(0, 80) : '',
    sanId: typeof data.sanId === 'string' ? data.sanId.slice(0, 20) : '',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl.slice(0, 500) : undefined,
    bio: typeof data.bio === 'string' ? data.bio.slice(0, 160) : undefined,
    isPublic: data.isPublic !== false,
    followerCount: typeof data.followerCount === 'number' && data.followerCount >= 0 ? Math.floor(data.followerCount) : 0,
    followingCount: typeof data.followingCount === 'number' && data.followingCount >= 0 ? Math.floor(data.followingCount) : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

/** Build the payload for creating/updating one's own profile doc. */
export function profileDoc(input: {
  uid: string;
  displayName: string;
  sanId: string;
  avatarUrl?: string;
  bio?: string;
  isPublic: boolean;
}): Record<string, unknown> {
  return {
    uid: input.uid,
    displayName: input.displayName.slice(0, 80),
    sanId: input.sanId.slice(0, 20),
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl.slice(0, 500) } : {}),
    ...(input.bio && input.bio.trim() ? { bio: input.bio.trim().slice(0, 160) } : {}),
    isPublic: input.isPublic,
    updatedAt: Date.now(),
  };
}
