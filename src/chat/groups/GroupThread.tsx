/**
 * groups/GroupThread.tsx — the group conversation view.
 * =======================================================
 * Warm bubbles (amber/stone — never corporate blue). Own messages
 * right-aligned saffron; others left-aligned with sender attribution
 * (name + small avatar above the bubble). System messages render as
 * centered warm pills ("🙏 Anjali joined the satsang").
 *
 * Read state: a message counts as read when EVERY other member's
 * lastReadAt covers it. Typing: "X is typing…" / "3 people typing…".
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, T, useLocaleText } from '../../solo/ui';
import {
  markGroupDelivered,
  markGroupRead,
  sendGroupMessage,
  setGroupTyping,
} from './groupService';
import type { GroupChat } from './types';
import { isGroupOpen, markGroupOpen, useGroupMessages, useGroupTypingLabel } from './useGroups';
import { MessageListSkeleton } from '../ChatSkeletons';
import { BlessingCard, BLESSING_OCCASIONS } from '../BlessingCard';
import { ChatAvatar, formatChatTime } from '../ChatList';
import { groupTypeIcon, typingLabel, type GroupMessage, type GroupType } from './types';
import { gt } from './i18n';

/* ------------------------------------------------------------------ */
/* Message state                                                       */
/* ------------------------------------------------------------------ */

type MsgState = 'sent' | 'delivered' | 'read';

function messageState(msg: GroupMessage, group: GroupChat | null, uid: string): MsgState {
  if (msg.senderId !== uid || !group) return 'sent';
  const others = group.memberIds.filter((p) => p !== uid);
  if (others.length === 0) return 'sent';
  const allRead = others.every((k) => (group.lastReadAt?.[k] ?? 0) >= msg.createdAt);
  if (allRead) return 'read';
  const anyDelivered = others.some((k) => (group.lastDeliveredAt?.[k] ?? 0) >= msg.createdAt);
  return anyDelivered ? 'delivered' : 'sent';
}

const StateTicks: React.FC<{ state: MsgState }> = ({ state }) => {
  if (state === 'read')
    return (
      <span className="text-amber-700/70 text-xs font-bold" aria-label="Read">
        ✓✓
      </span>
    );
  if (state === 'delivered')
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
/* Date dividers (mirrors 1:1 thread)                                  */
/* ------------------------------------------------------------------ */

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: number, lang: string): string {
  const locale = lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return lang === 'bn' ? 'আজ' : lang === 'hi' ? 'आज' : 'Today';
  if (d.getTime() >= startOfToday - 86400000) return lang === 'bn' ? 'গতকাল' : lang === 'hi' ? 'कल' : 'Yesterday';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Blessing picker                                                     */
/* ------------------------------------------------------------------ */

const BlessingPicker: React.FC<{ onPick: (occasionKey: string) => void; onClose: () => void }> = ({
  onPick,
  onClose,
}) => {
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
              {lang === 'bn' ? b.labelBn : lang === 'hi' ? b.labelHi : b.labelEn}
            </div>
            <div className={`text-xs ${b.accent} opacity-90`}>{b.greetingSa}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Group avatar — type icon in a warm medallion                        */
/* ------------------------------------------------------------------ */

export const GroupAvatar: React.FC<{ type: GroupType; size?: number; name?: string }> = ({
  type,
  size = 48,
  name,
}) => (
  <div
    className="rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 flex items-center justify-center shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.45 }}
    aria-label={name ?? 'Group'}
    role="img"
  >
    <span aria-hidden>{groupTypeIcon(type)}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* GroupThread                                                         */
/* ------------------------------------------------------------------ */

export const GroupThread: React.FC<{
  uid: string;
  groupId: string;
  group: GroupChat | null;
  onBack: () => void;
  onInfo: () => void;
}> = ({ uid, groupId, group, onBack, onInfo }) => {
  const { lang } = useLocaleText();
  const { messages, loading } = useGroupMessages(groupId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [blessingOpen, setBlessingOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingText = useGroupTypingLabel(group, uid, lang);
  const memberCount = group?.memberIds.length ?? 0;

  const me = useMemo(() => group?.memberInfo[uid], [group, uid]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  /* Tell the notification layer this group is on screen. */
  useEffect(() => {
    markGroupOpen(groupId);
    return () => markGroupOpen(null);
  }, [groupId]);

  /* Mark read + delivered when viewing. */
  useEffect(() => {
    if (!group || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const unread = group.unreadCounts?.[uid] ?? 0;
    if (unread > 0 || latest.senderId !== uid) {
      markGroupRead(groupId, uid).catch(() => {});
    }
    if ((group.lastDeliveredAt?.[uid] ?? 0) < latest.createdAt) {
      markGroupDelivered(groupId, uid).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, uid, messages.length]);

  /* Clear typing flag on unmount */
  useEffect(() => {
    return () => {
      setGroupTyping(groupId, uid, false);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [groupId, uid]);

  const handleDraftChange = (v: string) => {
    setDraft(v);
    setGroupTyping(groupId, uid, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setGroupTyping(groupId, uid, false), 2500);
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    setGroupTyping(groupId, uid, false);
    try {
      await sendGroupMessage(groupId, uid, 'text', text, { senderAvatar: me?.photoUrl });
    } catch {
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
      const b = BLESSING_OCCASIONS.find((x) => x.key === occasionKey) ?? BLESSING_OCCASIONS[0];
      await sendGroupMessage(groupId, uid, 'blessing', b.greetingSa, {
        blessingMeta: { occasion: b.key, occasionBn: b.labelBn, occasionHi: b.labelHi },
        senderAvatar: me?.photoUrl,
      });
    } catch {
      /* blessing failed — the picker simply closes, nothing lost */
    } finally {
      setSending(false);
    }
  };

  // Suppress unused-import warning for the registry helper used via effects.
  void isGroupOpen;

  let lastDay = '';

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
        {group && <GroupAvatar type={group.type} size={40} name={group.name} />}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold truncate">{group?.name ?? '…'}</div>
          <div className="text-[11px] text-amber-200/80">
            {typingText ? (
              <span className="italic">{typingText}</span>
            ) : (
              <span>
                👥 {memberCount} {gt(lang, memberCount === 1 ? 'list.member' : 'list.members')}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onInfo}
          aria-label={gt(lang, 'thread.info')}
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 flex items-center justify-center text-xl"
        >
          ⓘ
        </button>
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
            <p className="text-sm text-stone-500 leading-relaxed">{gt(lang, 'thread.empty')}</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === uid;
            const dk = dayKey(m.createdAt);
            const showDay = dk !== lastDay;
            lastDay = dk;

            // System messages: centered warm pills.
            if (m.kind === 'system') {
              return (
                <React.Fragment key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="text-[11px] font-bold text-stone-500 bg-stone-200/70 rounded-full px-3 py-1">
                        {dayLabel(m.createdAt, lang)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-center py-1">
                    <span className="text-[12px] text-amber-900/80 bg-amber-100/80 border border-amber-200/60 rounded-full px-3 py-1.5 text-center max-w-[90%]">
                      {m.text}
                    </span>
                  </div>
                </React.Fragment>
              );
            }

            const sender = group?.memberInfo[m.senderId];
            return (
              <React.Fragment key={m.id}>
                {showDay && (
                  <div className="flex justify-center py-2">
                    <span className="text-[11px] font-bold text-stone-500 bg-stone-200/70 rounded-full px-3 py-1">
                      {dayLabel(m.createdAt, lang)}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${mine ? 'ml-auto' : ''}`}>
                    {/* Sender attribution for others' messages */}
                    {!mine && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        {sender?.photoUrl || m.senderAvatar ? (
                          <img
                            src={sender?.photoUrl || m.senderAvatar}
                            alt={m.senderName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[9px] font-extrabold flex items-center justify-center">
                            {(m.senderName || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-amber-800/90 truncate max-w-[140px]">
                          {m.senderName}
                        </span>
                      </div>
                    )}
                    {m.kind === 'blessing' && m.blessingMeta ? (
                      <>
                        <BlessingCard occasion={m.blessingMeta.occasion} compact />
                        <div className={`text-[10px] text-stone-400 mt-1 ${mine ? 'text-right' : ''}`}>
                          {formatChatTime(m.createdAt, lang)}{' '}
                          {mine && <StateTicks state={messageState(m, group, uid)} />}
                        </div>
                      </>
                    ) : (
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                          mine
                            ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-amber-50 rounded-br-md'
                            : 'bg-white text-stone-900 border border-stone-200/70 rounded-bl-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        <div
                          className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end text-amber-100/80' : 'text-stone-400'}`}
                        >
                          {formatChatTime(m.createdAt, lang)}
                          {mine && <StateTicks state={messageState(m, group, uid)} />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator line */}
      {typingText && (
        <div className="px-4 pb-1 text-xs text-amber-700 italic shrink-0">{typingText}</div>
      )}

      {/* Input bar — blessings + text. (Money requests stay 1:1 for now.) */}
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
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          placeholder={gt(lang, 'thread.write')}
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

      {blessingOpen && <BlessingPicker onPick={sendBlessing} onClose={() => setBlessingOpen(false)} />}
    </div>
  );
};
