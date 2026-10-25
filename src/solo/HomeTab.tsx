import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { SoloHome } from './SoloHome';
import { SadhanaTab } from './SadhanaTab';
import { PanchangTab } from './PanchangTab';
import { PanjikaTab } from './PanjikaTab';
import { SavedTab } from './SavedTab';
import { GivingTab } from './GivingTab';
import { ReceiptsView } from './ReceiptsView';
import { ProfileTab } from './ProfileTab';
import { JyotishMarketplace } from '../jyotish/JyotishMarketplace';
import { SangamView } from '../sangam/SangamView';
import { ClientMarketplace } from '../marketplace/ClientMarketplace';
import { SangamProvider } from '../sangam/sangamStore';
import { WalletTab } from './WalletTab';
import { SamskaraDesk } from '../samskara/SamskaraDesk';
import { T } from './ui';
import { recordUse } from '../lib/usageStore';
import { pillRevealScrollLeft } from './subTabScroll';
import { useFeatureFlag } from '../hooks/usePlatformStatus';

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
  'receipts',
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
  receipts: '🧾 Receipts',
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
  // AUDIT FIX #8: feature-flag kill-switches, actually wired. A flag that is
  // explicitly OFF hides its tab; everything else fails open.
  const sangamOn = useFeatureFlag('sangam_enabled');
  const marketplaceOn = useFeatureFlag('marketplace_enabled');
  const visible = (id: SoloTabId) =>
    (id === 'sangam' ? sangamOn : true) && (id === 'marketplace' ? marketplaceOn : true);
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
  // U8c: the strip keeps its scroll position across navigation (sticky
  // header), which could leave the SELECTED pill resting clipped at the
  // edge. On mount and on every tab change, reveal the active pill
  // fully inside its row — horizontal only, the page never jumps.
  const dailyRowRef = useRef<HTMLDivElement>(null);
  const moreRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const row of [dailyRowRef.current, moreRowRef.current]) {
      if (!row) continue;
      const active = row.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) continue;
      const target = pillRevealScrollLeft(
        row.scrollLeft,
        row.getBoundingClientRect(),
        active.getBoundingClientRect()
      );
      if (target === row.scrollLeft) continue;
      try {
        row.scrollTo({ left: target, behavior: 'smooth' });
      } catch {
        row.scrollLeft = target;
      }
    }
  }, [current]);
  return (
    <nav className="max-w-5xl mx-auto px-4 pb-3 space-y-1.5" aria-label="My Space sections">
      <div ref={dailyRowRef} className="flex gap-2 overflow-x-auto items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 shrink-0 w-14">
          <T en="Daily" bn="দৈনিক" hi="दैनिक" />
        </span>
        {PRIMARY_TABS.filter(visible).map(pill)}
      </div>
      <div ref={moreRowRef} className="flex gap-2 overflow-x-auto items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/50 shrink-0 w-14">
          <T en="More" bn="আরও" hi="और" />
        </span>
        {SECONDARY_TABS.filter(visible).map(pill)}
      </div>
    </nav>
  );
};

export const HomeTab: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser } = useAuthWorkspace();
  const tab = soloSubTabFromPath(location.pathname);
  // AUDIT FIX #8: route-level guard — a deep-link to a killed module lands on
  // Home instead of a dead tab.
  const sangamOn = useFeatureFlag('sangam_enabled');
  const marketplaceOn = useFeatureFlag('marketplace_enabled');
  const effectiveTab: SoloTabId =
    (tab === 'sangam' && !sangamOn) || (tab === 'marketplace' && !marketplaceOn) ? 'home' : tab;

  // VIBE B2: a sub-tab that actually renders is a real open — record it
  // in the device-local usage store (scope 'solo') that orders the Solo
  // home's "Your usual" row. 'home' itself is not an action.
  useEffect(() => {
    if (effectiveTab !== 'home') recordUse(effectiveTab, 'solo');
  }, [effectiveTab]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      {effectiveTab === 'home' && <SoloHome goTab={(t) => navigate(`/app/home/${t}`)} />}
      {effectiveTab === 'sangam' && <SangamView />}
      {effectiveTab === 'sadhana' && <SadhanaTab />}
      {effectiveTab === 'panchang' && <PanchangTab />}
      {effectiveTab === 'panjika' && <PanjikaTab />}
      {effectiveTab === 'saved' && <SavedTab />}
      {effectiveTab === 'giving' && <GivingTab />}
      {effectiveTab === 'receipts' && <ReceiptsView />}
      {effectiveTab === 'jyotish' && <JyotishMarketplace />}
      {effectiveTab === 'marketplace' && (
        <SangamProvider uid={firebaseUser?.uid || 'anon'}>
          <ClientMarketplace />
        </SangamProvider>
      )}
      {effectiveTab === 'wallet' && <WalletTab />}
      {effectiveTab === 'samskara' && <SamskaraDesk scopeId={`solo_${firebaseUser?.uid || 'anon'}`} />}
      {effectiveTab === 'profile' && <ProfileTab />}
    </div>
  );
};
