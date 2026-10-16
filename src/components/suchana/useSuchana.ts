/**
 * useSuchana.ts — Shared data hook for the unified Suchana feed.
 * =================================================================
 * Merges Panjika Intelligence (time-based) + App Intelligence
 * (state-based) into one role-filtered, calmly-ordered feed.
 * Pure merge via the suchanaFeed.ts contract; never throws.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  generateReminders,
  anniversaryReminders,
  loadIntelConfig,
  type GeneratedReminder,
  type IntelConfig,
} from '../../lib/panjikaIntelligence';
import { generateAllInsights, type Insight } from '../../lib/appIntelligence';
import {
  mergeSuchana,
  suchanaForRole,
  type SuchanaItem,
} from '../../lib/suchanaFeed';
import { buildSoloSnapshot } from '../../lib/suchanaSnapshot';
import { useSoloStore } from '../../solo/soloStore';

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface SuchanaData {
  items: SuchanaItem[];
  loading: boolean;
  /** Raw counts for diagnostics. */
  counts: { panjika: number; module: number };
}

/**
 * Full merged feed for a role. `daysAhead` controls the panjika
 * foresight horizon (digest callers use ~7; full view uses ~30).
 */
export function useSuchana(role: string, daysAhead = 30): SuchanaData {
  const [config, setConfig] = useState<IntelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  // useSuchana is only rendered inside the Solo tree, where SoloProvider exists.
  const { state: soloState } = useSoloStore();

  useEffect(() => {
    let live = true;
    setLoading(true);
    loadIntelConfig()
      .then((c) => {
        if (live) {
          setConfig(c);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const items = useMemo(() => {
    try {
      const from = todayISO();
      const panjika: GeneratedReminder[] = (() => {
        try {
          const base = generateReminders(
            role as any,
            from,
            daysAhead,
            undefined,
            config || undefined
          );
          const anniv = anniversaryReminders(
            (soloState && soloState.samskaras) || [],
            from
          );
          return [...anniv, ...base];
        } catch {
          return [];
        }
      })();
      const insights: Insight[] = (() => {
        try {
          return generateAllInsights(role, buildSoloSnapshot(soloState));
        } catch {
          return [];
        }
      })();
      const merged = mergeSuchana(panjika, insights, {
        digest: daysAhead <= 7,
      });
      const out = suchanaForRole(merged, role);
      (out as any)._counts = { panjika: panjika.length, module: insights.length };
      return out;
    } catch {
      return [];
    }
  }, [role, daysAhead, config, soloState]);

  const counts = useMemo(() => {
    const c = (items as any)._counts;
    return c || { panjika: 0, module: 0 };
  }, [items]);

  return { items, loading, counts };
}
