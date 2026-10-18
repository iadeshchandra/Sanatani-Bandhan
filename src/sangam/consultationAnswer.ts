/**
 * sangam/consultationAnswer.ts — Public consultation follow-ups (Phase 4).
 * ============================================================================
 * After a consultation, a jyotishi may post a PUBLIC follow-up answer —
 * general guidance that showcases expertise. The devotee's identity is
 * NEVER revealed: no names, no IDs, no identifying details. The post is
 * framed as "A devotee asked..." and requires the devotee's explicit
 * opt-in on the consultation.
 *
 * Privacy is structural: the composer never receives the devotee's
 * identity, only the question topic and the opt-in flag.
 */

export interface ConsultationAnswerDraft {
  /** General guidance text — must contain no identifying details. */
  answerText: string;
  /** The devotee explicitly opted in to a public follow-up. */
  devoteeConsented: boolean;
  /** Jyotishi's uid, name, Sanatani ID, role id. */
  authorUid: string;
  authorName: string;
  authorSanId: string;
  authorRoleId?: string;
}

/** Patterns that suggest identifying details leaked into the text. */
const IDENTITY_PATTERNS: RegExp[] = [
  /\bSAN-[A-Z0-9]{6}\b/i, // Sanatani ID
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // email
  /\+?\d[\d\s-]{7,}\d/, // phone number
  /\b(my|his|her) (name is|called)\b/i, // "my name is..."
];

/** Validate a consultation answer draft. Returns violations (empty = OK). */
export function validateConsultationAnswer(draft: ConsultationAnswerDraft): string[] {
  const out: string[] = [];
  if (!draft.devoteeConsented) {
    out.push('The devotee must opt in before you share a public follow-up.');
  }
  const text = draft.answerText.trim();
  if (text.length < 30) {
    out.push('Share a few heartfelt words — at least 30 characters of genuine guidance.');
  }
  if (text.length > 2000) {
    out.push('Keep the public answer concise (2000 characters). Save depth for the consultation.');
  }
  for (const re of IDENTITY_PATTERNS) {
    if (re.test(text)) {
      out.push('This looks like it contains identifying details — the devotee must stay anonymous.');
      break;
    }
  }
  return out;
}

/** Build the SangamPost fields for a consultation answer. */
export function consultationAnswerPost(input: {
  draft: ConsultationAnswerDraft;
  createdAt: number;
}): Record<string, unknown> {
  return {
    authorUid: input.draft.authorUid,
    authorName: input.draft.authorName,
    authorSanId: input.draft.authorSanId,
    authorKind: 'jyotish',
    authorRoleId: input.draft.authorRoleId || '',
    isOfficialPagePost: false,
    kind: 'consultation_answer',
    // Framed anonymously by construction — no devotee fields exist.
    text: `A devotee asked…\n\n${input.draft.answerText.trim()}\n\n🙏 Ask your own question — book a consultation.`,
    anonymized: true,
    createdAt: input.createdAt,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
  };
}
