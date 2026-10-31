/**
 * publicPaths.ts — the signed-out public path set (RT-FIX, RT-06).
 * =====================================================================
 * MainAppView decides, for a path the router did NOT match, whether a
 * signed-out visitor sees the landing view, the login redirect, or
 * the warm NotFoundPage. The old test was a PREFIX match
 * (`currentPath === p || currentPath.startsWith(p + '/')`), so an
 * unknown sub-path under a public prefix — /contact/xyz,
 * /login/whatever — rendered the LANDING PAGE at a nonsense URL
 * instead of the 404.
 *
 * The law: the public set matches EXACTLY. Every legitimate public
 * route is a defined react-router route and matches in the router
 * before MainAppView ever renders; MainAppView only ever sees
 * unmatched paths, so exactness here can only ever affect unknown
 * URLs — which is precisely the set that must fall to NotFoundPage.
 * (Param families with real sub-paths — /org/:orgId, /festival/… —
 * are judged by their own predicates in MainAppView, not this set.)
 */
export const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/login',
  '/signup',
  '/contact',
  '/ask-ai',
  '/mysecretlogin',
  '/get-app',
  '/for-institutions',
];

/** True only when `pathname` IS one of the public paths, exactly. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
