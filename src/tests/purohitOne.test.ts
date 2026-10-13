/**
 * Purohit One — core logic unit tests.
 * Covers: PUR-ID generation, tier pipeline (ordered, never skips),
 * gig status machine, and badge metadata completeness.
 */
import {
  generatePurohitId,
  computeEffectiveTier,
  tierIndex,
  PUROHIT_TIERS,
  PUROHIT_TIER_META,
  GIG_STATUS_META,
  RITUAL_TYPES,
  PurohitVerificationTier,
} from '../types/purohit';

describe('Purohit One — Universal Purohit ID', () => {
  it('generates PUR-XXXXXX format with unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const id = generatePurohitId();
      expect(id).toMatch(/^PUR-[A-Z0-9]{6}$/);
      // No ambiguous chars: 0/O, 1/I/L
      expect(id).not.toMatch(/[01OIL]/);
    }
  });

  it('generates unique IDs (collision-free in practice)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const id = generatePurohitId();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });
});

describe('Purohit One — four-tier verification pipeline', () => {
  const tiers: PurohitVerificationTier[] = [
    'REGISTERED',
    'CREDENTIAL_VERIFIED',
    'TEMPLE_ENDORSED',
    'PLATFORM_VERIFIED',
  ];

  it('defines tiers in strict ascending order', () => {
    expect(PUROHIT_TIERS).toEqual(tiers);
    tiers.forEach((t, i) => expect(tierIndex(t)).toBe(i));
  });

  it('has badge metadata for every tier', () => {
    tiers.forEach((t) => {
      expect(PUROHIT_TIER_META[t].label).toBeTruthy();
      expect(PUROHIT_TIER_META[t].description).toBeTruthy();
    });
  });

  it('never skips tiers: REGISTERED cannot jump to TEMPLE_ENDORSED', () => {
    // Even with endorsements, REGISTERED stays until credentials are verified.
    expect(computeEffectiveTier('REGISTERED', 5, 50, 5.0)).toBe('REGISTERED');
  });

  it('advances CREDENTIAL_VERIFIED → TEMPLE_ENDORSED → PLATFORM_VERIFIED on endorsement', () => {
    // Per spec: endorsement moves CREDENTIAL_VERIFIED → TEMPLE_ENDORSED, and
    // TEMPLE_ENDORSED + (≥1 endorsement) → PLATFORM_VERIFIED auto. The stored
    // tier records TEMPLE_ENDORSED; the effective tier resolves to the top.
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 0, 0, 0)).toBe('CREDENTIAL_VERIFIED');
    expect(computeEffectiveTier('CREDENTIAL_VERIFIED', 1, 0, 0)).toBe('PLATFORM_VERIFIED');
  });

  it('advances TEMPLE_ENDORSED → PLATFORM_VERIFIED on merit', () => {
    // Merit path: 10 gigs @ ≥4.5 (no endorsement needed at this stage).
    expect(computeEffectiveTier('TEMPLE_ENDORSED', 0, 10, 4.5)).toBe('PLATFORM_VERIFIED');
    expect(computeEffectiveTier('TEMPLE_ENDORSED', 0, 10, 4.9)).toBe('PLATFORM_VERIFIED');
  });

  it('withholds PLATFORM_VERIFIED below the merit bar', () => {
    expect(computeEffectiveTier('TEMPLE_ENDORSED', 0, 9, 5.0)).toBe('TEMPLE_ENDORSED');
    expect(computeEffectiveTier('TEMPLE_ENDORSED', 0, 10, 4.4)).toBe('TEMPLE_ENDORSED');
    expect(computeEffectiveTier('TEMPLE_ENDORSED', 0, 0, 0)).toBe('TEMPLE_ENDORSED');
  });

  it('is idempotent at the top tier', () => {
    expect(computeEffectiveTier('PLATFORM_VERIFIED', 0, 0, 0)).toBe('PLATFORM_VERIFIED');
  });
});

describe('Purohit One — gig status machine', () => {
  it('covers every status in the documented path', () => {
    const expected = [
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'DAKSHINA_RELEASED',
      'CANCELLED',
    ];
    expected.forEach((s) => {
      expect(GIG_STATUS_META[s as keyof typeof GIG_STATUS_META].label).toBeTruthy();
    });
  });

  it('defines the five ritual types', () => {
    expect(RITUAL_TYPES).toHaveLength(5);
    expect(RITUAL_TYPES).toContain('Havan & Yajna');
    expect(RITUAL_TYPES).toContain('Mandir Sanctum');
  });
});
