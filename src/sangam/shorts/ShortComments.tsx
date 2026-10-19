/**
 * sangam/shorts/ShortComments.tsx — bottom-sheet comment thread for a short.
 * ============================================================================
 * Subcollection: sangamShorts/{shortId}/comments/{commentId}
 * Warm, simple: list + input. Comment count increments on the parent.
 */
import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { st, type ShortsLang } from './i18n';
import type { Short } from './types';

export interface ShortComment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: number;
}

function toComment(id: string, data: Record<string, unknown>): ShortComment | null {
  try {
    if (typeof data.authorUid !== 'string' || !data.authorUid) return null;
    if (typeof data.text !== 'string' || !data.text.trim()) return null;
    return {
      id,
      authorUid: data.authorUid,
      authorName: typeof data.authorName === 'string' ? data.authorName : '',
      text: data.text,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    };
  } catch {
    return null;
  }
}

export function subscribeShortComments(shortId: string, cb: (c: ShortComment[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'sangamShorts', shortId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      const out: ShortComment[] = [];
      for (const d of snap.docs) {
        const c = toComment(d.id, d.data() as Record<string, unknown>);
        if (c) out.push(c);
      }
      cb(out);
    },
    () => cb([]),
  );
}

export async function addShortComment(
  shortId: string,
  authorUid: string,
  authorName: string,
  text: string,
): Promise<void> {
  const clean = text.trim().slice(0, 300);
  if (!clean) return;
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, 'sangamShorts', shortId, 'comments', id), {
    authorUid,
    authorName,
    text: clean,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'sangamShorts', shortId), { commentCount: increment(1) }).catch(
    () => {},
  );
}

export async function deleteShortComment(shortId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'sangamShorts', shortId, 'comments', commentId));
}

export const ShortComments: React.FC<{
  short: Short;
  lang: ShortsLang;
  viewerUid: string;
  viewerName: string;
  onClose: () => void;
}> = ({ short, lang, viewerUid, viewerName, onClose }) => {
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => subscribeShortComments(short.id, setComments), [short.id]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addShortComment(short.id, viewerUid, viewerName, text);
      setText('');
    } catch {
      /* rules-gated */
    }
    setSending(false);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" role="dialog" aria-label={st('shorts.comments', lang)}>
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="✕" />
      <div className="relative bg-white rounded-t-3xl max-h-[70%] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h3 className="font-extrabold text-stone-800">💬 {st('shorts.comments', lang)}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 text-xl"
            aria-label="✕"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {comments.length === 0 && (
            <p className="text-center text-stone-400 text-sm py-6">🪔</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="flex-1">
                <span className="font-bold text-stone-700 text-sm">{c.authorName}</span>
                <p className="text-stone-600 text-sm">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-3 border-t border-stone-100">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="…"
            maxLength={300}
            className="flex-1 rounded-full border border-stone-200 px-4 py-2.5 text-sm min-h-[44px]"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="min-w-[44px] min-h-[44px] px-4 rounded-full bg-amber-600 text-white font-bold text-sm disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};
