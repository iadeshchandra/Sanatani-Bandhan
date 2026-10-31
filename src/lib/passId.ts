/**
 * passId.ts — honest display of a devotee's Sanatani ID (RT-05).
 * =====================================================================
 * The DevoteeAccountPortal printed `profileData.sanataniId ||`
 * followed by one hardcoded sample pass number in three places:
 * that same number was shown as the signed-in user's own credential
 * whenever their record had no sanataniId yet. One member's
 * screenshot carried it; every other ID-less member would have been
 * shown the SAME number as theirs.
 *
 * The law: a record's real ID, or an honest "ID pending" label —
 * never a shared literal dressed as a personal credential.
 */
export function displaySanataniId(
  sanataniId: string | null | undefined,
  pendingLabel: string,
): string {
  const id = (sanataniId || '').trim();
  return id ? id : pendingLabel;
}
