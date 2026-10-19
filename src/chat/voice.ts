/**
 * chat/voice.ts — voice notes: pure logic, no Firebase, fully unit-testable.
 * ========================================================================
 * Recording → File Vault (category 'voice') → message with voiceMeta.
 *
 * STANDING LAW: the message's voiceMeta carries only a `vault://` pointer —
 * never audio bytes. Bytes live in the File Vault (visibility 'public',
 * readable by any logged-in user; the pointer itself travels only inside
 * chat messages, which rules gate to thread participants).
 */

/** Maximum voice-note length: 2 minutes. */
export const VOICE_MAX_MS = 2 * 60 * 1000;

/** Below this, a recording is too short to bother sending. */
export const VOICE_MIN_MS = 1000;

/** Mime-type preference order: opus-in-webm first, iOS Safari's mp4 next. */
const VOICE_MIME_PREFERENCE = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const;

/**
 * Pick the best supported mime type for recording. Falls back gracefully;
 * returns '' when MediaRecorder is unavailable (caller must handle).
 */
export function pickVoiceMimeType(
  isTypeSupported?: (mimeType: string) => boolean,
): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const check =
    isTypeSupported ??
    ((mime: string) =>
      typeof MediaRecorder.isTypeSupported === 'function'
        ? MediaRecorder.isTypeSupported(mime)
        : false);
  for (const mime of VOICE_MIME_PREFERENCE) {
    try {
      if (check(mime)) return mime;
    } catch {
      /* try the next one */
    }
  }
  return '';
}

/** "0:07", "1:23", "2:00" — warm, compact, no leading zero on minutes. */
export function formatVoiceDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Attachment payload carried on a voice message. */
export interface VoiceMeta {
  /** `vault://{fileId}` pointer — resolved via resolveVaultUrl(). */
  vaultUrl: string;
  /** Recording length in milliseconds. */
  durationMs: number;
  /** Recorder's mime type, e.g. 'audio/webm'. */
  contentType: string;
}

/** Thread-list preview text for a voice message. */
export function voicePreviewText(): string {
  return '🎙️ Voice note';
}

/** Build the voiceMeta for a finished recording. */
export function buildVoiceMeta(
  vaultUrl: string,
  durationMs: number,
  contentType: string,
): VoiceMeta {
  return { vaultUrl, durationMs: Math.round(durationMs), contentType };
}

/**
 * Shape check: is this voiceMeta safe to write to Firestore?
 * (The chats/messages rules carry no field whitelist, but fail-closed
 * validation keeps malformed attachments out of the thread.)
 */
export function isValidVoiceMeta(meta: unknown): meta is VoiceMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m.vaultUrl === 'string' &&
    m.vaultUrl.startsWith('vault://') &&
    typeof m.durationMs === 'number' &&
    m.durationMs >= VOICE_MIN_MS &&
    m.durationMs <= VOICE_MAX_MS + 5000 &&
    typeof m.contentType === 'string' &&
    m.contentType.startsWith('audio/')
  );
}

/** IndexedDB key for a crash-surviving recording draft. */
export function voiceDraftKey(chatId: string): string {
  return `voice-draft:${chatId}`;
}

/** Recording state machine states. */
export type VoiceRecState = 'idle' | 'recording' | 'preview' | 'sending';

/** Pure transition helper — keeps the recorder UI honest. */
export function nextVoiceRecState(
  current: VoiceRecState,
  event: 'start' | 'stop' | 'send' | 'rerecord' | 'cancel' | 'sent' | 'fail',
): VoiceRecState {
  switch (event) {
    case 'start':
      return current === 'idle' ? 'recording' : current;
    case 'stop':
      return current === 'recording' ? 'preview' : current;
    case 'send':
      return current === 'preview' ? 'sending' : current;
    case 'sent':
    case 'cancel':
      return 'idle';
    case 'rerecord':
      return current === 'preview' ? 'idle' : current;
    case 'fail':
      return current === 'sending' ? 'preview' : current;
    default:
      return current;
  }
}

/** Normalize any app language to the trilingual voice-note set. */
export function toVoiceLang(lang: string | undefined): 'en' | 'bn' | 'hi' {
  return lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
}

/** Trilingual mic-button labels. */
export const VOICE_COPY: Record<
  string,
  Record<'en' | 'bn' | 'hi', string>
> = {
  recordVoice: {
    en: 'Record a voice note',
    bn: 'ভয়েস নোট রেকর্ড করুন',
    hi: 'वॉइस नोट रिकॉर्ड करें',
  },
  stopRecording: { en: 'Stop', bn: 'থামুন', hi: 'रोकें' },
  sendVoice: { en: 'Send', bn: 'পাঠান', hi: 'भेजें' },
  rerecord: { en: 'Re-record', bn: 'আবার রেকর্ড', hi: 'फिर से रिकॉर्ड' },
  discard: { en: 'Discard', bn: 'বাদ দিন', hi: 'हटाएं' },
  recording: { en: 'Recording…', bn: 'রেকর্ড হচ্ছে…', hi: 'रिकॉर्ड हो रहा…' },
  micBlocked: {
    en: 'Microphone is blocked — voice notes need mic access. You can still type.',
    bn: 'মাইক্রোফোন বন্ধ আছে — ভয়েস নোটের জন্য মাইকের অনুমতি দিন। আপনি লিখতে পারেন।',
    hi: 'माइक्रोफ़ोन बंद है — वॉइस नोट के लिए माइक की अनुमति दें। आप लिख सकते हैं।',
  },
  tooShort: {
    en: 'Too short — hold the mic a moment longer 🙏',
    bn: 'খুব ছোট — একটু ধরে রাখুন 🙏',
    hi: 'बहुत छोटा — थोड़ी देर और बोलें 🙏',
  },
};
