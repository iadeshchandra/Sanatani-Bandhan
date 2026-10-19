/**
 * useModerationInbox — surfaces owner→user messages (warnings, report thanks).
 * ===========================================================================
 * AUDIT FIX #9: the `messages` collection is the designed owner→user channel
 * (rules: owner creates, the targeted user reads their own) — but nothing in
 * the app ever read it, so `warn_user` and reporter-thanks vanished into a
 * black hole. This hook subscribes to the signed-in user's messages and
 * exposes them for the SuchanaPage "Notes from the team" section.
 *
 * Warm, dignified copy. Mark-read on open. Fail-open on read errors.
 */
import { useEffect, useState } from 'react';
import {
  collection, doc, limit, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

export interface TeamNote {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: number;
}

function toNote(id: string, data: Record<string, unknown>): TeamNote {
  const created = data.createdAt;
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '🪔 A note from the team',
    body: typeof data.body === 'string' ? data.body : '',
    type: typeof data.type === 'string' ? data.type : 'note',
    read: data.read === true,
    createdAt:
      typeof created === 'number' ? created
      : created && typeof (created as { toMillis?: unknown }).toMillis === 'function'
        ? (created as { toMillis: () => number }).toMillis()
        : 0,
  };
}

export function useModerationInbox() {
  const { firebaseUser } = useAuthWorkspace();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || null;
  const [notes, setNotes] = useState<TeamNote[]>([]);

  useEffect(() => {
    if (!uid) { setNotes([]); return; }
    // No orderBy: avoids the composite index a where+orderBy would need
    // (same pattern as moderationReports). Client-side sort instead.
    const q = query(
      collection(db, 'messages'),
      where('targetUid', '==', uid),
      limit(20),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => toNote(d.id, d.data() as Record<string, unknown>));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setNotes(list);
      },
      () => { setNotes([]); },
    );
    return unsub;
  }, [uid]);

  const markNoteRead = async (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      // Rules allow the owner-user to touch only read/readAt.
      await updateDoc(doc(db, 'messages', id), { read: true, readAt: Date.now() });
    } catch { /* best-effort */ }
  };

  const unread = notes.filter((n) => !n.read);
  return { notes, unread, unreadCount: unread.length, markNoteRead };
}
