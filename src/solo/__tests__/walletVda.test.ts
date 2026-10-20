/**
 * walletVda.test.ts — Discoverability batch 4: VDA in the Wallet (#14).
 *
 * The Wallet shows the spoken ID as display + door only; claiming and
 * releasing stay single-sourced in VdaAliasSection. These tests pin the
 * pure view-state mapping the card uses.
 */
import { walletVdaState } from '../walletVda';

describe('walletVdaState', () => {
  it('maps a claimed alias to the claimed state', () => {
    expect(walletVdaState('aarav@kashi')).toEqual({ state: 'claimed', alias: 'aarav@kashi' });
  });
  it('treats undefined / empty / blank as unclaimed', () => {
    expect(walletVdaState(undefined)).toEqual({ state: 'unclaimed', alias: '' });
    expect(walletVdaState('')).toEqual({ state: 'unclaimed', alias: '' });
    expect(walletVdaState('   ')).toEqual({ state: 'unclaimed', alias: '' });
  });
  it('trims whitespace before displaying', () => {
    expect(walletVdaState('  meera@vrindavan  ')).toEqual({
      state: 'claimed',
      alias: 'meera@vrindavan',
    });
  });
  it('never fabricates an alias — null input stays unclaimed', () => {
    expect(walletVdaState(null)).toEqual({ state: 'unclaimed', alias: '' });
  });
});
