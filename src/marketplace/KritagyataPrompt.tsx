/**
 * marketplace/KritagyataPrompt.tsx — Gratitude after seva (Phase 4).
 * ============================================================================
 * When a devotee confirms a seva booking as complete, they are gently
 * invited to share gratitude. Warm, never transactional: no stars, no
 * scores. "🙏 47 families shared gratitude."
 *
 * The prompt is optional and dismissible — gratitude can never feel
 * obligatory.
 */
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  validateGratitude,
  gratitudePost,
  type GratitudeDraft,
} from '../sangam/kritagyata';
import type { MarketplaceOrder } from '../lib/marketplace';

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  order: MarketplaceOrder;
  onDone: () => void;
}

export const KritagyataPrompt: React.FC<Props> = ({ order, onDone }) => {
  const { firebaseUser } = useAuthWorkspace();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  const share = async () => {
    if (busy || shared || !firebaseUser) return;
    const draft: GratitudeDraft = {
      message,
      orderId: order.id as string,
      providerUid: (order as unknown as { providerUid?: string }).providerUid || (order as unknown as { gigOwnerUid?: string }).gigOwnerUid || '',
      providerName: (order as unknown as { providerName?: string }).providerName || (order as unknown as { gigTitle?: string }).gigTitle || 'Sevak',
      authorUid: firebaseUser.uid,
      authorName: (firebaseUser as { displayName?: string }).displayName || 'Devotee',
      authorSanId: (firebaseUser as { sanId?: string }).sanId || '',
    };
    const violations = validateGratitude(draft);
    if (violations.length > 0) return;
    setBusy(true);
    try {
      const id = rid('post');
      const fields = gratitudePost({ draft, createdAt: Date.now() });
      // AUDIT FIX #1: `fields` is already whitelist-exact — spreading `id` in
      // caused silent rules rejection (id is not whitelisted).
      await setDoc(doc(db, 'sangamPosts', id), fields);
      setShared(true);
    } catch {
      /* best-effort — gratitude must never block */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
      {!shared ? (
        <>
          <p className="text-sm font-black text-stone-900 mb-1">🙏 Share your gratitude?</p>
          <p className="text-[12px] text-stone-500 mb-3">
            Your thanks becomes a blessing on the provider's wall. Optional — a quiet heart counts too.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A few heartfelt words… (optional)"
            rows={2}
            maxLength={500}
            className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 mb-2 bg-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={share}
              disabled={busy}
              className="min-h-[44px] flex-1 px-4 rounded-xl bg-amber-700 text-white font-bold text-sm hover:bg-amber-600 active:scale-[0.98] transition disabled:opacity-50"
            >
              {busy ? 'Sharing…' : '🙏 Share gratitude'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="min-h-[44px] px-4 rounded-xl bg-white border border-stone-200 text-stone-500 font-bold text-sm hover:bg-stone-50 transition"
            >
              Maybe later
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm font-black text-emerald-800">🙏 Dhanyavaad! Your gratitude is shared.</p>
          <button
            type="button"
            onClick={onDone}
            className="mt-2 min-h-[44px] px-6 rounded-xl bg-white border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
