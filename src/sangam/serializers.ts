import type { SangamComment, SangamFollow, SangamCircle, SangamEvent, SangamReport } from './types';

/**
 * sangam/serializers.ts — whitelist-exact Firestore serializers (Audit Fix #1).
 * ============================================================================
 * ROOT CAUSE: Firestore rules use `keys().hasOnly([...])` on every create.
 * Any extra field — `id`, `localOnly`, `ashirvadBy`, `members`, `rsvps`,
 * `updatedAt` (injected by pushDoc) — causes silent rejection. The fail-open
 * design then masks it: content stays `localOnly` forever.
 *
 * LAW: every writer MUST route through these serializers. Each produces
 * EXACTLY the fields its collection's rules whitelist allows — nothing more,
 * nothing less. Undefined optionals are stripped (Firestore rejects undefined).
 */

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * sangamPosts create whitelist (mirrors firestore.rules exactly):
 * authorUid, authorName, authorSanId, authorKind, authorRoleId, authorTier,
 * orgId, orgName, isOfficialPagePost, kind, text, imageUrl, shlokaRef,
 * seva, serviceCard, eventRef, sharedFrom, createdAt, ashirvadCount,
 * commentCount, shareCount, visibility, status,
 * providerUid, providerName, festival, anonymized
 */
export function toCloudPost(p: Record<string, unknown>): Record<string, unknown> {
  const allowed = [
    'authorUid', 'authorName', 'authorSanId', 'authorKind', 'authorRoleId', 'authorTier',
    'orgId', 'orgName', 'isOfficialPagePost', 'kind', 'text', 'imageUrl', 'shlokaRef',
    'seva', 'serviceCard', 'eventRef', 'sharedFrom', 'createdAt', 'ashirvadCount',
    'commentCount', 'shareCount', 'visibility', 'status',
    'providerUid', 'providerName', 'festival', 'anonymized',
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}

/**
 * sangamComments create whitelist:
 * postId, authorUid, authorName, authorSanId, authorKind, authorTier, text, createdAt
 */
export function toCloudComment(c: SangamComment): Record<string, string | number> {
  const out: Record<string, string | number> = {
    postId: c.postId,
    authorUid: c.authorUid,
    authorName: c.authorName,
    authorSanId: c.authorSanId,
    authorKind: c.authorKind,
    text: c.text,
    createdAt: c.createdAt,
  };
  if (c.authorTier !== undefined) out.authorTier = c.authorTier;
  return out;
}

/**
 * sangamFollows create whitelist:
 * followerUid, targetType, targetId, targetName, createdAt
 */
export function toCloudFollow(f: SangamFollow): Record<string, unknown> {
  return stripUndefined({
    followerUid: f.followerUid,
    targetType: f.targetType,
    targetId: f.targetId,
    targetName: f.targetName,
    createdAt: f.createdAt,
  });
}

/**
 * sangamCircles create whitelist:
 * name, topic, description, creatorUid, creatorName, memberCount, createdAt
 */
export function toCloudCircle(c: SangamCircle): Record<string, unknown> {
  return stripUndefined({
    name: c.name,
    topic: c.topic,
    description: c.description,
    creatorUid: c.creatorUid,
    creatorName: c.creatorName,
    memberCount: c.memberCount,
    createdAt: c.createdAt,
  });
}

/**
 * sangamEvents create whitelist:
 * title, kind, description, venue, startsAt, endsAt, orgId, orgName,
 * isOfficial, creatorUid, creatorName, rsvpCount, createdAt
 */
export function toCloudEvent(e: SangamEvent): Record<string, unknown> {
  return stripUndefined({
    title: e.title,
    kind: e.kind,
    description: e.description,
    venue: e.venue,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    orgId: e.orgId,
    orgName: e.orgName,
    isOfficial: e.isOfficial,
    creatorUid: e.creatorUid,
    creatorName: e.creatorName,
    rsvpCount: e.rsvpCount,
    createdAt: e.createdAt,
  });
}

/**
 * sangamReports create whitelist:
 * reporterUid, reporterName, targetType, targetId, reason, details, status, createdAt
 */
export function toCloudReport(r: SangamReport): Record<string, unknown> {
  return stripUndefined({
    reporterUid: r.reporterUid,
    reporterName: r.reporterName,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
  });
}
