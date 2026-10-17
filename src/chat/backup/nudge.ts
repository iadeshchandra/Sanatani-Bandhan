/**
 * chat/backup/nudge.ts — the gentle 30-day reminder.
 * ================================================
 * Nudge, never nag: one calm Suchana card when the user's words have gone
 * unsealed for 30+ days. Dedupe-keyed so it fires at most once per window.
 */
import { emitNotify } from '../../notifications/emit';
import { readBackupMeta } from './backupService';

const NUDGE_AFTER_MS = 30 * 86400_000;
const NUDGE_STATE_KEY = 'sb.chatBackup.lastNudgeAt';

function lastNudgeAt(): number {
  try {
    return Number(localStorage.getItem(NUDGE_STATE_KEY) || '0');
  } catch {
    return 0;
  }
}

function setLastNudgeAt(t: number): void {
  try {
    localStorage.setItem(NUDGE_STATE_KEY, String(t));
  } catch {
    /* ignore */
  }
}

/**
 * Check and emit the 30-day backup nudge. Safe to call on every Chat open —
 * it self-throttles via the nudge window and the NotificationCenter dedupe.
 */
export async function checkBackupNudge(uid: string): Promise<void> {
  try {
    const meta = readBackupMeta();
    // Only nudge users who set up the seal but drifted — never strangers.
    if (!meta.sealReady) return;
    const now = Date.now();
    const lastBackup = meta.lastBackupAt || 0;
    if (now - lastBackup < NUDGE_AFTER_MS) return;
    if (now - lastNudgeAt() < NUDGE_AFTER_MS) return;

    await emitNotify(uid, {
      kind: 'chat',
      priority: 'gentle',
      title: {
        en: 'Your words await their seal',
        bn: 'আপনার কথা সিলমোহরের অপেক্ষায়',
        hi: 'आपके शब्द मुहर की प्रतीक्षा में',
      },
      body: {
        en: 'It has been a while since your conversations were backed up. A quiet moment now keeps them safe.',
        bn: 'আপনার কথোপকথন ব্যাকআপ নেওয়ার পর অনেকদিন হয়ে গেছে। এখন একটু শান্ত মুহূর্ত সেগুলো নিরাপদ রাখবে।',
        hi: 'आपकी बातचीत का बैकअप लिए हुए काफ़ी समय हो गया। अभी एक शांत क्षण उन्हें सुरक्षित रखेगा।',
      },
      dedupeKey: `chat-backup-nudge:${Math.floor(now / NUDGE_AFTER_MS)}`,
      deepLink: 'sanatani:chat-backup',
      payload: { module: 'chatBackup' },
    });
    setLastNudgeAt(now);
  } catch {
    /* a nudge must never break chat */
  }
}
