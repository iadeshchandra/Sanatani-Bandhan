/**
 * orgGlanceSync.ts — Writer side of per-org glance summaries.
 * =====================================================================
 * Called from the org dashboard (debounced): builds a ModuleSnapshot
 * from the org's already-loaded data, summarizes it, and writes ONE
 * lightweight doc to `orgGlance/{workspaceId}`.
 *
 * The writer can only summarize what THEY can read (their own role's
 * data), and readers re-filter by role — so a summary can at worst be
 * stale, never a privilege leak.
 */
import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useData } from '../context/DataContext';
import {
  buildOrgGlanceSummary,
  toGlanceDoc,
  type OrgGlanceSummary,
} from './orgGlance';
import type { ModuleSnapshot } from './appIntelligence';

const DEBOUNCE_KEY = (wsId: string) => `sb_glance_refresh_${wsId}`;
const DEBOUNCE_MS = 60 * 60 * 1000; // max once per hour per org per device

/** Write a summary doc. Exported for tests and manual triggers. */
export async function writeOrgGlance(
  workspaceId: string,
  orgName: string,
  orgType: string,
  snapshot: ModuleSnapshot,
  writerRole: string
): Promise<boolean> {
  try {
    if (!workspaceId || workspaceId.startsWith('DEMO_')) return false;
    const summary: OrgGlanceSummary = buildOrgGlanceSummary(
      workspaceId,
      orgName,
      orgType,
      snapshot,
      writerRole
    );
    await setDoc(doc(db, 'orgGlance', workspaceId), toGlanceDoc(summary), {
      merge: true,
    });
    try {
      localStorage.setItem(DEBOUNCE_KEY(workspaceId), String(Date.now()));
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Mount in the org dashboard. On mount (debounced to 1/hour), builds a
 * snapshot from the org's loaded data and refreshes the glance doc.
 * Fail-open — never blocks rendering, never throws.
 */
export function useOrgGlanceRefresh(): void {
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const data = useData();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const ws = activeWorkspace;
    if (!ws || !ws.id || ws.id.startsWith('DEMO_')) return;
    // Debounce: skip if refreshed within the hour on this device.
    try {
      const last = Number(localStorage.getItem(DEBOUNCE_KEY(ws.id)) || 0);
      if (Date.now() - last < DEBOUNCE_MS) return;
    } catch {
      /* proceed */
    }
    done.current = true;

    // Build the snapshot from whatever the org dashboard already loaded.
    // Missing arrays → generators fail open (no insights, not a crash).
    const snapshot: ModuleSnapshot = {
      treasury: (data as any).treasury,
      donations: (data as any).donations,
      devotees: (data as any).devotees,
      inventory: (data as any).inventory,
      festivals: (data as any).festivals,
      festivalTasks: (data as any).festivalTasks,
      sangamPosts: (data as any).sangamPosts,
      sangamEvents: (data as any).sangamEvents,
      cows: (data as any).cows,
    };
    writeOrgGlance(ws.id, ws.name, ws.type, snapshot, currentRole || 'devotee');
  }, [activeWorkspace, currentRole]);
}
