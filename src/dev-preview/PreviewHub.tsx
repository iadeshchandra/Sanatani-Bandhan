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

/* ------------------------------------------------------------------ */
/* Phase 1 chat foundation — DEV PREVIEW (mock data, never shipped)    */
/* ------------------------------------------------------------------ */
import { ChatList } from '../chat/ChatList';
import { ChatThread } from '../chat/ChatThread';
import { BlessingCard, BLESSING_OCCASIONS } from '../chat/BlessingCard';
import { T } from '../solo/ui';
import type { ChatParticipant } from '../chat/types';
import type { ChatThreadLive } from '../chat/chatService';

const MOCK_SELF: ChatParticipant = {
  uid: 'preview-self',
  displayName: 'Preview Devotee',
  sanataniId: 'SAN-7K2Q9M',
  verificationTier: 'VERIFIED',
};

const mockPerson = (uid: string, displayName: string, sanataniId: string, verified: boolean): ChatParticipant => ({
  uid,
  displayName,
  sanataniId,
  verificationTier: verified ? 'VERIFIED' : 'REGISTERED',
});

const MOCK_THREADS: ChatThreadLive[] = [
  {
    id: 'preview-self_uidA',
    type: 'direct',
    participants: ['preview-self', 'uidA'],
    participantInfo: {
      'preview-self': MOCK_SELF,
      uidA: mockPerson('uidA', 'Aarav Sharma', 'SAN-3M8X2P', true),
    },
    lastMessage: 'Shubh Deepavali! 🪔',
    lastMessageAt: Date.now() - 25 * 60 * 1000,
    unreadCounts: { 'preview-self': 2, uidA: 0 },
    lastReadAt: {},
    typing: { uidA: true },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 25 * 60 * 1000,
  },
  {
    id: 'preview-self_uidB',
    type: 'direct',
    participants: ['preview-self', 'uidB'],
    participantInfo: {
      'preview-self': MOCK_SELF,
      uidB: mockPerson('uidB', 'Meera Banerjee', 'SAN-9Q4W7Z', true),
    },
    lastMessage: 'The Ekadashi checklist helped a lot, dhanyavaad 🙏',
    lastMessageAt: Date.now() - 2 * 86400000,
    unreadCounts: { 'preview-self': 0, uidB: 0 },
    lastReadAt: { uidB: Date.now() - 86400000 },
    typing: {},
    createdAt: Date.now() - 5 * 86400000,
    updatedAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'org_org9_preview-self',
    type: 'org',
    participants: ['preview-self', 'org9'],
    participantInfo: {
      'preview-self': MOCK_SELF,
      org9: { uid: 'org9', displayName: 'Kashi Vishwanath Trust', orgId: 'org9', verificationTier: 'VERIFIED' },
    },
    lastMessage: 'Diwali volunteer roster is open — reply to join',
    lastMessageAt: Date.now() - 8 * 86400000,
    unreadCounts: { 'preview-self': 0, org9: 0 },
    lastReadAt: {},
    typing: {},
    createdAt: Date.now() - 12 * 86400000,
    updatedAt: Date.now() - 8 * 86400000,
    archivedBy: ['preview-self'],
  },
];

/* ------------------------------------------------------------------ */
/* Chat + P2P — DEV PREVIEW (mock data, never shipped)                 */
/* Section via ?section=list|thread|cards|wallet|modal|qr|ledger|      */
/* skeletons. Used for visual QA + screenshots only.                  */
/* ------------------------------------------------------------------ */
import MoneyRequestCard from '../chat/MoneyRequestCard';
import { PersonalWallet } from '../chat/PersonalWallet';
import RequestModal from '../chat/RequestModal';
import RequestQR from '../chat/RequestQR';
import { OrgRequestLedger } from '../chat/OrgRequestLedger';
import {
  ThreadListSkeleton,
  MessageListSkeleton,
  WalletEntriesSkeleton,
  LedgerRowsSkeleton,
} from '../chat/ChatSkeletons';
import type { ChatMessage, MoneyRequest } from '../chat/types';

const NOW = Date.now();
const mockReq = (over: Partial<MoneyRequest> & { id: string }): MoneyRequest => ({
  direction: 'user_to_user',
  senderId: 'uidA',
  senderName: 'Aarav Sharma',
  receiverId: 'preview-self',
  receiverName: 'Preview Devotee',
  amount: 1500,
  currency: 'BDT',
  note: 'Dakshina for the Satyanarayan katha',
  status: 'pending',
  chatId: 'preview-self_uidA',
  expiresAt: NOW + 36 * 3600 * 1000,
  createdAt: NOW - 2 * 3600 * 1000,
  updatedAt: NOW - 2 * 3600 * 1000,
  ...over,
});

const PREVIEW_REQUESTS: Record<string, MoneyRequest> = {
  'preview-req-1': mockReq({ id: 'preview-req-1' }),
  'preview-req-accepted': mockReq({
    id: 'preview-req-accepted',
    senderId: 'preview-self',
    senderName: 'Preview Devotee',
    receiverId: 'uidB',
    receiverName: 'Meera Banerjee',
    amount: 2500,
    currency: 'INR',
    note: 'Prasad sponsorship for Janmashtami',
    status: 'accepted',
  }),
  'preview-req-paid': mockReq({
    id: 'preview-req-paid',
    amount: 5000,
    currency: 'BDT',
    status: 'paid',
    paidAt: NOW - 30 * 60 * 1000,
    paidRef: 'TRX9HXK2M4P',
    paidVia: 'bkash',
    note: 'Goshala monthly contribution',
  }),
  'preview-req-settled': mockReq({
    id: 'preview-req-settled',
    amount: 750,
    currency: 'INR',
    status: 'settled',
    paidAt: NOW - 86400000,
    paidRef: 'UPI-882931',
    paidVia: 'upi',
    settledAt: NOW - 80000000,
    note: 'Satsang hall booking share',
  }),
  'preview-req-declined': mockReq({
    id: 'preview-req-declined',
    amount: 2000,
    status: 'declined',
    note: 'Festival decoration fund',
  }),
  'preview-req-countered': mockReq({
    id: 'preview-req-countered',
    amount: 3000,
    status: 'countered',
    note: 'Yatra bus booking',
  }),
  'preview-req-cancelled': mockReq({
    id: 'preview-req-cancelled',
    amount: 1000,
    status: 'cancelled',
    note: 'Bhajan evening flowers',
  }),
  'preview-req-expired': mockReq({
    id: 'preview-req-expired',
    amount: 1200,
    status: 'expired',
    expiresAt: NOW - 3600000,
    note: 'Diya oil for the mandir',
  }),
};

const PREVIEW_MESSAGES: Record<string, ChatMessage[]> = {
  'preview-self_uidA': [
    {
      id: 'm1',
      chatId: 'preview-self_uidA',
      senderId: 'uidA',
      kind: 'text',
      text: 'Namaste 🙏 — are you joining the katha tomorrow evening?',
      createdAt: NOW - 86400000 - 7200000,
    },
    {
      id: 'm2',
      chatId: 'preview-self_uidA',
      senderId: 'preview-self',
      kind: 'text',
      text: 'Namaste! Yes, I will be there with family. I was also thinking we should collect the dakshina beforehand this time, because last month we were counting well past midnight and the treasurer had to stay back — আগেরবার অনেক রাত হয়ে গিয়েছিল, এবার আগে থেকে গুছিয়ে নিলে ভালো হয়।',
      createdAt: NOW - 5 * 3600000,
    },
    {
      id: 'm3',
      chatId: 'preview-self_uidA',
      senderId: 'uidA',
      kind: 'blessing',
      text: '॥ शुभ दीपावली ॥',
      blessingMeta: { occasion: 'deepavali', occasionBn: 'দীপাবলি', occasionHi: 'दीपावली' },
      createdAt: NOW - 4 * 3600000,
    },
    {
      id: 'm4',
      chatId: 'preview-self_uidA',
      senderId: 'preview-self',
      kind: 'request_card',
      text: 'Money request',
      requestId: 'preview-req-1',
      createdAt: NOW - 3 * 3600000,
    },
    {
      id: 'm5',
      chatId: 'preview-self_uidA',
      senderId: 'uidA',
      kind: 'text',
      text: 'Received with gratitude 🙏 — accepting now.',
      createdAt: NOW - 2 * 3600000,
    },
  ],
};

const PREVIEW_MY_REQUESTS: MoneyRequest[] = [
  mockReq({ id: 'w1', status: 'pending', amount: 1500, note: 'Dakshina for the Satyanarayan katha' }),
  mockReq({
    id: 'w2',
    senderId: 'preview-self',
    senderName: 'Preview Devotee',
    receiverId: 'uidB',
    receiverName: 'Meera Banerjee with a very long name that should truncate gracefully',
    amount: 2500,
    currency: 'INR',
    status: 'accepted',
    note: 'Prasad sponsorship for Janmashtami celebrations at the community hall',
  }),
  mockReq({
    id: 'w3',
    amount: 5000,
    status: 'paid',
    paidAt: NOW - 30 * 60 * 1000,
    paidRef: 'TRX9HXK2M4P',
    paidVia: 'bkash',
    note: 'Goshala monthly contribution',
  }),
  mockReq({
    id: 'w4',
    direction: 'org_to_user',
    senderId: 'preview-org',
    senderName: 'Kashi Vishwanath Trust',
    senderTrusteeId: 'uidT',
    senderTrusteeName: 'Pt. Ramesh Shastri',
    orgId: 'preview-org',
    orgName: 'Kashi Vishwanath Trust',
    receiverId: 'preview-self',
    receiverName: 'Preview Devotee',
    amount: 11000,
    currency: 'INR',
    status: 'accepted',
    note: 'Diwali volunteer honorarium',
  }),
  mockReq({
    id: 'w5',
    amount: 750,
    currency: 'INR',
    status: 'settled',
    paidAt: NOW - 86400000,
    settledAt: NOW - 80000000,
    paidRef: 'UPI-882931',
    paidVia: 'upi',
    note: 'Satsang hall booking share',
  }),
  mockReq({ id: 'w6', amount: 2000, status: 'declined', note: 'Festival decoration fund' }),
];

const PREVIEW_ORG_REQUESTS: MoneyRequest[] = [
  mockReq({
    id: 'o1',
    direction: 'org_to_user',
    senderId: 'preview-org',
    senderName: 'Kashi Vishwanath Trust',
    senderTrusteeId: 'uidT',
    senderTrusteeName: 'Pt. Ramesh Shastri',
    orgId: 'preview-org',
    orgName: 'Kashi Vishwanath Trust',
    receiverId: 'uidV1',
    receiverName: 'Volunteer Ananya',
    amount: 11000,
    currency: 'INR',
    status: 'accepted',
    note: 'Diwali volunteer honorarium',
  }),
  mockReq({
    id: 'o2',
    direction: 'user_to_org',
    senderId: 'uidD1',
    senderName: 'Devotee Harish',
    receiverId: 'preview-org',
    receiverName: 'Kashi Vishwanath Trust',
    orgId: 'preview-org',
    orgName: 'Kashi Vishwanath Trust',
    amount: 51000,
    currency: 'INR',
    status: 'settled',
    paidAt: NOW - 2 * 86400000,
    settledAt: NOW - 2 * 86400000 + 3600000,
    paidVia: 'upi',
    paidRef: 'UPI-551200',
    note: 'Annadanam sponsorship — Kartik month',
  }),
  mockReq({
    id: 'o3',
    direction: 'org_to_user',
    senderId: 'preview-org',
    senderName: 'Kashi Vishwanath Trust',
    senderTrusteeId: 'uidT2',
    senderTrusteeName: 'Smt. Lakshmi Devi',
    orgId: 'preview-org',
    orgName: 'Kashi Vishwanath Trust',
    receiverId: 'uidV2',
    receiverName: 'Supplier Gopal Traders',
    amount: 25000,
    currency: 'INR',
    status: 'paid',
    paidAt: NOW - 5 * 3600000,
    paidVia: 'bank',
    paidRef: 'NEFT-99821',
    note: 'Diya oil — 500 litres for Deepavali',
  }),
];

const CARD_ORDER = [
  'preview-req-1',
  'preview-req-accepted',
  'preview-req-paid',
  'preview-req-settled',
  'preview-req-declined',
  'preview-req-countered',
  'preview-req-cancelled',
  'preview-req-expired',
];

export const ChatPreview: React.FC = () => {
  const section = new URLSearchParams(window.location.search).get('section') || 'list';
  const [openId, setOpenId] = React.useState<string | null>(null);

  // Mock-data injection for visual QA. NOTE: this object is consumed ONLY
  // when the temporary screenshot-harness patches are applied to
  // useChat.ts (useChatMessages), p2pLedger.ts (fetchMyMoneyRequests,
  // fetchOrgMoneyRequests) and p2pService.ts (subscribeRequest). Those
  // patches are never pushed; without them the sections below simply show
  // their real loading/empty/error states against the live backend.
  (window as unknown as { __CHAT_PREVIEW__?: unknown }).__CHAT_PREVIEW__ = {
    messages: PREVIEW_MESSAGES,
    requestsById: PREVIEW_REQUESTS,
    myRequests: PREVIEW_MY_REQUESTS,
    orgRequests: PREVIEW_ORG_REQUESTS,
  };

  const active = MOCK_THREADS.find((t) => t.id === openId) ?? null;

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-[#faf7f2]">
        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 text-center pt-4">
          DEV PREVIEW — Chat + P2P (mock data, never shipped) · section: {section}
        </p>

        {section === 'list' && !openId && (
          <>
            <h2 className="text-center font-extrabold text-stone-800 mt-2 mb-3">
              <T en="Conversation list" bn="কথোপকথন তালিকা" hi="बातचीत सूची" />
            </h2>
            <div className="max-w-xl mx-auto h-[62vh] bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
              <ChatList
                uid="preview-self"
                threads={MOCK_THREADS}
                loading={false}
                selfInfo={MOCK_SELF}
                onOpen={(id) => setOpenId(id)}
              />
            </div>
            <h2 className="text-center font-extrabold text-stone-800 mt-8 mb-3">
              <T en="Blessing cards" bn="আশীর্বাদ কার্ড" hi="आशीर्वाद कार्ड" />
            </h2>
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-3 px-4 pb-10">
              {BLESSING_OCCASIONS.map((b) => (
                <BlessingCard key={b.key} occasion={b.key} />
              ))}
            </div>
          </>
        )}

        {(section === 'list' && openId) || section === 'thread' ? (
          <div className="max-w-xl mx-auto h-[86vh] bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm mt-2">
            <ChatThread
              uid="preview-self"
              chatId={section === 'thread' ? 'preview-self_uidA' : openId!}
              thread={section === 'thread' ? MOCK_THREADS[0] : active}
              onBack={() => setOpenId(null)}
            />
          </div>
        ) : null}

        {section === 'cards' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
            {CARD_ORDER.map((id) => (
              <div key={id}>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1.5">
                  {PREVIEW_REQUESTS[id].status}
                </p>
                <MoneyRequestCard request={PREVIEW_REQUESTS[id]} currentUid="preview-self" />
              </div>
            ))}
          </div>
        )}

        {section === 'wallet' && (
          <PersonalWallet uid="preview-self" isOpen={true} onClose={() => {}} />
        )}

        {section === 'modal' && (
          <div className="min-h-[92vh]">
            <RequestModal
              open={true}
              onClose={() => {}}
              chatId="preview-self_uidA"
              currentUser={{ uid: 'preview-self', displayName: 'Preview Devotee' }}
              recipient={{ id: 'uidA', name: 'Aarav Sharma' }}
            />
          </div>
        )}

        {section === 'qr' && (
          <div className="min-h-[92vh]">
            <RequestQR request={PREVIEW_REQUESTS['preview-req-1']} open={true} onClose={() => {}} />
          </div>
        )}

        {section === 'ledger' && (
          <OrgRequestLedger
            orgId="preview-org"
            orgName="Kashi Vishwanath Trust"
            role="trustee"
            isOpen={true}
            onClose={() => {}}
          />
        )}

        {section === 'skeletons' && (
          <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Thread list</p>
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
                <ThreadListSkeleton rows={4} />
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Messages</p>
              <div className="bg-[#faf7f2] rounded-3xl border border-stone-200 overflow-hidden">
                <MessageListSkeleton />
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Wallet entries</p>
              <WalletEntriesSkeleton rows={3} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Ledger rows</p>
              <LedgerRowsSkeleton rows={3} />
            </div>
          </div>
        )}
      </div>
    </LanguageProvider>
  );
};
