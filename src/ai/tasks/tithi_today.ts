/**
 * TASK: tithi_today
 * =====================================================================
 * DATA SOURCE: drikPanchang.drikTithiAt() — computed on-device from
 * astronomical formulae (moon/sun longitude). No external data, no
 * tradition-specific tables; Drik is the documented house reckoning.
 * OFFLINE STORY: fully offline — pure computation, zero network.
 */
import { drikTithiAt } from '../../lib/drikPanchang';
import type { TaskCtx, TaskOutcome } from '../types';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function tithiTodayTask(_ctx: TaskCtx): TaskOutcome {
  const t = drikTithiAt(new Date());
  return {
    params: {
      tithiName: t.name,
      paksha: t.paksha,
      tithiNumber: t.tithiNumber,
      ordinal: ordinal(t.tithiNumber),
    },
    variant: 'default',
  };
}
