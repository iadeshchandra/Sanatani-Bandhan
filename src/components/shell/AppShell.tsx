import React from 'react';
import { T } from '../../solo/ui';

/* AppShell — the 4-tab Solo-first app shell.
 * =====================================================================
 * Mobile (<768px): fixed bottom tab bar, 4 tabs with icons + labels.
 * Desktop (≥768px): fixed left sidebar (~240px), content to the right.
 * The shell ONLY renders for solo sessions (sessionKind === 'solo') —
 * purohit / jyotish / org sessions keep their own shells untouched.
 */

export type AppTabId = 'home' | 'orgs' | 'suchana' | 'profile';

export const APP_TABS: Array<{ id: AppTabId; icon: string; en: string; bn: string; hi: string }> = [
  { id: 'home', icon: '🏠', en: 'Home', bn: 'হোম', hi: 'होम' },
  { id: 'orgs', icon: '🏛️', en: 'Orgs', bn: 'সংগঠন', hi: 'संगठन' },
  { id: 'suchana', icon: '🪔', en: 'Suchana', bn: 'সূচনা', hi: 'सूचना' },
  { id: 'profile', icon: '👤', en: 'Profile', bn: 'প্রোফাইল', hi: 'परिचय' },
];

interface AppShellProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  /** Sticky top header (My Space + SAN ID + Suchana button). Rendered as-is. */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Unread notification count — shown as a quiet badge on the Suchana tab. */
  suchanaUnread?: number;
}

export const AppShell: React.FC<AppShellProps> = ({ activeTab, onTabChange, header, children, suchanaUnread = 0 }) => {
  const showBadge = suchanaUnread > 0;
  const badgeLabel = suchanaUnread > 9 ? '9+' : String(suchanaUnread);
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-stone-50">
      {/* Desktop: fixed left sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-temple-950 text-amber-100 z-40 border-r border-amber-900/30">
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shrink-0">
            🪔
          </div>
          <div className="min-w-0">
            <div className="text-white font-extrabold text-sm leading-tight">Sanatani Bandhan</div>
            <div className="text-amber-400/70 text-[11px]">
              <T en="My personal space" bn="আমার ব্যক্তিগত স্থান" hi="मेरा व्यक्तिगत स्थान" />
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1" aria-label="Primary">
          {APP_TABS.map((t) => {
            const isActive = activeTab === t.id;
            const tabBadge = t.id === 'suchana' && showBadge;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] ${
                  isActive
                    ? 'bg-amber-500 text-temple-950'
                    : 'text-amber-200/80 hover:bg-white/10 hover:text-amber-100'
                }`}
              >
                <span className="relative text-xl leading-none" aria-hidden>
                  {t.icon}
                  {tabBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shadow">
                      {badgeLabel}
                    </span>
                  )}
                </span>
                <T en={t.en} bn={t.bn} hi={t.hi} />
                {tabBadge && (
                  <span className="sr-only">
                    {suchanaUnread} unread
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-[11px] text-amber-400/50 font-medium">
          ॥ धर्मो रक्षति रक्षितः ॥
        </div>
      </aside>

      {/* Main column (offset by sidebar on desktop) */}
      <div className="md:pl-60">
        {header}
        {/* pb-28 keeps content clear of the mobile bottom bar */}
        <main className="pb-28 md:pb-10">{children}</main>
      </div>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-temple-950/95 backdrop-blur border-t border-amber-900/30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4">
          {APP_TABS.map((t) => {
            const isActive = activeTab === t.id;
            const tabBadge = t.id === 'suchana' && showBadge;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tabBadge ? `${t.en}, ${suchanaUnread} unread` : t.en}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  isActive ? 'text-amber-400' : 'text-amber-200/60'
                }`}
              >
                <span className="relative text-xl leading-none" aria-hidden>
                  {t.icon}
                  {tabBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shadow">
                      {badgeLabel}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-amber-400' : ''}`}>
                  <T en={t.en} bn={t.bn} hi={t.hi} />
                </span>
                {isActive && <span className="w-8 h-0.5 rounded-full bg-amber-400 mt-0.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
