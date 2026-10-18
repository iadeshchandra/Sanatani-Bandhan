/**
 * i18n/translationSuggestions.ts — devotee suggestion writer.
 * ==========================================================
 * When a native speaker taps "🙏 Help us say this better" on a draft
 * guide string, their suggestion lands in `translationSuggestions/{autoId}`:
 *
 *   { lang, key, currentText, suggestedText, uid, sanataniId?,
 *     status: 'pending', createdAt }
 *
 * The GodMode Translations tab reviews the queue. Fail-open: a failed
 * write resolves 'failed' and the UI shows a warm toast — never a crash.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface TranslationSuggestionInput {
  /** Language code, e.g. 'ta'. */
  lang: string;
  /** Dot-delimited key, e.g. 'guide.vda.s1t'. */
  key: string;
  /** The text the devotee saw. */
  currentText: string;
  /** Their suggested better wording. */
  suggestedText: string;
  /** Sanatani ID when known (optional — uid is the identity). */
  sanataniId?: string;
}

const MAX_TEXT = 2000;

/**
 * Submit one suggestion. Resolves 'ok' or 'failed' — never throws.
 * Requires a signed-in user (rules pin uid == request.auth.uid).
 */
export async function submitTranslationSuggestion(
  input: TranslationSuggestionInput
): Promise<'ok' | 'failed'> {
  try {
    const user = auth.currentUser;
    if (!user) return 'failed';
    const suggested = (input.suggestedText || '').trim();
    if (!suggested || suggested.length > MAX_TEXT) return 'failed';
    const key = (input.key || '').trim();
    if (!key || key.length > 200) return 'failed';

    await addDoc(collection(db, 'translationSuggestions'), {
      lang: (input.lang || 'en').toLowerCase(),
      key,
      currentText: (input.currentText || '').slice(0, MAX_TEXT),
      suggestedText: suggested,
      uid: user.uid,
      sanataniId: input.sanataniId || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return 'ok';
  } catch {
    return 'failed';
  }
}
