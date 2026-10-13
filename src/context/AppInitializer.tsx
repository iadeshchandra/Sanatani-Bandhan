import React, { createContext, useContext, useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { collection, deleteField, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebaseClient';
import { startDemoBackgroundService } from '../lib/dbUtils';

interface InitialData {
  sanatani_workspaces?: any;
  sanatani_active_workspace_id?: any;
  sanatani_user_role?: any;
  sanatani_current_devotee?: any;
  sb_devotees?: any;
  sb_families?: any;
  sb_vanshavali?: any;
  sb_guests?: any;
  sb_treasury?: any;
  sb_assets?: any;
  sb_inventory?: any;
  sb_pooja_bookings?: any;
  sanatani_app_lang?: any;
}

const InitialDataContext = createContext<InitialData | null>(null);

export const useInitialData = () => {
  const ctx = useContext(InitialDataContext);
  if (!ctx) throw new Error('useInitialData outside provider');
  return ctx;
};

const keys = [
  'sanatani_workspaces',
  'sanatani_active_workspace_id',
  'sanatani_user_role',
  'sanatani_current_devotee',
  'sb_devotees',
  'sb_families',
  'sb_vanshavali',
  'sb_guests',
  'sb_treasury',
  'sb_assets',
  'sb_inventory',
  'sb_pooja_bookings',
  'sanatani_app_lang'
];

/**
 * C-7 one-time migration: strip plaintext `pin` from Firestore devotee docs.
 *
 * Devotee records live at `tenants/{workspaceId}/devotees`. For every local
 * workspace (guarded by a per-workspace idb flag so this runs exactly once):
 *   - `pin === 'REVOKED'`        → set `pinRevoked: true`, delete `pin`
 *                                  (preserves the revocation status)
 *   - `pin` present AND `pinHash` present → delete `pin`
 *                                  (hash remains — nobody gets locked out)
 *   - `pin` present but NO `pinHash`     → SKIP, count as skipped
 *                                  (deleting here would lock the devotee out)
 *
 * Runs best-effort: on failure (e.g. offline) the flag is NOT set, so the
 * migration retries on the next launch. Counts are logged to the console.
 */
async function migratePlaintextPins(workspaces: Array<{ id: string }>) {
  for (const ws of workspaces || []) {
    const wsId = ws?.id;
    if (!wsId) continue;
    const flagKey = `sb_pin_migration_v1_${wsId}`;
    try {
      if (await get(flagKey)) continue;

      const colRef = collection(db, 'tenants', wsId, 'devotees');
      // '!=' filters to docs where the field EXISTS (Firestore semantics).
      const snap = await getDocs(query(colRef, where('pin', '!=', null)));

      let cleared = 0;
      let revoked = 0;
      let skipped = 0;
      let batch = writeBatch(db);
      let ops = 0;
      const commitIfFull = async () => {
        if (ops >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      };

      snap.forEach((d) => {
        const data = d.data() as { pin?: unknown; pinHash?: unknown };
        if (data.pin === 'REVOKED') {
          batch.update(d.ref, { pinRevoked: true, pin: deleteField() });
          revoked++;
          ops++;
        } else if (data.pin != null && data.pinHash) {
          batch.update(d.ref, { pin: deleteField() });
          cleared++;
          ops++;
        } else if (data.pin != null) {
          skipped++;
        }
        void commitIfFull();
      });
      if (ops > 0) await batch.commit();

      await set(flagKey, true);
      console.log(
        `[C-7 PIN migration] workspace ${wsId}: cleared ${cleared} plaintext PIN(s), ` +
        `converted ${revoked} REVOKED sentinel(s) → pinRevoked, skipped ${skipped} (no hash — left intact)`
      );
    } catch (err: any) {
      // Best-effort: flag not set → retries next launch (e.g. when back online).
      console.warn(`[C-7 PIN migration] workspace ${wsId} deferred:`, err?.message || err);
    }
  }
}

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<InitialData | null>(null);

  useEffect(() => {
    // Initialize 24h auto-cleanup daemon
    const cleanupDaemon = startDemoBackgroundService();

    // Existing load

    const load = async () => {
      const loaded: any = {};
      for (const key of keys) {
        let val = await get(key);
        if (val === undefined) {
          // Migration from localStorage
          const lsVal = localStorage.getItem(key);
          if (lsVal) {
            try {
              val = JSON.parse(lsVal);
            } catch {
              val = lsVal;
            }
            // Save to idb for future
            await set(key, val);
          }
        }
        loaded[key] = val;
      }
      setData(loaded);

      // C-7: one-time plaintext-PIN purge (best-effort, runs after data load).
      void migratePlaintextPins(loaded.sanatani_workspaces);
    };
    load();

    return () => {
      cleanupDaemon();
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return <InitialDataContext.Provider value={data}>{children}</InitialDataContext.Provider>;
};
