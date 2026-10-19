/**
 * ChatThread.tsx — the full conversation view.
 * =============================================================
 * Warm bubbles (amber/stone — never corporate blue). Own messages
 * right-aligned saffron; theirs left-aligned warm white.
 * States: sent ✓ → delivered ✓✓ → read (subtle warm grey).
 * Typing indicator, date dividers, blessing picker, and a request
 * button whose money-request wiring lands in Phase 2.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, T, useLocaleText } from "../solo/ui";
import {
  clearTyping,
  markDelivered,
  markRead,
  sendMessage,
  setTyping,
  type ChatThreadLive,
} from "./chatService";
import { markChatOpen, useChatMessages } from "./useChat";
import { MessageListSkeleton } from "./ChatSkeletons";
import { BlessingCard, BLESSING_OCCASIONS } from "./BlessingCard";
import { ChatAvatar, VerifiedBadge, formatChatTime } from "./ChatList";
import RequestModal, { type RequestRecipient } from "./RequestModal";
import { RequestCardLoader } from "./MoneyRequestCard";
import { ReceiptCard } from "./ReceiptCard";
import { VoicePlayer } from "./VoicePlayer";
import { VoiceRecorder } from "./VoiceRecorder";
import { uploadFile } from "../lib/fileVault";
import { buildVoiceMeta, isValidVoiceMeta } from "./voice";
import { getOrgSenderRole } from "./p2pService";
import type { ChatMessage, ChatParticipant, ReceiptMeta } from "./types";

/* ------------------------------------------------------------------ */
/* Message state                                                       */
/* ------------------------------------------------------------------ */

type MsgState = "sent" | "delivered" | "read";

function messageState(
  msg: ChatMessage,
  thread: ChatThreadLive | null,
  uid: string,
): MsgState {
  if (msg.senderId !== uid || !thread) return "sent";
  const otherKeys = thread.participants.filter((p) => p !== uid);
  if (otherKeys.length === 0) return "sent";
  // Read if EVERY other participant's lastReadAt covers this message.
  const allRead = otherKeys.every(
    (k) => (thread.lastReadAt?.[k] ?? 0) >= msg.createdAt,
  );
  if (allRead) return "read";
  const anyDelivered = otherKeys.some(
    (k) => (thread.lastDeliveredAt?.[k] ?? 0) >= msg.createdAt,
  );
  return anyDelivered ? "delivered" : "sent";
}

const StateTicks: React.FC<{ state: MsgState }> = ({ state }) => {
  if (state === "read")
    return (
      <span className="text-amber-700/70 text-xs font-bold" aria-label="Read">
        ✓✓
      </span>
    );
  if (state === "delivered")
    return (
      <span className="text-stone-400 text-xs font-bold" aria-label="Delivered">
        ✓✓
      </span>
    );
  return (
    <span className="text-stone-400 text-xs" aria-label="Sent">
      ✓
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Date dividers                                                       */
/* ------------------------------------------------------------------ */

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: number, lang: string): string {
  const locale = lang === "bn" ? "bn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (d.getTime() >= startOfToday)
    return lang === "bn" ? "আজ" : lang === "hi" ? "आज" : "Today";
  if (d.getTime() >= startOfToday - 86400000)
    return lang === "bn" ? "গতকাল" : lang === "hi" ? "कल" : "Yesterday";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Blessing picker                                                     */
/* ------------------------------------------------------------------ */

const BlessingPicker: React.FC<{
  onPick: (occasionKey: string) => void;
  onClose: () => void;
}> = ({ onPick, onClose }) => {
  const { lang } = useLocaleText();
  return (
    <Modal
      title={<T en="Send a blessing" bn="আশীর্বাদ পাঠান" hi="आशीर्वाद भेजें" />}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        {BLESSING_OCCASIONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onPick(b.key)}
            className={`rounded-2xl bg-gradient-to-br ${b.gradient} text-white p-4 text-left min-h-[88px] shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="text-2xl" aria-hidden>
              {b.emoji}
            </div>
            <div className="text-sm font-extrabold mt-1">
              {lang === "bn"
                ? b.labelBn
                : lang === "hi"
                  ? b.labelHi
                  : b.labelEn}
            </div>
            <div className={`text-xs ${b.accent} opacity-90`}>
              {b.greetingSa}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* ChatThread                                                          */
/* ------------------------------------------------------------------ */

export const ChatThread: React.FC<{
  uid: string;
  chatId: string;
  thread: ChatThreadLive | null;
  onBack: () => void;
  /** Seva Bazar Phase 2 — provider taps "Received ✓" on a receipt. */
  onReceiptConfirm?: (receipt: ReceiptMeta) => void;
}> = ({ uid, chatId, thread, onBack, onReceiptConfirm }) => {
  const { lang } = useLocaleText();
  const { messages, loading } = useChatMessages(chatId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [blessingOpen, setBlessingOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Step 5 (safety): for direct chats, either party blocking the other quiets the thread.
  const [chatBlocked, setChatBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherKey = thread
    ? (thread.participants.find((p) => p !== uid) ?? thread.participants[0])
    : null;
  const person: ChatParticipant | undefined =
    thread && otherKey ? thread.participantInfo[otherKey] : undefined;
  const otherTyping = Boolean(otherKey && thread?.typing?.[otherKey]);

  // Step 5 (safety): for direct chats, either party blocking the other quiets the thread.
  useEffect(() => {
    if (thread?.type !== 'direct' || !otherKey) { setChatBlocked(false); return; }
    let alive = true;
    (async () => {
      const { hasBlocked } = await import('../social/safetyService');
      const [a, b] = await Promise.all([hasBlocked(uid, otherKey), hasBlocked(otherKey, uid)]);
      if (alive) setChatBlocked(a || b);
    })();
    return () => { alive = false; };
  }, [thread?.type, otherKey, uid]);

  /* Phase 2 — money request wiring: recipient + org-sender context for RequestModal. */
  const recipient: RequestRecipient | null = useMemo(() => {
    if (!thread || !otherKey || !person) return null;
    if (thread.type === "org") {
      const orgId = person.orgId ?? otherKey;
      const orgName = person.orgName ?? person.displayName;
      return {
        id: otherKey,
        name: orgName,
        orgId,
        orgName,
        orgLogoUrl: person.orgLogoUrl,
      };
    }
    return {
      id: otherKey,
      name: person.displayName,
      photoUrl: person.photoUrl,
    };
  }, [thread, otherKey, person]);
  const [orgSender, setOrgSender] = useState<{
    orgId: string;
    orgName: string;
    orgLogoUrl?: string;
  } | null>(null);
  useEffect(() => {
    if (thread?.type !== "org" || !recipient?.orgId) {
      setOrgSender(null);
      return;
    }
    let alive = true;
    getOrgSenderRole(recipient.orgId, uid).then((role) => {
      if (alive) {
        setOrgSender(
          role
            ? {
                orgId: recipient.orgId as string,
                orgName: recipient.orgName ?? recipient.name,
                orgLogoUrl: recipient.orgLogoUrl,
              }
            : null,
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [thread?.type, recipient, uid]);
  const me: ChatParticipant | undefined = thread
    ? thread.participantInfo[uid]
    : undefined;

  // Recently active: subtle presence from lastReadAt (no separate presence system).
  const recentlyActive = useMemo(() => {
    if (!otherKey || !thread?.lastReadAt?.[otherKey]) return false;
    return Date.now() - thread.lastReadAt[otherKey] < 5 * 60 * 1000;
  }, [otherKey, thread]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  /* Tell the notification layer this thread is on screen (no buzz for it). */
  useEffect(() => {
    markChatOpen(chatId);
    return () => markChatOpen(null);
  }, [chatId]);

  /* Mark read + delivered when viewing (only when there's something new). */
  useEffect(() => {
    if (!thread || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const unread = thread.unreadCounts?.[uid] ?? 0;
    if (unread > 0 || latest.senderId !== uid) {
      markRead(chatId, uid).catch(() => {});
    }
    if ((thread.lastDeliveredAt?.[uid] ?? 0) < latest.createdAt) {
      markDelivered(chatId, uid).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, uid, messages.length]);

  /* Clear typing flag on unmount */
  useEffect(() => {
    return () => {
      clearTyping(chatId, uid);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [chatId, uid]);

  const handleDraftChange = (v: string) => {
    setDraft(v);
    setTyping(chatId, uid, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(chatId, uid, false), 2500);
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    setTyping(chatId, uid, false);
    try {
      await sendMessage(chatId, uid, "text", text);
    } catch {
      // Send failed — restore the draft so no word is lost.
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const sendBlessing = async (occasionKey: string) => {
    setBlessingOpen(false);
    if (sending) return;
    setSending(true);
    try {
      const b =
        BLESSING_OCCASIONS.find((x) => x.key === occasionKey) ??
        BLESSING_OCCASIONS[0];
      await sendMessage(chatId, uid, "blessing", b.greetingSa, {
        blessingMeta: {
          occasion: b.key,
          occasionBn: b.labelBn,
          occasionHi: b.labelHi,
        },
      });
    } catch {
      /* blessing failed to send — the picker simply closes, nothing lost */
    } finally {
      setSending(false);
    }
  };

  /** Voice note: blob → File Vault → message with voiceMeta. */
  const sendVoice = async (blob: Blob, durationMs: number) => {
    if (sending) return;
    setSending(true);
    try {
      // 'public' visibility: any logged-in user can resolve the pointer,
      // but the pointer itself travels only inside participant-gated messages.
      const { url } = await uploadFile(blob, {
        visibility: 'public',
        category: 'voice',
        ownerUid: uid,
        fileName: `voice-note-${Date.now()}.webm`,
      });
      const voiceMeta = buildVoiceMeta(url, durationMs, blob.type || 'audio/webm');
      if (!isValidVoiceMeta(voiceMeta)) throw new Error('chat: invalid voice attachment');
      await sendMessage(chatId, uid, 'voice', '', { voiceMeta });
    } finally {
      setSending(false);
    }
  };

  let lastDay = "";

  return (
    <div className="flex flex-col h-full bg-[#faf7f2]">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-amber-50 px-2 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 flex items-center justify-center text-xl"
        >
          ←
        </button>
        {person && <ChatAvatar person={person} size={40} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold truncate">
              {person?.displayName ?? "…"}
            </span>
            {person && <VerifiedBadge person={person} compact />}
          </div>
          <div className="text-[11px] text-amber-200/80 flex items-center gap-1">
            {otherTyping ? (
              <span className="italic">
                <T en="typing…" bn="লিখছেন…" hi="लिख रहे हैं…" />
              </span>
            ) : (
              <>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${recentlyActive ? "bg-emerald-300" : "bg-amber-200/40"}`}
                  aria-hidden
                />
                <span>
                  {recentlyActive ? (
                    <T
                      en="Recently active"
                      bn="সম্প্রতি সক্রিয়"
                      hi="हाल में सक्रिय"
                    />
                  ) : (
                    <T en="Sanatani" bn="সনাতনী" hi="सनातनी" />
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {loading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="text-4xl mb-3" aria-hidden>
              🙏
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">
              <T
                en="Begin with a blessing. Every word here is between verified Sanatanis."
                bn="একটি আশীর্বাদ দিয়ে শুরু করুন। এখানকার প্রতিটি কথা যাচাইকৃত সনাতনীদের মধ্যে।"
                hi="आशीर्वाद से शुरुआत करें। यहां का हर शब्द सत्यापित सनातनियों के बीच है।"
              />
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === uid;
            const dk = dayKey(m.createdAt);
            const showDay = dk !== lastDay;
            lastDay = dk;
            return (
              <React.Fragment key={m.id}>
                {showDay && (
                  <div className="flex justify-center py-2">
                    <span className="text-[11px] font-bold text-stone-500 bg-stone-200/70 rounded-full px-3 py-1">
                      {dayLabel(m.createdAt, lang)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  {m.kind === "blessing" && m.blessingMeta ? (
                    <div className={`max-w-[80%] ${mine ? "ml-auto" : ""}`}>
                      <BlessingCard
                        occasion={m.blessingMeta.occasion}
                        compact
                      />
                      <div
                        className={`text-[10px] text-stone-400 mt-1 ${mine ? "text-right" : ""}`}
                      >
                        {formatChatTime(m.createdAt, lang)}{" "}
                        {mine && (
                          <StateTicks state={messageState(m, thread, uid)} />
                        )}
                      </div>
                    </div>
                  ) : m.kind === "request_card" ? (
                    <div className={`max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                      {m.requestId ? (
                        <RequestCardLoader
                          requestId={m.requestId}
                          currentUid={uid}
                        />
                      ) : (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
                          <div className="text-sm font-bold text-amber-900">
                            🙏 {m.text}
                          </div>
                        </div>
                      )}
                      <div
                        className={`text-[10px] text-stone-400 mt-1 ${mine ? "text-right" : ""}`}
                      >
                        {formatChatTime(m.createdAt, lang)}{" "}
                        {mine && (
                          <StateTicks state={messageState(m, thread, uid)} />
                        )}
                      </div>
                    </div>
                  ) : m.kind === "receipt" && m.receiptMeta ? (
                    <div className={`max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                      <ReceiptCard
                        receipt={m.receiptMeta}
                        viewerUid={uid}
                        onConfirm={onReceiptConfirm}
                      />
                      <div
                        className={`text-[10px] text-stone-400 mt-1 ${mine ? "text-right" : ""}`}
                      >
                        {formatChatTime(m.createdAt, lang)}{" "}
                        {mine && (
                          <StateTicks state={messageState(m, thread, uid)} />
                        )}
                      </div>
                    </div>
                  ) : m.kind === "voice" && m.voiceMeta ? (
                    <div className={`max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                      <div
                        className={`px-2.5 py-2 rounded-2xl shadow-sm ${
                          mine
                            ? "bg-gradient-to-br from-amber-600 to-orange-600 rounded-br-md"
                            : "bg-white border border-stone-200/70 rounded-bl-md"
                        }`}
                      >
                        <VoicePlayer meta={m.voiceMeta} mine={mine} lang={lang} />
                      </div>
                      <div
                        className={`text-[10px] text-stone-400 mt-1 ${mine ? "text-right" : ""}`}
                      >
                        {formatChatTime(m.createdAt, lang)}{" "}
                        {mine && (
                          <StateTicks state={messageState(m, thread, uid)} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                        mine
                          ? "bg-gradient-to-br from-amber-600 to-orange-600 text-amber-50 rounded-br-md"
                          : "bg-white text-stone-900 border border-stone-200/70 rounded-bl-md"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.text}
                      </div>
                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "justify-end text-amber-100/80" : "text-stone-400"}`}
                      >
                        {formatChatTime(m.createdAt, lang)}
                        {mine && (
                          <StateTicks state={messageState(m, thread, uid)} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator line */}
      {otherTyping && (
        <div className="px-4 pb-1 text-xs text-amber-700 italic shrink-0">
          {person?.displayName}{" "}
          <T en="is typing…" bn="লিখছেন…" hi="लिख रहे हैं…" />
        </div>
      )}

      {/* Input bar — Step 5 (safety): blocked chats show a banner, input disabled. */}
      {chatBlocked ? (
        <div className="shrink-0 bg-stone-50 border-t border-stone-200 px-4 py-4 text-center">
          <div className="text-2xl mb-1" aria-hidden>🕊️</div>
          <p className="text-sm text-stone-600">
            {lang === 'bn'
              ? 'এই কথোপকথনটি শান্ত রাখা হয়েছে।'
              : lang === 'hi'
                ? 'यह बातचीत शांत रखी गई है।'
                : 'This conversation is kept quiet.'}
          </p>
        </div>
      ) : (
      <div className="shrink-0 bg-white border-t border-stone-200 px-2 py-2 flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => setBlessingOpen(true)}
          aria-label="Send a blessing"
          title="Blessing"
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-amber-100 hover:bg-amber-200 text-xl flex items-center justify-center shrink-0"
        >
          🪔
        </button>
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          aria-label="Send a money request"
          title="Money request"
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-amber-100 hover:bg-amber-200 text-xl flex items-center justify-center shrink-0"
        >
          🙏
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          aria-label={lang === "bn" ? "ভয়েস নোট রেকর্ড করুন" : lang === "hi" ? "वॉइस नोट रिकॉर्ड करें" : "Record a voice note"}
          title="Voice note"
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-amber-100 hover:bg-amber-200 text-xl flex items-center justify-center shrink-0"
        >
          🎙️
        </button>
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          placeholder={
            lang === "bn"
              ? "বার্তা লিখুন…"
              : lang === "hi"
                ? "संदेश लिखें…"
                : "Write a message…"
          }
          className="flex-1 min-w-0 min-h-[44px] px-4 rounded-full border border-stone-300 bg-stone-50 text-[15px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={sendText}
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 flex items-center justify-center shrink-0 text-lg"
        >
          ➤
        </button>
      </div>
      )}

      {blessingOpen && (
        <BlessingPicker
          onPick={sendBlessing}
          onClose={() => setBlessingOpen(false)}
        />
      )}

      {voiceOpen && (
        <VoiceRecorder
          chatId={chatId}
          uid={uid}
          lang={lang}
          onSend={sendVoice}
          onClose={() => setVoiceOpen(false)}
        />
      )}

      {requestOpen && recipient && (
        <RequestModal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          chatId={chatId}
          currentUser={{
            uid,
            displayName: me?.displayName ?? "You",
            photoUrl: me?.photoUrl,
          }}
          recipient={recipient}
          asOrg={orgSender}
        />
      )}
    </div>
  );
};
