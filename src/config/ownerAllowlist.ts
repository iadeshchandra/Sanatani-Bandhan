/**
 * ownerAllowlist.ts — Sovereign emergency console (GodMode) + admin route guards.
 *
 * The platform owner is identified by their **Firebase Auth email address**.
 * Firebase Auth verifies the credential server-side, so membership in this
 * list is a server-backed signal — unlike client React role state, which any
 * visitor can mutate from the browser console.
 *
 * The emergency console (/mysecretlogin) and the /admin + /system-override
 * routes are reachable ONLY by a signed-in Firebase user whose verified email
 * appears below. Everyone else is bounced to '/'.
 *
 * TODO(OWNER): Set this to your own email address — the Firebase account you
 * sign in with. Review it now: the entry below was carried over from the old
 * hardcoded guard. Replace it with your real owner email (and add a second
 * trusted admin if you want a backup). Until this list is correct, the
 * emergency console stays locked.
 */
export const OWNER_EMAILS: string[] = [
  'poranray7744@gmail.com',
];

const normalize = (email: string): string => email.toLowerCase().trim();

/** True when the given email belongs to the platform owner. */
export const isOwnerEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const n = normalize(email);
  if (!n) return false;
  return OWNER_EMAILS.some((e) => {
    const candidate = normalize(e);
    return candidate !== '' && candidate === n;
  });
};
