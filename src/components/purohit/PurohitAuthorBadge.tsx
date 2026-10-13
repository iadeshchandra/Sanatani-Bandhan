/**
 * PurohitAuthorBadge — verification badge next to social feed author names.
 * =====================================================================
 * Looks up the author's purohit identity by their Firebase uid (cached per
 * session) and renders the platform VerificationBadge when the author is a
 * VERIFIED purohit (CREDENTIAL_VERIFIED or higher). Renders nothing for
 * unverified authors (including REGISTERED) — no badge, no noise.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { PurohitVerificationTier } from '../../types/purohit';
import { VerificationBadge } from '../common/VerificationBadge';

// Session-level cache: uid → tier (null = looked up, not a purohit).
const tierCache = new Map<string, PurohitVerificationTier | null>();
const pending = new Map<string, Promise<PurohitVerificationTier | null>>();

const lookupTier = (uid: string): Promise<PurohitVerificationTier | null> => {
  if (tierCache.has(uid)) return Promise.resolve(tierCache.get(uid)!);
  if (pending.has(uid)) return pending.get(uid)!;
  const p = getDocs(query(collection(db, 'purohits'), where('uid', '==', uid), limit(1)))
    .then((snap) => {
      const tier = snap.empty ? null : (snap.docs[0].data()?.verificationTier as PurohitVerificationTier) || null;
      tierCache.set(uid, tier);
      pending.delete(uid);
      return tier;
    })
    .catch(() => {
      pending.delete(uid);
      return null;
    });
  pending.set(uid, p);
  return p;
};

export const PurohitAuthorBadge: React.FC<{ authorId?: string }> = ({ authorId }) => {
  const [tier, setTier] = useState<PurohitVerificationTier | null>(null);

  useEffect(() => {
    if (!authorId) {
      setTier(null);
      return;
    }
    let cancelled = false;
    lookupTier(authorId).then((t) => {
      if (!cancelled) setTier(t);
    });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  // Only verified tiers earn the badge. REGISTERED (and non-purohits) → nothing.
  if (!tier || tier === 'REGISTERED') return null;
  return <VerificationBadge tier={tier} size="xs" />;
};
