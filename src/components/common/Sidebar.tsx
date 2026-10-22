import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, LayoutDashboard,
  Users,
  Home,
  GitFork,
  UserPlus,
  MailOpen,
  FileSpreadsheet,
  FileCode2,
  Landmark,
  Receipt,
  Target,
  Sparkles,
  Package,
  Building2,
  Bus,
  Flame,
  Clock,
  BookOpen,
  Globe,
  HeartHandshake,
  Calendar,
  Utensils,
  Soup,
  Moon,
  GraduationCap,
  Award,
  BookMarked,
  Radio,
  Swords,
  Library,
  Heart,
  HeartPulse,
  CalendarCheck2, Wifi, WifiOff, CloudOff, RefreshCcw,
  Vote,
  MessageSquare,
  Image as ImageIcon,
  Scale,
  ScrollText,
  Ticket,
  Sunrise,
  Music,
  Lock,
  UserCheck,
  Settings,
  Compass,
  Megaphone,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
  ArrowLeftRight,
  Filter,
  Check,
  ShieldCheck,
  Network,
  ScanFace,
  Star,
  Repeat,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { isModuleAllowed, isModuleAllowedForPlan, requiredTierForModule } from '../../lib/workspaceRegistry';
import { isDeskVisibleForRole } from '../../lib/deskVisibility';
import { useMembership } from '../../context/MembershipContext';
import { effectiveDeskScope } from '../../lib/membershipAccess';
import { whatsappLink, hasWhatsApp } from '../../config/contact';
import { OfflineSyncManager } from '../../services/OfflineSyncManager';
import { getPinnedDesks, togglePinnedDesk, getRecentDesks, recordDeskVisit } from './ui/deskHistory';
import { UpsellModal } from './UpsellModal';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';

export interface NavItem {
  id: string;
  name: string;
  domain: number;
  domainTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /**
   * Extra search terms for the command palette (QUEUED #48). Desks are
   * found by what users actually type — "shishya", "attendance",
   * "residents" — not only by their catalog name. Scored by
   * CommandPalette alongside name/id/domainTitle.
   */
  keywords?: string;
}

export const MODULE_CATALOG: NavItem[] = [
  // QUEUED #57 (audit A1-D10): the old Domain-0 'devotee-portal' row is
  // gone — domain groups render 1–7 only and the taxonomy filter could
  // never pass it, so the row was dead weight that invited exactly the
  // wrong edits. Personal switching happens via viewMode, not a desk row.
  // Domain 1: Core Command & CRM
  { id: 'dashboard', name: 'Command Center', domain: 1, domainTitle: 'Core Command & CRM', icon: LayoutDashboard },
  { id: 'checkin', name: 'Gate Command & Check-In', domain: 1, domainTitle: 'Core Command & CRM', icon: ScanFace, badge: 'Biometric' },
  { id: 'devotees', name: 'Devotee & Member Directory', domain: 1, domainTitle: 'Core Command & CRM', icon: Users, badge: 'Dynamic' },
  { id: 'membership', name: 'Membership: Invites & Requests', domain: 1, domainTitle: 'Core Command & CRM', icon: MailOpen, badge: 'New' },
  { id: 'family', name: 'Household & Kul Parivar', domain: 1, domainTitle: 'Core Command & CRM', icon: Home },
  { id: 'vanshavali', name: 'Ancestral Lineage (Vanshavali)', domain: 1, domainTitle: 'Core Command & CRM', icon: GitFork },
  { id: 'guests', name: 'Guest & Visitor CRM', domain: 1, domainTitle: 'Core Command & CRM', icon: UserPlus },
  { id: 'donorCare', name: 'Donor Care & Win-Back', domain: 1, domainTitle: 'Core Command & CRM', icon: HeartHandshake, badge: 'New' },
  { id: 'bulkImport', name: 'Bulk CSV Ingestion', domain: 1, domainTitle: 'Core Command & CRM', icon: FileSpreadsheet },
  { id: 'federation', name: 'Federation & Multi-Branch HQ', domain: 1, domainTitle: 'Core Command & CRM', icon: Network, badge: 'HQ Rollup' },
  { id: 'sevadar-roster', name: 'Sevadar HR & Volunteer Roster', domain: 1, domainTitle: 'Core Command & CRM', icon: UserCheck, badge: 'SOP / KYC' },
  // QUEUED #57 (audit A1-D08): 'crisis-command' was listed here AND in
  // Domain 6 — duplicate nav entries and duplicate App Store cards.
  // The Domain 6 row (Governance & Security) is the single entry now.

  // Domain 2: Financials & Assets
  { id: 'quick-chanda-pos', name: 'Quick Chanda Counter POS', domain: 2, domainTitle: 'Financials & Assets', icon: Receipt, badge: 'High-Speed' },
  { id: 'treasury', name: 'Treasury & Expense Ledger', domain: 2, domainTitle: 'Financials & Assets', icon: Landmark, badge: 'Auto-Audit' },
  // QUEUED #57 (audit A1-D01): the 'treasury-audit' shadow row is gone —
  // it was an alias door to this same desk whose enable wrote a key the
  // mount guard never consulted. One desk, one canonical row.
  { id: 'hundi-audit', name: 'Hundi & Golak Dual Audit', domain: 2, domainTitle: 'Financials & Assets', icon: Lock, badge: '2-Key' },
  { id: 'cash-custody', name: 'Cash Custody — Hundi Chain of Custody', domain: 2, domainTitle: 'Financials & Assets', icon: Lock, badge: 'New' },
  { id: 'ratna-bhandar', name: 'Ratna Bhandar & Bullion Vault', domain: 2, domainTitle: 'Financials & Assets', icon: Sparkles, badge: 'Dual-PIN' },
  { id: 'taxReceipts', name: 'Tax Certificates (80G/12A)', domain: 2, domainTitle: 'Financials & Assets', icon: Receipt },
  { id: 'form10bd', name: 'Form 10BD & CBDT Filing', domain: 2, domainTitle: 'Financials & Assets', icon: FileSpreadsheet, badge: 'E-File' },
  { id: 'tally-export', name: 'Tally Prime XML Export', domain: 2, domainTitle: 'Financials & Assets', icon: FileCode2 },
  { id: 'campaigns', name: 'Crowdfunding & Mandir Nirman', domain: 2, domainTitle: 'Financials & Assets', icon: Target },
  { id: 'karmaLedger', name: 'Karma Merit & Volunteer Ledger', domain: 2, domainTitle: 'Financials & Assets', icon: Sparkles },
  { id: 'assets', name: 'Fixed Assets & Deity Ornaments', domain: 2, domainTitle: 'Financials & Assets', icon: Layers },
  { id: 'inventory', name: 'Store & Consumables (Bhandara)', domain: 2, domainTitle: 'Financials & Assets', icon: Package },
  { id: 'bhoomi', name: 'Bhoomi & Property Leases', domain: 2, domainTitle: 'Financials & Assets', icon: Building2, badge: 'Rent Roll' },
  { id: 'vahan', name: 'Vahan Fleet & Transport', domain: 2, domainTitle: 'Financials & Assets', icon: Bus, badge: 'RTO Alerts' },
  { id: 'recurring-seva', name: 'Recurring Seva Mandates', domain: 2, domainTitle: 'Financials & Assets', icon: Repeat, badge: 'MRR' },

  // Domain 3: Vedic Rituals & Ephemeris
  // QUEUED #57 (audit A1-D01): the 'sanctum-hud' shadow row is gone — an
  // alias door to 'purohitDesk' below (same desk, same component); its
  // enable wrote a key the mount guard never consulted, dead-ending
  // even in Mandir, the desk's most natural home.
  { id: 'poojaBooking', name: 'Rituals & Sankalp Hub', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: Flame, badge: 'Purohit Sync' },
  { id: 'mandirPuja', name: 'Daily Aarti & Pujas', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: Clock },
  { id: 'purohitDesk', name: 'Purohit Diary & Dakshina', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: BookOpen },
  { id: 'purohitMarket', name: 'Global Scholar Marketplace', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: Globe, badge: 'KYC Verified' },
  { id: 'pitruShradh', name: 'Pitru Paksha & Shradh Alerts', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: HeartHandshake },
  { id: 'panchang', name: 'Vedic Panchang & Muhurat', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: Calendar },
  { id: 'yatranet-gis', name: 'YatraNet GIS Crowd & SOS', domain: 3, domainTitle: 'Vedic Rituals & Ephemeris', icon: Radio, badge: 'Live GIS' },

  // Domain 4: Specialized Desks
  { id: 'rakthaSeva', name: 'Raktha Seva (Blood Registry)', domain: 4, domainTitle: 'Specialized Desks', icon: HeartPulse, badge: 'Life Saver' },
  { id: 'goshala', name: 'Goshala Sanctuary & Gomata Records', domain: 4, domainTitle: 'Specialized Desks', icon: Heart, badge: 'Gau Seva' },
  { id: 'annadanam', name: 'Annadanam & Prasad Seva', domain: 4, domainTitle: 'Specialized Desks', icon: Utensils },
  { id: 'annakshetra-one', name: 'Annakshetra One — Kitchen & Bhandara Management', domain: 4, domainTitle: 'Specialized Desks', icon: Soup, badge: 'New' },
  { id: 'nyas-one', name: 'Nyas One — Compliance & Governance', domain: 4, domainTitle: 'Specialized Desks', icon: Scale, badge: 'New' },
  { id: 'utsav-one', name: 'Utsav One — Festival & Mahotsav Management', domain: 4, domainTitle: 'Specialized Desks', icon: Sparkles, badge: 'New' },
  { id: 'tirth-one', name: 'Tirth One — Darshan Queue & Tokens', domain: 4, domainTitle: 'Specialized Desks', icon: Ticket, badge: 'New' },
  { id: 'yoga-one', name: 'Yoga One — Shala Management', domain: 4, domainTitle: 'Specialized Desks', icon: HeartPulse, badge: 'New' },
  { id: 'matha-one', name: 'Matha One — Monastic Management', domain: 4, domainTitle: 'Specialized Desks', icon: Sunrise, badge: 'New' },
  { id: 'satsang-one', name: 'Satsang One — Mandali Management', domain: 4, domainTitle: 'Specialized Desks', icon: Music, badge: 'New' },
  { id: 'sabha-one', name: 'Sabha One — Purohit Sabha Management', domain: 4, domainTitle: 'Specialized Desks', icon: Landmark, badge: 'New' },
  { id: 'samskara-one', name: 'Samskara One — Family Lifecycle', domain: 4, domainTitle: 'Specialized Desks', icon: HeartHandshake, badge: 'New' },
  { id: 'ashramKutir', name: 'Ashram Kutir, Residents & Stays', domain: 4, domainTitle: 'Specialized Desks', icon: Moon, keywords: 'residents resident register kutir stays rooms yatri accommodation occupants' },
  { id: 'dharamshala', name: 'Dharamshala Yatri Bhavan', domain: 4, domainTitle: 'Specialized Desks', icon: Home, keywords: 'residents yatri stays rooms accommodation guests' },
  { id: 'gurukul', name: 'Gurukul — Shishya Registry & Residential Monitoring', domain: 4, domainTitle: 'Specialized Desks', icon: GraduationCap, keywords: 'shishya registry students brahmachari vidyarthi enroll enrollment residential monitoring' },
  { id: 'gurukulAcademy', name: 'Shastric Academy & Grading', domain: 4, domainTitle: 'Specialized Desks', icon: Award, keywords: 'shastric academy grading varga pariksha exams shishya' },
  { id: 'vidyalaya', name: 'Weekend Heritage School', domain: 4, domainTitle: 'Specialized Desks', icon: BookMarked, keywords: 'heritage school students shishya weekend classes' },
  { id: 'pathshala', name: 'Pathshala — Complete School Management', domain: 4, domainTitle: 'Specialized Desks', icon: BookOpen, badge: 'New', keywords: 'attendance upasthiti shishya students school fees pariksha exams routine varga certificates' },
  { id: 'goshala-one', name: 'Goshala One — Complete Goshala Operations', domain: 4, domainTitle: 'Specialized Desks', icon: Heart, badge: 'New' },
  { id: 'ashram-one', name: 'Ashram One — Complete Yatri Stay Management', domain: 4, domainTitle: 'Specialized Desks', icon: Home, badge: 'New', keywords: 'residents resident yatri stays rooms bookings guest register' },
  { id: 'satsang', name: 'Satsang, Kirtan & Discourse', domain: 4, domainTitle: 'Specialized Desks', icon: Radio },
  { id: 'sanghaDrills', name: 'Sangha & Shakha Mobilization', domain: 4, domainTitle: 'Specialized Desks', icon: Swords, keywords: 'sangha shakha mobilization mobilisation members sangh shakha units' },
  // QUEUED #58 (audit A1-D04): the 'sevaTrust' catalog row is removed.
  // No humanitarian-seva desk component exists and the #48 surface guard
  // denies its mount for every org type — as a catalog row it was a false
  // promise in nav, App Store, and palette alike (native in Trust /
  // AkshayaPatra, whose own nav led to a restricted screen). The guard's
  // honest guidance still answers deep links and stored enables. The row
  // returns when a real desk is built.
  { id: 'granthLibrary', name: 'Sacred Granth & Manuscript Library', domain: 4, domainTitle: 'Specialized Desks', icon: Library },

  // Domain 5: Matrimony & Outreach
  // QUEUED #57 (audit A1-D01): three shadow rows removed from this
  // domain — 'matrimony' (alias door to 'sanatani-vivah' in Domain 7;
  // on the store shelf it was a trap: install succeeded, mount
  // blocked), 'shlokaFeed' (alias door to 'granthLibrary' in Domain 4),
  // and 'dharmaMarketing' (alias door to 'dharmicAssistant' below —
  // dead in Trust, its only registry home). One desk, one canonical row.
  { id: 'utsavPanjika', name: 'Festival Calendar & Gate Passes', domain: 5, domainTitle: 'Matrimony & Outreach', icon: CalendarCheck2 },
  { id: 'panchayatPolls', name: 'Panchayat Voting & Quorum', domain: 5, domainTitle: 'Matrimony & Outreach', icon: Vote },
  { id: 'sandeshBroadcast', name: 'Sandesh WhatsApp/SMS Broadcast', domain: 5, domainTitle: 'Matrimony & Outreach', icon: MessageSquare },
  { id: 'dharmicAssistant', name: 'Dharmic AI Query Desk', domain: 5, domainTitle: 'Matrimony & Outreach', icon: Sparkles, badge: 'Gemini 3.7' },

  // Domain 6: Governance & Security
  { id: 'trusteeGovernance', name: 'Trustee Board & Governance', domain: 6, domainTitle: 'Governance & Security', icon: Scale },
  // QUEUED #58 (audit A1-D03): honest relabel — this id mounts
  // AuditLogDesk ("Security & System Audit Log"); no legal vault exists
  // (Nyas One carries the document vault). The label now says what the
  // desk is. The id stays 'legalVault' (stored enabledModules + aliases
  // 'security-audit-log'/'auditLog' already resolve to it).
  { id: 'legalVault', name: 'Security & Audit Log', domain: 6, domainTitle: 'Governance & Security', icon: ScrollText, keywords: 'audit log security activity history who did what' },
  { id: 'qrScanner', name: 'QR Gate Scanner', domain: 6, domainTitle: 'Governance & Security', icon: ShieldCheck, badge: 'Check-in' },
  { id: 'appStore', name: 'App Store & Add-ons', domain: 6, domainTitle: 'Governance & Security', icon: Layers, badge: 'Integrations' },
  // QUEUED #57 (audit A1-D09): 'workspace-hub' finally has its catalog
  // row — the desk (WorkspaceSelectorDesk) and its TRUSTEE mount gate
  // existed, but with no row here no user path could ever reach it.
  { id: 'workspace-hub', name: 'Workspace Hub', domain: 6, domainTitle: 'Governance & Security', icon: ArrowLeftRight, keywords: 'switch workspace organisations orgs selector hub multi-workspace' },
  { id: 'masterSettings', name: 'Organization Settings & Logos', domain: 6, domainTitle: 'Governance & Security', icon: Settings },
  { id: 'spiritualSettings', name: 'Sampradaya & Kuladevata Config', domain: 6, domainTitle: 'Governance & Security', icon: Compass },
  { id: 'crisis-command', name: 'Crisis Command Center', domain: 6, domainTitle: 'Governance & Security', icon: ShieldAlert, badge: 'SOS' },
  { id: 'tactical-radar', name: 'Tactical Perimeter Radar', domain: 6, domainTitle: 'Governance & Security', icon: Radio, badge: 'Radar' },

  // Domain 7: Individual Life & Connect
  { id: 'sadhana-karma', name: 'Sadhana & Japa Counters', domain: 7, domainTitle: 'Sanatani Life & Connect', icon: Flame },
  { id: 'sanatani-vivah', name: 'Sanatani Vivah Portal', domain: 7, domainTitle: 'Sanatani Life & Connect', icon: Heart },
  { id: 'yatraNet', name: 'YatraNet Offline Mesh (P2P)', domain: 7, domainTitle: 'Sanatani Life & Connect', icon: Radio, badge: 'Offline P2P' },
];

interface DeskRowProps {
  item: NavItem;
  rowKey: string;
  groupTitle: string;
  withId: boolean;
  isActive: boolean;
  isCollapsed: boolean;
  displayLabel: string;
  isPinned: boolean;
  /** C-6: plan-locked desks render a lock affordance and open the upgrade upsell. */
  isLocked?: boolean;
  lockTierLabel?: string | null;
  onTogglePin: (id: string) => void;
  onSelect: (id: string) => void;
}

/** Single desk row: main nav button + pin toggle. Never nest the pin inside the nav button. */
const DeskRow: React.FC<DeskRowProps> = ({
  item,
  rowKey,
  groupTitle,
  withId,
  isActive,
  isCollapsed,
  displayLabel,
  isPinned,
  isLocked = false,
  lockTierLabel = null,
  onTogglePin,
  onSelect,
}) => {
  const Icon = item.icon;
  return (
    <li key={rowKey} className="group/row">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          id={withId ? `nav-desk-${item.id}` : undefined}
          onClick={() => onSelect(item.id)}
          title={
            isLocked
              ? `${displayLabel} — requires ${lockTierLabel || 'a paid'} plan`
              : isCollapsed ? `${displayLabel} (${groupTitle})` : undefined
          }
          aria-current={isActive ? 'page' : undefined}
          className={`flex-1 flex items-center rounded-xl transition-all cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          } ${
            isActive
              ? 'bg-gradient-to-r from-saffron-500/20 to-saffron-500/10 text-saffron-400 border border-saffron-500/40 font-bold shadow-xs'
              : isLocked
                ? 'text-temple-500 hover:bg-temple-800/50 hover:text-temple-300 border border-dashed border-temple-700'
                : 'text-temple-300 hover:bg-temple-800/70 hover:text-white border border-transparent'
          }`}
        >
          <div className={`flex items-center gap-3 truncate ${isCollapsed ? 'justify-center' : ''}`}>
            {isLocked ? (
              <Lock className="w-4 h-4 shrink-0 text-amber-500/80" />
            ) : (
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-saffron-400 stroke-[2.2]' : 'text-temple-400'
                }`}
              />
            )}
            {!isCollapsed && (
              <span className="text-xs truncate font-medium">{displayLabel}</span>
            )}
          </div>

          {!isCollapsed && (isLocked ? (
            <span className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {lockTierLabel || 'PRO'}
            </span>
          ) : item.badge && (
            <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
              isActive
                ? 'bg-saffron-500 text-temple-950'
                : 'bg-temple-800 text-temple-400 border border-temple-700'
            }`}>
              {item.badge}
            </span>
          ))}
        </button>

        {!isCollapsed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(item.id);
            }}
            title={isPinned ? `Unpin ${displayLabel}` : `Pin ${displayLabel} to top`}
            aria-label={isPinned ? `Unpin ${displayLabel}` : `Pin ${displayLabel} to top`}
            aria-pressed={isPinned}
            className={`shrink-0 min-h-[44px] w-9 flex items-center justify-center rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
              isPinned
                ? 'text-saffron-400 opacity-100'
                : 'text-temple-500 opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-saffron-400 hover:bg-temple-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isPinned ? 'fill-saffron-400' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeModule: string;
  onSelectModule: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  activeModule,
  onSelectModule,
}) => {

  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // QUEUED #50 (audit D11d): the aside is `inert` only while it is truly
  // off-canvas — the MOBILE drawer when closed. The old code applied
  // inert whenever the drawer state was closed, which on desktop (where
  // CSS keeps the sidebar permanently visible) made every desk row
  // unclickable: only the command palette could switch desks.
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const isInert = !isOpen && !isDesktop;

  useEffect(() => {
    const checkQueue = () => {
      const q = OfflineSyncManager.getQueue();
      const pending = q.filter(item => item.status === 'PENDING' || item.status === 'FAILED');
      setPendingSyncCount(pending.length);
    };

    checkQueue();
    window.addEventListener('offline_queue_updated', checkQueue);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('offline_queue_updated', checkQueue);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Phase 2 org spaces: nav filtering evaluates the per-org effective
  // role (from the workspaceMembers edge), not the global session role.
  const { activeWorkspace, effectiveRole, checkPermission, setViewMode } = useAuthWorkspace();
  // Blueprint B: my membership edge for THIS workspace carries the
  // desk scope (template narrowing) + expiry; the visibility layer
  // intersects it, so scoped staff never see desks outside scope.
  const { myMemberships } = useMembership();
  const myEdge = myMemberships.find((m) => m.workspaceId === (activeWorkspace?.id || ''));
  const myDeskScope = effectiveDeskScope(myEdge, Date.now(), {
    creatorUid: activeWorkspace?.createdBy,
  });
  const taxonomy = useWorkspaceTaxonomy();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<number | null>(null);
  const [collapsedDomains, setCollapsedDomains] = useState<Record<number, boolean>>({});
  // C-6: module id of the plan-locked desk the user tapped → upgrade upsell.
  const [upgradeModuleId, setUpgradeModuleId] = useState<string | null>(null);

  const toggleDomain = (domainNum: number) => {
    setCollapsedDomains(prev => ({ ...prev, [domainNum]: !prev[domainNum] }));
  };

  // Pinned favorites + recent desks (persisted to IndexedDB; RBAC filtering still applies)
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // QUEUED #50 (audit D11b): pinned + recent desks are scoped to the
  // active workspace and reload when it changes — one org's recents
  // must never surface inside another org.
  useEffect(() => {
    const scope = activeWorkspace?.id || null;
    getPinnedDesks(scope).then(setPinnedIds).catch(() => {});
    getRecentDesks(scope).then(setRecentIds).catch(() => {});
  }, [activeWorkspace?.id]);

  // Reliable mobile drawer close: Escape key + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    if (window.innerWidth < 1024) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleSelectModule = (id: string) => {
    // C-6: plan-locked desks don't navigate — they open the upgrade upsell.
    if (lockedModuleIds.has(id)) {
      setUpgradeModuleId(id);
      return;
    }
    recordDeskVisit(id, activeWorkspace?.id || null).then(setRecentIds).catch(() => {});
    onSelectModule(id);
    if (window.innerWidth < 1024) onClose();
  };

  const handleTogglePin = (id: string) => {
    togglePinnedDesk(id, activeWorkspace?.id || null)
      .then(setPinnedIds)
      .catch(() => {});
  };

  // Strict RBAC: Devotees must not render the B2B sidebar at all
  if (effectiveRole === 'Devotee' || (effectiveRole as string) === 'DEVOTEE') {
    return null;
  }

  const handleSwitchToPersonal = () => {
    setViewMode('MEMBER');
    showToast('Devotee App Preview — this is what your community members see 🙏', 'success', 'Mode Changed');
    if (window.innerWidth < 1024) onClose();
  };

  const filteredModules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return MODULE_CATALOG.filter((m) => {
      // 0. Multi-branch invisibility: the Federation / Multi-Branch HQ desk
      // only makes sense with 2+ branches. Single-org users must never see
      // the word "branch" anywhere in nav.
      if (m.id === 'federation' && (activeWorkspace?.branches?.length || 0) < 2) {
        return false;
      }
      // 1. Check workspace taxonomy
      const allowedForWorkspace = isModuleAllowed(activeWorkspace, m.id);
      if (!allowedForWorkspace) return false;
      
      // 2. Strict RBAC permissions enforcement — QUEUED #56: the
      // per-role decision lives in ONE shared helper
      // (src/lib/deskVisibility.ts), consumed by the Command Palette
      // too, so nav and palette can never promise different desks.
      const hasRole = isDeskVisibleForRole(m, effectiveRole, checkPermission, {
        deskScope: myDeskScope,
      });

      if (!hasRole) return false;

      // 3. Domain filter pill
      if (selectedDomainFilter !== null && m.domain !== selectedDomainFilter) {
        return false;
      }

      // 4. Search term filter
      if (!term) return true;
      return (
        m.name?.toLowerCase().includes(term) || 
        m.domainTitle?.toLowerCase().includes(term) || 
        m.id?.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, selectedDomainFilter, activeWorkspace, effectiveRole, checkPermission]);

  // C-6: plan-tier locks. Locked modules STAY visible (upgrade affordance)
  // instead of being hidden — the lock badge + upsell is the conversion path.
  // Demo workspaces are never plan-locked (demo quota governs instead).
  const lockedModuleIds = useMemo(() => {
    const planId = activeWorkspace?.planId;
    if (!planId || String(planId).toUpperCase() === 'DEMO') return new Set<string>();
    const locked = new Set<string>();
    for (const m of filteredModules) {
      if (!isModuleAllowedForPlan(m.id, planId)) locked.add(m.id);
    }
    return locked;
  }, [filteredModules, activeWorkspace?.planId]);

  const lockTierLabelFor = (id: string): string | null => {
    const tier = requiredTierForModule(id);
    if (!tier) return null;
    return tier === 'STANDARD' ? 'STANDARD' : 'ENTERPRISE';
  };

  const domainGroups = useMemo(() => {
    const groups: { domain: number; title: string; items: NavItem[] }[] = [];
    for (let d = 1; d <= 7; d++) {
      const items = filteredModules.filter((m) => m.domain === d);
      if (items.length > 0) {
        groups.push({
          domain: d,
          title: items[0].domainTitle,
          items,
        });
      }
    }
    return groups;
  }, [filteredModules]);

  // Pinned + recent sections derive from the RBAC-filtered module list,
  // so permissions are never bypassed. Hidden while searching to avoid noise.
  const pinnedItems = useMemo(() => {
    const byId = new Map(filteredModules.map((m) => [m.id, m]));
    return pinnedIds
      .map((id) => byId.get(id))
      .filter((m): m is NavItem => !!m && !!m.id && !!m.name);
  }, [pinnedIds, filteredModules]);

  const recentItems = useMemo(() => {
    const byId = new Map(filteredModules.map((m) => [m.id, m]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((m): m is NavItem => !!m && !!m.id && !!m.name && !pinnedIds.includes(m.id));
  }, [recentIds, pinnedIds, filteredModules]);

  const resolveDisplayLabel = (item: NavItem): string => {
    if (!item) return 'Desk';
    let label = t(item.id) !== item.id ? t(item.id) : item.name;
    if (item.id === 'devotees') {
      label = taxonomy.directoryName;
    }
    // Never leak "undefined" into tooltips or row labels (stale/renamed ids).
    return label || item.name || item.id || 'Desk';
  };

  const domainFilterPills = useMemo(() => {
    const allPills = [
      { label: 'All', domain: null },
      { label: 'CRM', domain: 1 },
      { label: 'Finance', domain: 2 },
      { label: 'Rituals', domain: 3 },
      { label: 'Desks', domain: 4 },
      { label: 'Outreach', domain: 5 },
      { label: 'Gov', domain: 6 },
      { label: 'Life', domain: 7 },
    ];
    return allPills.filter((p) => {
      if (p.domain === null) return true;
      if (effectiveRole === 'Priest' && (p.domain === 1 || p.domain === 2 || p.domain === 6)) return false;
      if (effectiveRole === 'Accountant' && (p.domain === 1 || p.domain === 3 || p.domain === 6)) return false;
      return true;
    });
  }, [effectiveRole]);

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-temple-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Component — z-50 sits above the z-40 backdrop; inert when
          closed on mobile so offscreen content can't capture focus or taps. */}
      <aside
        id="main-sidebar"
        inert={isInert ? true : undefined}
        aria-hidden={isInert ? true : undefined}
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-40 bg-temple-900 text-temple-300 flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-temple-800 shadow-xl lg:translate-x-0 lg:visible ${
          isOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'
        } ${isCollapsed ? 'lg:w-[72px]' : 'w-72 sm:w-80 lg:w-72'}`}
      >
        {/* Top Header Bar for Sidebar */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-temple-800 shrink-0 bg-temple-950/50">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <img 
              src={activeWorkspace?.logoUrl || '/logo.png'} 
              alt={activeWorkspace?.name || 'Sanatani Bandhan'} 
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-saffron-500/30 shrink-0"
              onError={(e) => { e.currentTarget.src = '/icon-192x192.png'; }}
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-saffron-400 truncate block">
                  {activeWorkspace?.name || 'Organisation'}
                </span>
                <span className="text-[10px] text-temple-500 font-bold uppercase tracking-widest block">
                  {filteredModules.length} Desks Console
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg text-temple-400 hover:text-white hover:bg-temple-800 transition-colors"
                title={isCollapsed ? 'Expand Sidebar (280px)' : 'Collapse Sidebar to Icon Rail (72px)'}
              >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-saffron-400" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-temple-400 hover:text-white hover:bg-temple-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Switch to Devotee App Preview — unmistakable hat labeling */}
        {!isCollapsed && (
          <div className="p-3 bg-gradient-to-r from-saffron-500/10 via-saffron-500/10 to-transparent border-b border-temple-800">
            <button
              id="sidebar-btn-switch-personal"
              onClick={handleSwitchToPersonal}
              className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-temple-950 rounded-xl font-bold text-xs shadow-md transition-all border border-saffron-400 cursor-pointer group"
              title="Preview what your devotees see in their app"
            >
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-temple-950" />
                <span className="font-extrabold">Devotee App Preview</span>
              </div>
              <ArrowLeftRight className="w-3.5 h-3.5 text-temple-950 group-hover:rotate-180 transition-transform duration-300" />
            </button>
            <p className="text-[10px] text-temple-400 mt-1.5 px-1 leading-snug">
              See the devotee-facing app. You're currently in the <span className="font-bold text-temple-200">Institution ERP</span>.
            </p>
          </div>
        )}

        {/* Collapsed Rail Quick Switch Icon */}
        {isCollapsed && (
          <div className="p-2 border-b border-temple-800 flex justify-center">
            <button
              onClick={handleSwitchToPersonal}
              className="w-10 h-10 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-temple-950 flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
              title="Devotee App Preview — what your community members see"
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search & Domain Filter Pills (Expanded Mode Only) */}
        {!isCollapsed && (
          <div className="p-3 border-b border-temple-800 space-y-2 shrink-0 bg-temple-900/60">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="sidebar-module-search"
                data-guide-anchor="org-desk-search"
                placeholder="Search desks (e.g. 80G, Pooja, Goshala)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-temple-800/80 border border-temple-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-temple-100 placeholder-temple-400 focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-temple-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Domain Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 pb-0.5">
              {domainFilterPills.map((pill, idx) => {
                const isSelected = selectedDomainFilter === pill.domain;
                return (
                  <button
                    key={pill.label}
                    onClick={() => setSelectedDomainFilter(pill.domain)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-saffron-500 text-temple-950 font-black shadow-xs'
                        : 'bg-temple-800 text-temple-400 hover:bg-temple-700 hover:text-temple-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Desks Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar">
          {/* Pinned favorites (RBAC-filtered; hidden while searching) */}
          {!searchTerm && pinnedItems.length > 0 && (
            <div className={isCollapsed ? 'px-1.5' : 'px-3'}>
              {!isCollapsed && (
                <p className="text-[11px] font-bold text-saffron-400 uppercase tracking-wider px-2 py-1 mb-1 flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-saffron-400" aria-hidden="true" />
                  Pinned
                </p>
              )}
              {isCollapsed && <div className="my-2 border-t border-saffron-500/40 mx-2" />}
              <ul className="space-y-1">
                {pinnedItems.map((item) => (
                  <DeskRow
                    key={`pinned-${item.id}`}
                    item={item}
                    rowKey={`pinned-${item.id}`}
                    groupTitle="Pinned"
                    withId={false}
                    isActive={activeModule === item.id}
                    isCollapsed={isCollapsed}
                    displayLabel={resolveDisplayLabel(item)}
                    isPinned={true}
                    onTogglePin={handleTogglePin}
                    isLocked={lockedModuleIds.has(item.id)}
                    lockTierLabel={lockTierLabelFor(item.id)}
                    onSelect={handleSelectModule}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Recent desks (RBAC-filtered; hidden while searching) */}
          {!searchTerm && recentItems.length > 0 && (
            <div className={isCollapsed ? 'px-1.5' : 'px-3'}>
              {!isCollapsed && (
                <p className="text-[11px] font-bold text-temple-400 uppercase tracking-wider px-2 py-1 mb-1">
                  Recent
                </p>
              )}
              {isCollapsed && <div className="my-2 border-t border-temple-800/80 mx-2" />}
              <ul className="space-y-1">
                {recentItems.map((item) => (
                  <DeskRow
                    key={`recent-${item.id}`}
                    item={item}
                    rowKey={`recent-${item.id}`}
                    groupTitle="Recent"
                    withId={false}
                    isActive={activeModule === item.id}
                    isCollapsed={isCollapsed}
                    displayLabel={resolveDisplayLabel(item)}
                    isPinned={false}
                    onTogglePin={handleTogglePin}
                    isLocked={lockedModuleIds.has(item.id)}
                    lockTierLabel={lockTierLabelFor(item.id)}
                    onSelect={handleSelectModule}
                  />
                ))}
              </ul>
            </div>
          )}

          {domainGroups.map((group, idx) => {
            const isDomainCollapsed = !searchTerm && collapsedDomains[group.domain];

            return (
              <div key={group.domain} className={isCollapsed ? 'px-1.5' : 'px-3'}>
                {/* Domain Header Accordion (Expanded Mode) */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleDomain(group.domain)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-temple-400 hover:text-saffron-400 uppercase tracking-wider px-2 py-1 mb-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-saffron-500"></span>
                      {group.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] bg-temple-800 text-temple-400 px-1.5 py-0.2 rounded-md font-mono">
                        {group.items.length}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDomainCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </div>
                  </button>
                ) : (
                  <div className="my-2 border-t border-temple-800/80 mx-2" />
                )}

                {/* Items in Domain */}
                {!isDomainCollapsed && (
                  <ul className="space-y-1">
                    {group.items.map((item, idx) => (
                      <DeskRow
                        key={`${item.id}-${idx}`}
                        item={item}
                        rowKey={`${item.id}-${idx}`}
                        groupTitle={group.title}
                        withId={true}
                        isActive={activeModule === item.id}
                        isCollapsed={isCollapsed}
                        displayLabel={resolveDisplayLabel(item)}
                        isPinned={pinnedIds.includes(item.id)}
                        onTogglePin={handleTogglePin}
                        isLocked={lockedModuleIds.has(item.id)}
                        lockTierLabel={lockTierLabelFor(item.id)}
                        onSelect={handleSelectModule}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>


        {/* Bottom Status / Vedic Note Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-temple-800 bg-temple-950/60 shrink-0 text-center flex flex-col gap-2">
            <div className={`p-2 rounded-xl border shadow-inner flex items-center justify-between transition-colors ${
              !isOnline ? 'bg-red-950/30 border-red-900/50' :
              pendingSyncCount > 0 ? 'bg-saffron-950/30 border-saffron-900/50' :
              'bg-emerald-950/20 border-emerald-900/30'
            }`}>
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <CloudOff className="w-3.5 h-3.5 text-red-500" />
                ) : pendingSyncCount > 0 ? (
                  <RefreshCcw className="w-3.5 h-3.5 text-saffron-500 animate-spin" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className={`text-[10px] font-bold ${
                  !isOnline ? 'text-red-400' :
                  pendingSyncCount > 0 ? 'text-saffron-400' :
                  'text-emerald-500'
                }`}>
                  {!isOnline ? 'OFFLINE' : pendingSyncCount > 0 ? 'SYNCING...' : 'ONLINE'}
                </span>
              </div>
              {pendingSyncCount > 0 && (
                <span className="bg-temple-950 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-saffron-500">
                  {pendingSyncCount} pending
                </span>
              )}
            </div>

            <div className="p-2.5 bg-temple-900/90 rounded-xl border border-temple-800 shadow-inner">

              <p className="text-[10px] uppercase font-bold text-saffron-500 tracking-wider mb-0.5">
                Vedic Workspace v2.4
              </p>
              <p className="text-[11px] font-serif text-temple-400 italic truncate">
                "Dharmo Rakshati Rakshitah"
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* C-6: plan-lock upgrade upsell. Manual fulfillment v1 — the CTA opens
          WhatsApp with a prefilled upgrade message (falls back to /contact
          if WhatsApp is ever unconfigured).
          TODO(v2): replace with a payment-gateway checkout (Razorpay/UPI). */}
      <UpsellModal
        isOpen={upgradeModuleId !== null}
        onClose={() => setUpgradeModuleId(null)}
        onUpgrade={() => {
          setUpgradeModuleId(null);
          openPlanUpgrade();
        }}
        module={upgradeModuleId ? `${upgradeModuleId} (${lockTierLabelFor(upgradeModuleId) || 'PRO'} plan)` : ''}
        ctaLabel="Upgrade now"
      />
    </>
  );
};

