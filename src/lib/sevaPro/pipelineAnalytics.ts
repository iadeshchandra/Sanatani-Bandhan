/**
 * pipelineAnalytics.ts — Remedy → ritual pipeline analytics (Phase 4).
 * ======================================================================
 * Read-only analytics over:
 *   - jyotishConsultations/{id}/remedies        (collection group)
 *   - jyotishReferrals                           (pro → pro signals)
 *   - referralAttributions/{orderId}             (order-level attribution)
 *   - referralCredits/rc_{orderId}               (settled credits)
 *
 * INDEX DISCIPLINE ($0, no composite indexes): every query below is a
 * single-field equality OR a single-field orderBy — both served by
 * Firestore's automatic indexes. Time-window filtering happens client-side.
 */
import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type {
  ReferralAttributionRecord,
  ReferralCredit,
  ReferralDirection,
} from './referrals';

export interface DirectionPipelineStats {
  direction: ReferralDirection;
  /** Pro → pro referral signals sent. */
  sent: number;
  /** Attributed orders that reached DAKSHINA_RELEASED (credit settled). */
  converted: number;
  conversionRate: number;
  creditsPaid: number;
}

export interface PipelineStats {
  windowDays: number;
  remediesPrescribed: number;
  gigsBookedFromRemedies: number;
  remedyConversionRate: number;
  directions: Record<ReferralDirection, DirectionPipelineStats>;
  totals: { sent: number; converted: number; creditsPaid: number };
}

const asAttr = (d: { data: () => unknown }): ReferralAttributionRecord =>
  d.data() as ReferralAttributionRecord;
const asCredit = (d: { data: () => unknown }): ReferralCredit => d.data() as ReferralCredit;

function blankDirection(direction: ReferralDirection): DirectionPipelineStats {
  return { direction, sent: 0, converted: 0, conversionRate: 0, creditsPaid: 0 };
}

/**
 * Platform-wide pipeline stats for the trailing window.
 * "Remedies → rituals": prescribed remedies vs booked pujas (conversion).
 */
export async function getPipelineStats(windowDays = 30): Promise<PipelineStats> {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const [remedySnap, referralSnap, attrSnap, creditSnap] = await Promise.all([
    getDocs(query(collectionGroup(db, 'remedies'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'jyotishReferrals'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'referralAttributions'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'referralCredits'), orderBy('createdAt', 'desc'), limit(500))),
  ]);

  const inWindow = (ts: number) => ts >= since;

  const remedies = remedySnap.docs.filter((d) => inWindow(Number((d.data() as { createdAt?: number }).createdAt || 0)));
  const remediesPrescribed = remedies.length;

  const attrs = attrSnap.docs.map(asAttr).filter((a) => inWindow(a.createdAt));
  const gigsBookedFromRemedies = attrs.filter((a) => a.direction === 'jyotish-to-purohit').length;
  const remedyConversionRate = remediesPrescribed > 0 ? gigsBookedFromRemedies / remediesPrescribed : 0;

  const directions: Record<ReferralDirection, DirectionPipelineStats> = {
    'jyotish-to-purohit': blankDirection('jyotish-to-purohit'),
    'purohit-to-jyotish': blankDirection('purohit-to-jyotish'),
  };

  // Referral signals: jyotishReferrals rows carry fromKind/toKind.
  referralSnap.docs.forEach((d) => {
    const r = d.data() as { fromKind?: string; toKind?: string; createdAt?: number };
    if (!inWindow(Number(r.createdAt || 0))) return;
    if (r.fromKind === 'jyotish' && r.toKind === 'purohit') directions['jyotish-to-purohit'].sent += 1;
    else if (r.fromKind === 'purohit' && r.toKind === 'jyotish') directions['purohit-to-jyotish'].sent += 1;
  });

  attrs.forEach((a) => {
    if (a.status === 'SETTLED') directions[a.direction].converted += 1;
  });

  creditSnap.docs.forEach((d) => {
    const c = asCredit(d);
    if (!inWindow(c.createdAt) || c.status !== 'SETTLED') return;
    directions[c.direction].creditsPaid += Number(c.creditAmount || 0);
  });

  (Object.keys(directions) as ReferralDirection[]).forEach((dir) => {
    const s = directions[dir];
    s.conversionRate = s.sent > 0 ? s.converted / s.sent : 0;
  });

  const totals = {
    sent: directions['jyotish-to-purohit'].sent + directions['purohit-to-jyotish'].sent,
    converted: directions['jyotish-to-purohit'].converted + directions['purohit-to-jyotish'].converted,
    creditsPaid: directions['jyotish-to-purohit'].creditsPaid + directions['purohit-to-jyotish'].creditsPaid,
  };

  return { windowDays, remediesPrescribed, gigsBookedFromRemedies, remedyConversionRate, directions, totals };
}

export interface TopReferrer {
  referrerUid: string;
  referrerName: string;
  sent: number;
  converted: number;
  creditsEarned: number;
}

/** GodMode leaderboard: who guides devotees most lovingly (and effectively). */
export async function getTopReferrers(maxN = 20): Promise<TopReferrer[]> {
  const [referralSnap, attrSnap, creditSnap] = await Promise.all([
    getDocs(query(collection(db, 'jyotishReferrals'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'referralAttributions'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(db, 'referralCredits'), orderBy('createdAt', 'desc'), limit(500))),
  ]);

  const map = new Map<string, TopReferrer>();
  const row = (uid: string, name: string): TopReferrer => {
    let r = map.get(uid);
    if (!r) {
      r = { referrerUid: uid, referrerName: name, sent: 0, converted: 0, creditsEarned: 0 };
      map.set(uid, r);
    }
    return r;
  };

  referralSnap.docs.forEach((d) => {
    const r = d.data() as { fromUid?: string; fromName?: string };
    if (r.fromUid) row(r.fromUid, r.fromName || 'Professional').sent += 1;
  });
  attrSnap.docs.forEach((d) => {
    const a = asAttr(d);
    if (a.status === 'SETTLED') row(a.referrerUid, a.referrerName).converted += 1;
  });
  creditSnap.docs.forEach((d) => {
    const c = asCredit(d);
    if (c.status === 'SETTLED') row(c.referrerUid, c.referrerName).creditsEarned += Number(c.creditAmount || 0);
  });

  return [...map.values()]
    .sort((a, b) => b.converted - a.converted || b.creditsEarned - a.creditsEarned)
    .slice(0, maxN);
}
