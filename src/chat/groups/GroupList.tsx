/**
 * groups/GroupList.tsx — the group conversation list.
 * ======================================================
 * Mirrors the 1:1 ChatList rhythm: search, chronological rows, unread
 * badges in warm amber (never red-anxiety), archived section.
 * Each row shows the group icon, name, member count, and last message.
 */
import React, { useMemo, useState } from 'react';
import { T, useLocaleText } from '../../solo/ui';
import { setGroupArchived } from './groupService';
import type { GroupChat } from './types';
import { useGroupArchivedSplit } from './useGroups';
import { ThreadListSkeleton } from '../ChatSkeletons';
import { GroupAvatar } from './GroupThread';
import { gt } from './i18n';

const GroupRow: React.FC<{
  group: GroupChat;
  uid: string;
  onOpen: (groupId: string) => void;
  action?: React.ReactNode;
}> = ({ group, uid, onOpen, action }) => {
  const { lang } = useLocaleText();
  const unread = group.unreadCounts?.[uid] ?? 0;
  const typingOthers = group.typing
    ? Object.keys(group.typing).filter((u) => u !== uid && group.typing?.[u])
    : [];
  const lastMsg = group.lastMessage || null;

  return (
    <div className="w-full flex items-center gap-2 pl-4 pr-2 py-1 hover:bg-amber-50/60 active:bg-amber-50 transition-colors min-h-[72px]">
      <button
        type="button"
        onClick={() => onOpen(group.id)}
        className="flex-1 min-w-0 flex items-center gap-3 py-2 text-left min-h-[64px]"
      >
        <GroupAvatar type={group.type} size={48} name={group.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 truncate">{group.name}</span>
            <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">
              👥 {group.memberIds.length}
            </span>
          </div>
          <div className="text-sm text-stone-500 truncate mt-0.5">
            {typingOthers.length > 0 ? (
              <span className="text-amber-700 italic">
                {typingOthers.length === 1
                  ? `${(group.memberInfo[typingOthers[0]]?.displayName || 'Someone').split(' ')[0]} ${lang === 'bn' ? 'লিখছেন…' : lang === 'hi' ? 'लिख रहे हैं…' : 'is typing…'}`
                  : lang === 'bn'
                    ? `${typingOthers.length} জন লিখছেন…`
                    : lang === 'hi'
                      ? `${typingOthers.length} लोग लिख रहे हैं…`
                      : `${typingOthers.length} people typing…`}
              </span>
            ) : (
              lastMsg || (
                <T en="Say namaste 🙏" bn="নমস্কার বলুন 🙏" hi="नमस्ते कहें 🙏" />
              )
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
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
      {action && <div className="shrink-0 md:hidden">{action}</div>}
    </div>
  );
};

export const GroupList: React.FC<{
  uid: string;
  groups: GroupChat[];
  loading: boolean;
  onOpen: (groupId: string) => void;
  onNewGroup: () => void;
  onJoinGroup: () => void;
}> = ({ uid, groups, loading, onOpen, onNewGroup, onJoinGroup }) => {
  const { lang } = useLocaleText();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { active, archived } = useGroupArchivedSplit(groups, uid);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((g) => g.name.toLowerCase().includes(q));
  }, [active, search]);

  const archiveGroup = async (groupId: string, archivedNow: boolean) => {
    try {
      await setGroupArchived(groupId, uid, !archivedNow);
    } catch {
      /* quiet convenience */
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
            placeholder={
              lang === 'bn' ? 'গ্রুপ খুঁজুন…' : lang === 'hi' ? 'समूह खोजें…' : 'Search groups…'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
            aria-label="Search groups"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden>
            🔍
          </span>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="pt-2">
            <ThreadListSkeleton rows={4} />
          </div>
        ) : filtered.length === 0 && !search ? (
          <div className="px-8 py-14 text-center">
            <div className="text-5xl mb-4" aria-hidden>
              👥
            </div>
            <h3 className="text-base font-extrabold text-stone-800">
              <T en="No groups yet" bn="এখনও কোনো গ্রুপ নেই" hi="अभी कोई समूह नहीं" />
            </h3>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              <T
                en="Gather your family, your satsang, your yatra sangha — private, warm, and yours."
                bn="পরিবার, সৎসঙ্গ, যাত্রা সংঘকে একত্র করুন — ব্যক্তিগত, উষ্ণ, আপনার।"
                hi="अपने परिवार, सत्संग, यात्रा संघ को जोड़ें — निजी, सौम्य, आपका।"
              />
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 px-8 text-center">
            <p className="text-sm font-bold text-stone-600">
              <T en="No matches found" bn="কোনো মিল পাওয়া যায়নি" hi="कोई मिलान नहीं मिला" />
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((g) => (
              <li key={g.id}>
                <GroupRow
                  group={g}
                  uid={uid}
                  onOpen={onOpen}
                  action={
                    <button
                      type="button"
                      onClick={() => archiveGroup(g.id, false)}
                      aria-label="Archive group"
                      className="w-11 h-11 flex items-center justify-center rounded-full text-stone-400 active:bg-stone-200"
                    >
                      📦
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}

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
                {archived.map((g) => (
                  <li key={g.id}>
                    <GroupRow group={g} uid={uid} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* New / Join buttons */}
      <div className="p-4 shrink-0 flex gap-2">
        <button
          type="button"
          onClick={onNewGroup}
          className="flex-1 rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold py-3 min-h-[52px] shadow-md"
        >
          {gt(lang, 'list.newGroup')}
        </button>
        <button
          type="button"
          onClick={onJoinGroup}
          className="flex-1 rounded-2xl bg-white border-2 border-amber-700 text-amber-800 font-bold py-3 min-h-[52px]"
        >
          <T en="Join with code" bn="কোড দিয়ে যোগ দিন" hi="कोड से जुड़ें" />
        </button>
      </div>
    </div>
  );
};
