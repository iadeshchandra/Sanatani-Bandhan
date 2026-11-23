/**
 * pillars.test.ts — the FOUR PILLARS inside Personal (owner decision
 * 2026-11-24; lib/pillars).
 * =====================================================================
 * Two kinds of pins:
 *  - pure logic: the pillar order is canonical, and each home's
 *    element→pillar map groups contiguously in that order (an element
 *    may never be stranded in an earlier pillar below a later one);
 *  - source contracts (the codebase's pattern — the homes' import
 *    chains are not jest-loadable in the node env): SoloHome renders
 *    the four PillarHeaders in canonical order with every mapped
 *    element still present, and MemberAppShell's HOME renders its
 *    Social header above the polls band and the feed.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  MEMBER_HOME_PILLAR_MAP,
  PILLARS,
  SOLO_HOME_PILLAR_MAP,
  pillarRank,
} from '../pillars';

const SRC = path.join(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('the four pillars — canonical order', () => {
  it('are exactly Personal, Social, Locations, Management', () => {
    expect(PILLARS.map((p) => p.id)).toEqual(['personal', 'social', 'locations', 'management']);
  });

  it('carry the surfaces.pillars dictionary keys', () => {
    expect(PILLARS.map((p) => p.titleKey)).toEqual([
      'surfaces.pillars.personal',
      'surfaces.pillars.social',
      'surfaces.pillars.locations',
      'surfaces.pillars.management',
    ]);
  });
});

describe('home pillar maps group contiguously', () => {
  for (const [name, map] of [
    ['SoloHome', SOLO_HOME_PILLAR_MAP],
    ['MemberAppShell', MEMBER_HOME_PILLAR_MAP],
  ] as const) {
    it(`${name}: pillar ranks never decrease down the home`, () => {
      const ranks = map.map((row) => pillarRank(row.pillar));
      const sorted = [...ranks].sort((a, b) => a - b);
      expect(ranks).toEqual(sorted);
    });

    it(`${name}: all four pillars are represented`, () => {
      expect(new Set(map.map((row) => row.pillar)).size).toBe(4);
    });
  }

  it('SoloHome: the Management pillar is the Grow doorway alone, last', () => {
    const last = SOLO_HOME_PILLAR_MAP[SOLO_HOME_PILLAR_MAP.length - 1];
    expect(last.pillar).toBe('management');
    expect(last.element).toContain('JoinUpgrade');
    expect(SOLO_HOME_PILLAR_MAP.filter((r) => r.pillar === 'management')).toHaveLength(1);
  });

  it('SoloHome: the events shelves are Locations, below the Personal block', () => {
    const locations = SOLO_HOME_PILLAR_MAP.filter((r) => r.pillar === 'locations');
    expect(locations.map((r) => r.element)).toEqual([
      'OrgEventsShelf ("From your orgs")',
      'FollowedTemplesStrip ("From your temples")',
    ]);
  });
});

describe('SoloHome source contract', () => {
  const src = read('solo/SoloHome.tsx');

  it('renders the four PillarHeaders in canonical order', () => {
    const at = (id: string) => src.indexOf(`pillar="${id}"`);
    expect(at('personal')).toBeGreaterThan(-1);
    expect(at('personal')).toBeLessThan(at('social'));
    expect(at('social')).toBeLessThan(at('locations'));
    expect(at('locations')).toBeLessThan(at('management'));
  });

  it('keeps every organised element on the home', () => {
    for (const needle of [
      '<PanchangHeader',
      '<OfflineSevakStatus',
      '<SoloUsualRow',
      '<OrgEventsShelf',
      '<FollowedTemplesStrip',
      '<AjkerSuchana',
      '<SuggestionCards',
      '<PersonalWallet',
      '<JoinUpgrade',
    ]) {
      expect(src).toContain(needle);
    }
  });

  it('places the Locations shelves between the Social and Management headers', () => {
    expect(src.indexOf('<OrgEventsShelf')).toBeGreaterThan(src.indexOf('pillar="locations"'));
    expect(src.indexOf('<OrgEventsShelf')).toBeLessThan(src.indexOf('pillar="management"'));
    expect(src.indexOf('<JoinUpgrade')).toBeGreaterThan(src.indexOf('pillar="management"'));
  });
});

describe('MemberAppShell source contract', () => {
  const src = read('components/devotee/MemberAppShell.tsx');

  it('renders the Social pillar header in HOME, above band and feed', () => {
    const homeAt = src.indexOf("case 'HOME':");
    const headerAt = src.indexOf('pillar="social"', homeAt);
    expect(headerAt).toBeGreaterThan(homeAt);
    expect(headerAt).toBeLessThan(src.indexOf('<MemberPollsSection', homeAt));
    expect(src.indexOf('<SanataniSocialFeed', homeAt)).toBeGreaterThan(headerAt);
  });

  it('adds no tab for the pillars — the shell navigation is untouched', () => {
    expect(src).not.toContain("pillar=\"personal\"");
    expect(src).not.toContain("pillar=\"locations\"");
    expect(src).not.toContain("pillar=\"management\"");
  });
});
