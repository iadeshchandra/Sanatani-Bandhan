/**
 * social/SafetyList.tsx — "Blocked & muted" management list (Step 5).
 * ============================================================================
 * Mounted in Settings/Profile. Lets users review and undo block/mute.
 * Warm language throughout — this is about their peace, not punishment.
 */
import React, { useEffect, useState } from 'react';
import { Card, Btn, useLocaleText, T, EmptyState } from '../sangam/ui';
import { subscribeSafetyLists, unblockUser, unmuteUser } from './safetyService';

export const SafetyList: React.FC<{ uid: string }> = ({ uid }) => {
  const { tr } = useLocaleText();
  const [blocked, setBlocked] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(
    () => subscribeSafetyLists(uid, (b, m) => {
      setBlocked([...b]);
      setMuted([...m]);
    }),
    [uid],
  );

  const undo = async (kind: 'block' | 'mute', targetUid: string) => {
    setBusy(targetUid);
    try {
      if (kind === 'block') await unblockUser(uid, targetUid);
      else await unmuteUser(uid, targetUid);
    } finally { setBusy(null); }
  };

  if (blocked.length === 0 && muted.length === 0) {
    return (
      <EmptyState
        icon="🕊️"
        title={tr('All peaceful here', 'এখানে সব শান্ত', 'यहाँ सब शांत है')}
        body={tr('Anyone you block or mute will appear here.', 'যাদের ব্লক বা মিউট করবেন তারা এখানে দেখা যাবে।', 'जिन्हें ब्लॉक या म्यूट करेंगे वे यहाँ दिखेंगे।')}
      />
    );
  }

  const row = (kind: 'block' | 'mute', targetUid: string) => (
    <div key={`${kind}:${targetUid}`} className="flex items-center gap-3 py-3 border-b border-stone-50 last:border-0">
      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg shrink-0" aria-hidden>
        {kind === 'block' ? '🚫' : '🔇'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-stone-600 truncate">{targetUid.slice(0, 12)}…</div>
        <div className="text-[11px] text-stone-400">
          {kind === 'block'
            ? <T en="Blocked — hidden everywhere" bn="ব্লক করা — সর্বত্র লুকানো" hi="ब्लॉक — हर जगह छिपा" />
            : <T en="Muted — posts hidden" bn="মিউট করা — পোস্ট লুকানো" hi="म्यूट — पोस्ट छिपे" />}
        </div>
      </div>
      <button
        onClick={() => undo(kind, targetUid)}
        disabled={busy === targetUid}
        className="px-4 py-2 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 min-h-[44px]"
      >
        <T en="Undo" bn="ফিরান" hi="वापस लें" />
      </button>
    </div>
  );

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800 mb-2">
        🕊️ <T en="Blocked & muted" bn="ব্লক ও মিউট" hi="ब्लॉक और म्यूट" />
      </h3>
      <p className="text-xs text-stone-500 mb-3">
        <T
          en="Your quiet list. They are never told."
          bn="আপনার শান্ত তালিকা। তাদের কখনো জানানো হয় না।"
          hi="आपकी शांत सूची। उन्हें कभी बताया नहीं जाता।"
        />
      </p>
      {blocked.map((u) => row('block', u))}
      {muted.map((u) => row('mute', u))}
    </Card>
  );
};
