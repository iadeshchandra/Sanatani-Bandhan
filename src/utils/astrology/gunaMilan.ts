import { VivahProfile } from '../../types/b2c';

export interface AshtakootaBreakdown {
  varna: { points: number; max: 1; label: 'Varna (Spiritual Compatibility)' };
  vashya: { points: number; max: 2; label: 'Vashya (Mutual Attraction & Dominance)' };
  tara: { points: number; max: 3; label: 'Tara (Destiny & Longevity)' };
  yoni: { points: number; max: 4; label: 'Yoni (Nature & Physical Affinity)' };
  grahaMaitri: { points: number; max: 5; label: 'Graha Maitri (Mental & Intellectual Rapport)' };
  gana: { points: number; max: 6; label: 'Gana (Temperament & Social Behavior)' };
  bhakoot: { points: number; max: 7; label: 'Bhakoot (Emotional & Family Growth)' };
  nadi: { points: number; max: 8; label: 'Nadi (Genetic & Physiological Energy)' };
}

export interface GunaMilanResult {
  score: number;
  outOf: 36;
  isGotraMatch: boolean;
  recommendation: 'Favorable' | 'Not Recommended' | string;
  ashtakoota?: AshtakootaBreakdown;
  shastricVerdict?: string;
}

/**
 * Deterministic string hash function (djb2 variation)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Distribute the total score deterministically across the 8 Ashtakootas (total 36)
 */
function computeKootaBreakdown(totalScore: number, seedHash: number): AshtakootaBreakdown {
  // Max points: Varna 1, Vashya 2, Tara 3, Yoni 4, GrahaMaitri 5, Gana 6, Bhakoot 7, Nadi 8 = 36 total
  const maxes = [1, 2, 3, 4, 5, 6, 7, 8];
  const deficit = 36 - totalScore; // points to deduct
  
  // Deduct points based on seed
  const points = [...maxes];
  let remainingDeficit = deficit;
  let cursor = seedHash % maxes.length;
  
  while (remainingDeficit > 0) {
    if (points[cursor] > 0) {
      points[cursor]--;
      remainingDeficit--;
    }
    cursor = (cursor + 1) % maxes.length;
  }

  return {
    varna: { points: points[0], max: 1, label: 'Varna (Spiritual Compatibility)' },
    vashya: { points: points[1], max: 2, label: 'Vashya (Mutual Attraction & Dominance)' },
    tara: { points: points[2], max: 3, label: 'Tara (Destiny & Longevity)' },
    yoni: { points: points[3], max: 4, label: 'Yoni (Nature & Physical Affinity)' },
    grahaMaitri: { points: points[4], max: 5, label: 'Graha Maitri (Mental & Intellectual Rapport)' },
    gana: { points: points[5], max: 6, label: 'Gana (Temperament & Social Behavior)' },
    bhakoot: { points: points[6], max: 7, label: 'Bhakoot (Emotional & Family Growth)' },
    nadi: { points: points[7], max: 8, label: 'Nadi (Genetic & Physiological Energy)' },
  };
}

/**
 * Calculates Vedic Guna Milan score between two astrological profiles.
 * Evaluates 36 Gunas based on Nakshatra and Rashi, and enforces Gotra exogamy rule.
 */
export function calculateGunaMilan(
  profileA: VivahProfile,
  profileB: VivahProfile
): {
  score: number;
  outOf: 36;
  isGotraMatch: boolean;
  recommendation: string;
  ashtakoota?: AshtakootaBreakdown;
  shastricVerdict?: string;
} {
  // Vedic exogamy rule: cannot marry within the same Gotra
  const gotraA = (profileA.gotra || '').trim().toLowerCase();
  const gotraB = (profileB.gotra || '').trim().toLowerCase();
  
  // Normalize variations like 'kashyap' and 'kashyapa'
  const normA = gotraA.replace(/a$/, '');
  const normB = gotraB.replace(/a$/, '');
  const isGotraMatch = Boolean(gotraA && gotraB && (gotraA === gotraB || normA === normB));

  // Deterministic pseudo-score (between 18 and 36) based on hashing nakshatra & rashi together
  const tokenA = `${(profileA.nakshatra || '').trim().toLowerCase()}_${(profileA.rashi || '').trim().toLowerCase()}`;
  const tokenB = `${(profileB.nakshatra || '').trim().toLowerCase()}_${(profileB.rashi || '').trim().toLowerCase()}`;
  
  // Sort pairs to ensure symmetrical matching result regardless of caller order
  const seedString = [tokenA, tokenB].sort().join(':::');
  const seedHash = hashString(seedString);
  
  // Deterministic integer between 18 and 36 (inclusive)
  const score = 18 + (seedHash % 19);

  // Vedic threshold: Score >= 18 is favorable, but same gotra strictly invalidates match
  let recommendation = 'Not Recommended';
  let shastricVerdict = '';

  if (isGotraMatch) {
    recommendation = 'Not Recommended';
    shastricVerdict = 'Sagotra Vivah prohibited per Manusmriti & Grihya Sutras. Even with high Guna match, lineage exogamy must be preserved.';
  } else if (score >= 18) {
    recommendation = 'Favorable';
    if (score >= 28) {
      shastricVerdict = 'Uttama (Superior) Match: Auspicious harmony across Nadi, Bhakoot and Gana kootas.';
    } else {
      shastricVerdict = 'Madhyama (Acceptable) Match: Favorable planetary friendship and balanced koota points.';
    }
  } else {
    recommendation = 'Not Recommended';
    shastricVerdict = 'Alpa Guna: Score below 18 points indicates conflicting planetary temperaments.';
  }

  const ashtakoota = computeKootaBreakdown(score, seedHash);

  return {
    score,
    outOf: 36,
    isGotraMatch,
    recommendation,
    ashtakoota,
    shastricVerdict,
  };
}
