/**
 * ChatList.tsx — the conversation list.
 * =============================================================
 * Chronological, calm, respectful. Warm saffron/stone palette.
 * "Suchana, not notifications" — the unread badge is warm amber,
 * never red-anxiety. Every participant shows their verified
 * Sanatani ID — the trust foundation of this chat.
 */
import React, { useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Modal, T, useLocaleText } from '../solo/ui';
import {
  getOrCreateDirectChat,
  setArchived,
  type ChatThreadLive,
} from './chatService';
import { useArchivedSplit } from './useChat';
import type { ChatParticipant } from './types';

/* ------------------------------------------------------------------ */
/* Avatar + verification badge                                         */
/* ------------------------------------------------------------------ */

export const ChatAvatar: React.FC<{ person: ChatParticipant; size?: number }> = ({
  person,
  size = 48,
}) => {
  const monogram = person.sanataniId
    ? person.sanataniId.replace('SAN-', '').slice(0, 2).toUpperCase()
    : (person.displayName || '?')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
  if (person.photoUrl || person.orgLogoUrl) {
    return (
      <img
        src={person.photoUrl || person.orgLogoUrl}
        alt={person.displayName}
        width={size}
        height={size}
        className="rounded-full object-cover bg-amber-100 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 font-extrabold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {monogram}
    </div>
  );
};

export const VerifiedBadge: React.FC<{ person: ChatParticipant; compact?: boolean }> = ({
  person,
  compact = false,
}) => {
  const verified = (person.verificationTier || '').toUpperCase() === 'VERIFIED';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        verified ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'
      }`}
      title={person.sanataniId || person.displayName}
    >
      <span aria-hidden>{verified ? '✓' : '○'}</span>
      {!compact && <span className="font-mono">{person.sanataniId || 'SAN-…'}</span>}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Time formatting                                                     */
/* ------------------------------------------------------------------ */

export function formatChatTime(ts: number | undefined, lang: string): string {
  if (!ts) return '';
  const locale = lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) {
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }
  const startOfWeek = startOfToday - 6 * 86400000;
  if (d.getTime() >= startOfWeek) {
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/* ------------------------------------------------------------------ */
/* Thread row                                                          */
/* ------------------------------------------------------------------ */

const ThreadRow: React.FC<{
  thread: ChatThreadLive;
  uid: string;
  onOpen: (chatId: string) => void;
}> = ({ thread, uid, onOpen }) => {
  const { lang } = useLocaleText();
  // The "other" side: for direct threads the other uid; for org threads the org.
  const otherKey = thread.participants.find((p) => p !== uid) ?? thread.participants[0];
  const person: ChatParticipant = thread.participantInfo[otherKey] ?? {
    uid: otherKey,
    displayName: thread.type === 'org' ? 'Organisation' : 'Sanatani',
  };
  const unread = thread.unreadCounts?.[uid] ?? 0;
  const isTyping = thread.typing?.[otherKey];

  return (
    <button
      type="button"
      onClick={() => onOpen(thread.id)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50/60 active:bg-amber-50 transition-colors min-h-[72px]"
    >
      <ChatAvatar person={person} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 truncate">{person.displayName}</span>
          <VerifiedBadge person={person} compact />
        </div>
        <div className="text-sm text-stone-500 truncate mt-0.5">
          {isTyping ? (
            <span className="text-amber-700 italic">
              <T en="typing…" bn="লিখছেন…" hi="लिख रहे हैं…" />
            </span>
          ) : (
            thread.lastMessage || (
              <T en="Say namaste 👋" bn="নমস্কার বলুন 👋" hi="नमस्ते कहें 👋" />
            )
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-stone-400 font-medium">
          {formatChatTime(thread.lastMessageAt ?? thread.updatedAt, lang)}
        </span>
        {unread > 0 && (
          <span
            className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-600 text-amber-50 text-[11px] font-extrabold flex items-center justify-center"
            aria-label={`${unread} unread`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* New conversation by Sanatani ID                                     */
/* ------------------------------------------------------------------ */

const NewChatModal: React.FC<{
  uid: string;
  selfInfo: ChatParticipant;
  onClose: () => void;
  onOpen: (chatId: string) => void;
}> = ({ uid, selfInfo, onClose, onOpen }) => {
  const { tr } = useLocaleText();
  const [sanataniId, setSanataniId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    const clean = sanataniId.trim().toUpperCase();
    if (!/^SAN-[A-Z0-9]{6}$/.test(clean)) {
      setError(tr('chat.new.invalid', 'Enter a valid Sanatani ID like SAN-7K2Q9M', 'SAN-7K2Q9M এর মতো সঠিক সনাতনী আইডি দিন', 'SAN-7K2Q9M जैसा सही सनातनी ID डालें'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const q = query(collection(db, 'sanataniProfiles'), where('id', '==', clean), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError(tr('chat.new.notfound', 'No Sanatani found with this ID', 'এই আইডিতে কোনো সনাতনী পাওয়া যায়নি', 'इस ID से कोई सनातनी नहीं मिला'));
        setBusy(false);
        return;
      }
      const d = snap.docs[0].data();
      const otherUid = d.uid as string;
      if (otherUid === uid) {
        setError(tr('chat.new.self', 'That is your own ID', 'এটি আপনার নিজের আইডি', 'यह आपकी अपनी ID है'));
        setBusy(false);
        return;
      }
      const other: ChatParticipant = {
        uid: otherUid,
        displayName: (d.displayName as string) || 'Sanatani',
        sanataniId: clean,
        verificationTier: (d.verificationTier as string) || 'REGISTERED',
      };
      const chatId = await getOrCreateDirectChat(uid, otherUid, selfInfo, other);
      onOpen(chatId);
    } catch (e) {
      console.warn('[chat] new chat lookup failed:', e);
      setError(tr('chat.new.failed', 'Could not start the conversation — check your connection', 'কথোপকথন শুরু করা যায়নি — সংযোগ পরীক্ষা করুন', 'बातचीत शुरू नहीं हो सकी — कनेक्शन जांचें'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={<T en="New conversation" bn="নতুন কথোপকথন" hi="नई बातचीत" />}
      onClose={onClose}
    >
      <p className="text-sm text-stone-600 mb-3">
        <T
          en="Enter your fellow Sanatani's ID. Every conversation here is between verified identities — no fake accounts."
          bn="আপনার সহযাত্রী সনাতনীর আইডি দিন। এখানে প্রতিটি কথোপকথন যাচাইকৃত পরিচয়ের মধ্যে — কোনো ভুয়া অ্যাকাউন্ট নেই।"
          hi="अपने साथी सनातनी की ID डालें। यहां हर बातचीत सत्यापित पहचान के बीच होती है — कोई नकली खाता नहीं।"
        />
      </p>
      <input
        value={sanataniId}
        onChange={(e) => setSanataniId(e.target.value.toUpperCase())}
        placeholder="SAN-XXXXXX"
        className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white font-mono text-base tracking-widest text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px]"
        maxLength={10}
        autoCapitalize="characters"
      />
      {error && <p className="text-sm text-red-600 font-semibold mt-2">{error}</p>}
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-amber-50 font-bold py-3 min-h-[48px]"
      >
        {busy ? (
          <T en="Starting…" bn="শুরু হচ্ছে…" hi="शुरू हो रहा…" />
        ) : (
          <T en="Start conversation" bn="কথোপকথন শুরু করুন" hi="बातचीत शुरू करें" />
        )}
      </button>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* ChatList                                                            */
/* ------------------------------------------------------------------ */

export const ChatList: React.FC<{
  uid: string;
  threads: ChatThreadLive[];
  loading: boolean;
  selfInfo: ChatParticipant;
  onOpen: (chatId: string) => void;
}> = ({ uid, threads, loading, selfInfo, onOpen }) => {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const { active, archived } = useArchivedSplit(threads, uid);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((t) => {
      const otherKey = t.participants.find((p) => p !== uid) ?? '';
      const p = t.participantInfo[otherKey];
      return (
        p?.displayName?.toLowerCase().includes(q) ||
        p?.sanataniId?.toLowerCase().includes(q) ||
        t.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [active, search, uid]);

  const archiveThread = async (chatId: string, archivedNow: boolean) => {
    try {
      await setArchived(chatId, uid, !archivedNow);
    } catch (e) {
      console.warn('[chat] archive failed:', e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
            aria-label="Search conversations"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden>
            🔍
          </span>
        </div>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-sm text-stone-400">
            <T en="Loading conversations…" bn="কথোপকথন লোড হচ্ছে…" hi="बातचीत लोड हो रही…" />
          </div>
        ) : filtered.length === 0 && !search ? (
          <div className="px-8 py-14 text-center">
            <div className="text-5xl mb-4" aria-hidden>
              🪔
            </div>
            <h3 className="text-base font-extrabold text-stone-800">
              <T en="No conversations yet" bn="এখনও কোনো কথোপকথন নেই" hi="अभी कोई बातचीत नहीं" />
            </h3>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              <T
                en="Your sangha awaits — start a calm, chronological conversation with a fellow Sanatani."
                bn="আপনার সংঘ অপেক্ষা করছে — একজন সহযাত্রী সনাতনীর সঙ্গে শান্ত, ধারাবাহিক কথোপকথন শুরু করুন।"
                hi="आपका संघ प्रतीक्षा कर रहा है — किसी साथी सनातनी से शांत, क्रमिक बातचीत शुरू करें।"
              />
            </p>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="mt-5 rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold px-6 py-3 min-h-[48px]"
            >
              <T en="Start a conversation" bn="কথোপকথন শুরু করুন" hi="बातचीत शुरू करें" />
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400">
            <T en="No matches found" bn="কোনো মিল পাওয়া যায়নি" hi="कोई मिलान नहीं मिला" />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((t) => (
              <li key={t.id} className="relative group">
                <ThreadRow thread={t} uid={uid} onOpen={onOpen} />
                <button
                  type="button"
                  onClick={() => archiveThread(t.id, false)}
                  aria-label="Archive conversation"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 hidden group-hover:flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
                  title="Archive"
                >
                  📦
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div className="mt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-stone-500 min-h-[48px]"
            >
              <span>
                📦 <T en="Archived" bn="আর্কাইভড" hi="संग्रहीत" /> ({archived.length})
              </span>
              <span aria-hidden>{showArchived ? '▾' : '▸'}</span>
            </button>
            {showArchived && (
              <ul className="divide-y divide-stone-100 opacity-80">
                {archived.map((t) => (
                  <li key={t.id} className="relative group">
                    <ThreadRow thread={t} uid={uid} onOpen={onOpen} />
                    <button
                      type="button"
                      onClick={() => archiveThread(t.id, true)}
                      aria-label="Unarchive conversation"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-11 hidden group-hover:flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
                    >
                      <T en="Unarchive" bn="আনআর্কাইভ" hi="अनआर्काइव" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* New conversation FAB */}
      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="w-full rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold py-3 min-h-[52px] shadow-md"
        >
          ✉️ <T en="New conversation" bn="নতুন কথোপকথন" hi="नई बातचीत" />
        </button>
      </div>

      {newOpen && (
        <NewChatModal uid={uid} selfInfo={selfInfo} onClose={() => setNewOpen(false)} onOpen={onOpen} />
      )}
    </div>
  );
};
