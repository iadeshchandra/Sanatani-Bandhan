import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ProfileOrgHub } from '../solo/ProfileOrgHub';
import { JoinOrgScreen } from '../solo/JoinOrgScreen';
import type { WorkspaceConfig } from '../types';
import type { WorkspaceMembership } from '../types/membership';

/* DEV-ONLY preview of the Phase 2 profile org hub (never in production
 * builds). Renders the REAL ProfileOrgHub with representative mock data:
 * a Trustee card on the active org (live counts) and a Devotee card on a
 * second org (member-since), plus the empty state.
 */

const ws = (over: Partial<WorkspaceConfig> & { id: string; name: string }): WorkspaceConfig =>
  ({
    type: 'Mandir',
    tagline: '',
    address: '',
    city: 'Kashi',
    state: 'Uttar Pradesh',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    sampradaya: 'Smarta',
    kuladevata: '—',
    ...over,
  } as WorkspaceConfig);

const mem = (over: Partial<WorkspaceMembership> & { workspaceId: string; role: string }): WorkspaceMembership =>
  ({
    id: `${over.workspaceId}_preview-user`,
    uid: 'preview-user',
    displayName: 'Preview Devotee',
    joinedAt: Date.now() - 400 * 24 * 3600 * 1000,
    joinedVia: 'request',
    ...over,
  } as WorkspaceMembership);

export const ProfileOrgHubPreview: React.FC = () => {
  const workspaces = [
    ws({ id: 'ws-kashi-vishwanath', name: 'Kashi Vishwanath Mandir Trust', type: 'Mandir', city: 'Varanasi' }),
    ws({ id: 'ws-anand-ashram', name: 'Anand Ashram', type: 'Ashram', city: 'Rishikesh', state: 'Uttarakhand' }),
  ];
  const memberships = [
    mem({ workspaceId: 'ws-kashi-vishwanath', role: 'Trustee' }),
    mem({ workspaceId: 'ws-anand-ashram', role: 'Devotee', joinedAt: Date.now() - 90 * 24 * 3600 * 1000 }),
  ];
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-stone-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6 py-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">
            DEV PREVIEW — ProfileOrgHub (mock data, never shipped)
          </p>
          <ProfileOrgHub
            memberships={memberships}
            workspaces={workspaces}
            activeWorkspaceId="ws-kashi-vishwanath"
            orgMembersCount={128}
            pendingRequestsCount={3}
            openingOrgId={null}
            onOpen={() => {}}
            onJoin={() => {}}
          />
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">
            Empty state
          </p>
          <ProfileOrgHub
            memberships={[]}
            workspaces={[]}
            orgMembersCount={0}
            pendingRequestsCount={0}
            openingOrgId={null}
            onOpen={() => {}}
            onJoin={() => {}}
          />
        </div>
      </div>
    </LanguageProvider>
  );
};

/* DEV-ONLY: JoinOrgScreen smoke render (real providers; unauthenticated
 * dev session → empty directory + create card; the per-org state logic
 * is exercised by the unit-style checks in the verify script). */
export const JoinOrgScreenPreview: React.FC = () => (
  <LanguageProvider>
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-stone-50">
      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 text-center pt-6">
        DEV PREVIEW — JoinOrgScreen (real providers, never shipped)
      </p>
      <JoinOrgScreen />
    </div>
  </LanguageProvider>
);
