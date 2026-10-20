/**
 * useTerms.ts — React access to the canonical terms (QUEUED #31).
 * ========================================================================
 * Returns the cached terms immediately (code defaults on first paint —
 * exactly the locked prices) and re-renders once the Firestore-backed
 * terms land. Owner edits in GodMode → Plans & Terms therefore reach
 * checkout, the landing page and upsells within one cache warm, with no
 * deploy and no flicker to wrong numbers.
 */
import { useEffect, useState } from 'react';
import { getTerms, getTermsSync, type PlatformTerms } from '../lib/termsConfig';

export function useTerms(): PlatformTerms {
  const [terms, setTerms] = useState<PlatformTerms>(() => getTermsSync());
  useEffect(() => {
    let alive = true;
    getTerms()
      .then((t) => { if (alive) setTerms(t); })
      .catch(() => { /* getTerms never throws; defaults already shown */ });
    return () => { alive = false; };
  }, []);
  return terms;
}
