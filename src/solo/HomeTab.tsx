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
import { WalletTab } from './WalletTab';
import { SamskaraDesk } from '../samskara/SamskaraDesk';

/* HomeTab — the Solo personal space, reached at /app/home[/:subTab].
 * =====================================================================
 * The 12 Solo sub-tabs from the old shell now live here as secondary
 * navigation (horizontal scrollable bar), fully URL-driven so every
 * sub-tab is deep-linkable and browser back/forward keeps working.
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

const TAB_LABELS: Record<SoloTabId, string> = {
  home: 'My Space',
  sangam: '🪔 Sangam',
  sadhana: 'Sadhana',
  panchang: 'Panchang',
  panjika: '🗓️ Panjika',
  saved: 'Saved',
  giving: 'Giving',
  jyotish: '🔮 Jyotish',
  marketplace: '🏪 Marketplace',
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

/** Horizontal scrollable secondary sub-tab bar (sits inside the shell header). */
export const HomeSubTabBar: React.FC<{ current: SoloTabId; onSelect: (t: SoloTabId) => void }> = ({
  current,
  onSelect,
}) => (
  <nav className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto" aria-label="My Space sections">
    {SOLO_TAB_IDS.map((id) => (
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
    ))}
  </nav>
);

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
      {tab === 'marketplace' && <ClientMarketplace />}
      {tab === 'wallet' && <WalletTab />}
      {tab === 'samskara' && <SamskaraDesk scopeId={`solo_${firebaseUser?.uid || 'anon'}`} />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
};
