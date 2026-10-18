/* Seva Bazar Phase 2 — booking orchestration hook.
 * =====================================================================
 * Owns the booking journey state: booking sheet → chat thread →
 * provider "Received ✓" handshake. Reuses the chat primitives
 * (getOrCreateDirectChat / sendMessage) and the EXISTING order
 * lifecycle (orderTransition paid → accepted).
 */

import { useState } from 'react';
import type { SangamPost } from './types';
import type { ReceiptMeta } from '../chat/types';
import { sendMessage } from '../chat/chatService';
import { orderTransition } from '../lib/marketplace';
import { useToast } from '../context/ToastContext';

export function useSevaBooking(viewer: { uid: string; name: string }, lang: 'en' | 'hi' | 'bn') {
  const { showToast } = useToast();
  const [bookingPost, setBookingPost] = useState<SangamPost | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const openBooking = (post: SangamPost) => setBookingPost(post);
  const closeBooking = () => setBookingPost(null);

  const handleBooked = (orderId: string, cid: string) => {
    setBookingPost(null);
    setChatId(cid);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatId(null);
  };

  /**
   * Provider taps "Received ✓" on a token-advance receipt: a warm
   * handshake message in the thread + the order's paid → accepted
   * transition (existing rail2 lifecycle — the muhurat is now held).
   * The handshake message is the durable record; the order move is
   * bookkeeping that fails gently.
   */
  const confirmReceipt = async (receipt: ReceiptMeta, cid: string, confirmerUid: string) => {
    if (confirming) return;
    setConfirming(true);
    try {
      const msg =
        lang === 'bn'
          ? `🙏 প্রাপ্তি নিশ্চিত — আপনার মুহূর্ত সংরক্ষিত রইল। শীঘ্রই সামগ্রী ও সময় নিয়ে কথা হবে। 🪔`
          : lang === 'hi'
            ? `🙏 प्राप्ति सुनिश्चित — आपका मुहूर्त सुरक्षित रहा। सामग्री और समय पर शीघ्र बात होगी। 🪔`
            : `🙏 Received with thanks — your muhurat is held. We'll speak soon about samagri and timing. 🪔`;
      await sendMessage(cid, confirmerUid, 'text', msg);
      try {
        await orderTransition(receipt.orderId, 'accepted');
      } catch (e: unknown) {
        showToast(
          (e as Error)?.message ||
            (lang === 'bn'
              ? 'বার্তা গেছে, কিন্তু বুকিং অবস্থা বদলায়নি — ডেস্ক থেকে আবার চেষ্টা করুন।'
              : lang === 'hi'
                ? 'संदेश गया, पर बुकिंग स्थिति नहीं बदली — डेस्क से पुनः प्रयास करें।'
                : 'Message sent, but the booking status did not move — please retry from your desk.'),
          'warning'
        );
      }
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ||
          (lang === 'bn' ? 'নিশ্চিত করা যায়নি' : lang === 'hi' ? 'पुष्टि नहीं हो पाई' : 'Could not confirm receipt'),
        'error'
      );
    } finally {
      setConfirming(false);
    }
  };

  return {
    bookingPost,
    openBooking,
    closeBooking,
    handleBooked,
    chatId,
    chatOpen,
    closeChat,
    confirming,
    confirmReceipt,
  };
}
