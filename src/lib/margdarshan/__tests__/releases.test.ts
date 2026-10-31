/**
 * Margdarshan J2 — What's New pins.
 * =====================================================================
 * These pins hold the J2 contract:
 *
 *  - Seed honesty, mechanically: every item carries complete
 *    en/hi/bn prose, and every deskRef resolves to a REAL manual
 *    page (a chip that leads nowhere is a dead button).
 *  - Chronology is structural: versions are unique, the array is
 *    newest-first (dates non-increasing), and every version string
 *    wears the real production stamp shape.
 *  - The resolver slices positionally: "since" an older stamp is
 *    exactly the releases above it; an unknown/empty stamp yields
 *    nothing (a foreign stamp must never mark the archive as new).
 *  - The marker rule, decided and pinned: a FIRST visit (no stored
 *    stamp) highlights NOTHING — the archive is history for a new
 *    reader. Only releases shipped between two visits highlight.
 *  - The wing is live, the public route is registered, and the
 *    release data is wired into the margdarshan-content chunk (the
 *    build-level grep proof lives in the batch NOTES).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { WINGS, getManualPage } from '../manual';
import {
  RELEASES,
  RELEASE_SECTION_ORDER,
  countItemsSince,
  getRelease,
  latestRelease,
  releaseItemCount,
  releasesSince,
  resolveRelease,
} from '../releases';
import {
  WHATS_NEW_SEEN_KEY,
  isNewSince,
  latestSeenStamp,
  newSinceVersions,
} from '../whatsNewMarker';

const LANGS = ['en', 'hi', 'bn'] as const;
const allItems = RELEASES.flatMap((r) =>
  RELEASE_SECTION_ORDER.flatMap((id) => r.sections[id] ?? [])
);

describe("What's New — the seed entries", () => {
  it('carries the shipped arc: 8 releases, 25 items', () => {
    expect(RELEASES).toHaveLength(8);
    expect(allItems).toHaveLength(25);
    expect(
      RELEASES.reduce((n, r) => n + releaseItemCount(r), 0)
    ).toBe(25);
  });

  it('versions are unique, real-stamp shaped, and newest-first', () => {
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const r of RELEASES) {
      expect(r.version).toMatch(/^v\d{4}\.\d{2}\.\d{2}-[0-9a-f]{7}$/);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const dates = RELEASES.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('every item carries complete en/hi/bn prose', () => {
    for (const item of allItems) {
      for (const lang of LANGS) {
        expect(item.text[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every deskRef resolves to a real manual page', () => {
    const refs = allItems.flatMap((i) => i.deskRefs ?? []);
    expect(refs.length).toBeGreaterThan(0);
    for (const slug of refs) {
      expect(getManualPage(slug)).toBeDefined();
    }
  });

  it('no release is empty and every section is a known section', () => {
    for (const r of RELEASES) {
      expect(releaseItemCount(r)).toBeGreaterThan(0);
      for (const key of Object.keys(r.sections)) {
        expect(RELEASE_SECTION_ORDER).toContain(key);
      }
    }
  });
});

describe("What's New — the resolver", () => {
  it('latest is the head of the array', () => {
    expect(latestRelease()).toBe(RELEASES[0]);
    expect(getRelease(RELEASES[0].version)).toBe(RELEASES[0]);
    expect(getRelease('v1999.01.01-0000000')).toBeUndefined();
  });

  it('releasesSince slices positionally, newest first', () => {
    expect(releasesSince(RELEASES[0].version)).toEqual([]);
    expect(releasesSince(RELEASES[1].version)).toEqual([RELEASES[0]]);
    expect(releasesSince(RELEASES[RELEASES.length - 1].version)).toEqual(
      RELEASES.slice(0, -1)
    );
  });

  it('an unknown or empty stamp yields nothing', () => {
    expect(releasesSince(null)).toEqual([]);
    expect(releasesSince(undefined)).toEqual([]);
    expect(releasesSince('')).toEqual([]);
    expect(releasesSince('v1999.01.01-0000000')).toEqual([]);
  });

  it('counts agree with the slicing', () => {
    expect(countItemsSince(RELEASES[0].version)).toBe(0);
    expect(countItemsSince(RELEASES[1].version)).toBe(
      releaseItemCount(RELEASES[0])
    );
    expect(countItemsSince(null)).toBe(0);
  });

  it('resolveRelease keeps section order and resolves one language', () => {
    const guna = getRelease('v2026.10.31-c2485d7')!;
    const en = resolveRelease(guna, 'en');
    expect(en.sections.map((s) => s.id)).toEqual([
      'new',
      'improved',
      'fixed',
    ]);
    expect(en.itemCount).toBe(6);
    const bn = resolveRelease(guna, 'bn');
    expect(bn.sections[0].items[0].text).toBe(
      guna.sections.new![0].text.bn
    );
    // A draft language clamps to English prose (the honest fallback).
    const ta = resolveRelease(guna, 'ta');
    expect(ta.sections[0].items[0].text).toBe(
      guna.sections.new![0].text.en
    );
  });
});

describe("What's New — the since-last-visit marker", () => {
  it('uses the house sb- storage key', () => {
    expect(WHATS_NEW_SEEN_KEY).toBe('sb-margdarshan-whatsnew-seen');
    expect(latestSeenStamp()).toBe(RELEASES[0].version);
  });

  it('FIRST VISIT RULE: no stored stamp highlights nothing at all', () => {
    expect(newSinceVersions(null).size).toBe(0);
    expect(newSinceVersions(undefined).size).toBe(0);
    expect(isNewSince(RELEASES[0], null)).toBe(false);
  });

  it('an up-to-date stamp highlights nothing; an older one, exactly the newer releases', () => {
    expect(newSinceVersions(RELEASES[0].version).size).toBe(0);
    const since = newSinceVersions(RELEASES[2].version);
    expect([...since].sort()).toEqual(
      [RELEASES[0].version, RELEASES[1].version].sort()
    );
    expect(isNewSince(RELEASES[0], RELEASES[2].version)).toBe(true);
    expect(isNewSince(RELEASES[2], RELEASES[2].version)).toBe(false);
  });

  it('an unknown stamp highlights nothing (never the whole archive)', () => {
    expect(newSinceVersions('v1999.01.01-0000000').size).toBe(0);
  });
});

describe("What's New — wing, route and chunk wiring (structural pins)", () => {
  const root = resolve(__dirname, '..', '..', '..', '..');

  it("the whatsnew wing is live with its target", () => {
    const wing = WINGS.find((w) => w.id === 'whatsnew')!;
    expect(wing.state).toBe('live');
    expect(wing.target).toBe('whatsnew');
  });

  it('App.tsx registers the public whats-new route', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
    expect(app).toContain('path="/margdarshan/whats-new"');
    expect(app).toContain('PublicWhatsNew');
  });

  it('both faces render the shared WhatsNewView, and visiting writes the marker', () => {
    const pub = readFileSync(
      resolve(root, 'src/components/margdarshan/PublicMargdarshan.tsx'),
      'utf8'
    );
    const centre = readFileSync(
      resolve(root, 'src/components/margdarshan/MargdarshanCentre.tsx'),
      'utf8'
    );
    const views = readFileSync(
      resolve(root, 'src/components/margdarshan/views.tsx'),
      'utf8'
    );
    expect(pub).toContain('WhatsNewView');
    expect(centre).toContain('WhatsNewView');
    expect(views).toContain('markWhatsNewSeen()');
    expect(views).toContain('readWhatsNewSeen()');
  });

  it('the release data ships in the margdarshan-content chunk, not the entry', () => {
    const vite = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
    const chunkBlock = vite.slice(
      vite.indexOf("'margdarshan-content'"),
      vite.indexOf("'ai-draft-content'")
    );
    expect(chunkBlock).toContain("'./src/lib/margdarshan/releases.ts'");
  });
});
