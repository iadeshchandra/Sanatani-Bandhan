/**
 * workspaceKind.ts — pure workspace-mode classification (QUEUED #45).
 *
 * The seed law: demo/seed (fictitious) data may appear ONLY in an explicit
 * demo context. A real, user-created workspace ("WS-XXXX", minted by the
 * register flow) must boot HONESTLY EMPTY — no fictitious people, vouchers,
 * herds, rooms, meals, or lineage.
 *
 * Two demo contexts are legitimate:
 *  - `DEMO_*` workspace ids — the quarantined demo workspaces
 *    (DEMO_ws-mandir, DEMO_ws-goshala, …) created by the demo entry points.
 *  - Legacy fixture ids (`ws-mandir`, `ws-goshala`, …) — the org ids the
 *    hard-coded INITIAL_* datasets are stamped with. They predate the DEMO_
 *    quarantine and are never minted for real users.
 *
 * Everything else — real `WS-XXXX` ids, solo/empty ids, unknown ids — is a
 * REAL context: seeding is refused (fail-closed toward honesty).
 */

export function isDemoWorkspaceId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('DEMO_');
}

export const FIXTURE_WORKSPACE_IDS: ReadonlySet<string> = new Set([
  'ws-mandir',
  'ws-goshala',
  'ws-ashram',
  'ws-gurukul',
  'ws-sangha',
  'ws-samaj',
  'ws-trust',
  'ws-tirth',
]);

export function isFixtureWorkspaceId(id: string | null | undefined): boolean {
  return typeof id === 'string' && FIXTURE_WORKSPACE_IDS.has(id);
}

/**
 * True only when fictitious seed/demo data is allowed to appear for this
 * workspace id. Real workspaces return false — empty means EMPTY.
 */
export function allowsSeedData(id: string | null | undefined): boolean {
  return isDemoWorkspaceId(id) || isFixtureWorkspaceId(id);
}
