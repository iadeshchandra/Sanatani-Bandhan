import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Landmark, Receipt, UserCircle, Clock, CalendarCheck2, Home } from 'lucide-react';
import { MODULE_CATALOG, NavItem } from './Sidebar';
import { isModuleAllowed, wouldMountIfEnabled } from '../../lib/workspaceRegistry';
import { isDeskVisibleForRole } from '../../lib/deskVisibility';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { getRecentDesks, recordDeskVisit } from './ui/deskHistory';
import { enableModule } from '../../suggestions/store';

export const OPEN_PALETTE_EVENT = 'sanatani:open-command-palette';

interface CommandPaletteProps {
  onSelectModule: (moduleId: string) => void;
}

interface PaletteItem {
  key: string;
  kind: 'desk' | 'action' | 'recent' | 'install';
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

/** Subsequence fuzzy score — higher is better. Prefix & word-boundary hits win. */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500;
  const wi = t.indexOf(' ' + q);
  if (wi !== -1) return 400;
  if (t.includes(q)) return 300;
  // subsequence
  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += lastMatch === i - 1 ? 12 : 5; // consecutive bonus
      if (i === 0 || t[i - 1] === ' ' || t[i - 1] === '-') score += 8;
      lastMatch = i;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

/**
 * Cmd+K / Ctrl+K command palette over all desks + quick actions.
 * Opens via keyboard or the `sanatani:open-command-palette` window event
 * (dispatched by the Header search trigger).
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ onSelectModule }) => {
  const { activeWorkspace, setViewMode, updateWorkspaceDetails, checkPermission, effectiveRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPalette = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
    // QUEUED #50 (D11b): recents are scoped to the active workspace.
    getRecentDesks(activeWorkspace?.id || null).then(setRecents).catch(() => {});
  }, [activeWorkspace?.id]);

  const closePalette = useCallback(() => setOpen(false), []);

  // Global hotkey + external open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery('');
            setActiveIndex(0);
            getRecentDesks(activeWorkspace?.id || null).then(setRecents).catch(() => {});
          }
          return !prev;
        });
      }
    };
    const onExternal = () => openPalette();
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onExternal);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onExternal);
    };
  }, [openPalette]);

  // Body scroll lock + autofocus while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // QUEUED #56 (audit A2-D2): taxonomy AND role. The palette used to
  // filter by org taxonomy only, offering Treasury/POS/restricted desks
  // to roles whose nav hides them — every such pick landed on
  // RestrictedAccess. The role decision is the Sidebar's own, shared
  // via src/lib/deskVisibility.ts (recents below draw from this same
  // list, so they inherit the filter).
  const desks = useMemo(
    () =>
      MODULE_CATALOG.filter(
        (m) =>
          isModuleAllowed(activeWorkspace, m.id) &&
          isDeskVisibleForRole(m, effectiveRole, checkPermission)
      ),
    [activeWorkspace, effectiveRole, checkPermission]
  );

  // Seva Suggestions: modules not yet enabled but installable from the store.
  // Same exclusion list as AppStoreDesk — these are never "installed".
  // QUEUED #57 (audit A1-D01): the shelf also requires the desk to
  // actually MOUNT once enabled (wouldMountIfEnabled simulates the
  // enable against the real mount guard). handleInstall below toasts
  // "now on — opening it" and navigates straight there; before this
  // gate that promise landed cross-family shiksha ids and other
  // guard-refused desks on the restricted screen.
  const installable = useMemo(
    () =>
      MODULE_CATALOG.filter(
        (m) =>
          !isModuleAllowed(activeWorkspace, m.id) &&
          !['dashboard', 'appStore', 'sadhana-karma', 'sanatani-vivah', 'yatraNet'].includes(m.id) &&
          wouldMountIfEnabled(activeWorkspace, m.id)
      ),
    [activeWorkspace]
  );

  const handleInstall = useCallback(
    (moduleId: string) => {
      if (!activeWorkspace) return;
      // V1 RBAC: enabling a module bypasses the org-type taxonomy — Trustee+ only.
      if (!checkPermission(['TRUSTEE', 'SuperAdmin'])) {
        showToast('Only Trustees can enable new modules for this organisation.', 'error', 'Permission Denied');
        return;
      }
      const mod = MODULE_CATALOG.find((m) => m.id === moduleId);
      enableModule(activeWorkspace.enabledModules, moduleId, updateWorkspaceDetails, activeWorkspace.id);
      showToast(`“${mod?.name || moduleId}” is now on — opening it.`, 'success', 'Module Enabled');
      onSelectModule(moduleId);
    },
    [activeWorkspace, updateWorkspaceDetails, onSelectModule, showToast, checkPermission]
  );

  const quickActions: PaletteItem[] = useMemo(
    () => {
      // QUEUED #56 (audit A2-D2): quick actions are gated by the SAME
      // checkPermission sets as their desks' mount guards in App.tsx —
      // an action a role cannot mount is never offered to that role.
      // (qa-personal is a view switch, not a desk — open to everyone.)
      const actions: PaletteItem[] = [
        ...(checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE'])
          ? [
              {
                key: 'qa-treasury',
                kind: 'action' as const,
                label: 'Open Treasury Ledger',
                sub: 'Financials & Assets · new voucher',
                icon: Landmark,
                run: () => onSelectModule('treasury'),
              },
            ]
          : []),
        ...(checkPermission(['TRUSTEE', 'ACCOUNTANT', 'SEVADAR', 'SuperAdmin'])
          ? [
              {
                key: 'qa-pos',
                kind: 'action' as const,
                label: 'Quick Chanda POS',
                sub: 'Financials & Assets · counter collection',
                icon: Receipt,
                run: () => onSelectModule('quick-chanda-pos'),
              },
            ]
          : []),
        {
          key: 'qa-personal',
          kind: 'action',
          label: 'Switch to Personal View',
          sub: 'Devotee space',
          icon: UserCircle,
          run: () => setViewMode('MEMBER'),
        },
      ];
      // QUEUED #48 — deep-link actions for desks that live INSIDE a
      // suite. Attendance is the Upasthiti tab of Pathshala One: the
      // palette action primes the suite's initial tab (sessionStorage
      // hand-off read once by PathshalaDesk) and opens the suite, so
      // "attendance" is reachable without hunting through tabs.
      const pathshalaEntry = MODULE_CATALOG.find((m) => m.id === 'pathshala');
      if (
        activeWorkspace &&
        isModuleAllowed(activeWorkspace, 'pathshala') &&
        pathshalaEntry &&
        isDeskVisibleForRole(pathshalaEntry, effectiveRole, checkPermission)
      ) {
        actions.push({
          key: 'qa-attendance',
          kind: 'action',
          label: 'Attendance (Upasthiti) — mark today’s register',
          sub: 'Pathshala One · attendance tab',
          icon: CalendarCheck2,
          run: () => {
            try {
              sessionStorage.setItem('sb_pathshala_open_tab', 'upasthiti');
            } catch {
              /* storage unavailable — suite opens on its dashboard */
            }
            onSelectModule('pathshala');
          },
        });
      }
      // QUEUED #48 — Ashram residents as their own palette entry. The
      // residents live on the Kutirs tab of the Ashram Kutir desk
      // (rooms + occupied stays), which is that desk's default tab.
      const ashramKutirEntry = MODULE_CATALOG.find((m) => m.id === 'ashramKutir');
      if (
        activeWorkspace &&
        (activeWorkspace.type === 'Ashram' || activeWorkspace.type === 'Yoga') &&
        isModuleAllowed(activeWorkspace, 'ashramKutir') &&
        ashramKutirEntry &&
        isDeskVisibleForRole(ashramKutirEntry, effectiveRole, checkPermission)
      ) {
        actions.push({
          key: 'qa-residents',
          kind: 'action',
          label: 'Ashram Residents & Kutir Stays',
          sub: 'Ashram Kutir desk · residents, rooms & stay passes',
          icon: Home,
          run: () => onSelectModule('ashramKutir'),
        });
      }
      return actions;
    },
    [onSelectModule, setViewMode, activeWorkspace, checkPermission, effectiveRole]
  );

  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recentItems: PaletteItem[] = recents
        .map((id) => desks.find((d) => d.id === id))
        .filter((d): d is NavItem => !!d)
        .map((d) => ({
          key: `recent-${d.id}`,
          kind: 'recent' as const,
          label: d.name,
          sub: d.domainTitle,
          icon: d.icon,
          run: () => onSelectModule(d.id),
        }));
      return [...recentItems, ...quickActions];
    }
    const scored = desks
      .map((d) => ({
        d,
        s: Math.max(
          fuzzyScore(q, d.name),
          fuzzyScore(q, d.id),
          fuzzyScore(q, d.domainTitle),
          fuzzyScore(q, d.keywords ?? '')
        ),
      }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map(({ d }) => ({
        key: `desk-${d.id}`,
        kind: 'desk' as const,
        label: d.name,
        sub: d.domainTitle,
        icon: d.icon,
        run: () => onSelectModule(d.id),
      }));
    const matchedActions = quickActions.filter(
      (a) => fuzzyScore(q, a.label) >= 0
    );
    // Seva Suggestions: not-yet-installed modules, searchable + one-tap install.
    const matchedInstallable = installable
      .map((d) => ({
        d,
        s: Math.max(
          fuzzyScore(q, d.name),
          fuzzyScore(q, d.id),
          fuzzyScore(q, d.domainTitle),
          fuzzyScore(q, d.keywords ?? '')
        ),
      }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(({ d }) => ({
        key: `install-${d.id}`,
        kind: 'install' as const,
        label: d.name,
        sub: `${d.domainTitle} · not installed — select to enable`,
        icon: d.icon,
        run: () => handleInstall(d.id),
      }));
    return [...scored, ...matchedInstallable, ...matchedActions];
  }, [query, desks, recents, quickActions, onSelectModule, installable, handleInstall]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep active item in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const runItem = useCallback(
    (item: PaletteItem) => {
      if (item.kind === 'desk' || item.kind === 'recent') {
        const deskId = item.key.replace(/^(desk|recent)-/, '');
        recordDeskVisit(deskId, activeWorkspace?.id || null).catch(() => {});
      }
      setOpen(false);
      item.run();
    },
    [activeWorkspace?.id]
  );

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) runItem(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  };

  if (!open) return null;

  const showRecentHeader = !query.trim() && items.some((i) => i.kind === 'recent');
  const showActionsHeader = !query.trim() && items.some((i) => i.kind === 'action');

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <div className="absolute inset-0 bg-temple-950/70 backdrop-blur-sm" onClick={closePalette} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette — jump to any desk"
        className="relative w-full max-w-xl bg-temple-900 border border-temple-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 border-b border-temple-800">
          <Search className="w-4 h-4 text-temple-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={items[activeIndex] ? `cmdk-item-${items[activeIndex].key}` : undefined}
            aria-label="Search desks and actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a desk… (treasury, goshala, bhoomi)"
            className="w-full bg-transparent py-4 text-sm text-temple-100 placeholder-temple-500 focus:outline-none"
          />
          <kbd className="kbd shrink-0">esc</kbd>
        </div>

        <div ref={listRef} id="cmdk-list" role="listbox" aria-label="Results" className="max-h-[46vh] overflow-y-auto custom-scrollbar py-2">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-temple-400">
              No desks match “{query}”. Try “treasury”, “pooja”, or “vahan”.
            </p>
          )}
          {showRecentHeader && (
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-temple-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" aria-hidden="true" /> Recent
            </p>
          )}
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === activeIndex;
            const showActionHeader = showActionsHeader && item.kind === 'action' && (idx === 0 || items[idx - 1].kind !== 'action');
            return (
              <React.Fragment key={item.key}>
                {showActionHeader && (
                  <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-temple-500">
                    Quick actions
                  </p>
                )}
                <div
                  id={`cmdk-item-${item.key}`}
                  role="option"
                  aria-selected={isActive}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => runItem(item)}
                  className={[
                    'mx-2 flex items-center gap-3 px-3 rounded-xl cursor-pointer min-h-[44px]',
                    isActive ? 'bg-saffron-500/15 border border-saffron-500/40' : 'border border-transparent',
                  ].join(' ')}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-saffron-400' : 'text-temple-400'}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1 py-2">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-temple-100' : 'text-temple-300'}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-temple-500 truncate">{item.sub}</p>
                  </div>
                  {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-saffron-400 shrink-0" aria-hidden="true" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-temple-800 text-[11px] text-temple-500">
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> open</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
