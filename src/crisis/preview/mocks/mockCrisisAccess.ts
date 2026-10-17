/**
 * preview/mocks/mockCrisisAccess.ts — DEV-ONLY crisisAccess stub.
 */
import { MOCK_ACCESS } from './mockData';

export function useCrisisAccess(_orgId?: string) {
  return MOCK_ACCESS;
}

export function coordinatorDocId(orgId: string, uid: string): string {
  return `${orgId}_${uid}`;
}

export default useCrisisAccess;
