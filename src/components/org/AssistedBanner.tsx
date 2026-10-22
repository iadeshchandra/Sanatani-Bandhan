import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  endAssistedSession,
  getAssistedSession,
  loadAssistedSession,
  subscribeAssistedSession,
  type AssistedSession,
} from '../../lib/assistedSession';
import { registerAssistedAuditStamping } from '../../lib/assistedAuditWiring';

/**
 * AssistedBanner — Blueprint D, deliverable 4: the persistent
 * assisted-session indicator. Mounting it also performs the two
 * session duties: loading any stored session for the signed-in
 * owner, and registering the audit recorder's assisted-by provider
 * (lib/assistedSession) — so every commit this session makes is
 * honestly stamped in the audit stream while the banner is up.
 *
 * The banner names the helper and offers the owner a one-tap End.
 * It renders nothing when no session is live. Nothing about the
 * session is shared with the helper's own account — there is no
 * second account involved at all.
 */
export const AssistedBanner: React.FC = () => {
  const { user } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const [session, setSession] = useState<AssistedSession | null>(null);

  useEffect(() => {
    registerAssistedAuditStamping();
    if (user?.uid) setSession(loadAssistedSession(user.uid));
    else setSession(getAssistedSession());
    return subscribeAssistedSession(setSession);
  }, [user?.uid]);

  if (!session) return null;
  return (
    <div className="shrink-0 bg-teal-700 text-white px-4 py-2.5" role="status">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <HeartHandshake className="w-5 h-5 shrink-0" aria-hidden />
        <p className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
          {safeTranslate(
            'assisted_banner',
            `Assisted session — ${session.helperName} is helping on this account. Actions are recorded with their help noted.`,
            `সহায়তা সেশন — ${session.helperName} এই অ্যাকাউন্টে সাহায্য করছেন। কাজগুলো তাঁর সহায়তার উল্লেখসহ লিপিবদ্ধ হচ্ছে।`,
            `सहायता सत्र — ${session.helperName} इस खाते पर सहायता कर रहे हैं। कार्य उनकी सहायता के उल्लेख सहित दर्ज हो रहे हैं।`,
          )}
        </p>
        <button
          type="button"
          onClick={() => endAssistedSession(session.ownerUid)}
          className="shrink-0 min-h-[44px] px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-black transition-colors"
        >
          {safeTranslate('assisted_banner_end', 'End session', 'সেশন শেষ করুন', 'सत्र समाप्त करें')}
        </button>
      </div>
    </div>
  );
};

export default AssistedBanner;
