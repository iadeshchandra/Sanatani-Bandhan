/**
 * sangam/kritagyata.ts — Gratitude wall (Phase 4).
 * ============================================================================
 * After a completed seva booking, the devotee is invited to share
 * gratitude. Warm, never transactional: no star numbers, no scores.
 * "47 families shared gratitude" — the trust signal without the
 * e-commerce feel.
 *
 * Gratitude posts live in sangamPosts (kind 'gratitude') and render on
 * the provider's Seva Pro profile as a sacred wall of thanks.
 */

export interface GratitudeDraft {
  /** Optional heartfelt words (may be empty — presence alone is gratitude). */
  message: string;
  /** The completed booking this thanks. */
  orderId: string;
  /** Provider being thanked. */
  providerUid: string;
  providerName: string;
  /** Devotee giving thanks. */
  authorUid: string;
  authorName: string;
  authorSanId: string;
}

/** Validate a gratitude draft. */
export function validateGratitude(draft: GratitudeDraft): string[] {
  const out: string[] = [];
  if (draft.message.trim().length > 500) {
    out.push('Keep your gratitude to a heartfelt few lines (500 characters).');
  }
  if (!draft.orderId) out.push('Gratitude must follow a completed seva.');
  return out;
}

/** Build the SangamPost fields for a gratitude post. */
export function gratitudePost(input: {
  draft: GratitudeDraft;
  createdAt: number;
}): Record<string, unknown> {
  const msg = input.draft.message.trim();
  return {
    authorUid: input.draft.authorUid,
    authorName: input.draft.authorName,
    authorSanId: input.draft.authorSanId,
    authorKind: 'devotee',
    isOfficialPagePost: false,
    kind: 'gratitude',
    text: msg || '🙏 Kritagyata — gratitude beyond words.',
    providerUid: input.draft.providerUid,
    providerName: input.draft.providerName,
    createdAt: input.createdAt,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
  };
}

/**
 * Warm count copy — never a number-first rating.
 * "47 families shared gratitude" not "4.8★ (47)".
 */
export function gratitudeCountCopy(count: number, lang: 'en' | 'hi' | 'bn' = 'en'): string {
  if (count <= 0) {
    return lang === 'bn'
      ? 'কৃতজ্ঞতা ভাগ করে নিন'
      : lang === 'hi'
        ? 'कृतज्ञता साझा करें'
        : 'Share your gratitude';
  }
  const word =
    lang === 'bn' ? 'পরিবার কৃতজ্ঞতা জানিয়েছে' : lang === 'hi' ? 'परिवारों ने कृतज्ञता जताई' : 'families shared gratitude';
  return `🙏 ${count} ${word}`;
}
