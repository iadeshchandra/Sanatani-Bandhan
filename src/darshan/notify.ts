/**
 * darshan/notify.ts — "temple is live" notifications.
 * ============================================================================
 * GENTLE priority: respects quiet hours (no 4am darshan wake-ups).
 * Dedupe key per org per live session: one notification per stream,
 * not one per poll.
 */
import { NotificationCenter } from '../notifications/NotificationCenter';
import { dt, fill, type Lang } from './i18n';

interface LiveNotifParams {
  orgId: string;
  templeName: string;
  videoId: string;
  /** Epoch ms when this stream started — part of the dedupe key. */
  startedAt?: number;
  lang?: Lang;
  deepLink?: string;
}

/** Emit a GENTLE "temple is live" notification. Never throws. */
export async function notifyTempleLive(params: LiveNotifParams): Promise<void> {
  const { orgId, templeName, lang = 'en', deepLink, startedAt } = params;
  try {
    await NotificationCenter.get().emit({
      kind: 'darshan_live',
      priority: 'gentle',
      title: {
        en: fill(dt('darshan.liveNotifTitle', 'en'), { temple: templeName }),
        hi: fill(dt('darshan.liveNotifTitle', 'hi'), { temple: templeName }),
        bn: fill(dt('darshan.liveNotifTitle', 'bn'), { temple: templeName }),
      },
      body: {
        en: fill(dt('darshan.liveNotifBody', 'en'), { temple: templeName }),
        hi: fill(dt('darshan.liveNotifBody', 'hi'), { temple: templeName }),
        bn: fill(dt('darshan.liveNotifBody', 'bn'), { temple: templeName }),
      },
      dedupeKey: `darshan_live:${orgId}:${startedAt ?? 'unknown'}`,
      deepLink: deepLink ?? `/org/${orgId}/darshan`,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000, // meaningless after 6h
    });
  } catch {
    /* notifications never break the app */
  }
}
