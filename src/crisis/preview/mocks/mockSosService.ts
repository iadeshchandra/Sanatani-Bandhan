/**
 * preview/mocks/mockSosService.ts — DEV-ONLY sosService stub for SOSTimeline
 * screenshots. Serves one mock active SOS + mock responders; every write
 * is a harmless resolved promise.
 */
import { MOCK_EVENTS, MOCK_RESPONSES } from './mockData';
import type { CrisisEvent, CrisisResponse } from '../../crisisCommandTypes';

type Unsubscribe = () => void;

export function subscribeToEvent(
  eventId: string,
  onEvent: (event: CrisisEvent | null) => void
): Unsubscribe {
  const t = window.setTimeout(() => {
    onEvent(MOCK_EVENTS.find((e) => e.id === eventId) ?? MOCK_EVENTS[0]);
  }, 60);
  return () => window.clearTimeout(t);
}

export function subscribeToResponses(
  _eventId: string,
  onResponses: (responses: CrisisResponse[]) => void
): Unsubscribe {
  const t = window.setTimeout(() => onResponses(MOCK_RESPONSES), 60);
  return () => window.clearTimeout(t);
}

export function flushVoiceOutbox(_eventId: string): Promise<void> {
  return Promise.resolve();
}

export async function cancelSOS(_eventId: string, _wasFalseAlarm: boolean): Promise<void> {}
export async function resolveSOS(_eventId: string, _outcome: string | null): Promise<void> {}
export async function ackSOS(_eventId: string, _actor: { uid: string; name: string }): Promise<void> {}
export async function markArrived(_eventId: string, _uid: string): Promise<void> {}

export async function getAbuseRecord(_uid: string): Promise<null> {
  return null;
}
export function isInCooldown(_rec: null): boolean {
  return false;
}
export async function triggerSOS(_input: unknown): Promise<string> {
  return 'evt-preview-1';
}
