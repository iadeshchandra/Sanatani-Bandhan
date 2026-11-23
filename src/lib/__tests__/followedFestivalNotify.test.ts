/**
 * followedFestivalNotify.test.ts — NOTIFICATION WAVE 1 pure pins.
 * =====================================================================
 * The followed-org festival alert: a published, uncancelled
 * festival my device has not met is news; everything else (drafts,
 * cancellations, repeats) settles silently or not at all. One bell
 * per festival, ever — dedupe fest:<id>:published.
 */
import {
  festivalPublishedKey,
  pickNewFestivals,
  type FollowedFestivalLike,
} from '../followedFestivalNotify';

function fest(partial: Partial<FollowedFestivalLike> & { id: string }): FollowedFestivalLike {
  return { workspaceId: 'ws1', published: true, ...partial };
}

describe('pickNewFestivals', () => {
  it('a newly published festival is news with the design dedupe key', () => {
    const { notices, settled } = pickNewFestivals([fest({ id: 'f1' })], new Set());
    expect(notices).toHaveLength(1);
    expect(notices[0].dedupeKey).toBe('fest:f1:published');
    expect(settled).toEqual(['f1']);
  });

  it('an already-seen festival settles silently', () => {
    const { notices, settled } = pickNewFestivals([fest({ id: 'f1' })], new Set(['f1']));
    expect(notices).toHaveLength(0);
    expect(settled).toEqual(['f1']);
  });

  it('drafts are neither news nor settled', () => {
    const { notices, settled } = pickNewFestivals([fest({ id: 'f1', published: false })], new Set());
    expect(notices).toHaveLength(0);
    expect(settled).toEqual([]);
  });

  it('a cancelled festival never rings and does not settle', () => {
    const { notices, settled } = pickNewFestivals(
      [fest({ id: 'f1', festivalCancelled: true })],
      new Set(),
    );
    expect(notices).toHaveLength(0);
    expect(settled).toEqual([]);
  });

  it('mixed shelves pick only the new published ones', () => {
    const { notices } = pickNewFestivals(
      [fest({ id: 'old' }), fest({ id: 'new' }), fest({ id: 'draft', published: false })],
      new Set(['old']),
    );
    expect(notices.map((n) => n.festival.id)).toEqual(['new']);
  });

  it('the key helper carries the design shape', () => {
    expect(festivalPublishedKey('abc')).toBe('fest:abc:published');
  });
});
