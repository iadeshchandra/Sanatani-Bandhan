/**
 * TASK: navigate
 * =====================================================================
 * DATA SOURCE: static route map (ARCHITECTURE.md §4). No user data read.
 * OFFLINE STORY: fully offline — routes are bundled constants; the host
 * shell resolves them when connectivity returns (all are local routes).
 */
import type { TaskCtx, TaskOutcome } from '../types';

const PLACES = [
  { label: 'Home', path: '/app/home' },
  { label: 'My Organisations', path: '/app/orgs' },
  { label: 'Suchana', path: '/app/suchana' },
  { label: 'Profile', path: '/app/profile' },
  { label: 'Seva Journeys', path: '/seva/journeys' },
  { label: 'Get the app', path: '/get-app' },
  { label: 'Contact', path: '/contact' },
];

export function navigateTask(ctx: TaskCtx): TaskOutcome {
  const dest = ctx.slots['destination'];
  const destLabel = ctx.slots['destinationLabel'];
  if (dest) {
    return {
      params: { destLabel: destLabel || dest },
      variant: 'destination',
      action: { kind: 'navigate', target: dest },
    };
  }
  const places = PLACES.map((p) => `• ${p.label}`).join('\n');
  return { params: { places }, variant: 'clarify' };
}
