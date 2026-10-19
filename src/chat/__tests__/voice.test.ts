/**
 * voice.test.ts — voice-note pure logic.
 * ======================================
 * Recording state machine, mime-type picking, duration formatting,
 * voiceMeta validation, draft keys, language normalization.
 */
import {
  VOICE_MAX_MS,
  VOICE_MIN_MS,
  pickVoiceMimeType,
  formatVoiceDuration,
  buildVoiceMeta,
  isValidVoiceMeta,
  voiceDraftKey,
  nextVoiceRecState,
  toVoiceLang,
  voicePreviewText,
} from '../voice';

describe('pickVoiceMimeType', () => {
  beforeAll(() => {
    // jsdom ships no MediaRecorder; stub the constructor so the
    // mime-picking logic (not the recording itself) is testable.
    (global as unknown as Record<string, unknown>).MediaRecorder = function () {};
  });
  afterAll(() => {
    delete (global as unknown as Record<string, unknown>).MediaRecorder;
  });

  it('returns empty string when MediaRecorder is unavailable', () => {
    const g = global as unknown as Record<string, unknown>;
    const saved = g.MediaRecorder;
    delete g.MediaRecorder;
    try {
      expect(pickVoiceMimeType(() => true)).toBe('');
    } finally {
      g.MediaRecorder = saved;
    }
  });

  it('returns empty string when no mime type is supported', () => {
    expect(pickVoiceMimeType(() => false)).toBe('');
  });

  it('prefers opus-in-webm when supported', () => {
    const seen: string[] = [];
    const result = pickVoiceMimeType((mime) => {
      seen.push(mime);
      return true;
    });
    expect(result).toBe('audio/webm;codecs=opus');
    expect(seen[0]).toBe('audio/webm;codecs=opus');
  });

  it('falls back to audio/mp4 (iOS Safari) when webm is unsupported', () => {
    const result = pickVoiceMimeType(
      (mime) => mime === 'audio/mp4',
    );
    expect(result).toBe('audio/mp4');
  });

  it('skips mime types that throw in the support check', () => {
    const result = pickVoiceMimeType((mime) => {
      if (mime.includes('webm')) throw new Error('boom');
      return true;
    });
    expect(result).toBe('audio/mp4');
  });
});

describe('formatVoiceDuration', () => {
  it('formats seconds without leading zero on minutes', () => {
    expect(formatVoiceDuration(7000)).toBe('0:07');
    expect(formatVoiceDuration(83000)).toBe('1:23');
    expect(formatVoiceDuration(120000)).toBe('2:00');
  });

  it('clamps negatives to 0:00', () => {
    expect(formatVoiceDuration(-500)).toBe('0:00');
  });
});

describe('isValidVoiceMeta', () => {
  const good = buildVoiceMeta('vault://abc123', 45000, 'audio/webm');

  it('accepts a well-formed voiceMeta', () => {
    expect(isValidVoiceMeta(good)).toBe(true);
  });

  it('rejects non-vault URLs (never bytes, never http)', () => {
    expect(
      isValidVoiceMeta({ ...good, vaultUrl: 'https://evil.example/x.webm' }),
    ).toBe(false);
    expect(isValidVoiceMeta({ ...good, vaultUrl: '' })).toBe(false);
  });

  it('rejects too-short and too-long durations', () => {
    expect(
      isValidVoiceMeta({ ...good, durationMs: VOICE_MIN_MS - 1 }),
    ).toBe(false);
    expect(
      isValidVoiceMeta({ ...good, durationMs: VOICE_MAX_MS + 6000 }),
    ).toBe(false);
  });

  it('rejects non-audio content types', () => {
    expect(isValidVoiceMeta({ ...good, contentType: 'video/mp4' })).toBe(false);
    expect(isValidVoiceMeta({ ...good, contentType: '' })).toBe(false);
  });

  it('rejects nulls and non-objects', () => {
    expect(isValidVoiceMeta(null)).toBe(false);
    expect(isValidVoiceMeta(undefined)).toBe(false);
    expect(isValidVoiceMeta('vault://abc')).toBe(false);
  });
});

describe('nextVoiceRecState', () => {
  it('walks the happy path: idle → recording → preview → sending → idle', () => {
    expect(nextVoiceRecState('idle', 'start')).toBe('recording');
    expect(nextVoiceRecState('recording', 'stop')).toBe('preview');
    expect(nextVoiceRecState('preview', 'send')).toBe('sending');
    expect(nextVoiceRecState('sending', 'sent')).toBe('idle');
  });

  it('cancel always returns to idle', () => {
    expect(nextVoiceRecState('recording', 'cancel')).toBe('idle');
    expect(nextVoiceRecState('preview', 'cancel')).toBe('idle');
  });

  it('fail returns to preview so the recording is not lost', () => {
    expect(nextVoiceRecState('sending', 'fail')).toBe('preview');
  });

  it('rerecord goes back to idle to start over', () => {
    expect(nextVoiceRecState('preview', 'rerecord')).toBe('idle');
  });

  it('ignores invalid transitions (no state corruption)', () => {
    expect(nextVoiceRecState('idle', 'send')).toBe('idle');
    expect(nextVoiceRecState('recording', 'start')).toBe('recording');
    expect(nextVoiceRecState('idle', 'stop')).toBe('idle');
  });
});

describe('helpers', () => {
  it('voiceDraftKey is namespaced per chat', () => {
    expect(voiceDraftKey('chat1')).toBe('voice-draft:chat1');
    expect(voiceDraftKey('chat1')).not.toBe(voiceDraftKey('chat2'));
  });

  it('toVoiceLang normalizes to the trilingual set', () => {
    expect(toVoiceLang('bn')).toBe('bn');
    expect(toVoiceLang('hi')).toBe('hi');
    expect(toVoiceLang('en')).toBe('en');
    expect(toVoiceLang('ta')).toBe('en'); // 7 other langs fall back to EN
    expect(toVoiceLang(undefined)).toBe('en');
  });

  it('voicePreviewText is the warm thread-list label', () => {
    expect(voicePreviewText()).toBe('🎙️ Voice note');
  });

  it('VOICE_MAX_MS is 2 minutes', () => {
    expect(VOICE_MAX_MS).toBe(120000);
  });
});
