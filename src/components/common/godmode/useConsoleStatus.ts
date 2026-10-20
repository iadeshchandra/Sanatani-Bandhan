/**
 * useConsoleStatus — live facts for the GodMode shell chrome (QUEUED #39).
 * ============================================================================
 * Loads, once per unlock (and on manual refresh), the four numbers the
 * branded header / status strip / "Needs your hand" summary show:
 *
 *   apis              ← platformConfig/apiHealth stored probes (#35)
 *                       + key presence from platformConfig/apiKeys
 *   pendingClaims     ← adminApi.paymentClaims('pending')  (Billing)
 *   dueSubscriptions  ← subscriptions scan + findDueSubscriptions (#24)
 *   newSupport        ← firestoreAdmin.supportLeads('new') (Support)
 *
 * Every loader is gated by canAccessTab() (the #21 matrix) BEFORE any
 * read happens, and every loader fails soft: a denied or failed read
 * leaves its fact `undefined`, which the chrome renders as HIDDEN —
 * never as zero and never as "all clear" (consoleChrome.ts honesty
 * laws). firestoreAdmin is owner-native, so delegated roles' support
 * count simply stays hidden until their own desk loads it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { adminApi } from '../../../lib/adminApi';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { findDueSubscriptions, type SubscriptionAdminDoc } from '../../../lib/subscriptionAdmin';
import { canAccessTab, type PlatformRole } from '../../../lib/platformAdminRoles';
import { API_DESCRIPTORS } from '../../../apikeys/apiHealth';
import { loadApiHealth } from '../../../apikeys/apiHealthStore';
import { resolveGeminiKey } from '../../../utils/geminiClient';
import { summarizeApiHealth, type ConsoleFacts } from './consoleChrome';

const REFRESH_THROTTLE_MS = 30_000;

export interface ConsoleStatus {
  facts: ConsoleFacts;
  /** Epoch ms of the last completed load round (null = never). */
  loadedAt: number | null;
  loading: boolean;
  refresh: (force?: boolean) => void;
}

/** Which APIs have a usable key: owner keys doc + device key + keyless. */
async function loadConfiguredById(): Promise<Record<string, boolean>> {
  const byId: Record<string, boolean> = {};
  let entries: Array<{ name?: unknown; keyValue?: unknown; enabled?: unknown }> = [];
  try {
    const snap = await getDocs(query(collection(db, 'platformConfig/apiKeys'), orderBy('name')));
    entries = snap.docs.map((d) => d.data() as typeof entries[number]);
  } catch {
    entries = []; // owner keys unreadable → owner-keyed APIs stay unknown
  }
  const keysReadable = entries.length > 0;
  for (const desc of API_DESCRIPTORS) {
    if (desc.keySource === 'keyless') {
      byId[desc.id] = true;
    } else if (desc.keySource === 'device') {
      byId[desc.id] = !!resolveGeminiKey();
    } else {
      const entry = entries.find((e) => e.name === desc.keyName);
      if (entry) {
        byId[desc.id] =
          entry.enabled !== false &&
          typeof entry.keyValue === 'string' &&
          entry.keyValue.trim() !== '';
      } else if (keysReadable) {
        byId[desc.id] = false; // key table read fine; this key simply isn't there
      }
      // else: leave undefined → summarizeApiHealth skips it (unknown)
    }
  }
  return byId;
}

export function useConsoleStatus(role: PlatformRole | null): ConsoleStatus {
  const [facts, setFacts] = useState<ConsoleFacts>({});
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const runIdRef = useRef(0);
  const lastRunRef = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      if (!role) return;
      const now = Date.now();
      if (!force && now - lastRunRef.current < REFRESH_THROTTLE_MS) return;
      lastRunRef.current = now;
      const runId = ++runIdRef.current;
      setLoading(true);
      const next: ConsoleFacts = {};

      const jobs: Array<Promise<void>> = [];

      if (canAccessTab(role, 'apikeys')) {
        jobs.push(
          (async () => {
            try {
              const [stored, configuredById] = await Promise.all([
                loadApiHealth(),
                loadConfiguredById(),
              ]);
              next.apis = summarizeApiHealth(stored.results, configuredById);
            } catch {
              /* hidden */
            }
          })(),
        );
      }
      if (canAccessTab(role, 'billing')) {
        jobs.push(
          (async () => {
            try {
              const r = await adminApi.paymentClaims('pending');
              if (r.ok && r.data?.claims) next.pendingClaims = r.data.claims.length;
            } catch {
              /* hidden */
            }
          })(),
        );
        jobs.push(
          (async () => {
            try {
              const snap = await getDocs(
                query(collection(db, 'subscriptions'), orderBy('updatedAt', 'desc'), limit(200)),
              );
              const subs = snap.docs.map(
                (d) => ({ id: d.id, ...(d.data() as object) }) as unknown as SubscriptionAdminDoc,
              );
              next.dueSubscriptions = findDueSubscriptions(subs).length;
            } catch {
              /* hidden */
            }
          })(),
        );
      }
      if (canAccessTab(role, 'support')) {
        jobs.push(
          (async () => {
            try {
              const r = await firestoreAdmin.supportLeads('new');
              if (r.ok && r.data?.leads) next.newSupport = r.data.leads.length;
            } catch {
              /* hidden — firestoreAdmin is owner-native */
            }
          })(),
        );
      }

      await Promise.allSettled(jobs);
      if (runIdRef.current !== runId) return; // a newer round superseded us
      setFacts(next);
      setLoadedAt(Date.now());
      setLoading(false);
    },
    [role],
  );

  // Fresh round whenever the effective role (re)resolves — i.e. at unlock.
  useEffect(() => {
    if (role) void load(true);
    else {
      setFacts({});
      setLoadedAt(null);
    }
  }, [role, load]);

  const refresh = useCallback((force = false) => void load(force), [load]);
  return { facts, loadedAt, loading, refresh };
}
