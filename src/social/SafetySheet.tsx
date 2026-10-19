/**
 * social/SafetySheet.tsx — Block / Mute action sheet (Step 5: user safety).
 * ============================================================================
 * Warm, non-punitive language. The target is NEVER notified.
 * Used from: post ⋯ menu (FeedTab), DevoteeProfile ⋯ button.
 */
import React, { useState } from 'react';
import { Modal, Btn, useLocaleText, T } from '../sangam/ui';
import { blockUser, muteUser } from './safetyService';

export const SafetySheet: React.FC<{
  viewerUid: string;
  targetUid: string;
  targetName: string;
  onClose: () => void;
  onDone?: (action: 'blocked' | 'muted') => void;
  /** Optional: also offer content reporting from the same menu. */
  onReport?: () => void;
}> = ({ viewerUid, targetUid, targetName, onClose, onDone, onReport }) => {
  const { tr } = useLocaleText();
  const [confirm, setConfirm] = useState<'block' | 'mute' | null>(null);
  const [busy, setBusy] = useState(false);

  const doBlock = async () => {
    setBusy(true);
    try { await blockUser(viewerUid, targetUid); onDone?.('blocked'); } finally { setBusy(false); onClose(); }
  };
  const doMute = async () => {
    setBusy(true);
    try { await muteUser(viewerUid, targetUid); onDone?.('muted'); } finally { setBusy(false); onClose(); }
  };

  if (confirm) {
    const isBlock = confirm === 'block';
    return (
      <Modal onClose={() => setConfirm(null)} title={<T en={isBlock ? 'Block' : 'Mute'} bn={isBlock ? 'ব্লক' : 'মিউট'} hi={isBlock ? 'ब्लॉक' : 'म्यूट'} />}>
        <p className="text-sm text-stone-700 leading-relaxed">
          {isBlock
            ? tr(
              `You won't see ${targetName}'s posts or messages anymore. They won't be told. You can undo this anytime in Settings.`,
              `${targetName}-এর পোস্ট বা বার্তা আর দেখতে পাবেন না। তাদের জানানো হবে না। সেটিংস থেকে যেকোনো সময় ফিরিয়ে নিতে পারেন।`,
              `${targetName} के पोस्ट या संदेश अब नहीं दिखेंगे। उन्हें बताया नहीं जाएगा। सेटिंग्स से कभी भी वापस ले सकते हैं।`,
            )
            : tr(
              `You won't see ${targetName}'s posts in your feed anymore. You can still message each other. They won't be told.`,
              `ফিডে ${targetName}-এর পোস্ট আর দেখতে পাবেন না। বার্তা আদান-প্রদান চালু থাকবে। তাদের জানানো হবে না।`,
              `फ़ीड में ${targetName} के पोस्ट अब नहीं दिखेंगे। संदेश भेजना जारी रहेगा। उन्हें बताया नहीं जाएगा।`,
            )}
        </p>
        <div className="flex gap-3 mt-5">
          <Btn onClick={() => setConfirm(null)} className="!bg-stone-100 !text-stone-700 flex-1">
            <T en="Keep as is" bn="যেমন আছে" hi="जैसा है" />
          </Btn>
          <Btn onClick={isBlock ? doBlock : doMute} disabled={busy} className="flex-1">
            {isBlock
              ? <T en="Block quietly" bn="নীরবে ব্লক" hi="चुपचाप ब्लॉक" />
              : <T en="Mute quietly" bn="নীরবে মিউট" hi="चुपचाप म्यूट" />}
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={<T en="Your space, your peace" bn="আপনার জায়গা, আপনার শান্তি" hi="आपकी जगह, आपकी शांति" />}>
      <button
        onClick={() => setConfirm('mute')}
        className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-stone-50 border border-stone-100 mb-2 min-h-[44px]"
      >
        <div className="font-bold text-stone-800 text-sm">🔇 <T en="Mute" bn="মিউট" hi="म्यूट" /> {targetName}</div>
        <div className="text-xs text-stone-500 mt-0.5">
          <T en="Hide their posts. Messaging still works." bn="তাদের পোস্ট লুকান। বার্তা চালু থাকবে।" hi="उनके पोस्ट छिपाएं। संदेश जारी रहेगा।" />
        </div>
      </button>
      <button
        onClick={() => setConfirm('block')}
        className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-stone-50 border border-stone-100 min-h-[44px]"
      >
        <div className="font-bold text-stone-800 text-sm">🚫 <T en="Block" bn="ব্লক" hi="ब्लॉक" /> {targetName}</div>
        <div className="text-xs text-stone-500 mt-0.5">
          <T en="Hide their posts and stop messages. They won't know." bn="তাদের পোস্ট লুকান ও বার্তা বন্ধ করুন। তারা জানবে না।" hi="उनके पोस्ट छिपाएं और संदेश रोकें। उन्हें पता नहीं चलेगा।" />
        </div>
      </button>
      {onReport && (
        <button
          onClick={() => { onClose(); onReport(); }}
          className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-stone-50 border border-stone-100 mt-2 min-h-[44px]"
        >
          <div className="font-bold text-stone-800 text-sm">⚠️ <T en="Report this post" bn="এই পোস্ট রিপোর্ট করুন" hi="इस पोस्ट की रिपोर्ट करें" /></div>
          <div className="text-xs text-stone-500 mt-0.5">
            <T en="Tell our moderators about a problem." bn="সমস্যা সম্পর্কে আমাদের মডারেটরদের জানান।" hi="समस्या के बारे में हमारे मॉडरेटरों को बताएं।" />
          </div>
        </button>
      )}
    </Modal>
  );
};
