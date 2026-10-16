import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { ProfileOrgHub } from '../solo/ProfileOrgHub';
import { JoinOrgScreen } from '../solo/JoinOrgScreen';
import { FestivalEventPage } from '../components/festival/FestivalEventPage';
import type { WorkspaceConfig } from '../types';
import type { WorkspaceMembership } from '../types/membership';
import type { FestivalEventDoc } from '../lib/festival';

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

/* DEV-ONLY: FestivalEventPage with a realistic mock published event
 * (Pillar 2 war-room). Never shipped — screenshots + visual QA only. */

const MOCK_FESTIVAL_EVENT: FestivalEventDoc = {
  id: 'DEMO_ws-mandir__diwali_2026-11-08',
  workspaceId: 'DEMO_ws-mandir',
  festivalKey: 'diwali_2026-11-08',
  orgName: 'Shri Ram Mandir Trust',
  name: { en: 'Diwali / Deepavali', bn: 'দীপাবলি', hi: 'दीपावली' },
  significance: {
    en: 'Festival of lights — Lakshmi Puja on Kartik Amavasya; light triumphs over darkness.',
    bn: 'আলোর উৎসব — কার্তিক অমাবস্যায় লক্ষ্মীপূজা।',
    hi: 'Festival of lights — Lakshmi Puja on Kartik Amavasya; light triumphs over darkness.',
  },
  dateISO: '2026-11-08',
  endDateISO: '2026-11-12',
  tithiLine: 'Krishna Amavasya • Kartika',
  timings: [
    { id: 'tm1', label: { en: 'Mangala aarti', bn: 'মঙ্গল আরতি', hi: 'मंगल आरती' }, time: '6:00 AM' },
    { id: 'tm2', label: { en: 'Lakshmi Puja', bn: 'লক্ষ্মীপূজা', hi: 'लक्ष्मी पूजा' }, time: '7:15 PM' },
    { id: 'tm3', label: { en: 'Sandhya aarti & deep-daan', bn: 'সন্ধ্যা আরতি ও দীপদান', hi: 'संध्या आरती व दीपदान' }, time: '6:30 PM' },
  ],
  story: {
    en: 'On this night the whole town becomes a constellation of diyas. Come, light one with us — for Lakshmi, for home, for everyone finding their way in the dark.',
    bn: 'এই রাতে পুরো শহর প্রদীপের নক্ষত্রমণ্ডলী হয়ে ওঠে। আসুন, আমাদের সঙ্গে একটি প্রদীপ জ্বালান।',
    hi: 'On this night the whole town becomes a constellation of diyas. Come, light one with us.',
  },
  rsvpEnabled: true,
  darshanSlots: [
    { id: 'sl1', label: { en: 'Morning darshan', bn: 'সকালের দর্শন', hi: 'सुबह दर्शन' }, capacity: 200 },
    { id: 'sl2', label: { en: 'Sandhya aarti darshan', bn: 'সন্ধ্যা আরতি দর্শন', hi: 'संध्या आरती दर्शन' }, capacity: 150 },
  ],
  published: true,
  publishedHeadcount: 4800,
  slotBooked: { sl1: 132, sl2: 148 },
  rsvpHeadcount: 312,
  updatedAt: new Date().toISOString(),
};

export const FestivalEventPreview: React.FC = () => (
  <LanguageProvider>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 text-center pt-4 bg-orange-50">
        DEV PREVIEW — FestivalEventPage (mock data, never shipped)
      </p>
      <FestivalEventPage previewEvent={MOCK_FESTIVAL_EVENT} />
    </div>
  </LanguageProvider>
);
