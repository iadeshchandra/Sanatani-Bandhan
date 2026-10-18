import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SoloHome } from './SoloHome';
import { SadhanaTab } from './SadhanaTab';
import { PanchangTab } from './PanchangTab';
import { PanjikaTab } from './PanjikaTab';
import { SavedTab } from './SavedTab';
import { GivingTab } from './GivingTab';
import { ProfileTab } from './ProfileTab';
import { JyotishMarketplace } from '../jyotish/JyotishMarketplace';
import { SangamView } from '../sangam/SangamView';
import { ClientMarketplace } from '../marketplace/ClientMarketplace';
import { SangamProvider } from '../sangam/sangamStore';
import { WalletTab } from './WalletTab';
import { SamskaraDesk } from '../samskara/SamskaraDesk';
import { T } from './ui';

/* HomeTab — the Solo personal space, reached at /app/home[/:subTab].
 * =====================================================================
 * The Solo sub-tabs live here as secondary navigation (grouped, URL-driven
 * so every sub-tab stays deep-linkable). Spec §6: the primary strip shows
 * at most 8 daily actions; the rest sit under a "More" section header.
 * 'profile' deliberately has NO pill — the shell bottom tab already leads
 * there (the duplicate pill confused first-time users).
 */

export const SOLO_TAB_IDS = [
  'home',
  'sangam',
  'sadhana',
  'panchang',
  'panjika',
  'saved',
  'giving',
  'jyotish',
  'marketplace',
  'wallet',
  'samskara',
  'profile',
] as const;

export type SoloTabId = (typeof SOLO_TAB_IDS)[number];

/** Primary strip — the 8 daily actions (spec §6). */
const PRIMARY_TABS: readonly SoloTabId[] = [
  'home',
  'sadhana',
  'panchang',
  'panjika',
  'sangam',
  'marketplace',
  'wallet',
  'giving',
];

/** Secondary row under the "More" section header. */
const SECONDARY_TABS: readonly SoloTabId[] = ['saved', 'jyotish', 'samskara'];

const TAB_LABELS: Record<SoloTabId, string> = {
  home: 'My Space',
  sangam: '🪔 Sangam',
  sadhana: 'Sadhana',
  panchang: 'Panchang',
  panjika: '🗓️ Panjika',
  saved: 'Saved',
  giving: 'Giving',
  jyotish: '🔮 Jyotish',
  marketplace: '🪔 Seva',
  wallet: '🪔 Seva Wallet',
  samskara: '🪔 Samskara',
  profile: 'Profile',
};

/** Parse the current sub-tab from the URL path (defaults to 'home'). */
export function soloSubTabFromPath(pathname: string): SoloTabId {
  const m = pathname.match(/^\/app\/home\/([a-z]+)\/?$/);
  const id = m?.[1] as SoloTabId | undefined;
  return id && (SOLO_TAB_IDS as readonly string[]).includes(id) ? id : 'home';
}

/** Grouped secondary sub-tab bar (sits inside the shell header). */
export const HomeSubTabBar: React.FC<{ current: SoloTabId; onSelect: (t: SoloTabId) => void }> = ({
  current,
  onSelect,
}) => {
  const pill = (id: SoloTabId) => (
    <button
      key={id}
      type="button"
      onClick={() => onSelect(id)}
      aria-current={current === id ? 'page' : undefined}
      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-colors ${
        current === id
          ? 'bg-amber-500 text-temple-950'
          : 'bg-white/10 text-amber-200/80 hover:bg-white/20'
      }`}
    >
      {TAB_LABELS[id]}
    </button>
  );
  return (
    <nav className="max-w-5xl mx-auto px-4 pb-3 space-y-1.5" aria-label="My Space sections">
      <div className="flex gap-2 overflow-x-auto items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 shrink-0 w-14">
          <T en="Daily" bn="দৈনিক" hi="दैनिक" />
        </span>
        {PRIMARY_TABS.map(pill)}
      </div>
      <div className="flex gap-2 overflow-x-auto items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 shrink-0 w-14">
          <T en="More" bn="আরও" hi="और" />
        </span>
        {SECONDARY_TABS.map(pill)}
      </div>
    </nav>
  );
};

export const HomeTab: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser } = useAuthWorkspace();
  const tab = soloSubTabFromPath(location.pathname);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      {tab === 'home' && <SoloHome goTab={(t) => navigate(`/app/home/${t}`)} />}
      {tab === 'sangam' && <SangamView />}
      {tab === 'sadhana' && <SadhanaTab />}
      {tab === 'panchang' && <PanchangTab />}
      {tab === 'panjika' && <PanjikaTab />}
      {tab === 'saved' && <SavedTab />}
      {tab === 'giving' && <GivingTab />}
      {tab === 'jyotish' && <JyotishMarketplace />}
      {tab === 'marketplace' && (
        <SangamProvider uid={firebaseUser?.uid || 'anon'}>
          <ClientMarketplace />
        </SangamProvider>
      )}
      {tab === 'wallet' && <WalletTab />}
      {tab === 'samskara' && <SamskaraDesk scopeId={`solo_${firebaseUser?.uid || 'anon'}`} />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
};
