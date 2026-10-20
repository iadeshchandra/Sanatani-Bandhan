/**
 * solo/walletVda.ts — pure view-state for the Wallet VDA card.
 * ============================================================
 * Jest-safe (no firebase / context imports): a non-blank alias means
 * claimed. The card renders the states; claiming itself stays in
 * VdaAliasSection, so the registry rules never fork.
 */

export type WalletVdaState =
  | { state: 'claimed'; alias: string }
  | { state: 'unclaimed'; alias: '' };

/** Pure view-state: a non-blank alias means claimed. Jest-safe. */
export function walletVdaState(vdaAlias?: string | null): WalletVdaState {
  const alias = (vdaAlias || '').trim();
  return alias ? { state: 'claimed', alias } : { state: 'unclaimed', alias: '' };
}
