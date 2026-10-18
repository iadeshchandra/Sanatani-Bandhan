import {
  purohitTierToSevaProTier,
  sevaProTierToPurohitTier,
  sanataniTierToSevaProTier,
  isSevaProTier,
  sevaProTierRank,
  sevaProTierLabel,
} from '../tierMapping';

describe('tierMapping — single source of truth between tier dialects', () => {
  test('purohit pipeline → SevaPro tier', () => {
    expect(purohitTierToSevaProTier('REGISTERED')).toBe('REGISTERED');
    expect(purohitTierToSevaProTier('CREDENTIAL_VERIFIED')).toBe('VERIFIED');
    // ORG_ENDORSED does NOT skip the trust queue → VERIFIED, not TRUSTED.
    expect(purohitTierToSevaProTier('ORG_ENDORSED')).toBe('VERIFIED');
    expect(purohitTierToSevaProTier('PLATFORM_VERIFIED')).toBe('TRUSTED');
  });

  test('purohit mapping is total (unknown/null → REGISTERED, never throws)', () => {
    expect(purohitTierToSevaProTier('BOGUS' as never)).toBe('REGISTERED');
    expect(purohitTierToSevaProTier(null)).toBe('REGISTERED');
    expect(purohitTierToSevaProTier(undefined)).toBe('REGISTERED');
  });

  test('SevaPro tier → purohit pipeline (reverse map)', () => {
    expect(sevaProTierToPurohitTier('REGISTERED')).toBe('REGISTERED');
    expect(sevaProTierToPurohitTier('VERIFIED')).toBe('CREDENTIAL_VERIFIED');
    expect(sevaProTierToPurohitTier('TRUSTED')).toBe('PLATFORM_VERIFIED');
  });

  test('sanatani subset maps identically', () => {
    expect(sanataniTierToSevaProTier('REGISTERED')).toBe('REGISTERED');
    expect(sanataniTierToSevaProTier('VERIFIED')).toBe('VERIFIED');
    expect(sanataniTierToSevaProTier(null)).toBe('REGISTERED');
  });

  test('isSevaProTier guard', () => {
    expect(isSevaProTier('TRUSTED')).toBe(true);
    expect(isSevaProTier('PLATFORM_VERIFIED')).toBe(false);
    expect(isSevaProTier('')).toBe(false);
    expect(isSevaProTier(null)).toBe(false);
  });

  test('rank orders trust ascending', () => {
    expect(sevaProTierRank('REGISTERED')).toBeLessThan(sevaProTierRank('VERIFIED'));
    expect(sevaProTierRank('VERIFIED')).toBeLessThan(sevaProTierRank('TRUSTED'));
    expect(sevaProTierRank('BOGUS')).toBe(-1);
  });

  test('labels are warm, trilingual, never empty', () => {
    for (const tier of ['REGISTERED', 'VERIFIED', 'TRUSTED'] as const) {
      for (const lang of ['en', 'hi', 'bn'] as const) {
        const label = sevaProTierLabel(tier, lang);
        expect(label.length).toBeGreaterThan(0);
      }
    }
    expect(sevaProTierLabel('VERIFIED', 'en')).toContain('Verified Sevak');
    expect(sevaProTierLabel('TRUSTED', 'bn')).toContain('বিশ্বস্ত');
  });
});
