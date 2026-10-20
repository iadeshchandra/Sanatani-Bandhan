/**
 * sangam/providerCards.ts — A provider's Seva Bazar notices, read directly.
 * =====================================================================
 * QUEUED #22 (silo reconciliation): service cards live in sangamPosts,
 * marketplace gigs in marketplaceGigs — two listing silos for the same
 * provider. The unified profile (/seva/pro/:uid) is the hub where both
 * meet; this module is its cards-side read path. Until now the only way
 * to see a provider's cards was to already be scrolling the feed.
 *
 * Read-only. sangamPosts is world-readable; the query is a single-field
 * authorUid lookup (no composite index), with kind/status/provider
 * filtering + sorting done here — the same effective-provider rule the
 * feed uses (`serviceCard.providerUid || authorUid`).
 */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { SangamPost, ServiceCardDetails } from './types';

/** The provider a card belongs to (mirrors serviceCard.ts). */
export function cardProviderUid(post: Pick<SangamPost, 'authorUid' | 'serviceCard'>): string {
  return post.serviceCard?.providerUid || post.authorUid || '';
}

function toMillis(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = (v as { toMillis?: () => number } | null)?.toMillis?.();
  return typeof t === 'number' && Number.isFinite(t) ? t : 0;
}

/**
 * Map a raw sangamPosts cloud doc to a SangamPost, or null when it is
 * not an ACTIVE service card belonging to `providerUid`. Pure — the
 * unit tests pin this contract.
 */
export function serviceCardPostFromCloud(
  id: string,
  data: Record<string, unknown> | null | undefined,
  providerUid: string
): SangamPost | null {
  if (!data || !providerUid) return null;
  if (data.kind !== 'service_card') return null;
  if (data.status !== undefined && data.status !== 'active') return null;
  const card = data.serviceCard as ServiceCardDetails | undefined;
  if (!card || typeof card !== 'object') return null;
  const effectiveProvider = card.providerUid || (data.authorUid as string) || '';
  if (effectiveProvider !== providerUid) return null;
  return {
    id,
    authorUid: (data.authorUid as string) || '',
    authorName: (data.authorName as string) || card.providerName || '',
    authorSanId: (data.authorSanId as string) || '',
    authorKind: (data.authorKind as SangamPost['authorKind']) || 'purohit',
    authorRoleId: data.authorRoleId as string | undefined,
    authorTier: data.authorTier as SangamPost['authorTier'],
    orgId: data.orgId as string | undefined,
    orgName: data.orgName as string | undefined,
    isOfficialPagePost: data.isOfficialPagePost === true,
    kind: 'service_card',
    text: (data.text as string) || card.serviceLine || '',
    imageUrl: data.imageUrl as string | undefined,
    serviceCard: card,
    createdAt: toMillis(data.createdAt),
    ashirvadCount: Number(data.ashirvadCount || 0),
    commentCount: Number(data.commentCount || 0),
    shareCount: Number(data.shareCount || 0),
    visibility: 'public',
    status: 'active',
  };
}

/**
 * A provider's active seva notices, newest first. Fails quiet to []
 * (callers treat cards as an enhancement, never a hard dependency).
 */
export async function listProviderServiceCards(
  providerUid: string,
  max = 20
): Promise<SangamPost[]> {
  if (!providerUid) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'sangamPosts'), where('authorUid', '==', providerUid), limit(50))
    );
    return snap.docs
      .map((d) => serviceCardPostFromCloud(d.id, d.data() as Record<string, unknown>, providerUid))
      .filter((p): p is SangamPost => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, max);
  } catch {
    return [];
  }
}
