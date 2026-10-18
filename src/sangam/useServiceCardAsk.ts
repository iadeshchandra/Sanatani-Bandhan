/* Seva Bazar — shared "Ask the provider" chat handoff.
 * =====================================================================
 * "🙏 Ask Panditji" → provider chat thread with a warm pre-filled
 * opener (the card travels as context in the opener text). The opener
 * is sent ONLY on a fresh thread — tapping Ask on an existing thread
 * just reopens it, never spams the provider.
 */

import { useState } from 'react';
import type { ServiceCardDetails } from './types';
import { serviceCardAskOpener } from './serviceCard';
import { getOrCreateDirectChat, sendMessage, getThread } from '../chat/chatService';
import type { ChatParticipant } from '../chat/types';
import { useToast } from '../context/ToastContext';

export function useServiceCardAsk() {
  const { showToast } = useToast();
  const [asking, setAsking] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const ask = async (
    card: ServiceCardDetails,
    viewer: { uid: string; name: string },
    lang: 'en' | 'hi' | 'bn'
  ) => {
    if (asking) return;
    if (viewer.uid === 'anon') {
      showToast(
        lang === 'bn' ? 'চ্যাট করতে সাইন ইন করুন 🙏' : lang === 'hi' ? 'चैट के लिए साइन इन करें 🙏' : 'Please sign in to chat 🙏',
        'error'
      );
      return;
    }
    setAsking(true);
    try {
      const selfInfo: ChatParticipant = { uid: viewer.uid, displayName: viewer.name || 'Sanatani' };
      const providerInfo: ChatParticipant = { uid: card.providerUid, displayName: card.providerName };
      const id = await getOrCreateDirectChat(viewer.uid, card.providerUid, selfInfo, providerInfo);
      try {
        const thread = await getThread(id);
        if (!thread?.lastMessage) {
          await sendMessage(id, viewer.uid, 'text', serviceCardAskOpener(card, lang));
        }
      } catch {
        /* offline or unreadable — just open the thread */
      }
      setChatId(id);
      setChatOpen(true);
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ||
          (lang === 'bn' ? 'চ্যাট খোলা যায়নি' : lang === 'hi' ? 'चैट नहीं खुला' : 'Could not open chat'),
        'error'
      );
    } finally {
      setAsking(false);
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatId(null);
  };

  return { ask, asking, chatId, chatOpen, closeChat };
}
