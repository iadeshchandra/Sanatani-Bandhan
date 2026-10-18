/**
 * Seva Bazar Phase 3+4 — unit tests.
 * ============================================================
 * Covers: demo videos, live-aarti pins, consultation answers,
 * kritagyata, referrals, festival moments. All pure logic.
 */
import { validateDemoVideoUrl, demoVideoDoc, demoEmbedUrl } from '../sevaBazarVideo';
import { buildPinnedAarti, shouldShowPinnedAarti } from '../liveAarti';
import { validateConsultationAnswer, consultationAnswerPost } from '../consultationAnswer';
import { validateGratitude, gratitudePost, gratitudeCountCopy } from '../kritagyata';
import { extractReferrer, withReferrer, referralThanksCopy, isValidReferral } from '../referrals';
import {
  activeMomentWindows,
  validateMoment,
  festivalMomentPost,
  momentsRailTitle,
  festivalSlug,
} from '../festivalMoments';

/* ---------------- demo video ---------------- */

describe('validateDemoVideoUrl', () => {
  it('accepts a youtube.com watch URL', () => {
    const r = validateDemoVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(r.videoId).toBe('dQw4w9WgXcQ');
    expect(r.error).toBeUndefined();
  });
  it('accepts a youtu.be short URL', () => {
    const r = validateDemoVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(r.videoId).toBe('dQw4w9WgXcQ');
  });
  it('rejects non-YouTube URLs', () => {
    const r = validateDemoVideoUrl('https://vimeo.com/12345');
    expect(r.videoId).toBeUndefined();
    expect(r.error).toMatch(/YouTube/);
  });
  it('treats empty as no-video (not an error)', () => {
    const r = validateDemoVideoUrl('   ');
    expect(r.videoId).toBeUndefined();
    expect(r.error).toBe('');
  });
});

describe('demoVideoDoc', () => {
  it('builds a seva_demo document', () => {
    const d = demoVideoDoc({
      videoId: 'dQw4w9WgXcQ',
      providerUid: 'u1',
      providerName: 'Pandit Ravi',
      sharedBy: 'u1',
      sharedByName: 'Pandit Ravi',
      sharedBySanId: 'SAN-ABC123',
      serviceLine: 'Rudrabhishek at home',
      postId: 'p1',
    });
    expect(d.category).toBe('seva_demo');
    expect(d.youtubeId).toBe('dQw4w9WgXcQ');
    expect(d.providerUid).toBe('u1');
    expect(String(d.thumbnailUrl)).toContain('dQw4w9WgXcQ');
  });
  it('embed URL uses youtube-nocookie', () => {
    expect(demoEmbedUrl('dQw4w9WgXcQ')).toContain('youtube-nocookie.com');
  });
});

/* ---------------- live aarti ---------------- */

describe('liveAarti', () => {
  it('shows only when pinned AND live', () => {
    const pin = buildPinnedAarti({ orgId: 'o1', orgName: 'Kashi Temple', pinnedBy: 'u9' });
    expect(shouldShowPinnedAarti(pin, { isLive: true, videoId: 'v1' })).toBe(true);
    expect(shouldShowPinnedAarti(pin, { isLive: false })).toBe(false);
    expect(shouldShowPinnedAarti(null, { isLive: true })).toBe(false);
    expect(shouldShowPinnedAarti({ ...pin, enabled: false }, { isLive: true })).toBe(false);
  });
});

/* ---------------- consultation answers ---------------- */

describe('validateConsultationAnswer', () => {
  const base = {
    answerText: 'Saturn\'s transit suggests patience in career matters this year. General guidance only.',
    devoteeConsented: true,
    authorUid: 'j1',
    authorName: 'Jyotish Dev',
    authorSanId: 'SAN-JYO001',
  };
  it('passes a clean draft', () => {
    expect(validateConsultationAnswer(base)).toEqual([]);
  });
  it('requires devotee consent', () => {
    expect(validateConsultationAnswer({ ...base, devoteeConsented: false }).length).toBeGreaterThan(0);
  });
  it('rejects leaked Sanatani IDs', () => {
    const bad = { ...base, answerText: 'For SAN-ABC123, the stars say...' };
    const errs = validateConsultationAnswer(bad);
    expect(errs.some((e) => e.match(/anonymous/i))).toBe(true);
  });
  it('rejects leaked phone numbers', () => {
    const bad = { ...base, answerText: 'Call me at +8801712345678 for details' };
    expect(validateConsultationAnswer(bad).length).toBeGreaterThan(0);
  });
  it('builds an anonymized post', () => {
    const p = consultationAnswerPost({ draft: base, createdAt: 123 });
    expect(p.kind).toBe('consultation_answer');
    expect(p.anonymized).toBe(true);
    expect(String(p.text)).toMatch(/A devotee asked/);
    expect(String(p.text)).not.toMatch(/SAN-/);
  });
});

/* ---------------- kritagyata ---------------- */

describe('kritagyata', () => {
  it('warm count copy, never a rating', () => {
    expect(gratitudeCountCopy(47)).toBe('🙏 47 families shared gratitude');
    expect(gratitudeCountCopy(47)).not.toMatch(/★/);
    expect(gratitudeCountCopy(0)).toMatch(/gratitude/i);
  });
  it('gratitude post carries provider link', () => {
    const p = gratitudePost({
      draft: {
        message: 'Panditji\'s guidance brought peace to our home.',
        orderId: 'o1',
        providerUid: 'p1',
        providerName: 'Pandit Ravi',
        authorUid: 'd1',
        authorName: 'Anjali',
        authorSanId: 'SAN-XYZ789',
      },
      createdAt: 1,
    });
    expect(p.kind).toBe('gratitude');
    expect(p.providerUid).toBe('p1');
  });
  it('rejects overlong messages', () => {
    const errs = validateGratitude({
      message: 'x'.repeat(501),
      orderId: 'o1',
      providerUid: 'p1',
      providerName: 'P',
      authorUid: 'd1',
      authorName: 'A',
      authorSanId: 'SAN-XYZ789',
    });
    expect(errs.length).toBeGreaterThan(0);
  });
});

/* ---------------- referrals ---------------- */

describe('referrals', () => {
  it('extracts ?ref= Sanatani IDs', () => {
    expect(extractReferrer('/seva/card123?ref=SAN-ABC123')).toBe('SAN-ABC123');
    expect(extractReferrer('/seva/card123')).toBeNull();
    expect(extractReferrer('/x?ref=BOGUS')).toBeNull();
  });
  it('appends ref to paths', () => {
    expect(withReferrer('/seva/c1', 'SAN-ABC123')).toBe('/seva/c1?ref=SAN-ABC123');
    expect(withReferrer('/seva/c1?a=b', 'san-abc123')).toBe('/seva/c1?a=b&ref=SAN-ABC123');
    expect(withReferrer('/seva/c1', 'nope')).toBe('/seva/c1');
  });
  it('rejects self-referral', () => {
    expect(isValidReferral('SAN-ABC123', 'SAN-ABC123')).toBe(false);
    expect(isValidReferral('SAN-ABC123', 'SAN-XYZ789')).toBe(true);
    expect(isValidReferral('bogus', 'SAN-XYZ789')).toBe(false);
  });
  it('warm thanks copy in three languages', () => {
    expect(referralThanksCopy('Pandit Ravi', 'en').title).toMatch(/🪔/);
    expect(referralThanksCopy('Pandit Ravi', 'bn').title).toMatch(/🪔/);
    expect(referralThanksCopy('Pandit Ravi', 'hi').title).toMatch(/🪔/);
  });
});

/* ---------------- festival moments ---------------- */

describe('festivalMoments', () => {
  const fakeFestivals = [
    { nameEn: 'Diwali', date: '2026-11-08', nameBn: 'দীপাবলি' },
    { nameEn: 'Holi', date: '2026-03-04', nameBn: 'হোলি' },
  ] as unknown as Parameters<typeof activeMomentWindows>[1];
  it('active inside the ±3 day window', () => {
    const now = new Date('2026-11-09T12:00:00').getTime();
    const wins = activeMomentWindows(now, fakeFestivals);
    expect(wins.length).toBe(1);
    expect(wins[0].festival.nameEn).toBe('Diwali');
  });
  it('empty outside any window', () => {
    const now = new Date('2026-06-01T12:00:00').getTime();
    expect(activeMomentWindows(now, fakeFestivals)).toEqual([]);
  });
  it('validates blessings', () => {
    expect(validateMoment({ blessing: 'Shubh Deepavali!', festival: 'diwali' })).toEqual([]);
    expect(validateMoment({ blessing: 'x', festival: 'diwali' }).length).toBeGreaterThan(0);
    expect(validateMoment({ blessing: 'x'.repeat(141), festival: 'diwali' }).length).toBeGreaterThan(0);
  });
  it('builds a festival_moment post', () => {
    const p = festivalMomentPost({
      blessing: 'Shubh Deepavali!',
      festival: 'diwali',
      authorUid: 'd1',
      authorName: 'Anjali',
      authorSanId: 'SAN-XYZ789',
      createdAt: 1,
    });
    expect(p.kind).toBe('festival_moment');
    expect(p.festival).toBe('diwali');
  });
  it('rail titles localize', () => {
    expect(momentsRailTitle('Diwali', 'en')).toMatch(/Festival Moments/);
    expect(momentsRailTitle('Diwali', 'bn')).toMatch(/🪔/);
  });
  it('festivalSlug is stable', () => {
    expect(festivalSlug({ nameEn: 'Maha Shivaratri' } as never)).toBe('maha-shivaratri');
    expect(festivalSlug({ nameEn: 'Durga Puja' } as never)).toBe('durga-puja');
  });
});
