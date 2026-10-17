/**
 * preview/mocks/mockHistoryService.ts — DEV-ONLY historyService stub.
 */
import { MOCK_EVENTS, MOCK_RESPONSES } from './mockData';
import type { CrisisEvent, CrisisResponse } from '../../crisisCommandTypes';

export async function getMySentSOSWithResponses(
  _uid: string
): Promise<{ event: CrisisEvent; responses: CrisisResponse[] }[]> {
  return [{ event: MOCK_EVENTS[2], responses: MOCK_RESPONSES }];
}

export async function getMyResponses(
  _uid: string
): Promise<{ event: CrisisEvent; myResponse: CrisisResponse }[]> {
  return [{ event: MOCK_EVENTS[0], myResponse: MOCK_RESPONSES[0] }];
}
