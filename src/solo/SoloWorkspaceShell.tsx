import React, { useState } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { SoloProvider, useSolo } from './SoloContext';
import { SoloStoreProvider } from './soloStore';
import { PurohitProvider } from '../context/PurohitContext';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';
import { useMyJyotishIdentity } from '../jyotish/useMyJyotishIdentity';
import { SoloHome } from './SoloHome';
import { SadhanaTab } from './SadhanaTab';
import { PanchangTab } from './PanchangTab';
import { SavedTab } from './SavedTab';
import { GivingTab } from './GivingTab';
import { ProfileTab } from './ProfileTab';
import { JyotishMarketplace } from '../jyotish/JyotishMarketplace';
import { SangamView } from '../sangam/SangamView';
import { SamskaraDesk } from '../samskara/SamskaraDesk';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { SoloOnboardingTour } from './SoloOnboardingTour';

/* SoloWorkspaceShell — the independent personal workspace.
 * =====================================================================
 * Rendered ONLY when sessionKind === 'solo' (AppContentRouter hard guard).
 * No org switcher, no workspace desks, no org data can reach this tree —
 * the same mutual-exclusion construction Purohit One established.
 *
 * Session switching (all explicit, all user-initiated):
 *  - My Space (solo, current)
 *  - Organisation → exitSoloSession() → normal org session
 *  - Purohit Workspace → enterPurohitSession(existing identity) when a
 *    PUR-XXXXXX is attached; otherwise the JoinUpgrade card offers the
 *    BecomePurohitModal upgrade path.
 */

type SoloTab = 'home' | 'sangam' | 'sadhana' | 'panchang' | 'saved' | 'giving' | 'jyotish' | 'samskara' | 'profile';

const TABS: Array<{ id: SoloTab; en: string; bn: string; hi: string }> = [
  { id: 'home', en: 'My Space', bn: 'আমার স্থান', hi: 'मेरा स्थान' },
  { id: 'sangam', en: '🪔 Sangam', bn: '🪔 সঙ্গম', hi: '🪔 संगम' },
  { id: 'sadhana', en: 'Sadhana', bn: 'সাধনা', hi: 'साधना' },
  { id: 'panchang', en: 'Panchang', bn: 'পঞ্জিকা', hi: 'पञ्चाङ्ग' },
  { id: 'saved', en: 'Saved', bn: 'সংরক্ষিত', hi: 'संग्रहीत' },
  { id: 'giving', en: 'Giving', bn: 'দান', hi: 'दान' },
  { id: 'jyotish', en: '🔮 Jyotish', bn: '🔮 জ্যোতিষ', hi: '🔮 ज्योतिष' },
  { id: 'samskara', en: '🪔 Samskara', bn: '🪔 সংস্কার', hi: '🪔 संस्कार' },
  { id: 'profile', en: 'Profile', bn: 'প্রোফাইল', hi: 'परिचय' },
];

const InnerShell: React.FC = () => {
  const { soloProfile, exitSoloSession, enterPurohitSession, enterJyotishSession, logout, firebaseUser } = useAuthWorkspace();
  const { profile } = useSolo();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { identity: jyotishIdentity } = useMyJyotishIdentity();
  const { showToast } = useToast();
  const [tab, setTab] = useState<SoloTab>('home');
  const [switchOpen, setSwitchOpen] = useState(false);

  const sanId = profile?.id || soloProfile?.id || 'SAN-…';
  const name = profile?.displayName || soloProfile?.displayName || 'Sanatani';

  const switchToOrg = () => {
    exitSoloSession();
    setSwitchOpen(false);
    showToast('Switched to Organisation view', 'success');
  };

  const switchToPurohit = () => {
    if (!purohitIdentity) {
      showToast('No purohit identity attached yet — use “Become a Purohit” below.', 'info');
      setSwitchOpen(false);
      setTab('home');
      return;
    }
    enterPurohitSession(purohitIdentity as any);
    setSwitchOpen(false);
    showToast(`Switched to Purohit Workspace (${purohitIdentity.id})`, 'success');
  };

  const switchToJyotish = () => {
    if (!jyotishIdentity) {
      showToast('No jyotishi identity attached yet — use “Become a Jyotishi” below.', 'info');
      setSwitchOpen(false);
      setTab('home');
      return;
    }
    enterJyotishSession(jyotishIdentity as any);
    setSwitchOpen(false);
    showToast(`Switched to Jyotishi Workspace (${jyotishIdentity.id})`, 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-stone-50">
      {/* Personal header — no org chrome whatsoever. */}
      <header className="sticky top-0 z-40 bg-temple-950/95 backdrop-blur border-b border-amber-900/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shrink-0">
              🪔
            </div>
            <div className="min-w-0">
              <div className="text-white font-extrabold text-sm truncate">My Space</div>
              <div className="text-amber-400/90 text-[11px] font-mono truncate">{sanId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setSwitchOpen((v) => !v)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold border border-white/10 min-h-[44px]"
                aria-label="Switch workspace"
              >
                ⇄ Switch
              </button>
              {switchOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-50">
                  <div className="px-3 py-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {name}
                  </div>
                  <button
                    onClick={() => setSwitchOpen(false)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800"
                  >
                    🪔 My Space <span className="text-stone-400 font-medium">(current)</span>
                  </button>
                  <button
                    onClick={switchToOrg}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    🏛️ Organisation view
                  </button>
                  <button
                    onClick={switchToPurohit}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    🕉️ Purohit Workspace
                    {!purohitIdentity && <span className="text-stone-400 font-medium"> (not attached)</span>}
                  </button>
                  <button
                    onClick={switchToJyotish}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    🔮 Jyotishi Workspace
                    {!jyotishIdentity && <span className="text-stone-400 font-medium"> (not attached)</span>}
                  </button>
                  <div className="border-t border-stone-100 mt-1 pt-1">
                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <nav className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-colors ${
                tab === t.id
                  ? 'bg-amber-500 text-temple-950'
                  : 'bg-white/10 text-amber-200/80 hover:bg-white/20'
              }`}
            >
              {t.en}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 pb-16">
        <div className="flex justify-end mb-3">
          <LocalOnlyBadge />
        </div>
        {tab === 'home' && <SoloHome goTab={setTab} />}
        {tab === 'sangam' && <SangamView />}
        {tab === 'sadhana' && <SadhanaTab />}
        {tab === 'panchang' && <PanchangTab />}
        {tab === 'saved' && <SavedTab />}
        {tab === 'giving' && <GivingTab />}
        {tab === 'jyotish' && <JyotishMarketplace />}
        {tab === 'samskara' && <SamskaraDesk scopeId={`solo_${firebaseUser?.uid || 'anon'}`} />}
        {tab === 'profile' && <ProfileTab />}
      </main>

      {/* First-run onboarding tour for brand-new Solo users. */}
      <SoloOnboardingTour onNavigate={(t) => setTab(t as SoloTab)} />
    </div>
  );
};

export const SoloWorkspaceShell: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  return (
    <SoloProvider uid={uid}>
      <SoloStoreProvider uid={uid}>
        <PurohitProvider>
          <InnerShell />
        </PurohitProvider>
      </SoloStoreProvider>
    </SoloProvider>
  );
};
