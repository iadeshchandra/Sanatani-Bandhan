/**
 * Seva Suggestions — local suggestion state.
 * ============================================================================
 * Pending contextual suggestions live in localStorage per workspace:
 *   sb_seva_suggestions_<workspaceId>  — pending suggestion objects
 *   sb_seva_dismissed_<workspaceId>     — dismissed suggestion keys (sticky)
 *   sb_seva_milestones_<workspaceId>   — fired trigger milestones (fire once)
 *
 * Dismissals are sticky: a dismissed suggestion never reappears for that
 * workspace. Enabling the module clears its pending suggestions.
 */
import { useCallback, useEffect, useState } from 'react';
import type { LocalizedText } from './recommend';
import { resolveOrgModuleId } from '../lib/workspaceRegistry';

export interface PendingSuggestion {
  key: string;
  moduleId: string;
  reason: LocalizedText;
  source: 'trigger' | 'recommendation';
  createdAt: number;
}

const lsGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const lsSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — suggestions simply don't persist */
  }
};

const pendingKey = (ws: string) => `sb_seva_suggestions_${ws}`;
const dismissedKey = (ws: string) => `sb_seva_dismissed_${ws}`;
const milestoneKey = (ws: string) => `sb_seva_milestones_${ws}`;

function readPending(ws: string): PendingSuggestion[] {
  try {
    const raw = lsGet(pendingKey(ws));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function readDismissed(ws: string): string[] {
  try {
    const raw = lsGet(dismissedKey(ws));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writePending(ws: string, list: PendingSuggestion[]): void {
  lsSet(pendingKey(ws), JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('seva-suggestions-updated', { detail: { workspaceId: ws } }));
}

/**
 * Fire a contextual suggestion. No-ops when: no workspace, the module is
 * already available (native or enabled), the suggestion was dismissed, or
 * an identical pending suggestion already exists.
 */
export function fireSuggestion(
  workspaceId: string | undefined | null,
  moduleId: string,
  reason: LocalizedText,
  isAvailable: (moduleId: string) => boolean
): boolean {
  if (!workspaceId) return false;
  if (isAvailable(moduleId)) return false;
  const key = `trigger:${moduleId}`;
  const dismissed = readDismissed(workspaceId);
  if (dismissed.includes(key)) return false;
  const pending = readPending(workspaceId);
  if (pending.some((s) => s.key === key)) return false;
  pending.push({ key, moduleId, reason, source: 'trigger', createdAt: Date.now() });
  writePending(workspaceId, pending);
  return true;
}

export function dismissSuggestion(workspaceId: string, key: string): void {
  if (!workspaceId) return;
  const dismissed = readDismissed(workspaceId);
  if (!dismissed.includes(key)) {
    dismissed.push(key);
    lsSet(dismissedKey(workspaceId), JSON.stringify(dismissed));
  }
  writePending(
    workspaceId,
    readPending(workspaceId).filter((s) => s.key !== key)
  );
}

/** Remove pending suggestions for a module once it becomes available. */
export function clearSuggestionsForModule(workspaceId: string, moduleId: string): void {
  if (!workspaceId) return;
  // QUEUED #57: compare canonically — a pending suggestion filed under
  // an alias id names the same desk and clears with it.
  const canonical = resolveOrgModuleId(moduleId);
  writePending(
    workspaceId,
    readPending(workspaceId).filter((s) => resolveOrgModuleId(s.moduleId) !== canonical)
  );
}

/** Milestones fire once per workspace (e.g. "donation volume crossed"). */
export function milestoneFired(workspaceId: string, name: string): boolean {
  try {
    const raw = lsGet(milestoneKey(workspaceId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) && arr.includes(name);
  } catch {
    return false;
  }
}

export function markMilestone(workspaceId: string, name: string): void {
  try {
    const raw = lsGet(milestoneKey(workspaceId));
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(name)) {
      arr.push(name);
      lsSet(milestoneKey(workspaceId), JSON.stringify(arr));
    }
  } catch {
    /* ignore */
  }
}

/** Has this suggestion key been dismissed for the workspace? */
export function isSuggestionDismissed(workspaceId: string, key: string): boolean {
  if (!workspaceId) return false;
  return readDismissed(workspaceId).includes(key);
}

/** React hook: live pending suggestions for a workspace. */
export function usePendingSuggestions(workspaceId: string | undefined | null): {
  suggestions: PendingSuggestion[];
  dismiss: (key: string) => void;
  refresh: () => void;
} {
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>(() =>
    workspaceId ? readPending(workspaceId) : []
  );

  const refresh = useCallback(() => {
    if (workspaceId) setSuggestions(readPending(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    refresh();
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.workspaceId === workspaceId) refresh();
    };
    window.addEventListener('seva-suggestions-updated', onUpdate);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('seva-suggestions-updated', onUpdate);
      window.removeEventListener('storage', refresh);
    };
  }, [workspaceId, refresh]);

  const dismiss = useCallback(
    (key: string) => {
      if (workspaceId) dismissSuggestion(workspaceId, key);
    },
    [workspaceId]
  );

  return { suggestions, dismiss, refresh };
}

/**
 * One-tap enable: adds the module to the workspace's enabledModules and
 * clears its pending suggestions. Returns the updated enabledModules list.
 */
export function enableModule(
  currentEnabled: string[] | undefined,
  moduleId: string,
  updateWorkspaceDetails: (updates: { enabledModules: string[] }) => void,
  workspaceId?: string | null
): string[] {
  // QUEUED #57 (audit A1-D01): store the CANONICAL id. This used to
  // store the raw catalog id while the mount guard consulted only the
  // canonical key — installing an alias door ('sanctum-hud',
  // 'dharmaMarketing', 'matrimony', …) wrote a key nothing else read,
  // so the desk stayed mount-blocked after a cheerful "installed".
  // Dedupe is canonical too: a legacy raw entry already covers the desk.
  const canonicalId = resolveOrgModuleId(moduleId);
  const next = [...(currentEnabled || [])];
  if (!next.some((id) => resolveOrgModuleId(id) === canonicalId)) next.push(canonicalId);
  updateWorkspaceDetails({ enabledModules: next });
  if (workspaceId) clearSuggestionsForModule(workspaceId, canonicalId);
  return next;
}
