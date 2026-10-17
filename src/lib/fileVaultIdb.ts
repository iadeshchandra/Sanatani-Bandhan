/**
 * Sanatani Bandhan — File Vault IndexedDB layer (private files)
 *
 * Private-visibility files NEVER leave the device: their bytes live here,
 * in a dedicated IndexedDB database, while Firestore only holds a tiny
 * metadata pointer (`localOnly: true`). This is deliberate — sensitive
 * material (verification documents, SOS voice notes) stays under the
 * user's physical control on the $0 Spark plan.
 *
 * Uses idb-keyval (already a dependency) with a dedicated store so vault
 * data never collides with other app caches. Values are structured-cloned,
 * so Uint8Array survives the round trip intact.
 */

import { createStore, get, set, del } from 'idb-keyval';

export interface PrivateFileRecord {
  fileId: string;
  /** Raw file bytes (structured-cloned by IndexedDB). */
  bytes: Uint8Array;
  contentType: string;
  size: number;
  category: string;
  createdAt: number;
}

const vaultStore = createStore('sanatani-filevault', 'private-files');

export async function putPrivateFile(record: PrivateFileRecord): Promise<void> {
  await set(record.fileId, record, vaultStore);
}

export async function getPrivateFile(fileId: string): Promise<PrivateFileRecord | null> {
  try {
    const rec = await get<PrivateFileRecord>(fileId, vaultStore);
    return rec ?? null;
  } catch {
    return null;
  }
}

export async function deletePrivateFile(fileId: string): Promise<void> {
  try {
    await del(fileId, vaultStore);
  } catch {
    /* best-effort */
  }
}
