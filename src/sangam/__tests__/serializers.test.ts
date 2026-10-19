import {
  toCloudPost,
  toCloudComment,
  toCloudFollow,
  toCloudCircle,
  toCloudEvent,
  toCloudReport,
} from '../serializers';
import type { SangamComment, SangamFollow, SangamCircle, SangamEvent, SangamReport } from '../types';

/**
 * serializers.test.ts — Audit Fix #1.
 * Every serializer must produce EXACTLY the fields its collection's
 * Firestore rules whitelist allows. Extra fields (id, localOnly, updatedAt…)
 * cause silent rejection; missing required fields break the write.
 */

// --- sangamPosts whitelist mirror (firestore.rules) ---
const POST_WHITELIST = [
  'authorUid', 'authorName', 'authorSanId', 'authorKind', 'authorRoleId', 'authorTier',
  'orgId', 'orgName', 'isOfficialPagePost', 'kind', 'text', 'imageUrl', 'shlokaRef',
  'seva', 'serviceCard', 'eventRef', 'sharedFrom', 'createdAt', 'ashirvadCount',
  'commentCount', 'shareCount', 'visibility', 'status',
  'providerUid', 'providerName', 'festival', 'anonymized',
];

const rawPost = {
  id: 'post_abc',
  authorUid: 'uid_1',
  authorName: 'Meera',
  authorSanId: 'SAN-001',
  authorKind: 'devotee',
  kind: 'text',
  text: 'Jai Shri Ram 🙏',
  createdAt: 1729000000000,
  ashirvadCount: 0,
  commentCount: 0,
  shareCount: 0,
  ashirvadBy: ['uid_2'],
  volunteers: [],
  visibility: 'public',
  status: 'active',
  localOnly: true,
};

describe('toCloudPost', () => {
  it('strips id, localOnly, ashirvadBy, volunteers', () => {
    const out = toCloudPost(rawPost);
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('localOnly');
    expect(out).not.toHaveProperty('ashirvadBy');
    expect(out).not.toHaveProperty('volunteers');
  });

  it('output keys are a subset of the rules whitelist', () => {
    const out = toCloudPost(rawPost);
    for (const k of Object.keys(out)) {
      expect(POST_WHITELIST).toContain(k);
    }
  });

  it('strips updatedAt even if injected (the pushDoc bug)', () => {
    const out = toCloudPost({ ...rawPost, updatedAt: 'server-timestamp-sentinel' });
    expect(out).not.toHaveProperty('updatedAt');
  });

  it('omits undefined optionals', () => {
    const out = toCloudPost({ ...rawPost, imageUrl: undefined, orgId: undefined });
    expect(out).not.toHaveProperty('imageUrl');
    expect(out).not.toHaveProperty('orgId');
  });

  it('keeps all whitelisted fields that are present', () => {
    const full = {
      ...rawPost,
      orgId: 'org_1', orgName: 'Temple', isOfficialPagePost: true,
      imageUrl: 'https://x/y.jpg', shlokaRef: 'BG 2.47',
      providerUid: 'p1', providerName: 'Panditji', festival: 'Diwali', anonymized: true,
    };
    const out = toCloudPost(full);
    expect(out.orgId).toBe('org_1');
    expect(out.providerUid).toBe('p1');
    expect(out.anonymized).toBe(true);
  });
});

describe('toCloudComment', () => {
  const raw: SangamComment = {
    id: 'cmt_1', postId: 'post_1', authorUid: 'uid_1', authorName: 'Meera',
    authorSanId: 'SAN-001', authorKind: 'devotee', text: 'Beautiful 🙏',
    createdAt: 1729000000000, localOnly: true,
  };

  it('produces exactly the 8 whitelisted fields', () => {
    const out = toCloudComment(raw);
    expect(Object.keys(out).sort()).toEqual(
      ['authorKind', 'authorName', 'authorSanId', 'authorUid', 'createdAt', 'postId', 'text'].sort(),
    );
  });

  it('includes authorTier when present, omits when absent', () => {
    expect(toCloudComment({ ...raw, authorTier: 'PLATFORM_VERIFIED' as never }).authorTier)
      .toBe('PLATFORM_VERIFIED');
    expect(toCloudComment(raw)).not.toHaveProperty('authorTier');
  });
});

describe('toCloudFollow', () => {
  const raw: SangamFollow = {
    id: 'uid1_org_o1', followerUid: 'uid1', targetType: 'org',
    targetId: 'o1', targetName: 'Temple', createdAt: 1729000000000,
  };

  it('strips id, keeps exactly the 5 whitelisted fields', () => {
    const out = toCloudFollow(raw);
    expect(Object.keys(out).sort()).toEqual(
      ['createdAt', 'followerUid', 'targetId', 'targetName', 'targetType'].sort(),
    );
  });
});

describe('toCloudCircle', () => {
  const raw: SangamCircle = {
    id: 'circle_1', name: 'Bhajan Circle', topic: 'bhajan',
    description: 'Weekly bhajans', creatorUid: 'uid_1', creatorName: 'Meera',
    memberCount: 1, members: ['uid_1'], createdAt: 1729000000000, localOnly: true,
  };

  it('strips id, members, localOnly', () => {
    const out = toCloudCircle(raw);
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('members');
    expect(out).not.toHaveProperty('localOnly');
    expect(Object.keys(out).sort()).toEqual(
      ['createdAt', 'creatorName', 'creatorUid', 'description', 'memberCount', 'name', 'topic'].sort(),
    );
  });
});

describe('toCloudEvent', () => {
  const raw: SangamEvent = {
    id: 'event_1', title: 'Diwali Utsav', kind: 'utsav',
    description: 'Grand celebration', venue: 'Main hall',
    startsAt: 1729000000000, endsAt: 1729003600000,
    orgId: 'o1', orgName: 'Temple', isOfficial: true,
    creatorUid: 'uid_1', creatorName: 'Meera', rsvpCount: 0,
    rsvps: [], createdAt: 1729000000000, localOnly: true,
  };

  it('strips id, rsvps, localOnly', () => {
    const out = toCloudEvent(raw);
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('rsvps');
    expect(out).not.toHaveProperty('localOnly');
  });

  it('output keys are a subset of the rules whitelist', () => {
    const whitelist = ['title', 'kind', 'description', 'venue', 'startsAt', 'endsAt',
      'orgId', 'orgName', 'isOfficial', 'creatorUid', 'creatorName', 'rsvpCount', 'createdAt'];
    const out = toCloudEvent(raw);
    for (const k of Object.keys(out)) {
      expect(whitelist).toContain(k);
    }
  });

  it('strips undefined optionals (endsAt, orgId)', () => {
    const minimal = { ...raw, endsAt: undefined, orgId: undefined, orgName: undefined };
    const out = toCloudEvent(minimal);
    expect(out).not.toHaveProperty('endsAt');
    expect(out).not.toHaveProperty('orgId');
    expect(out.title).toBe('Diwali Utsav');
  });
});

describe('toCloudReport', () => {
  const raw: SangamReport = {
    id: 'report_1', reporterUid: 'uid_1', reporterName: 'Meera',
    targetType: 'post', targetId: 'post_9', reason: 'spam',
    details: 'Looks automated', status: 'open', createdAt: 1729000000000,
  };

  it('strips id, keeps exactly the 8 whitelisted fields', () => {
    const out = toCloudReport(raw);
    expect(out).not.toHaveProperty('id');
    expect(Object.keys(out).sort()).toEqual(
      ['createdAt', 'details', 'reason', 'reporterName', 'reporterUid', 'status', 'targetId', 'targetType'].sort(),
    );
  });

  it('strips undefined details (Firestore rejects undefined)', () => {
    const noDetails = { ...raw, details: undefined };
    const out = toCloudReport(noDetails);
    expect(out).not.toHaveProperty('details');
    expect(out.status).toBe('open');
  });
});

describe('edge cases', () => {
  it('empty input → empty output (no crash, no phantom fields)', () => {
    expect(toCloudPost({})).toEqual({});
    expect(toCloudFollow({} as never)).toEqual({});
  });

  it('preserves nested objects (seva, serviceCard, sharedFrom) by reference shape', () => {
    const sharedFrom = { postId: 'p9', authorName: 'Meera', authorSanId: 'SAN-1' };
    const out = toCloudPost({ ...rawPost, sharedFrom, kind: 'share', text: 'Shared 🙏' });
    expect(out.sharedFrom).toEqual(sharedFrom);
    expect(out.kind).toBe('share');
  });

  it('share posts carry sharedFrom through the serializer', () => {
    // sharePost() builds a full SangamPost then serializes — sharedFrom must survive.
    const shared = {
      ...rawPost,
      kind: 'share',
      text: 'Shared with reverence 🙏',
      sharedFrom: { postId: 'orig_1', authorName: 'Arjun', authorSanId: 'SAN-2' },
    };
    const out = toCloudPost(shared);
    expect(out.sharedFrom).toEqual({ postId: 'orig_1', authorName: 'Arjun', authorSanId: 'SAN-2' });
    expect(out).not.toHaveProperty('ashirvadBy');
  });

  it('does not mutate the input object', () => {
    const input = { ...rawPost };
    toCloudPost(input);
    expect(input).toHaveProperty('id', 'post_abc');
    expect(input).toHaveProperty('localOnly', true);
  });
});

describe('gratitude + consultation posts (sangamPosts kind variants)', () => {
  it('gratitude fields are all whitelisted (no id spread)', () => {
    // Mirrors gratitudePost() output shape — must not include `id`.
    const fields = {
      authorUid: 'u1', authorName: 'Meera', authorSanId: 'SAN-1',
      authorKind: 'devotee', isOfficialPagePost: false, kind: 'gratitude',
      text: '🙏 Thank you', providerUid: 'p1', providerName: 'Panditji',
      createdAt: 1, ashirvadCount: 0, commentCount: 0, shareCount: 0,
      visibility: 'public', status: 'active',
    };
    const out = toCloudPost(fields);
    expect(out).not.toHaveProperty('id');
    expect(out.kind).toBe('gratitude');
    for (const k of Object.keys(out)) expect(POST_WHITELIST).toContain(k);
  });

  it('consultation answer fields are all whitelisted (no id spread)', () => {
    const fields = {
      authorUid: 'u1', authorName: 'Jyotishji', authorSanId: 'SAN-2',
      authorKind: 'jyotish', authorRoleId: 'jyo_1', authorTier: 'REGISTERED',
      isOfficialPagePost: false, kind: 'consultation_answer',
      text: 'A devotee asked…', anonymized: true,
      createdAt: 1, ashirvadCount: 0, commentCount: 0, shareCount: 0,
      visibility: 'public', status: 'active',
    };
    const out = toCloudPost(fields);
    expect(out).not.toHaveProperty('id');
    expect(out.authorTier).toBe('REGISTERED');
    for (const k of Object.keys(out)) expect(POST_WHITELIST).toContain(k);
  });
});
