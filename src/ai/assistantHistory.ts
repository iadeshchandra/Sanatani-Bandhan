/**
 * ai/assistantHistory.ts — devotee chat history, private by design.
 * =====================================================================
 * Chat history is LOCAL-ONLY: it lives in a dedicated IndexedDB database
 * on this device and is NEVER uploaded, synced, or written to Firestore.
 * Your questions to the assistant are yours alone — the cloud never sees
 * them. This is deliberate, matching the File Vault's private tier.
 *
 * Follows the same `idb-keyval` pattern as src/lib/fileVaultIdb.ts.
 */

import { createStore, get, set, del } from 'idb-keyval';
import type { AssistantAction, AssistantResponseType } from './assistantBridge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** The assistant response kind (for re-rendering panels on reload). */
  kind?: AssistantResponseType;
  suggestions?: string[];
  action?: AssistantAction;
  createdAt: number;
}

/** Bounded thread — a devotee's recent conversation, not an archive. */
const MAX_MESSAGES = 60;

const assistantStore = createStore('sanatani-assistant', 'chat-threads');

const keyFor = (uid: string) => `thread:${uid}`;

export async function loadThread(uid: string): Promise<ChatMessage[]> {
  try {
    const msgs = await get<ChatMessage[]>(keyFor(uid), assistantStore);
    return Array.isArray(msgs) ? msgs : [];
  } catch {
    return [];
  }
}

export async function saveThread(uid: string, messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await set(keyFor(uid), trimmed, assistantStore);
  } catch {
    /* private mode / quota — history simply won't persist this once */
  }
}

export async function clearThread(uid: string): Promise<void> {
  try {
    await del(keyFor(uid), assistantStore);
  } catch {
    /* best-effort */
  }
}
